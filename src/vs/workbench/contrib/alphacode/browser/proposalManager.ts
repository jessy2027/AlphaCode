/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from "../../../../base/common/event.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { IEditProposalWithChanges } from "../common/chatService.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { IEditorService } from "../../../services/editor/common/editorService.js";
import { URI } from "../../../../base/common/uri.js";
import type { IResourceDiffEditorInput } from "../../../common/editor.js";
import { TransactionManager } from "./transactionManager.js";
import { ITextModelService } from "../../../../editor/common/services/resolverService.js";
import { IUndoRedoService } from "../../../../platform/undoRedo/common/undoRedo.js";
import { IProposalTransaction } from "./proposalUndoElement.js";

/**
 * Manages edit proposals (create, accept, reject, diff viewing)
 */
export class ProposalManager extends Disposable {
	private readonly _onDidCreateProposal = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidCreateProposal: Event<IEditProposalWithChanges> = this._onDidCreateProposal.event;

	private readonly _onDidChangeStatus = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidChangeStatus: Event<IEditProposalWithChanges> = this._onDidChangeStatus.event;

	private pendingProposals = new Map<string, IEditProposalWithChanges>();
	private transactionManager: TransactionManager;

	constructor(
		private readonly fileService: IFileService,
		private readonly editorService: IEditorService,
		@ITextModelService textModelService: ITextModelService,
		@IUndoRedoService undoRedoService: IUndoRedoService
	) {
		super();
		this.transactionManager = this._register(new TransactionManager(textModelService, undoRedoService));
	}

	/**
	 * Add a new proposal
	 */
	async addProposal(proposal: IEditProposalWithChanges): Promise<void> {
		// Validate file path before adding proposal
		const isValid = await this.validateFilePath(proposal.filePath);
		if (!isValid) {
			throw new Error(`Invalid file path: ${proposal.filePath} is not a file or does not exist`);
		}

		this.pendingProposals.set(proposal.id, proposal);
		this._onDidCreateProposal.fire(proposal);
	}

	/**
	 * Validate that a path points to a file (not a directory)
	 */
	private async validateFilePath(filePath: string): Promise<boolean> {
		try {
			const uri = URI.file(filePath);

			// Check that URI scheme is 'file'
			if (uri.scheme !== 'file') {
				console.error(`Invalid URI scheme: ${uri.scheme}, expected 'file'`);
				return false;
			}

			// Check that path exists and is a file
			const stat = await this.fileService.stat(uri);
			if (!stat.isFile) {
				console.error(`Path is not a file: ${filePath}`);
				return false;
			}

			return true;
		} catch (error) {
			console.error(`Error validating file path ${filePath}:`, error);
			return false;
		}
	}

	/**
	 * Get a proposal by ID
	 */
	getProposal(id: string): IEditProposalWithChanges | undefined {
		return this.pendingProposals.get(id);
	}

	/**
	 * Get all pending proposals
	 */
	getPendingProposals(): IEditProposalWithChanges[] {
		return Array.from(this.pendingProposals.values())
			.filter(p => p.status === 'pending')
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Accept a proposal - applies changes to the active buffer using transactions
	 */
	async acceptProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		// Apply all chunks
		const allChunkIndexes = proposal.changes.map((_, idx) => idx);
		const transaction = await this.transactionManager.applyProposal(proposal, allChunkIndexes);

		proposal.status = 'accepted';
		this._onDidChangeStatus.fire(proposal);
		this.pendingProposals.delete(id);

		return `✓ Applied proposal ${id} to ${proposal.path}. Transaction ID: ${transaction.id}`;
	}

	/**
	 * Reject a proposal - no changes are applied
	 */
	async rejectProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		proposal.status = 'rejected';
		this._onDidChangeStatus.fire(proposal);
		this.pendingProposals.delete(id);

		return `✗ Rejected proposal ${id} for ${proposal.path}.`;
	}

	/**
	 * List all pending proposals
	 */
	listProposals(): string {
		if (this.pendingProposals.size === 0) {
			return "No pending edit proposals.";
		}

		const lines: string[] = ["Pending edit proposals:"];
		for (const proposal of this.pendingProposals.values()) {
			if (proposal.status === 'pending') {
				lines.push(`- ${proposal.id}: ${proposal.kind} ${proposal.path} (${proposal.changes.length} changes)`);
			}
		}

		return lines.join("\n");
	}

	/**
	 * Open diff editor for a proposal
	 */
	async openDiff(proposal: IEditProposalWithChanges): Promise<void> {
		try {
			const label = `${proposal.kind === "write" ? "Create" : "Edit"}: ${proposal.path}`;
			const fileName = proposal.path.split(/[/\\]/).pop() ?? "file";

			const originalUri = URI.from({
				scheme: "alphacode-original",
				path: `/${fileName}`,
				query: `id=${proposal.id}`,
			});

			const modifiedUri = URI.file(proposal.filePath);

			const input: IResourceDiffEditorInput = {
				original: { resource: originalUri },
				modified: { resource: modifiedUri },
				label,
				options: {
					preserveFocus: false,
					revealIfOpened: true,
					pinned: true,
				},
			};

			await this.editorService.openEditor(input);
		} catch (error) {
			console.error("Failed to open diff editor:", error);
		}
	}

	/**
	 * Apply partial changes from a proposal (accept/reject specific chunks)
	 */
	async applyPartialChanges(
		proposal: IEditProposalWithChanges,
		changeIndexes: number[],
		accept: boolean
	): Promise<void> {
		if (accept) {
			// Apply only selected chunks using transaction manager
			await this.transactionManager.applyProposal(proposal, changeIndexes);

			// Remove applied chunks from proposal
			proposal.changes = proposal.changes.filter((_, idx) => !changeIndexes.includes(idx));

			if (proposal.changes.length === 0) {
				proposal.status = 'accepted';
				this.pendingProposals.delete(proposal.id);
			} else {
				proposal.status = 'partially-accepted';
			}
		} else {
			// Reject specific chunks - just remove them from proposal
			proposal.changes = proposal.changes.filter((_, idx) => !changeIndexes.includes(idx));

			if (proposal.changes.length === 0) {
				await this.rejectProposal(proposal.id);
				return;
			}
		}

		this._onDidChangeStatus.fire(proposal);
	}

	/**
	 * Accept all pending proposals
	 */
	async acceptAll(): Promise<string[]> {
		const results: string[] = [];
		const pending = this.getPendingProposals();

		for (const proposal of pending) {
			try {
				await this.acceptProposal(proposal.id);
				results.push(`✓ ${proposal.path}`);
			} catch (error) {
				results.push(`✗ ${proposal.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return results;
	}

	/**
	 * Reject all pending proposals
	 */
	async rejectAll(): Promise<string[]> {
		const results: string[] = [];
		const pending = this.getPendingProposals();

		for (const proposal of pending) {
			try {
				await this.rejectProposal(proposal.id);
				results.push(`✓ ${proposal.path}`);
			} catch (error) {
				results.push(`✗ ${proposal.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return results;
	}

	/**
	 * Rollback a transaction by ID
	 */
	async rollbackTransaction(transactionId: string): Promise<void> {
		await this.transactionManager.rollback(transactionId);
	}

	/**
	 * Rollback all transactions for a file
	 */
	async rollbackFile(filePath: string): Promise<void> {
		await this.transactionManager.rollbackFile(filePath);
	}

	/**
	 * Get transaction history for a file
	 */
	getFileTransactions(filePath: string): IProposalTransaction[] {
		return this.transactionManager.getFileTransactions(filePath);
	}
}
