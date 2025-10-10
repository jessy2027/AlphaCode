# AlphaCode - AI-Powered IDE
[![Feature Requests](https://img.shields.io/github/issues/jessy2027/AlphaCodeIDE/feature-request.svg)](https://github.com/jessy2027/AlphaCodeIDE/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
[![Bugs](https://img.shields.io/github/issues/jessy2027/AlphaCodeIDE/bug.svg)](https://github.com/jessy2027/AlphaCodeIDE/issues?utf8=✓&q=is%3Aissue+is%3Aopen+label%3Abug)

## The Repository

This repository is where we develop AlphaCodeIDE, a fork of Visual Studio Code with integrated AI capabilities. We work on code and issues here together with the community. This source code is available to everyone under the standard [MIT license](https://github.com/jessy2027/AlphaCodeIDE/blob/main/LICENSE.txt).

## AlphaCode

<p align="center">
  <img alt="AlphaCode in action" src="https://user-images.githubusercontent.com/35271042/118224532-3842c400-b438-11eb-923d-a5f66fa6785a.png">
</p>

AlphaCode is a fork of Visual Studio Code that adds integrated AI capabilities including chat, code editing proposals, and multi-provider AI integration (Anthropic, OpenAI, Azure, local models). It combines the simplicity and power of VS Code with AI-powered assistance for your development workflow.

AlphaCode provides comprehensive code editing, navigation, and understanding support along with lightweight debugging, a rich extensibility model, and AI-powered features that help you write better code faster.

## Contributing

There are many ways in which you can participate in this project, for example:

* [Submit bugs and feature requests](https://github.com/jessy2027/AlphaCodeIDE/issues), and help us verify as they are checked in
* Review [source code changes](https://github.com/jessy2027/AlphaCodeIDE/pulls)
* Help improve documentation

If you are interested in fixing issues and contributing directly to the code base,
please see the document [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

* How to build and run from source
* The development workflow, including debugging and running tests
* Coding guidelines
* Submitting pull requests

## Feedback

* [Request a new feature](CONTRIBUTING.md)
* Upvote [popular feature requests](https://github.com/jessy2027/AlphaCodeIDE/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
* [File an issue](https://github.com/jessy2027/AlphaCodeIDE/issues)

## Bundled Extensions

AlphaCode includes a set of built-in extensions located in the [extensions](extensions) folder, including grammars and snippets for many languages. Extensions that provide rich language support (code completion, Go to Definition) for a language have the suffix `language-features`. For example, the `json` extension provides coloring for `JSON` and the `json-language-features` extension provides rich language support for `JSON`.

## Development Container

This repository includes a Dev Containers / GitHub Codespaces development container.

* For Dev Containers, use the **Dev Containers: Clone Repository in Container Volume...** command which creates a Docker volume for better disk I/O on macOS and Windows.

* For Codespaces, install the GitHub Codespaces extension and use the **Codespaces: Create New Codespace** command.

Docker / the Codespace should have at least **4 Cores and 6 GB of RAM (8 GB recommended)** to run a full build. See the [development container README](.devcontainer/README.md) for more information.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
