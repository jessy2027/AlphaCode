/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { generateUuid } from "../../../../base/common/uuid.js";
import { IToolCall } from "../common/chatService.js";

/**
 * Extracts tool calls from markdown content during streaming.
 * Optimized to handle partial/fragmented tool blocks.
 */
export class ToolCallParser {
	/**
	 * Extract all complete tool calls from content
	 */
	extractToolCalls(content: string, state?: { lastIndex: number }): IToolCall[] {
		const toolCalls: IToolCall[] = [];
		const length = content.length;
		let searchIndex = state?.lastIndex ?? 0;
		let furthestIndex = searchIndex;

		while (searchIndex < length) {
			const fenceStart = content.indexOf("```", searchIndex);
			if (fenceStart === -1) {
				furthestIndex = length;
				break;
			}

			// Check if followed by "tool"
			const afterFence = fenceStart + 3;
			const nextChars = content.substring(afterFence, afterFence + 10);
			if (!nextChars.match(/^(tool)/)) {
				searchIndex = fenceStart + 3;
				continue;
			}

			const headerEnd = content.indexOf("\n", fenceStart);
			if (headerEnd === -1) {
				furthestIndex = fenceStart;
				break;
			}

			const blockStart = headerEnd + 1;
			const closingIndex = this.findClosingFence(content, blockStart, length);

			if (closingIndex === -1) {
				furthestIndex = fenceStart;
				break;
			}

			const rawBlock = content.slice(blockStart, closingIndex).trim();
			furthestIndex = this.skipNewlines(content, closingIndex + 3, length);
			searchIndex = furthestIndex;

			if (rawBlock) {
				const toolCall = this.parseToolBlock(rawBlock);
				if (toolCall) {
					toolCalls.push(toolCall);
				}
			}
		}

		if (state) {
			state.lastIndex = Math.min(furthestIndex, length);
		}

		return toolCalls;
	}

	/**
	 * Find the closing fence (```) for a tool block, handling strings correctly
	 */
	private findClosingFence(content: string, blockStart: number, length: number): number {
		let cursor = blockStart;
		let inString = false;
		let escaped = false;

		while (cursor < length) {
			const code = content.charCodeAt(cursor);

			if (inString) {
				if (escaped) {
					escaped = false;
				} else if (code === 92) { // backslash
					escaped = true;
				} else if (code === 34) { // double quote
					inString = false;
				}
				cursor++;
				continue;
			}

			if (code === 34) { // double quote
				inString = true;
				cursor++;
				continue;
			}

			// Check for closing fence
			if (code === 96 && cursor + 2 < length &&
				content.charCodeAt(cursor + 1) === 96 &&
				content.charCodeAt(cursor + 2) === 96) {
				
				// Ensure it's on a new line
				if (this.isPrecededByNewline(content, cursor, blockStart)) {
					return cursor;
				}
			}

			cursor++;
		}

		return -1;
	}

	/**
	 * Check if position is preceded by newline or is at start
	 */
	private isPrecededByNewline(content: string, cursor: number, blockStart: number): boolean {
		let preceding = cursor - 1;
		while (preceding >= blockStart) {
			const code = content.charCodeAt(preceding);
			if (code === 32 || code === 9) { // space or tab
				preceding--;
				continue;
			}
			if (code === 10 || code === 13) { // newline or carriage return
				return true;
			}
			return false;
		}
		return preceding < blockStart;
	}

	/**
	 * Skip newlines after closing fence
	 */
	private skipNewlines(content: string, startIndex: number, length: number): number {
		let index = startIndex;
		while (index < length) {
			const code = content.charCodeAt(index);
			if (code === 13 || code === 10) { // CR or LF
				index++;
			} else {
				break;
			}
		}
		return index;
	}

	/**
	 * Parse a tool block into a ToolCall object
	 */
	private parseToolBlock(rawBlock: string): IToolCall | null {
		try {
			const toolCallData = JSON.parse(rawBlock);
			if (toolCallData.name && toolCallData.parameters) {
				return {
					id: generateUuid(),
					name: toolCallData.name,
					parameters: toolCallData.parameters,
				};
			}
		} catch (error) {
			console.error('Failed to parse tool call:', error);
		}
		return null;
	}

	/**
	 * Remove all tool blocks from content for display
	 */
	removeToolBlocks(content: string): string {
		return content.replace(/```tool[\s\S]*?```/g, '').trim();
	}

	/**
	 * Check if a tool is a write tool (modifies files)
	 */
	isWriteTool(toolName: string): boolean {
		const writeTools = ["write_file", "edit_file", "delete_file"];
		return writeTools.includes(toolName);
	}

	/**
	 * Generate a unique key for a tool call (for deduplication)
	 */
	getToolCallKey(toolCall: IToolCall): string {
		try {
			return `${toolCall.name}:${JSON.stringify(toolCall.parameters)}`;
		} catch (error) {
			return `${toolCall.name}:${String(toolCall.parameters)}`;
		}
	}
}
