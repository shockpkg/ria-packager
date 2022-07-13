import {
	platformIsMac,
	generateSamplesMac,
	cleanPackageDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	versionBefore
} from '../../util.spec';

import {PackagerAdlMac} from './mac';

describe('packages/adls/mac', () => {
	describe('PackagerAdlMac', () => {
		it('function', () => {
			expect(typeof PackagerAdlMac).toBe('function');
		});

		if (!shouldTest('adl-mac')) {
			return;
		}

		for (const {
			sdk,
			sample,
			uid,
			descriptor,
			extras
		} of generateSamplesMac()) {
			it(uid, async () => {
				const sdkPath = await getPackageFile(sdk.name);

				// Only test DMG files on macOS.
				if (/\.dmg$/i.test(sdkPath) && !platformIsMac) {
					return;
				}

				const dir = await cleanPackageDir(
					'adls',
					'mac',
					uid
				);

				const packager = new PackagerAdlMac(dir);

				if (extras) {
					// Enable all of the extra features.
					packager.debug = true;
					packager.preserveResourceMtime = true;
					if (!versionBefore(sdk.version, 2, 0)) {
						packager.profile = 'extendedDesktop';
					}
				}

				packager.sdkPath = sdkPath;

				const descriptorFile = fixtureFile(
					sample.name,
					sample.format,
					descriptor
				);
				await packager.withFile(descriptorFile, async packager => {
					for (const {
						type,
						source,
						destination,
						options
					} of sample.resources) {
						const sourceFull = fixtureFile(source);
						switch (type) {
							case 'f': {
								// eslint-disable-next-line no-await-in-loop
								await packager.addResourceFile(
									sourceFull,
									destination,
									options
								);
								break;
							}
							case 'd': {
								// eslint-disable-next-line no-await-in-loop
								await packager.addResourceDirectory(
									sourceFull,
									destination,
									options
								);
								break;
							}
							default: {
								throw new Error(`Unknown type: ${type}`);
							}
						}
					}
				});
			});
		}
	});
});
