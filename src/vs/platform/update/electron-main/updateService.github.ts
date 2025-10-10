/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { AvailableForDownload, IUpdate, State, StateType, UpdateType } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, UpdateErrorClassification } from './abstractUpdateService.js';
import { hash } from '../../../base/common/hash.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';

interface IGitHubRelease {
	tag_name: string;
	name: string;
	published_at: string;
	assets: Array<{
		name: string;
		browser_download_url: string;
		size: number;
	}>;
}

interface IReleaseMetadata {
	version: string;
	productVersion: string;
	timestamp: number;
	platforms: {
		[platform: string]: {
			url: string;
			sha256?: string;
		};
	};
}

/**
 * GitHub-based update service for AlphaCodeIDE.
 * Checks for updates using GitHub Releases API.
 */
export class GitHubUpdateService extends AbstractUpdateService {

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IProductService productService: IProductService,
		@ITelemetryService private readonly telemetryService: ITelemetryService
	) {
		super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
	}

	protected buildUpdateFeedUrl(quality: string): string | undefined {
		// For GitHub-based updates, we use the releases API
		return `${this.productService.updateUrl}/releases/latest`;
	}

	protected doCheckForUpdates(explicit: boolean): void {
		if (!this.url) {
			return;
		}

		this.setState(State.CheckingForUpdates(explicit));

		this.requestService.request({ url: this.url, headers: { 'User-Agent': 'AlphaCodeIDE' } }, CancellationToken.None)
			.then<IUpdate | null>(asJson)
			.then(async (release: IGitHubRelease | null) => {
				if (!release) {
					this.setState(State.Idle(this.getUpdateType()));
					return null;
				}

				// Extract version from tag (e.g., "v1.96.0" -> "1.96.0")
				const productVersion = release.tag_name.replace(/^v/, '');

				// Try to find release.json asset for metadata
				const releaseJsonAsset = release.assets.find(asset => asset.name === 'release.json');
				let metadata: IReleaseMetadata | null = null;

				if (releaseJsonAsset) {
					try {
						const metadataResponse = await this.requestService.request({
							url: releaseJsonAsset.browser_download_url,
							headers: { 'User-Agent': 'AlphaCodeIDE' }
						}, CancellationToken.None);
						metadata = await asJson<IReleaseMetadata>(metadataResponse);
					} catch (err) {
						this.logService.warn('update#doCheckForUpdates: failed to fetch release.json', err);
					}
				}

				// Determine current platform
				const platform = this.getPlatformIdentifier();
				this.logService.info(`update#doCheckForUpdates: current platform is ${platform}`);

				// Find matching asset for current platform
				const asset = this.findPlatformAsset(release.assets, platform);

				if (!asset) {
					this.logService.info(`update#doCheckForUpdates: no asset found for platform ${platform}`);
					this.setState(State.Idle(this.getUpdateType()));
					return null;
				}

				// Get metadata for this platform if available
				const platformMetadata = metadata?.platforms?.[platform];
				const version = metadata?.version || release.tag_name;
				const timestamp = metadata?.timestamp || new Date(release.published_at).getTime();

				// Check if this is actually a newer version
				if (this.productService.commit && version === this.productService.commit) {
					this.logService.info('update#doCheckForUpdates: already on latest version');
					this.setState(State.Idle(this.getUpdateType()));
					return null;
				}

				const update: IUpdate = {
					version,
					productVersion,
					timestamp,
					url: asset.browser_download_url,
					sha256hash: platformMetadata?.sha256
				};

				this.logService.info('update#doCheckForUpdates: update available', update);
				this.setState(State.AvailableForDownload(update));
				return null;
			})
			.then(undefined, err => {
				this.telemetryService.publicLog2<{ messageHash: string }, UpdateErrorClassification>('update:error', { messageHash: String(hash(String(err))) });
				this.logService.error('update#doCheckForUpdates: failed to check for updates', err);

				// Only show message when explicitly checking for updates
				const message: string | undefined = explicit ? (err.message || err) : undefined;
				this.setState(State.Idle(this.getUpdateType(), message));
			});
	}

	protected override async doDownloadUpdate(state: AvailableForDownload): Promise<void> {
		// For GitHub releases, we just open the browser to the download page
		if (state.update.url) {
			this.logService.info('update#doDownloadUpdate: opening download URL', state.update.url);
			// Open the releases page instead of direct download
			const releasesUrl = this.productService.downloadUrl || state.update.url;
			// We would need INativeHostMainService to open external URLs, but for now just log
			this.logService.info('update#doDownloadUpdate: please download from', releasesUrl);
		}
		this.setState(State.Idle(this.getUpdateType()));
	}

	protected override getUpdateType(): UpdateType {
		// GitHub releases are treated as archive downloads
		return UpdateType.Archive;
	}

	/**
	 * Get platform identifier for current system
	 */
	private getPlatformIdentifier(): string {
		const arch = process.arch;
		const platform = process.platform;

		if (platform === 'win32') {
			return arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
		} else if (platform === 'darwin') {
			return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
		} else if (platform === 'linux') {
			return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
		}

		return `${platform}-${arch}`;
	}

	/**
	 * Find the appropriate asset for the current platform
	 */
	private findPlatformAsset(assets: IGitHubRelease['assets'], platform: string): IGitHubRelease['assets'][0] | undefined {
		// Platform-specific file patterns
		const patterns: Record<string, RegExp[]> = {
			'win32-x64': [/AlphaCodeIDE-Setup-win32-x64\.exe$/i, /alphacode-ide.*win32.*x64.*\.exe$/i],
			'win32-arm64': [/AlphaCodeIDE-Setup-win32-arm64\.exe$/i, /alphacode-ide.*win32.*arm64.*\.exe$/i],
			'darwin-x64': [/AlphaCodeIDE-darwin-x64\.zip$/i, /alphacode-ide.*darwin.*x64.*\.zip$/i, /AlphaCodeIDE.*x64\.dmg$/i],
			'darwin-arm64': [/AlphaCodeIDE-darwin-arm64\.zip$/i, /alphacode-ide.*darwin.*arm64.*\.zip$/i, /AlphaCodeIDE.*arm64\.dmg$/i],
			'darwin-universal': [/AlphaCodeIDE-darwin-universal\.zip$/i, /alphacode-ide.*darwin.*universal.*\.zip$/i, /AlphaCodeIDE.*universal\.dmg$/i],
			'linux-x64': [/alphacode-ide.*amd64\.deb$/i, /alphacode-ide.*x86_64\.rpm$/i, /alphacode-ide.*linux.*x64.*\.tar\.gz$/i],
			'linux-arm64': [/alphacode-ide.*arm64\.deb$/i, /alphacode-ide.*aarch64\.rpm$/i, /alphacode-ide.*linux.*arm64.*\.tar\.gz$/i]
		};

		const platformPatterns = patterns[platform];
		if (!platformPatterns) {
			this.logService.warn(`update#findPlatformAsset: no patterns defined for platform ${platform}`);
			return undefined;
		}

		// Try each pattern
		for (const pattern of platformPatterns) {
			const asset = assets.find(a => pattern.test(a.name));
			if (asset) {
				this.logService.info(`update#findPlatformAsset: found asset ${asset.name} for platform ${platform}`);
				return asset;
			}
		}

		return undefined;
	}
}
