/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append } from '../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../base/browser/trustedTypes.js';

/**
 * Simple Markdown renderer for chat messages
 * Supports: bold, italic, code, code blocks, lists, links
 */
export class MarkdownRenderer {
	private readonly trustedTypesPolicy = createTrustedTypesPolicy(
		'alphaCodeMarkdownRenderer',
		{ createHTML: (value) => value },
	);

	/**
	 * Render markdown text to HTML element
	 */
	public render(markdown: string, container: HTMLElement): void {
		const lines = markdown.split('\n');
		let i = 0;

		while (i < lines.length) {
			const line = lines[i];

			if (line.trim().startsWith('```')) {
				const result = this.renderCodeBlock(lines, i);
				append(container, result.element);
				i = result.nextIndex;
				continue;
			}

			if (line.startsWith('#')) {
				append(container, this.renderHeading(line));
				i++;
				continue;
			}

			if (line.trim().match(/^[-*+]\s/)) {
				const result = this.renderList(lines, i);
				append(container, result.element);
				i = result.nextIndex;
				continue;
			}

			if (line.trim()) {
				append(container, this.renderParagraph(line));
			}

			i++;
		}
	}

	private renderHeading(line: string): HTMLElement {
		const match = line.match(/^(#{1,6})\s+(.+)$/);
		if (!match) {
			return this.renderParagraph(line);
		}

		const level = match[1].length;
		const text = match[2];
		const heading = $(`h${Math.min(level, 6)}`) as HTMLElement;
		heading.textContent = text;
		heading.style.margin = '12px 0 8px 0';
		heading.style.fontWeight = '600';
		return heading;
	}

	private renderParagraph(text: string): HTMLElement {
		const p = $('p.alphacode-markdown-paragraph');
		const html = this.renderInline(text);
		const temp = document.createElement('div');
		if (this.trustedTypesPolicy) {
			temp.innerHTML = this.trustedTypesPolicy.createHTML(
				html,
			) as unknown as string;
		} else {
			temp.innerHTML = html;
		}
		while (temp.firstChild) {
			p.appendChild(temp.firstChild);
		}
		return p;
	}

	private renderCodeBlock(
		lines: string[],
		startIndex: number,
	): { element: HTMLElement; nextIndex: number } {
		const firstLine = lines[startIndex].trim();
		const language = firstLine.substring(3).trim() || 'plaintext';

		let i = startIndex + 1;
		const codeLines: string[] = [];

		while (i < lines.length && !lines[i].trim().startsWith('```')) {
			codeLines.push(lines[i]);
			i++;
		}

		const container = $('.alphacode-code-block-container');

		const header = append(container, $('.alphacode-code-block-header'));
		append(
			header,
			$('span.alphacode-code-block-language', undefined, language),
		);

		const copyButton = append(
			header,
			$('button.alphacode-code-block-copy', undefined, 'Copy'),
		) as HTMLButtonElement;
		copyButton.onclick = () => {
			navigator.clipboard.writeText(codeLines.join('\n'));
			copyButton.textContent = 'Copied!';
			setTimeout(() => {
				copyButton.textContent = 'Copy';
			}, 2000);
		};

		const pre = append(container, $('pre.alphacode-code-block'));
		const code = append(pre, $('code'));
		code.textContent = codeLines.join('\n');
		code.className = `language-${language}`;

		return {
			element: container,
			nextIndex: i + 1,
		};
	}

	private renderList(
		lines: string[],
		startIndex: number,
	): { element: HTMLElement; nextIndex: number } {
		const ul = $('ul.alphacode-markdown-list');
		let i = startIndex;

		while (i < lines.length) {
			const line = lines[i].trim();
			if (!line.match(/^[-*+]\s/)) {
				break;
			}

			const text = line.substring(2);
			const li = append(ul, $('li'));
			const html = this.renderInline(text);
			const temp = document.createElement('div');
			if (this.trustedTypesPolicy) {
				temp.innerHTML = this.trustedTypesPolicy.createHTML(
					html,
				) as unknown as string;
			} else {
				temp.innerHTML = html;
			}
			while (temp.firstChild) {
				li.appendChild(temp.firstChild);
			}
			i++;
		}

		return {
			element: ul,
			nextIndex: i,
		};
	}

	private renderInline(text: string): string {
		let result = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Détecter les références de fichier avec numéro de ligne (ex: filename.ts:42)
		// et les styliser en bleu comme dans l'image
		result = result.replace(
			/\b([a-zA-Z_][\w./-]*\.(ts|js|tsx|jsx|py|java|cpp|c|h|cs|go|rs|rb|php|html|css|json|xml|yaml|yml|md|txt))(:(\d+))?/g,
			(match, filepath, ext, colonAndLine, lineNumber) => {
				if (colonAndLine) {
					return `<code class='alphacode-inline-code'>${filepath}</code><code class='alphacode-inline-code'>:${lineNumber}</code>`;
				}
				return `<code class='alphacode-inline-code'>${filepath}</code>`;
			}
		);

		// Détecter les badges de langage en début de ligne (ex: TS renderAssistantTurn)
		result = result.replace(
			/\b(TS|JS|PY|JAVA|CPP|CS|GO|RS|RB|PHP|HTML|CSS)\b(?=\s+\w)/g,
			`<code class='alphacode-language-badge'>$1</code>`
		);

		result = result.replace(
			/`([^`]+)`/g,
			`<code class='alphacode-inline-code'>$1</code>`,
		);

		result = result.replace(/\*\*([^*]+)\*\*/g, `<strong>$1</strong>`);
		result = result.replace(/\*([^*]+)\*/g, `<em>$1</em>`);
		result = result.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			`<a href='$2' class='alphacode-link'>$1</a>`,
		);

		return result;
	}

	/**
	 * Extract code blocks from markdown
	 */
	public extractCodeBlocks(
		markdown: string,
	): Array<{ language: string; code: string }> {
		const blocks: Array<{ language: string; code: string }> = [];
		const lines = markdown.split('\n');
		let i = 0;

		while (i < lines.length) {
			const line = lines[i].trim();

			if (line.startsWith('```')) {
				const language = line.substring(3).trim() || 'plaintext';
				const codeLines: string[] = [];
				i++;

				while (i < lines.length && !lines[i].trim().startsWith('```')) {
					codeLines.push(lines[i]);
					i++;
				}

				blocks.push({
					language,
					code: codeLines.join('\n'),
				});
			}

			i++;
		}

		return blocks;
	}
}
