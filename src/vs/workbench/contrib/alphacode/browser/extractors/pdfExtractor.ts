/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Extracteur de contenu PDF
 * Utilise une approche basée sur la structure binaire du PDF
 */
export class PDFExtractor {
	
	/**
	 * Extrait le texte d'un fichier PDF
	 */
	async extractText(buffer: Uint8Array): Promise<string> {
		try {
			// Vérifier que c'est bien un PDF
			if (!this.isPDF(buffer)) {
				throw new Error('Not a valid PDF file');
			}

			// Extraire le texte en utilisant une approche basique
			const text = await this.extractBasicText(buffer);
			
			if (!text || text.trim().length === 0) {
				return '[PDF file - text extraction requires pdf.js library]\n' +
					'Install pdf.js for full PDF support: npm install pdfjs-dist';
			}

			return text;
		} catch (error) {
			console.error('PDF extraction error:', error);
			return '[PDF file - extraction failed]\n' +
				`Error: ${error instanceof Error ? error.message : String(error)}`;
		}
	}

	/**
	 * Vérifie si le buffer est un PDF valide
	 */
	private isPDF(buffer: Uint8Array): boolean {
		// PDF commence par %PDF-
		const header = String.fromCharCode(...buffer.slice(0, 5));
		return header === '%PDF-';
	}

	/**
	 * Extraction basique de texte depuis le PDF
	 * Cette méthode tente d'extraire le texte visible sans bibliothèque externe
	 */
	private async extractBasicText(buffer: Uint8Array): Promise<string> {
		const decoder = new TextDecoder('latin1');
		const content = decoder.decode(buffer);
		
		const texts: string[] = [];
		
		// Chercher les objets de texte dans le PDF
		// Les textes PDF sont généralement entre parenthèses ou chevrons
		const textPatterns = [
			/\(((?:[^()\\]|\\[()\\nrtbf])*)\)/g,  // Texte entre parenthèses
			/<([0-9A-Fa-f\s]+)>/g,                 // Texte hexadécimal
		];

		for (const pattern of textPatterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				const text = match[1];
				if (text && text.length > 0) {
					const decoded = this.decodePDFString(text);
					if (decoded.trim().length > 0 && !this.isPDFCommand(decoded)) {
						texts.push(decoded);
					}
				}
			}
		}

		// Nettoyer et dédupliquer
		const uniqueTexts = Array.from(new Set(texts));
		const cleaned = uniqueTexts
			.filter(t => t.trim().length > 0)
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();

		return cleaned;
	}

	/**
	 * Décode une chaîne PDF (gère les échappements)
	 */
	private decodePDFString(text: string): string {
		return text
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\r')
			.replace(/\\t/g, '\t')
			.replace(/\\b/g, '\b')
			.replace(/\\f/g, '\f')
			.replace(/\\\(/g, '(')
			.replace(/\\\)/g, ')')
			.replace(/\\\\/g, '\\');
	}

	/**
	 * Vérifie si le texte est une commande PDF plutôt que du contenu
	 */
	private isPDFCommand(text: string): boolean {
		const commands = [
			'obj', 'endobj', 'stream', 'endstream', 'xref',
			'trailer', 'startxref', 'BT', 'ET', 'Tf', 'Td', 'Tm',
			'Type', 'Font', 'Subtype', 'BaseFont', 'Encoding'
		];
		
		const trimmed = text.trim();
		return commands.some(cmd => trimmed === cmd || trimmed.startsWith('/'));
	}

	/**
	 * Extrait les métadonnées du PDF
	 */
	async extractMetadata(buffer: Uint8Array): Promise<Record<string, string>> {
		const decoder = new TextDecoder('latin1');
		const content = decoder.decode(buffer);
		
		const metadata: Record<string, string> = {};
		
		// Extraire les métadonnées standard
		const metadataPatterns = {
			title: /\/Title\s*\(([^)]+)\)/i,
			author: /\/Author\s*\(([^)]+)\)/i,
			subject: /\/Subject\s*\(([^)]+)\)/i,
			keywords: /\/Keywords\s*\(([^)]+)\)/i,
			creator: /\/Creator\s*\(([^)]+)\)/i,
			producer: /\/Producer\s*\(([^)]+)\)/i,
		};

		for (const [key, pattern] of Object.entries(metadataPatterns)) {
			const match = content.match(pattern);
			if (match) {
				metadata[key] = this.decodePDFString(match[1]);
			}
		}

		// Extraire le nombre de pages
		const pagesMatch = content.match(/\/Count\s+(\d+)/);
		if (pagesMatch) {
			metadata.pages = pagesMatch[1];
		}

		return metadata;
	}
}
