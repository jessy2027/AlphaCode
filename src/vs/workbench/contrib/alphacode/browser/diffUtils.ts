/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditProposalChange } from '../common/chatService.js';

/**
 * Calculate line-by-line changes between original and proposed content
 */
export function calculateLineChanges(
	originalContent: string,
	proposedContent: string
): IEditProposalChange[] {
	const originalLines = originalContent.split(/\r?\n/);
	const proposedLines = proposedContent.split(/\r?\n/);
	const changes: IEditProposalChange[] = [];

	// Simple line-by-line diff algorithm
	const maxLines = Math.max(originalLines.length, proposedLines.length);

	for (let i = 0; i < maxLines; i++) {
		const oldText = originalLines[i] ?? '';
		const newText = proposedLines[i] ?? '';

		if (oldText !== newText) {
			changes.push({
				lineNumber: i + 1,
				oldText,
				newText,
			});
		}
	}

	// Group consecutive changes for better visualization
	return groupConsecutiveChanges(changes);
}

/**
 * Group consecutive line changes into blocks
 */
function groupConsecutiveChanges(
	changes: IEditProposalChange[]
): IEditProposalChange[] {
	if (changes.length === 0) {
		return [];
	}

	const grouped: IEditProposalChange[] = [];
	let currentGroup: IEditProposalChange | null = null;

	for (const change of changes) {
		if (
			currentGroup &&
			change.lineNumber === currentGroup.lineNumber + currentGroup.oldText.split('\n').length
		) {
			// Merge consecutive changes
			currentGroup.oldText += '\n' + change.oldText;
			currentGroup.newText += '\n' + change.newText;
		} else {
			if (currentGroup) {
				grouped.push(currentGroup);
			}
			currentGroup = { ...change };
		}
	}

	if (currentGroup) {
		grouped.push(currentGroup);
	}

	return grouped;
}

/**
 * Apply specific changes to content
 */
export function applyChanges(
	originalContent: string,
	changes: IEditProposalChange[],
	changeIndexes: number[]
): string {
	const lines = originalContent.split(/\r?\n/);

	// Sort change indexes
	const sortedIndexes = [...changeIndexes].sort((a, b) => a - b);

	// Apply changes in reverse order to maintain line numbers
	for (let i = sortedIndexes.length - 1; i >= 0; i--) {
		const changeIndex = sortedIndexes[i];
		if (changeIndex < 0 || changeIndex >= changes.length) {
			continue;
		}

		const change = changes[changeIndex];
		const lineIndex = change.lineNumber - 1;

		if (lineIndex >= 0 && lineIndex < lines.length) {
			lines[lineIndex] = change.newText;
		} else if (lineIndex === lines.length) {
			// Append new line
			lines.push(change.newText);
		}
	}

	return lines.join('\n');
}

/**
 * Generate a summary of changes
 */
export function getChangeSummary(changes: IEditProposalChange[]): string {
	const addedLines = changes.filter(c => !c.oldText && c.newText).length;
	const removedLines = changes.filter(c => c.oldText && !c.newText).length;
	const modifiedLines = changes.filter(c => c.oldText && c.newText).length;

	const parts: string[] = [];
	if (addedLines > 0) {
		parts.push(`${addedLines} line${addedLines > 1 ? 's' : ''} added`);
	}
	if (removedLines > 0) {
		parts.push(`${removedLines} line${removedLines > 1 ? 's' : ''} removed`);
	}
	if (modifiedLines > 0) {
		parts.push(`${modifiedLines} line${modifiedLines > 1 ? 's' : ''} modified`);
	}

	return parts.join(', ') || 'No changes';
}
