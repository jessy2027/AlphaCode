/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Générateur d'embeddings vectoriels
 * Crée des représentations vectorielles du contenu pour la recherche sémantique
 */
export class EmbeddingGenerator {
	
	private readonly embeddingDimension = 384; // Dimension standard pour sentence transformers
	
	/**
	 * Génère un embedding vectoriel à partir de texte
	 * Version basique utilisant un hash amélioré
	 * Pour une vraie implémentation, utiliser OpenAI Embeddings ou Sentence Transformers
	 */
	async generateEmbedding(text: string): Promise<number[]> {
		// Nettoyer le texte
		const cleaned = this.preprocessText(text);
		
		// Générer des features basiques
		const features = this.extractFeatures(cleaned);
		
		// Créer le vecteur d'embedding
		const embedding = this.createVector(cleaned, features);
		
		// Normaliser
		return this.normalize(embedding);
	}

	/**
	 * Génère plusieurs embeddings pour du texte long (par chunks)
	 */
	async generateChunkedEmbeddings(text: string, chunkSize: number = 512): Promise<number[][]> {
		const chunks = this.splitIntoChunks(text, chunkSize);
		const embeddings: number[][] = [];
		
		for (const chunk of chunks) {
			const embedding = await this.generateEmbedding(chunk);
			embeddings.push(embedding);
		}
		
		return embeddings;
	}

	/**
	 * Calcule la similarité cosinus entre deux embeddings
	 */
	cosineSimilarity(embedding1: number[], embedding2: number[]): number {
		if (embedding1.length !== embedding2.length) {
			throw new Error('Embeddings must have the same dimension');
		}
		
		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;
		
		for (let i = 0; i < embedding1.length; i++) {
			dotProduct += embedding1[i] * embedding2[i];
			norm1 += embedding1[i] * embedding1[i];
			norm2 += embedding2[i] * embedding2[i];
		}
		
		return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
	}

	/**
	 * Prétraite le texte pour l'embedding
	 */
	private preprocessText(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
			.replace(/\s+/g, ' ')      // Normaliser les espaces
			.trim();
	}

	/**
	 * Extrait des features du texte
	 */
	private extractFeatures(text: string): {
		wordCount: number;
		uniqueWords: number;
		avgWordLength: number;
		vocabulary: Set<string>;
	} {
		const words = text.split(' ').filter(w => w.length > 0);
		const uniqueWords = new Set(words);
		
		const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;
		
		return {
			wordCount: words.length,
			uniqueWords: uniqueWords.size,
			avgWordLength,
			vocabulary: uniqueWords,
		};
	}

	/**
	 * Crée un vecteur d'embedding
	 * Cette implémentation est simplifiée - une vraie solution utiliserait un modèle ML
	 */
	private createVector(text: string, features: any): number[] {
		const vector: number[] = [];
		
		// Utiliser plusieurs fonctions de hash pour créer des dimensions
		for (let i = 0; i < this.embeddingDimension; i++) {
			// Combiner différentes sources d'information
			const textHash = this.stableHash(text, i);
			const featureHash = this.featureHash(features, i);
			
			// Créer une valeur entre -1 et 1
			const value = Math.sin(textHash + featureHash) * Math.cos(textHash / (i + 1));
			vector.push(value);
		}
		
		return vector;
	}

	/**
	 * Hash stable pour une chaîne avec une seed
	 */
	private stableHash(str: string, seed: number): number {
		let hash = seed;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Hash basé sur les features
	 */
	private featureHash(features: any, seed: number): number {
		const combined = features.wordCount * 1000 + 
		                features.uniqueWords * 100 + 
		                features.avgWordLength * 10 + 
		                seed;
		return Math.abs(combined);
	}

	/**
	 * Normalise un vecteur (norme L2 = 1)
	 */
	private normalize(vector: number[]): number[] {
		const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		
		if (norm === 0) {
			return vector;
		}
		
		return vector.map(val => val / norm);
	}

	/**
	 * Divise le texte en chunks
	 */
	private splitIntoChunks(text: string, chunkSize: number): string[] {
		const words = text.split(/\s+/);
		const chunks: string[] = [];
		
		for (let i = 0; i < words.length; i += chunkSize) {
			const chunk = words.slice(i, i + chunkSize).join(' ');
			if (chunk.trim().length > 0) {
				chunks.push(chunk);
			}
		}
		
		return chunks;
	}

	/**
	 * Génère un embedding moyen à partir de plusieurs embeddings
	 */
	averageEmbeddings(embeddings: number[][]): number[] {
		if (embeddings.length === 0) {
			return new Array(this.embeddingDimension).fill(0);
		}
		
		const avg = new Array(this.embeddingDimension).fill(0);
		
		for (const embedding of embeddings) {
			for (let i = 0; i < this.embeddingDimension; i++) {
				avg[i] += embedding[i];
			}
		}
		
		for (let i = 0; i < this.embeddingDimension; i++) {
			avg[i] /= embeddings.length;
		}
		
		return this.normalize(avg);
	}

	/**
	 * Recherche les embeddings les plus similaires
	 */
	findMostSimilar(
		query: number[],
		candidates: Array<{ embedding: number[]; data: any }>,
		topK: number = 5
	): Array<{ similarity: number; data: any }> {
		const similarities = candidates.map(candidate => ({
			similarity: this.cosineSimilarity(query, candidate.embedding),
			data: candidate.data,
		}));
		
		// Trier par similarité décroissante
		similarities.sort((a, b) => b.similarity - a.similarity);
		
		return similarities.slice(0, topK);
	}
}

/**
 * Note pour l'implémentation production:
 * 
 * Pour une vraie solution d'embeddings, utiliser:
 * 
 * 1. OpenAI Embeddings API:
 *    - Modèle: text-embedding-3-small (1536 dimensions)
 *    - Haute qualité, coût raisonnable
 *    - Nécessite une clé API
 * 
 * 2. Transformers.js (local):
 *    - Modèle: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 *    - Fonctionne en local (browser/node)
 *    - Pas de frais API
 * 
 * 3. Cohere Embeddings API:
 *    - Modèle: embed-multilingual-v3.0
 *    - Support multilingue excellent
 * 
 * Exemple avec OpenAI:
 * ```typescript
 * const response = await openai.embeddings.create({
 *   model: "text-embedding-3-small",
 *   input: text,
 * });
 * return response.data[0].embedding;
 * ```
 */
