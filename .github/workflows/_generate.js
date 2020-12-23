'use strict';

const fs = require('fs').promises;

const platforms = {
	linux: 'ubuntu-20.04',
	macos: 'macos-10.15',
	windows: 'windows-2019'
};

const nodeVersions = {
	'10.0.0': {
		lint: false
	},
	'15.5.0': {
		lint: true
	}
};

const packages = {
	'1-2': [
		'air-sdk-1.0.7.4880-mac-zip',
		'air-sdk-1.0.7.4880-windows',
		'air-sdk-1.1.0.5790-mac-zip',
		'air-sdk-1.1.0.5790-windows',
		'air-sdk-1.5.0.7220-mac-zip',
		'air-sdk-1.5.0.7220-windows',
		'air-sdk-1.5.3.9120-mac-zip',
		'air-sdk-1.5.3.9120-windows',
		'air-sdk-2.0.1.12090-mac-zip',
		'air-sdk-2.0.1.12090-windows',
		'air-sdk-2.7.1.19610-mac-zip',
		'air-sdk-2.7.1.19610-windows'
	],
	'3': [
		'air-sdk-3.0.0.4080-mac-zip',
		'air-sdk-3.0.0.4080-windows',
		'air-sdk-3.2.0.2070-mac-zip',
		'air-sdk-3.2.0.2070-windows',
		'air-sdk-3.6.0.6090-mac-zip',
		'air-sdk-3.6.0.6090-windows'
	],
	'25': [
		'air-sdk-25.0.0.134-mac-zip',
		'air-sdk-25.0.0.134-windows'
	],
	'27': [
		'air-sdk-27.0.0.128-mac-zip',
		'air-sdk-27.0.0.132-windows'
	],
	'32': [
		'air-sdk-32.0.0.116-mac-zip',
		'air-sdk-32.0.0.116-windows'
	],
	'32.0.2': [
		'air-sdk-33.0.2.330-mac',
		'air-sdk-33.0.2.330-windows'
	],
	'33': [
		'air-sdk-33.1.1.345-mac',
		'air-sdk-33.1.1.345-windows'
	]
};

function template(name, runsOn, nodeVersion, lint, packages) {
	return `
name: '${name}'

on: push

jobs:
  build:
    runs-on: '${runsOn}'

    steps:
    - uses: actions/checkout@v2

    - uses: actions/setup-node@v1
      with:
        node-version: '${nodeVersion}'

    - run: npm install
    - run: npm run clean
    - run: npm run shockpkg -- update --summary
    - run: npm run shockpkg -- install ${packages}

    - run: npm run lint
      if: ${lint}
    - run: npm run build
    - run: npm run test
      env:
        RIA_PACKAGER_TIMESTAMP_URL: http://timestamp.digicert.com/
`.trim() + '\n';
	}

async function main() {
	for (const [platform, runsOn] of Object.entries(platforms)) {
		for (const [nodeVersion, options] of Object.entries(nodeVersions)) {
			for (const [pkg, pkgs] of Object.entries(packages)) {
				const name = `${platform}_${nodeVersion}_${pkg}`;
				await fs.writeFile(`${name}.yaml`, template(
					name,
					runsOn,
					nodeVersion,
					options.lint ? 1 : 0,
					pkgs.join(' ')
				));
			}
		}
	}
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});