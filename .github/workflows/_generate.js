'use strict';

const fs = require('fs').promises;

const platforms = [
	['linux', 'ubuntu-20.04']
];

const nodeVersions = [
	['10', '10.0.0', {}],
	['15', '15.13.0', {}]
];

const packages = [
	['1-windows', [
		'air-sdk-1.0.7.4880-windows',
		'air-sdk-1.1.0.5790-windows',
		'air-sdk-1.5.0.7220-windows',
		'air-sdk-1.5.3.9120-windows'
	]],
	['1-mac', [
		'air-sdk-1.0.7.4880-mac-zip',
		'air-sdk-1.1.0.5790-mac-zip',
		'air-sdk-1.5.0.7220-mac-zip',
		'air-sdk-1.5.3.9120-mac-zip'
	]],
	['2-windows', [
		'air-sdk-2.0.1.12090-windows',
		'air-sdk-2.7.1.19610-windows'
	]],
	['2-mac', [
		'air-sdk-2.0.1.12090-mac-zip',
		'air-sdk-2.7.1.19610-mac-zip'
	]],
	['3.0-windows', [
		'air-sdk-3.0.0.4080-windows'
	]],
	['3.0-mac', [
		'air-sdk-3.0.0.4080-mac-zip'
	]],
	['3.2-windows', [
		'air-sdk-3.2.0.2070-windows'
	]],
	['3.2-mac', [
		'air-sdk-3.2.0.2070-mac-zip'
	]],
	['3.6-windows', [
		'air-sdk-3.6.0.6090-windows'
	]],
	['3.6-mac', [
		'air-sdk-3.6.0.6090-mac-zip'
	]],
	['25-windows', [
		'air-sdk-25.0.0.134-windows'
	]],
	['25-mac', [
		'air-sdk-25.0.0.134-mac-zip'
	]],
	['27-windows', [
		'air-sdk-27.0.0.132-windows'
	]],
	['27-mac', [
		'air-sdk-27.0.0.128-mac-zip'
	]],
	['32-windows', [
		'air-sdk-32.0.0.116-windows'
	]],
	['32-mac', [
		'air-sdk-32.0.0.116-mac-zip'
	]],
	['32.0.2-windows', [
		'air-sdk-33.0.2.330-windows'
	]],
	['32.0.2-mac', [
		'air-sdk-33.0.2.330-mac'
	]],
	['33-windows', [
		'air-sdk-33.1.1.444-windows'
	]],
	['33-mac', [
		'air-sdk-33.1.1.444-mac'
	]]
];

function template(name, runsOn, nodeVersion, lint, packages) {
	const install = packages.length ?
		`    - run: npm run shockpkg -- install ${packages.join(' ')}` :
		'';
	const linting = lint ? `    - run: npm run lint` : '';
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
${install}
${linting}
    - run: npm run build
    - run: npm run test
      env:
        RIA_PACKAGER_TIMESTAMP_URL: http://timestamp.digicert.com/
`.trim() + '\n';
	}

async function main() {
	await fs.writeFile('main.yml', template(
		'main',
		platforms[0][1],
		nodeVersions[nodeVersions.length - 1][0],
		true,
		[]
	));

	for (const [platform, runsOn] of platforms) {
		for (const [nodeVer, nodeVersion, options] of nodeVersions) {
			for (const [pkg, pkgs] of packages) {
				const name = `${platform}_${nodeVer}_${pkg}`;
				await fs.writeFile(`${name}.yml`, template(
					name,
					runsOn,
					nodeVersion,
					false,
					pkgs
				));
			}
		}
	}
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
