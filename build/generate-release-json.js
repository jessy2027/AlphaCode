/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate SHA256 hash of a file
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function calculateSha256(filePath) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256');
		const stream = fs.createReadStream(filePath);

		stream.on('data', data => hash.update(data));
		stream.on('end', () => resolve(hash.digest('hex')));
		stream.on('error', reject);
	});
}

/**
 * Generate release.json metadata file
 * @param {object} options
 * @param {string} options.version - Product version (e.g., "1.96.0")
 * @param {string} options.commit - Git commit hash
 * @param {string} options.repoUrl - GitHub repository URL (e.g., "https://github.com/jessy2027/AlphaCodeIDE")
 * @param {string} options.buildDir - Directory containing build artifacts
 * @param {string} options.outputPath - Path where release.json should be written
 */
async function generateReleaseJson(options) {
	console.log('[generate-release-json] Starting...');
	console.log(`[generate-release-json] Version: ${options.version}`);
	console.log(`[generate-release-json] Commit: ${options.commit}`);
	console.log(`[generate-release-json] Build directory: ${options.buildDir}`);

	const releaseTag = `v${options.version}`;
	const baseUrl = `${options.repoUrl}/releases/download/${releaseTag}`;

	// Define expected artifacts for each platform
	const artifacts = [
		{ platform: 'win32-x64', filename: `AlphaCodeIDE-Setup-win32-x64.exe`, pattern: /AlphaCodeIDE-Setup-win32-x64\.exe$/i },
		{ platform: 'win32-arm64', filename: `AlphaCodeIDE-Setup-win32-arm64.exe`, pattern: /AlphaCodeIDE-Setup-win32-arm64\.exe$/i },
		{ platform: 'darwin-x64', filename: `AlphaCodeIDE-darwin-x64.zip`, pattern: /AlphaCodeIDE-darwin-x64\.zip$/i },
		{ platform: 'darwin-arm64', filename: `AlphaCodeIDE-darwin-arm64.zip`, pattern: /AlphaCodeIDE-darwin-arm64\.zip$/i },
		{ platform: 'darwin-universal', filename: `AlphaCodeIDE-darwin-universal.zip`, pattern: /AlphaCodeIDE-darwin-universal\.zip$/i },
		{ platform: 'linux-x64', filename: `alphacode-ide_${options.version}_amd64.deb`, pattern: /alphacode-ide.*amd64\.deb$/i },
		{ platform: 'linux-arm64', filename: `alphacode-ide_${options.version}_arm64.deb`, pattern: /alphacode-ide.*arm64\.deb$/i }
	];

	const platforms = {};
	const checksums = [];

	// Process each artifact
	for (const artifact of artifacts) {
		const filePath = path.join(options.buildDir, artifact.filename);

		// Check if file exists
		if (!fs.existsSync(filePath)) {
			console.log(`[generate-release-json] ⚠ Skipping ${artifact.platform} - file not found: ${artifact.filename}`);
			continue;
		}

		console.log(`[generate-release-json] Processing ${artifact.platform}...`);

		// Calculate checksum
		const sha256 = await calculateSha256(filePath);
		const fileSize = fs.statSync(filePath).size;

		// Add to platforms object
		platforms[artifact.platform] = {
			url: `${baseUrl}/${artifact.filename}`,
			sha256: sha256,
			size: fileSize
		};

		// Add to checksums list
		checksums.push({
			file: artifact.filename,
			sha256: sha256
		});

		console.log(`[generate-release-json]   ✓ ${artifact.filename}`);
		console.log(`[generate-release-json]     SHA256: ${sha256}`);
		console.log(`[generate-release-json]     Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
	}

	// Create release metadata
	const releaseMetadata = {
		version: options.commit,
		productVersion: options.version,
		timestamp: Date.now(),
		platforms: platforms
	};

	// Write release.json
	fs.writeFileSync(
		options.outputPath,
		JSON.stringify(releaseMetadata, null, 2) + '\n',
		'utf8'
	);

	console.log(`[generate-release-json] ✓ release.json written to ${options.outputPath}`);

	// Write CHECKSUMS.txt
	const checksumsPath = path.join(path.dirname(options.outputPath), 'CHECKSUMS.txt');
	const checksumsContent = checksums
		.map(c => `${c.sha256}  ${c.file}`)
		.join('\n') + '\n';

	fs.writeFileSync(checksumsPath, checksumsContent, 'utf8');
	console.log(`[generate-release-json] ✓ CHECKSUMS.txt written to ${checksumsPath}`);

	console.log(`[generate-release-json] Done! Found ${Object.keys(platforms).length} platform(s)`);

	return releaseMetadata;
}

// CLI usage
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length < 5) {
		console.error('Usage: node generate-release-json.js <version> <commit> <repoUrl> <buildDir> <outputPath>');
		console.error('Example: node generate-release-json.js 1.96.0 abc123 https://github.com/jessy2027/AlphaCodeIDE .build release.json');
		process.exit(1);
	}

	const [version, commit, repoUrl, buildDir, outputPath] = args;

	generateReleaseJson({ version, commit, repoUrl, buildDir, outputPath })
		.then(() => {
			console.log('[generate-release-json] Success!');
			process.exit(0);
		})
		.catch(err => {
			console.error('[generate-release-json] Error:', err);
			process.exit(1);
		});
}

module.exports = { generateReleaseJson, calculateSha256 };
