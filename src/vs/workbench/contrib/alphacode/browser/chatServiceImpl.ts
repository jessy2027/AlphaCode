/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from "../../../../base/common/event.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { generateUuid } from "../../../../base/common/uuid.js";
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from "../../../../platform/storage/common/storage.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import { IAIMessage } from "../common/aiProvider.js";
import {
	IAlphaCodeChatService,
	IChatContext,
	IChatMessage,
	IChatSession,
	IStreamChunk,
	IChatTool,
	IToolCall,
	IToolResult,
} from "../common/chatService.js";
import {
	IAlphaCodeContextService,
	IFileContext,
} from "../common/contextService.js";
import { IAlphaCodeSecurityService } from "../common/securityService.js";
import { ChatToolsRegistry } from "./chatTools.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { IWorkspaceContextService } from "../../../../platform/workspace/common/workspace.js";

const STORAGE_KEY_SESSIONS = "alphacode.chat.sessions";
const STORAGE_KEY_CURRENT_SESSION = "alphacode.chat.currentSession";
const MAX_WORKSPACE_FILE_REFERENCES = 20;
const MAX_WORKSPACE_SYMBOLS = 100;
const MAX_WORKSPACE_SNIPPETS = 6;
const MAX_SNIPPET_LENGTH = 2000;

