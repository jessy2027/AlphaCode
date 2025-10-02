/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from "../../../../base/common/lifecycle.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import type { IAIMessage } from "../common/aiProvider.js";
import {
	AgentType,
	IAgentRequest,
	IAgentResponse,
	IAlphaCodeAgentService,
} from "../common/agents.js";

export class AlphaCodeAgentService
	extends Disposable
	implements IAlphaCodeAgentService
{
	declare readonly _serviceBrand: undefined;

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
	) {
		super();
	}

	async generateCode(
		description: string,
		language?: string,
		context?: string,
	): Promise<IAgentResponse> {
		return this.executeAgent({
			type: AgentType.CodeGeneration,
			instruction: description,
			language,
			context,
		});
	}

	async refactorCode(
		code: string,
		instruction: string,
		language?: string,
	): Promise<IAgentResponse> {
		return this.executeAgent({
			type: AgentType.Refactor,
			code,
			instruction,
			language,
		});
	}

	async debugCode(
		code: string,
		error?: string,
		language?: string,
	): Promise<IAgentResponse> {
		const instruction = error
			? `Debug this code. Error: ${error}`
			: "Debug this code and identify potential issues";

		return this.executeAgent({
			type: AgentType.Debug,
			code,
			instruction,
			language,
		});
	}

	async generateDocumentation(
		code: string,
		language?: string,
	): Promise<IAgentResponse> {
		return this.executeAgent({
			type: AgentType.Documentation,
			code,
			instruction: "Generate comprehensive documentation for this code",
			language,
		});
	}

	async generateCommitMessage(diff: string): Promise<IAgentResponse> {
		return this.executeAgent({
			type: AgentType.CommitMessage,
			code: diff,
			instruction: "Generate a concise commit message for these changes",
		});
	}

	async explainCode(code: string, language?: string): Promise<IAgentResponse> {
		return this.executeAgent({
			type: AgentType.Explain,
			code,
			instruction: "Explain what this code does in clear terms",
			language,
		});
	}

	async executeAgent(request: IAgentRequest): Promise<IAgentResponse> {
		try {
			const messages = this.buildMessages(request);
			const response = await this.aiService.sendMessage(messages, {
				maxTokens: 4096,
			});

			return {
				success: true,
				result: response.content,
			};
		} catch (error) {
			return {
				success: false,
				result: "",
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	private buildMessages(request: IAgentRequest): IAIMessage[] {
		const messages: IAIMessage[] = [];

		// System message based on agent type
		const systemPrompts: { [key in AgentType]: string } = {
			[AgentType.CodeGeneration]:
				"You are an expert code generator. Create clean, efficient, and well-documented code based on user descriptions. Always include necessary imports and error handling.",
			[AgentType.Refactor]:
				"You are a code refactoring expert. Improve code quality, readability, and performance while maintaining functionality. Explain your changes.",
			[AgentType.Debug]:
				"You are a debugging expert. Identify issues in code, explain the root cause, and provide fixes. Be thorough and educational.",
			[AgentType.Documentation]:
				"You are a technical writer. Generate clear, comprehensive documentation including function descriptions, parameters, return values, and usage examples.",
			[AgentType.CommitMessage]:
				"You are a Git commit message expert. Generate concise, conventional commit messages that clearly describe changes. Use format: type(scope): description",
			[AgentType.Explain]:
				"You are a code educator. Explain code clearly and thoroughly, breaking down complex concepts into understandable parts.",
		};

		messages.push({
			role: "system",
			content: systemPrompts[request.type],
		});

		// Build user message
		let userContent = "";

		if (request.context) {
			userContent += `Context:\n${request.context}\n\n`;
		}

		if (request.code) {
			userContent += `${request.language ? `Language: ${request.language}\n\n` : ""}Code:\n\`\`\`${request.language || ""}\n${request.code}\n\`\`\`\n\n`;
		}

		userContent += `${request.instruction}`;

		messages.push({
			role: "user",
			content: userContent,
		});

		return messages;
	}
}
