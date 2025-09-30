/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { ConfigurationScope, Extensions, IConfigurationNode, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);

const alphaCodeConfiguration: IConfigurationNode = {
	id: 'alphacode',
	order: 100,
	type: 'object',
	title: localize('alphaCodeConfigurationTitle', "AlphaCode"),
	properties: {
		'alphacode.ai.provider': {
			type: 'string',
			enum: ['openai', 'anthropic', 'azure', 'local'],
			default: 'openai',
			description: localize('alphacode.ai.provider', "AI provider to use for code assistance"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.ai.apiKey': {
			type: 'string',
			default: '',
			description: localize('alphacode.ai.apiKey', "API key for the selected AI provider (stored securely)"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.ai.endpoint': {
			type: 'string',
			default: '',
			description: localize('alphacode.ai.endpoint', "Custom endpoint URL for the AI provider (optional)"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.ai.model': {
			type: 'string',
			default: '',
			description: localize('alphacode.ai.model', "Model to use (e.g., gpt-4, claude-3-5-sonnet-20241022)"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.ai.maxTokens': {
			type: 'number',
			default: 2048,
			minimum: 100,
			maximum: 100000,
			description: localize('alphacode.ai.maxTokens', "Maximum tokens for AI responses"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.ai.temperature': {
			type: 'number',
			default: 0.7,
			minimum: 0,
			maximum: 2,
			description: localize('alphacode.ai.temperature', "Temperature for AI responses (0-2, higher = more creative)"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.context.indexWorkspace': {
			type: 'boolean',
			default: true,
			description: localize('alphacode.context.indexWorkspace', "Enable workspace indexing for better context awareness"),
			scope: ConfigurationScope.RESOURCE
		},
		'alphacode.context.maxFiles': {
			type: 'number',
			default: 100,
			minimum: 10,
			maximum: 1000,
			description: localize('alphacode.context.maxFiles', "Maximum number of files to index"),
			scope: ConfigurationScope.RESOURCE
		},
		'alphacode.chat.streamResponses': {
			type: 'boolean',
			default: true,
			description: localize('alphacode.chat.streamResponses', "Stream AI responses in real-time"),
			scope: ConfigurationScope.APPLICATION
		},
		'alphacode.chat.saveSessions': {
			type: 'boolean',
			default: true,
			description: localize('alphacode.chat.saveSessions', "Save chat sessions across workspace sessions"),
			scope: ConfigurationScope.RESOURCE
		},
		'alphacode.security.maskSecrets': {
			type: 'boolean',
			default: true,
			description: localize('alphacode.security.maskSecrets', "Automatically mask secrets in prompts sent to AI"),
			scope: ConfigurationScope.APPLICATION
		}
	}
};

configurationRegistry.registerConfiguration(alphaCodeConfiguration);
