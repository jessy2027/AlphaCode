/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Analyseur de code avancé
 * Extrait la structure du code (fonctions, classes, imports) sans AST complet
 */
export class CodeAnalyzer {
	
	/**
	 * Analyse un fichier de code et extrait sa structure
	 */
	async analyzeCode(text: string, language: string): Promise<{
		summary: string;
		functions: string[];
		classes: string[];
		imports: string[];
		exports: string[];
		complexity: 'low' | 'medium' | 'high';
	}> {
		const analysis = {
			summary: '',
			functions: [] as string[],
			classes: [] as string[],
			imports: [] as string[],
			exports: [] as string[],
			complexity: 'low' as 'low' | 'medium' | 'high',
		};

		try {
			// Extraire selon le langage
			switch (language) {
				case 'javascript':
				case 'typescript':
				case 'javascriptreact':
				case 'typescriptreact':
					this.analyzeJavaScript(text, analysis);
					break;
				case 'python':
					this.analyzePython(text, analysis);
					break;
				case 'java':
					this.analyzeJava(text, analysis);
					break;
				case 'csharp':
					this.analyzeCSharp(text, analysis);
					break;
				default:
					this.analyzeGeneric(text, analysis);
			}

			// Calculer la complexité
			analysis.complexity = this.calculateComplexity(text);

			// Générer le résumé
			analysis.summary = this.generateSummary(text, analysis);

		} catch (error) {
			console.error('Code analysis error:', error);
		}

		return analysis;
	}

	private analyzeJavaScript(text: string, analysis: any): void {
		// Fonctions
		const functionPatterns = [
			/function\s+(\w+)\s*\(/g,                    // function name()
			/const\s+(\w+)\s*=\s*(?:async\s+)?function/g, // const name = function
			/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g, // const name = () =>
			/(\w+)\s*:\s*(?:async\s+)?function/g,        // name: function
			/async\s+function\s+(\w+)/g,                 // async function name()
		];

		for (const pattern of functionPatterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				if (!analysis.functions.includes(match[1])) {
					analysis.functions.push(match[1]);
				}
			}
		}

		// Classes
		const classPattern = /class\s+(\w+)/g;
		let match;
		while ((match = classPattern.exec(text)) !== null) {
			analysis.classes.push(match[1]);
		}

		// Imports
		const importPattern = /import\s+(?:(?:\{[^}]+\})|(?:\w+)|(?:\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
		while ((match = importPattern.exec(text)) !== null) {
			analysis.imports.push(match[1]);
		}

		// Exports
		const exportPattern = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
		while ((match = exportPattern.exec(text)) !== null) {
			analysis.exports.push(match[1]);
		}
	}

	private analyzePython(text: string, analysis: any): void {
		// Fonctions
		const functionPattern = /def\s+(\w+)\s*\(/g;
		let match;
		while ((match = functionPattern.exec(text)) !== null) {
			analysis.functions.push(match[1]);
		}

		// Classes
		const classPattern = /class\s+(\w+)/g;
		while ((match = classPattern.exec(text)) !== null) {
			analysis.classes.push(match[1]);
		}

		// Imports
		const importPatterns = [
			/import\s+(\w+)/g,
			/from\s+(\S+)\s+import/g,
		];
		
		for (const pattern of importPatterns) {
			while ((match = pattern.exec(text)) !== null) {
				if (!analysis.imports.includes(match[1])) {
					analysis.imports.push(match[1]);
				}
			}
		}
	}

	private analyzeJava(text: string, analysis: any): void {
		// Classes
		const classPattern = /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/g;
		let match;
		while ((match = classPattern.exec(text)) !== null) {
			analysis.classes.push(match[1]);
		}

		// Méthodes
		const methodPattern = /(?:public|private|protected)\s+(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;
		while ((match = methodPattern.exec(text)) !== null) {
			if (!['class', 'interface', 'enum'].includes(match[1])) {
				analysis.functions.push(match[1]);
			}
		}

		// Imports
		const importPattern = /import\s+(?:static\s+)?([^;]+);/g;
		while ((match = importPattern.exec(text)) !== null) {
			analysis.imports.push(match[1].trim());
		}
	}

	private analyzeCSharp(text: string, analysis: any): void {
		// Classes
		const classPattern = /(?:public\s+)?(?:abstract\s+)?(?:partial\s+)?class\s+(\w+)/g;
		let match;
		while ((match = classPattern.exec(text)) !== null) {
			analysis.classes.push(match[1]);
		}

		// Méthodes
		const methodPattern = /(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;
		while ((match = methodPattern.exec(text)) !== null) {
			analysis.functions.push(match[1]);
		}

		// Usings
		const usingPattern = /using\s+([^;]+);/g;
		while ((match = usingPattern.exec(text)) !== null) {
			analysis.imports.push(match[1].trim());
		}
	}

	private analyzeGeneric(text: string, analysis: any): void {
		// Recherche générique de fonctions/méthodes
		const patterns = [
			/function\s+(\w+)/g,
			/def\s+(\w+)/g,
			/sub\s+(\w+)/g,
			/proc\s+(\w+)/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				if (!analysis.functions.includes(match[1])) {
					analysis.functions.push(match[1]);
				}
			}
		}
	}

	private calculateComplexity(text: string): 'low' | 'medium' | 'high' {
		const lines = text.split('\n').length;
		const cyclomaticIndicators = (text.match(/\b(if|for|while|case|catch|\&\&|\|\|)\b/g) || []).length;
		
		// Score basé sur la taille et la complexité cyclomatique
		const score = (lines / 10) + (cyclomaticIndicators * 2);
		
		if (score < 50) return 'low';
		if (score < 150) return 'medium';
		return 'high';
	}

	private generateSummary(text: string, analysis: any): string {
		const lines = text.split('\n').length;
		const parts: string[] = [];

		parts.push(`Code analysis: ${lines} lines`);

		if (analysis.classes.length > 0) {
			parts.push(`${analysis.classes.length} class(es): ${analysis.classes.slice(0, 3).join(', ')}${analysis.classes.length > 3 ? '...' : ''}`);
		}

		if (analysis.functions.length > 0) {
			parts.push(`${analysis.functions.length} function(s): ${analysis.functions.slice(0, 3).join(', ')}${analysis.functions.length > 3 ? '...' : ''}`);
		}

		if (analysis.imports.length > 0) {
			parts.push(`${analysis.imports.length} import(s)`);
		}

		parts.push(`Complexity: ${analysis.complexity}`);

		return parts.join(', ');
	}
}
