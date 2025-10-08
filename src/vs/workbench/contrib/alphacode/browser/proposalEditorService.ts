/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from "../../../../base/common/lifecycle.js";
import { ITextModel } from "../../../../editor/common/model.js";
import { IModelDeltaDecoration, TrackedRangeStickiness } from "../../../../editor/common/model.js";
import { Range } from "../../../../editor/common/core/range.js";
import { IEditProposalWithChanges } from "../common/chatService.js";
import { ICodeEditor } from "../../../../editor/browser/editorBrowser.js";
import { ITextModelService } from "../../../../editor/common/services/resolverService.js";
import { URI } from "../../../../base/common/uri.js";
import { Emitter, Event } from "../../../../base/common/event.js";

/**
 * Manages inline diff decorations for edit proposals in the active editor
 */
export class ProposalEditorService extends Disposable {
	private activeProposals = new Map<string, IEditProposalWithChanges>(); // filePath -> proposal
	private decorationsByFile = new Map<string, string[]>(); // filePath -> decorationIds
	private editorListeners = new Map<ICodeEditor, IDisposable>();

	private readonly _onDidAcceptBlock = this._register(new Emitter<{ proposalId: string; blockIndex: number }>());
	readonly onDidAcceptBlock: Event<{ proposalId: string; blockIndex: number }> = this._onDidAcceptBlock.event;

	private readonly _onDidRejectBlock = this._register(new Emitter<{ proposalId: string; blockIndex: number }>());
	readonly onDidRejectBlock: Event<{ proposalId: string; blockIndex: number }> = this._onDidRejectBlock.event;

	constructor(
		
		@ITextModelService private readonly textModelService: ITextModelService
	) {
		super();
	}

	/**
	 * Show proposal diff in the editor
	 */
	async showProposal(proposal: IEditProposalWithChanges): Promise<void> {
		this.activeProposals.set(proposal.filePath, proposal);

		// Get the model for the file
		const uri = URI.file(proposal.filePath);
		const ref = await this.textModelService.createModelReference(uri);
		const model = ref.object.textEditorModel;

		if (model) {
			this.applyDecorations(model, proposal);
		}

		ref.dispose();
	}

	/**
	 * Clear proposal for a file
	 */
	async clearProposal(filePath: string): Promise<void> {
		this.activeProposals.delete(filePath);

		const uri = URI.file(filePath);
		const ref = await this.textModelService.createModelReference(uri);
		const model = ref.object.textEditorModel;

		if (model) {
			this.clearDecorations(model, filePath);
		}

		ref.dispose();
	}

	/**
	 * Apply decorations to show diff blocks
	 */
	private applyDecorations(model: ITextModel, proposal: IEditProposalWithChanges): void {
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
			let glyphClassName = 'codicon-diff-modified';

			if (!change.oldText && change.newText) {
				className = 'alphacode-proposal-line-added';
				glyphClassName = 'codicon-diff-added';
			} else if (change.oldText && !change.newText) {
				className = 'alphacode-proposal-line-removed';
				glyphClassName = 'codicon-diff-removed';
			}

			deltaDecorations.push({
				range,
				options: {
					isWholeLine: true,
					description: '',
					className: className,
					linesDecorationsClassName: 'alphacode-proposal-line-gutter',
					stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
					glyphMarginClassName: glyphClassName,
					glyphMarginHoverMessage: {
						value: this.getHoverMessage(change, i, proposal.id)
					},
					overviewRuler: {
						color: 'rgba(255, 165, 0, 0.5)',
						position: 4 // OverviewRulerLane.Full
					}
				}
			});
		}

		// Clear old decorations and apply new ones
		const oldDecorations = this.decorationsByFile.get(proposal.filePath) || [];
		const decorationIds = model.deltaDecorations(oldDecorations, deltaDecorations);
		this.decorationsByFile.set(proposal.filePath, decorationIds);
	}

	/**
	 * Clear decorations for a file
	 */
	private clearDecorations(model: ITextModel, filePath: string): void {
		const decorationIds = this.decorationsByFile.get(filePath);
		if (decorationIds) {
			model.deltaDecorations(decorationIds, []);
			this.decorationsByFile.delete(filePath);
		}
	}

	private getHoverMessage(change: any, index: number, proposalId: string): string {
		let message = `**AI Proposal - Block ${index + 1}**\n\n`;

		if (change.oldText && change.newText) {
			message += `**Before:**\n\`\`\`\n${change.oldText}\n\`\`\`\n\n`;
			message += `**After:**\n\`\`\`\n${change.newText}\n\`\`\`\n\n`;
		} else if (!change.oldText && change.newText) {
			message += `**Added:**\n\`\`\`\n${change.newText}\n\`\`\`\n\n`;
		} else if (change.oldText && !change.newText) {
			message += `**Removed:**\n\`\`\`\n${change.oldText}\n\`\`\`\n\n`;
		}

		message += `---\n`;
		message += `[Accept Block](command:alphacode.acceptProposalBlock?${encodeURIComponent(JSON.stringify([proposalId, index]))}) | `;
		message += `[Reject Block](command:alphacode.rejectProposalBlock?${encodeURIComponent(JSON.stringify([proposalId, index]))})`;

		return message;
	}

	override dispose(): void {
		for (const listener of this.editorListeners.values()) {
			listener.dispose();
		}
		this.editorListeners.clear();
		this.decorationsByFile.clear();
		this.activeProposals.clear();
		super.dispose();
	}
}
