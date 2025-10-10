/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { h, reset } from '../../../../../base/browser/dom.js';
import { Disposable, IDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, IObservable, IReader, ISettableObservable, observableFromEvent, observableSignal, observableSignalFromEvent, observableValue, transaction } from '../../../../../base/common/observable.js';
import { CodeEditorWidget } from '../../codeEditor/codeEditorWidget.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';

export class EditorGutter<T extends IGutterItemInfo = IGutterItemInfo> extends Disposable {
	private readonly scrollTop;
	private readonly isScrollTopZero;
	private readonly modelAttached;

	private readonly editorOnDidChangeViewZones;
	private readonly editorOnDidContentSizeChange;
	private readonly domNodeSizeChanged;

	constructor(
		private readonly _editor: CodeEditorWidget,
		private readonly _domNode: HTMLElement,
		private readonly itemProvider: IGutterItemProvider<T>
	) {
		super();
		this.scrollTop = observableFromEvent(this,
			this._editor.onDidScrollChange,
			(e) => /** @description editor.onDidScrollChange */ this._editor.getScrollTop()
		);
		this.isScrollTopZero = this.scrollTop.map((scrollTop) => /** @description isScrollTopZero */ scrollTop === 0);
		this.modelAttached = observableFromEvent(this,
			this._editor.onDidChangeModel,
			(e) => /** @description editor.onDidChangeModel */ this._editor.hasModel()
		);
		this.editorOnDidChangeViewZones = observableSignalFromEvent('onDidChangeViewZones', this._editor.onDidChangeViewZones);
		this.editorOnDidContentSizeChange = observableSignalFromEvent('onDidContentSizeChange', this._editor.onDidContentSizeChange);
		this.domNodeSizeChanged = observableSignal('domNodeSizeChanged');
		this.views = new Map<string, ManagedGutterItemView<T>>();
		this._domNode.className = 'gutter monaco-editor';
		const scrollDecoration = this._domNode.appendChild(
			h('div.scroll-decoration', { role: 'presentation', ariaHidden: 'true', style: { width: '100%' } })
				.root
		);

		const o = new ResizeObserver(() => {
			transaction(tx => {
				/** @description ResizeObserver: size changed */
				this.domNodeSizeChanged.trigger(tx);
			});
		});
		o.observe(this._domNode);
		this._register(toDisposable(() => o.disconnect()));

		this._register(autorun(reader => {
			/** @description update scroll decoration */
			scrollDecoration.className = this.isScrollTopZero.read(reader) ? '' : 'scroll-decoration';
		}));

		this._register(autorun(reader => /** @description EditorGutter.Render */ this.render(reader)));
	}

	override dispose(): void {
		super.dispose();

		reset(this._domNode);
	}

	private readonly views: Map<string, ManagedGutterItemView<T>>;

	private render(reader: IReader): void {
		if (!this.modelAttached.read(reader)) {
			return;
		}

		this.domNodeSizeChanged.read(reader);
		this.editorOnDidChangeViewZones.read(reader);
		this.editorOnDidContentSizeChange.read(reader);

		const scrollTop = this.scrollTop.read(reader);
		const visibleRanges = this._editor.getVisibleRanges();
		const unusedIds = new Set(this.views.keys());
		const viewRange = OffsetRange.ofStartAndLength(0, this._domNode.clientHeight);

		if (!viewRange.isEmpty) {
			this.renderVisibleRanges(visibleRanges, reader, scrollTop, viewRange, unusedIds);
		}

		this.cleanupUnusedViews(unusedIds);
	}

	private renderVisibleRanges(
		visibleRanges: readonly { startLineNumber: number; endLineNumber: number }[],
		reader: IReader,
		scrollTop: number,
		viewRange: OffsetRange,
		unusedIds: Set<string>
	): void {
		for (const visibleRange of visibleRanges) {
			const visibleRange2 = new LineRange(
				visibleRange.startLineNumber,
				visibleRange.endLineNumber + 1
			);

			const gutterItems = this.itemProvider.getIntersectingGutterItems(visibleRange2, reader);

			transaction(tx => {
				for (const gutterItem of gutterItems) {
					if (!gutterItem.range.intersect(visibleRange2)) {
						continue;
					}
					this.renderGutterItem(gutterItem, tx, scrollTop, viewRange, unusedIds);
				}
			});
		}
	}

	private renderGutterItem(
		gutterItem: T,
		tx: any,
		scrollTop: number,
		viewRange: OffsetRange,
		unusedIds: Set<string>
	): void {
		unusedIds.delete(gutterItem.id);
		const view = this.getOrCreateView(gutterItem, tx);

		const model = this._editor.getModel();
		const lineCount = model?.getLineCount() ?? 0;

		const top = this.calculateTopPosition(gutterItem, lineCount, scrollTop);
		const bottom = this.calculateBottomPosition(gutterItem, lineCount, scrollTop, top);
		const height = bottom - top;

		view.domNode.style.top = `${top}px`;
		view.domNode.style.height = `${height}px`;
		view.gutterItemView.layout(OffsetRange.ofStartAndLength(top, height), viewRange);
	}

	private getOrCreateView(gutterItem: T, tx: any): ManagedGutterItemView<T> {
		let view = this.views.get(gutterItem.id);
		if (!view) {
			const viewDomNode = document.createElement('div');
			this._domNode.appendChild(viewDomNode);
			const gutterItemObs = observableValue<T>('item', gutterItem);
			const itemView = this.itemProvider.createView(gutterItemObs as IObservable<T>, viewDomNode);
			view = new ManagedGutterItemView(gutterItemObs, itemView, viewDomNode);
			this.views.set(gutterItem.id, view);
		} else {
			view.item.set(gutterItem, tx);
		}
		return view;
	}

	private calculateTopPosition(gutterItem: T, lineCount: number, scrollTop: number): number {
		if (gutterItem.range.startLineNumber <= lineCount) {
			return this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) - scrollTop;
		} else if (gutterItem.range.startLineNumber > 1 && gutterItem.range.startLineNumber - 1 <= lineCount) {
			return this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) - scrollTop;
		}
		return 0;
	}

	private calculateBottomPosition(gutterItem: T, lineCount: number, scrollTop: number, top: number): number {
		if (gutterItem.range.endLineNumberExclusive === 1) {
			return Math.max(top, this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, false) - scrollTop);
		} else if (gutterItem.range.endLineNumberExclusive - 1 <= lineCount) {
			return Math.max(top, this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) - scrollTop);
		}
		return top;
	}

	private cleanupUnusedViews(unusedIds: Set<string>): void {
		for (const id of unusedIds) {
			const view = this.views.get(id)!;
			view.gutterItemView.dispose();
			view.domNode.remove();
			this.views.delete(id);
		}
	}
}


class ManagedGutterItemView<T extends IGutterItemInfo> {
	constructor(
		public readonly item: ISettableObservable<T>,
		public readonly gutterItemView: IGutterItemView,
		public readonly domNode: HTMLDivElement,
	) { }
}

export interface IGutterItemProvider<TItem extends IGutterItemInfo> {
	getIntersectingGutterItems(range: LineRange, reader: IReader): TItem[];

	createView(item: IObservable<TItem>, target: HTMLElement): IGutterItemView;
}

export interface IGutterItemInfo {
	id: string;
	range: LineRange;
}

export interface IGutterItemView extends IDisposable {
	layout(itemRange: OffsetRange, viewRange: OffsetRange): void;
}
