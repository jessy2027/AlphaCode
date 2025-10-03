/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';

export const IChatFileValidationService = createDecorator<IChatFileValidationService>('chatFileValidationService');

export interface IValidationRule {
	id: string;
	name: string;
	description: string;
	severity: 'error' | 'warning' | 'info';
	enabled: boolean;
	validate: (file: File | VSBuffer, metadata?: any) => Promise<IValidationResult>;
}

export interface IValidationResult {
	valid: boolean;
	severity: 'error' | 'warning' | 'info';
	message: string;
	code: string;
	details?: any;
	suggestions?: string[];
}

export interface IValidationReport {
	fileId?: string;
	fileName: string;
	overallValid: boolean;
	results: IValidationResult[];
	timestamp: Date;
	processingTime: number;
}

export interface IChatFileValidationService {
	readonly _serviceBrand: undefined;

	readonly onValidationComplete: Event<IValidationReport>;
	readonly onValidationError: Event<{ fileName: string; error: string }>;

	/**
	 * Valider un fichier avec toutes les règles actives
	 */
	validateFile(file: File, options?: { skipRules?: string[] }): Promise<IValidationReport>;

	/**
	 * Valider le contenu d'un fichier
	 */
	validateContent(content: VSBuffer, fileName: string, mimeType: string): Promise<IValidationReport>;

	/**
	 * Obtenir toutes les règles de validation disponibles
	 */
	getValidationRules(): IValidationRule[];

	/**
	 * Activer/désactiver une règle de validation
	 */
	setRuleEnabled(ruleId: string, enabled: boolean): void;

	/**
	 * Ajouter une règle de validation personnalisée
	 */
	addCustomRule(rule: IValidationRule): void;

	/**
	 * Supprimer une règle de validation personnalisée
	 */
	removeCustomRule(ruleId: string): void;

	/**
	 * Valider plusieurs fichiers en lot
	 */
	validateBatch(files: File[]): Promise<IValidationReport[]>;
}

export class ChatFileValidationService extends Disposable implements IChatFileValidationService {
	readonly _serviceBrand: undefined;

	private readonly _onValidationComplete = this._register(new Emitter<IValidationReport>());
	readonly onValidationComplete = this._onValidationComplete.event;

	private readonly _onValidationError = this._register(new Emitter<{ fileName: string; error: string }>());
	readonly onValidationError = this._onValidationError.event;