export class AlphaCodeChatService
	extends Disposable
	implements IAlphaCodeChatService
{
	declare readonly _serviceBrand: undefined;

	private readonly _onDidAddMessage = this._register(
		new Emitter<IChatMessage>(),
	);
	readonly onDidAddMessage: Event<IChatMessage> = this._onDidAddMessage.event;

	private readonly _onDidCreateSession = this._register(
		new Emitter<IChatSession>(),
	);
	readonly onDidCreateSession: Event<IChatSession> =
		this._onDidCreateSession.event;

	private readonly _onDidStreamChunk = this._register(
		new Emitter<IStreamChunk>(),
	);
	readonly onDidStreamChunk: Event<IStreamChunk> = this._onDidStreamChunk.event;

	private sessions: Map<string, IChatSession> = new Map();
	private currentSessionId: string | undefined;
	private toolsRegistry: ChatToolsRegistry;

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IStorageService private readonly storageService: IStorageService,
		@IAlphaCodeSecurityService
		private readonly securityService: IAlphaCodeSecurityService,
		@IAlphaCodeContextService
		private readonly contextService: IAlphaCodeContextService,
		@IFileService fileService: IFileService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
	) {
		super();
		this.toolsRegistry = new ChatToolsRegistry(
			fileService,
			workspaceContextService,
		);
		this.loadSessions();
	}

	private loadSessions(): void {
		const stored = this.storageService.get(
			STORAGE_KEY_SESSIONS,
			StorageScope.WORKSPACE,
		);
		if (stored) {
			try {
				const sessions: IChatSession[] = JSON.parse(stored);
				sessions.forEach((session) => this.sessions.set(session.id, session));
			} catch (error) {
				console.error("Failed to parse chat sessions", error);
			}
		}

		const currentId = this.storageService.get(
			STORAGE_KEY_CURRENT_SESSION,
			StorageScope.WORKSPACE,
		);
		if (currentId && this.sessions.has(currentId)) {
			this.currentSessionId = currentId;
		}

		// Create default session if none exist
		if (this.sessions.size === 0) {
			this.createSession();
		}
	}

	private saveSessions(): void {
		const sessionsArray = Array.from(this.sessions.values());
		this.storageService.store(
			STORAGE_KEY_SESSIONS,
			JSON.stringify(sessionsArray),
			StorageScope.WORKSPACE,
			StorageTarget.MACHINE,
		);

		if (this.currentSessionId) {
			this.storageService.store(
				STORAGE_KEY_CURRENT_SESSION,
				this.currentSessionId,
				StorageScope.WORKSPACE,
				StorageTarget.MACHINE,
			);
		}
	}

	getCurrentSession(): IChatSession | undefined {
		if (!this.currentSessionId) {
			return undefined;
		}
		return this.sessions.get(this.currentSessionId);
	}

	createSession(title?: string): IChatSession {
		const session: IChatSession = {
			id: generateUuid(),
			title: title || `Session ${this.sessions.size + 1}`,
			messages: [],
			created: Date.now(),
			updated: Date.now(),
		};

		this.sessions.set(session.id, session);
		this.currentSessionId = session.id;
		this.saveSessions();
		this._onDidCreateSession.fire(session);

		return session;
	}

	switchSession(sessionId: string): void {
		if (this.sessions.has(sessionId)) {
			this.currentSessionId = sessionId;
			this.saveSessions();
		}
	}

	async sendMessage(content: string, context?: IChatContext): Promise<void> {
		const session = this.getCurrentSession();
		if (!session) {
			throw new Error("No active chat session");
		}

		// Add user message
		const userMessage: IChatMessage = {
			id: generateUuid(),
			role: "user",
			content,
			timestamp: Date.now(),
		};

		session.messages.push(userMessage);
		session.updated = Date.now();
		this._onDidAddMessage.fire(userMessage);
		this.saveSessions();

		// Build context-aware messages
		let enrichedContext = context;
		const workspaceContext = await this.contextService.getWorkspaceContext();
		const relevantFiles = await this.getRelevantFiles(
			content,
			workspaceContext.files,
		);
		const workspaceFiles = relevantFiles.map((file) => file.path);
		const workspaceSnippets = relevantFiles
			.slice(0, MAX_WORKSPACE_SNIPPETS)
			.map((file) => this.createSnippetForFile(file));
		const symbolEntries = workspaceContext.symbols
			.slice(0, MAX_WORKSPACE_SYMBOLS)
			.map(
				(symbol) =>
					`${symbol.kind}: ${symbol.name} (${symbol.location.uri.path})`,
			);
		if (
			!enrichedContext ||
			enrichedContext.workspaceFiles === undefined ||
			enrichedContext.symbols === undefined ||
			enrichedContext.workspaceSnippets === undefined
		) {
			enrichedContext = {
				...context,
				workspaceFiles,
				symbols: symbolEntries,
				workspaceSnippets: workspaceSnippets.filter(Boolean) as string[],
			};
		} else {
			enrichedContext.workspaceFiles =
				enrichedContext.workspaceFiles ?? workspaceFiles;
			enrichedContext.symbols = enrichedContext.symbols ?? symbolEntries;
			enrichedContext.workspaceSnippets =
				enrichedContext.workspaceSnippets ??
				(workspaceSnippets.filter(Boolean) as string[]);
		}

		const aiMessages: IAIMessage[] = this.buildAIMessages(
			session,
			enrichedContext,
		);

		try {
			// Create a message ID for streaming
			const messageId = generateUuid();
			let fullContent = "";

			// Send to AI with streaming
			await this.aiService.sendMessageStream(aiMessages, (chunk) => {
				if (!chunk.done) {
					fullContent += chunk.content;
					this._onDidStreamChunk.fire({
						content: chunk.content,
						done: false,
						messageId,
					});
				} else {
					this._onDidStreamChunk.fire({ content: "", done: true, messageId });
				}
			});

			// Check if response contains tool calls
			const toolCalls = this.extractToolCalls(fullContent);

			if (toolCalls.length > 0) {
				// Add assistant message with tool calls
				const assistantMessage: IChatMessage = {
					id: messageId,
					role: "assistant",
					content: fullContent,
					timestamp: Date.now(),
					toolCalls,
				};

				session.messages.push(assistantMessage);
				session.updated = Date.now();
				this._onDidAddMessage.fire(assistantMessage);
				this.saveSessions();

				// Execute tool calls
				for (const toolCall of toolCalls) {
					const toolResult = await this.executeToolCall(toolCall);

					// Add tool result message
					const toolMessage: IChatMessage = {
						id: generateUuid(),
						role: "tool",
						content: toolResult.error || toolResult.result,
						timestamp: Date.now(),
						toolCallId: toolCall.id,
					};

					session.messages.push(toolMessage);
					session.updated = Date.now();
					this._onDidAddMessage.fire(toolMessage);
					this.saveSessions();
				}

				// Continue conversation with tool results
				await this.sendMessage(
					"Continue based on the tool results above.",
					enrichedContext,
				);
			} else {
				// Add assistant response without tool calls
				const assistantMessage: IChatMessage = {
					id: messageId,
					role: "assistant",
					content: fullContent,
					timestamp: Date.now(),
				};

				session.messages.push(assistantMessage);
				session.updated = Date.now();
				this._onDidAddMessage.fire(assistantMessage);
				this.saveSessions();
			}
		} catch (error) {
			// Add error message
			const errorMessage: IChatMessage = {
				id: generateUuid(),
				role: "assistant",
				content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
				timestamp: Date.now(),
			};

			session.messages.push(errorMessage);
			session.updated = Date.now();
			this._onDidAddMessage.fire(errorMessage);
			this.saveSessions();
		}
	}

	private buildAIMessages(
		session: IChatSession,
		context?: IChatContext,
	): IAIMessage[] {
		const messages: IAIMessage[] = [];

		// Add system message with context and tools
		let systemContent =
			"You are AlphaCode AI, an intelligent coding assistant integrated into AlphaCodeIDE. Help users with code generation, refactoring, debugging, and documentation.";

		// Add tools information
		systemContent +=
			'\n\n## Available Tools\n\nYou have access to the following tools to help users. To use a tool, respond with a tool call in this format:\n\n```tool\n{\n  "name": "tool_name",\n  "parameters": {\n    "param1": "value1"\n  }\n}\n```\n\nAvailable tools:\n';

		const tools = this.toolsRegistry.getAllTools();
		for (const tool of tools) {
			systemContent += `\n### ${tool.name}\n${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
		}

		if (context) {
			systemContent += "\n\nContext:";
			if (context.activeFile) {
				systemContent += `\nActive file: ${context.activeFile}`;
			}
			if (context.selectedCode) {
				// Mask secrets in selected code before sending to AI
				const maskedCode = this.securityService.maskSecrets(
					context.selectedCode,
				);
				systemContent += `\nSelected code:\n${maskedCode}`;
			}
			if (context.openFiles && context.openFiles.length > 0) {
				systemContent += `\nOpen files: ${context.openFiles.join(", ")}`;
			}
			if (context.workspaceFiles && context.workspaceFiles.length > 0) {
				systemContent += `\nRelevant workspace files:\n${context.workspaceFiles.join("\n")}`;
			}
			if (context.symbols && context.symbols.length > 0) {
				systemContent += `\nWorkspace symbols:\n${context.symbols.join("\n")}`;
			}
			if (context.workspaceSnippets && context.workspaceSnippets.length > 0) {
				systemContent += `\nWorkspace snippets:\n${context.workspaceSnippets.join("\n\n")}`;
			}
		}

		messages.push({
			role: "system",
			content: systemContent,
		});

		// Add conversation history (limit to last 10 messages to avoid token limits)
		const recentMessages = session.messages.slice(-10);
		for (const msg of recentMessages) {
			// Mask secrets in user messages
			const content =
				msg.role === "user"
					? this.securityService.maskSecrets(msg.content)
					: msg.content;

			// Handle tool messages
			if (msg.role === "tool") {
				messages.push({
					role: "assistant",
					content: `Tool result: ${content}`,
				});
			} else {
				messages.push({
					role: msg.role === "user" ? "user" : "assistant",
					content,
				});
			}
		}

		return messages;
	}

	private async getRelevantFiles(
		query: string,
		files: IFileContext[],
	): Promise<IFileContext[]> {
		if (!query.trim()) {
			return files.slice(0, MAX_WORKSPACE_FILE_REFERENCES);
		}
		const relevant = await this.contextService.getRelevantContext(
			query,
			MAX_WORKSPACE_FILE_REFERENCES,
		);
		if (relevant.length > 0) {
			return relevant;
		}
		return files.slice(0, MAX_WORKSPACE_FILE_REFERENCES);
	}

	private createSnippetForFile(file: IFileContext): string | undefined {
		if (!file.content) {
			return undefined;
		}
		const trimmed =
			file.content.length > MAX_SNIPPET_LENGTH
				? `${file.content.slice(0, MAX_SNIPPET_LENGTH)}\n…`
				: file.content;
		return `File: ${file.path}\n${trimmed}`;
	}

	getSessions(): IChatSession[] {
		return Array.from(this.sessions.values()).sort(
			(a, b) => b.updated - a.updated,
		);
	}

	deleteSession(sessionId: string): void {
		this.sessions.delete(sessionId);

		if (this.currentSessionId === sessionId) {
			// Switch to another session or create a new one
			const remainingSessions = Array.from(this.sessions.keys());
			if (remainingSessions.length > 0) {
				this.currentSessionId = remainingSessions[0];
			} else {
				this.createSession();
			}
		}

		this.saveSessions();
	}

	clearCurrentSession(): void {
		const session = this.getCurrentSession();
		if (session) {
			session.messages = [];
			session.updated = Date.now();
			this.saveSessions();
		}
	}

	exportSession(sessionId: string): string {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error("Session not found");
		}
		return JSON.stringify(session, null, 2);
	}

	getAvailableTools(): IChatTool[] {
		return this.toolsRegistry.getAllTools();
	}

	async executeToolCall(toolCall: IToolCall): Promise<IToolResult> {
		try {
			const result = await this.toolsRegistry.executeTool(
				toolCall.name,
				toolCall.parameters,
			);
			return {
				toolCallId: toolCall.id,
				result,
			};
		} catch (error) {
			return {
				toolCallId: toolCall.id,
				result: "",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private extractToolCalls(content: string): IToolCall[] {
		const toolCalls: IToolCall[] = [];

		// Match tool calls in the format: ```tool\n{...}\n```
		const toolCallRegex = /```tool\s*\n([\s\S]*?)\n```/g;
		let match;

		while ((match = toolCallRegex.exec(content)) !== null) {
			try {
				const toolCallData = JSON.parse(match[1]);
				if (toolCallData.name && toolCallData.parameters) {
					toolCalls.push({
						id: generateUuid(),
						name: toolCallData.name,
						parameters: toolCallData.parameters,
					});
				}
			} catch (error) {
				// Invalid JSON, skip this tool call
				console.error("Failed to parse tool call:", error);
			}
		}

		return toolCalls;
	}
}
