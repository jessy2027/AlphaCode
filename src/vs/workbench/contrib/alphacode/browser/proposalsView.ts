/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/proposalsView.css';
import {
	$,
	addDisposableListener,
	append,
	clearNode,
} from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IAlphaCodeChatService, IEditProposalWithChanges } from '../common/chatService.js';

export class ProposalsView extends Disposable {
	private proposalsList: HTMLElement | undefined;
	private rootContainer: HTMLElement | undefined;
	private acceptAllBtn: HTMLButtonElement | undefined;
	private rejectAllBtn: HTMLButtonElement | undefined;
	private headerElement: HTMLElement | undefined;
	private toggleBtn: HTMLElement | undefined;
	private viewAllLink: HTMLElement | undefined;
	private isExpanded: boolean = false;

	constructor(
		@IAlphaCodeChatService private readonly chatService: IAlphaCodeChatService
	) {
		super();

		// Listen to proposal events
		this._register(
			this.chatService.onDidCreateProposal(() => this.render())
		);
		this._register(
			this.chatService.onDidChangeProposalStatus(() => this.render())
		);
	}

	renderIn(container: HTMLElement): void {
		this.rootContainer = container;
		container.classList.add('alphacode-proposals-view');

		// Header with toggle
		this.headerElement = append(container, $('.proposals-header'));
		this.toggleBtn = append(this.headerElement, $('.proposals-toggle'));
		this.viewAllLink = append(this.headerElement, $('a.view-all-link', undefined, 'view all'));

		this._register(
			addDisposableListener(this.toggleBtn, 'click', () => {
				this.isExpanded = !this.isExpanded;
				this.render();
			})
		);

		// Proposals list
		this.proposalsList = append(container, $('.proposals-list'));

		// Global actions (at the bottom)
		const globalActionsContainer = append(container, $('.proposals-global-actions'));
		this.rejectAllBtn = append(
			globalActionsContainer,
			$('button.monaco-button.monaco-text-button.secondary', undefined, localize('alphacode.proposals.rejectAll', 'Reject all'))
		) as HTMLButtonElement;
		this.acceptAllBtn = append(
			globalActionsContainer,
			$('button.monaco-button.monaco-text-button', undefined, localize('alphacode.proposals.acceptAll', 'Accept all'))
		) as HTMLButtonElement;

		this._register(
			addDisposableListener(this.acceptAllBtn, 'click', async () => {
				try {
					await this.chatService.acceptAllProposals();
					this.render();
				} catch (error) {
					console.error('Failed to accept all proposals', error);
				}
			})
		);

		this._register(
			addDisposableListener(this.rejectAllBtn, 'click', async () => {
				try {
					await this.chatService.rejectAllProposals();
					this.render();
				} catch (error) {
					console.error('Failed to reject all proposals', error);
				}
			})
		);

		this.render();
	}

	private render(): void {
		if (!this.proposalsList || !this.rootContainer || !this.toggleBtn || !this.viewAllLink) {
			return;
		}

		clearNode(this.proposalsList);

		const proposals = this.chatService.getPendingProposals();

		// Hide the entire view if no proposals
		if (proposals.length === 0) {
			this.rootContainer.style.display = 'none';
			// Disable global buttons
			if (this.acceptAllBtn) {
				this.acceptAllBtn.disabled = true;
			}
			if (this.rejectAllBtn) {
				this.rejectAllBtn.disabled = true;
			}
			return;
		}

		// Show the view if proposals exist
		this.rootContainer.style.display = 'block';
		// Enable global buttons
		if (this.acceptAllBtn) {
			this.acceptAllBtn.disabled = false;
		}
		if (this.rejectAllBtn) {
			this.rejectAllBtn.disabled = false;
		}

		// Update header text
		const fileCount = proposals.length;
		const hasChanges = proposals.some(p => p.changes.length > 0);
		const headerText = hasChanges
			? `${fileCount} file${fileCount > 1 ? 's' : ''} with changes`
			: `${fileCount} file${fileCount > 1 ? 's' : ''}`;

		clearNode(this.toggleBtn);
		// allow-any-unicode-next-line
		const arrow = this.isExpanded ? '\u25BC' : '\u25B6'; // ▼ : ▶
		append(this.toggleBtn, $('span.arrow', undefined, arrow));
		append(this.toggleBtn, $('span.text', undefined, headerText));

		// Show/hide view all link and proposals list based on expanded state
		this.viewAllLink.style.display = this.isExpanded ? 'inline' : 'none';
		this.proposalsList.style.display = this.isExpanded ? 'block' : 'none';

		if (this.isExpanded) {
			for (const proposal of proposals) {
				this.renderProposal(proposal);
			}
		}
	}

	private renderProposal(proposal: IEditProposalWithChanges): void {
		if (!this.proposalsList) {
			return;
		}

		const proposalCard = append(this.proposalsList, $('.proposal-card'));
		proposalCard.setAttribute('data-proposal-id', proposal.id);

		// Header with file name and change stats
		const header = append(proposalCard, $('.proposal-header'));
		const titleRow = append(header, $('.proposal-title-row'));

		// File icon
		append(
			titleRow,
			$('span.codicon.codicon-file', undefined)
		);

		// File name
		append(
			titleRow,
			$('span.proposal-path', { title: proposal.filePath }, proposal.path)
		);

		// Change stats (+5 -12)
		const additions = proposal.changes.filter(c => c.newText && !c.oldText).length;
		const deletions = proposal.changes.filter(c => c.oldText && !c.newText).length;

		const changeStats = [];
		if (additions > 0) {
			changeStats.push(`+${additions}`);
		}
		if (deletions > 0) {
			changeStats.push(`-${deletions}`);
		}

		if (changeStats.length > 0) {
			append(
				titleRow,
				$('span.change-stats', undefined, changeStats.join(' '))
			);
		}

	}

	override dispose(): void {
		super.dispose();
	}
}
