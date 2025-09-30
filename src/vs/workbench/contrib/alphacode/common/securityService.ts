/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IAlphaCodeSecurityService = createDecorator<IAlphaCodeSecurityService>('alphaCodeSecurityService');

export interface ISecretPattern {
	name: string;
	pattern: RegExp;
	description: string;
	replacement: string;
}

export interface ISecurityConfig {
	maskSecrets: boolean;
	customPatterns: ISecretPattern[];
	logSensitiveData: boolean;
	warnOnSecretDetection: boolean;
}

export interface ISecretDetection {
	type: string;
	matched: string;
	position: number;
	length: number;
}

export interface IAlphaCodeSecurityService {
	readonly _serviceBrand: undefined;

	/**
	 * Get current security configuration
	 */
	getConfig(): ISecurityConfig;

	/**
	 * Update security configuration
	 */
	updateConfig(config: Partial<ISecurityConfig>): void;

	/**
	 * Mask secrets in text
	 */
	maskSecrets(text: string): string;

	/**
	 * Detect secrets in text without masking
	 */
	detectSecrets(text: string): ISecretDetection[];

	/**
	 * Check if text contains potential secrets
	 */
	hasSecrets(text: string): boolean;

	/**
	 * Add custom secret pattern
	 */
	addCustomPattern(pattern: ISecretPattern): void;

	/**
	 * Remove custom secret pattern
	 */
	removeCustomPattern(name: string): void;
}
