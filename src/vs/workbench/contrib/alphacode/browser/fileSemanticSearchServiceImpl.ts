/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IFileSemanticSearchService,
	ISemanticSearchResult,
	IFileEmbeddingMetadata,
	ISemanticSearchOptions,
} from '../common/fileSemanticSearchService.js';
import { IAlphaCodeFileAttachmentService } from '../common/fileAttachmentService.js';
import { IFileEmbeddingService } from '../common/fileEmbeddingService.js';
import { EmbeddingGenerator } from './extractors/embeddingGenerator.js';
import {
	IStorageService,
	StorageScope,
	StorageTarget,
} from '../../../../platform/storage/common/storage.js';

const STORAGE_KEY_EMBEDDINGS = 'alphacode.chat.embeddings.index';
const EMBEDDING_VERSION = '1.0';

/**
 * Service de recherche sémantique sur les fichiers attachés
 */
export class FileSemanticSearchService
	extends Disposable
	implements IFileSemanticSearchService
{
	declare readonly _serviceBrand: undefined;

	private embeddingIndex: Map<string, IFileEmbeddingMetadata> = new Map();
	private embeddingGenerator: EmbeddingGenerator;

	constructor(
		@IAlphaCodeFileAttachmentService private readonly fileAttachmentService: IAlphaCodeFileAttachmentService,
		@IFileEmbeddingService private readonly fileEmbeddingService: IFileEmbeddingService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.embeddingGenerator = new EmbeddingGenerator();
		this.loadIndex();
	}

	async indexFile(fileId: string, embedding: number[]): Promise<void> {
		const metadata: IFileEmbeddingMetadata = {
			fileId,
			embedding,
			createdAt: Date.now(),
			version: EMBEDDING_VERSION,
		};

		this.embeddingIndex.set(fileId, metadata);
		this.saveIndex();
	}

	async removeFromIndex(fileId: string): Promise<void> {
		this.embeddingIndex.delete(fileId);
		this.saveIndex();
	}

	async searchByEmbedding(
		embedding: number[],
		options?: ISemanticSearchOptions,
	): Promise<ISemanticSearchResult[]> {
		const maxResults = options?.maxResults ?? 5;
		const minSimilarity = options?.minSimilarity ?? 0.5;

		const candidates: Array<{ fileId: string; similarity: number }> = [];

		// Calculer la similarité pour chaque fichier indexé
		for (const [fileId, metadata] of this.embeddingIndex.entries()) {
			const similarity = this.embeddingGenerator.cosineSimilarity(
				embedding,
				metadata.embedding,
			);

			if (similarity >= minSimilarity) {
				candidates.push({ fileId, similarity });
			}
		}

		// Trier par similarité décroissante
		candidates.sort((a, b) => b.similarity - a.similarity);

		// Récupérer les fichiers et appliquer les filtres
		const results: ISemanticSearchResult[] = [];

		for (const candidate of candidates.slice(0, maxResults)) {
			const file = await this.fileAttachmentService.getFile(candidate.fileId);
			if (!file) {
				continue;
			}

			// Appliquer les filtres
			if (options?.mimeTypeFilter && !options.mimeTypeFilter.includes(file.mimeType)) {
				continue;
			}

			if (options?.languageFilter) {
				const language = file.extractedContent?.language;
				if (!language || !options.languageFilter.includes(language)) {
					continue;
				}
			}

			results.push({
				file,
				similarity: candidate.similarity,
				relevance: this.generateRelevanceExplanation(candidate.similarity),
			});
		}

		return results;
	}

	async searchByText(
		query: string,
		options?: ISemanticSearchOptions,
	): Promise<ISemanticSearchResult[]> {
		// Générer l'embedding de la requête
		const queryEmbedding = await this.fileEmbeddingService.createEmbedding(query);

		// Rechercher avec l'embedding
		return this.searchByEmbedding(queryEmbedding, options);
	}

	async findRelevantFiles(
		messageContent: string,
		options?: ISemanticSearchOptions,
	): Promise<ISemanticSearchResult[]> {
		// Nettoyer et préparer le contenu du message
		const cleanedContent = this.preprocessMessageContent(messageContent);

		// Rechercher par texte
		return this.searchByText(cleanedContent, options);
	}

	async getIndexStats(): Promise<{
		totalIndexed: number;
		averageSimilarity: number;
		lastUpdated: number;
	}> {
		const embeddings = Array.from(this.embeddingIndex.values());
		const totalIndexed = embeddings.length;

		// Calculer la similarité moyenne entre les fichiers indexés
		let totalSimilarity = 0;
		let comparisons = 0;

		if (embeddings.length > 1) {
			for (let i = 0; i < embeddings.length - 1; i++) {
				for (let j = i + 1; j < embeddings.length; j++) {
					const sim = this.embeddingGenerator.cosineSimilarity(
						embeddings[i].embedding,
						embeddings[j].embedding,
					);
					totalSimilarity += sim;
					comparisons++;
				}
			}
		}

		const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

		// Trouver la dernière mise à jour
		const lastUpdated = embeddings.length > 0
			? Math.max(...embeddings.map(e => e.createdAt))
			: 0;

		return {
			totalIndexed,
			averageSimilarity,
			lastUpdated,
		};
	}

	async rebuildIndex(): Promise<void> {
		// Effacer l'index actuel
		this.embeddingIndex.clear();

		// Note: Cette implémentation est simplifiée
		// Dans une vraie application, il faudrait parcourir tous les fichiers
		// et regénérer leurs embeddings en récupérant les métadonnées depuis
		// le fileAttachmentService et en recalculant les embeddings

		this.saveIndex();
	}

	// Méthodes privées

	private loadIndex(): void {
		const saved = this.storageService.get(
			STORAGE_KEY_EMBEDDINGS,
			StorageScope.APPLICATION,
		);

		if (saved) {
			try {
				const data = JSON.parse(saved);
				Object.entries(data).forEach(([fileId, metadata]: [string, any]) => {
					this.embeddingIndex.set(fileId, metadata);
				});
			} catch (error) {
				console.error('Failed to load embedding index:', error);
			}
		}
	}

	private saveIndex(): void {
		const data: Record<string, IFileEmbeddingMetadata> = {};
		this.embeddingIndex.forEach((metadata, fileId) => {
			data[fileId] = metadata;
		});

		this.storageService.store(
			STORAGE_KEY_EMBEDDINGS,
			JSON.stringify(data),
			StorageScope.APPLICATION,
			StorageTarget.USER,
		);
	}

	private preprocessMessageContent(content: string): string {
		// Retirer les mentions de code
		let cleaned = content.replace(/```[\s\S]*?```/g, '');

		// Retirer les URLs
		cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

		// Normaliser les espaces
		cleaned = cleaned.replace(/\s+/g, ' ').trim();

		return cleaned;
	}

	private generateRelevanceExplanation(similarity: number): string {
		if (similarity >= 0.9) {
			return 'Très pertinent';
		} else if (similarity >= 0.75) {
			return 'Pertinent';
		} else if (similarity >= 0.6) {
			return 'Moyennement pertinent';
		} else {
			return 'Faiblement pertinent';
		}
	}
}
