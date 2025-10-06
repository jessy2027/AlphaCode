/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChatContext, IChatSession, IChatTool } from "../common/chatService.js";
import { IAlphaCodeSecurityService } from "../common/securityService.js";
import type { IAIMessage } from "../common/aiProvider.js";

/**
 * Builds AI prompts with system instructions and context
 */
export class PromptBuilder {
	constructor(
		private readonly securityService: IAlphaCodeSecurityService
	) {}

	/**
	 * Build complete AI messages array including system prompt and history
	 */
	buildAIMessages(
		session: IChatSession,
		allTools: IChatTool[],
		context?: IChatContext,
	): IAIMessage[] {
		const messages: IAIMessage[] = [];

		// Add system prompt
		messages.push({
			role: "system",
			content: this.buildSystemPrompt(allTools, context),
		});

		// Add recent conversation history
		const recentMessages = session.messages.slice(-10);
		for (const msg of recentMessages) {
			const content = msg.role === "user"
				? this.securityService.maskSecrets(msg.content)
				: msg.content;

			messages.push({
				role: msg.role === "user" ? "user" : "assistant",
				content,
			});
		}

		return messages;
	}

	/**
	 * Build system prompt with instructions, tools, and context
	 */
	private buildSystemPrompt(allTools: IChatTool[], context?: IChatContext): string {
		const parts = [
			this.getInstructions(),
			this.getToolsDocumentation(allTools),
			this.getContextSection(context),
		];

		return parts.filter(p => p).join("\n\n");
	}

	/**
	 * Get base instructions for the AI
	 */
	private getInstructions(): string {
		return [
			"You are AlphaCode, the built-in assistant for AlphaCodeIDE. You help with code generation, refactoring, debugging, and documentation while mirroring the AlphaCode workflow.",
			"",
			"# Operating Principles",
			"- Always respond in concise Markdown using short paragraphs or bullet lists.",
			"- Address the user as `you` and refer to yourself as `I`. Avoid acknowledgement phrases at the start of responses.",
			"- Make no ungrounded assertions. Reference files, directories, or symbols with backticks, e.g. `path/to/file.ts` or `MyClass.method()`.",
			"- Use headings like `# Summary`, `# Findings`, or `# Next Steps` when it improves readability. Bullet lists must format items as `- **Title** detail`.",
			"- End every response with a short completion-status summary.",
			"",
			"# Task Management",
			"- For non-trivial tasks, outline a compact plan (4-6 steps) before execution, keep exactly one step marked in progress, and update or remove the plan when done.",
			"- Inspect relevant files before modifying them. Apply minimal diffs and mention any verification executed or recommended.",
			"- Briefly call out risks or follow-ups when relevant.",
			"",
			"# Tool Usage",
			"- You may only invoke the tools already registered in AlphaCode. Do not invent or reference unavailable tools.",
			"- Tool calls execute immediately once their JSON completes. Use the fenced block format shown below.",
			"- Explain the intent of write operations before executing them. When unsure, prefer read/inspect tools first.",
			"",
			"## Tool Call Format",
			"```tool",
			"{",
			"  \"name\": \"tool_name\",",
			"  \"parameters\": {",
			"    \"param1\": \"value1\"",
			"  }",
			"}",
			"```",
			"",
			"When a write tool (e.g. edit_file or write_file) runs, a diff view opens for the user to review and approve changes. You may continue narrating after the tool call completes.",
		].join("\n");
	}

	/**
	 * Get tools documentation section
	 */
	private getToolsDocumentation(allTools: IChatTool[]): string {
		let content = "## Available Tools:";
		for (const tool of allTools) {
			content += `\n### ${tool.name}\n${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
		}
		return content;
	}

	/**
	 * Get context section if available
	 */
	private getContextSection(context?: IChatContext): string {
		if (!context) {
			return "";
		}

		const sections: string[] = ["Context:"];

		if (context.activeFile) {
			sections.push(`Active file: ${context.activeFile}`);
		}

		if (context.selectedCode) {
			const maskedCode = this.securityService.maskSecrets(context.selectedCode);
			sections.push(`Selected code:\n${maskedCode}`);
		}

		if (context.openFiles?.length) {
			sections.push(`Open files: ${context.openFiles.join(", ")}`);
		}

		if (context.workspaceFiles?.length) {
			sections.push(`Relevant workspace files:\n${context.workspaceFiles.join("\n")}`);
		}

		if (context.symbols?.length) {
			sections.push(`Workspace symbols:\n${context.symbols.join("\n")}`);
		}

		if (context.workspaceSnippets?.length) {
			sections.push(`Workspace snippets:\n${context.workspaceSnippets.join("\n\n")}`);
		}

		return sections.length > 1 ? sections.join("\n") : "";
	}
}
