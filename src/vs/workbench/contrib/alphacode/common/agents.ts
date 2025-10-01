/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from "../../../../platform/instantiation/common/instantiation.js";

export const IAlphaCodeAgentService = createDecorator<IAlphaCodeAgentService>(
	"alphaCodeAgentService",
);

export enum AgentType {
	CodeGeneration = "codeGeneration",
	Refactor = "refactor",
	Debug = "debug",
	Documentation = "documentation",
	CommitMessage = "commitMessage",
	Explain = "explain",
}

export interface IAgentRequest {
	type: AgentType;
	code?: string;
	language?: string;
	context?: string;
	instruction: string;
}

export interface IAgentResponse {
	success: boolean;
	result: string;
	explanation?: string;
	error?: string;
}

export interface IAlphaCodeAgentService {
	readonly _serviceBrand: undefined;

	/**
	 * Generate code based on description
	 */
	generateCode(
		description: string,
		language?: string,
		context?: string,
	): Promise<IAgentResponse>;

	/**
	 * Refactor existing code
	 */
	refactorCode(
		code: string,
		instruction: string,
		language?: string,
	): Promise<IAgentResponse>;

	/**
	 * Debug code and suggest fixes
	 */
	debugCode(
		code: string,
		error?: string,
		language?: string,
	): Promise<IAgentResponse>;

	/**
	 * Generate documentation for code
	 */
	generateDocumentation(
		code: string,
		language?: string,
	): Promise<IAgentResponse>;

	/**
	 * Generate commit message from changes
	 */
	generateCommitMessage(diff: string): Promise<IAgentResponse>;

	/**
	 * Explain code
	 */
	explainCode(code: string, language?: string): Promise<IAgentResponse>;

	/**
	 * Execute a generic agent request
	 */
	executeAgent(request: IAgentRequest): Promise<IAgentResponse>;
}
