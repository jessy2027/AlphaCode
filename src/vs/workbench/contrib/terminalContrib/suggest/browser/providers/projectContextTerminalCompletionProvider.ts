/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { TerminalCompletionItemKind, type ITerminalCompletion } from '../terminalCompletionItem.js';
import { ITerminalCompletionProvider } from '../terminalCompletionService.js';
import { IOmegaCompletionService } from '../../../../../../workbench/services/omegaCompletion/common/omegaCompletion.js';

export class ProjectContextTerminalCompletionProvider implements ITerminalCompletionProvider {
	public static readonly EXTENSION_ID = 'core';
	public static readonly PROVIDER_ID = 'projectContextInline';

	public readonly id = ProjectContextTerminalCompletionProvider.PROVIDER_ID;
	public readonly isBuiltin = true;
	public readonly triggerCharacters: string[] = [];

	constructor(
		@IOmegaCompletionService private readonly _omegaCompletionService: IOmegaCompletionService,
	) { }

	async provideCompletions(promptValue: string, cursorPosition: number, _allowFallbackCompletions: boolean, token: CancellationToken): Promise<ITerminalCompletion[] | undefined> {
		const prefix = promptValue.slice(0, cursorPosition);
		if (!prefix.trim()) {
			return undefined;
		}

		const suffix = promptValue.slice(cursorPosition);
		const completion = await this._omegaCompletionService.fetchCompletion({
			type: 'terminal',
			prefix,
			suffix
		}, token);
		if (!completion?.text) {
			return undefined;
		}

		return [{
			label: completion.text,
			provider: this.id,
			replacementIndex: cursorPosition,
			replacementLength: 0,
			kind: TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop
		}];
	}
}