	private validationRules: Map<string, IValidationRule> = new Map();
	private customRules: Map<string, IValidationRule> = new Map();

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.initializeDefaultRules();
		this.loadConfiguration();
	}

	async validateFile(file: File, options?: { skipRules?: string[] }): Promise<IValidationReport> {
		const startTime = Date.now();
		const results: IValidationResult[] = [];
		const skipRules = new Set(options?.skipRules || []);

		try {
			// Exécuter toutes les règles de validation
			for (const [ruleId, rule] of this.validationRules) {
				if (!rule.enabled || skipRules.has(ruleId)) {
					continue;
				}

				try {
					const result = await rule.validate(file);
					results.push(result);
				} catch (error) {
					this.logService.error(`Validation rule ${ruleId} failed:`, error);
					results.push({
						valid: false,
						severity: 'error',
						message: localize('ruleExecutionFailed', 'Validation rule execution failed: {0}', rule.name),
						code: 'RULE_EXECUTION_ERROR',
						details: { ruleId, error: String(error) }
					});
				}
			}

			// Exécuter les règles personnalisées
			for (const [ruleId, rule] of this.customRules) {
				if (!rule.enabled || skipRules.has(ruleId)) {
					continue;
				}

				try {
					const result = await rule.validate(file);
					results.push(result);
				} catch (error) {
					this.logService.error(`Custom validation rule ${ruleId} failed:`, error);
				}
			}

			const processingTime = Date.now() - startTime;
			const overallValid = !results.some(r => r.severity === 'error' && !r.valid);

			const report: IValidationReport = {
				fileName: file.name,
				overallValid,
				results,
				timestamp: new Date(),
				processingTime
			};

			this._onValidationComplete.fire(report);
			return report;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this._onValidationError.fire({ fileName: file.name, error: errorMessage });
			
			return {
				fileName: file.name,
				overallValid: false,
				results: [{
					valid: false,
					severity: 'error',
					message: localize('validationFailed', 'File validation failed: {0}', errorMessage),
					code: 'VALIDATION_ERROR'
				}],
				timestamp: new Date(),
				processingTime: Date.now() - startTime
			};
		}
	}

	async validateContent(content: VSBuffer, fileName: string, mimeType: string): Promise<IValidationReport> {
		const startTime = Date.now();
		const results: IValidationResult[] = [];

		try {
			// Créer un objet File-like pour la validation
			const fileProxy = {
				name: fileName,
				size: content.byteLength,
				type: mimeType,
				lastModified: Date.now(),
				content
			} as any;

			// Exécuter les règles applicables au contenu
			for (const [ruleId, rule] of this.validationRules) {
				if (!rule.enabled) continue;

				try {
					const result = await rule.validate(fileProxy);
					results.push(result);
				} catch (error) {
					this.logService.error(`Content validation rule ${ruleId} failed:`, error);
				}
			}

			const processingTime = Date.now() - startTime;
			const overallValid = !results.some(r => r.severity === 'error' && !r.valid);

			return {
				fileName,
				overallValid,
				results,
				timestamp: new Date(),
				processingTime
			};

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				fileName,
				overallValid: false,
				results: [{
					valid: false,
					severity: 'error',
					message: localize('contentValidationFailed', 'Content validation failed: {0}', errorMessage),
					code: 'CONTENT_VALIDATION_ERROR'
				}],
				timestamp: new Date(),
				processingTime: Date.now() - startTime
			};
		}
	}

	getValidationRules(): IValidationRule[] {
		return [...this.validationRules.values(), ...this.customRules.values()];
	}

	setRuleEnabled(ruleId: string, enabled: boolean): void {
		const rule = this.validationRules.get(ruleId) || this.customRules.get(ruleId);
		if (rule) {
			rule.enabled = enabled;
			this.saveConfiguration();
		}
	}

	addCustomRule(rule: IValidationRule): void {
		this.customRules.set(rule.id, rule);
		this.saveConfiguration();
	}

	removeCustomRule(ruleId: string): void {
		this.customRules.delete(ruleId);
		this.saveConfiguration();
	}

	async validateBatch(files: File[]): Promise<IValidationReport[]> {
		const reports: IValidationReport[] = [];
		
		for (const file of files) {
			const report = await this.validateFile(file);
			reports.push(report);
		}

		return reports;
	}

	private initializeDefaultRules(): void {
		// Règle de validation de la taille de fichier
		const extractFile = (input: File | VSBuffer): File | undefined => {
			if (input instanceof VSBuffer) {
				return undefined;
			}
			return input;
		};

		this.validationRules.set('file-size', {
			id: 'file-size',
			name: localize('fileSizeRule', 'File Size Validation'),
			description: localize('fileSizeRuleDesc', 'Validates file size limits'),
			severity: 'error',
			enabled: true,
			validate: async (input) => {
				const file = extractFile(input);
				if (!file) {
					return {
						valid: true,
						severity: 'info',
						message: localize('fileSizeSkipped', 'File size validation skipped for buffer input'),
						code: 'FILE_SIZE_SKIPPED',
						suggestions: []
					};
				}
				const maxSize = this.configurationService.getValue<number>('chat.maxFileUploadSize') || 50 * 1024 * 1024;
				const valid = file.size <= maxSize;
				
				return {
					valid,
					severity: 'error',
					message: valid 
						? localize('fileSizeValid', 'File size is within limits')
						: localize('fileSizeInvalid', 'File size ({0} MB) exceeds maximum allowed size ({1} MB)', 
							Math.round(file.size / (1024 * 1024)), 
							Math.round(maxSize / (1024 * 1024))),
					code: valid ? 'FILE_SIZE_OK' : 'FILE_SIZE_EXCEEDED',
					suggestions: valid ? [] : [
						localize('reduceSizeSuggestion', 'Try compressing the file or splitting it into smaller parts')
					]
				};
			}
		});

		// Règle de validation du type de fichier
		this.validationRules.set('file-type', {
			id: 'file-type',
			name: localize('fileTypeRule', 'File Type Validation'),
			description: localize('fileTypeRuleDesc', 'Validates allowed file types'),
			severity: 'error',
			enabled: true,
			validate: async (input) => {
				const file = extractFile(input);
				if (!file) {
					return {
						valid: true,
						severity: 'info',
						message: localize('fileTypeSkipped', 'File type validation skipped for buffer input'),
						code: 'FILE_TYPE_SKIPPED',
						suggestions: []
					};
				}
				const allowedTypes = this.configurationService.getValue<string[]>('chat.allowedFileTypes') || [
					'text/plain', 'text/markdown', 'application/pdf', 'image/jpeg', 'image/png', 'image/gif'
				];
				
				const valid = allowedTypes.length === 0 || allowedTypes.includes(file.type) || this.isAllowedExtension(file.name);
				
				return {
					valid,
					severity: 'error',
					message: valid 
						? localize('fileTypeValid', 'File type is supported')
						: localize('fileTypeInvalid', 'File type "{0}" is not supported', file.type || 'unknown'),
					code: valid ? 'FILE_TYPE_OK' : 'FILE_TYPE_NOT_SUPPORTED',
					suggestions: valid ? [] : [
						localize('convertFileSuggestion', 'Try converting the file to a supported format'),
						localize('supportedTypesList', 'Supported types: {0}', allowedTypes.join(', '))
					]
				};
			}
		});

		// Règle de validation du nom de fichier
		this.validationRules.set('file-name', {
			id: 'file-name',
			name: localize('fileNameRule', 'File Name Validation'),
			description: localize('fileNameRuleDesc', 'Validates file name format and characters'),
			severity: 'warning',
			enabled: true,
			validate: async (input) => {
				const file = extractFile(input);
				if (!file) {
					return {
						valid: true,
						severity: 'info',
						message: localize('fileNameSkipped', 'File name validation skipped for buffer input'),
						code: 'FILE_NAME_SKIPPED',
						suggestions: []
					};
				}
				const validNamePattern = /^[a-zA-Z0-9\s\-_\.]+$/;
				const valid = validNamePattern.test(file.name) && file.name.length <= 255;
				
				return {
					valid,
					severity: 'warning',
					message: valid 
						? localize('fileNameValid', 'File name is valid')
						: localize('fileNameInvalid', 'File name contains invalid characters or is too long'),
					code: valid ? 'FILE_NAME_OK' : 'FILE_NAME_INVALID',
					suggestions: valid ? [] : [
						localize('renameFileSuggestion', 'Use only letters, numbers, spaces, hyphens, underscores, and dots'),
						localize('shortenNameSuggestion', 'Keep file name under 255 characters')
					]
				};
			}
		});

		// Règle de détection de contenu malveillant
		this.validationRules.set('malware-scan', {
			id: 'malware-scan',
			name: localize('malwareScanRule', 'Malware Detection'),
			description: localize('malwareScanRuleDesc', 'Scans for potentially malicious content'),
			severity: 'error',
			enabled: true,
			validate: async (input) => {
				const file = extractFile(input);
				if (!file) {
					return {
						valid: true,
						severity: 'info',
						message: localize('malwareScanSkipped', 'Malware scan skipped for buffer input'),
						code: 'MALWARE_SCAN_SKIPPED'
					};
				}
				// Scan basique pour détecter des patterns suspects
				const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
				const extension = this.getFileExtension(file.name);
				
				if (suspiciousExtensions.includes(extension)) {
					return {
						valid: false,
						severity: 'error',
						message: localize('suspiciousFileType', 'File type is potentially dangerous'),
						code: 'SUSPICIOUS_FILE_TYPE',
						suggestions: [
							localize('avoidExecutables', 'Avoid uploading executable files for security reasons')
						]
					};
				}

				// Scan du contenu pour les fichiers texte
				if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
					try {
						const content = await this.readFileAsText(file);
						const suspiciousPatterns = [
							/eval\s*\(/gi,
							/document\.write\s*\(/gi,
							/window\.location\s*=/gi,
							/<script[^>]*>.*<\/script>/gi,
							/javascript:/gi
						];

						for (const pattern of suspiciousPatterns) {
							if (pattern.test(content)) {
								return {
									valid: false,
									severity: 'error',
									message: localize('suspiciousContent', 'File contains potentially malicious content'),
									code: 'SUSPICIOUS_CONTENT',
									suggestions: [
										localize('reviewContent', 'Review the file content for suspicious scripts or code')
									]
								};
							}
						}
					} catch (error) {
						// Si on ne peut pas lire le fichier, on passe
					}
				}

				return {
					valid: true,
					severity: 'info',
					message: localize('malwareScanPassed', 'No malicious content detected'),
					code: 'MALWARE_SCAN_OK'
				};
			}
		});

		// Règle de validation de l'intégrité
		this.validationRules.set('file-integrity', {
			id: 'file-integrity',
			name: localize('fileIntegrityRule', 'File Integrity Check'),
			description: localize('fileIntegrityRuleDesc', 'Validates file integrity and corruption'),
			severity: 'warning',
			enabled: true,
			validate: async (input) => {
				const file = extractFile(input);
				if (!file) {
					return {
						valid: true,
						severity: 'info',
						message: localize('integrityCheckSkipped', 'Integrity check skipped for buffer input'),
						code: 'INTEGRITY_CHECK_SKIPPED'
					};
				}
				try {
					// Vérification basique : essayer de lire le fichier
					const buffer = await this.readFileAsArrayBuffer(file);
					
					// Vérifier que la taille correspond
					if (buffer.byteLength !== file.size) {
						return {
							valid: false,
							severity: 'warning',
							message: localize('sizeCorruption', 'File size mismatch detected - file may be corrupted'),
							code: 'SIZE_MISMATCH'
						};
					}

					// Pour les images, vérifier les headers basiques
					if (file.type.startsWith('image/')) {
						const isValidImage = await this.validateImageHeader(buffer, file.type);
						if (!isValidImage) {
							return {
								valid: false,
								severity: 'warning',
								message: localize('invalidImageHeader', 'Invalid image file header'),
								code: 'INVALID_IMAGE_HEADER'
							};
						}
					}

					return {
						valid: true,
						severity: 'info',
						message: localize('integrityCheckPassed', 'File integrity check passed'),
						code: 'INTEGRITY_OK'
					};

				} catch (error) {
					return {
						valid: false,
						severity: 'error',
						message: localize('integrityCheckFailed', 'File integrity check failed: {0}', String(error)),
						code: 'INTEGRITY_CHECK_ERROR'
					};
				}
			}
		});
	}

	private loadConfiguration(): void {
		const config = this.configurationService.getValue<any>('chat.fileValidation') || {};
		
		// Charger l'état des règles
		if (config.rules) {
			for (const [ruleId, enabled] of Object.entries(config.rules)) {
				const rule = this.validationRules.get(ruleId);
				if (rule) {
					rule.enabled = Boolean(enabled);
				}
			}
		}

		// Charger les règles personnalisées
		if (config.customRules) {
			for (const customRule of config.customRules) {
				this.customRules.set(customRule.id, customRule);
			}
		}
	}

	private saveConfiguration(): void {
		const rules: { [id: string]: boolean } = {};
		for (const [id, rule] of this.validationRules) {
			rules[id] = rule.enabled;
		}

		const customRules = Array.from(this.customRules.values());

		this.configurationService.updateValue('chat.fileValidation', {
			rules,
			customRules
		});
	}

	private getFileExtension(fileName: string): string {
		const lastDot = fileName.lastIndexOf('.');
		return lastDot !== -1 ? fileName.substring(lastDot).toLowerCase() : '';
	}

	private isAllowedExtension(fileName: string): boolean {
		const allowedExtensions = [
			'.txt', '.md', '.pdf', '.doc', '.docx', '.rtf',
			'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
			'.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs',
			'.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml', '.yml',
			'.csv', '.xlsx', '.xls', '.pptx', '.ppt'
		];
		
		const extension = this.getFileExtension(fileName);
		return allowedExtensions.includes(extension);
	}

	private async readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	}

	private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as ArrayBuffer);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});
	}

	private async validateImageHeader(buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
		const bytes = new Uint8Array(buffer);
		
		switch (mimeType) {
			case 'image/jpeg':
				return bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8;
			case 'image/png':
				return bytes.length >= 8 && 
					bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
			case 'image/gif':
				return bytes.length >= 6 && 
					bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
			default:
				return true; // Pas de validation spécifique pour les autres types
		}
	}
}
