/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/vibeCodingView.css';
import './media/chatView.css';

import {
	$,
	addDisposableListener,
	append,
	clearNode,
} from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { MarkdownRenderer } from './markdownRenderer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import {
	IViewDescriptorService,
	ViewContainerLocation,
} from '../../../common/views.js';
import {
	IViewPaneOptions,
	ViewPane,
} from '../../../browser/parts/views/viewPane.js';
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
	private currentStreamingBuffer: string = '';
	private currentStreamingMessageId: string | undefined;
	private isStreaming: boolean = false;
	private markdownRenderer: MarkdownRenderer;
	private quickSuggestionsContainer: HTMLElement | undefined;
	private welcomeContainer: HTMLElement | undefined;
	private fileAttachmentWidget: FileAttachmentWidget | undefined;

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
			this.chatService.onDidAddMessage(() => this.renderMessages()),
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
		container.classList.add('alphacode-vibe-root');

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
		this.welcomeContainer = append(container, $('.alphacode-vibe-welcome'));

		append(
			this.welcomeContainer,
			$(
				'h2',
				undefined,
				localize('alphacode.vibe.welcome.title', 'Welcome to Vibe Coding'),
			),
		);

		append(
			this.welcomeContainer,
			$(
				'p',
				undefined,
				localize(
					'alphacode.vibe.welcome.description',
					'Connect your favorite AI providers and co-create code directly inside AlphaCodeIDE. Configure your API keys to begin.',
				),
			),
		);

		const actionsRow = append(
			this.welcomeContainer,
			$('.alphacode-vibe-actions'),
		);
		const configureButton = append(
			actionsRow,
			$(
				'button.monaco-text-button',
				undefined,
				localize('alphacode.vibe.configure', 'Open AI Settings'),
			),
		) as HTMLButtonElement;
		configureButton.type = 'button';

		this._register(
			addDisposableListener(configureButton, 'click', async () => {
				await this.commandService.executeCommand(
					'workbench.action.openSettings',
					'@alphacode ai',
				);
			}),
		);

		append(
			this.welcomeContainer,
			$(
				'p',
				undefined,
				localize('alphacode.vibe.welcome.instructions', 'Next steps:'),
			),
		);
		const checklist = append(this.welcomeContainer, $('ul', undefined));
		append(
			checklist,
			$(
				'li',
				undefined,
				localize(
					'alphacode.vibe.welcome.step.context',
					'Enable workspace indexing for deeper context awareness.',
				),
			),
		);
		append(
			checklist,
			$(
				'li',
				undefined,
				localize(
					'alphacode.vibe.welcome.step.agents',
					'Choose agents for generation, refactors, debugging, and documentation.',
				),
			),
		);
		append(
			checklist,
			$(
				'li',
				undefined,
				localize(
					'alphacode.vibe.welcome.step.live',
					'Invite collaborators to start live pair programming sessions.',
				),
			),
		);
	}

	private renderChat(container: HTMLElement): void {
		this.chatContainer = append(container, $('.alphacode-chat-container'));

		// Toolbar
		const toolbar = append(this.chatContainer, $('.alphacode-chat-toolbar'));
		append(
			toolbar,
			$(
				'span',
				undefined,
				localize('alphacode.chat.title', 'Vibe Coding Chat'),
			),
		);
		const toolbarActions = append(
			toolbar,
			$('.alphacode-chat-toolbar-actions'),
		);

		const clearButton = append(
			toolbarActions,
			$(
				'button.monaco-text-button.alphacode-chat-toolbar-button',
				undefined,
				localize('alphacode.chat.clear', 'Clear'),
			),
		) as HTMLButtonElement;
		this._register(
			addDisposableListener(clearButton, 'click', () => {
				this.chatService.clearCurrentSession();
				this.renderMessages();
			}),
		);

		// Messages container
		this.messagesContainer = append(
			this.chatContainer,
			$('.alphacode-chat-messages'),
		);
		this.renderMessages();

		// Quick suggestions
		this.quickSuggestionsContainer = append(
			this.chatContainer,
			$('.alphacode-quick-suggestions'),
		);
		this.renderQuickSuggestions();

		// Input container
		const inputContainer = append(
			this.chatContainer,
			$('.alphacode-chat-input-container'),
		);

		const contextInfo = append(
			inputContainer,
			$('.alphacode-chat-context-info'),
		);
		append(
			contextInfo,
			$(
				'span',
				undefined,
				localize('alphacode.chat.context', 'Context: Workspace + Active File'),
			),
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
			$('.alphacode-chat-input-wrapper'),
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
			$('textarea.alphacode-chat-input'),
		) as HTMLTextAreaElement;
		this.inputTextArea.placeholder = localize(
			'alphacode.chat.placeholder',
			'Ask me anything about your code...'
		);

		const sendButton = append(
			inputWrapper,
			$(
				'button.monaco-text-button.alphacode-chat-send-button',
				undefined,
				localize('alphacode.chat.send', 'Send'),
			),
		) as HTMLButtonElement;

		this._register(
			addDisposableListener(sendButton, 'click', () => this.sendMessage()),
		);
		this._register(
			addDisposableListener(
				this.inputTextArea,
				'keydown',
				(e: KeyboardEvent) => {
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
			const empty = append(this.messagesContainer, $('.alphacode-chat-empty'));
			// allow-any-unicode-next-line
			append(empty, $('.alphacode-chat-empty-icon', undefined, '💬'));
			append(
				empty,
				$(
					'.alphacode-chat-empty-title',
					undefined,
					localize('alphacode.chat.empty.title', 'Start a Conversation'),
				),
			);
			append(
				empty,
				$(
					'.alphacode-chat-empty-description',
					undefined,
					localize(
						'alphacode.chat.empty.description',
						'Ask questions, generate code, refactor, debug, or get documentation help.',
					),
				),
			);
			return;
		}

		for (const message of session.messages) {
			this.renderMessage(message);
		}
		if (this.isStreaming || this.currentStreamingBuffer.trim().length > 0) {
			this.ensureStreamingMessage(this.currentStreamingMessageId);
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

		const header = append(messageElement, $('.alphacode-chat-message-header'));
		let avatarSymbol: string;
		let labelText: string;
		switch (message.role) {
			case 'user':
				avatarSymbol = '👤';
				labelText = localize('alphacode.chat.you', 'You');
				break;
			case 'assistant':
				avatarSymbol = '🤖';
				labelText = localize('alphacode.chat.assistant', 'AlphaCode AI');
				break;
			case 'tool':
				avatarSymbol = '🛠️';
				labelText = localize('alphacode.chat.tool', 'Tool');
				break;
			default:
				avatarSymbol = '💬';
				labelText = '';
		}

		append(header, $('.alphacode-chat-message-avatar', undefined, avatarSymbol));
		append(header, $('span', undefined, labelText));

		const content = append(
			messageElement,
			$('.alphacode-chat-message-content'),
		);

		if (message.role === 'assistant') {
			this.markdownRenderer.render(message.content, content);
			this.renderMessageActions(messageElement, message);
		} else if (message.role === 'tool') {
			this.renderToolMessage(content, message);
		} else {
			content.textContent = message.content;
		}

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
		const card = append(contentElement, $('.alphacode-tool-card'));
		const status = metadata.status === 'error' ? 'error' : 'success';
		card.classList.add(status);

		const header = append(card, $('.alphacode-tool-card-header'));
		const icon = status === 'error' ? '⚠️' : '🛠️';
		append(header, $('span.alphacode-tool-card-icon', undefined, icon));
		const title =
			typeof metadata.name === 'string' && metadata.name.trim().length
				? metadata.name
				: localize('alphacode.chat.tool.unknown', 'Tool action');
		append(header, $('span.alphacode-tool-card-title', undefined, title));

		const statusLabel =
			status === 'error'
				? localize('alphacode.chat.tool.status.error', 'Error')
				: localize('alphacode.chat.tool.status.success', 'Success');
		append(
			header,
			$(
				'span.alphacode-tool-card-status',
				undefined,
				statusLabel,
			),
		).classList.add(status);

		const description =
			typeof metadata.description === 'string' && metadata.description.trim().length
				? metadata.description.trim()
				: undefined;
		if (description) {
			append(card, $('p.alphacode-tool-card-description', undefined, description));
		}

		const timestamp =
			typeof metadata.timestamp === 'number'
				? new Date(metadata.timestamp)
				: undefined;
		if (timestamp) {
			const metaRow = append(card, $('.alphacode-tool-card-meta'));
			append(
				metaRow,
				$(
					'span.alphacode-tool-card-meta-item',
					undefined,
					localize(
						'alphacode.chat.tool.completedAt',
						'Completed {0}',
						timestamp.toLocaleTimeString(),
					),
				),
			);
		}

		const body = append(card, $('.alphacode-tool-card-body'));
		const summaryText =
			typeof metadata.summary === 'string' && metadata.summary.trim().length
				? metadata.summary
				: message.content;
		append(body, $('p.alphacode-tool-card-summary', undefined, summaryText));

		if (metadata.parameters) {
			const parametersSection = append(body, $('.alphacode-tool-card-section'));
			append(
				parametersSection,
				$(
					'span.alphacode-tool-card-section-title',
					undefined,
					localize('alphacode.chat.tool.parameters.label', 'Parameters'),
				),
			);
			const parametersBlock = append(
				parametersSection,
				$('pre.alphacode-tool-card-parameters'),
			);
			parametersBlock.textContent = metadata.parameters;
		}

		const detailsText =
			typeof metadata.details === 'string' && metadata.details.trim().length
				? metadata.details
				: message.content;
		if (detailsText && detailsText !== summaryText) {
			const toggle = append(
				body,
				$(
					'button.alphacode-tool-card-toggle',
					undefined,
					localize('alphacode.chat.tool.showDetails', 'Show details'),
				),
			) as HTMLButtonElement;
			toggle.type = 'button';
			const details = append(
				body,
				$('pre.alphacode-tool-card-details'),
			);
			details.textContent = detailsText;
			details.hidden = true;
			this._register(
				addDisposableListener(toggle, 'click', () => {
					const hidden = details.hidden;
					details.hidden = !hidden;
					toggle.textContent = hidden
						? localize('alphacode.chat.tool.hideDetails', 'Hide details')
						: localize('alphacode.chat.tool.showDetails', 'Show details');
				}),
			);
		}

		const actions = append(card, $('.alphacode-tool-card-actions'));

		const proposalId = typeof metadata.proposalId === 'string' ? metadata.proposalId : undefined;
		if (proposalId) {
			const decisionRow = append(actions, $('.alphacode-tool-card-decision'));
			const decisionStatus = append(
				decisionRow,
				$('span.alphacode-tool-card-decision-status'),
			) as HTMLSpanElement;
			decisionStatus.textContent = this.chatService.hasPendingProposal(proposalId)
				? localize('alphacode.chat.tool.decision.pending', 'Review required')
				: localize('alphacode.chat.tool.decision.resolved', 'Already decided');

			const buttons = append(decisionRow, $('.alphacode-tool-card-decision-buttons'));
			const acceptLabel = localize('alphacode.chat.tool.decision.accept', 'Accept change');
			const acceptButton = append(
				buttons,
				$('button.alphacode-tool-card-decision-button.primary', undefined, acceptLabel),
			) as HTMLButtonElement;
			acceptButton.type = 'button';

			const rejectLabel = localize('alphacode.chat.tool.decision.reject', 'Reject change');
			const rejectButton = append(
				buttons,
				$('button.alphacode-tool-card-decision-button', undefined, rejectLabel),
			) as HTMLButtonElement;
			rejectButton.type = 'button';

			const setDecisionState = (state: 'pending' | 'accepted' | 'rejected' | 'error', message?: string) => {
				const pending = state === 'pending';
				acceptButton.disabled = !pending;
				rejectButton.disabled = !pending;
				if (state === 'accepted') {
					decisionStatus.textContent = localize('alphacode.chat.tool.decision.accepted', 'Change accepted');
				} else if (state === 'rejected') {
					decisionStatus.textContent = localize('alphacode.chat.tool.decision.rejected', 'Change rejected');
				} else if (state === 'error' && message) {
					decisionStatus.textContent = message;
				} else if (pending) {
					decisionStatus.textContent = localize('alphacode.chat.tool.decision.pending', 'Review required');
				}
			};

			if (!this.chatService.hasPendingProposal(proposalId)) {
				setDecisionState('accepted');
			} else {
				const handleDecision = async (kind: 'accept' | 'reject') => {
					setDecisionState('pending');
					acceptButton.disabled = true;
					rejectButton.disabled = true;
					try {
						if (kind === 'accept') {
							await this.chatService.acceptProposal(proposalId);
							setDecisionState('accepted');
						} else {
							await this.chatService.rejectProposal(proposalId);
							setDecisionState('rejected');
						}
					} catch (error) {
						console.error('Failed to resolve proposal', error);
						acceptButton.disabled = false;
						rejectButton.disabled = false;
						const messageText = error instanceof Error ? error.message : String(error);
						setDecisionState('error', messageText);
					}
				};

				this._register(
					addDisposableListener(acceptButton, 'click', () => handleDecision('accept')),
				);
				this._register(
					addDisposableListener(rejectButton, 'click', () => handleDecision('reject')),
				);
			}
		}

		const copyOutputLabel = localize('alphacode.chat.tool.copyOutput', 'Copy output');
		const copiedLabel = localize('alphacode.chat.tool.copied', 'Copied!');
		const copyOutputButton = append(
			actions,
			$('button.alphacode-tool-card-action', undefined, copyOutputLabel),
		) as HTMLButtonElement;
		copyOutputButton.type = 'button';
		this._register(
			addDisposableListener(copyOutputButton, 'click', () => {
				if (navigator.clipboard) {
					navigator.clipboard.writeText(message.content).catch(() => undefined);
				}
				copyOutputButton.textContent = copiedLabel;
				setTimeout(() => {
					copyOutputButton.textContent = copyOutputLabel;
				}, 2000);
			}),
		);

		if (metadata.parameters) {
			const copyParametersLabel = localize(
				'alphacode.chat.tool.copyParameters',
				'Copy parameters',
			);
			const copyParametersButton = append(
				actions,
				$('button.alphacode-tool-card-action.secondary', undefined, copyParametersLabel),
			) as HTMLButtonElement;
			copyParametersButton.type = 'button';
			this._register(
				addDisposableListener(copyParametersButton, 'click', () => {
					if (navigator.clipboard) {
						navigator.clipboard
							.writeText(String(metadata.parameters))
							.catch(() => undefined);
					}
					copyParametersButton.textContent = copiedLabel;
					setTimeout(() => {
						copyParametersButton.textContent = copyParametersLabel;
					}, 2000);
				}),
			);
		}
	}

	private renderMessageActions(
		messageElement: HTMLElement,
		message: IChatMessage,
	): void {
		const actions = append(messageElement, $('.alphacode-message-actions'));

		// Copy button
		// allow-any-unicode-next-line
		const copyButton = append(
			actions,
			$('button.alphacode-message-action', undefined, '📋 Copy'),
		) as HTMLButtonElement;
		this._register(
			addDisposableListener(copyButton, 'click', () => {
				navigator.clipboard.writeText(message.content);
				// allow-any-unicode-next-line
				copyButton.textContent = '✓ Copied!';
				setTimeout(() => {
					// allow-any-unicode-next-line
					copyButton.textContent = '📋 Copy';
				}, 2000);
			}),
		);

		// Apply code button (if contains code)
		const codeBlocks = this.markdownRenderer.extractCodeBlocks(message.content);
		if (codeBlocks.length > 0) {
			const applyButton = append(
				actions,
				$(
					'button.alphacode-message-action.primary',
					undefined,
					'✨ Apply Code',
				),
			) as HTMLButtonElement;
			this._register(
				addDisposableListener(applyButton, 'click', () =>
					this.applyCode(codeBlocks[0].code),
				),
			);
		}

		// Regenerate button
		const regenerateButton = append(
			actions,
			$('button.alphacode-message-action', undefined, 'Regenerate'),
		) as HTMLButtonElement;
		this._register(
			addDisposableListener(regenerateButton, 'click', () =>
				this.regenerateLastResponse(),
			),
		);
	}

	private renderQuickSuggestions(): void {
		if (!this.quickSuggestionsContainer) {
			return;
		}

		clearNode(this.quickSuggestionsContainer);

		const suggestions = [
			'Explain this code',
			'Refactor selection',
			'Add documentation',
			'Find bugs',
			'Optimize performance',
			'Generate tests',
		];

		for (const suggestion of suggestions) {
			const button = append(
				this.quickSuggestionsContainer,
				$('button.alphacode-quick-suggestion', undefined, suggestion),
			) as HTMLButtonElement;
			this._register(
				addDisposableListener(button, 'click', () => {
					if (this.inputTextArea) {
						this.inputTextArea.value = suggestion.substring(2); // Remove emoji
						this.inputTextArea.focus();
					}
				}),
			);
		}
	}

	private async applyCode(code: string): Promise<void> {
		// Get active editor
		const activeEditor = this.editorService.activeTextEditorControl;
		if (!activeEditor) {
			return;
		}

		// Check if it's a code editor
		if (
			'executeEdits' in activeEditor &&
			typeof activeEditor.executeEdits === 'function'
		) {
			// Insert code at cursor position or replace selection
			const selection = activeEditor.getSelection?.();
			if (selection) {
				const edit = {
					range: selection,
					text: code,
				};
				activeEditor.executeEdits('alphacode', [edit]);
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
		const lastUserMessage = messages.filter((m) => m.role === 'user').pop();

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
		if (chunk.messageId && this.currentStreamingMessageId && chunk.messageId !== this.currentStreamingMessageId) {
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
					'.alphacode-chat-loading-spinner',
				);
				if (!spinner) {
					append(
						this.currentStreamingMessage,
						$('.alphacode-chat-loading-spinner'),
					);
				}
			}
			if (hasContent) {
				const spinner = this.currentStreamingMessage.querySelector(
					'.alphacode-chat-loading-spinner',
				);
				if (spinner) {
					spinner.remove();
				}
			}
			if (this.messagesContainer) {
				this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
			}
		} else {
			this.currentStreamingBuffer = '';
			this.currentStreamingMessageId = undefined;
		}
	}

	private ensureStreamingMessage(messageId?: string): void {
		if (!this.messagesContainer) {
			return;
		}
		if (this.currentStreamingMessage && this.currentStreamingMessage.isConnected) {
			if (messageId && !this.currentStreamingMessageId) {
				this.currentStreamingMessageId = messageId;
			}
			return;
		}

		const messageElement = append(
			this.messagesContainer,
			$('.alphacode-chat-message.assistant'),
		);
		const header = append(
			messageElement,
			$('.alphacode-chat-message-header'),
		);
		append(header, $('.alphacode-chat-message-avatar', undefined, 'AI'));
		append(
			header,
			$('span', undefined, localize('alphacode.chat.assistant', 'AlphaCode AI')),
		);
		this.currentStreamingMessage = append(
			messageElement,
			$('.alphacode-chat-message-content'),
		);
		this.currentStreamingMessage.textContent = '';
		if (this.currentStreamingBuffer.trim().length > 0) {
			this.markdownRenderer.render(
				this.currentStreamingBuffer,
				this.currentStreamingMessage,
			);
		} else {
			append(
				this.currentStreamingMessage,
				$('.alphacode-chat-loading-spinner'),
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
		this.inputTextArea.value = '';
		this.isStreaming = true;
		this.currentStreamingBuffer = '';
		this.currentStreamingMessageId = undefined;

		// Get attached files
		const attachedFiles = this.fileAttachmentWidget?.getAttachedFiles() || [];
		const attachmentIds = attachedFiles.map(f => f.id);

		// Add user message immediately
		const userMessage: IChatMessage = {
			id: generateUuid(),
			role: 'user',
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
				$('.alphacode-chat-message-header'),
			);
			append(header, $('.alphacode-chat-message-avatar', undefined, 'AI'));
			append(
				header,
				$(
					'span',
					undefined,
					localize('alphacode.chat.assistant', 'AlphaCode AI'),
				),
			);

			this.currentStreamingMessage = append(
				messageElement,
				$('.alphacode-chat-message-content'),
			);
			this.currentStreamingMessage.textContent = '';

			// Add typing indicator
			append(
				this.currentStreamingMessage,
				$('.alphacode-chat-loading-spinner'),
			);

			// Scroll to bottom
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

			// Send message with streaming
			try {
				await this.chatService.sendMessage(content, context);
			} catch (error) {
				console.error('Failed to send message', error);
				if (this.currentStreamingMessage) {
					this.currentStreamingMessage.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			} finally {
				this.isStreaming = false;
				this.currentStreamingMessage = undefined;
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
		this.containerElement.classList.toggle('alphacode-vibe-narrow', isNarrow);
	}

	private updateBackground(container: HTMLElement): void {
		const theme = this.themeService.getColorTheme();
		const background = theme.getColor(SIDE_BAR_BACKGROUND);
		const foreground = theme.getColor(SIDE_BAR_FOREGROUND);
		if (background) {
			container.style.setProperty(
				'--alphacode-vibe-background',
				background.toString(),
			);
		}
		if (foreground) {
			container.style.setProperty(
				'--alphacode-vibe-foreground',
				foreground.toString(),
			);
		}
	}
}
