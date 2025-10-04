/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IFileEmbeddingService,
	IFileContentExtraction,
} from '../common/fileEmbeddingService.js';
import { PDFExtractor } from './extractors/pdfExtractor.js';
import { ImageExtractor } from './extractors/imageExtractor.js';
import { OfficeExtractor } from './extractors/officeExtractor.js';
import { CodeAnalyzer } from './extractors/codeAnalyzer.js';
import { EmbeddingGenerator } from './extractors/embeddingGenerator.js';

/**
 * Service d'extraction et d'embedding de fichiers - Version complète
 */
export class FileEmbeddingService
	extends Disposable
	implements IFileEmbeddingService
{
	declare readonly _serviceBrand: undefined;

	private readonly pdfExtractor: PDFExtractor;
	private readonly imageExtractor: ImageExtractor;
	private readonly officeExtractor: OfficeExtractor;
	private readonly codeAnalyzer: CodeAnalyzer;
	private readonly embeddingGenerator: EmbeddingGenerator;

	constructor() {
		super();
		this.pdfExtractor = new PDFExtractor();
		this.imageExtractor = new ImageExtractor();
		this.officeExtractor = new OfficeExtractor();
		this.codeAnalyzer = new CodeAnalyzer();
		this.embeddingGenerator = new EmbeddingGenerator();
	}

	async extractTextContent(
		buffer: Uint8Array,
		mimeType: string,
		fileName: string,
	): Promise<string> {
		try {
			// Extraction basée sur le type MIME
			if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
				return this.extractPlainText(buffer);
			}

			if (mimeType === 'application/pdf') {
				return await this.pdfExtractor.extractText(buffer);
			}

			if (mimeType.startsWith('image/')) {
				return await this.imageExtractor.extractInfo(buffer, fileName);
			}

			// Documents Office
			if (this.isOfficeDocument(fileName, mimeType)) {
				return await this.officeExtractor.extract(buffer, fileName);
			}

			// Type non supporté pour l'extraction
			return `[Fichier binaire: ${fileName}]`;
		} catch (error) {
			return `[Erreur d'extraction: ${error instanceof Error ? error.message : String(error)}]`;
		}
	}

	private isOfficeDocument(fileName: string, mimeType: string): boolean {
		const officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'];
		const ext = fileName.toLowerCase().split('.').pop();
		return ext ? officeExtensions.includes(ext) : false;
	}

	async createEmbedding(text: string): Promise<number[]> {
		// Utiliser le générateur d'embeddings avancé
		return await this.embeddingGenerator.generateEmbedding(text);
	}

	async generateSummary(text: string, maxLength: number = 500): Promise<string> {
		const lines = text.split('\n').filter(line => line.trim().length > 0);
		const totalLines = lines.length;
		const totalChars = text.length;
		const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;

		let summary = '';
		let currentLength = 0;

		// Ajouter des métadonnées
		summary += `[Fichier: ${totalLines} lignes, ${totalWords} mots, ${totalChars} caractères]\n\n`;

		// Extraire les premières lignes significatives
		for (const line of lines) {
			if (currentLength + line.length > maxLength - 100) {
				summary += '\n[...contenu tronqué...]';
				break;
			}
			// Filtrer les lignes vides ou peu informatives
			if (line.trim().length > 2) {
				summary += line + '\n';
				currentLength += line.length + 1;
			}
		}

		return summary.trim();
	}

	async processFileForAI(
		buffer: Uint8Array,
		mimeType: string,
		fileName: string,
	): Promise<IFileContentExtraction> {
		// Extraire le contenu textuel
		const text = await this.extractTextContent(buffer, mimeType, fileName);

		// Détecter le langage de programmation
		const language = this.detectLanguage(fileName, mimeType);

		// Analyser le code si c'est un fichier de code
		let enhancedSummary: string | undefined;
		if (language && this.isCodeLanguage(language)) {
			try {
				const analysis = await this.codeAnalyzer.analyzeCode(text, language);
				enhancedSummary = analysis.summary;
			} catch (error) {
				console.error('Code analysis error:', error);
			}
		}

		// Générer un résumé si le texte est long
		let summary: string | undefined;
		if (text.length > 1000) {
			summary = enhancedSummary || await this.generateSummary(text, 500);
		}

		// Créer l'embedding (activé mais optionnel selon les ressources)
		let embedding: number[] | undefined;
		try {
			// Limiter la longueur du texte pour l'embedding
			const textForEmbedding = text.length > 2000 ? text.substring(0, 2000) : text;
			embedding = await this.createEmbedding(textForEmbedding);
		} catch (error) {
			console.error('Embedding generation error:', error);
		}

		return {
			text,
			metadata: {
				fileName,
				mimeType,
				size: buffer.length,
				language,
			},
			embedding,
			summary,
		};
	}

	private isCodeLanguage(language: string): boolean {
		const codeLanguages = [
			'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
			'python', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'php', 'ruby'
		];
		return codeLanguages.includes(language);
	}

	// Méthodes privées utilitaires

	private extractPlainText(buffer: Uint8Array): string {
		const decoder = new TextDecoder('utf-8');
		return decoder.decode(buffer);
	}


	private detectLanguage(fileName: string, mimeType: string): string | undefined {
		// Détection basique du langage de programmation par extension
		const ext = fileName.split('.').pop()?.toLowerCase();

		const languageMap: Record<string, string> = {
			'js': 'javascript',
			'ts': 'typescript',
			'jsx': 'javascriptreact',
			'tsx': 'typescriptreact',
			'py': 'python',
			'java': 'java',
			'cs': 'csharp',
			'cpp': 'cpp',
			'c': 'c',
			'h': 'c',
			'hpp': 'cpp',
			'go': 'go',
			'rs': 'rust',
			'rb': 'ruby',
			'php': 'php',
			'html': 'html',
			'css': 'css',
			'scss': 'scss',
			'sass': 'sass',
			'less': 'less',
			'json': 'json',
			'xml': 'xml',
			'yaml': 'yaml',
			'yml': 'yaml',
			'md': 'markdown',
			'sql': 'sql',
			'sh': 'shellscript',
			'bash': 'shellscript',
			'ps1': 'powershell',
			'swift': 'swift',
			'kt': 'kotlin',
			'scala': 'scala',
			'r': 'r',
			'vue': 'vue',
			'svelte': 'svelte',
		};

		return ext ? languageMap[ext] : undefined;
	}
}

