/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import {
	IChatFileStorageService,
	IStoredFileMetadata,
	IFileStorageOptions,
	IStorageQuota,
	IFileStorageConfig,
	ISecurityHooks
} from '../common/chatFileStorageService.js';

export class ChatFileStorageServiceImpl extends Disposable implements IChatFileStorageService {
	readonly _serviceBrand: undefined;

	private readonly _onFileStored = this._register(new Emitter<IStoredFileMetadata>());
	readonly onFileStored = this._onFileStored.event;

	private readonly _onFileDeleted = this._register(new Emitter<string>());
	readonly onFileDeleted = this._onFileDeleted.event;

	private readonly _onQuotaChanged = this._register(new Emitter<IStorageQuota>());
	readonly onQuotaChanged = this._onQuotaChanged.event;

	private readonly STORAGE_KEY = 'chat.fileStorage.metadata';
	private readonly STORAGE_ROOT = 'vscode-chat-files';
	
	private fileMetadataCache = new Map<string, IStoredFileMetadata>();
	private config: IFileStorageConfig;
	private securityHooks?: ISecurityHooks;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IStorageService private readonly storageService: IStorageService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();

		this.config = this.loadConfiguration();
		this.loadMetadataCache();
		
		// Nettoyer les fichiers expirés au démarrage
		this.scheduleCleanup();

