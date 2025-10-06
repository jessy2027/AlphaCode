/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from "../../../../base/common/event.js";
import { Disposable } from "../../../../base/common/lifecycle.js";
import { generateUuid } from "../../../../base/common/uuid.js";
import { VSBuffer } from "../../../../base/common/buffer.js";
import { localize } from "../../../../nls.js";
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from "../../../../platform/storage/common/storage.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import { IChatEditingService } from "../../chat/common/chatEditingService.js";
import type { IAIMessage } from "../common/aiProvider.js";
import {
	IAlphaCodeChatService,
	IChatContext,
	IChatMessage,
	IChatSession,
	IStreamChunk,
	IChatTool,
	IToolCall,
	IToolResult,
	IEditProposalWithChanges,
	IProposalDecision,
} from "../common/chatService.js";
import {
	IAlphaCodeContextService,
	type IFileContext,
} from "../common/contextService.js";
import { IAlphaCodeSecurityService } from "../common/securityService.js";
import { ChatToolsRegistry, type IToolEditProposal } from "./chatTools.js";
import { calculateLineChanges, applyChanges, getChangeSummary } from "./diffUtils.js";
import { ToolCallParser } from "./toolCallParser.js";
import { MessageFormatter } from "./messageFormatter.js";
import { StreamHandler } from "./streamHandler.js";
import { PromptBuilder } from "./promptBuilder.js";
import { ProposalManager } from "./proposalManager.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { IWorkspaceContextService } from "../../../../platform/workspace/common/workspace.js";
import { IEditorService } from "../../../../workbench/services/editor/common/editorService.js";
import type { ITextResourceDiffEditorInput } from "../../../../workbench/common/editor.js";
import { URI } from "../../../../base/common/uri.js";

const STORAGE_KEY_SESSIONS = "alphacode.chat.sessions";
const STORAGE_KEY_CURRENT_SESSION = "alphacode.chat.currentSession";
const MAX_WORKSPACE_FILE_REFERENCES = 20;
const MAX_WORKSPACE_SYMBOLS = 100;
const MAX_WORKSPACE_SNIPPETS = 6;
const MAX_SNIPPET_LENGTH = 2000;
const STORAGE_KEY_TOOL_DECISIONS = "alphacode.chat.tool.decisions";

interface IToolEditDecisionRecord {
	id: string;
	path: string;
	action: "accepted" | "rejected" | "partially-accepted";
	timestamp: number;
}

