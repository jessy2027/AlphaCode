/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/fileAttachment.css';

import {
	$,
	addDisposableListener,
	append,
	clearNode,
} from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import {
	IAlphaCodeFileAttachmentService,
	IFileAttachment,
	IFileUploadEvent,
} from '../common/fileAttachmentService.js';

export interface IFileAttachmentWidgetOptions {
	container: HTMLElement;
	compact?: boolean;
	showDropZone?: boolean;
}

export class FileAttachmentWidget extends Disposable {
	private readonly _onDidAttachFiles = this._register(
		new Emitter<IFileAttachment[]>(),
	);
	readonly onDidAttachFiles: Event<IFileAttachment[]> =
		this._onDidAttachFiles.event;

	private readonly _onDidRemoveFile = this._register(new Emitter<string>());
	readonly onDidRemoveFile: Event<string> = this._onDidRemoveFile.event;

	private containerElement: HTMLElement;
	private dropZoneElement: HTMLElement | undefined;
	private fileInputElement: HTMLInputElement;
	private attachedFilesContainer: HTMLElement;
	private attachedFiles: Map<string, IFileAttachment> = new Map();
	private uploadingFiles: Map<string, IFileUploadEvent> = new Map();
	private currentMessageId: string | undefined;

	constructor(
		options: IFileAttachmentWidgetOptions,
		private readonly fileAttachmentService: IAlphaCodeFileAttachmentService,
	) {
		super();

		this.containerElement = options.container;
		this.fileInputElement = this.createFileInput();
		this.attachedFilesContainer = this.createAttachedFilesContainer();

		if (options.showDropZone !== false) {
			this.dropZoneElement = this.createDropZone();
		}

		this.setupEventListeners();
	}

	setMessageId(messageId: string): void {
		this.currentMessageId = messageId;
	}

	getAttachedFiles(): IFileAttachment[] {
		return Array.from(this.attachedFiles.values());
	}

	clearAttachments(): void {
		this.attachedFiles.clear();
		this.uploadingFiles.clear();
		clearNode(this.attachedFilesContainer);
	}

	private createFileInput(): HTMLInputElement {
		const input = document.createElement('input');
		input.type = 'file';
		input.multiple = true;
		input.className = 'alphacode-file-input';

		const config = this.fileAttachmentService.getSecurityConfig();
		const acceptTypes = this.getMimeTypeExtensions(config.allowedMimeTypes);
		input.accept = acceptTypes.join(',');

		append(this.containerElement, input);
		return input;
	}

	private createAttachedFilesContainer(): HTMLElement {
		const container = $(
			'.alphacode-attached-files-list',
			undefined,
		);
		append(this.containerElement, container);
		return container;
	}

	private createDropZone(): HTMLElement {
		const dropZone = $('.alphacode-file-drop-zone');

		const icon = $('.alphacode-file-drop-zone-icon');
		icon.textContent = '📎';
		append(dropZone, icon);

		const text = $('.alphacode-file-drop-zone-text');
		text.textContent = localize(
			'dropFilesHere',
			'Glissez-déposez des fichiers ici',
		);
		append(dropZone, text);

		const config = this.fileAttachmentService.getSecurityConfig();
		const subtext = $('.alphacode-file-drop-zone-subtext');
		subtext.textContent = localize(
			'fileRestrictions',
			'ou cliquez pour parcourir (max {0} fichiers, {1} MB chacun)',
			config.maxFilesPerMessage,
			(config.maxFileSize / (1024 * 1024)).toFixed(0),
		);
		append(dropZone, subtext);

		append(this.containerElement, dropZone);
		return dropZone;
	}

	private setupEventListeners(): void {
		// Événement de changement de fichier
		this._register(
			addDisposableListener(this.fileInputElement, 'change', (e) => {
				const files = (e.target as HTMLInputElement).files;
				if (files && files.length > 0) {
					this.handleFilesSelected(Array.from(files));
				}
			}),
		);

		// Événements de la drop zone
		if (this.dropZoneElement) {
			this._register(
				addDisposableListener(this.dropZoneElement, 'click', () => {
					this.fileInputElement.click();
				}),
			);

			this._register(
				addDisposableListener(this.dropZoneElement, 'dragover', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.dropZoneElement?.classList.add('drag-over');
				}),
			);

			this._register(
				addDisposableListener(this.dropZoneElement, 'dragleave', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.dropZoneElement?.classList.remove('drag-over');
				}),
			);

