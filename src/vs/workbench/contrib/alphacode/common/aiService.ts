/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IAIMessage, IAIProviderConfig, IAIResponse, IAIStreamResponse } from './aiProvider.js';

export const IAlphaCodeAIService = createDecorator<IAlphaCodeAIService>('alphaCodeAIService');

export interface IAlphaCodeAIService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when the AI configuration changes
	 */
	readonly onDidChangeConfiguration: Event<void>;

	/**
	 * Send a message to the configured AI provider
	 */
	sendMessage(messages: IAIMessage[], options?: Partial<IAIProviderConfig>): Promise<IAIResponse>;

	/**
	 * Send a message and receive streaming response
	 */
	sendMessageStream(messages: IAIMessage[], onChunk: (chunk: IAIStreamResponse) => void, options?: Partial<IAIProviderConfig>): Promise<void>;

	/**
	 * Get current provider configuration
	 */
	getProviderConfig(): IAIProviderConfig | undefined;

	/**
	 * Update provider configuration
	 */
	updateProviderConfig(config: IAIProviderConfig): Promise<void>;

	/**
	 * Test connection to AI provider
	 */
	testConnection(): Promise<boolean>;
}
