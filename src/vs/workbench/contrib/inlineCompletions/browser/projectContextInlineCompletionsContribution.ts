/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ProjectContextInlineCompletionsProvider } from './providers/projectContextInlineCompletionsProvider.js';

export class ProjectContextInlineCompletionsContribution extends Disposable implements IWorkbenchContribution {
	public static readonly ID = 'workbench.contrib.projectContextInlineCompletions';

	constructor(
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const provider = instantiationService.createInstance(ProjectContextInlineCompletionsProvider);
		this._register(languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, provider));
	}
}
