/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IEditProposalWithChanges, IEditProposalChange } from '../common/chatService.js';
import { ProposalUndoElement, IProposalTransaction } from './proposalUndoElement.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';

/**
 * Manages transactional application and rollback of AI proposals
 * Integrates with VSCode's undo/redo system for native Ctrl+Z support
 */
export class TransactionManager extends Disposable {
	private transactions = new Map<string, IProposalTransaction>();
	private transactionsByFile = new Map<string, Set<string>>();

	constructor(
		@ITextModelService private readonly textModelService: ITextModelService,
		@IUndoRedoService private readonly undoRedoService: IUndoRedoService
	) {
		super();
	}

	/**
	 * Apply proposal changes to the active buffer with transaction support
	 */
	async applyProposal(
		proposal: IEditProposalWithChanges,
		chunkIndexes: number[]
	): Promise<IProposalTransaction> {
		const uri = URI.file(proposal.filePath);
		const ref = await this.textModelService.createModelReference(uri);

		try {
			const model = ref.object.textEditorModel;
			if (!model) {
				throw new Error(`No model found for ${proposal.filePath}`);
			}

			// Capture current state
			const versionId = model.getVersionId();
			const originalContent = model.getValue();

			// Apply changes
			const appliedContent = await this.applyChangesToModel(model, proposal.changes, chunkIndexes);

			// Create transaction record
			const transaction: IProposalTransaction = {
				id: generateUuid(),
				proposalId: proposal.id,
				filePath: proposal.filePath,
				timestamp: Date.now(),
				versionId,
				originalContent,
				appliedContent,
				chunkIndexes
			};

			// Register with undo/redo system
			const undoElement = new ProposalUndoElement(
				uri,
				transaction,
				() => this.getModel(uri),
				(content) => this.applyContentToModel(uri, content)
			);

			this.undoRedoService.pushElement(undoElement);

			// Store transaction
			this.transactions.set(transaction.id, transaction);
			if (!this.transactionsByFile.has(proposal.filePath)) {
				this.transactionsByFile.set(proposal.filePath, new Set());
			}
			this.transactionsByFile.get(proposal.filePath)!.add(transaction.id);

			return transaction;
		} finally {
			ref.dispose();
		}
	}

	/**
	 * Rollback a specific transaction
	 */
	async rollback(transactionId: string): Promise<void> {
		const transaction = this.transactions.get(transactionId);
		if (!transaction) {
			throw new Error(`Transaction ${transactionId} not found`);
		}

		const uri = URI.file(transaction.filePath);
		await this.applyContentToModel(uri, transaction.originalContent);

		// Remove from tracking
		this.transactions.delete(transactionId);
		const fileTransactions = this.transactionsByFile.get(transaction.filePath);
		if (fileTransactions) {
			fileTransactions.delete(transactionId);
			if (fileTransactions.size === 0) {
				this.transactionsByFile.delete(transaction.filePath);
			}
		}
	}

	/**
	 * Rollback all transactions for a specific file
	 */
	async rollbackFile(filePath: string): Promise<void> {
		const transactionIds = this.transactionsByFile.get(filePath);
		if (!transactionIds || transactionIds.size === 0) {
			return;
		}

		// Rollback in reverse chronological order
		const sortedTransactions = Array.from(transactionIds)
			.map(id => this.transactions.get(id)!)
			.sort((a, b) => b.timestamp - a.timestamp);

		for (const transaction of sortedTransactions) {
			await this.rollback(transaction.id);
		}
	}

	/**
	 * Get all transactions for a file
	 */
	getFileTransactions(filePath: string): IProposalTransaction[] {
		const transactionIds = this.transactionsByFile.get(filePath);
		if (!transactionIds) {
			return [];
		}

		return Array.from(transactionIds)
			.map(id => this.transactions.get(id)!)
			.filter(t => t !== undefined)
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Get a specific transaction
	 */
	getTransaction(transactionId: string): IProposalTransaction | undefined {
		return this.transactions.get(transactionId);
	}

	/**
	 * Clear all transactions
	 */
	clearTransactions(): void {
		this.transactions.clear();
		this.transactionsByFile.clear();
	}

	/**
	 * Apply changes to a text model using edit operations
	 */
	private async applyChangesToModel(
		model: ITextModel,
		changes: IEditProposalChange[],
		chunkIndexes: number[]
	): Promise<string> {
		// Filter only the chunks to apply
		const selectedChanges = changes.filter((_, idx) => chunkIndexes.includes(idx));

		if (selectedChanges.length === 0) {
			return model.getValue();
		}

		// Create edit operations
		const edits = selectedChanges.map(change => {
			const lineNumber = change.lineNumber;
			const lineCount = change.oldText ? change.oldText.split('\n').length : 1;
			const endLine = Math.min(lineNumber + lineCount - 1, model.getLineCount());

			const range = new Range(
				lineNumber,
				1,
				endLine,
				model.getLineMaxColumn(endLine)
			);

			return EditOperation.replace(range, change.newText);
		});

		// Apply all edits in a single transaction
		model.pushEditOperations(
			[],
			edits,
			() => null
		);

		return model.getValue();
	}

	/**
	 * Apply content directly to a model (for undo/redo)
	 */
	private async applyContentToModel(uri: URI, content: string): Promise<void> {
		const ref = await this.textModelService.createModelReference(uri);
		try {
			const model = ref.object.textEditorModel;
			if (!model) {
				throw new Error(`No model found for ${uri.toString()}`);
			}

			const fullRange = model.getFullModelRange();
			model.pushEditOperations(
				[],
				[EditOperation.replace(fullRange, content)],
				() => null
			);
		} finally {
			ref.dispose();
		}
	}

	/**
	 * Get a model for a URI
	 */
	private getModel(uri: URI): ITextModel | null {
		try {
			const model = this.textModelService.createModelReference(uri);
			return model ? (model as any).object?.textEditorModel : null;
		} catch {
			return null;
		}
	}

	override dispose(): void {
		this.clearTransactions();
		super.dispose();
	}
}
