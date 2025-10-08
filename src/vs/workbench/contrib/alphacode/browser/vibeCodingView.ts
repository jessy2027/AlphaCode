/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import "./media/vibeCodingView.css";
import "./media/chatView.css";
import { renderChatHeader } from "./components/chatHeader.js";
import { renderChatInputArea } from "./components/chatInputArea.js";
import { renderChatMessageList } from "./components/chatMessageList.js";

import {
	$,
	addDisposableListener,
	append,
	clearNode,
} from "../../../../base/browser/dom.js";
import { IDisposable } from "../../../../base/common/lifecycle.js";
import { localize } from "../../../../nls.js";
import { ICommandService } from "../../../../platform/commands/common/commands.js";
import { MarkdownRenderer } from "./markdownRenderer.js";
import { IConfigurationService } from "../../../../platform/configuration/common/configuration.js";
import { IContextKeyService } from "../../../../platform/contextkey/common/contextkey.js";
import { IContextMenuService } from "../../../../platform/contextview/browser/contextView.js";
import { IHoverService } from "../../../../platform/hover/browser/hover.js";
import { IInstantiationService } from "../../../../platform/instantiation/common/instantiation.js";
import { IKeybindingService } from "../../../../platform/keybinding/common/keybinding.js";
import { IOpenerService } from "../../../../platform/opener/common/opener.js";
import { IThemeService } from "../../../../platform/theme/common/themeService.js";
import {
	IViewDescriptorService,
	ViewContainerLocation,
} from "../../../common/views.js";
import {
	IViewPaneOptions,
	ViewPane,
} from "../../../browser/parts/views/viewPane.js";
import {
	SIDE_BAR_BACKGROUND,
	SIDE_BAR_FOREGROUND,
} from "../../../common/theme.js";
import { IAlphaCodeChatService } from "../common/chatService.js";
import type { IChatMessage, IChatSession } from "../common/chatService.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import { IEditorService } from "../../../services/editor/common/editorService.js";
import { ProposalsView } from "./proposalsView.js";

const MAX_CONTENT_LENGTH = 100000;
const SCROLL_THRESHOLD = 64;

export class VibeCodingView extends ViewPane {
	private containerElement: HTMLElement | undefined;
	private chatContainer: HTMLElement | undefined;
	private messagesContainer: HTMLElement | undefined;
	private inputTextArea: HTMLTextAreaElement | undefined;
	private sendStopButton: HTMLButtonElement | undefined;
	private welcomeContainer: HTMLElement | undefined;
	
	private currentStreamingMessage: HTMLElement | undefined;
	private currentStreamingMessageElement: HTMLElement | undefined;
	private currentStreamingBuffer = "";
	private currentStreamingMessageId: string | undefined;
	private lastRenderedStreamingContent = "";
	private streamingRenderHandle: number | undefined;
	private isCreatingStreamingMessage = false;
	
	private isConfigured = false;
	private isStreaming = false;
	private autoScrollPinned = true;
	private lastScrollTop = 0;
	
	private readonly markdownRenderer: MarkdownRenderer;
	private readonly proposalsView: ProposalsView;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@ICommandService private readonly commandService: ICommandService,
		@IAlphaCodeChatService private readonly chatService: IAlphaCodeChatService,
		@IAlphaCodeAIService private readonly aiService: IAlphaCodeAIService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(
			options,
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService,
		);
		
		this.markdownRenderer = new MarkdownRenderer();
		this.isConfigured = !!this.aiService.getProviderConfig();
		this.proposalsView = this.instantiationService.createInstance(ProposalsView);
		
		this._register(this.proposalsView);
		this._register(
			this.chatService.onDidStreamChunk((chunk) => this.onStreamChunk(chunk))
		);
		this._register(
			this.chatService.onDidAddMessage(() => {
				if (!this.isStreaming) {
					this.renderMessages();
				}
			})
		);
		this._register(
			this.aiService.onDidChangeConfiguration(() => {
				this.handleConfigurationChange();
			})
		);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.containerElement = container;
		container.classList.add("alphacode-vibe-root");

		this.isConfigured ? this.renderChat(container) : this.renderWelcome(container);

		this.updateBackground(container);
		this._register(
			this.themeService.onDidColorThemeChange(() => {
				if (this.containerElement) {
					this.updateBackground(this.containerElement);
				}
			})
		);

