/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IChatTool } from '../common/chatService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

export class ChatToolsRegistry {
	private tools: Map<string, IChatTool> = new Map();

	constructor(
		private readonly fileService: IFileService,
		private readonly workspaceContextService: IWorkspaceContextService,
	) {
		this.registerDefaultTools();
	}

	private registerDefaultTools(): void {
		// Tool: Read File
		this.registerTool({
			name: 'read_file',
			description:
				'Read the contents of a file. Returns the file content as text.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The absolute or relative path to the file to read',
					},
				},
				required: ['path'],
			},
			execute: async (params: { path: string }) => {
				try {
					const uri = this.resolveUri(params.path);
					const content = await this.fileService.readFile(uri);
					return `File: ${params.path}\n\n${content.value.toString()}`;
				} catch (error) {
					throw new Error(
						`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: List Directory
		this.registerTool({
			name: 'list_directory',
			description: 'List all files and directories in a given directory path.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description:
							'The absolute or relative path to the directory to list',
					},
				},
				required: ['path'],
			},
			execute: async (params: { path: string }) => {
				try {
					const uri = this.resolveUri(params.path);
					const stat = await this.fileService.resolve(uri);

					if (!stat.children) {
						return `${params.path} is not a directory`;
					}

					const items = stat.children.map((child) => {
						const type = child.isDirectory ? '[DIR]' : '[FILE]';
						const size = child.size ? ` (${this.formatSize(child.size)})` : '';
						return `${type} ${child.name}${size}`;
					});

					return `Directory: ${params.path}\n\n${items.join('\n')}`;
				} catch (error) {
					throw new Error(
						`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: Search Files
		this.registerTool({
			name: 'search_files',
			description:
				'Search for files in the workspace by name pattern (glob pattern supported).',
			parameters: {
				type: 'object',
				properties: {
					pattern: {
						type: 'string',
						description:
							'The file name pattern to search for (e.g., "*.ts", "test*.js").',
					},
					maxResults: {
						type: 'number',
						description: 'Maximum number of results to return (default: 50).',
					},
				},
				required: ['pattern'],
			},
			execute: async (params: { pattern: string; maxResults?: number }) => {
				try {
					const workspace = this.workspaceContextService.getWorkspace();
					if (!workspace.folders.length) {
						return 'No workspace folder open';
					}

					const results: string[] = [];
					const maxResults = params.maxResults ?? 50;

					for (const folder of workspace.folders) {
						const files = await this.searchInDirectory(
							folder.uri,
							params.pattern,
							maxResults - results.length,
						);
						results.push(...files);
						if (results.length >= maxResults) {
							break;
						}
					}

					if (results.length === 0) {
						return `No files found matching pattern: ${params.pattern}`;
					}

					return `Found ${results.length} file(s) matching '${params.pattern}':\n\n${results.join('\n')}`;
				} catch (error) {
					throw new Error(
						`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: Write File
		this.registerTool({
			name: 'write_file',
			description:
				'Create a new file or overwrite an existing file with the provided content.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The absolute or relative path to the file to write',
					},
					content: {
						type: 'string',
						description: 'The content to write to the file',
					},
				},
				required: ['path', 'content'],
			},
			execute: async (params: { path: string; content: string }) => {
				try {
					const uri = this.resolveUri(params.path);
					await this.fileService.writeFile(
						uri,
						VSBuffer.fromString(params.content),
					);
					return `Successfully wrote to file: ${params.path}`;
				} catch (error) {
					throw new Error(
						`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: Edit File
		this.registerTool({
			name: 'edit_file',
			description:
				'Edit a file by replacing specific text. Provide the old text to find and the new text to replace it with.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The absolute or relative path to the file to edit',
					},
					oldText: {
						type: 'string',
						description:
							'The exact text to find and replace (must match exactly)',
					},
					newText: {
						type: 'string',
						description: 'The new text to replace the old text with',
					},
				},
				required: ['path', 'oldText', 'newText'],
			},
			execute: async (params: {
				path: string;
				oldText: string;
				newText: string;
			}) => {
				try {
					const uri = this.resolveUri(params.path);
					const content = await this.fileService.readFile(uri);
					const currentContent = content.value.toString();

					if (!currentContent.includes(params.oldText)) {
						throw new Error(
							`Text not found in file. Make sure the oldText matches exactly.`,
						);
					}

					const newContent = currentContent.replace(
						params.oldText,
						params.newText,
					);
					await this.fileService.writeFile(
						uri,
						VSBuffer.fromString(newContent),
					);

					return `Successfully edited file: ${params.path}\nReplaced text with new content.`;
				} catch (error) {
					throw new Error(
						`Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: Get File Info
		this.registerTool({
			name: 'get_file_info',
			description:
				'Get metadata information about a file or directory (size, type, modification time).',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description:
							'The absolute or relative path to the file or directory',
					},
				},
				required: ['path'],
			},
			execute: async (params: { path: string }) => {
				try {
					const uri = this.resolveUri(params.path);
					const stat = await this.fileService.resolve(uri);

					const type = stat.isDirectory ? 'Directory' : 'File';
					const size = stat.size ? this.formatSize(stat.size) : 'N/A';
					const modified = stat.mtime
						? new Date(stat.mtime).toLocaleString()
						: 'N/A';

					return `Path: ${params.path}\nType: ${type}\nSize: ${size}\nLast Modified: ${modified}`;
				} catch (error) {
					throw new Error(
						`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});

		// Tool: Delete File
		this.registerTool({
			name: 'delete_file',
			description: 'Delete a file or directory. Use with caution!',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description:
							'The absolute or relative path to the file or directory to delete',
					},
					recursive: {
						type: 'boolean',
						description:
							'If true, delete directories recursively (default: false)',
					},
				},
				required: ['path'],
			},
			execute: async (params: { path: string; recursive?: boolean }) => {
				try {
					const uri = this.resolveUri(params.path);
					await this.fileService.del(uri, {
						recursive: params.recursive || false,
					});
					return `Successfully deleted: ${params.path}`;
				} catch (error) {
					throw new Error(
						`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			},
		});
	}

	private resolveUri(path: string): URI {
		// If path is already absolute URI
		if (path.startsWith('file://')) {
			return URI.parse(path);
		}

		// If path is absolute
		if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
			return URI.file(path);
		}

		// Relative path - resolve against workspace
		const workspace = this.workspaceContextService.getWorkspace();
		if (workspace.folders.length === 0) {
			throw new Error('No workspace folder open');
		}

		return URI.joinPath(workspace.folders[0].uri, path);
	}

	private async searchInDirectory(
		uri: URI,
		pattern: string,
		maxResults: number,
	): Promise<string[]> {
		const results: string[] = [];

		try {
			const stat = await this.fileService.resolve(uri);

			if (!stat.children) {
				return results;
			}

			for (const child of stat.children) {
				if (results.length >= maxResults) {
					break;
				}

				if (child.isDirectory) {
					const subResults = await this.searchInDirectory(
						child.resource,
						pattern,
						maxResults - results.length,
					);
					results.push(...subResults);
				} else {
					if (this.matchesPattern(child.name, pattern)) {
						results.push(child.resource.path);
					}
				}
			}
		} catch (error) {
			// Skip directories we can't access
		}

		return results;
	}

	private matchesPattern(filename: string, pattern: string): boolean {
		// Simple glob pattern matching
		const regexPattern = pattern
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*')
			.replace(/\?/g, '.');

		const regex = new RegExp(`^${regexPattern}$`, 'i');
		return regex.test(filename);
	}

	private formatSize(bytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}

	registerTool(tool: IChatTool): void {
		this.tools.set(tool.name, tool);
	}

	getTool(name: string): IChatTool | undefined {
		return this.tools.get(name);
	}

	getAllTools(): IChatTool[] {
		return Array.from(this.tools.values());
	}

	async executeTool(name: string, parameters: any): Promise<string> {
		const tool = this.tools.get(name);
		if (!tool) {
			throw new Error(`Tool not found: ${name}`);
		}

		return await tool.execute(parameters);
	}
}
