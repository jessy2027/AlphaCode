/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from "../../../../platform/instantiation/common/instantiation.js";
import { URI } from "../../../../base/common/uri.js";

export const IAlphaCodeContextService =
	createDecorator<IAlphaCodeContextService>("alphaCodeContextService");

export interface ICodeSymbol {
	name: string;
	kind: string;
	location: {
		uri: URI;
		range: {
			startLine: number;
			startColumn: number;
			endLine: number;
			endColumn: number;
		};
	};
}

export interface IFileContext {
	uri: URI;
	path: string;
	language: string;
	size: number;
	content?: string;
	symbols?: ICodeSymbol[];
}

export interface IWorkspaceContext {
	files: IFileContext[];
	symbols: ICodeSymbol[];
	totalFiles: number;
	indexed: boolean;
}

export interface IAlphaCodeContextService {
	readonly _serviceBrand: undefined;

	/**
	 * Index the current workspace
	 */
	indexWorkspace(): Promise<void>;

	/**
	 * Get workspace context
	 */
	getWorkspaceContext(): Promise<IWorkspaceContext>;

	/**
	 * Get context for a specific file
	 */
	getFileContext(uri: URI): Promise<IFileContext | undefined>;

	/**
	 * Search for symbols in the workspace
	 */
	searchSymbols(query: string): Promise<ICodeSymbol[]>;

	/**
	 * Get relevant context based on query
	 */
	getRelevantContext(query: string, maxFiles?: number): Promise<IFileContext[]>;

	/**
	 * Clear the index
	 */
	clearIndex(): Promise<void>;

	/**
	 * Check if workspace is indexed
	 */
	isIndexed(): boolean;
}
