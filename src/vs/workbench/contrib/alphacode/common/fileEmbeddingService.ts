/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IFileEmbeddingService = createDecorator<IFileEmbeddingService>(
	'fileEmbeddingService',
);

/**
 * Résultat de l'extraction de contenu d'un fichier
 */
export interface IFileContentExtraction {
	/**
	 * Contenu textuel extrait
	 */
	text: string;
	
	/**
	 * Métadonnées du fichier
	 */
	metadata: {
		fileName: string;
		mimeType: string;
		size: number;
		language?: string;
	};
	
	/**
	 * Embedding vectoriel (optionnel)
	 */
	embedding?: number[];
	
	/**
	 * Résumé du contenu (optionnel)
	 */
	summary?: string;
}

/**
 * Service pour extraire et créer des embeddings de fichiers
 */
export interface IFileEmbeddingService {
	readonly _serviceBrand: undefined;
	
	/**
	 * Extrait le contenu textuel d'un fichier
	 */
	extractTextContent(buffer: Uint8Array, mimeType: string, fileName: string): Promise<string>;
	
	/**
	 * Crée un embedding vectoriel du contenu
	 */
	createEmbedding(text: string): Promise<number[]>;
	
	/**
	 * Génère un résumé du contenu pour l'IA
	 */
	generateSummary(text: string, maxLength?: number): Promise<string>;
	
	/**
	 * Traite un fichier complet pour l'inclure dans le contexte IA
	 */
	processFileForAI(buffer: Uint8Array, mimeType: string, fileName: string): Promise<IFileContentExtraction>;
}
