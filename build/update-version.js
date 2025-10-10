/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Updates product.json with build-time information (commit hash, date)
 * This should be run during the build process
 */
async function updateVersion() {
	console.log('[update-version] Starting version injection...');

	const rootDir = path.join(__dirname, '..');
	const productJsonPath = path.join(rootDir, 'product.json');
	const packageJsonPath = path.join(rootDir, 'package.json');

	// Read package.json for version
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const version = packageJson.version;

	console.log(`[update-version] Version from package.json: ${version}`);

	// Get current git commit hash
	let commit = '';
	try {
		const { stdout } = await execAsync('git rev-parse HEAD');
		commit = stdout.trim();
		console.log(`[update-version] Git commit: ${commit}`);
	} catch (err) {
		console.warn('[update-version] Failed to get git commit:', err.message);
		commit = 'unknown';
	}

	// Get commit date
	let date = '';
	try {
		const { stdout } = await execAsync('git log -1 --format=%cd --date=iso');
		date = new Date(stdout.trim()).toISOString();
		console.log(`[update-version] Commit date: ${date}`);
	} catch (err) {
		console.warn('[update-version] Failed to get commit date:', err.message);
		date = new Date().toISOString();
	}

	// Read and update product.json
	const productJson = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));

	// Update fields
	productJson.version = version;
	productJson.commit = commit;
	productJson.date = date;

	// Ensure quality is set
	if (!productJson.quality) {
		productJson.quality = 'stable';
	}

	// Write back
	fs.writeFileSync(
		productJsonPath,
		JSON.stringify(productJson, null, '\t') + '\n',
		'utf8'
	);

	console.log('[update-version] ✓ product.json updated successfully');
	console.log(`[update-version]   - version: ${version}`);
	console.log(`[update-version]   - commit: ${commit}`);
	console.log(`[update-version]   - date: ${date}`);
	console.log(`[update-version]   - quality: ${productJson.quality}`);

	return { version, commit, date, quality: productJson.quality };
}

// Run if called directly
if (require.main === module) {
	updateVersion()
		.then(() => {
			console.log('[update-version] Done!');
			process.exit(0);
		})
		.catch(err => {
			console.error('[update-version] Error:', err);
			process.exit(1);
		});
}

module.exports = { updateVersion };
