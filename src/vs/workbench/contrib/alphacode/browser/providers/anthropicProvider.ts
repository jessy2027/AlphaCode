/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAIMessage, IAIProvider, IAIProviderConfig, IAIResponse, IAIStreamResponse } from '../../common/aiProvider.js';

export class AnthropicProvider implements IAIProvider {
	private readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
	private readonly DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';

	constructor(private config: IAIProviderConfig) { }

	async sendMessage(messages: IAIMessage[], options?: Partial<IAIProviderConfig>): Promise<IAIResponse> {
		const endpoint = options?.endpoint || this.config.endpoint || this.DEFAULT_ENDPOINT;
		const model = options?.model || this.config.model || this.DEFAULT_MODEL;
		const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
		const temperature = options?.temperature ?? this.config.temperature ?? 0.7;

		// Anthropic expects system messages separately
		const systemMessage = messages.find(m => m.role === 'system');
		const nonSystemMessages = messages.filter(m => m.role !== 'system');

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model,
				messages: nonSystemMessages,
				system: systemMessage?.content,
				max_tokens: maxTokens,
				temperature
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
		}

		const data = await response.json();

		return {
			content: data.content[0].text,
			usage: data.usage ? {
				promptTokens: data.usage.input_tokens,
				completionTokens: data.usage.output_tokens,
				totalTokens: data.usage.input_tokens + data.usage.output_tokens
			} : undefined
		};
	}

	async sendMessageStream(messages: IAIMessage[], onChunk: (chunk: IAIStreamResponse) => void, options?: Partial<IAIProviderConfig>): Promise<void> {
		const endpoint = options?.endpoint || this.config.endpoint || this.DEFAULT_ENDPOINT;
		const model = options?.model || this.config.model || this.DEFAULT_MODEL;
		const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
		const temperature = options?.temperature ?? this.config.temperature ?? 0.7;

		const systemMessage = messages.find(m => m.role === 'system');
		const nonSystemMessages = messages.filter(m => m.role !== 'system');

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model,
				messages: nonSystemMessages,
				system: systemMessage?.content,
				max_tokens: maxTokens,
				temperature,
				stream: true
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('Response body is not readable');
		}

		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith('data: ')) {
						const data = trimmed.slice(6);

						try {
							const parsed = JSON.parse(data);

							if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
								onChunk({ content: parsed.delta.text, done: false });
							} else if (parsed.type === 'message_stop') {
								onChunk({ content: '', done: true });
								return;
							}
						} catch (e) {
							console.error('Failed to parse streaming chunk', e);
						}
					}
				}
			}

			onChunk({ content: '', done: true });
		} finally {
			reader.releaseLock();
		}
	}
}
