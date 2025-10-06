/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener } from "../../../../../base/browser/dom.js";
import type { IDisposable } from "../../../../../base/common/lifecycle.js";

export interface ChatMessageListOptions {
  parent: HTMLElement;
  register: <T extends IDisposable>(disposable: T) => T;
  onScroll: (scrollTop: number) => void;
}

export function renderChatMessageList(options: ChatMessageListOptions): HTMLElement {
  const container = append(options.parent, $(".alphacode-chat-messages"));

  options.register(
    addDisposableListener(container, "scroll", () => {
      options.onScroll(container.scrollTop);
    }),
  );

  return container;
}
