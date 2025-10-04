/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import "./media/vibeCodingView.css";
import "./media/chatView.css";

import {
	$,
	addDisposableListener,
	append,
	clearNode,
} from "../../../../base/browser/dom.js";
import { localize } from "../../../../nls.js";
import { generateUuid } from "../../../../base/common/uuid.js";
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
} from '../../../common/theme.js';
import { IAlphaCodeChatService, IChatMessage } from '../common/chatService.js';
import { IAlphaCodeAIService } from '../common/aiService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IAlphaCodeFileAttachmentService } from '../common/fileAttachmentService.js';
import { FileAttachmentWidget } from './fileAttachmentWidget.js';

export class VibeCodingView extends ViewPane {
	private containerElement: HTMLElement | undefined;
	private chatContainer: HTMLElement | undefined;
	private messagesContainer: HTMLElement | undefined;
	private inputTextArea: HTMLTextAreaElement | undefined;
	private isConfigured: boolean = false;
	private currentStreamingMessage: HTMLElement | undefined;
	private currentStreamingBuffer: string = "";
	private currentStreamingMessageId: string | undefined;
	private isStreaming: boolean = false;
	private markdownRenderer: MarkdownRenderer;
	private welcomeContainer: HTMLElement | undefined;
	private fileAttachmentWidget: FileAttachmentWidget | undefined;
	private sendStopButton: HTMLButtonElement | undefined;

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
		@IAlphaCodeFileAttachmentService private readonly fileAttachmentService: IAlphaCodeFileAttachmentService,
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
		this._register(
			this.chatService.onDidStreamChunk((chunk) => this.onStreamChunk(chunk)),
		);
		this._register(
			this.chatService.onDidAddMessage((message) => {
				// Ne pas re-render pendant le streaming pour éviter de perdre le message en cours
				// Les messages seront affichés à la fin du streaming
				if (!this.isStreaming) {
					this.renderMessages();
				}
			}),
		);

		// Listen for AI configuration changes to switch from welcome to chat
		this._register(
			this.aiService.onDidChangeConfiguration(() => {
				const wasConfigured = this.isConfigured;
				this.isConfigured = !!this.aiService.getProviderConfig();
				if (!wasConfigured && this.isConfigured && this.containerElement) {
					// Switch from welcome to chat
					clearNode(this.containerElement);
					this.renderChat(this.containerElement);
				} else if (
					wasConfigured &&
					!this.isConfigured &&
					this.containerElement
				) {
					// Switch from chat to welcome
					clearNode(this.containerElement);
					this.renderWelcome(this.containerElement);
				}
			}),
		);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.containerElement = container;
		container.classList.add("alphacode-vibe-root");

		if (!this.isConfigured) {
			this.renderWelcome(container);
		} else {
			this.renderChat(container);
		}

		this.updateBackground(container);
		this._register(
			this.themeService.onDidColorThemeChange(() => {
				if (this.containerElement) {
					this.updateBackground(this.containerElement);
				}
			}),
		);

