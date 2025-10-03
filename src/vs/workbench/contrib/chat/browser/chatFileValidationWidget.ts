/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { escape } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IValidationReport } from './chatFileValidationService.js';

const $ = dom.$;

export interface IValidationWidgetOptions {
	showDetails?: boolean;
	allowRetry?: boolean;
	showSuggestions?: boolean;
	compactMode?: boolean;
}

export class ChatFileValidationWidget extends Disposable {
	private readonly _onRetryRequested = this._register(new Emitter<string>());
	readonly onRetryRequested = this._onRetryRequested.event;

	private readonly _onDismissed = this._register(new Emitter<void>());
	readonly onDismissed = this._onDismissed.event;

	private readonly container: HTMLElement;
	private headerElement!: HTMLElement;
	private contentElement!: HTMLElement;
	private actionsElement!: HTMLElement;

	private currentReport: IValidationReport | undefined;
	private isExpanded = false;

	constructor(
		parent: HTMLElement,
		private readonly options: IValidationWidgetOptions = {},
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		this.container = dom.append(parent, $('.chat-file-validation-widget'));
		this.createUI();
		this.updateTheme();

		this._register(this.themeService.onDidColorThemeChange(() => this.updateTheme()));
	}

	private createUI(): void {
		// En-tête avec résumé
		this.headerElement = dom.append(this.container, $('.validation-header'));

		// Contenu détaillé (masqué par défaut)
		this.contentElement = dom.append(this.container, $('.validation-content'));
		this.contentElement.style.display = 'none';

		// Actions
		this.actionsElement = dom.append(this.container, $('.validation-actions'));

		this.hide();
	}

	showValidationReport(report: IValidationReport): void {
		this.currentReport = report;
		this.updateDisplay();
		this.show();
	}

	showValidationError(fileName: string, error: string): void {
		const errorReport: IValidationReport = {
			fileName,
			overallValid: false,
			results: [{
				valid: false,
				severity: 'error',
				message: error,
				code: 'VALIDATION_ERROR'
			}],
			timestamp: new Date(),
			processingTime: 0
		};

		this.showValidationReport(errorReport);
	}

	private updateDisplay(): void {
		if (!this.currentReport) {
			return;
		}

		this.updateHeader();
		this.updateContent();
		this.updateActions();
		this.updateContainerClass();
	}

	private updateHeader(): void {
		if (!this.currentReport) return;

		const { fileName, overallValid, results } = this.currentReport;

		// Icône de statut
		const statusIcon = overallValid
			? ThemeIcon.asClassNameArray(Codicon.checkAll).join(' ')
			: ThemeIcon.asClassNameArray(Codicon.error).join(' ');

		// Compteurs par sévérité
		const errorCount = results.filter(r => r.severity === 'error' && !r.valid).length;
		const warningCount = results.filter(r => r.severity === 'warning' && !r.valid).length;
		const infoCount = results.filter(r => r.severity === 'info').length;

		// Texte de statut
		let statusText: string;
		if (overallValid) {
			statusText = localize('validationPassed', 'Validation passed');
		} else if (errorCount > 0) {
			statusText = localize('validationFailed', '{0} error(s) found', errorCount);
		} else {
			statusText = localize('validationWarnings', '{0} warning(s) found', warningCount);
		}

		this.headerElement.innerHTML = `
			<div class="validation-status">
				<span class="status-icon ${statusIcon}"></span>
				<span class="file-name">${escape(fileName)}</span>
				<span class="status-text">${statusText}</span>
			</div>
			<div class="validation-summary">
				${errorCount > 0 ? `<span class="error-count">${errorCount} errors</span>` : ''}
				${warningCount > 0 ? `<span class="warning-count">${warningCount} warnings</span>` : ''}
				${infoCount > 0 ? `<span class="info-count">${infoCount} info</span>` : ''}
				<span class="processing-time">${this.currentReport.processingTime}ms</span>
			</div>
		`;

		// Bouton d'expansion si détails disponibles
		if (this.options.showDetails !== false && results.length > 0) {
			const expandButton = dom.append(this.headerElement, $('button.expand-button'));
			expandButton.innerHTML = `<span class="${ThemeIcon.asClassNameArray(Codicon.chevronRight).join(' ')}"></span>`;
			expandButton.title = localize('showDetails', 'Show details');

			this._register(dom.addDisposableListener(expandButton, 'click', () => {
				this.toggleExpanded();
			}));
		}
	}

