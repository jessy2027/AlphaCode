/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "../../../../nls.js";

/**
 * Utilities for formatting tool messages and parameters
 */
export class MessageFormatter {
	/**
	 * Build a summary of tool output content
	 */
	buildToolSummary(content: string): { summary: string; details?: string } {
		const normalized = content.replace(/\r\n/g, "\n").trim();
		if (!normalized) {
			return {
				summary: localize("alphacode.chat.tool.noOutputSummary", "No output returned."),
			};
		}

		const previewLimit = 280;
		const paragraphs = normalized
			.split(/\n\s*\n/)
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
		const firstParagraph = paragraphs.length > 0 ? paragraphs[0] : normalized;

		if (normalized.length <= previewLimit && paragraphs.length <= 1) {
			return { summary: normalized };
		}

		if (firstParagraph.length <= previewLimit) {
			return {
				summary: firstParagraph,
				details: normalized !== firstParagraph ? normalized : undefined,
			};
		}

		return {
			summary: firstParagraph.slice(0, previewLimit).trimEnd() + "…",
			details: normalized,
		};
	}

	/**
	 * Convert tool parameters to a string representation
	 */
	stringifyToolParameters(parameters: any): string | undefined {
		if (parameters === undefined || parameters === null) {
			return undefined;
		}

		if (typeof parameters === "string") {
			return parameters;
		}

		try {
			const json = JSON.stringify(parameters, null, 2);
			if (!json) {
				return undefined;
			}
			return json.length > 2000 ? `${json.slice(0, 2000)}…` : json;
		} catch (error: unknown) {
			return String(parameters);
		}
	}

	/**
	 * Normalize tool content to a string
	 */
	normalizeToolContent(content: unknown): string {
		if (typeof content === "string") {
			return content.trim();
		}

		if (content === undefined || content === null) {
			return "";
		}

		if (typeof content === "object") {
			try {
				return JSON.stringify(content, null, 2).trim();
			} catch (error: unknown) {
				return String(content).trim();
			}
		}

		return String(content).trim();
	}
}
