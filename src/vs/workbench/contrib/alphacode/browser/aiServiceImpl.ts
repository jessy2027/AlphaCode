/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IAlphaCodeAIService } from '../common/aiService.js';
import { AIProviderType, IAIMessage, IAIProvider, IAIProviderConfig, IAIResponse, IAIStreamResponse } from '../common/aiProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { AnthropicProvider } from './providers/anthropicProvider.js';
import { AzureProvider } from './providers/azureProvider.js';
import { LocalProvider } from './providers/localProvider.js';

const STORAGE_KEY_AI_CONFIG = 'alphacode.ai.config';

export class AlphaCodeAIService extends Disposable implements IAlphaCodeAIService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeConfiguration = this._register(new Emitter<void>());
	readonly onDidChangeConfiguration: Event<void> = this._onDidChangeConfiguration.event;

	private currentProvider: IAIProvider | undefined;
	private currentConfig: IAIProviderConfig | undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
		this.loadConfiguration();

		// Listen for configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('alphacode.ai')) {
				this.loadConfiguration();
				this._onDidChangeConfiguration.fire();
			}
		}));
	}

	private loadConfiguration(): void {
		// First try to load from configuration settings
		const provider = this.configurationService.getValue<string>('alphacode.ai.provider');
		const apiKey = this.configurationService.getValue<string>('alphacode.ai.apiKey');
		const endpoint = this.configurationService.getValue<string>('alphacode.ai.endpoint');
		const model = this.configurationService.getValue<string>('alphacode.ai.model');
		const maxTokens = this.configurationService.getValue<number>('alphacode.ai.maxTokens');
		const temperature = this.configurationService.getValue<number>('alphacode.ai.temperature');

		// If we have at least a provider and API key, create config
		if (provider && apiKey) {
			let providerType: AIProviderType;
			switch (provider) {
				case 'openai':
					providerType = AIProviderType.OpenAI;
					break;
				case 'anthropic':
					providerType = AIProviderType.Anthropic;
					break;
				case 'azure':
					providerType = AIProviderType.Azure;
					break;
				case 'local':
					providerType = AIProviderType.Local;
					break;
				default:
					providerType = AIProviderType.OpenAI;
			}

			this.currentConfig = {
				type: providerType,
				apiKey,
				endpoint: endpoint || undefined,
				model: model || undefined,
				maxTokens: maxTokens || 2048,
				temperature: temperature ?? 0.7
			};

			this.initializeProvider();
			console.log('[AlphaCode] AI configuration loaded from settings:', JSON.stringify({ provider: provider, hasApiKey: !!apiKey, model: model || 'default', maxTokens, temperature }));
		} else {
			// Fallback to storage if configuration is not set
			const stored = this.storageService.get(STORAGE_KEY_AI_CONFIG, StorageScope.APPLICATION);
			if (stored) {
				try {
					this.currentConfig = JSON.parse(stored);
					this.initializeProvider();
				} catch (error) {
					console.error('Failed to parse AI configuration', error);
				}
			} else {
				// Clear config if nothing is set
				this.currentConfig = undefined;
				this.currentProvider = undefined;
				console.log('[AlphaCode] No AI configuration found. Please set alphacode.ai.provider and alphacode.ai.apiKey');
			}
		}
	}

	private initializeProvider(): void {
		if (!this.currentConfig) {
			return;
		}

		switch (this.currentConfig.type) {
			case AIProviderType.OpenAI:
				this.currentProvider = new OpenAIProvider(this.currentConfig);
				break;
			case AIProviderType.Anthropic:
				this.currentProvider = new AnthropicProvider(this.currentConfig);
				break;
			case AIProviderType.Azure:
				this.currentProvider = new AzureProvider(this.currentConfig);
				break;
			case AIProviderType.Local:
				this.currentProvider = new LocalProvider(this.currentConfig);
				break;
		}
	}

	async sendMessage(messages: IAIMessage[], options?: Partial<IAIProviderConfig>): Promise<IAIResponse> {
		if (!this.currentProvider) {
			throw new Error('No AI provider configured. Please configure your AI settings.');
		}

		return this.currentProvider.sendMessage(messages, options);
	}

	async sendMessageStream(messages: IAIMessage[], onChunk: (chunk: IAIStreamResponse) => void, options?: Partial<IAIProviderConfig>): Promise<void> {
		if (!this.currentProvider) {
			throw new Error('No AI provider configured. Please configure your AI settings.');
		}

		return this.currentProvider.sendMessageStream(messages, onChunk, options);
	}

	getProviderConfig(): IAIProviderConfig | undefined {
		return this.currentConfig;
	}

	async updateProviderConfig(config: IAIProviderConfig): Promise<void> {
		this.currentConfig = config;
		this.storageService.store(STORAGE_KEY_AI_CONFIG, JSON.stringify(config), StorageScope.APPLICATION, StorageTarget.MACHINE);
		this.initializeProvider();
	}

	async testConnection(): Promise<boolean> {
		try {
			const testMessage: IAIMessage[] = [
				{ role: 'user', content: 'Hello' }
			];
			await this.sendMessage(testMessage, { maxTokens: 10 });
			return true;
		} catch (error) {
			console.error('Connection test failed', error);
			return false;
		}
	}
}