	private updateContent(): void {
		if (!this.currentReport || !this.options.showDetails) return;

		const { results } = this.currentReport;
		this.contentElement.innerHTML = '';

		for (const result of results) {
			const resultElement = dom.append(this.contentElement, $('.validation-result'));
			resultElement.className = `validation-result ${result.severity} ${result.valid ? 'valid' : 'invalid'}`;

			// Icône de sévérité
			let severityIcon: ThemeIcon = Codicon.info;
			switch (result.severity) {
				case 'error':
					severityIcon = result.valid ? Codicon.check : Codicon.error;
					break;
				case 'warning':
					severityIcon = result.valid ? Codicon.check : Codicon.warning;
					break;
				case 'info':
				default:
					severityIcon = Codicon.info;
					break;
			}

			resultElement.innerHTML = `
				<div class="result-header">
					<span class="severity-icon ${ThemeIcon.asClassNameArray(severityIcon).join(' ')}"></span>
					<span class="result-message">${escape(result.message)}</span>
					<span class="result-code">${result.code}</span>
				</div>
			`;

			// Suggestions
			if (this.options.showSuggestions !== false && result.suggestions && result.suggestions.length > 0) {
				const suggestionsElement = dom.append(resultElement, $('.result-suggestions'));
				suggestionsElement.innerHTML = `
					<div class="suggestions-header">${localize('suggestions', 'Suggestions:')}</div>
					<ul class="suggestions-list">
						${result.suggestions.map(s => `<li>${escape(s)}</li>`).join('')}
					</ul>
				`;
			}

			// Détails techniques
			if (result.details) {
				const detailsElement = dom.append(resultElement, $('.result-details'));
				detailsElement.innerHTML = `
					<details>
						<summary>${localize('technicalDetails', 'Technical details')}</summary>
						<pre>${escape(JSON.stringify(result.details, null, 2))}</pre>
					</details>
				`;
			}
		}
	}

	private updateActions(): void {
		if (!this.currentReport) return;

		this.actionsElement.innerHTML = '';

		// Bouton de nouvelle tentative
		if (this.options.allowRetry !== false && !this.currentReport.overallValid) {
			const retryButton = this._register(new Button(this.actionsElement, {
				title: localize('retryValidation', 'Retry validation'),
				supportIcons: true
			}));
			retryButton.label = `$(${Codicon.refresh.id}) ${localize('retry', 'Retry')}`;

			this._register(retryButton.onDidClick(() => {
				if (this.currentReport) {
					this._onRetryRequested.fire(this.currentReport.fileName);
				}
			}));
		}

		// Bouton de fermeture
		const dismissButton = this._register(new Button(this.actionsElement, {
			title: localize('dismiss', 'Dismiss'),
			supportIcons: true
		}));
		dismissButton.label = `$(${Codicon.close.id})`;

		this._register(dismissButton.onDidClick(() => {
			this.hide();
			this._onDismissed.fire();
		}));

	}

	private updateContainerClass(): void {
		if (!this.currentReport) return;

		this.container.className = 'chat-file-validation-widget';

		if (this.currentReport.overallValid) {
			this.container.classList.add('valid');
		} else {
			this.container.classList.add('invalid');
		}

		if (this.options.compactMode) {
			this.container.classList.add('compact');
		}

		if (this.isExpanded) {
			this.container.classList.add('expanded');
		}
	}

	private toggleExpanded(): void {
		this.isExpanded = !this.isExpanded;

		if (this.isExpanded) {
			this.contentElement.style.display = 'block';
			this.container.classList.add('expanded');
		} else {
			this.contentElement.style.display = 'none';
			this.container.classList.remove('expanded');
		}

		// Mettre à jour l'icône du bouton d'expansion
		const expandButton = this.headerElement.querySelector('.expand-button');
		if (expandButton) {
			const icon = this.isExpanded ? Codicon.chevronDown : Codicon.chevronRight;
			expandButton.innerHTML = `<span class="${ThemeIcon.asClassNameArray(icon).join(' ')}"></span>`;
		}
	}

	private updateTheme(): void {
		// Mise à jour des couleurs selon le thème
		this.themeService.getColorTheme();
		// Implémentation des couleurs spécifiques au thème si nécessaire
	}

	show(): void {
		this.container.style.display = 'block';
		this.container.classList.add('visible');
	}

	hide(): void {
		this.container.style.display = 'none';
		this.container.classList.remove('visible');
		this.isExpanded = false;
		this.currentReport = undefined;
	}

	clear(): void {
		this.hide();
		this.headerElement.innerHTML = '';
		this.contentElement.innerHTML = '';
		this.actionsElement.innerHTML = '';
	}

	setCompactMode(compact: boolean): void {
		this.options.compactMode = compact;
		if (compact) {
			this.container.classList.add('compact');
		} else {
			this.container.classList.remove('compact');
		}
	}
}
