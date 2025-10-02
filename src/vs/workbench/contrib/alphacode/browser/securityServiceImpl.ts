/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from '../../../../platform/storage/common/storage.js';
import {
	IAlphaCodeSecurityService,
	ISecretPattern,
	ISecurityConfig,
	ISecretDetection,
} from '../common/securityService.js';

const STORAGE_KEY_CONFIG = 'alphacode.security.config';

const DEFAULT_PATTERNS: ISecretPattern[] = [
	{
		name: 'AWS Access Key',
		pattern: /AKIA[0-9A-Z]{16}/g,
		description: 'AWS Access Key ID',
		replacement: 'AKIA***************',
	},
	{
		name: 'AWS Secret Key',
		pattern:
			/aws_secret_access_key\s*=\s*[\""]([A-Za-z0-9/+=]{40})[\""]|[\""]([A-Za-z0-9/+=]{40})[\""](?=.*aws)/gi,
		description: 'AWS Secret Access Key',
		replacement: '***AWS_SECRET_KEY***',
	},
	{
		name: 'GitHub Token',
		pattern: /gh[pousr]_[A-Za-z0-9]{36,255}/g,
		description: 'GitHub Personal Access Token',
		replacement: 'ghp_***************',
	},
	{
		name: 'OpenAI API Key',
		pattern: /sk-[A-Za-z0-9]{48}/g,
		description: 'OpenAI API Key',
		replacement: 'sk-***************',
	},
	{
		name: 'Anthropic API Key',
		pattern: /sk-ant-[A-Za-z0-9-]{95,}/g,
		description: 'Anthropic API Key',
		replacement: 'sk-ant-***************',
	},
	{
		name: 'Generic API Key',
		pattern:
			/[""]?[Aa]pi[_-]?[Kk]ey[""]?\s*[:=]\s*[""]([A-Za-z0-9-_]{20,})[""]|[""]?[Aa]uth[_-]?[Tt]oken[""]?\s*[:=]\s*[""]([A-Za-z0-9-_]{20,})[""]/g,
		description: 'Generic API Key or Auth Token',
		replacement: '***API_KEY***',
	},
	{
		name: 'Private Key',
		pattern:
			/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
		description: 'Private Key (RSA/EC)',
		replacement:
			'-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----',
	},
	{
		name: 'Password in URL',
		pattern: /(https?:\/\/)([^:]+):([^@]+)@/g,
		description: 'Password in URL',
		replacement: '$1$2:***@',
	},
	{
		name: 'JWT Token',
		pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
		description: 'JWT Token',
		replacement: 'eyJ***',
	},
	{
		name: 'Slack Token',
		pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
		description: 'Slack Token',
		replacement: 'xox***',
	},
	{
		name: 'Google API Key',
		pattern: /AIza[0-9A-Za-z_-]{35}/g,
		description: 'Google API Key',
		replacement: 'AIza***',
	},
	{
		name: 'Database Connection String',
		pattern: /(mongodb|mysql|postgresql|postgres):\/\/[^:]+:[^@]+@[^\s'"]+/gi,
		description: 'Database Connection String with credentials',
		replacement: '$1://***:***@***',
	},
];

const DEFAULT_CONFIG: ISecurityConfig = {
	maskSecrets: true,
	customPatterns: [],
	logSensitiveData: false,
	warnOnSecretDetection: true,
};

export class AlphaCodeSecurityService
	extends Disposable
	implements IAlphaCodeSecurityService {
	declare readonly _serviceBrand: undefined;

	private config: ISecurityConfig;
	private allPatterns: ISecretPattern[];

	constructor(
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.config = this.loadConfig();
		this.allPatterns = [...DEFAULT_PATTERNS, ...this.config.customPatterns];
	}

	private loadConfig(): ISecurityConfig {
		const stored = this.storageService.get(
			STORAGE_KEY_CONFIG,
			StorageScope.APPLICATION,
		);
		if (stored) {
			try {
				const loaded = JSON.parse(stored);
				if (loaded.customPatterns) {
					loaded.customPatterns = loaded.customPatterns.map((p: any) => ({
						...p,
						pattern: new RegExp(p.pattern.source, p.pattern.flags),
					}));
				}
				return { ...DEFAULT_CONFIG, ...loaded };
			} catch (error) {
				console.error('Failed to parse security config', error);
			}
		}
		return DEFAULT_CONFIG;
	}

	private saveConfig(): void {
		const serializable = {
			...this.config,
			customPatterns: this.config.customPatterns.map((p) => ({
				...p,
				pattern: { source: p.pattern.source, flags: p.pattern.flags },
			})),
		};
		this.storageService.store(
			STORAGE_KEY_CONFIG,
			JSON.stringify(serializable),
			StorageScope.APPLICATION,
			StorageTarget.MACHINE,
		);
	}

	getConfig(): ISecurityConfig {
		return { ...this.config };
	}

	updateConfig(config: Partial<ISecurityConfig>): void {
		this.config = { ...this.config, ...config };
		if (config.customPatterns) {
			this.allPatterns = [...DEFAULT_PATTERNS, ...this.config.customPatterns];
		}
		this.saveConfig();
	}

	maskSecrets(text: string): string {
		if (!this.config.maskSecrets || !text) {
			return text;
		}

		let masked = text;
		for (const pattern of this.allPatterns) {
			masked = masked.replace(pattern.pattern, pattern.replacement);
		}

		return masked;
	}

	detectSecrets(text: string): ISecretDetection[] {
		if (!text) {
			return [];
		}

		const detections: ISecretDetection[] = [];

		for (const pattern of this.allPatterns) {
			const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
			let match;

			while ((match = regex.exec(text)) !== null) {
				detections.push({
					type: pattern.name,
					matched: match[0],
					position: match.index,
					length: match[0].length,
				});
			}
		}

		return detections;
	}

	hasSecrets(text: string): boolean {
		if (!text) {
			return false;
		}

		for (const pattern of this.allPatterns) {
			if (pattern.pattern.test(text)) {
				return true;
			}
		}

		return false;
	}

	addCustomPattern(pattern: ISecretPattern): void {
		this.config.customPatterns.push(pattern);
		this.allPatterns = [...DEFAULT_PATTERNS, ...this.config.customPatterns];
		this.saveConfig();
	}

	removeCustomPattern(name: string): void {
		this.config.customPatterns = this.config.customPatterns.filter(
			(p) => p.name !== name,
		);
		this.allPatterns = [...DEFAULT_PATTERNS, ...this.config.customPatterns];
		this.saveConfig();
	}
}
