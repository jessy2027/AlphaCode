/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const ISetupService = createDecorator<ISetupService>('setupService');

export interface ISetupPreferences {
	keybindings: 'vscode' | 'vim';
	installSurfCommand: boolean;
	theme: 'light' | 'dark' | 'monokai';
}

export interface ISetupService {
	readonly _serviceBrand: undefined;

	/**
	 * Check if first-time setup is needed
	 */
	needsSetup(): Promise<boolean>;

	/**
	 * Get the current setup preferences
	 */
	getPreferences(): Promise<ISetupPreferences | undefined>;

	/**
	 * Save setup preferences
	 */
	savePreferences(preferences: ISetupPreferences): Promise<void>;

	/**
	 * Mark setup as completed
	 */
	completeSetup(): Promise<void>;

	/**
	 * Reset setup state (for testing)
	 */
	resetSetup(): Promise<void>;
}
