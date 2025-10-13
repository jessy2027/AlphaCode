/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import { tmpdir } from 'os';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { AvailableForDownload, IUpdate, State, UpdateType } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL } from './abstractUpdateService.js';

export class LinuxUpdateService extends AbstractUpdateService {

	private availableUpdate: { packagePath: string } | undefined;

	@memoize
	get cachePath(): Promise<string> {
		const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target || 'archive'}-${process.arch}`);
		return fs.promises.mkdir(result, { recursive: true }).then(() => result);
	}

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IFileService private readonly fileService: IFileService,
		@IProductService productService: IProductService
	) {
		super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
	}

	protected buildUpdateFeedUrl(quality: string): string {
		return createUpdateURL(`linux-${process.arch}`, quality, this.productService);
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
				if (!update || !update.url || !update.version || !update.productVersion) {
					this.setState(State.Idle(UpdateType.Archive));
				} else {
					this.setState(State.AvailableForDownload(update));
					// Automatically start downloading the update
					this.doDownloadUpdate(State.AvailableForDownload(update));
				}
			})
			.then(undefined, err => {
				this.logService.error(err);
				// only show message when explicitly checking for updates
				const message: string | undefined = explicit ? (err.message || err) : undefined;
				this.setState(State.Idle(UpdateType.Archive, message));
			});
	}

	protected override async doDownloadUpdate(state: AvailableForDownload): Promise<void> {
		if (!state.update.url) {
			this.logService.error('Update URL is missing');
			this.setState(State.Idle(UpdateType.Archive, 'Update URL is missing'));
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
			this.setState(State.Idle(UpdateType.Archive, err instanceof Error ? err.message : String(err)));
		}
	}

	protected override async doApplyUpdate(): Promise<void> {
		if (this.state.type !== 'downloaded') {
			return;
		}

		if (!this.availableUpdate) {
			return;
		}

		const update = (this.state as any).update;
		this.setState(State.Updating(update));

		try {
			await this.extractAndReplaceArchive();
			this.setState(State.Ready(update));
			this.logService.info('Update applied successfully. Ready to restart.');
			// Don't restart automatically - let the user decide when to restart
		} catch (err) {
			this.logService.error('Failed to apply update:', err);
			this.availableUpdate = undefined;
			this.setState(State.Idle(UpdateType.Archive, err instanceof Error ? err.message : String(err)));
		}
	}

	private async extractAndReplaceArchive(): Promise<void> {
		if (!this.availableUpdate) {
			throw new Error('No update available');
		}

		const { exec } = await import('child_process');
		const { promisify } = await import('util');
		const execAsync = promisify(exec);

		const appDir = path.dirname(path.dirname(process.execPath)); // Go up from 'resources/app' to app root
		const extractPath = path.join(await this.cachePath, 'extracted');

		this.logService.info('Extracting update to:', extractPath);

		// Create extract directory
		await fs.promises.mkdir(extractPath, { recursive: true });

		// Extract tar.gz
		await execAsync(`tar -xzf "${this.availableUpdate.packagePath}" -C "${extractPath}"`);

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

	private async getUpdatePackagePath(version: string): Promise<string> {
		const cachePath = await this.cachePath;
		// Determine file extension based on common Linux package formats
		// Default to .tar.gz for archive installations
		return path.join(cachePath, `vscode-${this.productService.quality}-${version}.tar.gz`);
	}

	private async cleanup(exceptVersion: string | null = null): Promise<void> {
		const filter = exceptVersion ? (one: string) => !(new RegExp(`${this.productService.quality}-${exceptVersion}\\.(tar\\.gz|deb|rpm|snap)$`).test(one)) : () => true;

		try {
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
		} catch (err) {
			// ignore if cache directory doesn't exist
		}
	}

	protected override doQuitAndInstall(): void {
		this.logService.info('Restarting application to apply update...');
		// Restart the application
		this.lifecycleMainService.relaunch();
	}
}
