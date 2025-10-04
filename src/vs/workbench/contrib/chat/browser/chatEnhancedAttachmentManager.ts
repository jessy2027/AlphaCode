/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ChatAttachmentModel, IChatAttachmentChangeEvent } from './chatAttachmentModel.js';
import { IChatFileUploadService, IFileUploadResult, IFileMetadata } from './chatFileUploadService.js';
// Interface pour les attachements améliorés

export interface IEnhancedAttachmentEntry {
	id: string;
	name: string;
	kind: 'file' | 'image' | 'context';
	value: any;
	metadata?: IFileMetadata;
	uploadResult?: IFileUploadResult;
	isUploaded?: boolean;
	uploadProgress?: number;
}

export interface IAttachmentValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export interface IAttachmentManagerOptions {
	maxTotalSize?: number;
	maxFileCount?: number;
	enableAutoValidation?: boolean;
	enableMetadataExtraction?: boolean;
}

export class ChatEnhancedAttachmentManager extends Disposable {
	private readonly _onAttachmentsChanged = this._register(new Emitter<IChatAttachmentChangeEvent>());
	readonly onAttachmentsChanged = this._onAttachmentsChanged.event;

	private readonly _onValidationChanged = this._register(new Emitter<IAttachmentValidationResult>());
	readonly onValidationChanged = this._onValidationChanged.event;

	private readonly _onUploadProgress = this._register(new Emitter<{ id: string; progress: number }>());
	readonly onUploadProgress = this._onUploadProgress.event;

	private readonly attachmentModel: ChatAttachmentModel;
	private readonly enhancedAttachments = new Map<string, IEnhancedAttachmentEntry>();
	private totalSize = 0;

	constructor(
		attachmentModel: ChatAttachmentModel,
		private readonly options: IAttachmentManagerOptions = {},
		@IChatFileUploadService private readonly fileUploadService: IChatFileUploadService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService
	) {
		super();
		
		this.attachmentModel = attachmentModel;
		
		// Écouter les changements du modèle d'attachement existant
		this._register(this.attachmentModel.onDidChange(e => {
			this.handleAttachmentModelChange(e);
		}));

		// Écouter les événements d'upload
		this._register(this.fileUploadService.onUploadProgress(progress => {
			// Mettre à jour le progrès pour tous les fichiers en cours d'upload
			this.updateUploadProgress(progress);
		}));

		this._register(this.fileUploadService.onUploadComplete(result => {
			this.handleUploadComplete(result);
		}));
	}

	/**
	 * Ajouter des fichiers via upload
	 */
	async addFilesViaUpload(files: File[]): Promise<IFileUploadResult[]> {
		// Validation préalable
		const validation = await this.validateFilesForUpload(files);
		if (!validation.valid) {
			this.notificationService.error(localize('uploadValidationFailed', 'Upload validation failed: {0}', validation.errors.join(', ')));
			return [];
		}

		try {
			// Upload des fichiers
			const results = await this.fileUploadService.uploadFiles(files, {
				maxFileSize: this.options.maxTotalSize ? Math.floor(this.options.maxTotalSize / files.length) : undefined,
				enableVirusScan: true,
				encryptInTransit: true
			});

			// Traiter les résultats
			const successfulUploads: IFileUploadResult[] = [];
			for (const result of results) {
				if (result.success && result.uri) {
					// Créer une entrée d'attachement améliorée
					const enhancedEntry = await this.createEnhancedAttachmentEntry(result);
					this.enhancedAttachments.set(enhancedEntry.id, enhancedEntry);
					
					// Ajouter au modèle d'attachement existant
					this.attachmentModel.addFile(result.uri);
					
					successfulUploads.push(result);
					this.totalSize += result.fileSize || 0;
				}
			}

			// Validation post-upload
			if (this.options.enableAutoValidation !== false) {
				await this.validateAllAttachments();
			}

			return successfulUploads;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.notificationService.error(localize('uploadFailed', 'File upload failed: {0}', errorMessage));
			return [];
		}
	}

	/**
	 * Supprimer un attachement
	 */
	async removeAttachment(id: string): Promise<boolean> {
		const enhancedEntry = this.enhancedAttachments.get(id);
		if (!enhancedEntry) {
			return false;
		}

		try {
			// Supprimer le fichier uploadé si nécessaire
			if (enhancedEntry.isUploaded && enhancedEntry.uploadResult?.uri) {
				await this.fileUploadService.deleteFile(enhancedEntry.uploadResult.uri);
			}

			// Supprimer du modèle d'attachement
			this.attachmentModel.delete(id);
			
			// Supprimer de notre cache
			this.enhancedAttachments.delete(id);
			
			// Mettre à jour la taille totale
			if (enhancedEntry.uploadResult?.fileSize) {
				this.totalSize -= enhancedEntry.uploadResult.fileSize;
			}

			return true;

		} catch (error) {
			this.notificationService.error(localize('removeFailed', 'Failed to remove attachment: {0}', error));
			return false;
		}
	}

	/**
	 * Obtenir tous les attachements améliorés
	 */
	getEnhancedAttachments(): IEnhancedAttachmentEntry[] {
		return Array.from(this.enhancedAttachments.values());
	}

	/**
	 * Obtenir un attachement spécifique
	 */
	getEnhancedAttachment(id: string): IEnhancedAttachmentEntry | undefined {
		return this.enhancedAttachments.get(id);
	}