		this.layoutWelcome();
	}

	private renderWelcome(container: HTMLElement): void {
		this.welcomeContainer = append(container, $(".alphacode-vibe-welcome"));

		append(
			this.welcomeContainer,
			$(
				"h2",
				undefined,
				localize("alphacode.vibe.welcome.title", "Welcome to Vibe Coding"),
			),
		);

		append(
			this.welcomeContainer,
			$(
				"p",
				undefined,
				localize(
					"alphacode.vibe.welcome.description",
					"Connect your favorite AI providers and co-create code directly inside AlphaCodeIDE. Configure your API keys to begin.",
				),
			),
		);

		const actionsRow = append(
			this.welcomeContainer,
			$(".alphacode-vibe-actions"),
		);
		const configureButton = append(
			actionsRow,
			$(
				"button.monaco-text-button",
				undefined,
				localize("alphacode.vibe.configure", "Open AI Settings"),
			),
		) as HTMLButtonElement;
		configureButton.type = "button";

		this._register(
			addDisposableListener(configureButton, "click", async () => {
				await this.commandService.executeCommand(
					"workbench.action.openSettings",
					"@alphacode ai",
				);
			}),
		);

		append(
			this.welcomeContainer,
			$(
				"p",
				undefined,
				localize("alphacode.vibe.welcome.instructions", "Next steps:"),
			),
		);
		const checklist = append(this.welcomeContainer, $("ul", undefined));
		append(
			checklist,
			$(
				"li",
				undefined,
				localize(
					"alphacode.vibe.welcome.step.context",
					"Enable workspace indexing for deeper context awareness.",
				),
			),
		);
		append(
			checklist,
			$(
				"li",
				undefined,
				localize(
					"alphacode.vibe.welcome.step.agents",
					"Choose agents for generation, refactors, debugging, and documentation.",
				),
			),
		);
		append(
			checklist,
			$(
				"li",
				undefined,
				localize(
					"alphacode.vibe.welcome.step.live",
					"Invite collaborators to start live pair programming sessions.",
				),
			),
		);
	}

	private renderChat(container: HTMLElement): void {
		this.chatContainer = append(container, $(".alphacode-chat-container"));

		// Toolbar
		const toolbar = append(this.chatContainer, $(".alphacode-chat-toolbar"));
		append(
			toolbar,
			$(
				"span",
				undefined,
				localize("alphacode.chat.title", "Vibe Coding Chat"),
			),
		);
		const toolbarActions = append(
			toolbar,
			$(".alphacode-chat-toolbar-actions"),
		);

		const clearButton = append(
			toolbarActions,
			$(
				"button.monaco-text-button.alphacode-chat-toolbar-button",
				undefined,
				localize("alphacode.chat.clear", "Clear"),
			),
		) as HTMLButtonElement;
		this._register(
			addDisposableListener(clearButton, "click", () => {
				this.chatService.clearCurrentSession();
				this.renderMessages();
			}),
		);

		// Messages container
		this.messagesContainer = append(
			this.chatContainer,
			$(".alphacode-chat-messages"),
		);
		this.renderMessages();

		// Input container
		const inputContainer = append(
			this.chatContainer,
			$(".alphacode-chat-input-container"),
		);

		// File attachment widget
		const attachmentContainer = append(
			inputContainer,
			$('.alphacode-file-attachment-area'),
		);
		this.fileAttachmentWidget = this._register(
			new FileAttachmentWidget(
				{
					container: attachmentContainer,
					compact: true,
					showDropZone: false,
				},
				this.fileAttachmentService,
			),
		);

		const inputWrapper = append(
			inputContainer,
			$(".alphacode-chat-input-wrapper"),
		);

		// Attach button
		const attachButton = append(
			inputWrapper,
			$(
				'button.alphacode-attach-button',
				undefined,
			),
		) as HTMLButtonElement;
		const attachIcon = append(attachButton, $('span.alphacode-attach-button-icon'));
		attachIcon.textContent = '📎';
		append(attachButton, $('span', undefined, localize('alphacode.chat.attach', 'Attach')));
		this._register(
			addDisposableListener(attachButton, 'click', () => {
				// Trigger file input
				const fileInput = attachmentContainer.querySelector('input[type="file"]') as HTMLInputElement;
				if (fileInput) {
					fileInput.click();
				}
			}),
		);

		this.inputTextArea = append(
			inputWrapper,
			$("textarea.alphacode-chat-input"),
		) as HTMLTextAreaElement;
		this.inputTextArea.placeholder = localize(
			"alphacode.chat.placeholder",
			"Ask anything (Ctrl+L)",
		);

		// Toolbar at bottom of input
		const inputToolbar = append(
			inputWrapper,
			$(".alphacode-chat-input-toolbar"),
		);

		// Center section - Model name
		const toolbarCenter = append(
			inputToolbar,
			$(".alphacode-chat-toolbar-center"),
		);
		const providerConfig = this.aiService.getProviderConfig();
		const modelName = providerConfig?.model || "AlphaCode AI";
		append(toolbarCenter, $("span", undefined, modelName));

		// Right section
		const toolbarRight = append(
			inputToolbar,
			$(".alphacode-chat-toolbar-right"),
		);

		// Microphone button
		// allow-any-unicode-next-line
		const micButton = append(
			toolbarRight,
			$(
				"button.alphacode-chat-icon-button",
				{ title: localize("alphacode.chat.voice", "Voice input") },
				"🎤",
			),
		) as HTMLButtonElement;
		micButton.disabled = true;
		this._register(
			addDisposableListener(micButton, "click", () => {
				// TODO: Implement voice input
				console.log("Voice input clicked");
			}),
		);

		// Send/Stop button
		this.sendStopButton = append(
			toolbarRight,
			$(
				"button.alphacode-chat-send-button",
				{ title: localize("alphacode.chat.send", "Send message") },
				"↑",
			),
		) as HTMLButtonElement;

		this._register(
			addDisposableListener(this.sendStopButton, "click", () => {
				if (this.isStreaming) {
					this.stopStreaming();
				} else {
					this.sendMessage();
				}
			}),
		);

		this._register(
			addDisposableListener(
				this.inputTextArea,
				"keydown",
				(e: KeyboardEvent) => {
					if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						this.sendMessage();
					}
				},
			),
		);
	}

	private renderMessages(): void {
		if (!this.messagesContainer) {
			return;
		}

		clearNode(this.messagesContainer);
		if (this.currentStreamingMessage) {
			this.currentStreamingMessage = undefined;
		}

		let session = this.chatService.getCurrentSession();

		// Create a session if none exists
		if (!session) {
			session = this.chatService.createSession();
		}

		if (session.messages.length === 0) {
			const empty = append(this.messagesContainer, $(".alphacode-chat-empty"));
			// allow-any-unicode-next-line
			append(empty, $(".alphacode-chat-empty-icon", undefined, "💬"));
			append(
				empty,
				$(
					".alphacode-chat-empty-title",
					undefined,
					localize("alphacode.chat.empty.title", "Start a Conversation"),
				),
			);
			append(
				empty,
				$(
					".alphacode-chat-empty-description",
					undefined,
					localize(
						"alphacode.chat.empty.description",
						"Ask questions, generate code, refactor, debug, or get documentation help.",
					),
				),
			);
			return;
		}

		// Group messages: user messages and assistant messages with their tools
		const groupedMessages: Array<{
			type: "user" | "assistant";
			userMsg?: IChatMessage;
			assistantMsg?: IChatMessage;
			toolMsgs: IChatMessage[];
		}> = [];
		let currentGroup: {
			type: "user" | "assistant";
			userMsg?: IChatMessage;
			assistantMsg?: IChatMessage;
			toolMsgs: IChatMessage[];
		} | null = null;

		for (const message of session.messages) {
			if (message.role === "user") {
				if (currentGroup) {
					groupedMessages.push(currentGroup);
				}
				currentGroup = { type: "user", userMsg: message, toolMsgs: [] };
			} else if (message.role === "assistant") {
				if (currentGroup && currentGroup.type === "user") {
					groupedMessages.push(currentGroup);
				}
				currentGroup = {
					type: "assistant",
					assistantMsg: message,
					toolMsgs: [],
				};
			} else if (message.role === "tool") {
				if (currentGroup && currentGroup.type === "assistant") {
					currentGroup.toolMsgs.push(message);
				} else {
					// Tool message without assistant message, create a group
					if (currentGroup) {
						groupedMessages.push(currentGroup);
					}
					currentGroup = { type: "assistant", toolMsgs: [message] };
				}
			}
		}
		if (currentGroup) {
			groupedMessages.push(currentGroup);
		}

		for (const group of groupedMessages) {
			if (group.type === "user" && group.userMsg) {
				this.renderMessage(group.userMsg);
			} else if (group.type === "assistant") {
				this.renderAssistantMessageGroup(group.assistantMsg, group.toolMsgs);
			}
		}

		if (this.isStreaming || this.currentStreamingBuffer.trim().length > 0) {
			this.ensureStreamingMessage(this.currentStreamingMessageId);
		}

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderAssistantMessageGroup(
		assistantMsg: IChatMessage | undefined,
		toolMsgs: IChatMessage[],
	): void {
		if (!this.messagesContainer) {
			return;
		}

		const messageElement = append(
			this.messagesContainer,
			$(".alphacode-chat-message.assistant"),
		);

		const header = append(messageElement, $(".alphacode-chat-message-header"));
		// allow-any-unicode-next-line
		append(header, $(".alphacode-chat-message-avatar", undefined, "🤖"));
		append(
			header,
			$(
				"span",
				undefined,
				localize("alphacode.chat.assistant", "AlphaCode AI"),
			),
		);

		const content = append(
			messageElement,
			$(".alphacode-chat-message-content"),
		);

		// Render assistant message if present
		if (assistantMsg) {
			// Add "Thought" section if present
			const thoughtMatch = assistantMsg.content.match(
				/^(Thought for \d+s|Analyzing|Planning)/im,
			);
			if (thoughtMatch) {
				const lines = assistantMsg.content.split("\n");
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
					const thoughtSection = append(
						content,
						$(".alphacode-thought-section"),
					);
					append(
						thoughtSection,
						$("div.alphacode-thought-label", undefined, "Thought"),
					);
					append(
						thoughtSection,
						$(
							"div.alphacode-thought-content",
							undefined,
							thoughtContent.trim(),
						),
					);
				}

				if (remainingContent.trim()) {
					const textDiv = append(content, $("div"));
					this.markdownRenderer.render(remainingContent.trim(), textDiv);
				}
			} else {
				this.markdownRenderer.render(assistantMsg.content, content);
			}
		}

		// Render tool messages inline
		if (toolMsgs.length > 0) {
			for (const toolMsg of toolMsgs) {
				this.renderToolMessage(content, toolMsg);
			}
		}

		// Render actions if assistant message exists
		if (assistantMsg) {
			this.renderMessageActions(messageElement, assistantMsg);
		}

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderMessage(message: IChatMessage): void {
		if (!this.messagesContainer) {
			return;
		}

		const messageElement = append(
			this.messagesContainer,
			$(`.alphacode-chat-message.${message.role}`),
		);

		const header = append(messageElement, $(".alphacode-chat-message-header"));
		let avatarSymbol: string;
		let labelText: string;
		switch (message.role) {
			case "user":
				// allow-any-unicode-next-line
				avatarSymbol = "👤";
				labelText = localize("alphacode.chat.you", "You");
				break;
			case "assistant":
				// allow-any-unicode-next-line
				avatarSymbol = "🤖";
				labelText = localize("alphacode.chat.assistant", "AlphaCode AI");
				break;
			case "tool":
				// allow-any-unicode-next-line
				avatarSymbol = "🛠️";
				labelText = localize("alphacode.chat.tool", "Tool");
				break;
			default:
				// allow-any-unicode-next-line
				avatarSymbol = "💬";
				labelText = "";
		}

		append(
			header,
			$(".alphacode-chat-message-avatar", undefined, avatarSymbol),
		);
		append(header, $("span", undefined, labelText));

		const content = append(
			messageElement,
			$(".alphacode-chat-message-content"),
		);

		content.textContent = message.content;

		// Render attached files if any
		if (message.attachments && message.attachments.length > 0) {
			this.renderMessageAttachments(messageElement, message.attachments);
		}

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private async renderMessageAttachments(
		messageElement: HTMLElement,
		attachmentIds: string[],
	): Promise<void> {
		const attachmentsContainer = append(
			messageElement,
			$('.alphacode-message-attachments'),
		);

		for (const fileId of attachmentIds) {
			try {
				const attachment = await this.fileAttachmentService.getFile(fileId);
				if (attachment) {
					const fileItem = $('.alphacode-attached-file-item');

					// Icon or preview
					if (attachment.previewUrl && attachment.mimeType.startsWith('image/')) {
						const preview = document.createElement('img');
						preview.src = attachment.previewUrl;
						preview.className = 'alphacode-file-preview';
						preview.alt = attachment.name;
						append(fileItem, preview);
					} else {
						const icon = $('.alphacode-file-icon');
						icon.textContent = this.getFileIcon(attachment.mimeType);
						append(fileItem, icon);
					}

					// File info
					const info = $('.alphacode-file-info');
					const name = $('.alphacode-file-name');
					name.textContent = attachment.name;
					name.title = attachment.name;
					append(info, name);

					const meta = $('.alphacode-file-meta');
					const size = $('.alphacode-file-size');
					size.textContent = this.formatFileSize(attachment.size);
					append(meta, size);
					append(info, meta);
					append(fileItem, info);

					append(attachmentsContainer, fileItem);
				}
			} catch (error) {
				console.error('Failed to render attachment:', error);
			}
		}
	}

	private getFileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) return '🖼️';
		if (mimeType.startsWith('video/')) return '🎥';
		if (mimeType.startsWith('audio/')) return '🎵';
		if (mimeType === 'application/pdf') return '📄';
		if (mimeType.includes('json')) return '📋';
		if (mimeType.includes('xml')) return '📃';
		if (mimeType.includes('zip')) return '📦';
		return '📎';
	}

	private formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	private renderToolMessage(contentElement: HTMLElement, message: IChatMessage): void {
		const metadata = message.metadata ?? {};
		const toolName = metadata.name || "Tool";

		// Extraire les paramètres depuis metadata.parameters
		let parameters: any = {};
		if (metadata.parameters) {
			try {
				parameters = typeof metadata.parameters === 'string' 
					? JSON.parse(metadata.parameters)
					: metadata.parameters;
			} catch {
				// Si le parsing échoue, on utilise un objet vide
			}
		}

		// allow-any-unicode-next-line
		// Extraire les informations des paramètres
		if (toolName.toLowerCase().includes("read")) {
			// Pour read_file - format simple
			const filePath = parameters.file_path || parameters.path;

			let simplifiedText = "";
			if (filePath) {
				const filename = filePath.split(/[/\\]/).pop();
				if (parameters.offset !== undefined && parameters.limit !== undefined) {
					const start = parameters.offset;
					const end = start + parameters.limit - 1;
					simplifiedText = `Read ${filename} #L${start}-${end}`;
				} else {
					simplifiedText = `Read ${filename}`;
				}
			} else {
				simplifiedText = `Read file`;
			}

			const toolText = append(contentElement, $("div.alphacode-tool-simple"));
			toolText.textContent = simplifiedText;
		} else if (
			toolName.toLowerCase().includes("edit") ||
			toolName.toLowerCase().includes("write")
		) {
			// Pour edit/write - format structuré avec badge
			const filePath = parameters.file_path || parameters.path || metadata.path;

			if (filePath) {
				const filename = filePath.split(/[/\\]/).pop() || "file";
				const ext = filename.split(".").pop()?.toUpperCase() || "";

				// allow-any-unicode-next-line
				// Calculer le nombre de lignes modifiées
				const summary = metadata.summary || "";
				const linesMatch = summary.match(/(\d+)\s+lines?\s+changed/i);
				const linesChanged = linesMatch ? parseInt(linesMatch[1]) : 
					(message.content.split("\n").length - 1);

				const toolCard = append(
					contentElement,
					$("div.alphacode-tool-file-card"),
				);

				// Badge du langage
				const badge = append(toolCard, $("span.alphacode-tool-file-badge"));
				badge.textContent = ext;

				// Nom du fichier
				const nameSpan = append(toolCard, $("span.alphacode-tool-file-name"));
				nameSpan.textContent = filename;

				// Indicateur de lignes
				const linesSpan = append(toolCard, $("span.alphacode-tool-file-lines"));
				linesSpan.textContent = `±${linesChanged}`;
			} else {
				const toolText = append(contentElement, $("div.alphacode-tool-simple"));
				toolText.textContent = "Edit file";
			}
		} else {
			// Autres outils - afficher un résumé si disponible
			const toolText = append(contentElement, $("div.alphacode-tool-simple"));
			toolText.textContent = metadata.summary || metadata.description || toolName;
		}
	}

	private renderMessageActions(
		messageElement: HTMLElement,
		message: IChatMessage,
	): void {
		const actions = append(messageElement, $(".alphacode-message-actions"));

		// Copy button
		// allow-any-unicode-next-line
		const copyButton = append(
			actions,
			$("button.alphacode-message-action", undefined, "📋 Copy"),
		) as HTMLButtonElement;
		this._register(
			addDisposableListener(copyButton, "click", () => {
				navigator.clipboard.writeText(message.content);
				// allow-any-unicode-next-line
				copyButton.textContent = "✓ Copied!";
				setTimeout(() => {
					// allow-any-unicode-next-line
					copyButton.textContent = "📋 Copy";
				}, 2000);
			}),
		);

		// Apply code button (if contains code)
		const codeBlocks = this.markdownRenderer.extractCodeBlocks(message.content);
		if (codeBlocks.length > 0) {
			const applyButton = append(
				actions,
				$(
					"button.alphacode-message-action.primary",
					undefined,
					"✨ Apply Code",
				),
			) as HTMLButtonElement;
			this._register(
				addDisposableListener(applyButton, "click", () =>
					this.applyCode(codeBlocks[0].code),
				),
			);
		}

		// Regenerate button
		const regenerateButton = append(
			actions,
			$("button.alphacode-message-action", undefined, "Regenerate"),
		) as HTMLButtonElement;
		regenerateButton.type = "button";
		this._register(
			addDisposableListener(regenerateButton, "click", () =>
				this.regenerateLastResponse(),
			),
		);
	}

	private updateSendStopButton(): void {
		if (!this.sendStopButton) {
			return;
		}

		if (this.isStreaming) {
			// allow-any-unicode-next-line
			this.sendStopButton.textContent = "⏸";
			this.sendStopButton.title = localize(
				"alphacode.chat.stopGenerating",
				"Stop generating",
			);
			this.sendStopButton.classList.add("stop-mode");
		} else {
			this.sendStopButton.textContent = "↑";
			this.sendStopButton.title = localize(
				"alphacode.chat.send",
				"Send message",
			);
			this.sendStopButton.classList.remove("stop-mode");
		}
	}

	private stopStreaming(): void {
		// Abort the actual stream in the chat service
		this.chatService.abortCurrentStream();
		
		this.isStreaming = false;
		this.currentStreamingBuffer = '';
		this.currentStreamingMessageId = undefined;
		this.updateSendStopButton();

		// Clear current streaming message if exists
		if (this.currentStreamingMessage) {
			const existingContent = this.currentStreamingBuffer.trim();
			if (!existingContent) {
				clearNode(this.currentStreamingMessage);
				this.currentStreamingMessage.textContent = localize(
					'alphacode.chat.stopped',
					'Response generation stopped.'
				);
			}
			this.currentStreamingMessage = undefined;
		}
		
		// Re-render pour afficher tous les messages qui ont été ajoutés
		this.renderMessages();
	}

	private async applyCode(code: string): Promise<void> {
		// Get active editor
		const activeEditor = this.editorService.activeTextEditorControl;
		if (!activeEditor) {
			return;
		}

		// Check if it's a code editor
		if (
			"executeEdits" in activeEditor &&
			typeof activeEditor.executeEdits === "function"
		) {
			// Insert code at cursor position or replace selection
			const selection = activeEditor.getSelection?.();
			if (selection) {
				const edit = {
					range: selection,
					text: code,
				};
				activeEditor.executeEdits("alphacode", [edit]);
			}
		}
	}

	private async regenerateLastResponse(): Promise<void> {
		const session = this.chatService.getCurrentSession();
		if (!session || session.messages.length < 2) {
			return;
		}

		// Get the last user message
		const messages = session.messages;
		const lastUserMessage = messages.filter((m) => m.role === "user").pop();

		if (lastUserMessage && this.inputTextArea) {
			this.inputTextArea.value = lastUserMessage.content;
			this.sendMessage();
		}
	}


	private onStreamChunk(chunk: {
		content: string;
		done: boolean;
		messageId?: string;
	}): void {
		this.ensureStreamingMessage(chunk.messageId);
		if (!this.currentStreamingMessage) {
			return;
		}
		if (
			chunk.messageId &&
			this.currentStreamingMessageId &&
			chunk.messageId !== this.currentStreamingMessageId
		) {
			return;
		}
		if (chunk.messageId && !this.currentStreamingMessageId) {
			this.currentStreamingMessageId = chunk.messageId;
		}

		if (!chunk.done) {
			if (chunk.content) {
				this.currentStreamingBuffer += chunk.content;
			}
			const hasContent = this.currentStreamingBuffer.trim().length > 0;
			if (hasContent) {
				clearNode(this.currentStreamingMessage);
				this.markdownRenderer.render(
					this.currentStreamingBuffer,
					this.currentStreamingMessage,
				);
			} else {
				const spinner = this.currentStreamingMessage.querySelector(
					".alphacode-chat-loading-spinner",
				);
				if (!spinner) {
					append(
						this.currentStreamingMessage,
						$(".alphacode-chat-loading-spinner"),
					);
				}
			}
			if (hasContent) {
				const spinner = this.currentStreamingMessage.querySelector(
					".alphacode-chat-loading-spinner",
				);
				if (spinner) {
					spinner.remove();
				}
			}
			if (this.messagesContainer) {
				this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
			}
		} else {
			this.currentStreamingBuffer = "";
			this.currentStreamingMessageId = undefined;
			this.isStreaming = false;
			this.updateSendStopButton();
			
			// Re-render tous les messages maintenant que le streaming est terminé
			// Cela affichera les tool messages qui ont été ajoutés pendant le streaming
			this.renderMessages();
		}
	}

	private ensureStreamingMessage(messageId?: string): void {
		if (!this.messagesContainer) {
			return;
		}
		if (
			this.currentStreamingMessage &&
			this.currentStreamingMessage.isConnected
		) {
			if (messageId && !this.currentStreamingMessageId) {
				this.currentStreamingMessageId = messageId;
			}
			return;
		}

		const messageElement = append(
			this.messagesContainer,
			$(".alphacode-chat-message.assistant"),
		);
		const header = append(messageElement, $(".alphacode-chat-message-header"));
		append(header, $(".alphacode-chat-message-avatar", undefined, "AI"));
		append(
			header,
			$(
				"span",
				undefined,
				localize("alphacode.chat.assistant", "AlphaCode AI"),
			),
		);
		this.currentStreamingMessage = append(
			messageElement,
			$(".alphacode-chat-message-content"),
		);
		this.currentStreamingMessage.textContent = "";
		if (this.currentStreamingBuffer.trim().length > 0) {
			this.markdownRenderer.render(
				this.currentStreamingBuffer,
				this.currentStreamingMessage,
			);
		} else {
			append(
				this.currentStreamingMessage,
				$(".alphacode-chat-loading-spinner"),
			);
		}
		if (messageId) {
			this.currentStreamingMessageId = messageId;
		}
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private async sendMessage(): Promise<void> {
		if (!this.inputTextArea || this.isStreaming) {
			return;
		}

		const content = this.inputTextArea.value.trim();
		if (!content) {
			return;
		}

		// Clear input
		this.inputTextArea.value = "";
		this.isStreaming = true;
		this.currentStreamingBuffer = "";
		this.currentStreamingMessageId = undefined;
		this.updateSendStopButton();

		// Get attached files
		const attachedFiles = this.fileAttachmentWidget?.getAttachedFiles() || [];
		const attachmentIds = attachedFiles.map(f => f.id);

		// Add user message immediately
		const userMessage: IChatMessage = {
			id: generateUuid(),
			role: "user",
			content,
			timestamp: Date.now(),
			attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
		};
		
		// Set message ID for the widget
		if (this.fileAttachmentWidget) {
			this.fileAttachmentWidget.setMessageId(userMessage.id);
		}
		
		this.renderMessage(userMessage);
		this.ensureStreamingMessage();

		// Get context from active editor
		const activeEditor = this.editorService.activeTextEditorControl;
		const context = {
			activeFile: this.editorService.activeEditor?.resource?.path,
			selectedCode: activeEditor
				? this.getSelectedText(activeEditor)
				: undefined,
		};

		// Prepare assistant message container for streaming
		if (this.messagesContainer) {
			const messageElement = append(
				this.messagesContainer,
				$(`.alphacode-chat-message.assistant`),
			);
			const header = append(
				messageElement,
				$(".alphacode-chat-message-header"),
			);
			append(header, $(".alphacode-chat-message-avatar", undefined, "AI"));
			append(
				header,
				$(
					"span",
					undefined,
					localize("alphacode.chat.assistant", "AlphaCode AI"),
				),
			);

			this.currentStreamingMessage = append(
				messageElement,
				$(".alphacode-chat-message-content"),
			);
			this.currentStreamingMessage.textContent = "";

			// Add typing indicator
			append(
				this.currentStreamingMessage,
				$(".alphacode-chat-loading-spinner"),
			);

			// Scroll to bottom
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

			// Send message with streaming
			try {
				await this.chatService.sendMessage(content, context);
			} catch (error) {
				console.error("Failed to send message", error);
				if (this.currentStreamingMessage) {
					this.currentStreamingMessage.textContent = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
				}
			} finally {
				this.isStreaming = false;
				this.currentStreamingMessage = undefined;
				this.updateSendStopButton();
				
				// Re-render tous les messages maintenant que le streaming est terminé
				// Cela affichera les tool messages qui ont été ajoutés pendant le streaming
				this.renderMessages();
			}
		}
	}

	private getSelectedText(editor: any): string | undefined {
		if (!editor.getSelection) {
			return undefined;
		}

		const selection = editor.getSelection();
		if (!selection || selection.isEmpty()) {
			return undefined;
		}

		const model = editor.getModel();
		if (!model) {
			return undefined;
		}

		return model.getValueInRange(selection);
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		this.layoutWelcome();
	}

	private layoutWelcome(): void {
		if (!this.containerElement) {
			return;
		}
		const viewLocation = this.viewDescriptorService.getViewLocationById(
			this.id,
		);
		const isSidebar =
			viewLocation === ViewContainerLocation.Sidebar ||
			viewLocation === ViewContainerLocation.AuxiliaryBar;
		const isNarrow = isSidebar && this.containerElement.clientWidth < 320;
		this.containerElement.classList.toggle("alphacode-vibe-narrow", isNarrow);
	}

	private updateBackground(container: HTMLElement): void {
		const theme = this.themeService.getColorTheme();
		const background = theme.getColor(SIDE_BAR_BACKGROUND);
		const foreground = theme.getColor(SIDE_BAR_FOREGROUND);
		if (background) {
			container.style.setProperty(
				"--alphacode-vibe-background",
				background.toString(),
			);
		}
		if (foreground) {
			container.style.setProperty(
				"--alphacode-vibe-foreground",
				foreground.toString(),
			);
		}
	}
}
