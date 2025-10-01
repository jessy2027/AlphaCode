/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IConfigurationNode, IConfigurationRegistry, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';

const prefix = 'alphacode.omegaCompletion.';

export const OmegaCompletionConfiguration = Object.freeze({
	Endpoint: `${prefix}endpoint`,
	ApiKey: `${prefix}apiKey`,
	Model: `${prefix}model`,
	Temperature: `${prefix}temperature`,
	TopP: `${prefix}topP`,
	MaxOutputTokens: `${prefix}maxOutputTokens`,
	RequestTimeout: `${prefix}requestTimeout`
});

const omegaConfiguration: IConfigurationNode = {
	id: 'alphacode.omegaCompletion',
	title: localize('omegaCompletion.title', "Omega Completion"),
	scope: ConfigurationScope.APPLICATION,
	order: 120,
	type: 'object',
	properties: {
		[OmegaCompletionConfiguration.Endpoint]: {
			type: 'string',
			markdownDescription: localize('omegaCompletion.endpoint', "Endpoint URL used to request Omega inline completions."),
			default: ''
		},
		[OmegaCompletionConfiguration.ApiKey]: {
			type: 'string',
			markdownDescription: localize('omegaCompletion.apiKey', "API key used to authenticate with the Omega completion service."),
			default: '',
			restricted: true
		},
		[OmegaCompletionConfiguration.Model]: {
			type: 'string',
			markdownDescription: localize('omegaCompletion.model', "Identifier of the language model used for Omega completion."),
			default: ''
		},
		[OmegaCompletionConfiguration.Temperature]: {
			type: 'number',
			markdownDescription: localize('omegaCompletion.temperature', "Sampling temperature passed to the Omega completion service."),
			default: 0.2,
			minimum: 0,
			maximum: 2
		},
		[OmegaCompletionConfiguration.TopP]: {
			type: 'number',
			markdownDescription: localize('omegaCompletion.topP', "Nucleus sampling value passed to Omega completion service."),
			default: 1,
			minimum: 0,
			maximum: 1
		},
		[OmegaCompletionConfiguration.MaxOutputTokens]: {
			type: 'number',
			markdownDescription: localize('omegaCompletion.maxOutputTokens', "Maximum number of tokens returned per Omega completion."),
			default: 128,
			minimum: 1,
			maximum: 2048
		},
		[OmegaCompletionConfiguration.RequestTimeout]: {
			type: 'number',
			markdownDescription: localize('omegaCompletion.requestTimeout', "Timeout in milliseconds for Omega completion requests."),
			default: 5000,
			minimum: 100,
			maximum: 60000
		}
	}
};

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration(omegaConfiguration);