export class AlphaCodeChatService
	extends Disposable
	implements IAlphaCodeChatService {
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

	private readonly _onDidCreateProposal = this._register(
		new Emitter<IEditProposalWithChanges>(),
	);
	readonly onDidCreateProposal: Event<IEditProposalWithChanges> =
		this._onDidCreateProposal.event;

	private readonly _onDidChangeProposalStatus = this._register(
		new Emitter<IEditProposalWithChanges>(),
	);
	readonly onDidChangeProposalStatus: Event<IEditProposalWithChanges> =
		this._onDidChangeProposalStatus.event;
	private sessions: Map<string, IChatSession> = new Map();
	private currentSessionId: string | undefined;
	private toolsRegistry: ChatToolsRegistry;
	private pendingProposals: Map<string, IEditProposalWithChanges> = new Map();
	private readonly proposalTools: IChatTool[];
	private auditLog: IToolEditDecisionRecord[] = [];
	private proposalSequence = 0;
	private backupContents: Map<string, string> = new Map();
	private currentStreamAbortController: AbortController | undefined;
	private readonly toolParser = new ToolCallParser();
	private readonly messageFormatter = new MessageFormatter();
	private streamHandler!: StreamHandler;
	private readonly promptBuilder: PromptBuilder;
	private readonly proposalManager: ProposalManager;

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IStorageService private readonly storageService: IStorageService,
		@IAlphaCodeSecurityService securityService: IAlphaCodeSecurityService,
		@IAlphaCodeContextService
		private readonly contextService: IAlphaCodeContextService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
		@IChatEditingService private readonly chatEditingService: IChatEditingService,
	) {
		super();
		this.promptBuilder = new PromptBuilder(securityService);
		this.proposalManager = this._register(new ProposalManager(fileService, editorService));
		
		// Forward proposal events
		this._register(this.proposalManager.onDidCreateProposal(p => this._onDidCreateProposal.fire(p)));
		this._register(this.proposalManager.onDidChangeStatus(p => this._onDidChangeProposalStatus.fire(p)));
		
		this.loadDecisionLog();
		this.toolsRegistry = new ChatToolsRegistry(
			fileService,
			workspaceContextService,
			this.handleToolEditProposal.bind(this),
		);
		this.streamHandler = new StreamHandler(
			this.toolParser,
			(chunk) => this._onDidStreamChunk.fire(chunk),
			(session, messageId, content) => this.createAssistantMessage(session, messageId, content),
			() => this._ensureChatEditingView(),
			(session, toolCall) => this.executeToolCallDuringStreaming(session, toolCall)
		);

		this.proposalTools = [
			{
				name: "accept_edit_proposal",
				description:
					"Accept a pending edit proposal previously generated by a tool.",
				parameters: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: "The proposal identifier returned when the diff was created.",
						},
					},
					required: ["id"],
				},
				execute: async (params: { id: string }) =>
					await this.acceptEditProposal(params.id),
			},
			{
				name: "reject_edit_proposal",
				description:
					"Reject and discard a pending edit proposal without applying changes.",
				parameters: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: "The proposal identifier returned when the diff was created.",
						},
					},
					required: ["id"],
				},
				execute: async (params: { id: string }) =>
					await this.rejectEditProposal(params.id),
			},
			{
				name: "list_edit_proposals",
				description:
					"List all pending edit proposals awaiting approval.",
				parameters: {
					type: "object",
					properties: {},
				},
				execute: async () => this.listEditProposals(),
			},
		];
		this.loadSessions();
	}

	private appendSystemMessage(content: string): void {
		const session = this.getCurrentSession();
		if (!session) {
			return;
		}
		const message: IChatMessage = {
			id: generateUuid(),
			role: "system",
			content,
			timestamp: Date.now(),
		};
		session.messages.push(message);
		session.updated = Date.now();
		this._onDidAddMessage.fire(message);
		this.saveSessions();
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
		return this._sendMessage(content, context, false);
	}
	async sendMessageHidden(content: string, context?: IChatContext): Promise<void> {
		return this._sendMessage(content, context, true);
	}

	private async _sendMessage(content: string, context?: IChatContext, hidden: boolean = false): Promise<void> {
		const session = this.getCurrentSession();
		if (!session) {
			throw new Error("No active chat session");
		}

		// Add user message
		this.addUserMessage(session, content, hidden);

		// Enrich context with workspace data
		const enrichedContext = await this.enrichContext(content, context);
		const aiMessages = this.buildAIMessages(session, enrichedContext);

		try {
			await this.handleStreamingResponse(session, aiMessages);
		} catch (error) {
			// Clear abort controller
			this.currentStreamAbortController = undefined;

			// Si c'est une annulation, ne pas afficher d'erreur
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}

			const errorMessage: IChatMessage = {
				id: generateUuid(),
				role: "assistant",
				content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: Date.now(),
			};

			session.messages.push(errorMessage);
			session.updated = Date.now();
			this._onDidAddMessage.fire(errorMessage);
			this.saveSessions();
		}
	}

	private buildAIMessages(session: IChatSession, context?: IChatContext): IAIMessage[] {
		const allTools = [...this.toolsRegistry.getAllTools(), ...this.proposalTools];
		return this.promptBuilder.buildAIMessages(session, allTools, context);
	}


	private addUserMessage(session: IChatSession, content: string, hidden: boolean): void {
		const userMessage: IChatMessage = {
			id: generateUuid(),
			role: "user",
			content,
			timestamp: Date.now(),
			hidden,
		};

		session.messages.push(userMessage);
		session.updated = Date.now();
		if (!hidden) {
			this._onDidAddMessage.fire(userMessage);
		}
		this.saveSessions();
	}

	private async enrichContext(content: string, context?: IChatContext): Promise<IChatContext> {
		const workspaceContext = await this.contextService.getWorkspaceContext();
		const relevantFiles = await this.getRelevantFiles(content, workspaceContext.files);
		
		const workspaceFiles = relevantFiles.map(f => f.path);
		const workspaceSnippets = relevantFiles
			.slice(0, MAX_WORKSPACE_SNIPPETS)
			.map(f => this.createSnippetForFile(f))
			.filter(Boolean) as string[];
		const symbols = workspaceContext.symbols
			.slice(0, MAX_WORKSPACE_SYMBOLS)
			.map(s => `${s.kind}: ${s.name} (${s.location.uri.path})`);

		return {
			...context,
			workspaceFiles: context?.workspaceFiles ?? workspaceFiles,
			symbols: context?.symbols ?? symbols,
			workspaceSnippets: context?.workspaceSnippets ?? workspaceSnippets,
		};
	}

	private async getRelevantFiles(
		query: string,
		files: IFileContext[],
	): Promise<IFileContext[]> {
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
		return [...this.toolsRegistry.getAllTools(), ...this.proposalTools];
	}

	async acceptProposal(proposalId: string): Promise<void> {
		const proposal = this.pendingProposals.get(proposalId);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${proposalId}`);
		}
		const message = await this.acceptEditProposal(proposalId);
		this.appendSystemMessage(message);
	}

	async rejectProposal(proposalId: string): Promise<void> {
		const proposal = this.pendingProposals.get(proposalId);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${proposalId}`);
		}
		const message = await this.rejectEditProposal(proposalId);
		this.appendSystemMessage(message);
	}

	hasPendingProposal(proposalId: string): boolean {
		return this.pendingProposals.has(proposalId);
	}

	async executeToolCall(toolCall: IToolCall): Promise<IToolResult> {
		try {
			if (toolCall.name === "accept_edit_proposal") {
				const result = await this.acceptEditProposal(toolCall.parameters.id);
				return { toolCallId: toolCall.id, result };
			}
			if (toolCall.name === "reject_edit_proposal") {
				const result = await this.rejectEditProposal(toolCall.parameters.id);
				return { toolCallId: toolCall.id, result };
			}
			if (toolCall.name === "list_edit_proposals") {
				const result = await this.listEditProposals();
				return { toolCallId: toolCall.id, result };
			}
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
				error:
					error instanceof Error
						? error.message
						: "Unknown error executing tool",
			};
		}
	}

	private async handleToolEditProposal(
		proposal: IToolEditProposal,
	): Promise<string> {
		const id = `proposal-${++this.proposalSequence}`;
		const changes = calculateLineChanges(
			proposal.originalContent ?? "",
			proposal.proposedContent ?? "",
		);
		const enhancedProposal: IEditProposalWithChanges = {
			id,
			path: proposal.path,
			filePath: proposal.uri.fsPath,
			kind: proposal.kind,
			originalContent: proposal.originalContent ?? "",
			proposedContent: proposal.proposedContent ?? "",
			changes,
			timestamp: Date.now(),
			status: 'pending',
		};

		// Save backup for potential rollback
		this.backupContents.set(id, proposal.originalContent ?? "");

		this.pendingProposals.set(id, enhancedProposal);
		this._onDidCreateProposal.fire(enhancedProposal);

		// Open diff editor immediately
		await this.openDiffForProposal(enhancedProposal);

		const summary = getChangeSummary(changes);
		return `Edit proposal ${id} created for ${proposal.path}. ${summary}. The diff editor is now open for review. Use accept_edit_proposal or reject_edit_proposal to finalize.`;
	}

	private async openDiffForProposal(proposal: IEditProposalWithChanges): Promise<void> {
		try {
			const label = `${proposal.kind === "write" ? "Create" : "Edit"}: ${proposal.path}`;
			const fileName = proposal.path.split(/[\/]/).pop() ?? "file";

			// Create unique URIs for the diff view
			const originalResource = URI.from({
				scheme: "untitled",
				path: `/alphacode/original/${proposal.id}/${fileName}`,
			});
			const modifiedResource = URI.from({
				scheme: "untitled",
				path: `/alphacode/modified/${proposal.id}/${fileName}`,
			});
			const diffInput: ITextResourceDiffEditorInput = {
				label,
				description: `${proposal.path} (${proposal.changes.length} change${proposal.changes.length > 1 ? 's' : ''})`,
				original: {
					resource: originalResource,
					forceUntitled: true,
					contents: proposal.originalContent ?? "",
					label: proposal.kind === "write" ? "Empty File" : "Original",
				},
				modified: {
					resource: modifiedResource,
					forceUntitled: true,
					contents: proposal.proposedContent ?? "",
					label: "Proposed Changes",
				},
				options: {
					pinned: true,
					preserveFocus: false, // Give focus to the diff editor
					revealIfVisible: true,
					activation: 1, // EditorActivation.ACTIVATE
				},
			};

			await this.editorService.openEditor(diffInput);
		} catch (error) {
			console.error("Failed to open diff for proposal:", error);
			throw error;
		}
	}

	private async acceptEditProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		const uri = URI.file(proposal.filePath);
		await this.fileService.writeFile(
			uri,
			VSBuffer.fromString(proposal.proposedContent),
		);

		// Update proposal status
		proposal.status = 'accepted';
		this._onDidChangeProposalStatus.fire(proposal);

		this.pendingProposals.delete(id);
		this.backupContents.delete(id);
		this.logDecision(proposal, "accepted");

		return `✓ Applied proposal ${id} to ${proposal.path}.`;
	}

	private async rejectEditProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(`Unknown proposal: ${id}`);
		}

		// Perform rollback - restore original content if file was modified
		const backup = this.backupContents.get(id);
		if (backup !== undefined) {
			try {
				const uri = URI.file(proposal.filePath);
				// Check if file exists and was modified
				try {
					const currentContent = await this.fileService.readFile(uri);
					if (currentContent.value.toString() !== backup) {
						// Rollback to original content
						await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
					}
				} catch (error) {
					// File might not exist yet, that's ok
				}
			} catch (error) {
				console.error("Failed to rollback:", error);
			}
		}

		// Update proposal status
		proposal.status = 'rejected';
		this._onDidChangeProposalStatus.fire(proposal);

		this.pendingProposals.delete(id);
		this.backupContents.delete(id);
		this.logDecision(proposal, "rejected");

		return `✗ Rejected proposal ${id} for ${proposal.path}. Changes have been rolled back.`;
	}

	private async listEditProposals(): Promise<string> {
		if (this.pendingProposals.size === 0) {
			return "No pending edit proposals.";
		}
		const lines: string[] = ["Pending proposals:"];
		for (const proposal of this.pendingProposals.values()) {
			lines.push(`- ${proposal.id}: ${proposal.path} (${proposal.kind})`);
		}
		return lines.join("\n");
	}

	private logDecision(
		proposal: IEditProposalWithChanges,
		action: "accepted" | "rejected" | "partially-accepted",
	): void {
		this.auditLog.push({
			id: proposal.id,
			path: proposal.path,
			action,
			timestamp: Date.now(),
		});
		if (this.auditLog.length > 200) {
			this.auditLog.splice(0, this.auditLog.length - 200);
		}
		this.persistDecisionLog();
	}

	private loadDecisionLog(): void {
		const stored = this.storageService.get(
			STORAGE_KEY_TOOL_DECISIONS,
			StorageScope.WORKSPACE,
		);
		if (!stored) {
			this.auditLog = [];
			return;
		}
		try {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				this.auditLog = parsed.filter((entry) =>
					typeof entry?.id === "string" &&
					typeof entry?.path === "string" &&
					(entry?.action === "accepted" || entry?.action === "rejected" || entry?.action === "partially-accepted") &&
					typeof entry?.timestamp === "number",
				);
			}
		} catch {
			this.auditLog = [];
		}
	}

	private persistDecisionLog(): void {
		try {
			this.storageService.store(
				STORAGE_KEY_TOOL_DECISIONS,
				JSON.stringify(this.auditLog),
				StorageScope.WORKSPACE,
				StorageTarget.MACHINE,
			);
		} catch (error) {
			console.error("Failed to persist tool decision log", error);
		}
	}

	private createToolMessage(
		toolCall: IToolCall,
		toolResult: IToolResult,
		timestamp: number,
	): { content: string; metadata: Record<string, any> } {
		const toolDefinition = this.toolsRegistry.getTool(toolCall.name);
		const normalizedContent = this.messageFormatter.normalizeToolContent(
			toolResult.error ?? toolResult.result,
		);
		const content =
			normalizedContent.length > 0
				? normalizedContent
				: localize(
					"alphacode.chat.tool.noOutput",
					"The tool did not return any output.",
				);
		const summaryInfo = this.messageFormatter.buildToolSummary(content);
		const metadata: Record<string, any> = {
			name: toolDefinition?.name ?? toolCall.name,
			status: toolResult.error ? "error" : "success",
			summary: summaryInfo.summary,
			timestamp,
		};

		if (toolCall.name === "write_file" || toolCall.name === "edit_file") {
			const proposal = this.findProposalForTool(toolCall);
			if (proposal) {
				metadata.proposalId = proposal.id;
				metadata.originalContent = proposal.originalContent;
				metadata.proposedContent = proposal.proposedContent;
				metadata.path = proposal.path;
			}
		}

		if (toolDefinition?.description) {
			metadata.description = toolDefinition.description;
		}

		const parametersString = this.messageFormatter.stringifyToolParameters(toolCall.parameters);
		if (parametersString) {
			metadata.parameters = parametersString;
		}

		if (summaryInfo.details) {
			metadata.details = summaryInfo.details;
		}

		if (toolResult.error) {
			metadata.error = toolResult.error;
		}

		return {
			content,
			metadata,
		};
	}

	private findProposalForTool(toolCall: IToolCall): IEditProposalWithChanges | undefined {
		const candidateIds = Array.from(this.pendingProposals.keys());
		for (let i = candidateIds.length - 1; i >= 0; i--) {
			const proposal = this.pendingProposals.get(candidateIds[i]);
			if (!proposal) {
				continue;
			}
			if (toolCall.name === "write_file" && proposal.kind === "write") {
				return proposal;
			}
			if (toolCall.name === "edit_file" && proposal.kind === "edit") {
				return proposal;
			}
		}
		return undefined;
	}

	private async _ensureChatEditingView(): Promise<void> {
		if (!this.currentSessionId) {
			return;
		}
		const session = this.chatEditingService.getEditingSession(this.currentSessionId);
		if (session) {
			await session.applyPendingEdits();
			await session.show();
		}
	}

	private async executeToolCallDuringStreaming(
		session: IChatSession,
		toolCall: IToolCall,
	): Promise<void> {
		// Utiliser le timestamp de détection pour maintenir l'ordre chronologique
		const toolTimestamp = toolCall.detectedAt ?? Date.now();
		const toolResult = await this.executeToolCall(toolCall);
		const formattedTool = this.createToolMessage(
			toolCall,
			toolResult,
			toolTimestamp,
		);

		const toolMessage: IChatMessage = {
			id: generateUuid(),
			role: "tool",
			content: formattedTool.content,
			timestamp: toolTimestamp,
			toolCallId: toolCall.id,
			metadata: formattedTool.metadata,
		};

		session.messages.push(toolMessage);
		session.updated = Date.now();
		this._onDidAddMessage.fire(toolMessage);
		this.saveSessions();
		await this._ensureChatEditingView();
		return;
	}

	private async handleStreamingResponse(session: IChatSession, aiMessages: IAIMessage[]): Promise<void> {
		this.currentStreamAbortController = new AbortController();
		const messageId = generateUuid();
		const streamState = this.streamHandler.createInitialState();

		await this.aiService.sendMessageStream(aiMessages, async (chunk) => {
			if (this.currentStreamAbortController?.signal.aborted) {
				throw new DOMException('Stream aborted', 'AbortError');
			}

			if (!chunk.done) {
				await this.streamHandler.processChunk(session, messageId, chunk, streamState);
			} else if (!streamState.writeToolDetected) {
				this._onDidStreamChunk.fire({ content: "", done: true, messageId });
			}
		});

		this.currentStreamAbortController = undefined;

		await this.streamHandler.executePendingTools(session, streamState);
		this.streamHandler.finalizeMessage(session, messageId, streamState);

		// Si des outils ont été exécutés et qu'il y a du contenu à traiter, continuer la conversation
		if (streamState.detectedToolCalls.size > 0 && streamState.readToolCalls.length > 0) {
			// Relancer la conversation avec les résultats des outils
			const updatedMessages = this.buildAIMessages(session);
			await this.handleStreamingResponse(session, updatedMessages);
		}
	}


	private createAssistantMessage(session: IChatSession, messageId: string, content: string): IChatMessage {
		const message: IChatMessage = {
			id: messageId,
			role: "assistant",
			content,
			timestamp: Date.now(),
		};
		session.messages.push(message);
		session.updated = Date.now();
		this._onDidAddMessage.fire(message);
		this.saveSessions();
		return message;
	}



	// New granular control methods for Phase 3

	getPendingProposals(): IEditProposalWithChanges[] {
		return Array.from(this.pendingProposals.values())
			.filter(p => p.status === 'pending')
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	getProposal(proposalId: string): IEditProposalWithChanges | undefined {
		return this.pendingProposals.get(proposalId);
	}

	async applyProposalDecision(decision: IProposalDecision): Promise<void> {
		const proposal = this.pendingProposals.get(decision.proposalId);
		if (!proposal) {
			throw new Error(`Proposal ${decision.proposalId} not found`);
		}

		switch (decision.action) {
			case 'accept-all':
				await this.acceptEditProposal(decision.proposalId);
				break;

			case 'reject-all':
				await this.rejectEditProposal(decision.proposalId);
				break;

			case 'accept-changes':
				if (!decision.changeIndexes || decision.changeIndexes.length === 0) {
					throw new Error('No change indexes provided for accept-changes action');
				}
				await this.applyPartialChanges(proposal, decision.changeIndexes, true);
				break;

			case 'reject-changes':
				if (!decision.changeIndexes || decision.changeIndexes.length === 0) {
					throw new Error('No change indexes provided for reject-changes action');
				}
				await this.applyPartialChanges(proposal, decision.changeIndexes, false);
				break;
		}
	}

	private async applyPartialChanges(
		proposal: IEditProposalWithChanges,
		changeIndexes: number[],
		accept: boolean
	): Promise<void> {
		const uri = URI.file(proposal.filePath);

		if (accept) {
			// Apply only selected changes
			const newContent = applyChanges(
				proposal.originalContent,
				proposal.changes,
				changeIndexes
			);
			await this.fileService.writeFile(uri, VSBuffer.fromString(newContent));

			// Update proposal status
			proposal.status = 'partially-accepted';
			this._onDidChangeProposalStatus.fire(proposal);

			this.logDecision(proposal, 'partially-accepted');
			this.appendSystemMessage(
				`Partially applied proposal ${proposal.id} to ${proposal.path} (${changeIndexes.length} changes).`
			);
		} else {
			// Reject only selected changes - keep the rest pending
			const remainingChanges = proposal.changes.filter((_change: any, index: number) =>
				!changeIndexes.includes(index)
			);

			if (remainingChanges.length === 0) {
				// All changes rejected
				await this.rejectEditProposal(proposal.id);
			} else {
				// Some changes still pending
				proposal.changes = remainingChanges;
				this._onDidChangeProposalStatus.fire(proposal);
				this.appendSystemMessage(
					`Rejected ${changeIndexes.length} changes from proposal ${proposal.id}.`
				);
			}
		}
	}

	async acceptAllProposals(): Promise<void> {
		const pending = this.getPendingProposals();
		const results: string[] = [];

		for (const proposal of pending) {
			try {
				await this.acceptEditProposal(proposal.id);
				results.push(`✓ ${proposal.path}`);
			} catch (error) {
				results.push(`✗ ${proposal.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		this.appendSystemMessage(
			`Accepted all proposals:\n${results.join('\n')}`
		);
	}

	async rejectAllProposals(): Promise<void> {
		const pending = this.getPendingProposals();
		const results: string[] = [];

		for (const proposal of pending) {
			try {
				await this.rejectEditProposal(proposal.id);
				results.push(`✓ ${proposal.path}`);
			} catch (error) {
				results.push(`✗ ${proposal.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		this.appendSystemMessage(
			`Rejected all proposals:\n${results.join('\n')}`
		);
	}

	getProposalAuditLog(): Array<{
		id: string;
		path: string;
		action: string;
		timestamp: number;
	}> {
		return [...this.auditLog];
	}

	abortCurrentStream(): void {
		if (this.currentStreamAbortController) {
			this.currentStreamAbortController.abort();
			this.currentStreamAbortController = undefined;
		}
	}

	isCurrentlyStreaming(): boolean {
		return this.currentStreamAbortController !== undefined;
	}
}
