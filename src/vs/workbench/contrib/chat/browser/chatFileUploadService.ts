/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event, Emitter } from '../../../../base/common/event.js';

export const IChatFileUploadService = createDecorator<IChatFileUploadService>('chatFileUploadService');

export interface IFileUploadOptions {
	maxFileSize?: number;
	allowedExtensions?: string[];
	enableVirusScan?: boolean;
	encryptInTransit?: boolean;
}

export interface IFileUploadResult {
	success: boolean;
	uri?: URI;
	error?: string;
	fileSize?: number;
	mimeType?: string;
	metadata?: IFileMetadata;
}

export interface IFileMetadata {
	originalName: string;
	size: number;
	mimeType: string;
	uploadDate: Date;
	checksum?: string;
	isSecure: boolean;
}

export interface IFileUploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

export interface IChatFileUploadService {
	readonly _serviceBrand: undefined;

	readonly onUploadProgress: Event<IFileUploadProgress>;
	readonly onUploadComplete: Event<IFileUploadResult>;

	/**
	 * Upload a file with security validation
	 */
	uploadFile(file: File, options?: IFileUploadOptions): Promise<IFileUploadResult>;

	/**
	 * Upload multiple files
	 */
	uploadFiles(files: File[], options?: IFileUploadOptions): Promise<IFileUploadResult[]>;

	/**
	 * Validate file before upload
	 */
	validateFile(file: File, options?: IFileUploadOptions): Promise<{ valid: boolean; error?: string }>;

	/**
	 * Get supported file types
	 */
	getSupportedFileTypes(): string[];

	/**
	 * Get maximum file size allowed
	 */
	getMaxFileSize(): number;

	/**
	 * Delete uploaded file
	 */
	deleteFile(uri: URI): Promise<boolean>;
}

export class ChatFileUploadService extends Disposable implements IChatFileUploadService {
	readonly _serviceBrand: undefined;

	private readonly _onUploadProgress = this._register(new Emitter<IFileUploadProgress>());
	readonly onUploadProgress = this._onUploadProgress.event;

	private readonly _onUploadComplete = this._register(new Emitter<IFileUploadResult>());
	readonly onUploadComplete = this._onUploadComplete.event;

	// Configuration par défaut
	private readonly DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	private readonly SUPPORTED_EXTENSIONS = [
		// Documents
		'.txt', '.md', '.pdf', '.doc', '.docx', '.rtf',
		// Images
		'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
		// Code
		'.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs',
		'.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml', '.yml',
		// Archives
		'.zip', '.rar', '.7z', '.tar', '.gz',
		// Autres
		'.csv', '.xlsx', '.xls', '.pptx', '.ppt'
	];

	private readonly DANGEROUS_EXTENSIONS = [
		'.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar', '.app', '.deb', '.rpm'
	];

	constructor(
		@IFileService private readonly fileService: IFileService,
		@INotificationService private readonly notificationService: INotificationService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
	}

	async uploadFile(file: File, options?: IFileUploadOptions): Promise<IFileUploadResult> {
		try {
			// Validation préalable
			const validation = await this.validateFile(file, options);
			if (!validation.valid) {
				return { success: false, error: validation.error };
			}

			// Créer un URI temporaire pour le fichier
			const tempUri = this.createTempFileUri(file.name);

			// Lire le contenu du fichier
			const buffer = await this.readFileAsBuffer(file);

			// Simuler le scan antivirus (en production, intégrer un vrai scanner)
			if (options?.enableVirusScan !== false) {
				const scanResult = await this.performVirusScan(buffer);
				if (!scanResult.clean) {
					return { success: false, error: localize('virusScanFailed', 'File failed virus scan: {0}', scanResult.threat || 'Unknown threat') };
				}
			}

			// Calculer le checksum pour l'intégrité
			const checksum = await this.calculateChecksum(buffer);

			// Écrire le fichier de manière sécurisée
			await this.fileService.writeFile(tempUri, buffer);

			// Créer les métadonnées
			const metadata: IFileMetadata = {
				originalName: file.name,
				size: file.size,
				mimeType: file.type || this.getMimeTypeFromExtension(file.name),
				uploadDate: new Date(),
				checksum,
				isSecure: true
			};

			this._onUploadComplete.fire({
				success: true,
				uri: tempUri,
				fileSize: file.size,
				mimeType: metadata.mimeType,
				metadata
			});

			return {
				success: true,
				uri: tempUri,
				fileSize: file.size,
				mimeType: metadata.mimeType,
				metadata
			};

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.notificationService.error(localize('uploadFailed', 'Failed to upload file: {0}', errorMessage));
			return { success: false, error: errorMessage };
		}
	}

