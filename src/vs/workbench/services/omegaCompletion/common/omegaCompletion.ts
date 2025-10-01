/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';

export const IOmegaCompletionService = createDecorator<IOmegaCompletionService>('omegaCompletionService');

export type OmegaCompletionRequestType = 'inline' | 'terminal';

export interface OmegaCompletionRequest {
	readonly type: OmegaCompletionRequestType;
	readonly prefix: string;
	readonly suffix?: string;
	readonly languageId?: string;
	readonly uri?: URI;
	readonly metadata?: Record<string, unknown>;
}

export interface OmegaCompletionResult {
	readonly text: string;
}

export interface IOmegaCompletionService {
	readonly _serviceBrand: undefined;

	fetchCompletion(request: OmegaCompletionRequest, token: CancellationToken): Promise<OmegaCompletionResult | undefined>;
}
