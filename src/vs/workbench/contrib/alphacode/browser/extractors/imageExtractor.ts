/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Extracteur de contenu pour les images
 * Fournit des métadonnées et prépare pour l'OCR futur
 */
export class ImageExtractor {
	
	/**
	 * Extrait les informations d'une image
	 */
	async extractInfo(buffer: Uint8Array, fileName: string): Promise<string> {
		const imageInfo: string[] = [];
		
		imageInfo.push(`[IMAGE FILE: ${fileName}]`);
		imageInfo.push(`Size: ${this.formatBytes(buffer.length)}`);
		
		// Détecter le type d'image
		const imageType = this.detectImageType(buffer);
		if (imageType) {
			imageInfo.push(`Format: ${imageType}`);
		}

		// Extraire les dimensions si possible
		const dimensions = await this.extractDimensions(buffer, imageType);
		if (dimensions) {
			imageInfo.push(`Dimensions: ${dimensions.width}x${dimensions.height} pixels`);
		}

		// Informations pour l'OCR futur
		imageInfo.push('');
		imageInfo.push('Note: Text extraction from images requires OCR.');
		imageInfo.push('Future implementation will use Tesseract.js or cloud OCR service.');
		
		return imageInfo.join('\n');
	}

	/**
	 * Détecte le type d'image à partir des magic bytes
	 */
	private detectImageType(buffer: Uint8Array): string | null {
		// PNG: 89 50 4E 47
		if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
			return 'PNG';
		}
		
		// JPEG: FF D8 FF
		if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
			return 'JPEG';
		}
		
		// GIF: 47 49 46 38
		if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
			return 'GIF';
		}
		
		// WebP: 52 49 46 46 ... 57 45 42 50
		if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
			if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
				return 'WebP';
			}
		}
		
		// BMP: 42 4D
		if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
			return 'BMP';
		}
		
		// SVG (text-based)
		const decoder = new TextDecoder('utf-8');
		const start = decoder.decode(buffer.slice(0, 100)).toLowerCase();
		if (start.includes('<svg') || start.includes('<?xml')) {
			return 'SVG';
		}
		
		return null;
	}

	/**
	 * Extrait les dimensions de l'image
	 */
	private async extractDimensions(buffer: Uint8Array, type: string | null): Promise<{ width: number; height: number } | null> {
		try {
			switch (type) {
				case 'PNG':
					return this.extractPNGDimensions(buffer);
				case 'JPEG':
					return this.extractJPEGDimensions(buffer);
				case 'GIF':
					return this.extractGIFDimensions(buffer);
				case 'BMP':
					return this.extractBMPDimensions(buffer);
				case 'WebP':
					return this.extractWebPDimensions(buffer);
				default:
					return null;
			}
		} catch (error) {
			console.error('Error extracting image dimensions:', error);
			return null;
		}
	}

	private extractPNGDimensions(buffer: Uint8Array): { width: number; height: number } {
		// PNG dimensions are at bytes 16-23 (after the IHDR chunk)
		const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
		const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
		return { width, height };
	}

	private extractJPEGDimensions(buffer: Uint8Array): { width: number; height: number } | null {
		// JPEG dimensions are in the SOF0 marker (0xFFC0)
		let offset = 2;
		while (offset < buffer.length - 8) {
			if (buffer[offset] === 0xFF) {
				const marker = buffer[offset + 1];
				if (marker >= 0xC0 && marker <= 0xC3) {
					// Found SOF marker
					const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
					const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
					return { width, height };
				}
				// Skip to next marker
				const length = (buffer[offset + 2] << 8) | buffer[offset + 3];
				offset += length + 2;
			} else {
				offset++;
			}
		}
		return null;
	}

	private extractGIFDimensions(buffer: Uint8Array): { width: number; height: number } {
		// GIF dimensions are at bytes 6-9
		const width = buffer[6] | (buffer[7] << 8);
		const height = buffer[8] | (buffer[9] << 8);
		return { width, height };
	}

	private extractBMPDimensions(buffer: Uint8Array): { width: number; height: number } {
		// BMP dimensions are at bytes 18-25
		const width = buffer[18] | (buffer[19] << 8) | (buffer[20] << 16) | (buffer[21] << 24);
		const height = buffer[22] | (buffer[23] << 8) | (buffer[24] << 16) | (buffer[25] << 24);
		return { width, height: Math.abs(height) }; // Height can be negative
	}

	private extractWebPDimensions(buffer: Uint8Array): { width: number; height: number } | null {
		// WebP VP8 dimensions
		if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38) {
			if (buffer[15] === 0x20) { // VP8
				const width = ((buffer[26] | (buffer[27] << 8)) & 0x3FFF);
				const height = ((buffer[28] | (buffer[29] << 8)) & 0x3FFF);
				return { width, height };
			}
		}
		return null;
	}

	private formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Prépare l'image pour un futur traitement OCR
	 * Pour l'instant, retourne juste les métadonnées
	 */
	async prepareForOCR(buffer: Uint8Array): Promise<{
		ready: boolean;
		format: string | null;
		dimensions: { width: number; height: number } | null;
		note: string;
	}> {
		const format = this.detectImageType(buffer);
		const dimensions = await this.extractDimensions(buffer, format);
		
		return {
			ready: false,
			format,
			dimensions,
			note: 'OCR implementation pending. Will use Tesseract.js or cloud service.'
		};
	}
}
