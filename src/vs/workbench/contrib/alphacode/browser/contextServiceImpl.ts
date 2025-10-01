/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IAlphaCodeContextService, ICodeSymbol, IFileContext, IWorkspaceContext } from '../common/contextService.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { IModelService } from '../../../../editor/common/services/model.js';

const MAX_CONTEXT_FILE_SIZE = 256 * 1024;
const MAX_CONTEXT_CONTENT_LENGTH = 20000;

export class AlphaCodeContextService extends Disposable implements IAlphaCodeContextService {
	declare readonly _serviceBrand: undefined;

	private indexed = false;
	private workspaceFiles: IFileContext[] = [];
	private workspaceSymbols: ICodeSymbol[] = [];

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IModelService private readonly modelService: IModelService,
	) {
		super();
	}

	async indexWorkspace(): Promise<void> {
		const enabled = this.configurationService.getValue<boolean>('alphacode.context.indexWorkspace');
		if (!enabled) {
			return;
		}

		let maxFiles = this.configurationService.getValue<number>('alphacode.context.maxFiles') || 100;
		if (maxFiles < 0) {
			maxFiles = 0;
		}
		const workspace = this.workspaceContextService.getWorkspace();

		if (!workspace || workspace.folders.length === 0) {
			return;
		}

		this.workspaceFiles = [];
		this.workspaceSymbols = [];

		try {
			for (const folder of workspace.folders) {
				await this.indexFolder(folder.uri, maxFiles);
			}
			this.indexed = true;
		} catch (error) {
			console.error('Failed to index workspace', error);
			this.indexed = false;
		}
	}

	private async indexFolder(uri: URI, maxFiles: number): Promise<void> {
		if (maxFiles > 0 && this.workspaceFiles.length >= maxFiles) {
			return;
		}

		try {
			const stat = await this.fileService.resolve(uri, { resolveSingleChildDescendants: true });

			if (stat.children) {
				for (const child of stat.children) {
					if (maxFiles > 0 && this.workspaceFiles.length >= maxFiles) {
						break;
					}

					if (child.isDirectory) {
						const name = child.name.toLowerCase();
						if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'out' || name === 'build') {
							continue;
						}
						await this.indexFolder(child.resource, maxFiles);
					} else if (child.isFile) {
						const ext = child.name.split('.').pop()?.toLowerCase();
						if (this.isCodeFile(ext)) {
							const fileContext = await this.createFileContext(child.resource);
							if (fileContext) {
								this.workspaceFiles.push(fileContext);
								if (fileContext.symbols) {
									this.workspaceSymbols.push(...fileContext.symbols);
								}
							}
						}
					}
				}
			}
		} catch (error) {
			console.error('Failed to index folder', uri.toString(), error);
		}
	}

	private isCodeFile(ext: string | undefined): boolean {
		if (!ext) {
			return false;
		}
		const codeExtensions = ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'dart', 'vue', 'svelte'];
		return codeExtensions.includes(ext);
	}

	private async createFileContext(uri: URI): Promise<IFileContext | undefined> {
		try {
			const stat = await this.fileService.resolve(uri, { resolveMetadata: true });
			const path = uri.path;
			const ext = path.split('.').pop()?.toLowerCase();
			const language = this.getLanguageFromExtension(ext);

			const model = this.modelService.getModel(uri);
			let symbols: ICodeSymbol[] | undefined;

			if (model) {
				symbols = await this.extractSymbolsFromModel(model);
			}

			let content: string | undefined;
			if (model) {
				content = model.getValue();
			} else if ((stat.size ?? 0) <= MAX_CONTEXT_FILE_SIZE) {
				const fileContent = await this.fileService.readFile(uri);
				content = fileContent.value.toString();
			}
			if (content && content.length > MAX_CONTEXT_CONTENT_LENGTH) {
				content = `${content.slice(0, MAX_CONTEXT_CONTENT_LENGTH)}\n…`;
			}

			return {
				uri,
				path,
				language,
				size: stat.size ?? 0,
				content,
				symbols
			};
		} catch (error) {
			console.error('Failed to create file context', uri.toString(), error);
			return undefined;
		}
	}

	private getLanguageFromExtension(ext: string | undefined): string {
		const languageMap: { [key: string]: string } = {
			'ts': 'typescript',
			'tsx': 'typescriptreact',
			'js': 'javascript',
			'jsx': 'javascriptreact',
			'py': 'python',
			'java': 'java',
			'c': 'c',
			'cpp': 'cpp',
			'h': 'c',
			'cs': 'csharp',
			'go': 'go',
			'rs': 'rust',
			'rb': 'ruby',
			'php': 'php'
		};
		return ext ? languageMap[ext] || ext : 'plaintext';
	}

	private async extractSymbolsFromModel(model: ITextModel): Promise<ICodeSymbol[]> {
		const symbols: ICodeSymbol[] = [];
		const content = model.getValue();
		const lines = content.split('\n');

		const patterns = [
			{ kind: 'function', regex: /(?:function|const|let|var)\s+(\w+)\s*[=\(]/ },
			{ kind: 'class', regex: /class\s+(\w+)/ },
			{ kind: 'interface', regex: /interface\s+(\w+)/ },
			{ kind: 'type', regex: /type\s+(\w+)/ }
		];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (const pattern of patterns) {
				const match = line.match(pattern.regex);
				if (match) {
					symbols.push({
						name: match[1],
						kind: pattern.kind,
						location: {
							uri: model.uri,
							range: {
								startLine: i + 1,
								startColumn: 1,
								endLine: i + 1,
								endColumn: line.length + 1
							}
						}
					});
				}
			}
		}

		return symbols;
	}

	async getWorkspaceContext(): Promise<IWorkspaceContext> {
		if (!this.indexed) {
			await this.indexWorkspace();
		}

		return {
			files: this.workspaceFiles,
			symbols: this.workspaceSymbols,
			totalFiles: this.workspaceFiles.length,
			indexed: this.indexed
		};
	}

	async getFileContext(uri: URI): Promise<IFileContext | undefined> {
		const existing = this.workspaceFiles.find(f => f.uri.toString() === uri.toString());
		if (existing) {
			return existing;
		}

		return this.createFileContext(uri);
	}

	async searchSymbols(query: string): Promise<ICodeSymbol[]> {
		const lowerQuery = query.toLowerCase();
		return this.workspaceSymbols.filter(symbol =>
			symbol.name.toLowerCase().includes(lowerQuery)
		);
	}

	async getRelevantContext(query: string, maxFiles: number = 5): Promise<IFileContext[]> {
		const lowerQuery = query.toLowerCase();
		const scored: { file: IFileContext; score: number }[] = [];

		for (const file of this.workspaceFiles) {
			let score = 0;

			if (file.path.toLowerCase().includes(lowerQuery)) {
				score += 10;
			}

			if (file.symbols) {
				for (const symbol of file.symbols) {
					if (symbol.name.toLowerCase().includes(lowerQuery)) {
						score += 5;
					}
				}
			}

			if (score > 0) {
				scored.push({ file, score });
			}
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, maxFiles).map(s => s.file);
	}

	async clearIndex(): Promise<void> {
		this.workspaceFiles = [];
		this.workspaceSymbols = [];
		this.indexed = false;
	}

	isIndexed(): boolean {
		return this.indexed;
	}
}
