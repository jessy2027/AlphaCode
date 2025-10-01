/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IAlphaCodeAgentService } from '../common/agents.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IAlphaCodeContextService } from '../common/contextService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIBE_CODING_VIEW_ID } from '../common/alphacode.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';

// Generate Code Command
class GenerateCodeAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.generateCode',
			title: localize2('alphacode.generateCode', "Generate Code"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const notificationService = accessor.get(INotificationService);

		const editor = editorService.activeTextEditorControl;
		if (!editor) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noEditor', "No active editor")
			});
			return;
		}

		// This would typically open a prompt dialog
		// For now, this is a placeholder
		notificationService.notify({
			severity: Severity.Info,
			message: localize('alphacode.generateCode.prompt', "Code generation initiated. Use the Vibe Coding panel for interactive generation.")
		});
	}
}

// Refactor Code Command
class RefactorCodeAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.refactorCode',
			title: localize2('alphacode.refactorCode', "Refactor Selected Code"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const agentService = accessor.get(IAlphaCodeAgentService);
		const editorService = accessor.get(IEditorService);
		const notificationService = accessor.get(INotificationService);

		const editor = editorService.activeTextEditorControl;
		if (!editor || !isCodeEditor(editor)) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noEditor', "No active editor")
			});
			return;
		}

		const selection = editor.getSelection();
		const model = editor.getModel();

		if (!selection || selection.isEmpty() || !model) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noSelection', "No code selected")
			});
			return;
		}

		const selectedCode = model.getValueInRange(selection);
		const language = model.getLanguageId();

		try {
			const response = await agentService.refactorCode(selectedCode, 'Improve this code', language);

			if (response.success) {
				notificationService.notify({
					severity: Severity.Info,
					message: localize('alphacode.refactorSuccess', "Code refactored successfully. Check Vibe Coding panel for results.")
				});
			} else {
				notificationService.notify({
					severity: Severity.Error,
					message: localize('alphacode.refactorError', "Refactoring failed: {0}", response.error || 'Unknown error')
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('alphacode.error', "Error: {0}", error instanceof Error ? error.message : 'Unknown error')
			});
		}
	}
}

// Explain Code Command
class ExplainCodeAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.explainCode',
			title: localize2('alphacode.explainCode', "Explain Selected Code"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const agentService = accessor.get(IAlphaCodeAgentService);
		const editorService = accessor.get(IEditorService);
		const notificationService = accessor.get(INotificationService);

		const editor = editorService.activeTextEditorControl;
		if (!editor || !isCodeEditor(editor)) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noEditor', "No active editor")
			});
			return;
		}

		const selection = editor.getSelection();
		const model = editor.getModel();

		if (!selection || selection.isEmpty() || !model) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noSelection', "No code selected")
			});
			return;
		}

		const selectedCode = model.getValueInRange(selection);
		const language = model.getLanguageId();

		try {
			const response = await agentService.explainCode(selectedCode, language);

			if (response.success) {
				notificationService.notify({
					severity: Severity.Info,
					message: localize('alphacode.explainSuccess', "Code explained. Check Vibe Coding panel for explanation.")
				});
			} else {
				notificationService.notify({
					severity: Severity.Error,
					message: localize('alphacode.explainError', "Explanation failed: {0}", response.error || 'Unknown error')
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('alphacode.error', "Error: {0}", error instanceof Error ? error.message : 'Unknown error')
			});
		}
	}
}

// Index Workspace Command
class IndexWorkspaceAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.indexWorkspace',
			title: localize2('alphacode.indexWorkspace', "Index Workspace"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const contextService = accessor.get(IAlphaCodeContextService);
		const notificationService = accessor.get(INotificationService);

		try {
			notificationService.notify({
				severity: Severity.Info,
				message: localize('alphacode.indexing', "Indexing workspace...")
			});

			await contextService.indexWorkspace();

			notificationService.notify({
				severity: Severity.Info,
				message: localize('alphacode.indexSuccess', "Workspace indexed successfully")
			});
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('alphacode.indexError', "Indexing failed: {0}", error instanceof Error ? error.message : 'Unknown error')
			});
		}
	}
}

// Generate Documentation Command
class GenerateDocumentationAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.generateDocumentation',
			title: localize2('alphacode.generateDocumentation', "Generate Documentation"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const agentService = accessor.get(IAlphaCodeAgentService);
		const editorService = accessor.get(IEditorService);
		const notificationService = accessor.get(INotificationService);

		const editor = editorService.activeTextEditorControl;
		if (!editor || !isCodeEditor(editor)) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noEditor', "No active editor")
			});
			return;
		}

		const selection = editor.getSelection();
		const model = editor.getModel();

		if (!selection || selection.isEmpty() || !model) {
			notificationService.notify({
				severity: Severity.Warning,
				message: localize('alphacode.noSelection', "No code selected")
			});
			return;
		}

		const selectedCode = model.getValueInRange(selection);
		const language = model.getLanguageId();

		try {
			const response = await agentService.generateDocumentation(selectedCode, language);

			if (response.success) {
				notificationService.notify({
					severity: Severity.Info,
					message: localize('alphacode.docsSuccess', "Documentation generated. Check Vibe Coding panel for results.")
				});
			} else {
				notificationService.notify({
					severity: Severity.Error,
					message: localize('alphacode.docsError', "Documentation generation failed: {0}", response.error || 'Unknown error')
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('alphacode.error', "Error: {0}", error instanceof Error ? error.message : 'Unknown error')
			});
		}
	}
}

// Open AlphaCode View Command (replaces Copilot's Ctrl+Alt+I)
class OpenAlphaCodeAction extends Action2 {
	constructor() {
		super({
			id: 'alphacode.openView',
			title: localize2('alphacode.openView', "Open AlphaCode"),
			category: Categories.View,
			f1: true,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyI,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KeyI
				}
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		await viewsService.openView(VIBE_CODING_VIEW_ID, true);
	}
}

// Register all actions
registerAction2(OpenAlphaCodeAction);
registerAction2(GenerateCodeAction);
registerAction2(RefactorCodeAction);
registerAction2(ExplainCodeAction);
registerAction2(IndexWorkspaceAction);
registerAction2(GenerateDocumentationAction);
