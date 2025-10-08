/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from "../../../../base/common/lifecycle.js";
import { ITextModel } from "../../../../editor/common/model.js";
import { IModelDeltaDecoration, TrackedRangeStickiness } from "../../../../editor/common/model.js";
import { Range } from "../../../../editor/common/core/range.js";
import { IEditProposalWithChanges } from "../common/chatService.js";

/**
 * Manages decorations for edit proposals in the editor
 */
export class ProposalDecorationProvider extends Disposable {
	private decorations: Map<string, string[]> = new Map(); // proposalId -> decorationIds

	/**
	 * Apply decorations to show diff blocks in the editor
	 */
	applyDecorations(model: ITextModel, proposal: IEditProposalWithChanges): void {
		const deltaDecorations: IModelDeltaDecoration[] = [];

		// Create decorations for each change block
		for (let i = 0; i < proposal.changes.length; i++) {
			const change = proposal.changes[i];
			const lineNumber = change.lineNumber;

			// Calculate the number of lines in the change
			const oldLineCount = change.oldText ? change.oldText.split('\n').length : 1;
			const newLineCount = change.newText ? change.newText.split('\n').length : 1;
			const lineCount = Math.max(oldLineCount, newLineCount);

			// Create a decoration for the modified lines
			const range = new Range(
				lineNumber,
				1,
				Math.min(lineNumber + lineCount - 1, model.getLineCount()),
				model.getLineMaxColumn(Math.min(lineNumber + lineCount - 1, model.getLineCount()))
			);

			// Determine the type of change for styling
			let className = 'alphacode-proposal-line-modified';
			if (!change.oldText && change.newText) {
				className = 'alphacode-proposal-line-added';
			} else if (change.oldText && !change.newText) {
				className = 'alphacode-proposal-line-removed';
			}

			deltaDecorations.push({
				range,
				options: {
					isWholeLine: true,
				description: '',
					className: className,
					linesDecorationsClassName: 'alphacode-proposal-line-gutter',
					stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
					glyphMarginClassName: 'alphacode-proposal-glyph',
					glyphMarginHoverMessage: {
						value: this.getHoverMessage(change, i)
					},
					overviewRuler: {
						color: 'rgba(255, 165, 0, 0.5)',
						position: 4 // OverviewRulerLane.Full
					}
				}
			});
		}

		// Apply all decorations at once
		const decorationIds = model.deltaDecorations([], deltaDecorations);
		this.decorations.set(proposal.id, decorationIds);
	}

	/**
	 * Remove decorations for a proposal
	 */
	clearDecorations(model: ITextModel, proposalId: string): void {
		const decorationIds = this.decorations.get(proposalId);
		if (decorationIds) {
			model.deltaDecorations(decorationIds, []);
			this.decorations.delete(proposalId);
		}
	}

	/**
	 * Remove all decorations
	 */
	clearAllDecorations(model: ITextModel): void {
		for (const [_proposalId, decorationIds] of this.decorations.entries()) {
			model.deltaDecorations(decorationIds, []);
		}
		this.decorations.clear();
	}

	private getHoverMessage(change: any, index: number): string {
		let message = `**Change ${index + 1}**\n\n`;

		if (change.oldText && change.newText) {
			message += `**Before:**\n\`\`\`\n${change.oldText}\n\`\`\`\n\n`;
			message += `**After:**\n\`\`\`\n${change.newText}\n\`\`\``;
		} else if (!change.oldText && change.newText) {
			message += `**Added:**\n\`\`\`\n${change.newText}\n\`\`\``;
		} else if (change.oldText && !change.newText) {
			message += `**Removed:**\n\`\`\`\n${change.oldText}\n\`\`\``;
		}

		return message;
	}

	override dispose(): void {
		this.decorations.clear();
		super.dispose();
	}
}
