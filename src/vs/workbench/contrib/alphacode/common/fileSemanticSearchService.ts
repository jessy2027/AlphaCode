/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileAttachment } from './fileAttachmentService.js';

export const IFileSemanticSearchService = createDecorator<IFileSemanticSearchService>(
	'fileSemanticSearchService',
);

/**
 * Résultat de recherche sémantique
 */
export interface ISemanticSearchResult {
	/**
	 * Fichier trouvé
	 */
	file: IFileAttachment;
	
	/**
	 * Score de similarité (0-1)
	 */
	similarity: number;
	
	/**
	 * Raison de la pertinence
	 */
	relevance?: string;
}

/**
 * Métadonnées d'embedding pour un fichier
 */
export interface IFileEmbeddingMetadata {
	/**
	 * ID du fichier
	 */
	fileId: string;
	
	/**
	 * Vecteur d'embedding
	 */
	embedding: number[];
	
	/**
	 * Timestamp de création
	 */
	createdAt: number;
	
	/**
	 * Version de l'algorithme d'embedding
	 */
	version: string;
}

/**
 * Options de recherche sémantique
 */
export interface ISemanticSearchOptions {
	/**
	 * Nombre maximum de résultats
	 */
	maxResults?: number;
	
	/**
	 * Score minimum de similarité (0-1)
	 */
	minSimilarity?: number;
	
	/**
	 * Filtrer par type MIME
	 */
	mimeTypeFilter?: string[];
	
	/**
	 * Filtrer par langage de programmation
	 */
	languageFilter?: string[];
}

/**
 * Service de recherche sémantique sur les fichiers attachés
 */
export interface IFileSemanticSearchService {
	readonly _serviceBrand: undefined;
	
	/**
	 * Indexer un fichier avec son embedding
	 */
	indexFile(fileId: string, embedding: number[]): Promise<void>;
	
	/**
	 * Retirer un fichier de l'index
	 */
	removeFromIndex(fileId: string): Promise<void>;
	
	/**
	 * Rechercher des fichiers similaires par embedding
	 */
	searchByEmbedding(embedding: number[], options?: ISemanticSearchOptions): Promise<ISemanticSearchResult[]>;
	
	/**
	 * Rechercher des fichiers similaires par texte
	 */
	searchByText(query: string, options?: ISemanticSearchOptions): Promise<ISemanticSearchResult[]>;
	
	/**
	 * Trouver les fichiers les plus pertinents pour un message
	 */
	findRelevantFiles(messageContent: string, options?: ISemanticSearchOptions): Promise<ISemanticSearchResult[]>;
	
	/**
	 * Obtenir les statistiques de l'index
	 */
	getIndexStats(): Promise<{
		totalIndexed: number;
		averageSimilarity: number;
		lastUpdated: number;
	}>;
	
	/**
	 * Reconstruire l'index complet
	 */
	rebuildIndex(): Promise<void>;
}
