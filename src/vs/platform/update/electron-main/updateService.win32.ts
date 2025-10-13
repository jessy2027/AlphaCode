/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawn } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
import { hash } from '../../../base/common/hash.js';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService, IRelaunchHandler, IRelaunchOptions } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { AvailableForDownload, DisablementReason, IUpdate, State, StateType, UpdateType } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, UpdateErrorClassification } from './abstractUpdateService.js';

async function pollUntil(fn: () => boolean, millis = 1000): Promise<void> {
	while (!fn()) {
		await timeout(millis);
	}
}

interface IAvailableUpdate {
	packagePath: string;
	updateFilePath?: string;
}

let _updateType: UpdateType | undefined = undefined;
function getUpdateType(): UpdateType {
	if (typeof _updateType === 'undefined') {
		_updateType = fs.existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
			? UpdateType.Setup
			: UpdateType.Archive;
	}

	return _updateType;
}

export class Win32UpdateService extends AbstractUpdateService implements IRelaunchHandler {

	private availableUpdate: IAvailableUpdate | undefined;

	@memoize
	get cachePath(): Promise<string> {
		const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);
		return fs.promises.mkdir(result, { recursive: true }).then(() => result);
	}

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IFileService private readonly fileService: IFileService,
		@INativeHostMainService private readonly nativeHostMainService: INativeHostMainService,
		@IProductService productService: IProductService
	) {
		super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);

		lifecycleMainService.setRelaunchHandler(this);
	}

	handleRelaunch(options?: IRelaunchOptions): boolean {
		if (options?.addArgs || options?.removeArgs) {
			return false; // we cannot apply an update and restart with different args
		}

		if (this.state.type !== StateType.Ready || !this.availableUpdate) {
			return false; // we only handle the relaunch when we have a pending update
		}

		this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
		this.doQuitAndInstall();

		return true;
	}

	protected override async initialize(): Promise<void> {
		if (this.productService.target === 'user' && await this.nativeHostMainService.isAdmin(undefined)) {
			this.setState(State.Disabled(DisablementReason.RunningAsAdmin));
			this.logService.info('update#ctor - updates are disabled due to running as Admin in user setup');
			return;
		}

		await super.initialize();
	}

	protected buildUpdateFeedUrl(quality: string): string | undefined {
		let platform = `win32-${process.arch}`;

		if (getUpdateType() === UpdateType.Archive) {
			platform += '-archive';
		} else if (this.productService.target === 'user') {
			platform += '-user';
		}

		return createUpdateURL(platform, quality, this.productService);
	}

	protected doCheckForUpdates(explicit: boolean): void {
		if (!this.url) {
			return;
		}

		const url = explicit ? this.url : `${this.url}?bg=true`;
		this.setState(State.CheckingForUpdates(explicit));

		this.requestService.request({ url }, CancellationToken.None)
			.then<IUpdate | null>(asJson)
			.then(update => {
				const updateType = getUpdateType();

				if (!update || !update.url || !update.version || !update.productVersion) {
					this.setState(State.Idle(updateType));
					return Promise.resolve(null);
				}

				if (updateType === UpdateType.Archive) {
					this.setState(State.AvailableForDownload(update));
					// Automatically start downloading the update
					this.doDownloadUpdate(State.AvailableForDownload(update));
					return Promise.resolve(null);
				}

				this.setState(State.Downloading);

				return this.cleanup(update.version).then(() => {
					return this.getUpdatePackagePath(update.version).then(updatePackagePath => {
						return pfs.Promises.exists(updatePackagePath).then(exists => {
							if (exists) {
								return Promise.resolve(updatePackagePath);
							}

							const downloadPath = `${updatePackagePath}.tmp`;

							return this.requestService.request({ url: update.url }, CancellationToken.None)
								.then(context => this.fileService.writeFile(URI.file(downloadPath), context.stream))
								.then(update.sha256hash ? () => checksum(downloadPath, update.sha256hash) : () => undefined)
								.then(() => pfs.Promises.rename(downloadPath, updatePackagePath, false /* no retry */))
								.then(() => updatePackagePath);
						});
					}).then(packagePath => {
						this.availableUpdate = { packagePath };
						this.setState(State.Downloaded(update));

						const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
						if (fastUpdatesEnabled) {
							if (this.productService.target === 'user') {
								this.doApplyUpdate();
							}
						} else {
							this.setState(State.Ready(update));
						}
					});
				});
			})
			.then(undefined, err => {
				this.telemetryService.publicLog2<{ messageHash: string }, UpdateErrorClassification>('update:error', { messageHash: String(hash(String(err))) });
				this.logService.error(err);

				// only show message when explicitly checking for updates
				const message: string | undefined = explicit ? (err.message || err) : undefined;
				this.setState(State.Idle(getUpdateType(), message));
			});
	}

	protected override async doDownloadUpdate(state: AvailableForDownload): Promise<void> {
		if (!state.update.url) {
			this.logService.error('Update URL is missing');
			this.setState(State.Idle(getUpdateType(), 'Update URL is missing'));
			return;
		}

		this.setState(State.Downloading);

		try {
			await this.cleanup(state.update.version);

			const updatePackagePath = await this.getUpdatePackagePath(state.update.version);
			const exists = await pfs.Promises.exists(updatePackagePath);

			if (exists) {
				this.logService.info('Update package already exists:', updatePackagePath);
				this.availableUpdate = { packagePath: updatePackagePath };
				this.setState(State.Ready(state.update));
				return;
			}

			const downloadPath = `${updatePackagePath}.tmp`;

			this.logService.info('Downloading update from:', state.update.url);
			this.logService.info('Download path:', downloadPath);

			const context = await this.requestService.request({ url: state.update.url }, CancellationToken.None);
			await this.fileService.writeFile(URI.file(downloadPath), context.stream);

			if (state.update.sha256hash) {
				this.logService.info('Verifying checksum...');
				await checksum(downloadPath, state.update.sha256hash);
			}

			await pfs.Promises.rename(downloadPath, updatePackagePath, false);

			this.availableUpdate = { packagePath: updatePackagePath };
			this.setState(State.Downloaded(state.update));

			this.logService.info('Update downloaded successfully:', updatePackagePath);

			// Automatically apply the update
			await this.doApplyUpdate();
		} catch (err) {
			this.logService.error('Failed to download update:', err);
			this.setState(State.Idle(getUpdateType(), err instanceof Error ? err.message : String(err)));
		}
	}

	private async getUpdatePackagePath(version: string): Promise<string> {
		const cachePath = await this.cachePath;
		const extension = getUpdateType() === UpdateType.Archive ? '.zip' : '.exe';
		return path.join(cachePath, `CodeSetup-${this.productService.quality}-${version}${extension}`);
	}

	private async cleanup(exceptVersion: string | null = null): Promise<void> {
		const filter = exceptVersion ? (one: string) => !(new RegExp(`${this.productService.quality}-${exceptVersion}\\.(exe|zip)$`).test(one)) : () => true;

		const cachePath = await this.cachePath;
		const versions = await pfs.Promises.readdir(cachePath);

		const promises = versions.filter(filter).map(async one => {
			try {
				await fs.promises.unlink(path.join(cachePath, one));
			} catch (err) {
				// ignore
			}
		});

		await Promise.all(promises);
	}

	protected override async doApplyUpdate(): Promise<void> {
		if (this.state.type !== StateType.Downloaded) {
			return Promise.resolve(undefined);
		}

		if (!this.availableUpdate) {
			return Promise.resolve(undefined);
		}

		const update = this.state.update;
		this.setState(State.Updating(update));

		if (getUpdateType() === UpdateType.Archive) {
			// For Archive: extract and replace files, then wait for user to restart
			try {
				await this.extractAndReplaceArchive();
				this.setState(State.Ready(update));
				this.logService.info('Update applied successfully. Ready to restart.');
				// Don't restart automatically - let the user decide when to restart
			} catch (err) {
				this.logService.error('Failed to apply update:', err);
				this.availableUpdate = undefined;
				this.setState(State.Idle(getUpdateType(), err instanceof Error ? err.message : String(err)));
			}
		} else {
			// For Setup: launch installer
			const cachePath = await this.cachePath;

			this.availableUpdate.updateFilePath = path.join(cachePath, `CodeSetup-${this.productService.quality}-${update.version}.flag`);

			await pfs.Promises.writeFile(this.availableUpdate.updateFilePath, 'flag');
			const child = spawn(this.availableUpdate.packagePath, ['/verysilent', '/log', `/update="${this.availableUpdate.updateFilePath}"`, '/nocloseapplications', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
				detached: true,
				stdio: ['ignore', 'ignore', 'ignore'],
				windowsVerbatimArguments: true
			});

			child.once('exit', () => {
				this.availableUpdate = undefined;
				this.setState(State.Idle(getUpdateType()));
			});

			const readyMutexName = `${this.productService.win32MutexName}-ready`;
			const mutex = await import('@vscode/windows-mutex');

			// poll for mutex-ready
			pollUntil(() => mutex.isActive(readyMutexName))
				.then(() => this.setState(State.Ready(update)));
		}
	}

	private async extractAndReplaceArchive(): Promise<void> {
		if (!this.availableUpdate) {
			throw new Error('No update available');
		}

		const yauzl = await import('yauzl');
		const appDir = path.dirname(path.dirname(process.execPath)); // Go up from 'resources/app' to app root
		const extractPath = path.join(await this.cachePath, 'extracted');

		this.logService.info('Extracting update to:', extractPath);

		// Create extract directory
		await fs.promises.mkdir(extractPath, { recursive: true });

		// Extract zip using yauzl
		await new Promise<void>((resolve, reject) => {
			yauzl.open(this.availableUpdate!.packagePath, { lazyEntries: true }, (err, zipfile) => {
				if (err || !zipfile) {
					reject(err || new Error('Failed to open zip file'));
					return;
				}

				zipfile.readEntry();
				zipfile.on('entry', (entry) => {
					const entryPath = path.join(extractPath, entry.fileName);

					if (/\/$/.test(entry.fileName)) {
						// Directory entry
						fs.promises.mkdir(entryPath, { recursive: true }).then(() => {
							zipfile.readEntry();
						}).catch(reject);
					} else {
						// File entry
						zipfile.openReadStream(entry, (err, readStream) => {
							if (err || !readStream) {
								reject(err || new Error('Failed to read entry'));
								return;
							}

							fs.promises.mkdir(path.dirname(entryPath), { recursive: true }).then(() => {
								const writeStream = fs.createWriteStream(entryPath);
								readStream.pipe(writeStream);
								writeStream.on('finish', () => {
									zipfile.readEntry();
								});
								writeStream.on('error', reject);
							}).catch(reject);
						});
					}
				});

				zipfile.on('end', () => {
					resolve();
				});

				zipfile.on('error', reject);
			});
		});

		this.logService.info('Replacing application files...');
		// Copy extracted files to application directory
		await this.copyRecursive(extractPath, appDir);

		this.logService.info('Update files replaced successfully');
	}

	private async copyRecursive(src: string, dest: string): Promise<void> {
		const entries = await fs.promises.readdir(src, { withFileTypes: true });

		for (const entry of entries) {
			const srcPath = path.join(src, entry.name);
			const destPath = path.join(dest, entry.name);

			if (entry.isDirectory()) {
				await fs.promises.mkdir(destPath, { recursive: true });
				await this.copyRecursive(srcPath, destPath);
			} else {
				await fs.promises.copyFile(srcPath, destPath);
			}
		}
	}

	protected override doQuitAndInstall(): void {
		if (this.state.type !== StateType.Ready || !this.availableUpdate) {
			return;
		}

		this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');

		if (this.availableUpdate.updateFilePath) {
			fs.unlinkSync(this.availableUpdate.updateFilePath);
		} else if (getUpdateType() === UpdateType.Archive) {
			// For Archive installations, restart the application
			this.logService.info('Restarting application to apply update...');
			this.lifecycleMainService.relaunch();
		} else {
			// For Setup installations, launch the installer
			spawn(this.availableUpdate.packagePath, ['/silent', '/log', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
				detached: true,
				stdio: ['ignore', 'ignore', 'ignore']
			});
		}
	}

	protected override getUpdateType(): UpdateType {
		return getUpdateType();
	}

	override async _applySpecificUpdate(packagePath: string): Promise<void> {
		if (this.state.type !== StateType.Idle) {
			return;
		}

		const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
		const update: IUpdate = { version: 'unknown', productVersion: 'unknown' };

		this.setState(State.Downloading);
		this.availableUpdate = { packagePath };
		this.setState(State.Downloaded(update));

		if (fastUpdatesEnabled) {
			if (this.productService.target === 'user') {
				this.doApplyUpdate();
			}
		} else {
			this.setState(State.Ready(update));
		}
	}
}
