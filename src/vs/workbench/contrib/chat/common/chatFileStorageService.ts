/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';

export const IChatFileStorageService = createDecorator<IChatFileStorageService>('chatFileStorageService');

export interface IStoredFileMetadata {
	id: string;
	originalName: string;
	mimeType: string;
	size: number;
	checksum: string;
	uploadDate: Date;
	lastAccessed?: Date;
	tags?: string[];
	isEncrypted: boolean;
	retentionPolicy?: IRetentionPolicy;
	accessPermissions?: IAccessPermissions;
}

export interface IRetentionPolicy {
	maxAge?: number; // en millisecondes
	maxAccessCount?: number;
	autoDelete?: boolean;
}

export interface IAccessPermissions {
	readOnly?: boolean;
	allowedUsers?: string[];
	allowedRoles?: string[];
	expiresAt?: Date;
}

export interface IFileStorageOptions {
	encrypt?: boolean;
	compress?: boolean;
	retentionPolicy?: IRetentionPolicy;
	accessPermissions?: IAccessPermissions;
	tags?: string[];
}

export interface IStorageQuota {
	used: number;
	total: number;
	fileCount: number;
	maxFileCount?: number;
}

export interface IChatFileStorageService {
	readonly _serviceBrand: undefined;

	readonly onFileStored: Event<IStoredFileMetadata>;
	readonly onFileDeleted: Event<string>;
	readonly onQuotaChanged: Event<IStorageQuota>;

	/**
	 * Stocker un fichier avec métadonnées
	 */
	storeFile(
		content: VSBuffer,
		metadata: Omit<IStoredFileMetadata, 'id' | 'uploadDate'>,
		options?: IFileStorageOptions
	): Promise<IStoredFileMetadata>;

	/**
	 * Récupérer un fichier par son ID
	 */
	retrieveFile(id: string): Promise<{ content: VSBuffer; metadata: IStoredFileMetadata } | undefined>;

	/**
	 * Récupérer uniquement les métadonnées d'un fichier
	 */
	getFileMetadata(id: string): Promise<IStoredFileMetadata | undefined>;

	/**
	 * Lister tous les fichiers avec leurs métadonnées
	 */
	listFiles(filter?: {
		tags?: string[];
		mimeType?: string;
		dateRange?: { from: Date; to: Date };
		maxResults?: number;
	}): Promise<IStoredFileMetadata[]>;

	/**
	 * Supprimer un fichier
	 */
	deleteFile(id: string): Promise<boolean>;

	/**
	 * Nettoyer les fichiers expirés
	 */
	cleanupExpiredFiles(): Promise<number>;

	/**
	 * Obtenir les informations de quota
	 */
	getQuotaInfo(): Promise<IStorageQuota>;

	/**
	 * Vérifier l'intégrité d'un fichier
	 */
	verifyFileIntegrity(id: string): Promise<boolean>;

	/**
	 * Créer une URL temporaire pour accéder à un fichier
	 */
	createTemporaryUrl(id: string, expiresIn?: number): Promise<string>;

	/**
	 * Dupliquer un fichier
	 */
	duplicateFile(id: string, newMetadata?: Partial<IStoredFileMetadata>): Promise<IStoredFileMetadata>;

	/**
	 * Mettre à jour les métadonnées d'un fichier
	 */
	updateFileMetadata(id: string, metadata: Partial<IStoredFileMetadata>): Promise<boolean>;
}

export interface IChatFileStorageProvider {
	readonly scheme: string;

	writeFile(uri: URI, content: VSBuffer, options?: IFileStorageOptions): Promise<void>;
	readFile(uri: URI): Promise<VSBuffer>;
	deleteFile(uri: URI): Promise<void>;
	exists(uri: URI): Promise<boolean>;
	stat(uri: URI): Promise<{ size: number; mtime: number }>;
}

/**
 * Interface pour les hooks de sécurité
 */
export interface ISecurityHooks {
	/**
	 * Valider avant stockage
	 */
	validateBeforeStore?(content: VSBuffer, metadata: IStoredFileMetadata): Promise<boolean>;

	/**
	 * Valider avant récupération
	 */
	validateBeforeRetrieve?(id: string, userId?: string): Promise<boolean>;

	/**
	 * Chiffrer le contenu
	 */
	encryptContent?(content: VSBuffer): Promise<VSBuffer>;

	/**
	 * Déchiffrer le contenu
	 */
	decryptContent?(content: VSBuffer): Promise<VSBuffer>;

	/**
	 * Audit des accès
	 */
	auditAccess?(action: 'store' | 'retrieve' | 'delete', id: string, userId?: string): Promise<void>;
}

/**
 * Configuration du service de stockage
 */
export interface IFileStorageConfig {
	maxFileSize: number;
	maxTotalSize: number;
	maxFileCount: number;
	defaultRetentionDays: number;
	enableEncryption: boolean;
	enableCompression: boolean;
	enableAudit: boolean;
	allowedMimeTypes: string[];
	blockedMimeTypes: string[];
	storageProviders: IChatFileStorageProvider[];
	securityHooks?: ISecurityHooks;
}

/**
 * Événements du service de stockage
 */
export interface IFileStorageEvents {
	onFileStored: Event<{ id: string; metadata: IStoredFileMetadata }>;
	onFileRetrieved: Event<{ id: string; userId?: string }>;
	onFileDeleted: Event<{ id: string; reason: string }>;
	onQuotaExceeded: Event<{ current: number; limit: number }>;
	onSecurityViolation: Event<{ id: string; violation: string; userId?: string }>;
}

/**
 * Statistiques du stockage
 */
export interface IStorageStatistics {
	totalFiles: number;
	totalSize: number;
	filesByType: { [mimeType: string]: number };
	sizeByType: { [mimeType: string]: number };
	oldestFile: Date;
	newestFile: Date;
	averageFileSize: number;
	encryptedFiles: number;
	compressedFiles: number;
}

/**
 * Options de recherche avancée
 */
export interface IAdvancedSearchOptions {
	query?: string;
	tags?: string[];
	mimeTypes?: string[];
	sizeRange?: { min: number; max: number };
	dateRange?: { from: Date; to: Date };
	isEncrypted?: boolean;
	hasRetentionPolicy?: boolean;
	sortBy?: 'name' | 'size' | 'date' | 'type';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

/**
 * Résultat de recherche
 */
export interface ISearchResult {
	files: IStoredFileMetadata[];
	totalCount: number;
	hasMore: boolean;
}

/**
 * Interface pour la gestion des versions de fichiers
 */
export interface IFileVersioning {
	/**
	 * Créer une nouvelle version d'un fichier
	 */
	createVersion(originalId: string, content: VSBuffer, comment?: string): Promise<string>;

	/**
	 * Lister les versions d'un fichier
	 */
	listVersions(fileId: string): Promise<Array<{
		versionId: string;
		createdAt: Date;
		comment?: string;
		size: number;
	}>>;

	/**
	 * Récupérer une version spécifique
	 */
	getVersion(fileId: string, versionId: string): Promise<VSBuffer>;

	/**
	 * Supprimer une version
	 */
	deleteVersion(fileId: string, versionId: string): Promise<boolean>;

	/**
	 * Restaurer une version comme version actuelle
	 */
	restoreVersion(fileId: string, versionId: string): Promise<boolean>;
}
