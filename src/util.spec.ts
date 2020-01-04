import {
	join as pathJoin
} from 'path';

import fse from 'fs-extra';
import execa from 'execa';
import {
	Manager
} from '@shockpkg/core';

import {
	SecurityKeystorePkcs12
} from './security/keystores/pkcs12';
import {
	pathRelativeBase
} from './util';
import {
	IPackagerResourceOptions
} from './packager';

// eslint-disable-next-line no-process-env
export const envFastTest = process.env.RIA_PACKAGER_FAST_TEST || null;

export function shouldTest(name: string) {
	return !envFastTest || envFastTest === name;
}

export const timestampUrl =
	'http://sha256timestamp.ws.symantec.com/sha256/timestamp';

const formats = [
	'32.0',
	'31.0',
	'30.0',
	'29.0',
	'28.0',
	'27.0',
	'26.0',
	'25.0',
	'24.0',
	'23.0',
	'22.0',
	'21.0',
	'20.0',
	'19.0',
	'18.0',
	'17.0',
	'16.0',
	'15.0',
	'14.0',
	'13.0',
	'4.0',
	'3.9',
	'3.8',
	'3.7',
	'3.6',
	'3.5',
	'3.4',
	'3.3',
	'3.2',
	'3.1',
	'3.0',
	'2.7',
	'2.6',
	'2.5',
	'2.0',
	'1.5',
	'1.0'
];

export function * generateSamples() {
	for (const format of formats) {
		const version = format.split('.').map(Number);
		yield {
			format,
			version,
			name: 'HelloWorld',
			descriptor: 'HelloWorld-app.xml',
			descriptor64: version[0] >= 29 ? 'HelloWorld-app64.xml' : null,
			resources: [
				{
					type: 'f',
					source: 'HelloWorld.swf',
					destination: 'HelloWorld.swf',
					options: null
				},
				{
					type: 'd',
					source: 'icons',
					destination: 'icons',
					options: null
				},
				{
					type: 'd',
					source: 'iconsdoctxt',
					destination: 'iconsdoctxt',
					options: null
				},
				{
					type: 'd',
					source: 'iconsdocbin',
					destination: 'iconsdocbin',
					options: null
				},
				{
					type: 'd',
					source: 'other',
					destination: 'other',
					options: {
						mtime: new Date('2019'),
						executable: true
					} as IPackagerResourceOptions
				}
			]
		};
	}
}

export function * generateSamplesWindows() {
	for (const {sdk, sample} of generatePlatformSamples('windows')) {
		const {descriptor64} = sample;
		const samples: [string, string, 'x86' | 'x64'][] = [
			[
				`${sample.name}-${sample.format}-${sdk.name}`,
				sample.descriptor,
				'x86'
			]
		];
		if (descriptor64) {
			samples.push([
				`${sample.name}-${sample.format}-64-${sdk.name}`,
				descriptor64,
				'x64'
			]);
		}

		for (const [uid, descriptor, architecture] of samples) {
			yield {
				sdk,
				sample,
				uid,
				descriptor,
				architecture,
				extras: false
			};
			yield {
				sdk,
				sample,
				uid: `${uid}-extras`,
				descriptor,
				architecture,
				extras: true
			};
		}
	}
}

export function * generateSamplesMac() {
	for (const {sdk, sample} of generatePlatformSamples('mac')) {
		const samples: [string, string][] = [
			[
				`${sample.name}-${sample.format}-${sdk.name}`,
				sample.descriptor
			]
		];

		for (const [uid, descriptor] of samples) {
			yield {
				sdk,
				sample,
				uid,
				descriptor,
				extras: false
			};
			yield {
				sdk,
				sample,
				uid: `${uid}-extras`,
				descriptor,
				extras: true
			};
		}
	}
}

let getInstalledPackagesCache: string[] | null = null;
export function getInstalledPackagesSync() {
	if (!getInstalledPackagesCache) {
		const {stdout} = execa.sync('shockpkg', ['installed'], {
			preferLocal: true
		});
		getInstalledPackagesCache = stdout.trim().split(/[\r\n]+/);
	}
	return getInstalledPackagesCache;
}

export function generateSdks() {
	const r = [];
	for (const name of getInstalledPackagesSync()) {
		const m = name.match(/^air-sdk-([\d.]+)-([^-]+)(-compiler)?(-zip)?$/);
		if (!m) {
			continue;
		}
		const [, version, platform, compiler] = m;
		r.push({
			name,
			version: version.split('.').map(Number),
			platform,
			compiler: !!compiler
		});
	}
	return r
		.sort((a, b) => a.version[3] - b.version[3])
		.sort((a, b) => a.version[2] - b.version[2])
		.sort((a, b) => a.version[1] - b.version[1])
		.sort((a, b) => a.version[0] - b.version[0]);
}

export function * generatePlatformSamples(platform: string) {
	for (const sdk of generateSdks()) {
		if (sdk.platform !== platform) {
			continue;
		}

		// Find the newest sample to match without being newer version.
		for (const sample of generateSamples()) {
			const [major, minor] = sample.version;
			if (major < sdk.version[0]) {
				yield {sdk, sample};
				break;
			}
			if (major === sdk.version[0] && minor <= sdk.version[1]) {
				yield {sdk, sample};
				break;
			}
		}
	}
}

export function versionBefore(version: number[], major: number, minor: number) {
	return (
		version[0] < major ||
		(version[0] === major && version[1] < minor)
	);
}

export async function fixtureKeystoreRead() {
	const keystore = new SecurityKeystorePkcs12();
	await keystore.readFile(fixtureFile('key.p12'), 'password');
	return keystore;
}

export const platformIsMac = process.platform === 'darwin';
export const platformIsWindows = /^win(32|64)$/.test(process.platform);

export const specFixturesPath = pathJoin('spec', 'fixtures');
export const specPackagesPath = pathJoin('spec', 'packages');

export function fixtureFile(...path: string[]) {
	return pathJoin(specFixturesPath, ...path);
}

export async function getPackageFile(pkg: string) {
	return (new Manager()).with(
		async manager => manager.packageInstallFile(pkg)
	);
}

export async function cleanPackageDir(...path: string[]) {
	const dir = pathJoin(specPackagesPath, ...path);
	await fse.remove(dir);
	await fse.ensureDir(dir);
	return dir;
}

describe('util', () => {
	describe('pathRelativeBase', () => {
		it('file', () => {
			expect(pathRelativeBase('test', 'test')).toBe('');
			expect(pathRelativeBase('test/', 'test')).toBe('');
			expect(pathRelativeBase('test', 'Test')).toBe(null);
		});

		it('file nocase', () => {
			expect(pathRelativeBase('test', 'Test', true)).toBe('');
		});

		it('dir', () => {
			expect(pathRelativeBase('test/123', 'test')).toBe('123');
			expect(pathRelativeBase('test/123', 'Test')).toBe(null);
		});

		it('dir nocase', () => {
			expect(pathRelativeBase('test/123', 'Test', true)).toBe('123');
		});
	});
});
