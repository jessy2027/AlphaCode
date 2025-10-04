/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from "../../../../base/common/event.js";
import { createDecorator } from "../../../../platform/instantiation/common/instantiation.js";
import { URI } from "../../../../base/common/uri.js";

export const IAlphaCodePairProgrammingService =
	createDecorator<IAlphaCodePairProgrammingService>(
		"alphaCodePairProgrammingService",
	);

export interface IPairProgrammingSuggestion {
	id: string;
	type: 'code' | 'refactor' | 'fix' | 'completion';
	content: string;
	description: string;
	confidence: number;
	context: ICursorContext;
	timestamp: number;
	status?: 'pending' | 'accepted' | 'rejected';
	originalContent?: string;
}

export interface ICursorContext {
	fileUri: URI;
	position: { line: number; column: number };
	surroundingCode: string;
	language: string;
}

export enum PairProgrammingMode {
	Off = "off",
	Suggestive = "suggestive", // Shows suggestions but doesn't auto-apply
	Active = "active", // Auto-applies high-confidence suggestions
	Live = "live", // Real-time collaboration with AI
}

export interface IPairProgrammingConfig {
	mode: PairProgrammingMode;
	enableCursorTracking: boolean;
	suggestionDelay: number; // milliseconds
	minConfidenceThreshold: number; // 0-1
	enableInlineCompletions: boolean;
	enableRefactorSuggestions: boolean;
}

export interface IAlphaCodePairProgrammingService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when a suggestion is generated
	 */
	readonly onDidGenerateSuggestion: Event<IPairProgrammingSuggestion>;

	/**
	 * Event fired when cursor context changes
	 */
	readonly onDidChangeCursorContext: Event<ICursorContext>;

	/**
	 * Event fired when a suggestion status changes
	 */
	readonly onDidChangeSuggestionStatus: Event<IPairProgrammingSuggestion>;

	/**
	 * Get current configuration
	 */
	getConfig(): IPairProgrammingConfig;

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<IPairProgrammingConfig>): void;

	/**
	 * Enable/disable pair programming
	 */
	setMode(mode: PairProgrammingMode): void;

	/**
	 * Request suggestion for current cursor context
	 */
	requestSuggestion(
		context: ICursorContext,
	): Promise<IPairProgrammingSuggestion | undefined>;

	/**
	 * Accept a suggestion
	 */
	acceptSuggestion(suggestionId: string): Promise<void>;

	/**
	 * Reject a suggestion
	 */
	rejectSuggestion(suggestionId: string): void;

	/**
	 * Get pending suggestions
	 */
	getPendingSuggestions(): IPairProgrammingSuggestion[];

	/**
	 * Clear all pending suggestions
	 */
	clearSuggestions(): void;

	/**
	 * Get a specific suggestion by ID
	 */
	getSuggestion(suggestionId: string): IPairProgrammingSuggestion | undefined;

	/**
	 * Accept all pending suggestions
	 */
	acceptAllSuggestions(): Promise<void>;

	/**
	 * Reject all pending suggestions
	 */
	rejectAllSuggestions(): Promise<void>;
}
