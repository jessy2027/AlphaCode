/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { PosixShellType, WindowsShellType, GeneralShellType } from '../../../../../../platform/terminal/common/terminal.js';
import { Event, Emitter } from '../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { isInlineCompletionSupported, SuggestAddon } from '../../browser/terminalSuggestAddon.js';
import type { ITerminalCompletion } from '../../browser/terminalCompletionItem.js';
import type { IContextKey } from '../../../../../../platform/contextkey/common/contextkey.js';

suite('Terminal Suggest Addon - Inline Completion, Shell Type Support', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('should return true for supported shell types', () => {
		strictEqual(isInlineCompletionSupported(PosixShellType.Bash), true);
		strictEqual(isInlineCompletionSupported(PosixShellType.Zsh), true);
		strictEqual(isInlineCompletionSupported(PosixShellType.Fish), true);
		strictEqual(isInlineCompletionSupported(GeneralShellType.PowerShell), true);
		strictEqual(isInlineCompletionSupported(WindowsShellType.GitBash), true);
	});

	test('should return false for unsupported shell types', () => {
		strictEqual(isInlineCompletionSupported(GeneralShellType.NuShell), false);
		strictEqual(isInlineCompletionSupported(GeneralShellType.Julia), false);
		strictEqual(isInlineCompletionSupported(GeneralShellType.Node), false);
		strictEqual(isInlineCompletionSupported(GeneralShellType.Python), false);
		strictEqual(isInlineCompletionSupported(PosixShellType.Sh), false);
		strictEqual(isInlineCompletionSupported(PosixShellType.Ksh), false);
		strictEqual(isInlineCompletionSupported(WindowsShellType.CommandPrompt), false);
		strictEqual(isInlineCompletionSupported(WindowsShellType.Wsl), false);
		strictEqual(isInlineCompletionSupported(GeneralShellType.Python), false);
		strictEqual(isInlineCompletionSupported(undefined), false);
	});
});

suite('Terminal Suggest Addon - Ghost Text Overlay', () => {
	ensureNoDisposablesAreLeakedInTestSuite();
	const store = new DisposableStore();

	class TestContextKey implements IContextKey<boolean> {
		private _value = false;
		set(value: boolean): void { this._value = value; }
		reset(): void { this._value = false; }
		get(): boolean { return this._value; }
		bind() { return this; }
		overlay() { return this; }
	}

	class TestTerminal {
		readonly buffer = { active: { cursorX: 2, cursorY: 0 }, baseY: 0, cursorY: 0 };
		readonly element = undefined;
		lastGhostText: string | undefined;
		lastDecorationX: number | undefined;
		markerDisposed = false;
		decorationDisposed = false;

		registerMarker() {
			return {
				dispose: () => { this.markerDisposed = true; }
			} as any;
		}

		registerDecoration(options: { marker: unknown; layer: string; x: number }) {
			const decoration = {
				dispose: () => { this.decorationDisposed = true; },
				onRender: (callback: (element: HTMLElement) => void) => {
					const element = {
						textContent: '',
						style: {} as Record<string, string>,
						classList: { add: () => { /* noop */ } }
					} as unknown as HTMLElement;
					callback(element);
					this.lastGhostText = element.textContent ?? undefined;
					this.lastDecorationX = options.x;
					return { dispose: () => { /* noop */ } };
				}
			} as any;
			return decoration;
		}

		registerMarkerDecoration() { return undefined; }
	}

	function createConfigurationService() {
		const emitter = new Emitter<void>();
		store.add(emitter);
		return {
			onDidChangeConfiguration: emitter.event,
			getValue: () => ({
				inlineSuggestion: 'alwaysOnTop',
				quickSuggestions: { commands: 'on', unknown: 'on' },
				runOnEnter: 'never'
			})
		} as any;
	}

	function createTerminalConfigurationService() {
		const emitter = new Emitter<void>();
		store.add(emitter);
		return {
			onConfigChanged: emitter.event,
			getFont: () => ({ fontSize: 12, fontFamily: 'monospace', letterSpacing: 0, lineHeight: 18 })
		} as any;
	}

	function createSuggestAddon() {
		const capabilities = {
			onDidAddCapabilityType: Event.None,
			onDidRemoveCapabilityType: Event.None,
			get: () => undefined
		} as any;
		const addon = new SuggestAddon(
			'1',
			PosixShellType.Bash,
			capabilities,
			new TestContextKey(),
			{ provideCompletions: async () => [] } as any,
			createConfigurationService(),
			{ createInstance: () => undefined } as any,
			{ activateByEvent: async () => undefined } as any,
			createTerminalConfigurationService(),
			{ trace: () => undefined, warn: () => undefined } as any
		);
		store.add(addon);
		return addon;
	}

	teardown(() => {
		store.clear();
	});

	test('ghost text overlay is created when inline suggestion present', () => {
		const addon = createSuggestAddon();
		const terminal = new TestTerminal();
		(addon as any)._terminal = terminal;
		let refilterCount = 0;
		(addon as any)._model = { forceRefilterAll: () => { refilterCount++; } };
		(addon as any)._cursorIndexDelta = 0;

		const completionState = {
			value: 'ls foo',
			prefix: 'ls ',
			suffix: '',
			cursorIndex: 3,
			ghostTextIndex: 3
		};
		(addon as any)._currentPromptInputState = completionState;
		(addon as any)._refreshInlineCompletion([] as ITerminalCompletion[]);

		strictEqual(terminal.lastGhostText, 'foo');
		strictEqual(terminal.lastDecorationX, terminal.buffer.active.cursorX);
		strictEqual(terminal.decorationDisposed, false);
		strictEqual(refilterCount > 0, true);

		(addon as any)._currentPromptInputState = {
			...completionState,
			ghostTextIndex: -1
		};
		(addon as any)._refreshInlineCompletion([] as ITerminalCompletion[]);

		strictEqual(terminal.decorationDisposed, true);
		strictEqual(terminal.markerDisposed, true);
	});
});
