/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener } from "../../../../../base/browser/dom.js";
import type { IDisposable } from "../../../../../base/common/lifecycle.js";
import { localize } from "../../../../../nls.js";

export interface ChatInputAreaOptions {
  parent: HTMLElement;
  register: <T extends IDisposable>(disposable: T) => T;
  onToggleSend: () => void;
  onEnterSend: () => void;
  providerLabel: string;
}

export interface ChatInputAreaHandles {
  input: HTMLTextAreaElement;
  sendStopButton: HTMLButtonElement;
}

export function renderChatInputArea(options: ChatInputAreaOptions): ChatInputAreaHandles {
  const inputContainer = append(options.parent, $(".alphacode-chat-input-container"));
  const inputWrapper = append(inputContainer, $(".alphacode-chat-input-wrapper"));

  const input = append(inputWrapper, $("textarea.alphacode-chat-input")) as HTMLTextAreaElement;
  input.placeholder = localize("alphacode.chat.placeholder", "Ask anything (Ctrl+L)");

  const toolbar = append(inputWrapper, $(".alphacode-chat-input-toolbar"));

  const left = append(toolbar, $(".alphacode-chat-toolbar-left"));
  const attachButton = append(
    left,
    $("button.alphacode-chat-icon-button", { title: localize("alphacode.chat.attach", "Attach files") }, "+"),
  ) as HTMLButtonElement;
  options.register(
    addDisposableListener(attachButton, "click", () => {
      // TODO: Implement file attachment
    }),
  );

  const center = append(toolbar, $(".alphacode-chat-toolbar-center"));
  append(center, $("span", undefined, options.providerLabel));

  const right = append(toolbar, $(".alphacode-chat-toolbar-right"));
  const micButton = append(
    right,
    $("button.alphacode-chat-icon-button", { title: localize("alphacode.chat.voice", "Voice input") }, "🎤"),
  ) as HTMLButtonElement;
  micButton.disabled = true;
  options.register(
    addDisposableListener(micButton, "click", () => {
      // TODO: Implement voice input
    }),
  );

  const sendStopButton = append(
    right,
    $(
      "button.alphacode-chat-send-button",
      { title: localize("alphacode.chat.send", "Send message") },
      "↑",
    ),
  ) as HTMLButtonElement;
  options.register(addDisposableListener(sendStopButton, "click", options.onToggleSend));

  options.register(
    addDisposableListener(input, "keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        options.onEnterSend();
      }
    }),
  );

  return {
    input,
    sendStopButton,
  };
}