	async uploadFiles(files: File[], options?: IFileUploadOptions): Promise<IFileUploadResult[]> {
		const results: IFileUploadResult[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const result = await this.uploadFile(file, options);
			results.push(result);

			// Émettre le progrès global
			this._onUploadProgress.fire({
				loaded: i + 1,
				total: files.length,
				percentage: Math.round(((i + 1) / files.length) * 100)
			});
		}

		return results;
	}

	async validateFile(file: File, options?: IFileUploadOptions): Promise<{ valid: boolean; error?: string }> {
		// Vérifier la taille
		const maxSize = options?.maxFileSize || this.getMaxFileSize();
		if (file.size > maxSize) {
			return {
				valid: false,
				error: localize('fileTooLarge', 'File size ({0} MB) exceeds maximum allowed size ({1} MB)',
					Math.round(file.size / (1024 * 1024)), Math.round(maxSize / (1024 * 1024)))
			};
		}

		// Vérifier l'extension
		const extension = this.getFileExtension(file.name);
		const allowedExtensions = options?.allowedExtensions || this.getSupportedFileTypes();

		if (!allowedExtensions.includes(extension)) {
			return {
				valid: false,
				error: localize('unsupportedFileType', 'File type "{0}" is not supported', extension)
			};
		}

		// Vérifier les extensions dangereuses
		if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
			return {
				valid: false,
				error: localize('dangerousFileType', 'File type "{0}" is not allowed for security reasons', extension)
			};
		}

		// Vérifier le nom de fichier
		if (!this.isValidFileName(file.name)) {
			return {
				valid: false,
				error: localize('invalidFileName', 'Invalid file name. Please use only alphanumeric characters, spaces, hyphens, and underscores.')
			};
		}

		return { valid: true };
	}

	getSupportedFileTypes(): string[] {
		return [...this.SUPPORTED_EXTENSIONS];
	}

	getMaxFileSize(): number {
		return this.configurationService.getValue<number>('chat.maxFileUploadSize') || this.DEFAULT_MAX_FILE_SIZE;
	}

	async deleteFile(uri: URI): Promise<boolean> {
		try {
			await this.fileService.del(uri);
			return true;
		} catch (error) {
			this.notificationService.error(localize('deleteFailed', 'Failed to delete file: {0}', error));
			return false;
		}
	}

	private createTempFileUri(fileName: string): URI {
		const sanitizedName = this.sanitizeFileName(fileName);
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 15);
		return URI.from({
			scheme: 'vscode-chat-upload',
			path: `/temp/${timestamp}_${randomId}_${sanitizedName}`
		});
	}

	private async readFileAsBuffer(file: File): Promise<VSBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const arrayBuffer = reader.result as ArrayBuffer;
				resolve(VSBuffer.wrap(new Uint8Array(arrayBuffer)));
			};
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});
	}

	private async performVirusScan(buffer: VSBuffer): Promise<{ clean: boolean; threat?: string }> {
		// Simulation d'un scan antivirus
		// En production, intégrer avec un vrai service antivirus

		// Vérifier les signatures basiques de malware
		const content = buffer.toString();
		const suspiciousPatterns = [
			/eval\s*\(/gi,
			/document\.write\s*\(/gi,
			/window\.location\s*=/gi,
			/<script[^>]*>.*<\/script>/gi
		];

		for (const pattern of suspiciousPatterns) {
			if (pattern.test(content)) {
				return { clean: false, threat: 'Suspicious script content detected' };
			}
		}

		return { clean: true };
	}

	private async calculateChecksum(buffer: VSBuffer): Promise<string> {
		// Calcul simple d'un hash pour l'intégrité
		const crypto = globalThis.crypto;
		if (crypto && crypto.subtle) {
			const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.buffer);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		}

		// Fallback simple
		let hash = 0;
		const str = buffer.toString();
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString(16);
	}

	private getFileExtension(fileName: string): string {
		const lastDot = fileName.lastIndexOf('.');
		return lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : '';
	}

	private getMimeTypeFromExtension(fileName: string): string {
		const extension = this.getFileExtension(fileName);
		const mimeTypes: { [key: string]: string } = {
			'.txt': 'text/plain',
			'.md': 'text/markdown',
			'.pdf': 'application/pdf',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.js': 'application/javascript',
			'.ts': 'application/typescript',
			'.json': 'application/json',
			'.xml': 'application/xml',
			'.csv': 'text/csv'
		};
		return mimeTypes[extension] || 'application/octet-stream';
	}

	private isValidFileName(fileName: string): boolean {
		// Vérifier les caractères autorisés
		const validPattern = /^[a-zA-Z0-9\s\-_\.]+$/;
		return validPattern.test(fileName) && fileName.length <= 255;
	}

	private sanitizeFileName(fileName: string): string {
		// Nettoyer le nom de fichier
		return fileName.replace(/[^a-zA-Z0-9\s\-_\.]/g, '_').substring(0, 255);
	}
}
