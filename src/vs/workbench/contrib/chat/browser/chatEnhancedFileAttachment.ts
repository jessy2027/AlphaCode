/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ChatAttachmentModel } from './chatAttachmentModel.js';
import { ChatFileUploadWidget, IFileUploadEvent } from './chatFileUploadWidget.js';
import { ChatFileValidationWidget } from './chatFileValidationWidget.js';
import { ChatEnhancedAttachmentManager } from './chatEnhancedAttachmentManager.js';
import { IChatFileUploadService, IFileUploadResult } from './chatFileUploadService.js';
import { IChatFileValidationService, IValidationReport } from './chatFileValidationService.js';
import { IChatFileStorageService } from '../common/chatFileStorageService.js';
import { IChatRequestVariableEntry } from '../common/chatVariableEntries.js';

const $ = dom.$;

export interface IChatEnhancedFileAttachmentOptions {
	allowMultiple?: boolean;
	maxFileSize?: number;
	maxFileCount?: number;
	enableValidation?: boolean;
	enableDragDrop?: boolean;
	showUploadProgress?: boolean;
	compactMode?: boolean;
}

export interface IAttachmentChangeEvent {
	added: IChatRequestVariableEntry[];
	removed: string[];
	updated: IChatRequestVariableEntry[];
}

/**
 * Composant principal qui intègre toutes les fonctionnalités d'attachement de fichiers améliorées
 */
export class ChatEnhancedFileAttachment extends Disposable {
	private readonly _onAttachmentsChanged = this._register(new Emitter<IAttachmentChangeEvent>());
	readonly onAttachmentsChanged = this._onAttachmentsChanged.event;

	private readonly _onValidationStateChanged = this._register(new Emitter<{ valid: boolean; errors: string[] }>());
	readonly onValidationStateChanged = this._onValidationStateChanged.event;

	private readonly _onUploadProgress = this._register(new Emitter<{ fileName: string; progress: number }>());
	readonly onUploadProgress = this._onUploadProgress.event;

	private readonly container: HTMLElement;
	private readonly uploadWidget: ChatFileUploadWidget;
	private readonly validationWidget: ChatFileValidationWidget;
	private readonly attachmentManager: ChatEnhancedAttachmentManager;

	// État du composant
	private isEnabled = true;

