/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from "../../../../base/common/event.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { VSBuffer } from "../../../../base/common/buffer.js";
import { IEditProposalWithChanges } from "../common/chatService.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { IEditorService } from "../../../services/editor/common/editorService.js";
import { URI } from "../../../../base/common/uri.js";
import { applyChanges } from "./diffUtils.js";
import type { IResourceDiffEditorInput } from "../../../common/editor.js";

/**
 * Manages edit proposals (create, accept, reject, diff viewing)
 */
export class ProposalManager extends Disposable {
	private readonly _onDidCreateProposal = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidCreateProposal: Event<IEditProposalWithChanges> = this._onDidCreateProposal.event;

	private readonly _onDidChangeStatus = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidChangeStatus: Event<IEditProposalWithChanges> = this._onDidChangeStatus.event;

	private pendingProposals = new Map<string, IEditProposalWithChanges>();
	private backupContents = new Map<string, string>();

	constructor(
		private readonly fileService: IFileService,
		private readonly editorService: IEditorService
	) {
		super();
	}

	/**
	 * Add a new proposal
	 */
	addProposal(proposal: IEditProposalWithChanges): void {
		this.pendingProposals.set(proposal.id, proposal);
		this.backupContents.set(proposal.filePath, proposal.originalContent);
		this._onDidCreateProposal.fire(proposal);
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
	 * Accept a proposal
	 */
	async acceptProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		const uri = URI.file(proposal.filePath);
		await this.fileService.writeFile(uri, VSBuffer.fromString(proposal.proposedContent));

		proposal.status = 'accepted';
		this._onDidChangeStatus.fire(proposal);
		this.pendingProposals.delete(id);
		this.backupContents.delete(proposal.filePath);

		return `✓ Applied proposal ${id} to ${proposal.path}.`;
	}

	/**
	 * Reject a proposal
	 */
	async rejectProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		const uri = URI.file(proposal.filePath);
		const backup = this.backupContents.get(proposal.filePath);

		if (backup !== undefined) {
			await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
		}

		proposal.status = 'rejected';
		this._onDidChangeStatus.fire(proposal);
		this.pendingProposals.delete(id);
		this.backupContents.delete(proposal.filePath);

		return `✗ Rejected proposal ${id} for ${proposal.path}. Changes have been rolled back.`;
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
	 * Apply partial changes from a proposal
	 */
	async applyPartialChanges(
		proposal: IEditProposalWithChanges,
		changeIndexes: number[],
		accept: boolean
	): Promise<void> {
		const uri = URI.file(proposal.filePath);

		if (accept) {
			const newContent = applyChanges(
				proposal.originalContent,
				proposal.changes,
				changeIndexes
			);
			await this.fileService.writeFile(uri, VSBuffer.fromString(newContent));
			proposal.status = 'partially-accepted';
		} else {
			const remainingChanges = proposal.changes.filter((_change: any, index: number) =>
				!changeIndexes.includes(index)
			);

			if (remainingChanges.length === 0) {
				await this.rejectProposal(proposal.id);
				return;
			}

			proposal.changes = remainingChanges;
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
}