		this.layoutWelcome();
	}

	private handleConfigurationChange(): void {
		const wasConfigured = this.isConfigured;
		this.isConfigured = !!this.aiService.getProviderConfig();
		
		if (!this.containerElement) return;

		if (!wasConfigured && this.isConfigured) {
			clearNode(this.containerElement);
			this.renderChat(this.containerElement);
		} else if (wasConfigured && !this.isConfigured) {
			clearNode(this.containerElement);
			this.renderWelcome(this.containerElement);
		}
	}

	private renderWelcome(container: HTMLElement): void {
		this.welcomeContainer = append(container, $(".alphacode-vibe-welcome"));

		append(
			this.welcomeContainer,
			$("h2", undefined, localize("alphacode.vibe.welcome.title", "Welcome to Vibe Coding"))
		);

		append(
			this.welcomeContainer,
			$("p", undefined, localize(
				"alphacode.vibe.welcome.description",
				"Connect your favorite AI providers and co-create code directly inside AlphaCodeIDE. Configure your API keys to begin."
			))
		);

		const actionsRow = append(this.welcomeContainer, $(".alphacode-vibe-actions"));
		const configureButton = append(
			actionsRow,
			$("button.monaco-text-button", undefined, localize("alphacode.vibe.configure", "Open AI Settings"))
		) as HTMLButtonElement;
		configureButton.type = "button";

		this._register(
			addDisposableListener(configureButton, "click", async () => {
				await this.commandService.executeCommand(
					"workbench.action.openSettings",
					"@alphacode ai"
				);
			})
		);

		append(
			this.welcomeContainer,
			$("p", undefined, localize("alphacode.vibe.welcome.instructions", "Next steps:"))
		);
		
		const checklist = append(this.welcomeContainer, $("ul"));
		const steps = [
			localize("alphacode.vibe.welcome.step.context", "Enable workspace indexing for deeper context awareness."),
			localize("alphacode.vibe.welcome.step.agents", "Choose agents for generation, refactors, debugging, and documentation."),
			localize("alphacode.vibe.welcome.step.live", "Invite collaborators to start live pair programming sessions.")
		];
		
		steps.forEach(step => append(checklist, $("li", undefined, step)));
	}

	private renderChat(container: HTMLElement): void {
		this.chatContainer = append(container, $(".alphacode-chat-container"));

		renderChatHeader({
			parent: this.chatContainer,
			register: (disposable) => this._register(disposable),
			onClear: async () => {
				await this.chatService.clearCurrentSession();
				this.renderMessages();
			},
		});

		this.messagesContainer = renderChatMessageList({
			parent: this.chatContainer,
			register: (disposable) => this._register(disposable),
			onScroll: (scrollTop) => this.handleScroll(scrollTop),
		});
		this.renderMessages();

		const proposalsContainer = append(this.chatContainer, $(".alphacode-proposals-container"));
		this.proposalsView.renderIn(proposalsContainer);

		const providerConfig = this.aiService.getProviderConfig();
		const modelName = providerConfig?.model || "AlphaCode AI";
		const inputArea = renderChatInputArea({
			parent: this.chatContainer,
			register: <T extends IDisposable>(disposable: T) => this._register(disposable) as T,
			onToggleSend: () => this.isStreaming ? this.stopStreaming() : this.sendMessage(),
			onEnterSend: () => this.sendMessage(),
			providerLabel: modelName,
		});
		
		this.inputTextArea = inputArea.input;
		this.sendStopButton = inputArea.sendStopButton;
		this.updateSendStopButton();
	}

	private scrollDebounceTimeout: number | undefined;

	private handleScroll(scrollTop: number): void {
		if (!this.messagesContainer) return;

		// Optimisation: debounce pour éviter les calculs trop fréquents
		if (this.scrollDebounceTimeout !== undefined) {
			clearTimeout(this.scrollDebounceTimeout);
		}

		this.scrollDebounceTimeout = setTimeout(() => {
			if (scrollTop < this.lastScrollTop - 2) {
				this.autoScrollPinned = false;
			} else if (this.isNearBottom()) {
				this.autoScrollPinned = true;
			}
			this.lastScrollTop = scrollTop;
			this.scrollDebounceTimeout = undefined;
		}, 50) as unknown as number;
	}

	private renderMessages(): void {
		if (!this.messagesContainer) return;

		const preserveScroll = !this.autoScrollPinned;
		const distanceFromBottom = preserveScroll ? this.getDistanceFromBottom() : 0;

		// Clear ALL messages from DOM
		clearNode(this.messagesContainer);

		// Clear streaming message references (they're no longer in DOM)
		this.currentStreamingMessage = undefined;
		this.currentStreamingMessageElement = undefined;

		const session = this.ensureSession();

		if (session.messages.length === 0) {
			this.renderEmptySessionState();

			// If streaming is active but no messages yet, create streaming message
			if (this.isStreaming) {
				this.ensureStreamingMessage(this.currentStreamingMessageId);
			}

			this.scrollIfNeeded(false, preserveScroll, distanceFromBottom);
			return;
		}

		// Render all messages from session
		const visibleMessages = this.getVisibleMessages(session);
		this.renderMessageSequence(visibleMessages);

		// If streaming is STILL active (shouldn't happen normally since renderMessages
		// is protected by isStreaming check, but handle it for safety)
		if (this.isStreaming && this.currentStreamingBuffer.trim().length > 0) {
			this.ensureStreamingMessage(this.currentStreamingMessageId);
		}

		this.scrollIfNeeded(false, preserveScroll, distanceFromBottom);
	}

	private ensureSession(): IChatSession {
		return this.chatService.getCurrentSession() || this.chatService.createSession();
	}

	private renderEmptySessionState(): void {
		if (!this.messagesContainer) return;

		const empty = append(this.messagesContainer, $(".alphacode-chat-empty"));
		append(empty, $(".alphacode-chat-empty-icon", undefined, "💬"));
		append(empty, $(".alphacode-chat-empty-title", undefined, 
			localize("alphacode.chat.empty.title", "Start a Conversation")));
		append(empty, $(".alphacode-chat-empty-description", undefined,
			localize("alphacode.chat.empty.description", 
				"Ask questions, generate code, refactor, debug, or get documentation help.")));
	}

	private getVisibleMessages(session: IChatSession): IChatMessage[] {
		return session.messages
			.map((message, index) => ({ message, index }))
			.sort((a, b) => {
				const timeDiff = (a.message.timestamp ?? 0) - (b.message.timestamp ?? 0);
				return timeDiff !== 0 ? timeDiff : a.index - b.index;
			})
			.map(entry => entry.message)
			.filter(message => !message.hidden);
	}

	private renderMessageSequence(messages: IChatMessage[]): void {
		for (let i = 0; i < messages.length;) {
			const message = messages[i];
			
			if (message.role === "user") {
				this.renderMessage(message);
				i++;
				continue;
			}

			if (message.role === "assistant" || message.role === "tool") {
				const turnMessages: IChatMessage[] = [];
				while (i < messages.length && messages[i].role !== "user") {
					turnMessages.push(messages[i]);
					i++;
				}
				this.renderAssistantTurn(turnMessages);
				continue;
			}

			i++;
		}
	}

	private isNearBottom(): boolean {
		if (!this.messagesContainer) return true;
		
		const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
		return scrollHeight - (scrollTop + clientHeight) <= SCROLL_THRESHOLD;
	}

	private scrollIfNeeded(
		force = false,
		skipAuto = false,
		distanceFromBottom = 0
	): void {
		if (!this.messagesContainer) return;

		const shouldScroll = force || (!skipAuto && (this.autoScrollPinned || this.isNearBottom()));
		
		if (shouldScroll) {
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
			this.autoScrollPinned = true;
		} else if (skipAuto) {
			this.messagesContainer.scrollTop = Math.max(
				0,
				this.messagesContainer.scrollHeight - this.messagesContainer.clientHeight - distanceFromBottom
			);
		}
	}

	private getDistanceFromBottom(): number {
		if (!this.messagesContainer) return 0;
		const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
		return scrollHeight - (scrollTop + clientHeight);
	}

	private renderAssistantTurn(items: IChatMessage[]): void {
		if (!this.messagesContainer) return;

		const messageElement = append(this.messagesContainer, $(".alphacode-chat-message.assistant"));
		const header = append(messageElement, $(".alphacode-chat-message-header"));
		append(header, $(".alphacode-chat-message-avatar", undefined, "🤖"));
		append(header, $("span", undefined, localize("alphacode.chat.assistant", "AlphaCode AI")));

		const assistantMessages: IChatMessage[] = [];

		// Trier les items par timestamp pour garantir l'ordre chronologique
		const sortedItems = [...items].sort((a, b) => {
			const timeA = a.timestamp ?? 0;
			const timeB = b.timestamp ?? 0;
			return timeA - timeB;
		});

		// Grouper les messages assistant et leurs outils associés
		const toolsByMessage = new Map<string, IChatMessage[]>();
		for (const item of sortedItems) {
			if (item.role === "tool") {
				// Trouver le message assistant correspondant (le dernier avant cet outil)
				const lastAssistant = assistantMessages[assistantMessages.length - 1];
				if (lastAssistant) {
					if (!toolsByMessage.has(lastAssistant.id)) {
						toolsByMessage.set(lastAssistant.id, []);
					}
					toolsByMessage.get(lastAssistant.id)!.push(item);
				}
			} else if (item.role === "assistant") {
				assistantMessages.push(item);
			}
		}

		// Rendre chaque message assistant avec ses outils inline
		for (const assistantMsg of assistantMessages) {
			const tools = toolsByMessage.get(assistantMsg.id) || [];
			this.renderAssistantContentWithInlineTools(messageElement, assistantMsg, tools);
		}

		if (assistantMessages.length > 0) {
			this.renderMessageActions(messageElement, assistantMessages[assistantMessages.length - 1]);
		}

		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderAssistantContentWithInlineTools(
		messageElement: HTMLElement,
		message: IChatMessage,
		tools: IChatMessage[]
	): void {

		// Créer une map des outils par leur ID pour un accès rapide
		const toolsMap = new Map<string, IChatMessage>();
		for (const tool of tools) {
			if (tool.toolCallId) {
				toolsMap.set(tool.toolCallId, tool);
			}
		}

		// Chercher les blocs ```tool...``` dans le contenu
		const toolBlockRegex = /```tool\s*\n([\s\S]*?)\n```/g;
		const content = message.content;
		let lastIndex = 0;
		const segments: Array<{ type: 'text' | 'tool'; content: string; toolData?: any }> = [];
		const foundToolIds = new Set<string>();

		let match;
		while ((match = toolBlockRegex.exec(content)) !== null) {
			// Ajouter le texte avant le bloc tool
			if (match.index > lastIndex) {
				segments.push({
					type: 'text',
					content: content.substring(lastIndex, match.index)
				});
			}

			// Parser le JSON de l'outil
			try {
				const toolJson = JSON.parse(match[1]);
				segments.push({
					type: 'tool',
					content: match[0],
					toolData: toolJson
				});
				foundToolIds.add(toolJson.id);
			} catch (e) {
				// Si le parsing échoue, traiter comme du texte
				segments.push({
					type: 'text',
					content: match[0]
				});
			}

			lastIndex = match.index + match[0].length;
		}

		// Ajouter le texte restant
		if (lastIndex < content.length) {
			segments.push({
				type: 'text',
				content: content.substring(lastIndex)
			});
		}

		// Si aucun bloc tool n'a été trouvé mais qu'il y a des outils, les ajouter à la fin
		if (segments.filter(s => s.type === 'tool').length === 0 && tools.length > 0) {

			// Fallback: afficher le texte puis tous les outils
			if (content.trim()) {
				const textContent = append(messageElement, $(".alphacode-chat-message-content"));
				this.renderAssistantContent(textContent, message);
			}

			for (const tool of tools) {
				const toolContent = append(messageElement, $(".alphacode-chat-message-content.tool-content"));
				this.renderToolMessage(toolContent, tool);
			}
			return;
		}

		// Rendre tous les segments dans l'ordre
		let toolIndex = 0;
		for (const segment of segments) {
			if (segment.type === 'text' && segment.content.trim()) {
				const textContent = append(messageElement, $(".alphacode-chat-message-content"));
				this.renderAssistantContent(textContent, { ...message, content: segment.content });
			} else if (segment.type === 'tool') {
				// Chercher le message tool correspondant par ID ou par index
				let toolMsg = segment.toolData ? toolsMap.get(segment.toolData.id) : undefined;

				// Si pas trouvé par ID, utiliser l'index dans l'ordre
				if (!toolMsg && toolIndex < tools.length) {
					toolMsg = tools[toolIndex];
				}

				if (toolMsg) {
					const toolContent = append(messageElement, $(".alphacode-chat-message-content.tool-content"));
					this.renderToolMessage(toolContent, toolMsg);
					toolIndex++;
				} else {
					// Debug: afficher un placeholder si l'outil n'est pas trouvé
					const toolContent = append(messageElement, $(".alphacode-chat-message-content.tool-content"));
					const placeholder = append(toolContent, $("div.alphacode-tool-simple"));
					placeholder.textContent = `🔧 Tool execution (${segment.toolData?.name || 'unknown'})`;
				}
			}
		}
	}

	private renderAssistantContent(container: HTMLElement, message: IChatMessage): void {
		const thoughtMatch = message.content.match(/^(Thought for \d+s|Analyzing|Planning)/im);

		if (thoughtMatch) {
			const lines = message.content.split("\n");
			let thoughtContent = "";
			let remainingContent = "";
			let inThought = true;

			for (const line of lines) {
				if (inThought && line.trim() === "") {
					inThought = false;
					continue;
				}
				if (inThought) {
					thoughtContent += line + "\n";
				} else {
					remainingContent += line + "\n";
				}
			}

			if (thoughtContent.trim()) {
				const thoughtSection = append(container, $(".alphacode-thought-section"));
				append(thoughtSection, $("div.alphacode-thought-label", undefined, "Thought"));
				append(thoughtSection, $("div.alphacode-thought-content", undefined, thoughtContent.trim()));
			}

			if (remainingContent.trim()) {
				const textDiv = append(container, $("div"));
				this.markdownRenderer.render(remainingContent.trim(), textDiv);
			}
		} else {
			this.markdownRenderer.render(message.content, container);
		}
	}

	private renderMessage(message: IChatMessage): void {
		if (!this.messagesContainer) return;

		const messageElement = append(this.messagesContainer, $(`.alphacode-chat-message.${message.role}`));

		// Optimisation: marquer l'élément comme en cours d'animation
		messageElement.classList.add('animating');

		const header = append(messageElement, $(".alphacode-chat-message-header"));

		const avatars: Record<string, string> = {
			user: "👤",
			assistant: "🤖",
			tool: "🛠️",
			system: "💬"
		};
		const labels: Record<string, string> = {
			user: localize("alphacode.chat.you", "You"),
			assistant: localize("alphacode.chat.assistant", "AlphaCode AI"),
			tool: localize("alphacode.chat.tool", "Tool"),
			system: ""
		};

		const avatar = avatars[message.role] || "💬";
		const label = labels[message.role] || "";

		append(header, $(".alphacode-chat-message-avatar", undefined, avatar));
		append(header, $("span", undefined, label));

		const content = append(messageElement, $(".alphacode-chat-message-content"));
		content.textContent = message.content;

		// Optimisation: retirer la classe animating après l'animation
		setTimeout(() => {
			messageElement.classList.remove('animating');
		}, 300);

		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderToolMessage(contentElement: HTMLElement, message: IChatMessage): void {
		const metadata = message.metadata ?? {};
		const toolName = metadata.name || "Tool";
		const status = metadata.status || "success";

		let parameters: any = {};
		if (metadata.parameters) {
			try {
				parameters = typeof metadata.parameters === 'string'
					? JSON.parse(metadata.parameters)
					: metadata.parameters;
			} catch {
				parameters = {};
			}
		}

		// Ajouter une classe d'erreur si nécessaire
		if (status === "error") {
			contentElement.classList.add("error");
		}

		// Rendre directement dans le conteneur sans wrapper supplémentaire
		if (this.isReadTool(toolName)) {
			this.renderReadToolMessage(contentElement, message, toolName, parameters);
		} else if (this.isWriteTool(toolName)) {
			this.renderWriteToolMessage(contentElement, parameters, metadata);
		} else {
			this.renderGenericToolMessage(contentElement, toolName, metadata);
		}
	}

	private isReadTool(toolName: string): boolean {
		const readTools = ["read", "list", "grep", "find"];
		return readTools.some(tool => toolName.toLowerCase().includes(tool));
	}

	private isWriteTool(toolName: string): boolean {
		return toolName.toLowerCase().includes("edit") || toolName.toLowerCase().includes("write");
	}

	private renderReadToolMessage(
		contentElement: HTMLElement,
		message: IChatMessage,
		toolName: string,
		parameters: any
	): void {
		const filePath = parameters.file_path || parameters.path || parameters.DirectoryPath ||
			parameters.SearchPath || parameters.SearchDirectory;

		let simplifiedText = this.getReadToolLabel(filePath, toolName, parameters);

		try {
			const toolContainer = append(contentElement, $("div.alphacode-tool-expandable"));
			const toolHeader = append(toolContainer, $("div.alphacode-tool-header.clickable"));
			const expandIcon = append(toolHeader, $("span.alphacode-tool-expand-icon"));
			expandIcon.textContent = "▶";

			const toolTitle = append(toolHeader, $("span.alphacode-tool-title"));
			toolTitle.textContent = simplifiedText;

			// Add status badge if there's an error
			if (message.metadata?.status === 'error') {
				const statusBadge = append(toolHeader, $("span.alphacode-tool-status-badge.error"));
				statusBadge.textContent = "Error";
			} else {
				const statusBadge = append(toolHeader, $("span.alphacode-tool-status-badge.success"));
				statusBadge.textContent = "Done";
			}

			const toolContent = append(toolContainer, $("div.alphacode-tool-content.collapsed"));
			toolContent.style.display = "none";

			if (message.content?.trim()) {
				const contentPreview = append(toolContent, $("pre.alphacode-tool-result"));
				const content = message.content.length > MAX_CONTENT_LENGTH
					? message.content.substring(0, MAX_CONTENT_LENGTH) + '\n\n... (content truncated, too large to display)'
					: message.content;
				contentPreview.textContent = content;
			} else {
				const emptyMsg = append(toolContent, $("div.alphacode-tool-empty"));
				emptyMsg.textContent = "No output returned";
			}

			this._register(
				addDisposableListener(toolHeader, "click", () => {
					const isExpanded = !toolContent.classList.contains("collapsed");
					toolContent.classList.toggle("collapsed");
					toolContent.style.display = isExpanded ? "none" : "block";
					expandIcon.textContent = isExpanded ? "▶" : "▼";
					toolHeader.classList.toggle("expanded", !isExpanded);
				})
			);
		} catch (error) {
			const toolText = append(contentElement, $("div.alphacode-tool-simple"));
			toolText.textContent = simplifiedText;
			console.error('Error rendering tool result:', error);
		}
	}

	private getReadToolLabel(filePath: string | undefined, toolName: string, parameters: any): string {
		if (!filePath) return `📄 ${toolName}`;

		const filename = filePath.split(/[/\\]/).pop();

		if (parameters.offset !== undefined && parameters.limit !== undefined) {
			const start = parameters.offset;
			const end = start + parameters.limit - 1;
			return `📄 Read ${filename} • Lines ${start}-${end}`;
		}

		if (toolName.toLowerCase().includes("list")) {
			return `📂 List files in ${filename}`;
		}

		if (toolName.toLowerCase().includes("grep")) {
			const query = parameters.Query || parameters.query || '';
			return `🔍 Search "${query}" in ${filename}`;
		}

		if (toolName.toLowerCase().includes("find")) {
			const pattern = parameters.Pattern || parameters.pattern || '';
			return `🔎 Find "${pattern}" in ${filename}`;
		}

		return `📄 Read ${filename}`;
	}

	private renderWriteToolMessage(
		contentElement: HTMLElement,
		parameters: any,
		metadata: any
	): void {
		const filePath = parameters.file_path || parameters.path || metadata.path;

		if (filePath) {
			const filename = filePath.split(/[/\\]/).pop() || "file";
			const ext = filename.split(".").pop()?.toUpperCase() || "FILE";

			const summary = metadata.summary || "";
			const linesMatch = summary.match(/(\d+)\s+lines?\s+changed/i);
			const linesChanged = linesMatch ? parseInt(linesMatch[1]) : 0;

			const toolCard = append(contentElement, $("div.alphacode-tool-file-card"));

			const iconSpan = append(toolCard, $("span.alphacode-tool-file-icon"));
			// Use different icons based on operation type
			if (parameters.file_path && metadata.kind === 'write') {
				iconSpan.textContent = "📝"; // New file
			} else {
				iconSpan.textContent = "✏️"; // Edit file
			}

			const badge = append(toolCard, $("span.alphacode-tool-file-badge"));
			badge.textContent = ext;

			const nameSpan = append(toolCard, $("span.alphacode-tool-file-name"));
			nameSpan.textContent = filename;

			if (linesChanged > 0) {
				const linesSpan = append(toolCard, $("span.alphacode-tool-file-lines"));
				linesSpan.textContent = `±${linesChanged} lines`;
			}

			// Ajouter un bouton pour voir les changements si une proposition existe
			if (metadata.proposalId) {
				const viewButton = append(toolCard, $("button.alphacode-tool-view-changes")) as HTMLButtonElement;
				viewButton.textContent = "View Changes";
				viewButton.type = "button";
				this._register(
					addDisposableListener(viewButton, "click", () => {
						// Ouvrir la vue des propositions ou le diff
						if (metadata.proposalId) {
							this.commandService.executeCommand('alphacode.openProposal', metadata.proposalId);
						}
					})
				);
			}
		} else {
			const toolText = append(contentElement, $("div.alphacode-tool-simple"));
			toolText.textContent = "✏️ Edit file";
		}
	}

	private renderGenericToolMessage(
		contentElement: HTMLElement,
		toolName: string,
		metadata: any
	): void {
		const status = metadata.status || 'success';
		const toolCard = append(contentElement, $(
			`div.alphacode-tool-simple${status === 'error' ? '.error' : status === 'success' ? '.success' : ''}`
		));

		// Ajouter une icône appropriée basée sur le type d'outil
		const icon = this.getToolIcon(toolName);
		const iconSpan = append(toolCard, $("span.alphacode-tool-icon"));
		iconSpan.textContent = icon;

		const displayText = metadata.summary || metadata.description || toolName;
		const textSpan = append(toolCard, $("span"));
		textSpan.textContent = displayText;

		// Ajouter un badge de statut
		if (status === 'error') {
			const statusBadge = append(toolCard, $("span.alphacode-tool-status-badge.error"));
			statusBadge.textContent = "Failed";
		} else if (status === 'success') {
			const statusBadge = append(toolCard, $("span.alphacode-tool-status-badge.success"));
			statusBadge.textContent = "Done";
		}

		// Ajouter les détails d'erreur si nécessaire
		if (metadata.error) {
			const errorDetails = append(contentElement, $("div.alphacode-tool-error-details"));
			errorDetails.textContent = metadata.error;
		}
	}

	private getToolIcon(toolName: string): string {
		const toolIcons: Record<string, string> = {
			'accept_edit_proposal': '✅',
			'reject_edit_proposal': '❌',
			'list_edit_proposals': '📋',
			'execute': '▶️',
			'bash': '💻',
			'terminal': '⌨️',
			'search': '🔍',
			'web_search': '🌐',
			'analyze': '🔬',
			'test': '🧪',
			'debug': '🐛',
			'build': '🔨',
			'deploy': '🚀',
			'refactor': '♻️',
		};

		const lowerName = toolName.toLowerCase();
		for (const [key, icon] of Object.entries(toolIcons)) {
			if (lowerName.includes(key)) {
				return icon;
			}
		}

		return '🔧'; // Default tool icon
	}

	private renderMessageActions(messageElement: HTMLElement, message: IChatMessage): void {
		const actions = append(messageElement, $(".alphacode-message-actions"));

		const copyButton = append(
			actions,
			$("button.alphacode-message-action", undefined, "📋 Copy")
		) as HTMLButtonElement;
		
		this._register(
			addDisposableListener(copyButton, "click", () => {
				navigator.clipboard.writeText(message.content);
				copyButton.textContent = "✓ Copied!";
				setTimeout(() => { copyButton.textContent = "📋 Copy"; }, 2000);
			})
		);

		const codeBlocks = this.markdownRenderer.extractCodeBlocks(message.content);
		if (codeBlocks.length > 0) {
			const applyButton = append(
				actions,
				$("button.alphacode-message-action.primary", undefined, "✨ Apply Code")
			) as HTMLButtonElement;
			
			this._register(
				addDisposableListener(applyButton, "click", () =>
					this.applyCode(codeBlocks[0].code))
			);
		}

		const regenerateButton = append(
			actions,
			$("button.alphacode-message-action", undefined, "Regenerate")
		) as HTMLButtonElement;
		regenerateButton.type = "button";
		
		this._register(
			addDisposableListener(regenerateButton, "click", () =>
				this.regenerateLastResponse())
		);
	}

	private updateSendStopButton(): void {
		if (!this.sendStopButton) {
			console.warn('[VibeCoding] Send/Stop button not found');
			return;
		}

		if (this.isStreaming) {
			this.sendStopButton.textContent = "⏸";
			this.sendStopButton.title = localize("alphacode.chat.stopGenerating", "Stop generating");
			this.sendStopButton.classList.add("stop-mode");
			console.log('[VibeCoding] Button changed to STOP mode');
		} else {
			this.sendStopButton.textContent = "↑";
			this.sendStopButton.title = localize("alphacode.chat.send", "Send message");
			this.sendStopButton.classList.remove("stop-mode");
			console.log('[VibeCoding] Button changed to SEND mode');
		}
	}

	private stopStreaming(): void {
		this.chatService.abortCurrentStream();

		this.isStreaming = false;
		this.isCreatingStreamingMessage = false;
		this.cancelStreamingRenderLoop();
		this.lastRenderedStreamingContent = "";
		this.currentStreamingBuffer = '';
		this.currentStreamingMessageId = undefined;
		this.updateSendStopButton();

		if (this.currentStreamingMessage) {
			if (!this.currentStreamingBuffer.trim()) {
				clearNode(this.currentStreamingMessage);
				this.currentStreamingMessage.textContent = localize(
					'alphacode.chat.stopped',
					'Response generation stopped.'
				);
			}
			this.currentStreamingMessage = undefined;
			this.currentStreamingMessageElement = undefined;
		}

		this.renderMessages();
	}

	private async applyCode(code: string): Promise<void> {
		const activeEditor = this.editorService.activeTextEditorControl;
		if (!activeEditor) return;

		if ("executeEdits" in activeEditor && typeof activeEditor.executeEdits === "function") {
			const selection = activeEditor.getSelection?.();
			if (selection) {
				activeEditor.executeEdits("alphacode", [{ range: selection, text: code }]);
			}
		}
	}

	private async regenerateLastResponse(): Promise<void> {
		const session = this.chatService.getCurrentSession();
		if (!session || session.messages.length < 2) return;

		const lastUserMessage = session.messages.filter(m => m.role === "user").pop();

		if (lastUserMessage && this.inputTextArea) {
			this.inputTextArea.value = lastUserMessage.content;
			this.sendMessage();
		}
	}

	private onStreamChunk(chunk: { content: string; done: boolean; messageId?: string }): void {
		// Stop render loop when streaming is complete
		if (chunk.done) {
			this.stopStreamingRenderLoop();
			this.isStreaming = false;
			this.isCreatingStreamingMessage = false;
			this.currentStreamingBuffer = "";
			this.currentStreamingMessageId = undefined;
			this.currentStreamingMessageElement = undefined;
			this.updateSendStopButton();
			this.renderMessages();
			return;
		}

		// Ensure we have a streaming message to write to
		this.ensureStreamingMessage(chunk.messageId);
		if (!this.currentStreamingMessage?.isConnected) {
			// If for some reason we can't create/find the message, skip this chunk
			return;
		}

		// Check for message ID mismatch (shouldn't happen, but safety check)
		if (chunk.messageId && this.currentStreamingMessageId &&
			chunk.messageId !== this.currentStreamingMessageId) {
			// Different message, ignore this chunk
			return;
		}

		// Accumulate content
		if (chunk.content) {
			this.currentStreamingBuffer += chunk.content;
			this.scheduleStreamingRender();
		}

		// Clean content for display (remove tool blocks during streaming)
		const cleanContent = this.removeToolBlocksForStreaming(this.currentStreamingBuffer);
		const hasContent = cleanContent.trim().length > 0;

		// Update the streaming message content
		if (hasContent) {
			clearNode(this.currentStreamingMessage);
			this.markdownRenderer.render(cleanContent, this.currentStreamingMessage);
			this.lastRenderedStreamingContent = cleanContent;
			// Remove spinner once we have content
			this.currentStreamingMessage.querySelector(".alphacode-chat-loading-spinner")?.remove();
		} else {
			// No content yet, show spinner
			this.ensureStreamingSpinner();
		}

		this.scrollIfNeeded();
	}

	private ensureStreamingMessage(messageId?: string): void {
		if (!this.messagesContainer) return;

		// Critical: Prevent concurrent message creation
		if (this.isCreatingStreamingMessage) {
			return;
		}

		// If we already have a valid streaming message in the DOM, reuse it
		if (this.currentStreamingMessageElement?.isConnected &&
			this.currentStreamingMessage?.isConnected) {

			// Update message ID if needed
			if (messageId && !this.currentStreamingMessageId) {
				this.currentStreamingMessageId = messageId;
			}

			// Update content if buffer has data
			if (this.currentStreamingBuffer.trim().length > 0) {
				const cleanContent = this.removeToolBlocksForStreaming(this.currentStreamingBuffer);
				if (cleanContent !== this.lastRenderedStreamingContent) {
					clearNode(this.currentStreamingMessage);
					this.markdownRenderer.render(cleanContent, this.currentStreamingMessage);
					this.lastRenderedStreamingContent = cleanContent;
					this.currentStreamingMessage.querySelector(".alphacode-chat-loading-spinner")?.remove();
				}
			} else {
				this.ensureStreamingSpinner();
			}

			this.scrollIfNeeded();
			return;
		}

		// Check for message ID mismatch (new streaming response started)
		if (this.currentStreamingMessage?.isConnected &&
			this.currentStreamingMessageId && messageId &&
			this.currentStreamingMessageId !== messageId) {

			// Different message ID = new response, cleanup old one
			this.currentStreamingMessage = undefined;
			this.currentStreamingMessageElement = undefined;
			this.currentStreamingMessageId = undefined;
		}

		// Double-check: if message element exists in DOM, don't create a new one
		const existingStreamingMessage = this.messagesContainer.querySelector('.alphacode-chat-message.assistant.streaming');
		if (existingStreamingMessage) {
			// Reuse existing message instead of creating new one
			this.currentStreamingMessageElement = existingStreamingMessage as HTMLElement;
			this.currentStreamingMessage = existingStreamingMessage.querySelector('.alphacode-chat-message-content') as HTMLElement;

			if (messageId) {
				this.currentStreamingMessageId = messageId;
			}

			this.scrollIfNeeded();
			return;
		}

		// Create new streaming message ONLY if it truly doesn't exist
		if (!this.currentStreamingMessage || !this.currentStreamingMessage.isConnected) {
			// Set flag to prevent concurrent creation
			this.isCreatingStreamingMessage = true;

			try {
				const messageElement = append(
					this.messagesContainer,
					$(".alphacode-chat-message.assistant.streaming")
				);

				const header = append(messageElement, $(".alphacode-chat-message-header"));
				append(header, $(".alphacode-chat-message-avatar", undefined, "🤖"));
				append(header, $("span", undefined, localize("alphacode.chat.assistant", "AlphaCode AI")));

				this.currentStreamingMessage = append(messageElement, $(".alphacode-chat-message-content"));
				this.currentStreamingMessageElement = messageElement;
				this.currentStreamingMessage.textContent = "";

				if (messageId) {
					this.currentStreamingMessageId = messageId;
				}

				this.ensureStreamingSpinner();
			} finally {
				// Always clear the flag, even if error
				this.isCreatingStreamingMessage = false;
			}
		}

		this.scrollIfNeeded();
	}

	private ensureStreamingSpinner(): void {
		if (!this.currentStreamingMessage) return;
		
		if (!this.currentStreamingMessage.querySelector(".alphacode-chat-loading-spinner")) {
			append(this.currentStreamingMessage, $(".alphacode-chat-loading-spinner"));
		}
	}

	private scheduleStreamingRender(): void {
		if (this.streamingRenderHandle !== undefined) return;

		// Optimisation: utiliser requestAnimationFrame pour 60fps
		this.streamingRenderHandle = requestAnimationFrame(() => {
			this.streamingRenderHandle = undefined;
			this.renderStreamingBuffer();
		});
	}

	private removeToolBlocksForStreaming(content: string): string {
		// Remplacer les blocs tool par un indicateur visuel pendant le streaming
		return content.replace(/```tool\s*\n[\s\S]*?\n```/g, '🔧 _[Tool execution]_');
	}

	private renderStreamingBuffer(): void {
		if (!this.currentStreamingMessage) return;

		// Nettoyer le contenu pour l'affichage
		const cleanContent = this.removeToolBlocksForStreaming(this.currentStreamingBuffer);
		if (cleanContent === this.lastRenderedStreamingContent) return;

		clearNode(this.currentStreamingMessage);
		this.markdownRenderer.render(cleanContent, this.currentStreamingMessage);
		this.lastRenderedStreamingContent = cleanContent;

		this.currentStreamingMessage.querySelector(".alphacode-chat-loading-spinner")?.remove();
	}

	private stopStreamingRenderLoop(): void {
		this.renderStreamingBuffer();
		this.cancelStreamingRenderLoop();
	}

	private cancelStreamingRenderLoop(): void {
		if (this.streamingRenderHandle !== undefined) {
			cancelAnimationFrame(this.streamingRenderHandle);
			this.streamingRenderHandle = undefined;
		}
	}

	private async sendMessage(): Promise<void> {
		if (!this.inputTextArea || this.isStreaming) return;

		const content = this.inputTextArea.value.trim();
		if (!content) return;

		// Clear input immediately
		this.inputTextArea.value = "";

		// Set streaming state BEFORE any async operation
		this.isStreaming = true;
		this.cancelStreamingRenderLoop();
		this.lastRenderedStreamingContent = "";
		this.currentStreamingBuffer = "";
		this.currentStreamingMessageId = undefined;
		this.currentStreamingMessage = undefined;
		this.currentStreamingMessageElement = undefined;
		this.isCreatingStreamingMessage = false;

		// Update button immediately (critical for UI feedback)
		this.updateSendStopButton();

		// Render user message immediately for UX feedback
		// Note: The service will also add it to the session, but we show it now
		if (this.messagesContainer) {
			const userMessageElement = append(this.messagesContainer, $(`.alphacode-chat-message.user`));
			const header = append(userMessageElement, $(".alphacode-chat-message-header"));
			append(header, $(".alphacode-chat-message-avatar", undefined, "👤"));
			append(header, $("span", undefined, localize("alphacode.chat.you", "You")));
			const messageContent = append(userMessageElement, $(".alphacode-chat-message-content"));
			messageContent.textContent = content;
			this.scrollIfNeeded(true);
		}

		// Prepare context before calling service
		const activeEditor = this.editorService.activeTextEditorControl;
		const context = {
			activeFile: this.editorService.activeEditor?.resource?.path,
			selectedCode: activeEditor ? this.getSelectedText(activeEditor) : undefined,
		};

		try {
			// The service will add the user message to the session
			// First chunk will trigger ensureStreamingMessage() which creates the assistant message
			await this.chatService.sendMessage(content, context);
		} catch (error) {
			console.error("Failed to send message", error);

			// Show error in streaming message if it exists
			const errorMessage = this.currentStreamingMessage as HTMLElement | undefined;
			if (errorMessage?.isConnected) {
				errorMessage.textContent = `Error: ${
					error instanceof Error ? error.message : "Unknown error"
				}`;
				this.scrollIfNeeded(true);
			}
		} finally {
			// Clean up streaming state
			this.isStreaming = false;
			this.isCreatingStreamingMessage = false;
			this.currentStreamingMessage = undefined;
			this.currentStreamingMessageElement = undefined;
			this.currentStreamingBuffer = "";
			this.currentStreamingMessageId = undefined;

			// Update button
			this.updateSendStopButton();

			// Refresh all messages from session
			this.renderMessages();
		}
	}

	private getSelectedText(editor: any): string | undefined {
		if (!editor.getSelection) return undefined;

		const selection = editor.getSelection();
		if (!selection || selection.isEmpty()) return undefined;

		const model = editor.getModel();
		return model ? model.getValueInRange(selection) : undefined;
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		this.layoutWelcome();
	}

	private layoutWelcome(): void {
		if (!this.containerElement) return;

		const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
		const isSidebar = viewLocation === ViewContainerLocation.Sidebar ||
			viewLocation === ViewContainerLocation.AuxiliaryBar;
		const isNarrow = isSidebar && this.containerElement.clientWidth < 320;
		this.containerElement.classList.toggle("alphacode-vibe-narrow", isNarrow);
	}

	private updateBackground(container: HTMLElement): void {
		const theme = this.themeService.getColorTheme();
		const background = theme.getColor(SIDE_BAR_BACKGROUND);
		const foreground = theme.getColor(SIDE_BAR_FOREGROUND);
		
		if (background) {
			container.style.setProperty("--alphacode-vibe-background", background.toString());
		}
		if (foreground) {
			container.style.setProperty("--alphacode-vibe-foreground", foreground.toString());
		}
	}
}