/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IChatFileUploadService, IFileUploadResult } from './chatFileUploadService.js';

const $ = dom.$;

export interface IFileUploadWidgetOptions {
	allowMultiple?: boolean;
	acceptedTypes?: string[];
	maxFileSize?: number;
	showProgress?: boolean;
	enableDragDrop?: boolean;
}

export interface IFileUploadEvent {
	files: IFileUploadResult[];
}

export class ChatFileUploadWidget extends Disposable {
	private readonly _onFilesUploaded = this._register(new Emitter<IFileUploadEvent>());
	readonly onFilesUploaded = this._onFilesUploaded.event;

	private readonly _onUploadStarted = this._register(new Emitter<void>());
	readonly onUploadStarted = this._onUploadStarted.event;

	private readonly _onUploadError = this._register(new Emitter<string>());
	readonly onUploadError = this._onUploadError.event;

	private container: HTMLElement;
	private uploadButton!: Button;
	private progressBar?: ProgressBar;
	private statusElement!: HTMLElement;
	private dropZone?: HTMLElement;
	private fileInput!: HTMLInputElement;

	private isUploading = false;

	constructor(
		parent: HTMLElement,
		private readonly options: IFileUploadWidgetOptions = {},
		@IChatFileUploadService private readonly fileUploadService: IChatFileUploadService,
		@INotificationService private readonly notificationService: INotificationService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		this.container = dom.append(parent, $('.chat-file-upload-widget'));
		
		this.createUI();
		this.setupEventListeners();
		this.updateTheme();

		this._register(this.themeService.onDidColorThemeChange(() => this.updateTheme()));
	}

	private createUI(): void {
		// Zone de drop
		if (this.options.enableDragDrop !== false) {
			this.dropZone = dom.append(this.container, $('.file-drop-zone'));
			this.dropZone.innerHTML = `
				<div class="drop-zone-content">
					<div class="drop-zone-icon">${ThemeIcon.asClassNameArray(Codicon.cloudUpload).join(' ')}</div>
					<div class="drop-zone-text">${localize('dropFilesHere', 'Drop files here or click to browse')}</div>
					<div class="drop-zone-hint">${this.getSupportedTypesText()}</div>
				</div>
			`;
		}

		// Bouton d'upload
		const buttonContainer = dom.append(this.container, $('.upload-button-container'));
		this.uploadButton = this._register(new Button(buttonContainer, {
			title: localize('uploadFiles', 'Upload Files'),
			supportIcons: true
		}));
		this.uploadButton.label = `$(${Codicon.attach.id}) ${localize('attachFiles', 'Attach Files')}`;

		// Input file caché
		this.fileInput = dom.append(this.container, $('input.file-input')) as HTMLInputElement;
		this.fileInput.type = 'file';
		this.fileInput.style.display = 'none';
		this.fileInput.multiple = this.options.allowMultiple !== false;
		if (this.options.acceptedTypes) {
			this.fileInput.accept = this.options.acceptedTypes.join(',');
		}

		// Barre de progression
		if (this.options.showProgress !== false) {
			const progressContainer = dom.append(this.container, $('.progress-container'));
			this.progressBar = this._register(new ProgressBar(progressContainer));
			this.progressBar.hide();
		}

		// Élément de statut
		this.statusElement = dom.append(this.container, $('.upload-status'));
		this.updateStatus('');
	}

	private setupEventListeners(): void {
		// Clic sur le bouton
		this._register(this.uploadButton.onDidClick(() => {
			if (!this.isUploading) {
				this.fileInput.click();
			}
		}));

		// Sélection de fichiers
		this._register(dom.addDisposableListener(this.fileInput, 'change', (e) => {
			const files = Array.from((e.target as HTMLInputElement).files || []);
			if (files.length > 0) {
				this.handleFileSelection(files);
			}
		}));

		// Drag & Drop
		if (this.options.enableDragDrop !== false && this.dropZone) {
			this.setupDragAndDrop();
		}

		// Événements du service d'upload
		this._register(this.fileUploadService.onUploadProgress(progress => {
			this.updateProgress(progress.percentage);
			this.updateStatus(localize('uploading', 'Uploading... {0}%', progress.percentage));
		}));

		this._register(this.fileUploadService.onUploadComplete(result => {
			if (result.success) {
				this.updateStatus(localize('uploadComplete', 'Upload complete'));
			} else {
				this.updateStatus(localize('uploadFailed', 'Upload failed: {0}', result.error || 'Unknown error'));
				this._onUploadError.fire(result.error || 'Unknown error');
			}
		}));
	}

	private setupDragAndDrop(): void {
		const dropZone = this.dropZone;
		if (!dropZone) {
			return;
		}

		const disposables = new DisposableStore();

		// Prévenir le comportement par défaut
		['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
			disposables.add(dom.addDisposableListener(dropZone, eventName, (e) => {
				e.preventDefault();
				e.stopPropagation();
			}));
		});

