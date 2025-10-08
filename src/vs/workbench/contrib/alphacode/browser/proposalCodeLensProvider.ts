/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from "../../../../base/common/cancellation.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { CodeLens, CodeLensList, CodeLensProvider } from "../../../../editor/common/languages.js";
import { ITextModel } from "../../../../editor/common/model.js";
import { Range } from "../../../../editor/common/core/range.js";
import { IEditProposalWithChanges } from "../common/chatService.js";
import { localize } from "../../../../nls.js";

/**
 * Provides CodeLens for accepting/rejecting proposal changes block by block
 */
export class ProposalCodeLensProvider extends Disposable implements CodeLensProvider {
	private activeProposals = new Map<string, IEditProposalWithChanges>(); // filePath -> proposal

	/**
	 * Register a proposal for a file
	 */
	registerProposal(filePath: string, proposal: IEditProposalWithChanges): void {
		this.activeProposals.set(filePath, proposal);
	}

	/**
	 * Unregister a proposal for a file
	 */
	unregisterProposal(filePath: string): void {
		this.activeProposals.delete(filePath);
	}

	/**
	 * Clear all proposals
	 */
	clearAll(): void {
		this.activeProposals.clear();
	}

	async provideCodeLenses(model: ITextModel, token: CancellationToken): Promise<CodeLensList | undefined> {
		const filePath = model.uri.fsPath;
		const proposal = this.activeProposals.get(filePath);

		if (!proposal || proposal.status !== 'pending') {
			return undefined;
		}

		const lenses: CodeLens[] = [];

		// Add CodeLens for each change block
		for (let i = 0; i < proposal.changes.length; i++) {
			const change = proposal.changes[i];
			const lineNumber = change.lineNumber;

			// Accept this block
			lenses.push({
				range: new Range(lineNumber, 1, lineNumber, 1),
				command: {
					id: 'alphacode.acceptProposalBlock',
					title: `$(check) ${localize('alphacode.proposal.acceptBlock', 'Accept')}`,
					arguments: [proposal.id, i]
				}
			});

			// Reject this block
			lenses.push({
				range: new Range(lineNumber, 1, lineNumber, 1),
				command: {
					id: 'alphacode.rejectProposalBlock',
					title: `$(close) ${localize('alphacode.proposal.rejectBlock', 'Reject')}`,
					arguments: [proposal.id, i]
				}
			});
		}

		// Add global accept/reject at the top of the file
		lenses.push({
			range: new Range(1, 1, 1, 1),
			command: {
				id: 'alphacode.acceptProposal',
				title: `$(check-all) ${localize('alphacode.proposal.acceptAll', 'Accept All Changes')}`,
				arguments: [proposal.id]
			}
		});

		lenses.push({
			range: new Range(1, 1, 1, 1),
			command: {
				id: 'alphacode.rejectProposal',
				title: `$(close-all) ${localize('alphacode.proposal.rejectAll', 'Reject All Changes')}`,
				arguments: [proposal.id]
			}
		});

		return { lenses, dispose: () => { } };
	}

	override dispose(): void {
		this.activeProposals.clear();
		super.dispose();
	}
}
