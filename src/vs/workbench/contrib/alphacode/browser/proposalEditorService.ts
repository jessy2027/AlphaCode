/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from "../../../../base/common/lifecycle.js";
import { ITextModel } from "../../../../editor/common/model.js";
import { IModelDeltaDecoration, TrackedRangeStickiness } from "../../../../editor/common/model.js";
import { Range } from "../../../../editor/common/core/range.js";
import { IEditProposalWithChanges } from "../common/chatService.js";
import { ICodeEditor, IContentWidget, IContentWidgetPosition, ContentWidgetPositionPreference } from "../../../../editor/browser/editorBrowser.js";
import { ITextModelService } from "../../../../editor/common/services/resolverService.js";
import { URI } from "../../../../base/common/uri.js";
import { Emitter, Event } from "../../../../base/common/event.js";
import { IEditorService } from "../../../services/editor/common/editorService.js";

/**
 * Content widget for Accept/Reject buttons on hover
 */
class BlockActionWidget implements IContentWidget {
	private static readonly ID_PREFIX = 'alphacode.blockActionWidget';
	private readonly _domNode: HTMLElement;
	readonly allowEditorOverflow = true;
	private isHovered = false;
	private hideTimeout: any;

	constructor(
		private readonly editor: ICodeEditor,
		private readonly proposalId: string,
		private readonly blockIndex: number,
		private readonly range: Range,
		private readonly onAccept: (proposalId: string, blockIndex: number) => void,
		private readonly onReject: (proposalId: string, blockIndex: number) => void
	) {
		this._domNode = document.createElement('div');
		this._domNode.className = 'alphacode-block-actions';
		this._domNode.style.cssText = `
			display: flex;
			gap: 8px;
			padding: 6px 8px;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-editorWidget-border);
			border-radius: 4px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
			z-index: 10000;
			opacity: 0;
			transition: opacity 0.15s ease-in-out;
		`;

		// Animate in
		setTimeout(() => {
			this._domNode.style.opacity = '1';
		}, 10);

		const acceptBtn = document.createElement('button');
		acceptBtn.textContent = 'Accept';
		acceptBtn.className = 'alphacode-block-action-accept';
		acceptBtn.style.cssText = `
			padding: 3px 10px;
			background: #0e639c;
			color: #ffffff;
			border: none;
			border-radius: 3px;
			cursor: pointer;
			font-size: 11px;
			font-weight: 500;
			transition: background 0.1s;
		`;
		acceptBtn.onmouseenter = () => acceptBtn.style.background = '#1177bb';
		acceptBtn.onmouseleave = () => acceptBtn.style.background = '#0e639c';
		acceptBtn.onclick = () => {
			this.onAccept(this.proposalId, this.blockIndex);
			this.dispose();
		};

		const rejectBtn = document.createElement('button');
		rejectBtn.textContent = 'Reject';
		rejectBtn.className = 'alphacode-block-action-reject';
		rejectBtn.style.cssText = `
			padding: 3px 10px;
			background: var(--vscode-button-secondaryBackground, #5a5d5e);
			color: var(--vscode-button-secondaryForeground, #ffffff);
			border: none;
			border-radius: 3px;
			cursor: pointer;
			font-size: 11px;
			font-weight: 500;
			transition: background 0.1s;
		`;
		rejectBtn.onmouseenter = () => rejectBtn.style.background = '#6e7172';
		rejectBtn.onmouseleave = () => rejectBtn.style.background = 'var(--vscode-button-secondaryBackground, #5a5d5e)';
		rejectBtn.onclick = () => {
			this.onReject(this.proposalId, this.blockIndex);
			this.dispose();
		};

		this._domNode.appendChild(acceptBtn);
		this._domNode.appendChild(rejectBtn);

		// Keep widget visible when hovering over it
		this._domNode.onmouseenter = () => {
			this.isHovered = true;
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		};
		this._domNode.onmouseleave = () => {
			this.isHovered = false;
			this.scheduleHide();
		};
	}

	scheduleHide(): void {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
		}
		this.hideTimeout = setTimeout(() => {
			if (!this.isHovered) {
				this.dispose();
			}
		}, 200);
	}

	getId(): string {
		return `${BlockActionWidget.ID_PREFIX}.${this.proposalId}.${this.blockIndex}`;
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IContentWidgetPosition {
		return {
			position: {
				lineNumber: this.range.endLineNumber,
				column: 1
			},
			preference: [ContentWidgetPositionPreference.BELOW]
		};
	}

	dispose(): void {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
		}
		this.editor.removeContentWidget(this);
	}
}

/**
 * Manages inline diff decorations for edit proposals in the active editor
 */
export class ProposalEditorService extends Disposable {
	private activeProposals = new Map<string, IEditProposalWithChanges>(); // filePath -> proposal
	private decorationsByFile = new Map<string, string[]>(); // filePath -> decorationIds
	private editorListeners = new Map<ICodeEditor, IDisposable>();
	private activeWidgets = new Map<string, BlockActionWidget>(); // widgetId -> widget
	private decorationHoverListeners = new Map<string, IDisposable[]>(); // filePath -> listeners

	private readonly _onDidAcceptBlock = this._register(new Emitter<{ proposalId: string; blockIndex: number }>());
	readonly onDidAcceptBlock: Event<{ proposalId: string; blockIndex: number }> = this._onDidAcceptBlock.event;

