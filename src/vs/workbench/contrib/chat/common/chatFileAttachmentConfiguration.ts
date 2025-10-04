/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { IConfigurationRegistry, Extensions, IConfigurationNode } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';

// Configuration pour les attachements de fichiers dans le chat
const chatFileAttachmentConfiguration = {
	id: 'chatFileAttachment',
	title: localize('chatFileAttachmentConfigurationTitle', 'Chat File Attachments'),
	type: 'object',
	properties: {
		'chat.fileAttachment.enabled': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnabled', 'Enable file attachment functionality in chat')
		},
		'chat.fileAttachment.maxFileSize': {
			type: 'number',
			default: 50 * 1024 * 1024, // 50MB
			minimum: 1024, // 1KB minimum
			maximum: 500 * 1024 * 1024, // 500MB maximum
			description: localize('chatFileAttachmentMaxFileSize', 'Maximum file size allowed for attachments (in bytes)')
		},
		'chat.fileAttachment.maxFileCount': {
			type: 'number',
			default: 10,
			minimum: 1,
			maximum: 100,
			description: localize('chatFileAttachmentMaxFileCount', 'Maximum number of files that can be attached to a single message')
		},
		'chat.fileAttachment.maxTotalSize': {
			type: 'number',
			default: 200 * 1024 * 1024, // 200MB
			minimum: 1024 * 1024, // 1MB minimum
			maximum: 1024 * 1024 * 1024, // 1GB maximum
			description: localize('chatFileAttachmentMaxTotalSize', 'Maximum total size of all attachments per conversation (in bytes)')
		},
		'chat.fileAttachment.allowedFileTypes': {
			type: 'array',
			items: {
				type: 'string'
			},
			default: [
				// Documents
				'text/plain',
				'text/markdown',
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/rtf',
				// Images
				'image/jpeg',
				'image/png',
				'image/gif',
				'image/bmp',
				'image/webp',
				'image/svg+xml',
				// Code
				'application/javascript',
				'application/typescript',
				'text/x-python',
				'text/x-java-source',
				'text/x-c',
				'text/x-csharp',
				'application/json',
				'application/xml',
				'text/yaml',
				'text/html',
				'text/css',
				// Archives
				'application/zip',
				'application/x-rar-compressed',
				'application/x-7z-compressed',
				// Spreadsheets
				'text/csv',
				'application/vnd.ms-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			],
			description: localize('chatFileAttachmentAllowedTypes', 'List of allowed MIME types for file attachments. Empty array allows all types.')
		},
		'chat.fileAttachment.blockedFileTypes': {
			type: 'array',
			items: {
				type: 'string'
			},
			default: [
				'application/x-executable',
				'application/x-msdownload',
				'application/x-msdos-program',
				'application/x-bat',
				'application/x-sh',
				'application/x-shellscript'
			],
			description: localize('chatFileAttachmentBlockedTypes', 'List of blocked MIME types for security reasons')
		},
		'chat.fileAttachment.enableDragDrop': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableDragDrop', 'Enable drag and drop functionality for file attachments')
		},
		'chat.fileAttachment.enableValidation': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableValidation', 'Enable file validation before upload')
		},
		'chat.fileAttachment.enableVirusScan': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableVirusScan', 'Enable virus scanning for uploaded files')
		},
		'chat.fileAttachment.enableEncryption': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableEncryption', 'Enable encryption for stored file attachments')
		},
		'chat.fileAttachment.enableCompression': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableCompression', 'Enable compression for stored file attachments')
		},
		'chat.fileAttachment.retentionDays': {
			type: 'number',
			default: 30,
			minimum: 1,
			maximum: 365,
			description: localize('chatFileAttachmentRetentionDays', 'Number of days to retain file attachments before automatic cleanup')
		},
		'chat.fileAttachment.showUploadProgress': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentShowProgress', 'Show upload progress indicator')
		},
		'chat.fileAttachment.compactMode': {
			type: 'boolean',
			default: false,
			description: localize('chatFileAttachmentCompactMode', 'Use compact mode for file attachment UI')
		},
		'chat.fileAttachment.autoValidate': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentAutoValidate', 'Automatically validate files after upload')
		},
		'chat.fileAttachment.showValidationDetails': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentShowValidationDetails', 'Show detailed validation results')
		},
		'chat.fileAttachment.enableMetadataExtraction': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableMetadata', 'Extract and store file metadata')
		},
		'chat.fileAttachment.enableAuditLog': {
			type: 'boolean',
			default: true,
			description: localize('chatFileAttachmentEnableAudit', 'Enable audit logging for file operations')
		}
	}
} satisfies IConfigurationNode;

