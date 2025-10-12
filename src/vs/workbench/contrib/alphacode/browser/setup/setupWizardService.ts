/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';

export const ISetupWizardService = createDecorator<ISetupWizardService>('setupWizardService');

export interface ISetupWizardService {
	readonly _serviceBrand: undefined;

	/**
	 * Check if the setup wizard has been completed
	 */
	isSetupCompleted(): boolean;

	/**
	 * Mark the setup wizard as completed
	 */
	markSetupCompleted(): void;

	/**
	 * Reset the setup wizard state (for testing or re-onboarding)
	 */
	resetSetup(): void;

	/**
	 * Get the selected keybindings preference
	 */
	getKeybindingsPreference(): 'vscode' | 'vim' | undefined;

	/**
	 * Check if the surf command should be installed
	 */
	shouldInstallSurfCommand(): boolean;
}

const SETUP_WIZARD_STORAGE_KEY = 'alphacode.setup.wizard.completed';

export class SetupWizardService extends Disposable implements ISetupWizardService {
	
	declare readonly _serviceBrand: undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
	}

	isSetupCompleted(): boolean {
		return this.storageService.getBoolean(SETUP_WIZARD_STORAGE_KEY, StorageScope.PROFILE, false);
	}

	markSetupCompleted(): void {
		this.storageService.store(SETUP_WIZARD_STORAGE_KEY, true, StorageScope.PROFILE, StorageTarget.USER);
	}

	resetSetup(): void {
		this.storageService.remove(SETUP_WIZARD_STORAGE_KEY, StorageScope.PROFILE);
	}

	getKeybindingsPreference(): 'vscode' | 'vim' | undefined {
		const value = this.storageService.get('alphacode.setup.keybindings', StorageScope.PROFILE);
		if (value === 'vscode' || value === 'vim') {
			return value;
		}
		return undefined;
	}

	shouldInstallSurfCommand(): boolean {
		return this.storageService.getBoolean('alphacode.setup.installSurfCommand', StorageScope.PROFILE, false);
	}
}