			this._register(
				addDisposableListener(this.dropZoneElement, 'drop', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.dropZoneElement?.classList.remove('drag-over');

					const files = e.dataTransfer?.files;
					if (files && files.length > 0) {
						this.handleFilesSelected(Array.from(files));
					}
				}),
			);
		}

		// Écouter les événements d'upload
		this._register(
			this.fileAttachmentService.onDidUploadFile((event) => {
				this.handleUploadEvent(event);
			}),
		);
	}

	private async handleFilesSelected(files: File[]): Promise<void> {
		if (!this.currentMessageId) {
			// Générer un ID temporaire si non défini
			this.currentMessageId = `temp_${Date.now()}`;
		}

		// Valider les fichiers
		const validationResults = await Promise.all(
			files.map((file) => this.fileAttachmentService.validateFile(file)),
		);

		const validFiles: File[] = [];
		const errors: string[] = [];

		files.forEach((file, index) => {
			const result = validationResults[index];
			if (result.valid) {
				validFiles.push(file);
			} else if (result.errors) {
				errors.push(...result.errors);
			}
		});

		// Afficher les erreurs si présentes
		if (errors.length > 0) {
			this.showErrors(errors);
		}

		// Uploader les fichiers valides
		if (validFiles.length > 0) {
			try {
				const attachments = await this.fileAttachmentService.uploadFiles(
					validFiles,
					this.currentMessageId,
				);

				attachments.forEach((attachment) => {
					this.attachedFiles.set(attachment.id, attachment);
				});

				this.renderAttachedFiles();
				this._onDidAttachFiles.fire(attachments);
			} catch (error) {
				this.showErrors([
					error instanceof Error ? error.message : String(error),
				]);
			}
		}

		// Réinitialiser l'input
		this.fileInputElement.value = '';
	}

	private handleUploadEvent(event: IFileUploadEvent): void {
		if (event.status === 'uploading' || event.status === 'processing') {
			this.uploadingFiles.set(event.uploadId, event);
			this.renderUploadingFiles();
		} else if (event.status === 'complete') {
			this.uploadingFiles.delete(event.uploadId);
			this.renderUploadingFiles();
		} else if (event.status === 'error') {
			this.uploadingFiles.delete(event.uploadId);
			this.showErrors([event.error || localize('uploadError', 'Erreur d\'upload')]);
			this.renderUploadingFiles();
		}
	}

	private renderAttachedFiles(): void {
		clearNode(this.attachedFilesContainer);

		this.attachedFiles.forEach((attachment) => {
			const fileItem = this.createFileItem(attachment);
			append(this.attachedFilesContainer, fileItem);
		});
	}

	private renderUploadingFiles(): void {
		// Afficher les fichiers en cours d'upload séparément
		this.uploadingFiles.forEach((upload) => {
			const existingItem = this.attachedFilesContainer.querySelector(
				`[data-upload-id="${upload.uploadId}"]`,
			);
			if (existingItem) {
				this.updateUploadProgress(existingItem as HTMLElement, upload);
			} else {
				const uploadItem = this.createUploadingItem(upload);
				append(this.attachedFilesContainer, uploadItem);
			}
		});
	}

	private createFileItem(attachment: IFileAttachment): HTMLElement {
		const item = $('.alphacode-attached-file-item');
		item.dataset.fileId = attachment.id;

		// Icône ou prévisualisation
		if (attachment.previewUrl && attachment.mimeType.startsWith('image/')) {
			const preview = document.createElement('img');
			preview.src = attachment.previewUrl;
			preview.className = 'alphacode-file-preview';
			preview.alt = attachment.name;
			append(item, preview);
		} else {
			const icon = $('.alphacode-file-icon');
			icon.textContent = this.getFileIcon(attachment.mimeType);
			append(item, icon);
		}

		// Informations du fichier
		const info = $('.alphacode-file-info');

		const name = $('.alphacode-file-name');
		name.textContent = attachment.name;
		name.title = attachment.name;
		append(info, name);

		const meta = $('.alphacode-file-meta');

		const size = $('.alphacode-file-size');
		size.textContent = this.formatFileSize(attachment.size);
		append(meta, size);

		if (attachment.scanStatus) {
			const status = $('.alphacode-file-status', {
				className: attachment.scanStatus,
			});
			status.textContent = this.getScanStatusText(attachment.scanStatus);
			append(meta, status);
		}

		append(info, meta);
		append(item, info);

		// Actions
		const actions = $('.alphacode-file-actions');

		const deleteButton = $(
			'button.alphacode-file-action-button.delete',
		);
		deleteButton.textContent = '🗑️';
		deleteButton.title = localize('deleteFile', 'Supprimer le fichier');
		this._register(
			addDisposableListener(deleteButton, 'click', () => {
				this.handleFileDelete(attachment.id);
			}),
		);
		append(actions, deleteButton);

		append(item, actions);

		return item;
	}

	private createUploadingItem(upload: IFileUploadEvent): HTMLElement {
		const item = $('.alphacode-attached-file-item.uploading');
		item.dataset.uploadId = upload.uploadId;

		const icon = $('.alphacode-file-icon.alphacode-file-loading');
		icon.textContent = '⏳';
		append(item, icon);

		const info = $('.alphacode-file-info');

		const name = $('.alphacode-file-name');
		name.textContent = upload.fileName;
		append(info, name);

		const progress = $('.alphacode-file-progress');
		const progressBar = $('.alphacode-file-progress-bar');
		progressBar.style.width = `${upload.progress}%`;
		append(progress, progressBar);
		append(info, progress);

		const meta = $('.alphacode-file-meta');
		meta.textContent = upload.status === 'uploading'
			? localize('uploading', 'Upload en cours...')
			: localize('processing', 'Traitement...');
		append(info, meta);

		append(item, info);

		return item;
	}

	private updateUploadProgress(item: HTMLElement, upload: IFileUploadEvent): void {
		const progressBar = item.querySelector(
			'.alphacode-file-progress-bar',
		) as HTMLElement;
		if (progressBar) {
			progressBar.style.width = `${upload.progress}%`;
		}

		const meta = item.querySelector('.alphacode-file-meta');
		if (meta) {
			meta.textContent = upload.status === 'uploading'
				? localize('uploading', 'Upload en cours...')
				: localize('processing', 'Traitement...');
		}
	}

	private async handleFileDelete(fileId: string): Promise<void> {
		try {
			await this.fileAttachmentService.deleteFile(fileId);
			this.attachedFiles.delete(fileId);
			this.renderAttachedFiles();
			this._onDidRemoveFile.fire(fileId);
		} catch (error) {
			this.showErrors([
				localize('deleteError', 'Erreur lors de la suppression du fichier'),
			]);
		}
	}

	private showErrors(errors: string[]): void {
		errors.forEach((error) => {
			const errorElement = $('.alphacode-file-error-message');

			const icon = $('.alphacode-file-error-icon');
			icon.textContent = '⚠️';
			append(errorElement, icon);

			const text = document.createElement('span');
			text.textContent = error;
			append(errorElement, text);

			append(this.containerElement, errorElement);

			// Retirer l'erreur après 5 secondes
			setTimeout(() => {
				errorElement.remove();
			}, 5000);
		});
	}

	private getFileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) {
			return '🖼️';
		}
		if (mimeType.startsWith('video/')) {
			return '🎥';
		}
		if (mimeType.startsWith('audio/')) {
			return '🎵';
		}
		if (mimeType === 'application/pdf') {
			return '📄';
		}
		if (mimeType.includes('json')) {
			return '📋';
		}
		if (mimeType.includes('xml')) {
			return '📃';
		}
		if (mimeType.includes('zip') || mimeType.includes('archive')) {
			return '📦';
		}
		return '📎';
	}

	private formatFileSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		}
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	private getScanStatusText(status: string): string {
		switch (status) {
			case 'pending':
				return '⏳ Scan...';
			case 'clean':
				return '✓ Sécurisé';
			case 'infected':
				return '⚠️ Infecté';
			case 'error':
				return '⚠️ Erreur scan';
			default:
				return '';
		}
	}

	private getMimeTypeExtensions(mimeTypes: string[]): string[] {
		const extensions: string[] = [];
		const mimeToExt: Record<string, string> = {
			'application/pdf': '.pdf',
			'text/plain': '.txt',
			'text/markdown': '.md',
			'image/png': '.png',
			'image/jpeg': '.jpg,.jpeg',
			'image/gif': '.gif',
			'image/webp': '.webp',
			'image/svg+xml': '.svg',
			'application/json': '.json',
			'application/xml': '.xml',
			'text/csv': '.csv',
			'application/zip': '.zip',
		};

		mimeTypes.forEach((mime) => {
			if (mimeToExt[mime]) {
				extensions.push(...mimeToExt[mime].split(','));
			}
		});

		return extensions;
	}
}
