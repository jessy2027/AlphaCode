/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from "../../../../base/common/lifecycle.js";
import { Emitter, Event } from "../../../../base/common/event.js";
import { generateUuid } from "../../../../base/common/uuid.js";
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from "../../../../platform/storage/common/storage.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import { IAIMessage } from "../common/aiProvider.js";
import {
	IAlphaCodePairProgrammingService,
	IPairProgrammingSuggestion,
	ICursorContext,
	PairProgrammingMode,
	IPairProgrammingConfig,
} from "../common/pairProgramming.js";

const STORAGE_KEY_CONFIG = "alphacode.pairProgramming.config";

const DEFAULT_CONFIG: IPairProgrammingConfig = {
	mode: PairProgrammingMode.Off,
	enableCursorTracking: true,
	suggestionDelay: 1000,
	minConfidenceThreshold: 0.7,
	enableInlineCompletions: true,
	enableRefactorSuggestions: true,
};

export class AlphaCodePairProgrammingService
	extends Disposable
	implements IAlphaCodePairProgrammingService
{
	declare readonly _serviceBrand: undefined;

	private readonly _onDidGenerateSuggestion = this._register(
		new Emitter<IPairProgrammingSuggestion>(),
	);
	readonly onDidGenerateSuggestion: Event<IPairProgrammingSuggestion> =
		this._onDidGenerateSuggestion.event;

	private readonly _onDidChangeCursorContext = this._register(
		new Emitter<ICursorContext>(),
	);
	readonly onDidChangeCursorContext: Event<ICursorContext> =
		this._onDidChangeCursorContext.event;

	private readonly _onDidChangeSuggestionStatus = this._register(
		new Emitter<IPairProgrammingSuggestion>(),
	);
	readonly onDidChangeSuggestionStatus: Event<IPairProgrammingSuggestion> =
		this._onDidChangeSuggestionStatus.event;

	private config: IPairProgrammingConfig;
	private pendingSuggestions: Map<string, IPairProgrammingSuggestion> =
		new Map();
	private suggestionTimeouts: Map<string, any> = new Map();

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.config = this.loadConfig();
	}

	private loadConfig(): IPairProgrammingConfig {
		const stored = this.storageService.get(
			STORAGE_KEY_CONFIG,
			StorageScope.WORKSPACE,
		);
		if (stored) {
			try {
				return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
			} catch (error) {
				console.error("Failed to parse pair programming config", error);
			}
		}
		return DEFAULT_CONFIG;
	}

	private saveConfig(): void {
		this.storageService.store(
			STORAGE_KEY_CONFIG,
			JSON.stringify(this.config),
			StorageScope.WORKSPACE,
			StorageTarget.MACHINE,
		);
	}

	getConfig(): IPairProgrammingConfig {
		return { ...this.config };
	}

	updateConfig(config: Partial<IPairProgrammingConfig>): void {
		this.config = { ...this.config, ...config };
		this.saveConfig();
	}

	setMode(mode: PairProgrammingMode): void {
		this.config.mode = mode;
		this.saveConfig();

		// Clear suggestions when disabling
		if (mode === PairProgrammingMode.Off) {
			this.clearSuggestions();
		}
	}

	async requestSuggestion(
		context: ICursorContext,
	): Promise<IPairProgrammingSuggestion | undefined> {
		if (this.config.mode === PairProgrammingMode.Off) {
			return undefined;
		}

		// Debounce: cancel previous timeout for this file
		const timeoutKey = context.fileUri.toString();
		const existingTimeout = this.suggestionTimeouts.get(timeoutKey);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		return new Promise((resolve) => {
			const timeout = setTimeout(async () => {
				this.suggestionTimeouts.delete(timeoutKey);

				try {
					const suggestion = await this.generateSuggestion(context);
					if (
						suggestion &&
						suggestion.confidence >= this.config.minConfidenceThreshold
					) {
						this.pendingSuggestions.set(suggestion.id, suggestion);
						this._onDidGenerateSuggestion.fire(suggestion);

						// Auto-accept in Active mode if confidence is very high
						if (
							this.config.mode === PairProgrammingMode.Active &&
							suggestion.confidence > 0.9
						) {
							await this.acceptSuggestion(suggestion.id);
						}

						resolve(suggestion);
					} else {
						resolve(undefined);
					}
				} catch (error) {
					console.error("Failed to generate suggestion", error);
					resolve(undefined);
				}
			}, this.config.suggestionDelay);

			this.suggestionTimeouts.set(timeoutKey, timeout);
		});
	}

	private async generateSuggestion(
		context: ICursorContext,
	): Promise<IPairProgrammingSuggestion | undefined> {
		// Build AI prompt based on context
		const messages: IAIMessage[] = [
			{
				role: "system",
				content: `You are an AI pair programming assistant. Analyze the code context and provide intelligent suggestions. 
Be concise and focus on high-value improvements.

Suggestion types:
- code: Complete or generate new code
- refactor: Improve existing code structure
- fix: Identify and fix potential bugs
- completion: Smart code completion

Respond with JSON: { "type": "code|refactor|fix|completion", "content": "...", "description": "...", "confidence": 0-1 }`,
			},
			{
				role: "user",
				content: `File: ${context.fileUri.path}
Language: ${context.language}
Position: Line ${context.position.line}, Column ${context.position.column}

Surrounding code:
\`\`\`${context.language}
${context.surroundingCode}
\`\`\`

Provide a helpful suggestion for this context.`,
			},
		];

		const response = await this.aiService.sendMessage(messages, {
			maxTokens: 500,
		});

		// Parse AI response
		try {
			const parsed = JSON.parse(response.content);

			return {
				id: generateUuid(),
				type: parsed.type || "code",
				content: parsed.content || "",
				description: parsed.description || "AI suggestion",
				context: context,
				timestamp: Date.now(),
				confidence: parsed.confidence || 0.5,
				status: 'pending',
				originalContent: context.surroundingCode,
			};
		} catch (error) {
			// If AI doesn't return JSON, create suggestion from raw content
			const content = response.content.trim();
			if (content.length > 0 && content.length < 500) {
				return {
					id: generateUuid(),
					type: "code",
					content: content,
					description: "Code suggestion",
					context: context,
					timestamp: Date.now(),
					confidence: 0.6,
					status: 'pending',
					originalContent: context.surroundingCode,
				};
			}
			return undefined;
		}
	}

	async acceptSuggestion(suggestionId: string): Promise<void> {
		const suggestion = this.pendingSuggestions.get(suggestionId);
		if (!suggestion) {
			return;
		}

		// Update status
		suggestion.status = 'accepted';
		this._onDidChangeSuggestionStatus.fire(suggestion);

		// This would require ITextEditorService to insert the content

		this.pendingSuggestions.delete(suggestionId);
	}

	rejectSuggestion(suggestionId: string): void {
		const suggestion = this.pendingSuggestions.get(suggestionId);
		if (suggestion) {
			suggestion.status = 'rejected';
			this._onDidChangeSuggestionStatus.fire(suggestion);
		}
		this.pendingSuggestions.delete(suggestionId);
	}

	getPendingSuggestions(): IPairProgrammingSuggestion[] {
		return Array.from(this.pendingSuggestions.values());
	}

	clearSuggestions(): void {
		this.pendingSuggestions.clear();
		// Clear all timeouts
		for (const timeout of this.suggestionTimeouts.values()) {
			clearTimeout(timeout);
		}
		this.suggestionTimeouts.clear();
	}

	getSuggestion(suggestionId: string): IPairProgrammingSuggestion | undefined {
		return this.pendingSuggestions.get(suggestionId);
	}

	async acceptAllSuggestions(): Promise<void> {
		const pending = this.getPendingSuggestions();
		for (const suggestion of pending) {
			await this.acceptSuggestion(suggestion.id);
		}
	}

	async rejectAllSuggestions(): Promise<void> {
		const pending = this.getPendingSuggestions();
		for (const suggestion of pending) {
			this.rejectSuggestion(suggestion.id);
		}
	}

	override dispose(): void {
		this.clearSuggestions();
		super.dispose();
	}
}
