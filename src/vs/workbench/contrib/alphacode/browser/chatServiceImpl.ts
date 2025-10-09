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
import { ProposalEditorService } from "./proposalEditorService.js";
import { IFileService } from "../../../../platform/files/common/files.js";
import { IWorkspaceContextService } from "../../../../platform/workspace/common/workspace.js";
import { IEditorService } from "../../../../workbench/services/editor/common/editorService.js";
import { ITextModelService } from "../../../../editor/common/services/resolverService.js";
import { IUndoRedoService } from "../../../../platform/undoRedo/common/undoRedo.js";
import { URI } from "../../../../base/common/uri.js";

// Storage keys
const STORAGE_KEY_SESSIONS = "alphacode.chat.sessions";
const STORAGE_KEY_CURRENT_SESSION = "alphacode.chat.currentSession";
const STORAGE_KEY_TOOL_DECISIONS = "alphacode.chat.tool.decisions";

// Context limits
const MAX_WORKSPACE_FILE_REFERENCES = 20;
const MAX_WORKSPACE_SYMBOLS = 100;
const MAX_WORKSPACE_SNIPPETS = 6;
const MAX_SNIPPET_LENGTH = 2000;
const MAX_AUDIT_LOG_SIZE = 200;

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

	// Events
	private readonly _onDidAddMessage = this._register(new Emitter<IChatMessage>());
	readonly onDidAddMessage: Event<IChatMessage> = this._onDidAddMessage.event;

	private readonly _onDidCreateSession = this._register(new Emitter<IChatSession>());
	readonly onDidCreateSession: Event<IChatSession> = this._onDidCreateSession.event;

	private readonly _onDidStreamChunk = this._register(new Emitter<IStreamChunk>());
	readonly onDidStreamChunk: Event<IStreamChunk> = this._onDidStreamChunk.event;

	private readonly _onDidCreateProposal = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidCreateProposal: Event<IEditProposalWithChanges> = this._onDidCreateProposal.event;

	private readonly _onDidChangeProposalStatus = this._register(new Emitter<IEditProposalWithChanges>());
	readonly onDidChangeProposalStatus: Event<IEditProposalWithChanges> = this._onDidChangeProposalStatus.event;

	// Core state
	private sessions: Map<string, IChatSession> = new Map();
	private currentSessionId: string | undefined;
	private pendingProposals: Map<string, IEditProposalWithChanges> = new Map();
	private backupContents: Map<string, string> = new Map();
	private auditLog: IToolEditDecisionRecord[] = [];
	private proposalSequence = 0;
	private currentStreamAbortController: AbortController | undefined;


	// Tools and utilities
	private readonly toolsRegistry: ChatToolsRegistry;
	private readonly toolParser = new ToolCallParser();
	private readonly messageFormatter = new MessageFormatter();
	private readonly streamHandler: StreamHandler;
	private readonly promptBuilder: PromptBuilder;
	private readonly proposalManager: ProposalManager;
	private readonly proposalEditorService: ProposalEditorService;

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IStorageService private readonly storageService: IStorageService,
		@IAlphaCodeSecurityService securityService: IAlphaCodeSecurityService,
		@IAlphaCodeContextService private readonly contextService: IAlphaCodeContextService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
		@ITextModelService textModelService: ITextModelService,
	@IUndoRedoService undoRedoService: IUndoRedoService,
		@IChatEditingService private readonly chatEditingService: IChatEditingService,
	) {
		super();

		// Initialize utilities
		this.promptBuilder = new PromptBuilder(securityService);
		this.proposalManager = this._register(new ProposalManager(fileService, editorService, textModelService, undoRedoService));
		this.proposalEditorService = this._register(new ProposalEditorService(textModelService, editorService));

		// Forward proposal events
		this._register(this.proposalManager.onDidCreateProposal(p => this._onDidCreateProposal.fire(p)));
		this._register(this.proposalManager.onDidChangeStatus(p => this._onDidChangeProposalStatus.fire(p)));

		// Initialize tools
		this.toolsRegistry = new ChatToolsRegistry(
			fileService,
			workspaceContextService,
			this.handleToolEditProposal.bind(this),
		);

		// Initialize stream handler
		this.streamHandler = new StreamHandler(
			this.toolParser,
			(chunk) => this._onDidStreamChunk.fire(chunk),
			(session, messageId, content) => this.createAssistantMessage(session, messageId, content),
			() => this.ensureChatEditingView(),
			(session, toolCall) => this.executeToolCallDuringStreaming(session, toolCall)
		);

		// Load persisted data
		this.loadDecisionLog();
		this.loadSessions();

		// Cleanup on disposal
		this._register({
			dispose: () => {
				// Clear all proposal decorations
				for (const proposalId of this.pendingProposals.keys()) {
					this.proposalEditorService.clearProposal(proposalId);
				}
			}
		});
	}

	// ============================================================================
	// Session Management
	// ============================================================================

	getCurrentSession(): IChatSession | undefined {
		return this.currentSessionId ? this.sessions.get(this.currentSessionId) : undefined;
	}

	createSession(title?: string): IChatSession {
		const session: IChatSession = {
			id: generateUuid(),
			title: title || localize('alphacode.chat.sessionTitle', 'Session {0}', this.sessions.size + 1),
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

	getSessions(): IChatSession[] {
		return Array.from(this.sessions.values()).sort((a, b) => b.updated - a.updated);
	}

	async deleteSession(sessionId: string): Promise<void> {
		// Clear decorations for proposals associated with this session
		const proposalsToClose = Array.from(this.pendingProposals.values())
			.filter(p => this.sessions.get(sessionId)?.messages.some(m => m.metadata?.proposalId === p.id));

		for (const proposal of proposalsToClose) {
			this.proposalEditorService.clearProposal(proposal.id);
		}

		this.sessions.delete(sessionId);

		if (this.currentSessionId === sessionId) {
			const remainingSessions = Array.from(this.sessions.keys());
			this.currentSessionId = remainingSessions.length > 0 ? remainingSessions[0] : undefined;

			if (!this.currentSessionId) {
				this.createSession();
			}
		}

		this.saveSessions();
	}

	async clearCurrentSession(): Promise<void> {
		const session = this.getCurrentSession();
		if (session) {
			// Clear decorations for proposals associated with this session
			const proposalsToClose = Array.from(this.pendingProposals.values())
				.filter(p => session.messages.some(m => m.metadata?.proposalId === p.id));

			for (const proposal of proposalsToClose) {
				this.proposalEditorService.clearProposal(proposal.id);
			}

			session.messages = [];
			session.updated = Date.now();
			this.saveSessions();
		}
	}

	exportSession(sessionId: string): string {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(localize('alphacode.chat.sessionNotFound', 'Session not found'));
		}
		return JSON.stringify(session, null, 2);
	}

	// ============================================================================
	// Message Handling
	// ============================================================================

	async sendMessage(content: string, context?: IChatContext): Promise<void> {
		return this.sendMessageInternal(content, context, false);
	}

	async sendMessageHidden(content: string, context?: IChatContext): Promise<void> {
		return this.sendMessageInternal(content, context, true);
	}

	private async sendMessageInternal(content: string, context?: IChatContext, hidden: boolean = false): Promise<void> {
		const session = this.getCurrentSession();
		if (!session) {
			throw new Error(localize('alphacode.chat.noActiveSession', 'No active chat session'));
		}

		this.addUserMessage(session, content, hidden);

		const enrichedContext = await this.enrichContext(content, context);
		const aiMessages = this.buildAIMessages(session, enrichedContext);

		try {
			await this.handleStreamingResponse(session, aiMessages);
		} catch (error) {
			this.currentStreamAbortController = undefined;

			// Don't show error for user-initiated abort
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}

			this.addErrorMessage(session, error);
		}
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

	private addErrorMessage(session: IChatSession, error: unknown): void {
		const errorMessage: IChatMessage = {
			id: generateUuid(),
			role: "assistant",
			content: localize('alphacode.chat.error', 'Error: {0}', error instanceof Error ? error.message : localize('alphacode.chat.unknownError', 'Unknown error')),
			timestamp: Date.now(),
		};

		session.messages.push(errorMessage);
		session.updated = Date.now();
		this._onDidAddMessage.fire(errorMessage);
		this.saveSessions();
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

	// ============================================================================
	// Context Enrichment
	// ============================================================================

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

	private async getRelevantFiles(query: string, files: IFileContext[]): Promise<IFileContext[]> {
		const relevant = await this.contextService.getRelevantContext(query, MAX_WORKSPACE_FILE_REFERENCES);
		return relevant.length > 0 ? relevant : files.slice(0, MAX_WORKSPACE_FILE_REFERENCES);
	}

	private createSnippetForFile(file: IFileContext): string | undefined {
		if (!file.content) {
			return undefined;
		}

		const trimmed = file.content.length > MAX_SNIPPET_LENGTH
			? `${file.content.slice(0, MAX_SNIPPET_LENGTH)}\n…`
			: file.content;

		return localize('alphacode.chat.fileSnippet', 'File: {0}\n{1}', file.path, trimmed);
	}
	// Streaming
	// ============================================================================

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
			}
			// Ne pas envoyer done: true ici - attendre que tous les outils soient exécutés
		});

		this.currentStreamAbortController = undefined;

		await this.streamHandler.executePendingTools(session, streamState);
		this.streamHandler.finalizeMessage(session, messageId, streamState);

		// Vérifier s'il faut continuer la conversation AVANT d'envoyer done: true
		const hasReadTools = streamState.detectedToolCalls.size > 0 &&
			Array.from(streamState.detectedToolCalls.values())
				.some(tool => !tool.name.toLowerCase().includes('write') && !tool.name.toLowerCase().includes('edit'));

		if (hasReadTools) {
			// Ne PAS envoyer done: true, on continue le streaming avec la réponse de l'outil
			const updatedMessages = this.buildAIMessages(session);
			await this.handleStreamingResponse(session, updatedMessages);
		} else {
			// Envoyer done: true seulement si on ne continue pas
			this._onDidStreamChunk.fire({ content: "", done: true, messageId });
		}
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

	// ============================================================================
	// Tools Management
	// ============================================================================

	getAvailableTools(): IChatTool[] {
		return this.toolsRegistry.getAllTools();
	}

	private buildAIMessages(session: IChatSession, context?: IChatContext): IAIMessage[] {
		const allTools = this.getAvailableTools();
		return this.promptBuilder.buildAIMessages(session, allTools, context);
	}

	async executeToolCall(toolCall: IToolCall): Promise<IToolResult> {
		try {
			// Handle registry tools
			const result = await this.toolsRegistry.executeTool(toolCall.name, toolCall.parameters);
			return { toolCallId: toolCall.id, result };
		} catch (error) {
			return {
				toolCallId: toolCall.id,
				result: "",
				error: error instanceof Error ? error.message : localize('alphacode.chat.unknownToolError', 'Unknown error executing tool'),
			};
		}
	}

	private async executeToolCallDuringStreaming(session: IChatSession, toolCall: IToolCall): Promise<void> {
		// Utiliser le timestamp de détection pour maintenir l'ordre chronologique
		const toolTimestamp = toolCall.detectedAt ?? Date.now();
		const toolResult = await this.executeToolCall(toolCall);
		const formattedTool = this.createToolMessage(toolCall, toolResult, toolTimestamp);

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
		await this.ensureChatEditingView();
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
		const content = normalizedContent.length > 0
			? normalizedContent
			: localize("alphacode.chat.tool.noOutput", "The tool did not return any output.");

		const summaryInfo = this.messageFormatter.buildToolSummary(content);
		const metadata: Record<string, any> = {
			name: toolDefinition?.name ?? toolCall.name,
			status: toolResult.error ? "error" : "success",
			summary: summaryInfo.summary,
			timestamp,
		};

		// Add proposal metadata for file operations
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

		return { content, metadata };
	}

	private findProposalForTool(toolCall: IToolCall): IEditProposalWithChanges | undefined {
		const candidateIds = Array.from(this.pendingProposals.keys());

		for (let i = candidateIds.length - 1; i >= 0; i--) {
			const proposal = this.pendingProposals.get(candidateIds[i]);
			if (!proposal) {
				continue;
			}

			const isMatchingWrite = toolCall.name === "write_file" && proposal.kind === "write";
			const isMatchingEdit = toolCall.name === "edit_file" && proposal.kind === "edit";

			if (isMatchingWrite || isMatchingEdit) {
				return proposal;
			}
		}

		return undefined;
	}

	// ============================================================================
	// Proposal Management
	// ============================================================================

	private async handleToolEditProposal(proposal: IToolEditProposal): Promise<string> {
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

		this.backupContents.set(id, proposal.originalContent ?? "");
		this.pendingProposals.set(id, enhancedProposal);
		this._onDidCreateProposal.fire(enhancedProposal);

		// Apply changes immediately to the file
		await this.applyProposalChanges(enhancedProposal);

		// Open file with inline decorations
		await this.openProposalFile(enhancedProposal);

		const summary = getChangeSummary(changes);
		return localize('alphacode.chat.proposalCreated', 'Edit proposal {0} created for {1}. {2}. The file is now open with inline decorations for review. Use accept_edit_proposal or reject_edit_proposal to finalize.', id, proposal.path, summary);
	}

	private async applyProposalChanges(proposal: IEditProposalWithChanges): Promise<void> {
		// Apply changes immediately to the file
		const uri = URI.file(proposal.filePath);
		await this.fileService.writeFile(uri, VSBuffer.fromString(proposal.proposedContent));
	}

	private async openProposalFile(proposal: IEditProposalWithChanges): Promise<void> {
		const uri = URI.file(proposal.filePath);

		// Open the file in the editor
		await this.editorService.openEditor({
			resource: uri,
			options: {
				preserveFocus: false,
				revealIfOpened: true
			}
		});

		// Show inline decorations
		await this.proposalEditorService.showProposal(proposal);
	}

	getPendingProposals(): IEditProposalWithChanges[] {
		return Array.from(this.pendingProposals.values())
			.filter(p => p.status === 'pending')
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	getProposal(proposalId: string): IEditProposalWithChanges | undefined {
		return this.pendingProposals.get(proposalId);
	}
	hasPendingProposal(proposalId: string): boolean {
		return this.pendingProposals.has(proposalId);
	}

	async acceptProposal(proposalId: string): Promise<void> {
		const proposal = this.pendingProposals.get(proposalId);
		if (!proposal) {
			throw new Error(localize('alphacode.chat.unknownProposal', 'Unknown proposal: {0}', proposalId));
		}
		const message = await this.acceptEditProposal(proposalId);
		this.appendSystemMessage(message);
	}

	async rejectProposal(proposalId: string): Promise<void> {
		const proposal = this.pendingProposals.get(proposalId);
		if (!proposal) {
			throw new Error(localize('alphacode.chat.unknownProposal', 'Unknown proposal: {0}', proposalId));
		}
		const message = await this.rejectEditProposal(proposalId);
		this.appendSystemMessage(message);
	}

	private async acceptEditProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(localize('alphacode.chat.unknownProposal', 'Unknown proposal: {0}', id));
		}

		const uri = URI.file(proposal.filePath);
		await this.fileService.writeFile(uri, VSBuffer.fromString(proposal.proposedContent));

		proposal.status = 'accepted';
		this._onDidChangeProposalStatus.fire(proposal);

		// Clear decorations
		this.proposalEditorService.clearProposal(id);

		this.pendingProposals.delete(id);
		this.backupContents.delete(id);
		this.logDecision(proposal, "accepted");

		return localize('alphacode.chat.proposalApplied', '✓ Applied proposal {0} to {1}.', id, proposal.path);
	}

	private async rejectEditProposal(id: string): Promise<string> {
		const proposal = this.pendingProposals.get(id);
		if (!proposal) {
			throw new Error(localize('alphacode.chat.unknownProposal', 'Unknown proposal: {0}', id));
		}

		// Rollback to original content if file was modified
		const backup = this.backupContents.get(id);
		if (backup !== undefined) {
			try {
				const uri = URI.file(proposal.filePath);
				const currentContent = await this.fileService.readFile(uri);

				if (currentContent.value.toString() !== backup) {
					await this.fileService.writeFile(uri, VSBuffer.fromString(backup));
				}
			} catch (error) {
				// File might not exist yet, which is fine
				console.error("Failed to rollback:", error);
			}
		}

		proposal.status = 'rejected';
		this._onDidChangeProposalStatus.fire(proposal);

		// Clear decorations
		this.proposalEditorService.clearProposal(id);

		this.pendingProposals.delete(id);
		this.backupContents.delete(id);
		this.logDecision(proposal, "rejected");

		return localize('alphacode.chat.proposalRejected', '✗ Rejected proposal {0} for {1}. Changes have been rolled back.', id, proposal.path);
	}


	// Granular control methods
	async applyProposalDecision(decision: IProposalDecision): Promise<void> {
		const proposal = this.pendingProposals.get(decision.proposalId);
		if (!proposal) {
			throw new Error(localize('alphacode.chat.proposalNotFound', 'Proposal {0} not found', decision.proposalId));
		}

		switch (decision.action) {
			case 'accept-all':
				await this.acceptEditProposal(decision.proposalId);
				break;

			case 'reject-all':
				await this.rejectEditProposal(decision.proposalId);
				break;

			case 'accept-changes':
				if (!decision.changeIndexes?.length) {
					throw new Error(localize('alphacode.chat.noChangeIndexes', 'No change indexes provided for accept-changes action'));
				}
				await this.applyPartialChanges(proposal, decision.changeIndexes, true);
				break;

			case 'reject-changes':
				if (!decision.changeIndexes?.length) {
					throw new Error(localize('alphacode.chat.noChangeIndexesReject', 'No change indexes provided for reject-changes action'));
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
			const newContent = applyChanges(proposal.originalContent, proposal.changes, changeIndexes);
			await this.fileService.writeFile(uri, VSBuffer.fromString(newContent));

			proposal.status = 'partially-accepted';
			this._onDidChangeProposalStatus.fire(proposal);
			this.logDecision(proposal, 'partially-accepted');

			this.appendSystemMessage(
				localize('alphacode.chat.proposalPartiallyApplied', 'Partially applied proposal {0} to {1} ({2} changes).', proposal.id, proposal.path, changeIndexes.length)
			);
		} else {
			const remainingChanges = proposal.changes.filter((_: any, index: number) =>
				!changeIndexes.includes(index)
			);

			if (remainingChanges.length === 0) {
				await this.rejectEditProposal(proposal.id);
			} else {
				proposal.changes = remainingChanges;
				this._onDidChangeProposalStatus.fire(proposal);
				this.appendSystemMessage(
					localize('alphacode.chat.changesRejected', 'Rejected {0} changes from proposal {1}.', changeIndexes.length, proposal.id)
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
				results.push(localize('alphacode.chat.proposalSuccess', '✓ {0}', proposal.path));
			} catch (error) {
				results.push(localize('alphacode.chat.proposalError', '✗ {0}: {1}', proposal.path, error instanceof Error ? error.message : localize('alphacode.chat.unknownError', 'Unknown error')));
			}
		}

		this.appendSystemMessage(localize('alphacode.chat.acceptedAllProposals', 'Accepted all proposals:\n{0}', results.join('\n')));
	}

	async rejectAllProposals(): Promise<void> {
		const pending = this.getPendingProposals();
		const results: string[] = [];

		for (const proposal of pending) {
			try {
				await this.rejectEditProposal(proposal.id);
				results.push(localize('alphacode.chat.proposalSuccess', '✓ {0}', proposal.path));
			} catch (error) {
				results.push(localize('alphacode.chat.proposalError', '✗ {0}: {1}', proposal.path, error instanceof Error ? error.message : localize('alphacode.chat.unknownError', 'Unknown error')));
			}
		}

		this.appendSystemMessage(localize('alphacode.chat.rejectedAllProposals', 'Rejected all proposals:\n{0}', results.join('\n')));
	}

	getProposalAuditLog(): Array<{
		id: string;
		path: string;
		action: string;
		timestamp: number;
	}> {
		return [...this.auditLog];
	}

	// ============================================================================
	// Persistence
	// ============================================================================

	private loadSessions(): void {
		const stored = this.storageService.get(STORAGE_KEY_SESSIONS, StorageScope.WORKSPACE);
		if (stored) {
			try {
				const sessions: IChatSession[] = JSON.parse(stored);
				sessions.forEach((session) => this.sessions.set(session.id, session));
			} catch (error) {
				console.error("Failed to parse chat sessions", error);
			}
		}

		const currentId = this.storageService.get(STORAGE_KEY_CURRENT_SESSION, StorageScope.WORKSPACE);
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

	private loadDecisionLog(): void {
		const stored = this.storageService.get(STORAGE_KEY_TOOL_DECISIONS, StorageScope.WORKSPACE);
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

		if (this.auditLog.length > MAX_AUDIT_LOG_SIZE) {
			this.auditLog.splice(0, this.auditLog.length - MAX_AUDIT_LOG_SIZE);
		}

		this.persistDecisionLog();
	}

	// ============================================================================
	// Utilities
	// ============================================================================

	private async ensureChatEditingView(): Promise<void> {
		if (!this.currentSessionId) {
			return;
		}

		const session = this.chatEditingService.getEditingSession(this.currentSessionId);
		if (session) {
			await session.applyPendingEdits();
			await session.show();
		}
	}
}
