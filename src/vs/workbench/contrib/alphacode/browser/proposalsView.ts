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
import { IAlphaCodeChatService, IEditProposalWithChanges, IProposalDecision } from '../common/chatService.js';
import { getChangeSummary } from './diffUtils.js';

export class ProposalsView extends Disposable {
	private proposalsList: HTMLElement | undefined;
	private rootContainer: HTMLElement | undefined;
	private globalActionsContainer: HTMLElement | undefined;
	private acceptAllBtn: HTMLButtonElement | undefined;
	private rejectAllBtn: HTMLButtonElement | undefined;

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

		// Header
		const header = append(container, $('.proposals-header'));
		append(
			header,
			$('h3', undefined, localize('alphacode.proposals.title', 'AI Edit Proposals'))
		);

		// Global actions
		this.globalActionsContainer = append(container, $('.proposals-global-actions'));
		this.acceptAllBtn = append(
			this.globalActionsContainer,
			$('button.monaco-button.monaco-text-button', undefined, localize('alphacode.proposals.acceptAll', 'Accept All'))
		) as HTMLButtonElement;
		this.rejectAllBtn = append(
			this.globalActionsContainer,
			$('button.monaco-button.monaco-text-button.secondary', undefined, localize('alphacode.proposals.rejectAll', 'Reject All'))
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

		// Proposals list
		this.proposalsList = append(container, $('.proposals-list'));

		this.render();
	}

	private render(): void {
		if (!this.proposalsList || !this.rootContainer) {
			return;
		}

		clearNode(this.proposalsList);

		const proposals = this.chatService.getPendingProposals();

		// Masquer toute la vue si aucune proposition
		if (proposals.length === 0) {
			this.rootContainer.style.display = 'none';
			// Désactiver les boutons globaux
			if (this.acceptAllBtn) {
				this.acceptAllBtn.disabled = true;
			}
			if (this.rejectAllBtn) {
				this.rejectAllBtn.disabled = true;
			}
			return;
		}

		// Afficher la vue si des propositions existent
		this.rootContainer.style.display = 'block';
		// Activer les boutons globaux
		if (this.acceptAllBtn) {
			this.acceptAllBtn.disabled = false;
		}
		if (this.rejectAllBtn) {
			this.rejectAllBtn.disabled = false;
		}

		for (const proposal of proposals) {
			this.renderProposal(proposal);
		}
	}

	private renderProposal(proposal: IEditProposalWithChanges): void {
		if (!this.proposalsList) {
			return;
		}

		const proposalCard = append(this.proposalsList, $('.proposal-card'));

		// Header
		const header = append(proposalCard, $('.proposal-header'));
		const titleRow = append(header, $('.proposal-title-row'));
		append(
			titleRow,
			$('span.proposal-kind', undefined, proposal.kind === 'write' ? '📝 Create' : '✏️ Edit')
		);
		append(
			titleRow,
			$('span.proposal-path', { title: proposal.filePath }, proposal.path)
		);

		// Summary
		const summary = getChangeSummary(proposal.changes);
		append(
			header,
			$('span.proposal-summary', undefined, summary)
		);

		// Actions
		const actionsRow = append(header, $('.proposal-actions'));
		
		const acceptAllBtn = append(
			actionsRow,
			$('button.monaco-button.monaco-text-button.small', undefined, 'Accept All')
		) as HTMLButtonElement;
		
		const rejectAllBtn = append(
			actionsRow,
			$('button.monaco-button.monaco-text-button.secondary.small', undefined, 'Reject All')
		) as HTMLButtonElement;

		const viewDiffBtn = append(
			actionsRow,
			$('button.monaco-button.monaco-text-button.secondary.small', undefined, 'View Diff')
		) as HTMLButtonElement;

		this._register(
			addDisposableListener(acceptAllBtn, 'click', async () => {
				await this.applyDecision({
					proposalId: proposal.id,
					action: 'accept-all'
				});
			})
		);

		this._register(
			addDisposableListener(rejectAllBtn, 'click', async () => {
				await this.applyDecision({
					proposalId: proposal.id,
					action: 'reject-all'
				});
			})
		);

		this._register(
			addDisposableListener(viewDiffBtn, 'click', () => {
				// The diff is already opened by the service
				// This button could focus on the diff editor
			})
		);

		// Changes list (granular control)
		if (proposal.changes.length > 0) {
			const changesSection = append(proposalCard, $('.proposal-changes'));
			const changesHeader = append(changesSection, $('.changes-header'));
			append(
				changesHeader,
				$('span', undefined, localize('alphacode.proposals.changes', 'Changes ({0})', proposal.changes.length))
			);

			const toggleBtn = append(
				changesHeader,
				$('button.monaco-button.monaco-text-button.small', undefined, 'Show Details')
			) as HTMLButtonElement;

			const changesList = append(changesSection, $('.changes-list'));
			changesList.style.display = 'none';

			let expanded = false;
			this._register(
				addDisposableListener(toggleBtn, 'click', () => {
					expanded = !expanded;
					changesList.style.display = expanded ? 'block' : 'none';
					toggleBtn.textContent = expanded ? 'Hide Details' : 'Show Details';
				})
			);

			// Render each change
			proposal.changes.forEach((change, index) => {
				const changeItem = append(changesList, $('.change-item'));
				
				const changeHeader = append(changeItem, $('.change-header'));
				const checkbox = append(
					changeHeader,
					$('input', { type: 'checkbox', checked: 'checked' })
				) as HTMLInputElement;
				checkbox.dataset.changeIndex = String(index);

				append(
					changeHeader,
					$('span.line-number', undefined, `Line ${change.lineNumber}`)
				);

				// Show diff preview
				const diffPreview = append(changeItem, $('.diff-preview'));
				if (change.oldText) {
					append(
						diffPreview,
						$('div.diff-old', undefined, `- ${change.oldText}`)
					);
				}
				if (change.newText) {
					append(
						diffPreview,
						$('div.diff-new', undefined, `+ ${change.newText}`)
					);
				}
			});

			// Apply selected changes button
			const applySelectedBtn = append(
				changesSection,
				$('button.monaco-button.monaco-text-button.small', undefined, 'Apply Selected Changes')
			) as HTMLButtonElement;
			applySelectedBtn.style.display = 'none';
			
			this._register(
				addDisposableListener(toggleBtn, 'click', () => {
					applySelectedBtn.style.display = expanded ? 'block' : 'none';
				})
			);

			this._register(
				addDisposableListener(applySelectedBtn, 'click', async () => {
					const checkboxes = changesList.querySelectorAll('input[type="checkbox"]');
					const selectedIndexes: number[] = [];
					
					checkboxes.forEach((cb) => {
						const input = cb as HTMLInputElement;
						if (input.checked && input.dataset.changeIndex) {
							selectedIndexes.push(parseInt(input.dataset.changeIndex, 10));
						}
					});

					if (selectedIndexes.length > 0) {
						await this.applyDecision({
							proposalId: proposal.id,
							action: 'accept-changes',
							changeIndexes: selectedIndexes
						});
					}
				})
			);
		}
	}

	private async applyDecision(decision: IProposalDecision): Promise<void> {
		try {
			await this.chatService.applyProposalDecision(decision);
			this.render();
		} catch (error) {
			console.error('Failed to apply proposal decision', error);
			// TODO: Show error notification
		}
	}

	override dispose(): void {
		super.dispose();
	}
}
