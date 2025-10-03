/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatFileUploadService, IChatFileUploadService } from './chatFileUploadService.js';
import { ChatFileValidationService, IChatFileValidationService } from './chatFileValidationService.js';
import { ChatFileStorageServiceImpl } from './chatFileStorageServiceImpl.js';
import { IChatFileStorageService } from '../common/chatFileStorageService.js';

// Enregistrement des services
registerSingleton(IChatFileUploadService, ChatFileUploadService, InstantiationType.Delayed);
registerSingleton(IChatFileValidationService, ChatFileValidationService, InstantiationType.Delayed);
registerSingleton(IChatFileStorageService, ChatFileStorageServiceImpl, InstantiationType.Delayed);

/**
 * Contribution pour initialiser les services d'attachement de fichiers
 */
class ChatFileAttachmentContribution extends Disposable {
	constructor(
		@IChatFileUploadService uploadService: IChatFileUploadService,
		@IChatFileValidationService validationService: IChatFileValidationService,
		@IChatFileStorageService storageService: IChatFileStorageService
	) {
		super();
		// Les services sont injectés et disponibles
		// Pas d'initialisation spécifique nécessaire pour le moment
	}
}

// Enregistrement de la contribution
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(ChatFileAttachmentContribution, LifecyclePhase.Eventually);