	private readonly _onDidRejectBlock = this._register(new Emitter<{ proposalId: string; blockIndex: number }>());
	readonly onDidRejectBlock: Event<{ proposalId: string; blockIndex: number }> = this._onDidRejectBlock.event;

	constructor(
		@ITextModelService private readonly textModelService: ITextModelService,
		@IEditorService private readonly editorService: IEditorService
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
			this.attachHoverListeners(proposal);
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
		message += `Hover over the change to accept or reject`;

		return message;
	}

	/**
	 * Attach hover listeners to show Accept/Reject buttons
	 */
	private attachHoverListeners(proposal: IEditProposalWithChanges): void {
		const editor = this.getActiveEditor();
		if (!editor) return;

		// Clean up old listeners for this file
		this.cleanupHoverListeners(proposal.filePath);

		const listeners: IDisposable[] = [];

		// Listen to mouse move events
		listeners.push(editor.onMouseMove((e) => {
			if (!e.target.position) return;

			const lineNumber = e.target.position.lineNumber;

			// Find which block this line belongs to
			let blockIndex = -1;
			let blockRange: Range | null = null;

			for (let i = 0; i < proposal.changes.length; i++) {
				const change = proposal.changes[i];
				const oldLineCount = change.oldText ? change.oldText.split('\n').length : 1;
				const newLineCount = change.newText ? change.newText.split('\n').length : 1;
				const lineCount = Math.max(oldLineCount, newLineCount);
				const endLine = change.lineNumber + lineCount - 1;

				if (lineNumber >= change.lineNumber && lineNumber <= endLine) {
					blockIndex = i;
					blockRange = new Range(
						change.lineNumber,
						1,
						endLine,
						editor.getModel()?.getLineMaxColumn(endLine) || 1
					);
					break;
				}
			}

			// Show widget if hovering over a block
			if (blockIndex !== -1 && blockRange) {
				this.showBlockActionWidget(editor, proposal.id, blockIndex, blockRange);
			}
		}));

		// Listen to mouse leave
		listeners.push(editor.onMouseLeave(() => {
			// Hide widgets when mouse leaves editor
			for (const widget of this.activeWidgets.values()) {
				widget.scheduleHide();
			}
		}));

		this.decorationHoverListeners.set(proposal.filePath, listeners);
	}

	/**
	 * Show the Accept/Reject widget for a block
	 */
	private showBlockActionWidget(
		editor: ICodeEditor,
		proposalId: string,
		blockIndex: number,
		range: Range
	): void {
		const widgetId = `${proposalId}.${blockIndex}`;

		// If widget already exists, don't recreate
		if (this.activeWidgets.has(widgetId)) {
			return;
		}

		// Remove other widgets
		for (const [id, widget] of this.activeWidgets.entries()) {
			if (id !== widgetId) {
				widget.dispose();
				this.activeWidgets.delete(id);
			}
		}

		// Create new widget
		const widget = new BlockActionWidget(
			editor,
			proposalId,
			blockIndex,
			range,
			(pid, idx) => this.handleAcceptBlock(pid, idx),
			(pid, idx) => this.handleRejectBlock(pid, idx)
		);

		editor.addContentWidget(widget);
		this.activeWidgets.set(widgetId, widget);
	}

	/**
	 * Handle accepting a block
	 */
	private handleAcceptBlock(proposalId: string, blockIndex: number): void {
		this._onDidAcceptBlock.fire({ proposalId, blockIndex });

		// Remove the widget
		const widgetId = `${proposalId}.${blockIndex}`;
		const widget = this.activeWidgets.get(widgetId);
		if (widget) {
			widget.dispose();
			this.activeWidgets.delete(widgetId);
		}
	}

	/**
	 * Handle rejecting a block
	 */
	private handleRejectBlock(proposalId: string, blockIndex: number): void {
		this._onDidRejectBlock.fire({ proposalId, blockIndex });

		// Remove the widget
		const widgetId = `${proposalId}.${blockIndex}`;
		const widget = this.activeWidgets.get(widgetId);
		if (widget) {
			widget.dispose();
			this.activeWidgets.delete(widgetId);
		}
	}

	/**
	 * Get the active code editor
	 */
	private getActiveEditor(): ICodeEditor | null {
		const activeEditor = this.editorService.activeTextEditorControl;
		if (activeEditor && 'getModel' in activeEditor) {
			return activeEditor as ICodeEditor;
		}
		return null;
	}

	/**
	 * Clean up hover listeners for a file
	 */
	private cleanupHoverListeners(filePath: string): void {
		const listeners = this.decorationHoverListeners.get(filePath);
		if (listeners) {
			for (const listener of listeners) {
				listener.dispose();
			}
			this.decorationHoverListeners.delete(filePath);
		}
	}

	override dispose(): void {
		// Clean up all widgets
		for (const widget of this.activeWidgets.values()) {
			widget.dispose();
		}
		this.activeWidgets.clear();

		// Clean up all hover listeners
		for (const listeners of this.decorationHoverListeners.values()) {
			for (const listener of listeners) {
				listener.dispose();
			}
		}
		this.decorationHoverListeners.clear();

		// Clean up editor listeners
		for (const listener of this.editorListeners.values()) {
			listener.dispose();
		}
		this.editorListeners.clear();

		this.decorationsByFile.clear();
		this.activeProposals.clear();
		super.dispose();
	}
}