		// Effets visuels
		disposables.add(dom.addDisposableListener(dropZone, 'dragenter', () => {
			dropZone.classList.add('drag-over');
		}));

		disposables.add(dom.addDisposableListener(dropZone, 'dragleave', (e) => {
			if (!dropZone.contains(e.relatedTarget as Node)) {
				dropZone.classList.remove('drag-over');
			}
		}));

		// Drop
		disposables.add(dom.addDisposableListener(dropZone, 'drop', (e) => {
			dropZone.classList.remove('drag-over');
			const files = Array.from(e.dataTransfer?.files || []);
			if (files.length > 0) {
				this.handleFileSelection(files);
			}
		}));

		// Clic sur la zone de drop
		disposables.add(dom.addDisposableListener(dropZone, 'click', () => {
			if (!this.isUploading) {
				this.fileInput.click();
			}
		}));

		this._register(disposables);
	}

	private async handleFileSelection(files: File[]): Promise<void> {
		if (this.isUploading) {
			return;
		}

		this.isUploading = true;
		this._onUploadStarted.fire();
		this.updateUploadingState(true);

		try {
			// Validation préalable
			const validationResults = await Promise.all(
				files.map(file => this.fileUploadService.validateFile(file, {
					maxFileSize: this.options.maxFileSize,
					allowedExtensions: this.options.acceptedTypes
				}))
			);

			const invalidFiles = validationResults
				.map((result, index) => ({ result, file: files[index] }))
				.filter(({ result }) => !result.valid);

			if (invalidFiles.length > 0) {
				const errors = invalidFiles.map(({ file, result }) => 
					`${file.name}: ${result.error}`
				).join('\n');
				
				this.notificationService.error(localize('validationFailed', 'File validation failed:\n{0}', errors));
				this._onUploadError.fire(errors);
				return;
			}

			// Upload des fichiers
			this.updateStatus(localize('startingUpload', 'Starting upload...'));
			const results = await this.fileUploadService.uploadFiles(files, {
				maxFileSize: this.options.maxFileSize,
				allowedExtensions: this.options.acceptedTypes,
				enableVirusScan: true,
				encryptInTransit: true
			});

			const successfulUploads = results.filter(r => r.success);
			const failedUploads = results.filter(r => !r.success);

			if (failedUploads.length > 0) {
				const errors = failedUploads.map(r => r.error).join(', ');
				this.notificationService.error(localize('someUploadsFailed', 'Some uploads failed: {0}', errors));
			}

			if (successfulUploads.length > 0) {
				this._onFilesUploaded.fire({ files: successfulUploads });
				this.notificationService.info(localize('filesUploaded', '{0} file(s) uploaded successfully', successfulUploads.length));
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.notificationService.error(localize('uploadError', 'Upload error: {0}', errorMessage));
			this._onUploadError.fire(errorMessage);
		} finally {
			this.isUploading = false;
			this.updateUploadingState(false);
			this.resetFileInput();
		}
	}

	private updateUploadingState(uploading: boolean): void {
		this.uploadButton.enabled = !uploading;
		
		if (uploading) {
			this.uploadButton.label = `$(${Codicon.loading.id}~spin) ${localize('uploading', 'Uploading...')}`;
			this.container.classList.add('uploading');
			if (this.progressBar) {
				this.progressBar.show();
			}
		} else {
			this.uploadButton.label = `$(${Codicon.attach.id}) ${localize('attachFiles', 'Attach Files')}`;
			this.container.classList.remove('uploading');
			if (this.progressBar) {
				this.progressBar.hide();
			}
		}
	}

	private updateProgress(percentage: number): void {
		if (this.progressBar) {
			this.progressBar.worked(percentage);
		}
	}

	private updateStatus(message: string): void {
		this.statusElement.textContent = message;
		this.statusElement.style.display = message ? 'block' : 'none';
	}

	private resetFileInput(): void {
		this.fileInput.value = '';
	}

	private getSupportedTypesText(): string {
		const supportedTypes = this.fileUploadService.getSupportedFileTypes();
		const maxSize = Math.round(this.fileUploadService.getMaxFileSize() / (1024 * 1024));
		
		return localize('supportedTypes', 'Supported: {0} (max {1}MB)', 
			supportedTypes.slice(0, 5).join(', ') + (supportedTypes.length > 5 ? '...' : ''),
			maxSize
		);
	}

	private updateTheme(): void {
		// Implémentation des couleurs spécifiques au thème si nécessaire
		this.themeService.getColorTheme();
	}

	public setEnabled(enabled: boolean): void {
		this.uploadButton.enabled = enabled && !this.isUploading;
		if (this.dropZone) {
			this.dropZone.style.pointerEvents = enabled ? 'auto' : 'none';
			this.dropZone.style.opacity = enabled ? '1' : '0.5';
		}
	}

	public reset(): void {
		this.resetFileInput();
		this.updateStatus('');
		if (this.progressBar) {
			this.progressBar.hide();
		}
		this.isUploading = false;
		this.updateUploadingState(false);
	}
}