	constructor(
		parent: HTMLElement,
		private readonly attachmentModel: ChatAttachmentModel,
		private readonly options: IChatEnhancedFileAttachmentOptions = {},
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IChatFileUploadService fileUploadService: IChatFileUploadService,
		@IChatFileValidationService private readonly validationService: IChatFileValidationService,
		@IChatFileStorageService private readonly storageService: IChatFileStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		// Créer le conteneur principal
		this.container = dom.append(parent, $('.chat-enhanced-file-attachment'));

		// Initialiser le gestionnaire d'attachements amélioré
		this.attachmentManager = this._register(
			this.instantiationService.createInstance(
				ChatEnhancedAttachmentManager,
				this.attachmentModel,
				{
					maxTotalSize: this.options.maxFileSize,
					maxFileCount: this.options.maxFileCount,
					enableAutoValidation: this.options.enableValidation !== false,
					enableMetadataExtraction: true
				}
			)
		);

		// Créer le widget d'upload
		this.uploadWidget = this._register(
			this.instantiationService.createInstance(
				ChatFileUploadWidget,
				this.container,
				{
					allowMultiple: this.options.allowMultiple !== false,
					maxFileSize: this.options.maxFileSize,
					showProgress: this.options.showUploadProgress !== false,
					enableDragDrop: this.options.enableDragDrop !== false
				}
			)
		);

		// Créer le widget de validation
		this.validationWidget = this._register(
			this.instantiationService.createInstance(
				ChatFileValidationWidget,
				this.container,
				{
					showDetails: true,
					allowRetry: true,
					showSuggestions: true,
					compactMode: this.options.compactMode
				}
			)
		);

		this.setupEventHandlers();
		this.loadConfiguration();
		this.updateTheme();

		// Écouter les changements de configuration et de thème
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('chat.fileAttachment')) {
				this.loadConfiguration();
			}
		}));

		this._register(this.themeService.onDidColorThemeChange(() => {
			this.updateTheme();
		}));
	}

	private setupEventHandlers(): void {
		// Gestion des uploads
		this._register(this.uploadWidget.onFilesUploaded(async (event: IFileUploadEvent) => {
			await this.handleFilesUploaded(event.files);
		}));

		this._register(this.uploadWidget.onUploadStarted(() => {
			this.setUploadingState(true);
		}));

		this._register(this.uploadWidget.onUploadError((error: string) => {
			this.setUploadingState(false);
			this.validationWidget.showValidationError('Upload Error', error);
		}));

		// Gestion des validations
		if (this.options.enableValidation !== false) {
			this._register(this.validationService.onValidationComplete((report: IValidationReport) => {
				this.handleValidationReport(report);
			}));

			this._register(this.validationService.onValidationError(({ fileName, error }) => {
				this.validationWidget.showValidationError(fileName, error);
			}));
		}

		this._register(this.validationWidget.onRetryRequested((fileName: string) => {
			this.retryValidation(fileName);
		}));

		this._register(this.validationWidget.onDismissed(() => {
			// Widget fermé par l'utilisateur
		}));

		// Gestion des changements d'attachements
		this._register(this.attachmentManager.onAttachmentsChanged((event) => {
			this._onAttachmentsChanged.fire({
				added: [...event.added],
				removed: [...event.deleted],
				updated: [...event.updated]
			});
		}));

		this._register(this.attachmentManager.onValidationChanged((result) => {
			this._onValidationStateChanged.fire({
				valid: result.valid,
				errors: result.errors
			});
		}));

		this._register(this.attachmentManager.onUploadProgress(({ id, progress }) => {
			const attachment = this.attachmentManager.getEnhancedAttachment(id);
			if (attachment) {
				this._onUploadProgress.fire({
					fileName: attachment.name,
					progress
				});
			}
		}));
	}

	private async handleFilesUploaded(uploadResults: IFileUploadResult[]): Promise<void> {
		this.setUploadingState(false);

		const successfulUploads = uploadResults.filter(r => r.success);
		const failedUploads = uploadResults.filter(r => !r.success);

		if (failedUploads.length > 0) {
			const errors = failedUploads.map(r => r.error).join(', ');
			this.notificationService.error(localize('someUploadsFailed', 'Some file uploads failed: {0}', errors));
		}

		if (successfulUploads.length > 0) {
			// Convertir les résultats d'upload en fichiers File pour la validation
			const filesToValidate: File[] = [];

			for (const result of successfulUploads) {
				if (result.uri && result.metadata) {
					// Créer un objet File-like pour la validation
					const fileProxy = {
						name: result.metadata.originalName,
						size: result.metadata.size,
						type: result.metadata.mimeType,
						lastModified: result.metadata.uploadDate.getTime()
					} as File;

					filesToValidate.push(fileProxy);
				}
			}

			// Valider les fichiers si la validation est activée
			if (this.options.enableValidation !== false && filesToValidate.length > 0) {
				try {
					const validationReports = await this.validationService.validateBatch(filesToValidate);

					for (const report of validationReports) {
						if (!report.overallValid) {
							this.validationWidget.showValidationReport(report);
							return; // Arrêter si un fichier n'est pas valide
						}
					}
				} catch (error) {
					this.notificationService.error(localize('validationFailed', 'File validation failed: {0}', error));
					return;
				}
			}

			// Ajouter les fichiers au gestionnaire d'attachements
			try {
				// Créer des objets File à partir des résultats d'upload pour le gestionnaire
				const files: File[] = successfulUploads.map(result => ({
					name: result.metadata!.originalName,
					size: result.metadata!.size,
					type: result.metadata!.mimeType,
					lastModified: result.metadata!.uploadDate.getTime()
				} as File));

				await this.attachmentManager.addFilesViaUpload(files);

				this.notificationService.info(
					localize('filesAttached', '{0} file(s) successfully attached', successfulUploads.length)
				);

			} catch (error) {
				this.notificationService.error(localize('attachmentFailed', 'Failed to attach files: {0}', error));
			}
		}
	}

	private handleValidationReport(report: IValidationReport): void {
		if (!report.overallValid) {
			this.validationWidget.showValidationReport(report);
		}
	}

	private async retryValidation(fileName: string): Promise<void> {
		// Trouver le fichier et relancer la validation
		const attachments = this.attachmentManager.getEnhancedAttachments();
		const attachment = attachments.find(a => a.name === fileName);

		if (attachment && attachment.uploadResult?.uri) {
			try {
				// Lire le contenu du fichier et relancer la validation
				const fileData = await this.storageService.retrieveFile(attachment.uploadResult.uri.toString());
				if (fileData) {
					const report = await this.validationService.validateContent(
						fileData.content,
						fileName,
						fileData.metadata.mimeType
					);
					this.handleValidationReport(report);
				}
			} catch (error) {
				this.notificationService.error(localize('retryValidationFailed', 'Failed to retry validation: {0}', error));
			}
		}
	}

	private setUploadingState(uploading: boolean): void {
		this.uploadWidget.setEnabled(!uploading);

		if (uploading) {
			this.container.classList.add('uploading');
		} else {
			this.container.classList.remove('uploading');
		}
	}

	private loadConfiguration(): void {
		const config = this.configurationService.getValue<any>('chat.fileAttachment') || {};

		// Mettre à jour les options basées sur la configuration
		if (config.maxFileSize !== undefined) {
			this.options.maxFileSize = config.maxFileSize;
		}

		if (config.maxFileCount !== undefined) {
			this.options.maxFileCount = config.maxFileCount;
		}

		if (config.enableValidation !== undefined) {
			this.options.enableValidation = config.enableValidation;
		}
	}

	private updateTheme(): void {
		// Mise à jour des couleurs selon le thème
		// Mise à jour des couleurs selon le thème
		// Implémentation spécifique au thème si nécessaire
	}

	// API publique

	/**
	 * Activer ou désactiver le composant
	 */
	setEnabled(enabled: boolean): void {
		if (this.isEnabled === enabled) {
			return;
		}

		this.isEnabled = enabled;
		this.uploadWidget.setEnabled(enabled);

		if (enabled) {
			this.container.classList.remove('disabled');
		} else {
			this.container.classList.add('disabled');
		}
	}

	/**
	 * Obtenir tous les attachements actuels
	 */
	getAttachments(): readonly IChatRequestVariableEntry[] {
		return this.attachmentModel.attachments;
	}

	/**
	 * Obtenir les attachements améliorés avec métadonnées
	 */
	getEnhancedAttachments() {
		return this.attachmentManager.getEnhancedAttachments();
	}

	/**
	 * Supprimer un attachement
	 */
	async removeAttachment(id: string): Promise<boolean> {
		return this.attachmentManager.removeAttachment(id);
	}

	/**
	 * Nettoyer tous les attachements
	 */
	async clearAllAttachments(): Promise<void> {
		await this.attachmentManager.clearAllAttachments();
		this.validationWidget.clear();
		this.uploadWidget.reset();
	}

	/**
	 * Obtenir les statistiques des attachements
	 */
	getAttachmentStats() {
		return this.attachmentManager.getAttachmentStats();
	}

	/**
	 * Valider tous les attachements actuels
	 */
	async validateAllAttachments() {
		return this.attachmentManager.validateAllAttachments();
	}

	/**
	 * Définir le mode compact
	 */
	setCompactMode(compact: boolean): void {
		this.options.compactMode = compact;
		this.validationWidget.setCompactMode(compact);

		if (compact) {
			this.container.classList.add('compact');
		} else {
			this.container.classList.remove('compact');
		}
	}

	/**
	 * Afficher ou masquer le composant
	 */
	setVisible(visible: boolean): void {
		if (visible) {
			this.container.style.display = 'block';
		} else {
			this.container.style.display = 'none';
		}
	}

	/**
	 * Réinitialiser le composant
	 */
	reset(): void {
		this.uploadWidget.reset();
		this.validationWidget.clear();
		this.setUploadingState(false);
	}
}
