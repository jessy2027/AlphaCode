/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Extracteur pour les documents Office (Word, Excel, PowerPoint)
 * Les formats Office modernes (.docx, .xlsx, .pptx) sont des archives ZIP contenant du XML
 */
export class OfficeExtractor {
	
	/**
	 * Extrait le texte d'un document Word (.docx)
	 */
	async extractWordText(buffer: Uint8Array): Promise<string> {
		try {
			// Vérifier que c'est un fichier ZIP (format Office moderne)
			if (!this.isZipFile(buffer)) {
				return '[Word document - requires .docx format (Office 2007+)]\n' +
					'Legacy .doc files are not supported. Please save as .docx.';
			}

			// Pour une implémentation complète, il faudrait :
			// 1. Décompresser le ZIP
			// 2. Lire word/document.xml
			// 3. Parser le XML et extraire les <w:t> tags
			
			return '[Word document - full extraction requires JSZip library]\n' +
				'Install JSZip for Word support: npm install jszip\n' +
				'The document structure is available but text extraction is pending.';
		} catch (error) {
			return `[Word extraction failed: ${error instanceof Error ? error.message : String(error)}]`;
		}
	}

	/**
	 * Extrait les données d'un fichier Excel (.xlsx)
	 */
	async extractExcelData(buffer: Uint8Array): Promise<string> {
		try {
			if (!this.isZipFile(buffer)) {
				return '[Excel document - requires .xlsx format (Office 2007+)]\n' +
					'Legacy .xls files are not supported. Please save as .xlsx.';
			}

			// Pour une implémentation complète, il faudrait :
			// 1. Décompresser le ZIP
			// 2. Lire xl/worksheets/sheet*.xml
			// 3. Lire xl/sharedStrings.xml pour les valeurs texte
			// 4. Parser et combiner les données
			
			return '[Excel document - full extraction requires JSZip + SheetJS library]\n' +
				'Install libraries for Excel support:\n' +
				'  npm install jszip xlsx\n' +
				'Spreadsheet structure is available but data extraction is pending.';
		} catch (error) {
			return `[Excel extraction failed: ${error instanceof Error ? error.message : String(error)}]`;
		}
	}

	/**
	 * Extrait le texte d'une présentation PowerPoint (.pptx)
	 */
	async extractPowerPointText(buffer: Uint8Array): Promise<string> {
		try {
			if (!this.isZipFile(buffer)) {
				return '[PowerPoint document - requires .pptx format (Office 2007+)]\n' +
					'Legacy .ppt files are not supported. Please save as .pptx.';
			}

			// Pour une implémentation complète, il faudrait :
			// 1. Décompresser le ZIP
			// 2. Lire ppt/slides/slide*.xml
			// 3. Parser les <a:t> tags pour le texte
			
			return '[PowerPoint document - full extraction requires JSZip library]\n' +
				'Install JSZip for PowerPoint support: npm install jszip\n' +
				'Slide structure is available but text extraction is pending.';
		} catch (error) {
			return `[PowerPoint extraction failed: ${error instanceof Error ? error.message : String(error)}]`;
		}
	}

	/**
	 * Vérifie si le buffer est un fichier ZIP (format Office moderne)
	 */
	private isZipFile(buffer: Uint8Array): boolean {
		// ZIP files start with PK (50 4B)
		return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
	}

	/**
	 * Détecte le type de document Office
	 */
	detectOfficeType(buffer: Uint8Array, fileName: string): 'word' | 'excel' | 'powerpoint' | 'unknown' {
		const ext = fileName.toLowerCase().split('.').pop();
		
		switch (ext) {
			case 'docx':
			case 'doc':
				return 'word';
			case 'xlsx':
			case 'xls':
				return 'excel';
			case 'pptx':
			case 'ppt':
				return 'powerpoint';
			default:
				return 'unknown';
		}
	}

	/**
	 * Extrait le contenu selon le type de document
	 */
	async extract(buffer: Uint8Array, fileName: string): Promise<string> {
		const type = this.detectOfficeType(buffer, fileName);
		
		switch (type) {
			case 'word':
				return this.extractWordText(buffer);
			case 'excel':
				return this.extractExcelData(buffer);
			case 'powerpoint':
				return this.extractPowerPointText(buffer);
			default:
				return '[Unknown Office document type]';
		}
	}
}
