/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditSessionEntryDiff, IModifiedEntryTelemetryInfo, ModifiedFileEntryState } from './chatEditingService.js';

export const IAiDiffApprovalService = createDecorator<IAiDiffApprovalService>('aiDiffApprovalService');

export interface IAiDiffApprovalSummary {
	readonly added: number;
	readonly removed: number;
	readonly files: number;
}

export interface IAiDiffApprovalChange {
	readonly entryId: string;
	readonly uri: URI;
	readonly state: ModifiedFileEntryState;
	readonly changes: number;
	readonly diff: IEditSessionEntryDiff | undefined;
}

export const enum AiDiffApprovalState {
	Pending,
	Accepted,
	Rejected,
	Mixed
}

export interface IAiDiffApprovalDescriptor {
	readonly sessionId: string;
	readonly requestId: string;
	readonly createdAt: number;
	readonly telemetry: IModifiedEntryTelemetryInfo;
	readonly changes: readonly IAiDiffApprovalChange[];
	readonly summary: IAiDiffApprovalSummary;
	readonly state: AiDiffApprovalState;
}

export interface IAiDiffApprovalService {
	readonly _serviceBrand: undefined;
	readonly approvals: IObservable<readonly IAiDiffApprovalDescriptor[]>;
	getApproval(sessionId: string, requestId: string): IAiDiffApprovalDescriptor | undefined;
	mergeChanges(descriptor: IAiDiffApprovalDescriptor): void;
	updateState(sessionId: string, requestId: string, state: AiDiffApprovalState): void;
}
