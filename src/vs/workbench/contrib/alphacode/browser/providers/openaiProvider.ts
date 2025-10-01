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
} from "../../common/aiProvider.js";

export class OpenAIProvider implements IAIProvider {
	private readonly DEFAULT_MODEL = "gpt-4";
	private readonly DEFAULT_ENDPOINT =
		"https://api.openai.com/v1/chat/completions";

	constructor(private config: IAIProviderConfig) {}

	async sendMessage(
		messages: IAIMessage[],
		options?: Partial<IAIProviderConfig>,
	): Promise<IAIResponse> {
		const endpoint =
			options?.endpoint || this.config.endpoint || this.DEFAULT_ENDPOINT;
		const model = options?.model || this.config.model || this.DEFAULT_MODEL;
		const maxTokens = options?.maxTokens || this.config.maxTokens || 2048;
		const temperature = options?.temperature ?? this.config.temperature ?? 0.7;

		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				max_tokens: maxTokens,
				temperature,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
		}

		const data = await response.json();

		return {
			content: data.choices[0].message.content,
			usage: data.usage
				? {
						promptTokens: data.usage.prompt_tokens,
						completionTokens: data.usage.completion_tokens,
						totalTokens: data.usage.total_tokens,
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

		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				max_tokens: maxTokens,
				temperature,
				stream: true,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("Response body is not readable");
		}

		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith("data: ")) {
						const data = trimmed.slice(6);
						if (data === "[DONE]") {
							onChunk({ content: "", done: true });
							return;
						}

						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices[0].delta;
							if (delta.content) {
								onChunk({ content: delta.content, done: false });
							}
						} catch (e) {
							console.error("Failed to parse streaming chunk", e);
						}
					}
				}
			}

			onChunk({ content: "", done: true });
		} finally {
			reader.releaseLock();
		}
	}
}
