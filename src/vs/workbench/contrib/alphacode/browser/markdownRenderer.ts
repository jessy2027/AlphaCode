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

			// Code block
			if (line.trim().startsWith('```')) {
				const result = this.renderCodeBlock(lines, i);
				append(container, result.element);
				i = result.nextIndex;
				continue;
			}

			// Heading
			if (line.startsWith('#')) {
				append(container, this.renderHeading(line));
				i++;
				continue;
			}

			// List item
			if (line.trim().match(/^[-*+]\s/)) {
				const result = this.renderList(lines, i);
				append(container, result.element);
				i = result.nextIndex;
				continue;
			}

			// Paragraph
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
		// Use textContent for security, then apply inline formatting
		const html = this.renderInline(text);
		// Create a temporary container to safely parse HTML
		const temp = document.createElement('div');
		if (this.trustedTypesPolicy) {
			temp.innerHTML = this.trustedTypesPolicy.createHTML(
				html,
			) as unknown as string;
		} else {
			temp.innerHTML = html;
		}
		// Copy the content to the paragraph
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

		// Header with language and copy button
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

		// Code content
		const pre = append(container, $('pre.alphacode-code-block'));
		const code = append(pre, $('code'));
		code.textContent = codeLines.join('\n');

		// Apply language class for potential syntax highlighting
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
			// Use safe HTML rendering
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
		// Escape HTML
		let result = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Code (backticks)
		result = result.replace(
			/`([^`]+)`/g,
			`<code class='alphacode-inline-code'>$1</code>`,
		);

		// Bold
		result = result.replace(/\*\*([^*]+)\*\*/g, `<strong>$1</strong>`);

		// Italic
		result = result.replace(/\*([^*]+)\*/g, `<em>$1</em>`);

		// Links
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
