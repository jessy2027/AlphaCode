/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { hashAsync } from '../../../../base/common/hash.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileEmbeddingService } from '../common/fileEmbeddingService.js';
import {
	IAlphaCodeFileAttachmentService,
	IFileAttachment,
	IFileAttachmentSecurityConfig,
	IFileValidationResult,
	IFileUploadEvent,
	AttachmentFileType,
} from '../common/fileAttachmentService.js';
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from '../../../../platform/storage/common/storage.js';

const STORAGE_KEY_ATTACHMENTS = 'alphacode.chat.attachments';
const STORAGE_KEY_SECURITY_CONFIG = 'alphacode.chat.attachments.security';

// Configuration par défaut
const DEFAULT_SECURITY_CONFIG: IFileAttachmentSecurityConfig = {
	maxFileSize: 10 * 1024 * 1024, // 10 MB
	maxFilesPerMessage: 5,
	allowedMimeTypes: Object.values(AttachmentFileType),
	blockedExtensions: ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.scr', '.com', '.pif'],
	enableAntivirusScan: false, // Désactivé par défaut car nécessite intégration système
	requireEncryption: true,
};

interface IStoredAttachmentMetadata {
	[fileId: string]: IFileAttachment & { messageId: string };
}

export class AlphaCodeFileAttachmentService
	extends Disposable
	implements IAlphaCodeFileAttachmentService
{
	declare readonly _serviceBrand: undefined;

	private readonly _onDidUploadFile = this._register(
		new Emitter<IFileUploadEvent>(),
	);
	readonly onDidUploadFile: Event<IFileUploadEvent> = this._onDidUploadFile.event;

	private readonly _onDidDeleteFile = this._register(new Emitter<string>());
	readonly onDidDeleteFile: Event<string> = this._onDidDeleteFile.event;

	private securityConfig: IFileAttachmentSecurityConfig;
	private attachmentsMetadata: IStoredAttachmentMetadata = {};
	private readonly storageRoot: URI;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IStorageService private readonly storageService: IStorageService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IFileEmbeddingService private readonly embeddingService: IFileEmbeddingService,
	) {
		super();

		// Charger la configuration de sécurité
		const savedConfig = this.storageService.get(
			STORAGE_KEY_SECURITY_CONFIG,
			StorageScope.APPLICATION,
		);
		this.securityConfig = savedConfig
			? { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(savedConfig) }
			: DEFAULT_SECURITY_CONFIG;

		// Charger les métadonnées des fichiers
		const savedMetadata = this.storageService.get(
			STORAGE_KEY_ATTACHMENTS,
			StorageScope.APPLICATION,
		);
		this.attachmentsMetadata = savedMetadata ? JSON.parse(savedMetadata) : {};

		// Reconstituer les URIs (ils sont sérialisés en strings)
		Object.keys(this.attachmentsMetadata).forEach((key) => {
			const attachment = this.attachmentsMetadata[key];
			if (typeof attachment.uri === 'string') {
				attachment.uri = URI.parse(attachment.uri as any);
			}
		});

		// Créer le répertoire de stockage dans le dossier utilisateur de VS Code
		this.storageRoot = URI.joinPath(
			this.environmentService.userRoamingDataHome,
			'alphacode',
			'attachments'
		);
		this.ensureStorageDirectory();
	}

	private async ensureStorageDirectory(): Promise<void> {
		try {
			await this.fileService.createFolder(this.storageRoot);
		} catch (error) {
			// Le dossier existe déjà
		}
	}

	getSecurityConfig(): IFileAttachmentSecurityConfig {
		return { ...this.securityConfig };
	}

	updateSecurityConfig(config: Partial<IFileAttachmentSecurityConfig>): void {
		this.securityConfig = { ...this.securityConfig, ...config };
		this.storageService.store(
			STORAGE_KEY_SECURITY_CONFIG,
			JSON.stringify(this.securityConfig),
			StorageScope.APPLICATION,
			StorageTarget.USER,
		);
	}

	async validateFile(file: File): Promise<IFileValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Vérifier la taille du fichier
		if (file.size > this.securityConfig.maxFileSize) {
			errors.push(
				localize(
					'fileTooLarge',
					'Le fichier "{0}" dépasse la taille maximale autorisée de {1} MB',
					file.name,
					(this.securityConfig.maxFileSize / (1024 * 1024)).toFixed(2),
				),
			);
		}

		// Vérifier le type MIME
		if (!this.securityConfig.allowedMimeTypes.includes(file.type)) {
			errors.push(
				localize(
					'unsupportedFileType',
					'Le type de fichier "{0}" n\'est pas supporté',
					file.type || 'inconnu',
				),
			);
		}

		// Vérifier l'extension du fichier
		const extension = this.getFileExtension(file.name);
		if (this.securityConfig.blockedExtensions.includes(extension)) {
			errors.push(
				localize(
					'blockedExtension',
					'L\'extension "{0}" est bloquée pour des raisons de sécurité',
					extension,
				),
			);
		}

		// Vérifier le nom du fichier
		if (!this.isValidFileName(file.name)) {
			errors.push(
				localize(
					'invalidFileName',
					'Le nom du fichier contient des caractères non autorisés',
				),
			);
		}

		// Avertissements pour les gros fichiers
		if (file.size > this.securityConfig.maxFileSize * 0.8) {
			warnings.push(
				localize(
					'largeFile',
					'Ce fichier est volumineux et peut prendre du temps à télécharger',
				),
			);
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
			warnings: warnings.length > 0 ? warnings : undefined,
		};
	}

	async uploadFile(file: File, messageId: string): Promise<IFileAttachment> {
		const uploadId = generateUuid();

		try {
			// Émettre l'événement de début d'upload
			this._onDidUploadFile.fire({
				uploadId,
				fileName: file.name,
				progress: 0,
				status: 'uploading',
			});

			// Valider le fichier
			const validation = await this.validateFile(file);
			if (!validation.valid) {
				throw new Error(validation.errors?.join(', '));
			}

			// Lire le fichier
			const buffer = await this.readFileAsBuffer(file);

			// Calculer le hash pour l'intégrité
			const fileHash = await this.calculateHash(buffer);

			// Générer un ID unique et créer l'URI de stockage
			const fileId = generateUuid();
			const fileUri = URI.joinPath(
				this.storageRoot,
				`${fileId}_${this.sanitizeFileName(file.name)}`,
			);

			// Émettre la progression
			this._onDidUploadFile.fire({
				uploadId,
				fileName: file.name,
				progress: 50,
				status: 'processing',
			});

			// Écrire le fichier sur le disque
			await this.fileService.writeFile(fileUri, VSBuffer.wrap(buffer));

			// Générer une URL de prévisualisation pour les images
			let previewUrl: string | undefined;
			if (file.type.startsWith('image/')) {
				previewUrl = await this.generateImagePreview(buffer, file.type);
			}
			
			// Extraire le contenu pour l'IA
			const extraction = await this.embeddingService.processFileForAI(
				buffer,
				file.type,
				file.name
			).catch(() => undefined);

			// Créer les métadonnées
			const attachment: IFileAttachment = {
				id: fileId,
				name: file.name,
				mimeType: file.type,
				size: file.size,
				uri: fileUri,
				uploadedAt: Date.now(),
				hash: fileHash,
				scanStatus: this.securityConfig.enableAntivirusScan ? 'pending' : 'clean',
				previewUrl,
				metadata: {},
				extractedContent: extraction ? {
					text: extraction.text,
					summary: extraction.summary,
					language: extraction.metadata.language,
				} : undefined,
			};

			// Sauvegarder les métadonnées
			this.attachmentsMetadata[fileId] = { ...attachment, messageId };
			this.saveMetadata();

			// Scanner le fichier si activé
			if (this.securityConfig.enableAntivirusScan) {
				this.scanFile(fileId, buffer).catch((error) => {
					console.error('Erreur lors du scan antivirus:', error);
				});
			}

			// Émettre l'événement de fin d'upload
			this._onDidUploadFile.fire({
				uploadId,
				fileName: file.name,
				progress: 100,
				status: 'complete',
			});

			return attachment;
		} catch (error) {
			this._onDidUploadFile.fire({
				uploadId,
				fileName: file.name,
				progress: 0,
				status: 'error',
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	async uploadFiles(files: File[], messageId: string): Promise<IFileAttachment[]> {
		// Vérifier le nombre de fichiers
		if (files.length > this.securityConfig.maxFilesPerMessage) {
			throw new Error(
				localize(
					'tooManyFiles',
					'Vous ne pouvez pas attacher plus de {0} fichiers par message',
					this.securityConfig.maxFilesPerMessage,
				),
			);
		}

		// Uploader tous les fichiers en parallèle
		const uploads = files.map((file) => this.uploadFile(file, messageId));
		return Promise.all(uploads);
	}

	async getFile(fileId: string): Promise<IFileAttachment | undefined> {
		const stored = this.attachmentsMetadata[fileId];
		if (!stored) {
			return undefined;
		}

		// Retourner une copie sans le messageId interne
		const { messageId, ...attachment } = stored;
		return attachment;
	}

	async getFilesByMessage(messageId: string): Promise<IFileAttachment[]> {
		const files = Object.values(this.attachmentsMetadata)
			.filter((attachment) => attachment.messageId === messageId)
			.map(({ messageId, ...attachment }) => attachment);
		return files;
	}

	async deleteFile(fileId: string): Promise<void> {
		const attachment = this.attachmentsMetadata[fileId];
		if (!attachment) {
			return;
		}

		try {
			// Supprimer le fichier du disque
			await this.fileService.del(attachment.uri);

			// Supprimer les métadonnées
			delete this.attachmentsMetadata[fileId];
			this.saveMetadata();

			// Émettre l'événement
			this._onDidDeleteFile.fire(fileId);
		} catch (error) {
			console.error('Erreur lors de la suppression du fichier:', error);
			throw error;
		}
	}

	async deleteFilesByMessage(messageId: string): Promise<void> {
		const fileIds = Object.keys(this.attachmentsMetadata).filter(
			(fileId) => this.attachmentsMetadata[fileId].messageId === messageId,
		);

		await Promise.all(fileIds.map((fileId) => this.deleteFile(fileId)));
	}

	async getFileContent(fileId: string): Promise<Uint8Array> {
		const attachment = this.attachmentsMetadata[fileId];
		if (!attachment) {
			throw new Error(localize('fileNotFound', 'Fichier non trouvé'));
		}

		const content = await this.fileService.readFile(attachment.uri);
		return content.value.buffer;
	}

	async getDownloadUrl(fileId: string): Promise<string> {
		const attachment = this.attachmentsMetadata[fileId];
		if (!attachment) {
			throw new Error(localize('fileNotFound', 'Fichier non trouvé'));
		}

		// Dans un environnement réel, on générerait une URL signée temporaire
		// Pour l'instant, on retourne l'URI du fichier
		return attachment.uri.toString();
	}

	async cleanupOrphanedFiles(): Promise<number> {
		// Cette fonction devrait être appelée périodiquement pour nettoyer
		// les fichiers qui ne sont plus référencés par aucun message
		// Pour l'instant, on retourne 0 (implémentation simplifiée)
		return 0;
	}

	async getUsageStats(): Promise<{
		totalFiles: number;
		totalSize: number;
		filesByType: Record<string, number>;
	}> {
		const attachments = Object.values(this.attachmentsMetadata);
		const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
		const filesByType: Record<string, number> = {};

		attachments.forEach((att) => {
			filesByType[att.mimeType] = (filesByType[att.mimeType] || 0) + 1;
		});

		return {
			totalFiles: attachments.length,
			totalSize,
			filesByType,
		};
	}

	// Méthodes privées utilitaires

	private getFileExtension(fileName: string): string {
		const lastDot = fileName.lastIndexOf('.');
		return lastDot >= 0 ? fileName.substring(lastDot) : '';
	}

	private isValidFileName(fileName: string): boolean {
		// Vérifier que le nom ne contient pas de caractères dangereux
		const invalidChars = /[<>:"|?*\x00-\x1F]/;
		return !invalidChars.test(fileName);
	}

	private sanitizeFileName(fileName: string): string {
		// Remplacer les caractères dangereux par des underscores
		return fileName.replace(/[<>:"|?*\x00-\x1F]/g, '_');
	}

	private async readFileAsBuffer(file: File): Promise<Uint8Array> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const arrayBuffer = reader.result as ArrayBuffer;
				resolve(new Uint8Array(arrayBuffer));
			};
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});
	}

	private async calculateHash(buffer: Uint8Array): Promise<string> {
		// Utiliser le système de hash de VS Code (SHA-1)
		return await hashAsync(buffer);
	}

	private async generateImagePreview(
		buffer: Uint8Array,
		mimeType: string,
	): Promise<string> {
		// Créer une URL de données pour la prévisualisation
		const base64 = this.bufferToBase64(buffer);
		return `data:${mimeType};base64,${base64}`;
	}

	private bufferToBase64(buffer: Uint8Array): string {
		let binary = '';
		for (let i = 0; i < buffer.length; i++) {
			binary += String.fromCharCode(buffer[i]);
		}
		return btoa(binary);
	}

	private async scanFile(fileId: string, buffer: Uint8Array): Promise<void> {
		// Simulation d'un scan antivirus
		// Dans un environnement de production, intégrer avec un service antivirus réel
		// (ex: Windows Defender API, ClamAV, etc.)

		try {
			// Simuler un délai de scan
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Mettre à jour le statut
			const attachment = this.attachmentsMetadata[fileId];
			if (attachment) {
				attachment.scanStatus = 'clean';
				this.saveMetadata();
			}
		} catch (error) {
			const attachment = this.attachmentsMetadata[fileId];
			if (attachment) {
				attachment.scanStatus = 'error';
				this.saveMetadata();
			}
		}
	}

	private saveMetadata(): void {
		// Sérialiser les métadonnées en convertissant les URIs en strings
		const serializable: any = {};
		Object.keys(this.attachmentsMetadata).forEach((key) => {
			const attachment = this.attachmentsMetadata[key];
			serializable[key] = {
				...attachment,
				uri: attachment.uri.toString(),
			};
		});

		this.storageService.store(
			STORAGE_KEY_ATTACHMENTS,
			JSON.stringify(serializable),
			StorageScope.APPLICATION,
			StorageTarget.USER,
		);
	}
}
