/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';

export const IAlphaCodeFileAttachmentService = createDecorator<IAlphaCodeFileAttachmentService>(
	'alphaCodeFileAttachmentService',
);

/**
 * Types de fichiers supportés pour les attachements
 */
export enum AttachmentFileType {
	// Documents
	PDF = 'application/pdf',
	TXT = 'text/plain',
	MD = 'text/markdown',
	
	// Images
	PNG = 'image/png',
	JPG = 'image/jpeg',
	GIF = 'image/gif',
	WEBP = 'image/webp',
	SVG = 'image/svg+xml',
	
	// Code
	JSON = 'application/json',
	XML = 'application/xml',
	CSV = 'text/csv',
	
	// Archives (limité)
	ZIP = 'application/zip',
}

/**
 * Configuration de sécurité pour les fichiers
 */
export interface IFileAttachmentSecurityConfig {
	/**
	 * Taille maximale en octets (par défaut: 10MB)
	 */
	maxFileSize: number;
	
	/**
	 * Nombre maximum de fichiers par message
	 */
	maxFilesPerMessage: number;
	
	/**
	 * Types de fichiers autorisés
	 */
	allowedMimeTypes: string[];
	
	/**
	 * Extensions de fichiers interdites (blacklist)
	 */
	blockedExtensions: string[];
	
	/**
	 * Activer le scan antivirus (si disponible)
	 */
	enableAntivirusScan: boolean;
	
	/**
	 * Chiffrement en transit requis
	 */
	requireEncryption: boolean;
}

/**
 * Métadonnées d'un fichier attaché
 */
export interface IFileAttachment {
	/**
	 * Identifiant unique du fichier
	 */
	id: string;
	
	/**
	 * Nom du fichier
	 */
	name: string;
	
	/**
	 * Type MIME du fichier
	 */
	mimeType: string;
	
	/**
	 * Taille en octets
	 */
	size: number;
	
	/**
	 * URI de stockage du fichier
	 */
	uri: URI;
	
	/**
	 * Timestamp de l'upload
	 */
	uploadedAt: number;
	
	/**
	 * Hash du fichier pour vérification d'intégrité
	 */
	hash: string;
	
	/**
	 * Statut du scan antivirus
	 */
	scanStatus?: 'pending' | 'clean' | 'infected' | 'error';
	
	/**
	 * URL de prévisualisation (pour les images)
	 */
	previewUrl?: string;
	
	/**
	 * Métadonnées additionnelles
	 */
	metadata?: Record<string, any>;
	
	/**
	 * Contenu extrait pour l'IA
	 */
	extractedContent?: {
		text: string;
		summary?: string;
		language?: string;
	};
}

/**
 * Résultat de validation d'un fichier
 */
export interface IFileValidationResult {
	/**
	 * Le fichier est-il valide ?
	 */
	valid: boolean;
	
	/**
	 * Messages d'erreur si invalide
	 */
	errors?: string[];
	
	/**
	 * Avertissements (non bloquants)
	 */
	warnings?: string[];
}

/**
 * Événement d'upload de fichier
 */
export interface IFileUploadEvent {
	/**
	 * Identifiant de l'upload
	 */
	uploadId: string;
	
	/**
	 * Nom du fichier
	 */
	fileName: string;
	
	/**
	 * Progression (0-100)
	 */
	progress: number;
	
	/**
	 * Statut de l'upload
	 */
	status: 'uploading' | 'processing' | 'complete' | 'error';
	
	/**
	 * Message d'erreur si applicable
	 */
	error?: string;
}

/**
 * Service de gestion des fichiers attachés au chat
 */
export interface IAlphaCodeFileAttachmentService {
	readonly _serviceBrand: undefined;
	
	/**
	 * Événement déclenché lors de l'upload d'un fichier
	 */
	readonly onDidUploadFile: Event<IFileUploadEvent>;
	
	/**
	 * Événement déclenché lors de la suppression d'un fichier
	 */
	readonly onDidDeleteFile: Event<string>;
	
	/**
	 * Obtenir la configuration de sécurité actuelle
	 */
	getSecurityConfig(): IFileAttachmentSecurityConfig;
	
	/**
	 * Mettre à jour la configuration de sécurité
	 */
	updateSecurityConfig(config: Partial<IFileAttachmentSecurityConfig>): void;
	
	/**
	 * Valider un fichier avant l'upload
	 */
	validateFile(file: File): Promise<IFileValidationResult>;
	
	/**
	 * Uploader un fichier
	 * @param file Fichier à uploader
	 * @param messageId Identifiant du message associé
	 * @returns Métadonnées du fichier uploadé
	 */
	uploadFile(file: File, messageId: string): Promise<IFileAttachment>;
	
	/**
	 * Uploader plusieurs fichiers
	 */
	uploadFiles(files: File[], messageId: string): Promise<IFileAttachment[]>;
	
	/**
	 * Récupérer un fichier par son ID
	 */
	getFile(fileId: string): Promise<IFileAttachment | undefined>;
	
	/**
	 * Récupérer tous les fichiers d'un message
	 */
	getFilesByMessage(messageId: string): Promise<IFileAttachment[]>;
	
	/**
	 * Supprimer un fichier
	 */
	deleteFile(fileId: string): Promise<void>;
	
	/**
	 * Supprimer tous les fichiers d'un message
	 */
	deleteFilesByMessage(messageId: string): Promise<void>;
	
	/**
	 * Obtenir le contenu d'un fichier
	 */
	getFileContent(fileId: string): Promise<Uint8Array>;
	
	/**
	 * Obtenir une URL de téléchargement temporaire
	 */
	getDownloadUrl(fileId: string): Promise<string>;
	
	/**
	 * Nettoyer les fichiers orphelins (non associés à un message)
	 */
	cleanupOrphanedFiles(): Promise<number>;
	
	/**
	 * Obtenir les statistiques d'utilisation
	 */
	getUsageStats(): Promise<{
		totalFiles: number;
		totalSize: number;
		filesByType: Record<string, number>;
	}>;
}
