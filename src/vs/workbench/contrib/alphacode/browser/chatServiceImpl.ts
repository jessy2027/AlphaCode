/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IAlphaCodeAIService } from '../common/aiService.js';
import { IAIMessage } from '../common/aiProvider.js';
import { IAlphaCodeChatService, IChatContext, IChatMessage, IChatSession, IStreamChunk } from '../common/chatService.js';
import { IAlphaCodeSecurityService } from '../common/securityService.js';

const STORAGE_KEY_SESSIONS = 'alphacode.chat.sessions';
const STORAGE_KEY_CURRENT_SESSION = 'alphacode.chat.currentSession';

export class AlphaCodeChatService extends Disposable implements IAlphaCodeChatService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidAddMessage = this._register(new Emitter<IChatMessage>());
	readonly onDidAddMessage: Event<IChatMessage> = this._onDidAddMessage.event;

	private readonly _onDidCreateSession = this._register(new Emitter<IChatSession>());
	readonly onDidCreateSession: Event<IChatSession> = this._onDidCreateSession.event;

	private readonly _onDidStreamChunk = this._register(new Emitter<IStreamChunk>());
	readonly onDidStreamChunk: Event<IStreamChunk> = this._onDidStreamChunk.event;

	private sessions: Map<string, IChatSession> = new Map();
	private currentSessionId: string | undefined;

	constructor(
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IStorageService private readonly storageService: IStorageService,
		@IAlphaCodeSecurityService private readonly securityService: IAlphaCodeSecurityService,
	) {
		super();
		this.loadSessions();
	}

	private loadSessions(): void {
		const stored = this.storageService.get(STORAGE_KEY_SESSIONS, StorageScope.WORKSPACE);
		if (stored) {
			try {
				const sessions: IChatSession[] = JSON.parse(stored);
				sessions.forEach(session => this.sessions.set(session.id, session));
			} catch (error) {
				console.error('Failed to parse chat sessions', error);
			}
		}

		const currentId = this.storageService.get(STORAGE_KEY_CURRENT_SESSION, StorageScope.WORKSPACE);
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
		this.storageService.store(STORAGE_KEY_SESSIONS, JSON.stringify(sessionsArray), StorageScope.WORKSPACE, StorageTarget.MACHINE);

		if (this.currentSessionId) {
			this.storageService.store(STORAGE_KEY_CURRENT_SESSION, this.currentSessionId, StorageScope.WORKSPACE, StorageTarget.MACHINE);
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
			updated: Date.now()
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
			throw new Error('No active chat session');
		}

		// Add user message
		const userMessage: IChatMessage = {
			id: generateUuid(),
			role: 'user',
			content,
			timestamp: Date.now()
		};

		session.messages.push(userMessage);
		session.updated = Date.now();
		this._onDidAddMessage.fire(userMessage);
		this.saveSessions();

		// Build context-aware messages
		const aiMessages: IAIMessage[] = this.buildAIMessages(session, context);

		try {
			// Create a message ID for streaming
			const messageId = generateUuid();
			let fullContent = '';

			// Send to AI with streaming
			await this.aiService.sendMessageStream(aiMessages, (chunk) => {
				if (!chunk.done) {
					fullContent += chunk.content;
					this._onDidStreamChunk.fire({ content: chunk.content, done: false, messageId });
				} else {
					this._onDidStreamChunk.fire({ content: '', done: true, messageId });
				}
			});

			// Add assistant response
			const assistantMessage: IChatMessage = {
				id: messageId,
				role: 'assistant',
				content: fullContent,
				timestamp: Date.now()
			};

			session.messages.push(assistantMessage);
			session.updated = Date.now();
			this._onDidAddMessage.fire(assistantMessage);
			this.saveSessions();
		} catch (error) {
			// Add error message
			const errorMessage: IChatMessage = {
				id: generateUuid(),
				role: 'assistant',
				content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
				timestamp: Date.now()
			};

			session.messages.push(errorMessage);
			session.updated = Date.now();
			this._onDidAddMessage.fire(errorMessage);
			this.saveSessions();
		}
	}

	private buildAIMessages(session: IChatSession, context?: IChatContext): IAIMessage[] {
		const messages: IAIMessage[] = [];

		// Add system message with context
		let systemContent = 'You are AlphaCode AI, an intelligent coding assistant integrated into AlphaCodeIDE. Help users with code generation, refactoring, debugging, and documentation.';

		if (context) {
			systemContent += '\n\nContext:';
			if (context.activeFile) {
				systemContent += `\nActive file: ${context.activeFile}`;
			}
			if (context.selectedCode) {
				// Mask secrets in selected code before sending to AI
				const maskedCode = this.securityService.maskSecrets(context.selectedCode);
				systemContent += `\nSelected code:\n${maskedCode}`;
			}
			if (context.openFiles && context.openFiles.length > 0) {
				systemContent += `\nOpen files: ${context.openFiles.join(', ')}`;
			}
		}

		messages.push({
			role: 'system',
			content: systemContent
		});

		// Add conversation history (limit to last 10 messages to avoid token limits)
		const recentMessages = session.messages.slice(-10);
		for (const msg of recentMessages) {
			// Mask secrets in user messages
			const content = msg.role === 'user' ? this.securityService.maskSecrets(msg.content) : msg.content;
			messages.push({
				role: msg.role === 'user' ? 'user' : 'assistant',
				content
			});
		}

		return messages;
	}

	getSessions(): IChatSession[] {
		return Array.from(this.sessions.values()).sort((a, b) => b.updated - a.updated);
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
			throw new Error('Session not found');
		}
		return JSON.stringify(session, null, 2);
	}
}
