/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from "../../../../nls.js";
import { Registry } from "../../../../platform/registry/common/platform.js";
import {
	IViewContainersRegistry,
	ViewContainerLocation,
	Extensions as ViewContainerExtensions,
	IViewsRegistry,
	Extensions as ViewExtensions,
	IViewDescriptor,
} from "../../../common/views.js";
import { SyncDescriptor } from "../../../../platform/instantiation/common/descriptors.js";
import {
	VIEWLET_ID,
	VIEW_CONTAINER_TITLE_VALUE,
	VIBE_CODING_VIEW_ID,
	VIBE_CODING_VIEW_TITLE,
} from "../common/alphacode.js";
import { AlphaCodeViewlet } from "./alphacodeViewlet.js";
import { Codicon } from "../../../../base/common/codicons.js";
import { registerIcon } from "../../../../platform/theme/common/iconRegistry.js";
import { VibeCodingView } from "./vibeCodingView.js";
import {
	registerSingleton,
	InstantiationType,
} from "../../../../platform/instantiation/common/extensions.js";
import { IAlphaCodeAIService } from "../common/aiService.js";
import { AlphaCodeAIService } from "./aiServiceImpl.js";
import { IAlphaCodeChatService } from "../common/chatService.js";
import { AlphaCodeChatService } from "./chatServiceImpl.js";
import { IAlphaCodeContextService } from "../common/contextService.js";
import { AlphaCodeContextService } from "./contextServiceImpl.js";
import { IAlphaCodeAgentService } from "../common/agents.js";
import { AlphaCodeAgentService } from "./agentServiceImpl.js";
import { IAlphaCodePairProgrammingService } from "../common/pairProgramming.js";
import { AlphaCodePairProgrammingService } from "./pairProgrammingServiceImpl.js";
import { IAlphaCodeSecurityService } from "../common/securityService.js";
import { AlphaCodeSecurityService } from "./securityServiceImpl.js";
import { IAlphaCodeFileAttachmentService } from "../common/fileAttachmentService.js";
import { AlphaCodeFileAttachmentService } from "./fileAttachmentServiceImpl.js";
import { IFileEmbeddingService } from "../common/fileEmbeddingService.js";
import { FileEmbeddingService } from "./fileEmbeddingServiceImpl.js";
import "../common/configuration.js";
import "./alphacodeActions.js";

const alphaCodeIcon = registerIcon(
	"alphacode-view-icon",
	Codicon.hubot,
	localize("alphaCodeIcon", "AlphaCode icon"),
);

// Register View Container - Place AlphaCode in AuxiliaryBar (where Copilot was)
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(
	ViewContainerExtensions.ViewContainersRegistry,
);
const viewContainer = viewContainerRegistry.registerViewContainer(
	{
		id: VIEWLET_ID,
		title: localize2("alphaCode", "AlphaCode"),
		ctorDescriptor: new SyncDescriptor(AlphaCodeViewlet),
		icon: alphaCodeIcon,
		order: 0,
	},
	ViewContainerLocation.AuxiliaryBar,
	{ isDefault: true },
);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
const vibeCodingViewDescriptor: IViewDescriptor = {
	id: VIBE_CODING_VIEW_ID,
	name: VIBE_CODING_VIEW_TITLE,
	ctorDescriptor: new SyncDescriptor(VibeCodingView),
	canMoveView: true,
	canToggleVisibility: false,
	containerIcon: alphaCodeIcon,
	containerTitle: VIEW_CONTAINER_TITLE_VALUE,
};

viewsRegistry.registerViews([vibeCodingViewDescriptor], viewContainer);

// Register Services
registerSingleton(
	IAlphaCodeAIService,
	AlphaCodeAIService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodeChatService,
	AlphaCodeChatService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodeContextService,
	AlphaCodeContextService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodeAgentService,
	AlphaCodeAgentService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodePairProgrammingService,
	AlphaCodePairProgrammingService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodeSecurityService,
	AlphaCodeSecurityService,
	InstantiationType.Delayed,
);
registerSingleton(
	IAlphaCodeFileAttachmentService,
	AlphaCodeFileAttachmentService,
	InstantiationType.Delayed,
);
registerSingleton(
	IFileEmbeddingService,
	FileEmbeddingService,
	InstantiationType.Delayed,
);
