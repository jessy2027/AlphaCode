/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener } from "../../../../../base/browser/dom.js";
import type { IDisposable } from "../../../../../base/common/lifecycle.js";
import { localize } from "../../../../../nls.js";

export interface ChatHeaderOptions {
  parent: HTMLElement;
  register: <T extends IDisposable>(disposable: T) => T;
  onClear: () => void;
}

export interface ChatHeaderHandles {
  toolbarElement: HTMLElement;
  actionsContainer: HTMLElement;
}

export function renderChatHeader(options: ChatHeaderOptions): ChatHeaderHandles {
  const toolbar = append(options.parent, $(".alphacode-chat-toolbar"));
  append(toolbar, $("span", undefined, localize("alphacode.chat.title", "Vibe Coding Chat")));

  const actions = append(toolbar, $(".alphacode-chat-toolbar-actions"));

  const clearButton = append(
    actions,
    $(
      "button.monaco-text-button.alphacode-chat-toolbar-button",
      undefined,
      localize("alphacode.chat.clear", "Clear"),
    ),
  ) as HTMLButtonElement;

  options.register(
    addDisposableListener(clearButton, "click", () => {
      options.onClear();
    }),
  );

  return {
    toolbarElement: toolbar,
    actionsContainer: actions,
  };
}
