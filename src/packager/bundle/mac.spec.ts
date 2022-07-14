import {join as pathJoin} from 'path';

import {
	platformIsMac,
	generateSamplesMac,
	cleanPackageDir,
	fixtureFile,
	fixtureKeystoreRead,
	// timestampUrl,
	getPackageFile,
	shouldTest,
	versionBefore
} from '../../util.spec';
import {PackagerBundle} from '../bundle';

import {PackagerBundleMac} from './mac';

describe('packages/bundles/mac', () => {
	describe('PackagerBundleMac', () => {
		it('instanceof PackagerBundle', () => {
			expect(
				PackagerBundleMac.prototype instanceof PackagerBundle
			).toBeTrue();
		});

		if (!shouldTest('bundle-mac')) {
			return;
		}

		for (const {
			sdk,
			sample,
			uid,
			descriptor,
			extras
		} of generateSamplesMac()) {
			// No captive runtime before SDK 3.0.
			if (versionBefore(sdk.version, 3, 0)) {
				continue;
			}

			it(uid, async () => {
				const sdkPath = await getPackageFile(sdk.name);

				// Only test DMG files on macOS.
				if (/\.dmg$/i.test(sdkPath) && !platformIsMac) {
					return;
				}

				const dir = await cleanPackageDir('bundles', 'mac', uid);
				const path = pathJoin(dir, `${sample.name}.app`);

				const packager = new PackagerBundleMac(path);

				// Enable various legacy behaviors based on SDK version.
				if (versionBefore(sdk.version, 3, 2)) {
					packager.plistDocumentTypeNameIsDescription = false;
				}
				if (versionBefore(sdk.version, 3, 6)) {
					packager.plistHighResolutionCapable = false;
				}
				if (versionBefore(sdk.version, 25, 0)) {
					packager.frameworkCleanHelpers = false;
				}
				if (versionBefore(sdk.version, 27, 0)) {
					packager.plistHasAppTransportSecurity = false;
				}

				if (extras) {
					// Enable all of the extra features.
					packager.debug = true;
					packager.applicationIconModern = true;
					packager.fileTypeIconModern = true;
					packager.infoPlistFile = fixtureFile('Info.plist');
					packager.pkgInfoFile = fixtureFile('PkgInfo');
					packager.frameworkCleanOsFiles = true;
					packager.preserveResourceMtime = true;
				}

				packager.keystore = await fixtureKeystoreRead();
				// packager.timestampUrl = timestampUrl;

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