// Configuration pour la validation des fichiers
const chatFileValidationConfiguration = {
	id: 'chatFileValidation',
	title: localize('chatFileValidationConfigurationTitle', 'Chat File Validation'),
	type: 'object',
	properties: {
		'chat.fileValidation.rules': {
			type: 'object',
			default: {
				'file-size': true,
				'file-type': true,
				'file-name': true,
				'malware-scan': true,
				'file-integrity': true
			},
			description: localize('chatFileValidationRules', 'Enable/disable specific validation rules'),
			properties: {
				'file-size': {
					type: 'boolean',
					description: localize('chatFileValidationRuleFileSize', 'Validate file size limits')
				},
				'file-type': {
					type: 'boolean',
					description: localize('chatFileValidationRuleFileType', 'Validate file type restrictions')
				},
				'file-name': {
					type: 'boolean',
					description: localize('chatFileValidationRuleFileName', 'Validate file name format')
				},
				'malware-scan': {
					type: 'boolean',
					description: localize('chatFileValidationRuleMalware', 'Scan for malicious content')
				},
				'file-integrity': {
					type: 'boolean',
					description: localize('chatFileValidationRuleIntegrity', 'Check file integrity')
				}
			}
		},
		'chat.fileValidation.customRules': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					description: { type: 'string' },
					severity: { 
						type: 'string',
						enum: ['error', 'warning', 'info']
					},
					enabled: { type: 'boolean' }
				}
			},
			default: [],
			description: localize('chatFileValidationCustomRules', 'Custom validation rules')
		},
		'chat.fileValidation.strictMode': {
			type: 'boolean',
			default: false,
			description: localize('chatFileValidationStrictMode', 'Enable strict validation mode (treat warnings as errors)')
		},
		'chat.fileValidation.showSuggestions': {
			type: 'boolean',
			default: true,
			description: localize('chatFileValidationShowSuggestions', 'Show suggestions for fixing validation issues')
		}
	}
} satisfies IConfigurationNode;

// Configuration pour le stockage des fichiers
const chatFileStorageConfiguration = {
	id: 'chatFileStorage',
	title: localize('chatFileStorageConfigurationTitle', 'Chat File Storage'),
	type: 'object',
	properties: {
		'chat.fileStorage.provider': {
			type: 'string',
			enum: ['local', 'cloud', 'hybrid'],
			default: 'local',
			description: localize('chatFileStorageProvider', 'Storage provider for file attachments')
		},
		'chat.fileStorage.localPath': {
			type: 'string',
			default: '',
			description: localize('chatFileStorageLocalPath', 'Local path for file storage (empty for default)')
		},
		'chat.fileStorage.enableBackup': {
			type: 'boolean',
			default: true,
			description: localize('chatFileStorageEnableBackup', 'Enable automatic backup of stored files')
		},
		'chat.fileStorage.backupInterval': {
			type: 'number',
			default: 24, // hours
			minimum: 1,
			maximum: 168, // 1 week
			description: localize('chatFileStorageBackupInterval', 'Backup interval in hours')
		},
		'chat.fileStorage.enableDeduplication': {
			type: 'boolean',
			default: true,
			description: localize('chatFileStorageEnableDeduplication', 'Enable file deduplication to save storage space')
		},
		'chat.fileStorage.compressionLevel': {
			type: 'number',
			default: 6,
			minimum: 0,
			maximum: 9,
			description: localize('chatFileStorageCompressionLevel', 'Compression level (0=none, 9=maximum)')
		},
		'chat.fileStorage.encryptionAlgorithm': {
			type: 'string',
			enum: ['AES-256', 'ChaCha20', 'none'],
			default: 'AES-256',
			description: localize('chatFileStorageEncryptionAlgorithm', 'Encryption algorithm for stored files')
		},
		'chat.fileStorage.enableVersioning': {
			type: 'boolean',
			default: false,
			description: localize('chatFileStorageEnableVersioning', 'Enable file versioning')
		},
		'chat.fileStorage.maxVersions': {
			type: 'number',
			default: 5,
			minimum: 1,
			maximum: 50,
			description: localize('chatFileStorageMaxVersions', 'Maximum number of versions to keep per file')
		}
	}
} satisfies IConfigurationNode;

// Enregistrer les configurations
const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);

configurationRegistry.registerConfiguration(chatFileAttachmentConfiguration);
configurationRegistry.registerConfiguration(chatFileValidationConfiguration);
configurationRegistry.registerConfiguration(chatFileStorageConfiguration);

// Exporter les configurations pour utilisation dans d'autres modules
export {
	chatFileAttachmentConfiguration,
	chatFileValidationConfiguration,
	chatFileStorageConfiguration
};

// Types pour la configuration
export interface IChatFileAttachmentConfig {
	enabled: boolean;
	maxFileSize: number;
	maxFileCount: number;
	maxTotalSize: number;
	allowedFileTypes: string[];
	blockedFileTypes: string[];
	enableDragDrop: boolean;
	enableValidation: boolean;
	enableVirusScan: boolean;
	enableEncryption: boolean;
	enableCompression: boolean;
	retentionDays: number;
	showUploadProgress: boolean;
	compactMode: boolean;
	autoValidate: boolean;
	showValidationDetails: boolean;
	enableMetadataExtraction: boolean;
	enableAuditLog: boolean;
}

export interface IChatFileValidationConfig {
	rules: {
		[ruleId: string]: boolean;
	};
	customRules: Array<{
		id: string;
		name: string;
		description: string;
		severity: 'error' | 'warning' | 'info';
		enabled: boolean;
	}>;
	strictMode: boolean;
	showSuggestions: boolean;
}

export interface IChatFileStorageConfig {
	provider: 'local' | 'cloud' | 'hybrid';
	localPath: string;
	enableBackup: boolean;
	backupInterval: number;
	enableDeduplication: boolean;
	compressionLevel: number;
	encryptionAlgorithm: 'AES-256' | 'ChaCha20' | 'none';
	enableVersioning: boolean;
	maxVersions: number;
}