		// Écouter les changements de configuration
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('chat.fileStorage')) {
				this.config = this.loadConfiguration();
			}
		}));
	}

	async storeFile(
		content: VSBuffer,
		metadata: Omit<IStoredFileMetadata, 'id' | 'uploadDate'>,
		options?: IFileStorageOptions
	): Promise<IStoredFileMetadata> {
		const id = generateUuid();
		const now = new Date();

		const fullMetadata: IStoredFileMetadata = {
			...metadata,
			id,
			uploadDate: now,
			lastAccessed: now,
			isEncrypted: options?.encrypt ?? this.config.enableEncryption,
			retentionPolicy: options?.retentionPolicy || {
				maxAge: this.config.defaultRetentionDays * 24 * 60 * 60 * 1000,
				autoDelete: true
			},
			accessPermissions: options?.accessPermissions,
			tags: options?.tags || []
		};

		// Validation de sécurité
		if (this.securityHooks?.validateBeforeStore) {
			const isValid = await this.securityHooks.validateBeforeStore(content, fullMetadata);
			if (!isValid) {
				throw new Error('Security validation failed');
			}
		}

		// Vérifier les quotas
		const quota = await this.getQuotaInfo();
		if (quota.used + content.byteLength > quota.total) {
			throw new Error('Storage quota exceeded');
		}

		if (quota.maxFileCount && quota.fileCount >= quota.maxFileCount) {
			throw new Error('Maximum file count exceeded');
		}

		// Traitement du contenu
		let processedContent = content;

		// Chiffrement
		if (fullMetadata.isEncrypted && this.securityHooks?.encryptContent) {
			processedContent = await this.securityHooks.encryptContent(processedContent);
		}

		// Compression
		if (options?.compress ?? this.config.enableCompression) {
			processedContent = await this.compressContent(processedContent);
		}

		// Stockage du fichier
		const fileUri = this.getFileUri(id);
		await this.fileService.writeFile(fileUri, processedContent);

		// Mise à jour des métadonnées
		this.fileMetadataCache.set(id, fullMetadata);
		await this.saveMetadataCache();

		// Audit
		if (this.securityHooks?.auditAccess) {
			await this.securityHooks.auditAccess('store', id);
		}

		this.logService.info(`File stored: ${id} (${fullMetadata.originalName})`);
		this._onFileStored.fire(fullMetadata);
		this._onQuotaChanged.fire(await this.getQuotaInfo());

		return fullMetadata;
	}

	async retrieveFile(id: string): Promise<{ content: VSBuffer; metadata: IStoredFileMetadata } | undefined> {
		const metadata = this.fileMetadataCache.get(id);
		if (!metadata) {
			return undefined;
		}

		// Validation de sécurité
		if (this.securityHooks?.validateBeforeRetrieve) {
			const isValid = await this.securityHooks.validateBeforeRetrieve(id);
			if (!isValid) {
				throw new Error('Access denied');
			}
		}

		// Vérifier les permissions d'accès
		if (metadata.accessPermissions?.expiresAt && metadata.accessPermissions.expiresAt < new Date()) {
			throw new Error('File access has expired');
		}

		const fileUri = this.getFileUri(id);
		
		try {
			const fileContent = await this.fileService.readFile(fileUri);
			let content = fileContent.value;

			// Décompression
			if (this.config.enableCompression) {
				content = await this.decompressContent(content);
			}

			// Déchiffrement
			if (metadata.isEncrypted && this.securityHooks?.decryptContent) {
				content = await this.securityHooks.decryptContent(content);
			}

			// Mettre à jour la date de dernier accès
			metadata.lastAccessed = new Date();
			this.fileMetadataCache.set(id, metadata);
			await this.saveMetadataCache();

			// Audit
			if (this.securityHooks?.auditAccess) {
				await this.securityHooks.auditAccess('retrieve', id);
			}

			return {
				content,
				metadata
			};

		} catch (error) {
			this.logService.error(`Failed to retrieve file ${id}:`, error);
			return undefined;
		}
	}

	async getFileMetadata(id: string): Promise<IStoredFileMetadata | undefined> {
		return this.fileMetadataCache.get(id);
	}

	async listFiles(filter?: {
		tags?: string[];
		mimeType?: string;
		dateRange?: { from: Date; to: Date };
		maxResults?: number;
	}): Promise<IStoredFileMetadata[]> {
		let files = Array.from(this.fileMetadataCache.values());

		// Appliquer les filtres
		if (filter) {
			if (filter.tags && filter.tags.length > 0) {
				files = files.filter(f => 
					filter.tags!.some(tag => f.tags?.includes(tag))
				);
			}

			if (filter.mimeType) {
				files = files.filter(f => f.mimeType === filter.mimeType);
			}

			if (filter.dateRange) {
				files = files.filter(f => 
					f.uploadDate >= filter.dateRange!.from && 
					f.uploadDate <= filter.dateRange!.to
				);
			}

			if (filter.maxResults) {
				files = files.slice(0, filter.maxResults);
			}
		}

		return files;
	}

	async deleteFile(id: string): Promise<boolean> {
		const metadata = this.fileMetadataCache.get(id);
		if (!metadata) {
			return false;
		}

		try {
			const fileUri = this.getFileUri(id);
			await this.fileService.del(fileUri);
			
			this.fileMetadataCache.delete(id);
			await this.saveMetadataCache();

			// Audit
			if (this.securityHooks?.auditAccess) {
				await this.securityHooks.auditAccess('delete', id);
			}

			this.logService.info(`File deleted: ${id} (${metadata.originalName})`);
			this._onFileDeleted.fire(id);
			this._onQuotaChanged.fire(await this.getQuotaInfo());

			return true;

		} catch (error) {
			this.logService.error(`Failed to delete file ${id}:`, error);
			return false;
		}
	}

	async cleanupExpiredFiles(): Promise<number> {
		const now = new Date();
		let deletedCount = 0;

		for (const [id, metadata] of this.fileMetadataCache) {
			let shouldDelete = false;

			// Vérifier la politique de rétention
			if (metadata.retentionPolicy?.autoDelete) {
				if (metadata.retentionPolicy.maxAge) {
					const ageMs = now.getTime() - metadata.uploadDate.getTime();
					if (ageMs > metadata.retentionPolicy.maxAge) {
						shouldDelete = true;
					}
				}

				if (metadata.retentionPolicy.maxAccessCount && metadata.lastAccessed) {
					// Logique pour compter les accès (nécessiterait un compteur séparé)
				}
			}

			// Vérifier l'expiration des permissions
			if (metadata.accessPermissions?.expiresAt && metadata.accessPermissions.expiresAt < now) {
				shouldDelete = true;
			}

			if (shouldDelete) {
				const success = await this.deleteFile(id);
				if (success) {
					deletedCount++;
				}
			}
		}

		this.logService.info(`Cleanup completed: ${deletedCount} files deleted`);
		return deletedCount;
	}

	async getQuotaInfo(): Promise<IStorageQuota> {
		let used = 0;
		let fileCount = 0;

		for (const metadata of this.fileMetadataCache.values()) {
			used += metadata.size;
			fileCount++;
		}

		return {
			used,
			total: this.config.maxTotalSize,
			fileCount,
			maxFileCount: this.config.maxFileCount
		};
	}

	async verifyFileIntegrity(id: string): Promise<boolean> {
		const metadata = this.fileMetadataCache.get(id);
		if (!metadata) {
			return false;
		}

		try {
			const fileUri = this.getFileUri(id);
			const stat = await this.fileService.stat(fileUri);
			
			// Vérifier la taille
			if (stat.size !== metadata.size) {
				this.logService.warn(`File size mismatch for ${id}: expected ${metadata.size}, got ${stat.size}`);
				return false;
			}

			// Vérifier le checksum si disponible
			if (metadata.checksum) {
				const content = await this.fileService.readFile(fileUri);
				const actualChecksum = await this.calculateChecksum(content.value);
				
				if (actualChecksum !== metadata.checksum) {
					this.logService.warn(`Checksum mismatch for ${id}`);
					return false;
				}
			}

			return true;

		} catch (error) {
			this.logService.error(`Failed to verify integrity for ${id}:`, error);
			return false;
		}
	}

	async createTemporaryUrl(id: string, expiresIn: number = 3600000): Promise<string> {
		// Créer une URL temporaire avec token
		const token = generateUuid();
		const expiresAt = new Date(Date.now() + expiresIn);
		
		// Stocker le token temporairement
		const tempTokens = this.getTempTokens();
		tempTokens[token] = { fileId: id, expiresAt };
		this.saveTempTokens(tempTokens);

		return `vscode-chat-file://${id}?token=${token}`;
	}

	async duplicateFile(id: string, newMetadata?: Partial<IStoredFileMetadata>): Promise<IStoredFileMetadata> {
		const original = await this.retrieveFile(id);
		if (!original) {
			throw new Error('Original file not found');
		}

		const duplicatedMetadata: Omit<IStoredFileMetadata, 'id' | 'uploadDate'> = {
			...original.metadata,
			...newMetadata,
			originalName: newMetadata?.originalName || `Copy of ${original.metadata.originalName}`
		};

		return this.storeFile(original.content, duplicatedMetadata);
	}

	async updateFileMetadata(id: string, metadata: Partial<IStoredFileMetadata>): Promise<boolean> {
		const existing = this.fileMetadataCache.get(id);
		if (!existing) {
			return false;
		}

		const updated = { ...existing, ...metadata };
		this.fileMetadataCache.set(id, updated);
		await this.saveMetadataCache();

		return true;
	}

	// Méthodes privées

	private loadConfiguration(): IFileStorageConfig {
		const config = this.configurationService.getValue<Partial<IFileStorageConfig>>('chat.fileStorage') || {};
		
		return {
			maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
			maxTotalSize: config.maxTotalSize || 500 * 1024 * 1024, // 500MB
			maxFileCount: config.maxFileCount || 100,
			defaultRetentionDays: config.defaultRetentionDays || 30,
			enableEncryption: config.enableEncryption ?? true,
			enableCompression: config.enableCompression ?? true,
			enableAudit: config.enableAudit ?? true,
			allowedMimeTypes: config.allowedMimeTypes || [],
			blockedMimeTypes: config.blockedMimeTypes || [],
			storageProviders: config.storageProviders || []
		};
	}

	private loadMetadataCache(): void {
		try {
			const stored = this.storageService.get(this.STORAGE_KEY, StorageScope.PROFILE);
			if (stored) {
				const parsed = JSON.parse(stored);
				for (const [id, metadata] of Object.entries(parsed)) {
					this.fileMetadataCache.set(id, this.deserializeMetadata(metadata as any));
				}
			}
		} catch (error) {
			this.logService.error('Failed to load metadata cache:', error);
		}
	}

	private async saveMetadataCache(): Promise<void> {
		try {
			const serialized: { [id: string]: any } = {};
			for (const [id, metadata] of this.fileMetadataCache) {
				serialized[id] = this.serializeMetadata(metadata);
			}
			
			this.storageService.store(this.STORAGE_KEY, JSON.stringify(serialized), StorageScope.PROFILE, StorageTarget.MACHINE);
		} catch (error) {
			this.logService.error('Failed to save metadata cache:', error);
		}
	}

	private serializeMetadata(metadata: IStoredFileMetadata): any {
		return {
			...metadata,
			uploadDate: metadata.uploadDate.toISOString(),
			lastAccessed: metadata.lastAccessed?.toISOString(),
			accessPermissions: metadata.accessPermissions ? {
				...metadata.accessPermissions,
				expiresAt: metadata.accessPermissions.expiresAt?.toISOString()
			} : undefined
		};
	}

	private deserializeMetadata(data: any): IStoredFileMetadata {
		return {
			...data,
			uploadDate: new Date(data.uploadDate),
			lastAccessed: data.lastAccessed ? new Date(data.lastAccessed) : undefined,
			accessPermissions: data.accessPermissions ? {
				...data.accessPermissions,
				expiresAt: data.accessPermissions.expiresAt ? new Date(data.accessPermissions.expiresAt) : undefined
			} : undefined
		};
	}

	private getFileUri(id: string): URI {
		return URI.from({
			scheme: 'file',
			path: `/${this.STORAGE_ROOT}/${id}`
		});
	}

	private async compressContent(content: VSBuffer): Promise<VSBuffer> {
		// Implémentation simple de compression (en production, utiliser une vraie bibliothèque)
		return content; // Placeholder
	}

	private async decompressContent(content: VSBuffer): Promise<VSBuffer> {
		// Implémentation simple de décompression
		return content; // Placeholder
	}

	private async calculateChecksum(content: VSBuffer): Promise<string> {
		// Calcul simple d'un hash
		const crypto = globalThis.crypto;
		if (crypto && crypto.subtle) {
			const hashBuffer = await crypto.subtle.digest('SHA-256', content.buffer);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		}
		
		// Fallback
		let hash = 0;
		const str = content.toString();
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return hash.toString(16);
	}

	private getTempTokens(): { [token: string]: { fileId: string; expiresAt: Date } } {
		try {
			const stored = this.storageService.get('chat.fileStorage.tempTokens', StorageScope.PROFILE);
			return stored ? JSON.parse(stored) : {};
		} catch {
			return {};
		}
	}

	private saveTempTokens(tokens: { [token: string]: { fileId: string; expiresAt: Date } }): void {
		this.storageService.store('chat.fileStorage.tempTokens', JSON.stringify(tokens), StorageScope.PROFILE, StorageTarget.MACHINE);
	}

	private scheduleCleanup(): void {
		// Nettoyer immédiatement
		this.cleanupExpiredFiles();

		// Programmer un nettoyage périodique (toutes les heures)
		setInterval(() => {
			this.cleanupExpiredFiles();
		}, 60 * 60 * 1000);
	}
}
