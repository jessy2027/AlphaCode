/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IProductService } from '../../product/common/productService.js';
import { McpGalleryResourceType, IMcpGalleryManifest, IMcpGalleryManifestService, McpGalleryManifestStatus } from './mcpGalleryManifest.js';

export class McpGalleryManifestService extends Disposable implements IMcpGalleryManifestService {

	readonly _serviceBrand: undefined;
	readonly onDidChangeMcpGalleryManifest = Event.None;
	readonly onDidChangeMcpGalleryManifestStatus = Event.None;

	get mcpGalleryManifestStatus(): McpGalleryManifestStatus {
		return !!this.productService.mcpGallery?.serviceUrl ? McpGalleryManifestStatus.Available : McpGalleryManifestStatus.Unavailable;
	}

	constructor(
		@IProductService protected readonly productService: IProductService,
	) {
		super();
	}

	async getMcpGalleryManifest(): Promise<IMcpGalleryManifest | null> {
		if (!this.productService.mcpGallery) {
			return null;
		}
		return this.createMcpGalleryManifest(this.productService.mcpGallery.serviceUrl);
	}

	protected createMcpGalleryManifest(url: string): IMcpGalleryManifest {
		url = url.endsWith('/') ? url.slice(0, -1) : url;
		const isVSCodeGalleryUrl = this.productService.extensionsGallery?.mcpUrl === url;
		const isProductGalleryUrl = this.productService.mcpGallery?.serviceUrl === url;
		const version = isVSCodeGalleryUrl ? undefined : 'v0';
		const serversUrl = isVSCodeGalleryUrl ? url : `${url}/${version}/servers`;
		const resources = [
			{
				id: serversUrl,
				type: McpGalleryResourceType.McpServersQueryService
			}
		];
		if (!isVSCodeGalleryUrl) {
			resources.push({
				id: `${serversUrl}/{id}`,
				type: McpGalleryResourceType.McpServerResourceUri
			});
		}

		if (isProductGalleryUrl) {
			resources.push(
				{
					id: `${serversUrl}/search`,
					type: McpGalleryResourceType.McpServersSearchService
				},
				{
					id: `${serversUrl}/by-name/{name}`,
					type: McpGalleryResourceType.McpServerNamedResourceUri
				},
				{
					id: this.productService.mcpGallery.itemWebUrl,
					type: McpGalleryResourceType.McpServerWebUri
				},
				{
					id: this.productService.mcpGallery.publisherUrl,
					type: McpGalleryResourceType.PublisherUriTemplate
				},
				{
					id: this.productService.mcpGallery.supportUrl,
					type: McpGalleryResourceType.ContactSupportUri
				},
				{
					id: this.productService.mcpGallery.privacyPolicyUrl,
					type: McpGalleryResourceType.PrivacyPolicyUri
				},
				{
					id: this.productService.mcpGallery.termsOfServiceUrl,
					type: McpGalleryResourceType.TermsOfServiceUri
				},
				{
					id: this.productService.mcpGallery.reportUrl,
					type: McpGalleryResourceType.ReportUri
				}
			);
		}

		return {
			version,
			url,
			resources
		};
	}
}
