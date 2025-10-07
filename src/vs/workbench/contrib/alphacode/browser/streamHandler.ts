/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChatMessage, IChatSession, IToolCall } from "../common/chatService.js";
import { ToolCallParser } from "./toolCallParser.js";

/**
 * State of the streaming response
 */
export interface IStreamState {
	fullContent: string;
	displayContent: string;
	assistantMessage: IChatMessage | undefined;
	detectedToolCalls: Map<string, IToolCall>;
	toolExtractionState: { lastIndex: number };
	writeToolDetected: boolean;
	initialTimestamp: number;
	detectionCounter: number;
}

/**
 * Handles streaming response logic
 */
export class StreamHandler {
	constructor(
		private readonly toolParser: ToolCallParser,
		private readonly onStreamChunk: (chunk: any) => void,
		private readonly onCreateMessage: (session: IChatSession, messageId: string, content: string) => IChatMessage,
		private readonly onEnsureView: () => Promise<void>,
		private readonly onExecuteTool: (session: IChatSession, toolCall: IToolCall) => Promise<void>
	) {}

	/**
	 * Create initial stream state
	 */
	createInitialState(): IStreamState {
		return {
			fullContent: "",
			displayContent: "",
			assistantMessage: undefined,
			detectedToolCalls: new Map<string, IToolCall>(),
			toolExtractionState: { lastIndex: 0 },
			writeToolDetected: false,
			initialTimestamp: Date.now(),
			detectionCounter: 0,
		};
	}

	/**
	 * Process a single stream chunk
	 */
	async processChunk(
		session: IChatSession,
		messageId: string,
		chunk: any,
		state: IStreamState
	): Promise<void> {
		state.fullContent += chunk.content;
		// Garder le contenu complet avec les blocs tool pour un affichage inline
		state.displayContent = state.fullContent;

		// Detect write tools
		if (!state.writeToolDetected && this.hasWriteToolPattern(state.fullContent)) {
			state.writeToolDetected = true;
			this.onStreamChunk({ content: "", done: true, messageId });
		}

		// Create or update assistant message
		await this.updateAssistantMessage(session, messageId, state);

		// Stream to UI if no write tool
		if (!state.writeToolDetected) {
			this.onStreamChunk({ content: chunk.content, done: false, messageId });
		}

		// Extract and queue tools
		await this.extractAndQueueTools(session, state);
	}

	/**
	 * Finalize the assistant message after streaming
	 */
	finalizeMessage(session: IChatSession, messageId: string, state: IStreamState): void {
		if (!state.assistantMessage && state.displayContent.trim()) {
			state.assistantMessage = this.onCreateMessage(session, messageId, state.displayContent);
			state.assistantMessage.timestamp = state.initialTimestamp;
		}

		if (state.assistantMessage) {
			state.assistantMessage.content = state.displayContent;
			if (state.detectedToolCalls.size > 0) {
				state.assistantMessage.toolCalls = Array.from(state.detectedToolCalls.values());
			}
		}
	}

	/**
	 * Execute all pending tools (kept for compatibility but tools are now executed immediately)
	 */
	async executePendingTools(session: IChatSession, state: IStreamState): Promise<void> {
		// Les outils sont maintenant exécutés immédiatement lors de leur détection
		// Cette méthode est conservée pour la compatibilité mais ne fait plus rien
	}

	private hasWriteToolPattern(content: string): boolean {
		return /```tool[\s\S]*?"name"\s*:\s*"(write_file|edit_file)"/i.test(content);
	}

	private async updateAssistantMessage(
		session: IChatSession,
		messageId: string,
		state: IStreamState
	): Promise<void> {
		if (!state.assistantMessage && state.displayContent.trim()) {
			state.assistantMessage = this.onCreateMessage(session, messageId, state.displayContent);
			state.assistantMessage.timestamp = state.initialTimestamp;
			await this.onEnsureView();
		} else if (state.assistantMessage) {
			state.assistantMessage.content = state.displayContent;
		}
	}

	private async extractAndQueueTools(session: IChatSession, state: IStreamState): Promise<void> {
		const toolCalls = this.toolParser.extractToolCalls(state.fullContent, state.toolExtractionState);

		for (const toolCall of toolCalls) {
			const key = this.toolParser.getToolCallKey(toolCall);
			if (!state.detectedToolCalls.has(key)) {
				// Utiliser le timestamp initial + compteur pour garantir l'ordre exact
				toolCall.detectedAt = state.initialTimestamp + (++state.detectionCounter);
				state.detectedToolCalls.set(key, toolCall);

				// Marquer les outils d'écriture pour le streaming
				if (this.toolParser.isWriteTool(toolCall.name)) {
					state.writeToolDetected = true;
				}

				// Exécuter l'outil immédiatement pour une meilleure réactivité
				await this.onExecuteTool(session, toolCall);
			}
		}
	}
}
