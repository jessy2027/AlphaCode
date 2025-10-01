/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../../base/test/common/utils.js";
import { URI } from "../../../../../base/common/uri.js";
import { VSBuffer } from "../../../../../base/common/buffer.js";
import { ChatToolsRegistry } from "../../browser/chatTools.js";
import { IFileService } from "../../../../../platform/files/common/files.js";
import { IWorkspaceContextService } from "../../../../../platform/workspace/common/workspace.js";

suite("ChatToolsRegistry", () => {
	ensureNoDisposablesAreLeakedInTestSuite();
	let toolsRegistry: ChatToolsRegistry;
	let mockFileService: IFileService;
	let mockWorkspaceContextService: IWorkspaceContextService;

	setup(() => {
		// Mock file service
		mockFileService = {
			readFile: async (uri: URI) => {
				if (uri.path.endsWith("test.ts")) {
					return { value: VSBuffer.fromString("export const test = true;") };
				}
				throw new Error("File not found");
			},
			writeFile: async (uri: URI, content: VSBuffer) => {
				// Mock write success
			},
			resolve: async (uri: URI) => {
				if (uri.path.endsWith("src")) {
					return {
						isDirectory: true,
						children: [
							{
								name: "main.ts",
								isDirectory: false,
								size: 1024,
								resource: URI.file("/workspace/src/main.ts"),
							},
							{
								name: "utils",
								isDirectory: true,
								resource: URI.file("/workspace/src/utils"),
							},
						],
					};
				}
				return {
					isDirectory: false,
					size: 1024,
					mtime: Date.now(),
				};
			},
			del: async (uri: URI, options?: any) => {
				// Mock delete success
			},
		} as any;

		// Mock workspace context service
		mockWorkspaceContextService = {
			getWorkspace: () => ({
				folders: [{ uri: URI.file("/workspace") }],
			}),
		} as any;

		toolsRegistry = new ChatToolsRegistry(
			mockFileService,
			mockWorkspaceContextService,
		);
	});

	test("should register default tools", () => {
		const tools = toolsRegistry.getAllTools();
		assert.strictEqual(tools.length, 7, "Should have 7 default tools");

		const toolNames = tools.map((t) => t.name);
		assert.ok(toolNames.includes("read_file"), "Should have read_file tool");
		assert.ok(
			toolNames.includes("list_directory"),
			"Should have list_directory tool",
		);
		assert.ok(
			toolNames.includes("search_files"),
			"Should have search_files tool",
		);
		assert.ok(toolNames.includes("write_file"), "Should have write_file tool");
		assert.ok(toolNames.includes("edit_file"), "Should have edit_file tool");
		assert.ok(
			toolNames.includes("get_file_info"),
			"Should have get_file_info tool",
		);
		assert.ok(
			toolNames.includes("delete_file"),
			"Should have delete_file tool",
		);
	});

	test("should get tool by name", () => {
		const readFileTool = toolsRegistry.getTool("read_file");
		assert.ok(readFileTool, "Should find read_file tool");
		assert.strictEqual(readFileTool!.name, "read_file");
		assert.ok(
			readFileTool!.description.length > 0,
			"Tool should have description",
		);
		assert.ok(readFileTool!.parameters, "Tool should have parameters");
	});

	test("should execute read_file tool", async () => {
		const result = await toolsRegistry.executeTool("read_file", {
			path: "test.ts",
		});
		assert.ok(
			result.includes("export const test = true;"),
			"Should return file content",
		);
	});

	test("should execute list_directory tool", async () => {
		const result = await toolsRegistry.executeTool("list_directory", {
			path: "src",
		});
		assert.ok(result.includes("[FILE] main.ts"), "Should list files");
		assert.ok(result.includes("[DIR] utils"), "Should list directories");
	});

	test("should throw error for unknown tool", async () => {
		try {
			await toolsRegistry.executeTool("unknown_tool", {});
			assert.fail("Should throw error for unknown tool");
		} catch (error) {
			assert.ok(error instanceof Error);
			assert.ok(error.message.includes("Tool not found"));
		}
	});

	test("should register custom tool", () => {
		toolsRegistry.registerTool({
			name: "custom_tool",
			description: "A custom tool",
			parameters: {
				type: "object",
				properties: {
					input: { type: "string", description: "Input parameter" },
				},
				required: ["input"],
			},
			execute: async (params: any) => {
				return `Custom result: ${params.input}`;
			},
		});

		const customTool = toolsRegistry.getTool("custom_tool");
		assert.ok(customTool, "Should find custom tool");
		assert.strictEqual(customTool!.name, "custom_tool");
	});

	test("should execute custom tool", async () => {
		toolsRegistry.registerTool({
			name: "echo_tool",
			description: "Echoes input",
			parameters: {
				type: "object",
				properties: {
					message: { type: "string", description: "Message to echo" },
				},
				required: ["message"],
			},
			execute: async (params: { message: string }) => {
				return `Echo: ${params.message}`;
			},
		});

		const result = await toolsRegistry.executeTool("echo_tool", {
			message: "Hello",
		});
		assert.strictEqual(result, "Echo: Hello");
	});

	test("read_file tool should have correct parameters", () => {
		const tool = toolsRegistry.getTool("read_file");
		assert.ok(tool);
		assert.strictEqual(tool.parameters.type, "object");
		assert.ok(tool.parameters.properties.path);
		assert.strictEqual(tool.parameters.properties.path.type, "string");
		assert.ok(tool.parameters.required?.includes("path"));
	});

	test("write_file tool should have correct parameters", () => {
		const tool = toolsRegistry.getTool("write_file");
		assert.ok(tool);
		assert.ok(tool.parameters.properties.path);
		assert.ok(tool.parameters.properties.content);
		assert.ok(tool.parameters.required?.includes("path"));
		assert.ok(tool.parameters.required?.includes("content"));
	});

	test("edit_file tool should have correct parameters", () => {
		const tool = toolsRegistry.getTool("edit_file");
		assert.ok(tool);
		assert.ok(tool.parameters.properties.path);
		assert.ok(tool.parameters.properties.oldText);
		assert.ok(tool.parameters.properties.newText);
		assert.strictEqual(tool.parameters.required?.length, 3);
	});

	test("search_files tool should have maxResults parameter", () => {
		const tool = toolsRegistry.getTool("search_files");
		assert.ok(tool);
		assert.ok(tool.parameters.properties.pattern);
		assert.ok(tool.parameters.properties.maxResults);
		assert.strictEqual(tool.parameters.properties.maxResults.type, "number");
	});

	test("delete_file tool should have recursive parameter", () => {
		const tool = toolsRegistry.getTool("delete_file");
		assert.ok(tool);
		assert.ok(tool.parameters.properties.path);
		assert.ok(tool.parameters.properties.recursive);
		assert.strictEqual(tool.parameters.properties.recursive.type, "boolean");
	});
});