	/**
	 * Valider tous les attachements
	 */
	async validateAllAttachments(): Promise<IAttachmentValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Vérifier le nombre total de fichiers
		const attachmentCount = this.enhancedAttachments.size;
		if (this.options.maxFileCount && attachmentCount > this.options.maxFileCount) {
			errors.push(localize('tooManyFiles', 'Too many files attached ({0}). Maximum allowed: {1}', attachmentCount, this.options.maxFileCount));
		}

		// Vérifier la taille totale
		if (this.options.maxTotalSize && this.totalSize > this.options.maxTotalSize) {
			errors.push(localize('totalSizeTooLarge', 'Total attachment size ({0} MB) exceeds limit ({1} MB)', 
				Math.round(this.totalSize / (1024 * 1024)), 
				Math.round(this.options.maxTotalSize / (1024 * 1024))));
		}

		// Vérifier chaque attachement individuellement
		for (const attachment of this.enhancedAttachments.values()) {
			const attachmentValidation = await this.validateSingleAttachment(attachment);
			errors.push(...attachmentValidation.errors);
			warnings.push(...attachmentValidation.warnings);
		}

		const result: IAttachmentValidationResult = {
			valid: errors.length === 0,
			errors,
			warnings
		};

		this._onValidationChanged.fire(result);
		return result;
	}

	/**
	 * Obtenir les statistiques des attachements
	 */
	getAttachmentStats(): {
		count: number;
		totalSize: number;
		types: { [type: string]: number };
		uploadedCount: number;
	} {
		const types: { [type: string]: number } = {};
		let uploadedCount = 0;

		for (const attachment of this.enhancedAttachments.values()) {
			if (attachment.metadata?.mimeType) {
				const type = attachment.metadata.mimeType.split('/')[0];
				types[type] = (types[type] || 0) + 1;
			}
			
			if (attachment.isUploaded) {
				uploadedCount++;
			}
		}

		return {
			count: this.enhancedAttachments.size,
			totalSize: this.totalSize,
			types,
			uploadedCount
		};
	}

	/**
	 * Nettoyer tous les attachements
	 */
	async clearAllAttachments(): Promise<void> {
		const attachmentIds = Array.from(this.enhancedAttachments.keys());
		
		for (const id of attachmentIds) {
			await this.removeAttachment(id);
		}

		this.attachmentModel.clear(true);
		this.enhancedAttachments.clear();
		this.totalSize = 0;
	}

	private async validateFilesForUpload(files: File[]): Promise<IAttachmentValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Vérifier le nombre de fichiers
		const currentCount = this.enhancedAttachments.size;
		const newCount = currentCount + files.length;
		
		if (this.options.maxFileCount && newCount > this.options.maxFileCount) {
			errors.push(localize('wouldExceedFileLimit', 'Adding these files would exceed the maximum file limit ({0})', this.options.maxFileCount));
		}

		// Vérifier la taille totale
		const newTotalSize = this.totalSize + files.reduce((sum, file) => sum + file.size, 0);
		if (this.options.maxTotalSize && newTotalSize > this.options.maxTotalSize) {
			errors.push(localize('wouldExceedSizeLimit', 'Adding these files would exceed the total size limit'));
		}

		// Valider chaque fichier individuellement
		for (const file of files) {
			const validation = await this.fileUploadService.validateFile(file);
			if (!validation.valid) {
				errors.push(`${file.name}: ${validation.error}`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	}

	private async validateSingleAttachment(attachment: IEnhancedAttachmentEntry): Promise<IAttachmentValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Vérifier l'intégrité du fichier si uploadé
		if (attachment.isUploaded && attachment.uploadResult?.uri && attachment.metadata?.checksum) {
			try {
				const fileExists = await this.fileService.exists(attachment.uploadResult.uri);
				if (!fileExists) {
					errors.push(localize('fileNotFound', 'Uploaded file no longer exists: {0}', attachment.name));
				}
			} catch (error) {
				warnings.push(localize('fileCheckFailed', 'Could not verify file integrity: {0}', attachment.name));
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	private async createEnhancedAttachmentEntry(uploadResult: IFileUploadResult): Promise<IEnhancedAttachmentEntry> {
		const baseEntry = this.attachmentModel.asFileVariableEntry(uploadResult.uri!);
		
		return {
			...baseEntry,
			metadata: uploadResult.metadata,
			uploadResult,
			isUploaded: true,
			uploadProgress: 100
		};
	}

	private handleAttachmentModelChange(event: IChatAttachmentChangeEvent): void {
		// Synchroniser avec notre cache d'attachements améliorés
		for (const deletedId of event.deleted) {
			this.enhancedAttachments.delete(deletedId);
		}

		// Propager l'événement
		this._onAttachmentsChanged.fire(event);
	}

	private updateUploadProgress(progress: { loaded: number; total: number; percentage: number }): void {
		// Mettre à jour le progrès pour tous les attachements en cours d'upload
		for (const [id, attachment] of this.enhancedAttachments) {
			if (attachment.isUploaded === false) {
				attachment.uploadProgress = progress.percentage;
				this._onUploadProgress.fire({ id, progress: progress.percentage });
			}
		}
	}

	private handleUploadComplete(result: IFileUploadResult): void {
		// Trouver l'attachement correspondant et mettre à jour son statut
		for (const [id, attachment] of this.enhancedAttachments) {
			if (attachment.uploadResult?.uri?.toString() === result.uri?.toString()) {
				attachment.isUploaded = result.success;
				attachment.uploadProgress = result.success ? 100 : 0;
				this._onUploadProgress.fire({ id, progress: attachment.uploadProgress });
				break;
			}
		}
	}
}
