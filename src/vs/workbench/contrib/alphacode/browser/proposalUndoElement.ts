/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IResourceUndoRedoElement, UndoRedoElementType } from '../../../../platform/undoRedo/common/undoRedo.js';
import { ITextModel } from '../../../../editor/common/model.js';

/**
 * Transaction snapshot for a proposal application
 */
export interface IProposalTransaction {
	readonly id: string;
	readonly proposalId: string;
	readonly filePath: string;
	readonly timestamp: number;
	readonly versionId: number;
	readonly originalContent: string;
	readonly appliedContent: string;
	readonly chunkIndexes: number[];
}

/**
 * Undo/Redo element for AI proposal edits
 * Integrates with VSCode's native undo/redo system
 */
export class ProposalUndoElement implements IResourceUndoRedoElement {
	readonly type = UndoRedoElementType.Resource;
	readonly label: string;
	readonly code: string = 'AlphaCodeProposal';
	readonly confirmBeforeUndo = false;

	private _isValid = true;

	constructor(
		readonly resource: URI,
		private readonly transaction: IProposalTransaction,
		private readonly getModel: () => ITextModel | null,
		private readonly applyContent: (content: string) => Promise<void>
	) {
		this.label = `Apply AI proposal: ${transaction.proposalId}`;
	}

	async undo(): Promise<void> {
		if (!this._isValid) {
			return;
		}

		const model = this.getModel();
		if (!model) {
			console.warn(`Model not found for ${this.resource.toString()}`);
			this._isValid = false;
			return;
		}

		// Restore original content
		await this.applyContent(this.transaction.originalContent);
	}

	async redo(): Promise<void> {
		if (!this._isValid) {
			return;
		}

		const model = this.getModel();
		if (!model) {
			console.warn(`Model not found for ${this.resource.toString()}`);
			this._isValid = false;
			return;
		}

		// Reapply the proposal changes
		await this.applyContent(this.transaction.appliedContent);
	}

	invalidate(): void {
		this._isValid = false;
	}

	getTransaction(): IProposalTransaction {
		return this.transaction;
	}
}
