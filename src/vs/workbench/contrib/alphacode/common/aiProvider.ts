/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export enum AIProviderType {
	OpenAI = 'openai',
	Anthropic = 'anthropic',
	Azure = 'azure',
	Local = 'local'
}

export interface IAIProviderConfig {
	type: AIProviderType;
	apiKey: string;
	endpoint?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

export interface IAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface IAIResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

export interface IAIStreamResponse {
	content: string;
	done: boolean;
}

export interface IAIProvider {
	sendMessage(messages: IAIMessage[], options?: Partial<IAIProviderConfig>): Promise<IAIResponse>;
	sendMessageStream(messages: IAIMessage[], onChunk: (chunk: IAIStreamResponse) => void, options?: Partial<IAIProviderConfig>): Promise<void>;
}
