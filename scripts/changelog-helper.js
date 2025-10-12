/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');

/**
 * Get the current version from package.json
 */
function getCurrentVersion() {
	const packageJson = require('../package.json');
	return packageJson.version;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Check if a version section exists in the changelog
 */
function hasVersionSection(content, version) {
	const versionRegex = new RegExp(`## \\[${version.replace('.', '\\.')}\\]`, 'g');
	return versionRegex.test(content);
}

/**
 * Add a new version section to the changelog
 */
function addVersionSection(version) {
	try {
		let content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

		// Check if version already exists
		if (hasVersionSection(content, version)) {
			console.log(`Version ${version} already exists in CHANGELOG.md`);
			return;
		}

		const date = getTodayDate();
		const newSection = `
## [${version}] - ${date}

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

`;

		// Insert after the [Unreleased] section
		const unreleasedEndIndex = content.indexOf('---\n\n## [');
		if (unreleasedEndIndex === -1) {
			// If no previous version exists, insert after Unreleased section
			const unreleasedSectionEnd = content.indexOf('### Removed\n') + 60; // Approximate end
			content = content.slice(0, unreleasedSectionEnd) + '\n\n---\n' + newSection + content.slice(unreleasedSectionEnd);
		} else {
			// Insert before the first version section
			content = content.slice(0, unreleasedEndIndex + 6) + newSection + content.slice(unreleasedEndIndex + 6);
		}

		fs.writeFileSync(CHANGELOG_PATH, content, 'utf8');
		console.log(`Added version ${version} to CHANGELOG.md`);
		console.log(`Please edit CHANGELOG.md to add your release notes`);
	} catch (error) {
		console.error('Error updating CHANGELOG.md:', error.message);
		process.exit(1);
	}
}

/**
 * Validate changelog format
 */
function validateChangelog() {
	try {
		const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

		// Check for required sections
		const requiredSections = ['## [Unreleased]', '### Added', '### Changed', '### Fixed'];
		const missingSections = requiredSections.filter(section => !content.includes(section));

		if (missingSections.length > 0) {
			console.error('CHANGELOG.md is missing required sections:');
			missingSections.forEach(section => console.error(`  - ${section}`));
			process.exit(1);
		}

		console.log('CHANGELOG.md format is valid');
	} catch (error) {
		console.error('Error reading CHANGELOG.md:', error.message);
		process.exit(1);
	}
}

/**
 * Extract release notes for a specific version
 */
function extractReleaseNotes(version) {
	try {
		const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

		// Extract the section for this version
		const versionHeaderRegex = new RegExp(`## \\[${version.replace('.', '\\.')}\\].*\n`);
		const versionMatch = content.match(versionHeaderRegex);

		if (!versionMatch) {
			console.error(`Version ${version} not found in CHANGELOG.md`);
			process.exit(1);
		}

		const startIndex = content.indexOf(versionMatch[0]) + versionMatch[0].length;
		const nextVersionIndex = content.indexOf('\n## [', startIndex);
		const endIndex = nextVersionIndex === -1 ? content.length : nextVersionIndex;

		const releaseNotes = content.slice(startIndex, endIndex).trim();

		// Remove the separator line if present
		const cleanedNotes = releaseNotes.replace(/^---\s*$/gm, '').trim();

		console.log(cleanedNotes);
	} catch (error) {
		console.error('Error extracting release notes:', error.message);
		process.exit(1);
	}
}

/**
 * Main function
 */
function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	switch (command) {
		case 'add': {
			const version = args[1] || getCurrentVersion();
			addVersionSection(version);
			break;
		}
		case 'validate':
			validateChangelog();
			break;

		case 'extract': {
			const extractVersion = args[1] || getCurrentVersion();
			extractReleaseNotes(extractVersion);
			break;
		}
		case 'current':
			console.log(getCurrentVersion());
			break;

		default:
			console.log('AlphaCodeIDE Changelog Helper');
			console.log('');
			console.log('Usage:');
			console.log('  node scripts/changelog-helper.js add [version]    - Add a new version section');
			console.log('  node scripts/changelog-helper.js validate         - Validate changelog format');
			console.log('  node scripts/changelog-helper.js extract [version] - Extract release notes for a version');
			console.log('  node scripts/changelog-helper.js current          - Show current version');
			console.log('');
			console.log('If version is not specified, the current version from package.json is used.');
			process.exit(1);
	}
}

main();
