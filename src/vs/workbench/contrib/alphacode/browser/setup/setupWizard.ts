/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/setupWizard.css';
import { $, append, clearNode } from '../../../../../base/browser/dom.js';
import { FileAccess } from '../../../../../base/common/network.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService, ConfigurationTarget } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';

const SETUP_WIZARD_STORAGE_KEY = 'alphacode.setup.wizard.completed';

interface ISetupStep {
	id: string;
	title: string;
	subtitle: string;
	render: (container: HTMLElement) => void;
	onNext?: () => Promise<void> | void;
}

export class SetupWizard extends Disposable implements IWorkbenchContribution {

	private container: HTMLElement | undefined;
	private currentStepIndex = 0;
	private steps: ISetupStep[] = [];
	private readonly disposables = new DisposableStore();

	// State
	private selectedKeybindings: 'vscode' | 'vim' = 'vscode';
	private installAlphaCommand = true;
	private selectedTheme: 'light' | 'dark' | 'monokai' = 'dark';

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IThemeService _themeService: IThemeService,
		@IInstantiationService _instantiationService: IInstantiationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super();

		this.initializeSteps();
		
		// Check if setup has been completed before
		const setupCompleted = this.storageService.getBoolean(SETUP_WIZARD_STORAGE_KEY, StorageScope.PROFILE, false);
		if (!setupCompleted) {
			this.show();
		}
	}

	private initializeSteps(): void {
		this.steps = [
			{
				id: 'welcome',
				title: localize('setupWizard.welcome.title', 'Welcome to AlphaCode'),
				subtitle: localize('setupWizard.welcome.subtitle', 'Enter flow state.'),
				render: (container) => this.renderWelcomeStep(container)
			},
			{
				id: 'keybindings',
				title: localize('setupWizard.keybindings.title', 'Choose setup flow'),
				subtitle: localize('setupWizard.keybindings.subtitle', 'Bring your setup with you.'),
				render: (container) => this.renderKeybindingsStep(container),
				onNext: () => this.applyKeybindings()
			},
			{
				id: 'theme',
				title: localize('setupWizard.theme.title', 'Choose an editor theme'),
				subtitle: localize('setupWizard.theme.subtitle', 'You can change the theme any time via the theme selector'),
				render: (container) => this.renderThemeStep(container),
				onNext: () => this.applyTheme()
			}
		];
	}

	private show(): void {
		const workbenchContainer = this.layoutService.activeContainer;
		this.container = $('.setup-wizard-overlay');
		append(workbenchContainer, this.container);
		this.renderCurrentStep();
	}

	private hide(): void {
		if (this.container) {
			this.container.remove();
			this.container = undefined;
		}
		this.disposables.clear();
	}

	private renderCurrentStep(): void {
		if (!this.container) {
			return;
		}

		// Clear previous disposables for this step
		this.disposables.clear();

		clearNode(this.container);

		const step = this.steps[this.currentStepIndex];
		const stepContainer = $('.setup-wizard-container');
		append(this.container, stepContainer);

		// Header
		const header = $('.setup-wizard-header');
		const logo = $('img.setup-wizard-logo') as HTMLImageElement;
		logo.src = FileAccess.asBrowserUri('vs/workbench/contrib/alphacode/browser/setup/media/alphacode-logo.png').toString(true);
		logo.alt = 'AlphaCode';
		append(header, logo);
		append(stepContainer, header);

		// Content
		const content = $('.setup-wizard-content');
		
		const title = $('h1.setup-wizard-title');
		title.textContent = step.title;
		append(content, title);

		const subtitle = $('p.setup-wizard-subtitle');
		subtitle.textContent = step.subtitle;
		append(content, subtitle);

		const body = $('.setup-wizard-body');
		step.render(body);
		append(content, body);

		append(stepContainer, content);

		// Footer with navigation
		if (this.currentStepIndex > 0) {
			const backButton = $('.setup-wizard-back');
			backButton.textContent = '← ' + localize('setupWizard.back', 'Back');
			backButton.onclick = () => this.previousStep();
			append(stepContainer, backButton);
		}

		const footer = $('.setup-wizard-footer');
		const nextButton = this.disposables.add(new Button(footer, { title: '', secondary: false }));
		
		if (this.currentStepIndex === this.steps.length - 1) {
			nextButton.label = localize('setupWizard.finish', 'Get Started') + ' →';
		} else {
			nextButton.label = localize('setupWizard.next', 'Next') + ' →';
		}

		nextButton.onDidClick(() => this.nextStep());
		append(stepContainer, footer);

		// Progress indicators
		const progress = $('.setup-wizard-progress');
		for (let i = 0; i < this.steps.length; i++) {
			const dot = $('span.progress-dot' + (i === this.currentStepIndex ? '.active' : ''));
			append(progress, dot);
		}
		append(stepContainer, progress);
	}

	private renderWelcomeStep(container: HTMLElement): void {
		const welcomeContainer = $('.welcome-content');
		
		// AlphaCode logo large
		const logoLarge = $('img.welcome-logo-large') as HTMLImageElement;
		logoLarge.src = FileAccess.asBrowserUri('vs/workbench/contrib/alphacode/browser/setup/media/alphacode-logo.png').toString(true);
		logoLarge.alt = 'AlphaCode';
		append(welcomeContainer, logoLarge);

		append(container, welcomeContainer);
	}

	private renderKeybindingsStep(container: HTMLElement): void {
		const keybindingsContainer = $('.keybindings-content');

		// Label
		const label = $('p.keybindings-label');
		label.textContent = localize('setupWizard.keybindings.label', 'Choose keybindings');
		append(keybindingsContainer, label);

		// Options
		const options = $('.keybindings-options');

		// VS Code option
		const vscodeOption = $('div.keybinding-option' + (this.selectedKeybindings === 'vscode' ? '.selected' : ''));
		const vscodeIcon = $('div.keybinding-icon');
		vscodeIcon.textContent = '⌨';
		const vscodeLabel = $('span.keybinding-label');
		vscodeLabel.textContent = 'VS Code';
		append(vscodeOption, vscodeIcon);
		append(vscodeOption, vscodeLabel);
		vscodeOption.onclick = () => {
			this.selectedKeybindings = 'vscode';
			this.renderCurrentStep();
		};
		append(options, vscodeOption);

		// Vim option
		const vimOption = $('div.keybinding-option' + (this.selectedKeybindings === 'vim' ? '.selected' : ''));
		const vimIcon = $('div.keybinding-icon');
		vimIcon.textContent = 'Vim';
		vimIcon.style.fontSize = '24px';
		vimIcon.style.fontWeight = 'bold';
		const vimLabel = $('span.keybinding-label');
		vimLabel.textContent = 'Vim';
		append(vimOption, vimIcon);
		append(vimOption, vimLabel);
		vimOption.onclick = () => {
			this.selectedKeybindings = 'vim';
			this.renderCurrentStep();
		};
		append(options, vimOption);

		append(keybindingsContainer, options);

		// Install alpha command option
		const alphaOption = $('.alpha-command-option');
		const checkbox = $('input#alpha-checkbox') as HTMLInputElement;
		checkbox.type = 'checkbox';
		checkbox.checked = this.installAlphaCommand;
		checkbox.onchange = () => {
			this.installAlphaCommand = checkbox.checked;
		};
		const checkboxLabel = $('label');
		checkboxLabel.setAttribute('for', 'alpha-checkbox');
		// Create label content with inline code element
		const labelText1 = document.createTextNode('Install ');
		const codeElement = $('code');
		codeElement.textContent = 'alpha';
		const labelText2 = document.createTextNode(' terminal command');
		append(checkboxLabel, labelText1);
		append(checkboxLabel, codeElement);
		append(checkboxLabel, labelText2);
		append(alphaOption, checkbox);
		append(alphaOption, checkboxLabel);
		append(keybindingsContainer, alphaOption);

		append(container, keybindingsContainer);
	}

	private renderThemeStep(container: HTMLElement): void {
		const themeContainer = $('.theme-content');

		// Theme options
		const options = $('.theme-options');

		// Light theme
		const lightOption = this.createThemeOption('light', 'Light', this.selectedTheme === 'light');
		lightOption.onclick = () => {
			this.selectedTheme = 'light';
			this.renderCurrentStep();
		};
		append(options, lightOption);

		// Dark theme
		const darkOption = this.createThemeOption('dark', 'Dark', this.selectedTheme === 'dark');
		darkOption.onclick = () => {
			this.selectedTheme = 'dark';
			this.renderCurrentStep();
		};
		append(options, darkOption);

		// Monokai theme
		const monokaiOption = this.createThemeOption('monokai', 'Monokai', this.selectedTheme === 'monokai');
		monokaiOption.onclick = () => {
			this.selectedTheme = 'monokai';
			this.renderCurrentStep();
		};
		append(options, monokaiOption);

		append(themeContainer, options);

		// Preview
		const preview = $('.theme-preview');
		const previewImage = $('img.theme-preview-image') as HTMLImageElement;
		previewImage.src = this.getThemePreviewImage();
		previewImage.alt = 'Theme preview';
		append(preview, previewImage);
		append(themeContainer, preview);

		append(container, themeContainer);
	}

	private createThemeOption(id: string, label: string, selected: boolean): HTMLElement {
		const option = $('div.theme-option' + (selected ? '.selected' : ''));
		const optionLabel = $('span.theme-label');
		optionLabel.textContent = label;
		
		const indicator = $('div.theme-indicator');
		if (id === 'light') {
			indicator.style.backgroundColor = '#ffffff';
			indicator.style.border = '1px solid #ccc';
		} else if (id === 'dark') {
			indicator.style.backgroundColor = '#1e1e1e';
		} else if (id === 'monokai') {
			indicator.style.backgroundColor = '#272822';
		}

		append(option, indicator);
		append(option, optionLabel);
		
		return option;
	}

	private getThemePreviewImage(): string {
		// Generate a more detailed preview SVG based on selected theme
		let bgColor = '#1e1e1e';
		let textColor = '#d4d4d4';
		let keywordColor = '#569cd6';
		let stringColor = '#ce9178';
		
		if (this.selectedTheme === 'light') {
			bgColor = '#ffffff';
			textColor = '#000000';
			keywordColor = '#0000ff';
			stringColor = '#a31515';
		} else if (this.selectedTheme === 'monokai') {
			bgColor = '#272822';
			textColor = '#f8f8f2';
			keywordColor = '#f92672';
			stringColor = '#e6db74';
		}
		
		const svgCode = `<svg width="480" height="240" xmlns="http://www.w3.org/2000/svg">
			<rect width="480" height="240" fill="${bgColor}"/>
			<text x="20" y="40" font-family="Consolas, monospace" font-size="14" fill="${keywordColor}">function</text>
			<text x="90" y="40" font-family="Consolas, monospace" font-size="14" fill="${textColor}">greet(name) {</text>
			<text x="40" y="65" font-family="Consolas, monospace" font-size="14" fill="${keywordColor}">return</text>
			<text x="100" y="65" font-family="Consolas, monospace" font-size="14" fill="${stringColor}">"Hello, "</text>
			<text x="180" y="65" font-family="Consolas, monospace" font-size="14" fill="${textColor}">+ name;</text>
			<text x="20" y="90" font-family="Consolas, monospace" font-size="14" fill="${textColor}">}</text>
			<text x="240" y="220" font-family="Arial" font-size="16" fill="${textColor}" opacity="0.5" text-anchor="middle">AlphaCode</text>
		</svg>`;
		
		return 'data:image/svg+xml;base64,' + btoa(svgCode);
	}

	private async nextStep(): Promise<void> {
		const currentStep = this.steps[this.currentStepIndex];
		
		if (currentStep.onNext) {
			await currentStep.onNext();
		}

		if (this.currentStepIndex < this.steps.length - 1) {
			this.currentStepIndex++;
			this.renderCurrentStep();
		} else {
			await this.complete();
		}

		this.telemetryService.publicLog2<{ step: string; stepIndex: number }, { owner: 'alphacode'; comment: 'Setup wizard step completed'; step: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Step ID' }; stepIndex: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Step index' } }>('setupWizard.stepCompleted', {
			step: currentStep.id,
			stepIndex: this.currentStepIndex
		});
	}

	private previousStep(): void {
		if (this.currentStepIndex > 0) {
			this.currentStepIndex--;
			this.renderCurrentStep();
		}
	}

	private async applyKeybindings(): Promise<void> {
		if (this.selectedKeybindings === 'vim') {
			// Install Vim extension if not already installed
			try {
				await this.commandService.executeCommand('workbench.extensions.installExtension', 'vscodevim.vim');
			} catch (error) {
				console.error('Failed to install Vim extension:', error);
			}
		}

		// Store the preference
		await this.configurationService.updateValue('alphacode.setup.keybindings', this.selectedKeybindings, ConfigurationTarget.USER);
		
		// Install alpha command if requested
		if (this.installAlphaCommand) {
			await this.configurationService.updateValue('alphacode.setup.installAlphaCommand', true, ConfigurationTarget.USER);
		}
	}

	private async applyTheme(): Promise<void> {
		let themeId: string;
		
		switch (this.selectedTheme) {
			case 'light':
				themeId = 'vs';
				break;
			case 'dark':
				themeId = 'vs-dark';
				break;
			case 'monokai':
				themeId = 'monokai';
				break;
			default:
				themeId = 'vs-dark';
		}

		await this.configurationService.updateValue('workbench.colorTheme', themeId, ConfigurationTarget.USER);
	}

	private async complete(): Promise<void> {
		// Mark setup as completed
		this.storageService.store(SETUP_WIZARD_STORAGE_KEY, true, StorageScope.PROFILE, StorageTarget.USER);

		this.telemetryService.publicLog2<{ keybindings: string; theme: string; installAlphaCommand: boolean }, { owner: 'alphacode'; comment: 'Setup wizard completed'; keybindings: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Selected keybindings' }; theme: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Selected theme' }; installAlphaCommand: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Install alpha command' } }>('setupWizard.completed', {
			keybindings: this.selectedKeybindings,
			theme: this.selectedTheme,
			installAlphaCommand: this.installAlphaCommand
		});

		this.hide();
	}

	override dispose(): void {
		this.hide();
		super.dispose();
	}
}
