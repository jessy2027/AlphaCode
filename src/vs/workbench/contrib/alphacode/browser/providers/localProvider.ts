/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	IAIMessage,
	IAIProvider,
	IAIProviderConfig,
	IAIResponse,
	IAIStreamResponse,
} from '../../common/aiProvider.js';

/**
 * LocalProvider supports local LLM servers like Ollama, LM Studio, LocalAI, etc.
 * Supports both native Ollama API and OpenAI-compatible APIs.
 */
export class LocalProvider implements IAIProvider {
	private readonly DEFAULT_MODEL = 'codellama';
	private readonly DEFAULT_ENDPOINT = 'http://localhost:11434/api/generate'; // Ollama generate API

	constructor(private config: IAIProviderConfig) { }

	/**
	 * Detects if the endpoint is OpenAI-compatible based on the URL
	 */
	private isOpenAICompatible(endpoint: string): boolean {
		return (
			endpoint.includes('/v1/chat/completions') || endpoint.includes('/openai/')
		);
	}

	/**
	 * Detects if the endpoint is Ollama's generate API
	 */
	private isOllamaGenerate(endpoint: string): boolean {
		return endpoint.includes('/api/generate');
	}

	/**
	 * Converts messages array to a single prompt string for generate API
	 */
	private messagesToPrompt(messages: IAIMessage[]): string {
		return messages
			.map((msg) => {
				if (msg.role === 'system') {
					return `System: ${msg.content}`;
				} else if (msg.role === 'user') {
					return `User: ${msg.content}`;
				} else if (msg.role === 'assistant') {
					return `Assistant: ${msg.content}`;
				}
				return msg.content;
			})
			.join('\n\n');
	}

	async sendMessage(
		messages: IAIMessage[],
		options?: Partial<IAIProviderConfig>,
	): Promise<IAIResponse> {
		const endpoint =
			options?.endpoint || this.config.endpoint || this.DEFAULT_ENDPOINT;
		const model = options?.model || this.config.model || this.DEFAULT_MODEL;
		const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
		const temperature = options?.temperature ?? this.config.temperature ?? 0.7;

		const isOpenAI = this.isOpenAICompatible(endpoint);
		const isGenerate = this.isOllamaGenerate(endpoint);
		let requestBody: any;

		if (isOpenAI) {
			// OpenAI-compatible format
			requestBody = {
				model,
				messages,
				max_tokens: maxTokens,
				temperature,
			};
		} else if (isGenerate) {
			// Ollama generate API format (uses prompt instead of messages)
			requestBody = {
				model,
				prompt: this.messagesToPrompt(messages),
				options: {
					num_predict: maxTokens,
					temperature,
				},
				stream: false,
			};
		} else {
			// Ollama chat API format
			requestBody = {
				model,
				messages,
				options: {
					num_predict: maxTokens,
					temperature,
				},
				stream: false,
			};
		}

		// API key is optional for local providers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Local provider API error: ${response.status} - ${errorText}`,
			);
		}

		const data = await response.json();

		// Handle different response formats
		let content = '';
		if (data.choices && data.choices[0]) {
			// OpenAI-compatible format
			content = data.choices[0].message?.content || data.choices[0].text || '';
		} else if (data.message && data.message.content) {
			// Ollama native format (chat API)
			content = data.message.content;
		} else if (data.response) {
			// Ollama generate API format
			content = data.response;
		}

		return {
			content,
			usage: data.usage
				? {
					promptTokens: data.usage.prompt_tokens || 0,
					completionTokens: data.usage.completion_tokens || 0,
					totalTokens: data.usage.total_tokens || 0,
				}
				: undefined,
		};
	}

	async sendMessageStream(
		messages: IAIMessage[],
		onChunk: (chunk: IAIStreamResponse) => void,
		options?: Partial<IAIProviderConfig>,
	): Promise<void> {
		const endpoint =
			options?.endpoint || this.config.endpoint || this.DEFAULT_ENDPOINT;
		const model = options?.model || this.config.model || this.DEFAULT_MODEL;
		const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
		const temperature = options?.temperature ?? this.config.temperature ?? 0.7;

		const isOpenAI = this.isOpenAICompatible(endpoint);
		const isGenerate = this.isOllamaGenerate(endpoint);
		let requestBody: any;

		if (isOpenAI) {
			// OpenAI-compatible format
			requestBody = {
				model,
				messages,
				max_tokens: maxTokens,
				temperature,
				stream: true,
			};
		} else if (isGenerate) {
			// Ollama generate API format (uses prompt instead of messages)
			requestBody = {
				model,
				prompt: this.messagesToPrompt(messages),
				options: {
					num_predict: maxTokens,
					temperature,
				},
				stream: true,
			};
		} else {
			// Ollama chat API format
			requestBody = {
				model,
				messages,
				options: {
					num_predict: maxTokens,
					temperature,
				},
				stream: true,
			};
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Local provider API error: ${response.status} - ${errorText}`,
			);
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
					if (!trimmed) {
						continue;
					}

					if (trimmed.startsWith('data: ')) {
						const data = trimmed.slice(6);
						if (data === '[DONE]') {
							onChunk({ content: '', done: true });
							return;
						}

						try {
							const parsed = JSON.parse(data);

							// OpenAI-compatible format
							if (parsed.choices && parsed.choices[0]?.delta?.content) {
								onChunk({
									content: parsed.choices[0].delta.content,
									done: false,
								});
							}
							// Ollama native chat format
							else if (parsed.message && parsed.message.content) {
								onChunk({ content: parsed.message.content, done: false });
							}
							// Ollama generate format
							else if (parsed.response) {
								onChunk({ content: parsed.response, done: false });
							}

							// Check for done flag (Ollama native)
							if (parsed.done === true) {
								onChunk({ content: '', done: true });
								return;
							}
						} catch (e) {
							console.error('Failed to parse streaming chunk', e);
						}
					} else {
						// Ollama sends raw JSON without 'data:' prefix
						try {
							const parsed = JSON.parse(trimmed);

							// Ollama native chat format
							if (parsed.message && parsed.message.content) {
								onChunk({ content: parsed.message.content, done: false });
							}
							// Ollama generate format
							else if (parsed.response) {
								onChunk({ content: parsed.response, done: false });
							}

							// Check for done flag
							if (parsed.done === true) {
								onChunk({ content: '', done: true });
								return;
							}
						} catch (e) {
							// Ignore non-JSON lines
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
