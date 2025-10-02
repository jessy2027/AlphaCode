/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { InlineCompletion, InlineCompletions, InlineCompletionsDisposeReason, InlineCompletionsProvider, InlineCompletionContext } from '../../../../../editor/common/languages.js';
import { localize } from '../../../../../nls.js';
import { URI } from '../../../../../base/common/uri.js';
import '../../../../../workbench/services/omegaCompletion/browser/omegaCompletionService.js';
import { IOmegaCompletionService } from '../../../../../workbench/services/omegaCompletion/common/omegaCompletion.js';

export class ProjectContextInlineCompletionsProvider implements InlineCompletionsProvider {
	private readonly _cache = new Map<string, { versionId: number; text: string }>();

	constructor(
		@IOmegaCompletionService private readonly _omegaCompletionService: IOmegaCompletionService,
	) { }

	public readonly displayName = localize('projectContextInlineCompletions.displayName', "Project context inline suggestions");
	public readonly groupId = 'projectContextInlineCompletions';

	async provideInlineCompletions(model: ITextModel, position: Position, context: InlineCompletionContext, token: CancellationToken): Promise<InlineCompletions | undefined> {
		const prefix = model.getValueInRange(new Range(1, 1, position.lineNumber, position.column));
		if (!prefix.trim()) {
			return undefined;
		}

		const suffix = model.getValueInRange(new Range(position.lineNumber, position.column, model.getLineCount(), model.getLineMaxColumn(model.getLineCount())));
		const normalizedPrefix = this._normalizePrefix(prefix);
		if (!normalizedPrefix) {
			return undefined;
		}

		const cacheKey = this._getCacheKey(model.uri, normalizedPrefix, suffix);
		const cached = this._cache.get(cacheKey);
		if (cached && cached.versionId === model.getVersionId()) {
			return this._buildResult(cached.text, position);
		}

		const completion = await this._omegaCompletionService.fetchCompletion({
			type: 'inline',
			prefix,
			suffix,
			languageId: model.getLanguageId(),
			uri: model.uri
		}, token);
		if (!completion?.text) {
			return undefined;
		}

		this._cache.set(cacheKey, { versionId: model.getVersionId(), text: completion.text });
		return this._buildResult(completion.text, position);
	}

	disposeInlineCompletions(_completions: InlineCompletions, _reason: InlineCompletionsDisposeReason): void {
		// noop
	}
	private _buildResult(text: string, position: Position): InlineCompletions | undefined {
		if (!text) {
			return undefined;
		}

		const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
		const item: InlineCompletion = {
			range,
			insertText: text,
			filterText: undefined
		};
		return { items: [item] };
	}

	private _getCacheKey(uri: URI, prefix: string, suffix: string): string {
		return `${uri.toString()}::${prefix}::${suffix}`;
	}

	private _normalizePrefix(text: string): string {
		return text.trimEnd();
	}
}
