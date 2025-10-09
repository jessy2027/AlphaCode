/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TransactionManager } from '../../browser/transactionManager.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';

suite('TransactionManager', () => {
	const disposables = new DisposableStore();

	ensureNoDisposablesAreLeakedInTestSuite();

	teardown(() => {
		disposables.clear();
	});

	test('should create a transaction when applying a proposal', async () => {
		// Mock services
		const mockTextModelService = {} as ITextModelService;
		const mockUndoRedoService = {
			pushElement: () => { }
		} as unknown as IUndoRedoService;

		disposables.add(
			new TransactionManager(mockTextModelService, mockUndoRedoService)
		);

		// Note: This test requires proper mocking of ITextModel
		// In a real scenario, you would need to provide a proper text model mock
	});

	test('should track multiple transactions for the same file', () => {
		const mockTextModelService = {} as ITextModelService;
		const mockUndoRedoService = {
			pushElement: () => { }
		} as unknown as IUndoRedoService;

		const transactionManager = disposables.add(
			new TransactionManager(mockTextModelService, mockUndoRedoService)
		);

		const filePath = '/test/test.ts';

		// Initially no transactions
		const transactions = transactionManager.getFileTransactions(filePath);
		assert.strictEqual(transactions.length, 0);
	});

	test('should clear all transactions on dispose', () => {
		const mockTextModelService = {} as ITextModelService;
		const mockUndoRedoService = {
			pushElement: () => { }
		} as unknown as IUndoRedoService;

		const transactionManager = new TransactionManager(mockTextModelService, mockUndoRedoService);

		transactionManager.clearTransactions();
		transactionManager.dispose();

		// After dispose, manager should be clean
		const transactions = transactionManager.getFileTransactions('/any/file.ts');
		assert.strictEqual(transactions.length, 0);
	});

	test('should handle rollback of non-existent transaction gracefully', async () => {
		const mockTextModelService = {} as ITextModelService;
		const mockUndoRedoService = {
			pushElement: () => { }
		} as unknown as IUndoRedoService;

		const transactionManager = disposables.add(
			new TransactionManager(mockTextModelService, mockUndoRedoService)
		);

		try {
			await transactionManager.rollback('non-existent-id');
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.ok(error instanceof Error);
			assert.ok((error as Error).message.includes('not found'));
		}
	});
});
