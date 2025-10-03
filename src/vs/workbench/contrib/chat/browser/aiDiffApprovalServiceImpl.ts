/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { compare } from '../../../../base/common/strings.js';
import { observableValue } from '../../../../base/common/observable.js';
import { AiDiffApprovalState, IAiDiffApprovalChange, IAiDiffApprovalDescriptor, IAiDiffApprovalService, IAiDiffApprovalSummary } from '../common/aiDiffApprovalService.js';
import { ModifiedFileEntryState } from '../common/chatEditingService.js';

class AiDiffApprovalService extends Disposable implements IAiDiffApprovalService {
	readonly _serviceBrand: undefined;

	private readonly _approvalsObs = observableValue<readonly IAiDiffApprovalDescriptor[]>(this, []);
	private readonly _approvalsByKey = new Map<string, IAiDiffApprovalDescriptor>();

	readonly approvals = this._approvalsObs;

	getApproval(sessionId: string, requestId: string): IAiDiffApprovalDescriptor | undefined {
		return this._approvalsByKey.get(this._key(sessionId, requestId));
	}

	mergeChanges(descriptor: IAiDiffApprovalDescriptor): void {
		const key = this._key(descriptor.sessionId, descriptor.requestId);
		const merged = this._mergeDescriptor(this._approvalsByKey.get(key), descriptor);
		this._approvalsByKey.set(key, merged);
		this._emit();
	}

	updateState(sessionId: string, requestId: string, state: AiDiffApprovalState): void {
		const key = this._key(sessionId, requestId);
		const existing = this._approvalsByKey.get(key);
		if (!existing || existing.state === state) {
			return;
		}
		this._approvalsByKey.set(key, {
			...existing,
			state
		});
		this._emit();
	}

	private _mergeDescriptor(existing: IAiDiffApprovalDescriptor | undefined, incoming: IAiDiffApprovalDescriptor): IAiDiffApprovalDescriptor {
		const changes = new Map<string, IAiDiffApprovalChange>();
		for (const change of existing?.changes ?? []) {
			changes.set(change.entryId, change);
		}
		for (const change of incoming.changes) {
			changes.set(change.entryId, change);
		}
		const mergedChanges = Array.from(changes.values()).sort((a, b) => compare(a.uri.toString(), b.uri.toString()));
		const summary = this._computeSummary(mergedChanges);
		const state = this._computeState(mergedChanges);
		return {
			sessionId: incoming.sessionId,
			requestId: incoming.requestId,
			createdAt: existing?.createdAt ?? incoming.createdAt,
			telemetry: incoming.telemetry,
			changes: mergedChanges,
			summary,
			state
		};
	}

	private _computeSummary(changes: readonly IAiDiffApprovalChange[]): IAiDiffApprovalSummary {
		let added = 0;
		let removed = 0;
		for (const change of changes) {
			if (change.diff) {
				added += change.diff.added;
				removed += change.diff.removed;
			}
		}
		return {
			added,
			removed,
			files: changes.length
		};
	}

	private _computeState(changes: readonly IAiDiffApprovalChange[]): AiDiffApprovalState {
		if (changes.length === 0) {
			return AiDiffApprovalState.Pending;
		}
		let hasPending = false;
		let hasAccepted = false;
		let hasRejected = false;
		for (const change of changes) {
			switch (change.state) {
				case ModifiedFileEntryState.Modified:
					hasPending = true;
					break;
				case ModifiedFileEntryState.Accepted:
					hasAccepted = true;
					break;
				case ModifiedFileEntryState.Rejected:
					hasRejected = true;
					break;
			}
		}
		if (hasAccepted && !hasRejected && !hasPending) {
			return AiDiffApprovalState.Accepted;
		}
		if (hasRejected && !hasAccepted && !hasPending) {
			return AiDiffApprovalState.Rejected;
		}
		if (hasAccepted || hasRejected) {
			return AiDiffApprovalState.Mixed;
		}
		return AiDiffApprovalState.Pending;
	}

	private _emit(): void {
		const all = Array.from(this._approvalsByKey.values()).sort((a, b) => b.createdAt - a.createdAt || compare(a.sessionId, b.sessionId) || compare(a.requestId, b.requestId));
		this._approvalsObs.set(all, undefined);
	}

	private _key(sessionId: string, requestId: string): string {
		return `${sessionId}::${requestId}`;
	}
}

export { AiDiffApprovalService };
