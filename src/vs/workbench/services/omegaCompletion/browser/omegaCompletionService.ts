/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { asJson, IRequestService, isSuccess } from '../../../../platform/request/common/request.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOmegaCompletionService, OmegaCompletionRequest, OmegaCompletionResult } from '../common/omegaCompletion.js';
import { OmegaCompletionConfiguration } from '../common/omegaCompletionConfiguration.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { ILogService } from '../../../../platform/log/common/log.js';

interface OmegaServiceResponse {
	completion?: string;
	output_text?: string;
	choices?: Array<{ text?: string; message?: { content?: string } }>;
	result?: { text?: string };
}

interface OmegaSettings {
	readonly endpoint: string;
	readonly apiKey: string | undefined;
	readonly model: string | undefined;
	readonly temperature: number;
	readonly topP: number;
	readonly maxOutputTokens: number;
	readonly timeout: number;
}

export class OmegaCompletionService extends Disposable implements IOmegaCompletionService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
	}

	async fetchCompletion(request: OmegaCompletionRequest, token: CancellationToken): Promise<OmegaCompletionResult | undefined> {
		if (token.isCancellationRequested) {
			return undefined;
		}

		const settings = await this.resolveSettings();
		if (!settings.endpoint) {
			this.logService.trace('[OmegaCompletion] Endpoint not configured.');
			return undefined;
		}
		const payload = this.buildPayload(request, settings);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (settings.apiKey) {
			headers['Authorization'] = `Bearer ${settings.apiKey}`;
		}

		const url = this.resolveEndpointUrl(settings.endpoint);
		const timer = StopWatch.create(true);
		const requestPromise = this.requestService.request({
			type: 'POST',
			url,
			headers,
			data: JSON.stringify(payload),
			timeout: settings.timeout
		}, token);

		let context;
		try {
			context = await requestPromise;
		} catch (error) {
			if (isCancellationError(error)) {
				return undefined;
			}
			this.logService.error('[OmegaCompletion] Request failed.', error);
			return undefined;
		}

		if (!context) {
			return undefined;
		}

		if (!isSuccess(context)) {
			this.logService.warn('[OmegaCompletion] Service returned non-success status', context.res.statusCode);
			return undefined;
		}

		try {
			const json = await asJson<OmegaServiceResponse>(context);
			const text = this.extractText(json);
			if (!text) {
				this.logService.trace('[OmegaCompletion] Empty completion result.');
				return undefined;
			}
			this.logService.trace('[OmegaCompletion] Completion received in', timer.elapsed(), 'ms');
			return { text };
		} catch (error) {
			this.logService.error('[OmegaCompletion] Failed parsing response.', error);
			return undefined;
		}
	}

	private buildPayload(request: OmegaCompletionRequest, settings: OmegaSettings): {
		messages: Array<{ role: string; content: string }>;
		model?: string;
		max_tokens?: number;
		temperature?: number;
		top_p?: number;
		stream?: boolean;
	} {
		const prompt = this.composePrompt(request);
		const systemPrompt = this.composeSystemPrompt(request);
		const messages = [
			{
				role: 'system',
				content: systemPrompt
			},
			{
				role: 'user',
				content: prompt
			}
		];

		const payload: {
			messages: Array<{ role: string; content: string }>;
			model?: string;
			max_tokens?: number;
			temperature?: number;
			top_p?: number;
			stream?: boolean;
		} = {
			messages,
			model: settings.model,
			stream: false
		};

		if (typeof settings.maxOutputTokens === 'number') {
			payload.max_tokens = settings.maxOutputTokens;
		}
		if (typeof settings.temperature === 'number') {
			payload.temperature = settings.temperature;
		}
		if (typeof settings.topP === 'number') {
			payload.top_p = settings.topP;
		}

		return payload;
	}

	private composePrompt(request: OmegaCompletionRequest): string {
		return request.type === 'terminal'
			? this.composeTerminalPrompt(request)
			: this.composeInlinePrompt(request);
	}

	private composeSystemPrompt(request: OmegaCompletionRequest): string {
		if (request.type === 'terminal') {
			return 'Tu es Omega, moteur de completions terminal pour AlphaCode. Fournis uniquement le texte a inserer dans le shell en respectant la syntaxe de la commande. N\'ajoute aucun commentaire ni sortie simulee.';
		}

		return 'Tu es Omega, moteur de completions code pour AlphaCode. Continue le code fourni en preservant le style existant et reponds uniquement avec les instructions a inserer, sans explications.';
	}

	private composeInlinePrompt(request: OmegaCompletionRequest): string {
		const lines: string[] = [
			'Continue le bloc suivant en restant coherent.',
			'',
			'Type: inline',
		];
		if (request.languageId) {
			lines.push(`Langage: ${request.languageId}`);
		}
		if (request.uri) {
			lines.push(`Fichier: ${request.uri.toString()}`);
		}
		if (request.metadata && Object.keys(request.metadata).length) {
			lines.push(`Contexte additionnel: ${JSON.stringify(request.metadata)}`);
		}
		lines.push(
			'',
			'---',
			'BEFORE CURSOR:',
			request.prefix,
			'---',
			'AFTER CURSOR:',
			request.suffix ?? '',
			'---',
			'Livraison:',
			'- Reponds uniquement par le code a ajouter.',
			'- Aucun commentaire explicatif ni texte libre.'
		);

		return lines.join('\n');
	}

	private composeTerminalPrompt(request: OmegaCompletionRequest): string {
		const shell = typeof request.metadata?.shell === 'string' && request.metadata.shell.length
			? request.metadata.shell
			: 'shell inconnu';
		const history = request.metadata?.history;

		const lines: string[] = [
			'Complete la commande ou le script terminal en cours.',
			'',
			'Type: terminal',
			`Environnement: ${shell}`,
		];
		if (history) {
			lines.push(`Historique pertinent: ${JSON.stringify(history)}`);
		}
		lines.push(
			'',
			'---',
			'BEFORE CURSOR:',
			request.prefix,
			'---',
			'AFTER CURSOR:',
			request.suffix ?? '',
			'---',
			'Contraintes:',
			'- Retourne uniquement les caracteres a injecter dans le terminal.',
			'- Respecte la syntaxe du shell concerne.',
			'- N\'ajoute pas de commentaires ni de sorties fictives.'
		);

		return lines.join('\n');
	}

	private extractText(response: OmegaServiceResponse | null): string | undefined {
		if (!response) {
			return undefined;
		}

		const choice = response.choices?.[0];
		const content = choice?.message?.content ?? choice?.text;
		return content?.trim();
	}

	private resolveEndpointUrl(endpoint: string): string {
		const trimmed = endpoint.trim().replace(/\/?$/, '');
		if (trimmed.endsWith('/chat/completions')) {
			return trimmed;
		}
		return `${trimmed}/chat/completions`;
	}

	private async resolveSettings(): Promise<OmegaSettings> {
		const endpoint = (this.configurationService.getValue<string>(OmegaCompletionConfiguration.Endpoint) ?? '').trim();
		const configKey = (this.configurationService.getValue<string>(OmegaCompletionConfiguration.ApiKey) ?? '').trim();
		const secretKey = (await this.secretStorageService.get(OmegaCompletionConfiguration.ApiKey))?.trim();
		const apiKey = configKey || secretKey || undefined;
		const model = (this.configurationService.getValue<string>(OmegaCompletionConfiguration.Model) ?? '').trim() || undefined;
		const temperature = this.configurationService.getValue<number>(OmegaCompletionConfiguration.Temperature) ?? 0.2;
		const topP = this.configurationService.getValue<number>(OmegaCompletionConfiguration.TopP) ?? 1;
		const maxOutputTokens = this.configurationService.getValue<number>(OmegaCompletionConfiguration.MaxOutputTokens) ?? 128;
		const timeout = this.configurationService.getValue<number>(OmegaCompletionConfiguration.RequestTimeout) ?? 5000;

		return { endpoint, apiKey, model, temperature, topP, maxOutputTokens, timeout };
	}
}

registerSingleton(IOmegaCompletionService, OmegaCompletionService, InstantiationType.Delayed);
