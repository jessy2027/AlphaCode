/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../../base/test/common/utils.js";
import { AlphaCodeChatService } from "../../browser/chatServiceImpl.js";
import { IAlphaCodeAIService } from "../../common/aiService.js";
import { IStorageService } from "../../../../../platform/storage/common/storage.js";
import { IAlphaCodeSecurityService } from "../../common/securityService.js";
import { IAlphaCodeContextService } from "../../common/contextService.js";
import { IFileService } from "../../../../../platform/files/common/files.js";
import { IWorkspaceContextService } from "../../../../../platform/workspace/common/workspace.js";
import { URI } from "../../../../../base/common/uri.js";

suite("AlphaCodeChatService - Tool Calls", () => {
	ensureNoDisposablesAreLeakedInTestSuite();
	let chatService: AlphaCodeChatService;
	let mockAIService: IAlphaCodeAIService;
	let mockStorageService: IStorageService;
	let mockSecurityService: IAlphaCodeSecurityService;
	let mockContextService: IAlphaCodeContextService;
	let mockFileService: IFileService;
	let mockWorkspaceContextService: IWorkspaceContextService;

	setup(() => {
		// Mock AI service
		mockAIService = {
			sendMessageStream: async (messages: any[], callback: any) => {
				// Simulate streaming response
				callback({ content: "Response", done: false });
				callback({ content: "", done: true });
			},
		} as any;

		// Mock storage service
		mockStorageService = {
			get: () => undefined,
			store: () => {},
		} as any;

		// Mock security service
		mockSecurityService = {
			maskSecrets: (text: string) => text,
		} as any;

		// Mock context service
		mockContextService = {
			getWorkspaceContext: async () => ({
				files: [],
				symbols: [],
			}),
			getRelevantContext: async () => [],
		} as any;

		// Mock file service
		mockFileService = {
			readFile: async () => ({ value: { toString: () => "" } }),
			writeFile: async () => {},
			resolve: async () => ({ isDirectory: false }),
			del: async () => {},
		} as any;

		// Mock workspace context service
		mockWorkspaceContextService = {
			getWorkspace: () => ({
				folders: [{ uri: URI.file("/workspace") }],
			}),
		} as any;

		chatService = new AlphaCodeChatService(
			mockAIService,
			mockStorageService,
			mockSecurityService,
			mockContextService,
			mockFileService,
			mockWorkspaceContextService,
		);
	});

	test("should have tools available", () => {
		const tools = chatService.getAvailableTools();
		assert.ok(tools.length > 0, "Should have tools available");
		assert.ok(
			tools.some((t) => t.name === "read_file"),
			"Should have read_file tool",
		);
	});

	test("should extract tool calls from response", () => {
		const content = `I will read the file.
\`\`\`tool
{
  "name": "read_file",
  "parameters": {
    "path": "test.ts"
  }
}
\`\`\``;

		// Access private method for testing
		const extractToolCalls = (chatService as any).extractToolCalls.bind(
			chatService,
		);
		const toolCalls = extractToolCalls(content);

		assert.strictEqual(toolCalls.length, 1, "Should extract one tool call");
		assert.strictEqual(toolCalls[0].name, "read_file");
		assert.strictEqual(toolCalls[0].parameters.path, "test.ts");
	});

	test("should extract multiple tool calls", () => {
		const content = `I will do two things.
\`\`\`tool
{
  "name": "read_file",
  "parameters": {
    "path": "file1.ts"
  }
}
\`\`\`

And then:

\`\`\`tool
{
  "name": "read_file",
  "parameters": {
    "path": "file2.ts"
  }
}
\`\`\``;

		const extractToolCalls = (chatService as any).extractToolCalls.bind(
			chatService,
		);
		const toolCalls = extractToolCalls(content);

		assert.strictEqual(toolCalls.length, 2, "Should extract two tool calls");
		assert.strictEqual(toolCalls[0].parameters.path, "file1.ts");
		assert.strictEqual(toolCalls[1].parameters.path, "file2.ts");
	});

	test("should handle invalid JSON in tool call", () => {
		const content = `\`\`\`tool
{
  "name": "read_file",
  invalid json
}
\`\`\``;

		const extractToolCalls = (chatService as any).extractToolCalls.bind(
			chatService,
		);
		const toolCalls = extractToolCalls(content);

		assert.strictEqual(
			toolCalls.length,
			0,
			"Should not extract invalid tool calls",
		);
	});

	test("should handle missing name in tool call", () => {
		const content = `\`\`\`tool
{
  "parameters": {
    "path": "test.ts"
  }
}
\`\`\``;

		const extractToolCalls = (chatService as any).extractToolCalls.bind(
			chatService,
		);
		const toolCalls = extractToolCalls(content);

		assert.strictEqual(
			toolCalls.length,
			0,
			"Should not extract tool call without name",
		);
	});

	test("should handle missing parameters in tool call", () => {
		const content = `\`\`\`tool
{
  "name": "read_file"
}
\`\`\``;

		const extractToolCalls = (chatService as any).extractToolCalls.bind(
			chatService,
		);
		const toolCalls = extractToolCalls(content);

		assert.strictEqual(
			toolCalls.length,
			0,
			"Should not extract tool call without parameters",
		);
	});

	test("should execute tool call successfully", async () => {
		const toolCall = {
			id: "test-id",
			name: "read_file",
			parameters: { path: "test.ts" },
		};

		const result = await chatService.executeToolCall(toolCall);

		assert.strictEqual(result.toolCallId, "test-id");
		assert.ok(result.result !== undefined || result.error !== undefined);
	});

	test("should handle tool execution error", async () => {
		const toolCall = {
			id: "test-id",
			name: "unknown_tool",
			parameters: {},
		};

		const result = await chatService.executeToolCall(toolCall);

		assert.strictEqual(result.toolCallId, "test-id");
		assert.ok(result.error, "Should have error");
		assert.ok(result.error!.includes("Tool not found"));
	});

	test("should create session with default title", () => {
		const session = chatService.createSession();
		assert.ok(session.id);
		assert.ok(session.title.includes("Session"));
		assert.strictEqual(session.messages.length, 0);
	});

	test("should create session with custom title", () => {
		const session = chatService.createSession("My Custom Session");
		assert.strictEqual(session.title, "My Custom Session");
	});

	test("should get current session", () => {
		chatService.createSession("Test Session");
		const session = chatService.getCurrentSession();
		assert.ok(session);
		assert.strictEqual(session!.title, "Test Session");
	});

	test("should switch sessions", () => {
		const session1 = chatService.createSession("Session 1");
		chatService.createSession("Session 2");

		chatService.switchSession(session1.id);
		const current = chatService.getCurrentSession();
		assert.strictEqual(current!.id, session1.id);
	});

	test("should get all sessions", () => {
		chatService.createSession("Session 1");
		chatService.createSession("Session 2");
		chatService.createSession("Session 3");

		const sessions = chatService.getSessions();
		assert.strictEqual(sessions.length, 3);
	});

	test("should delete session", () => {
		const session1 = chatService.createSession("Session 1");
		chatService.createSession("Session 2");

		chatService.deleteSession(session1.id);
		const sessions = chatService.getSessions();
		assert.strictEqual(sessions.length, 1);
	});

	test("should export session", () => {
		const session = chatService.createSession("Test Session");
		const exported = chatService.exportSession(session.id);

		assert.ok(exported);
		const parsed = JSON.parse(exported);
		assert.strictEqual(parsed.title, "Test Session");
	});

	test("should clear current session", () => {
		const session = chatService.createSession("Test Session");
		// Add a mock message
		session.messages.push({
			id: "msg-1",
			role: "user",
			content: "Test",
			timestamp: Date.now(),
		});

		chatService.clearCurrentSession();
		const current = chatService.getCurrentSession();
		assert.strictEqual(current!.messages.length, 0);
	});
});
