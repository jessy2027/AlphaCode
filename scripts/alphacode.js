/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

const cp = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const isWindows = process.platform === 'win32';
const script = path.join(__dirname, isWindows ? 'code.bat' : 'code.sh');

const child = cp.spawn(script, args, {
	stdio: 'inherit',
	shell: isWindows,
	env: {
		...process.env,
		ALPHACODE_IDE: '1'
	}
});

child.on('exit', (code, signal) => {
	if (typeof code === 'number') {
		process.exit(code);
	}
	if (signal) {
		process.kill(process.pid, signal);
	}
});

child.on('error', (err) => {
	console.error('[AlphaCodeIDE] Failed to launch:', err);
	process.exit(1);
});
