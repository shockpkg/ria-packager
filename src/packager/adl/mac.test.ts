import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {
	platformIsMac,
	generateSamplesMac,
	cleanPackageDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	versionBefore
} from '../../util.spec.ts';
import {PackagerAdl} from '../adl.ts';

import {PackagerAdlMac} from './mac.ts';

void describe('packages/adls/mac', () => {
	void describe('PackagerAdlMac', () => {
		void it('instanceof PackagerAdl', () => {
			ok(PackagerAdlMac.prototype instanceof PackagerAdl);
		});

		if (!(shouldTest('adl') || shouldTest('adl-mac'))) {
			return;
		}

		for (const {
			sdk,
			sample,
			uid,
			descriptor,
			extras
		} of generateSamplesMac()) {
			void it(uid, async () => {
				const sdkPath = await getPackageFile(sdk.name);

				// Only test DMG files on macOS.
				if (/\.dmg$/i.test(sdkPath) && !platformIsMac) {
					return;
				}

				const dir = await cleanPackageDir('adls', 'mac', uid);

				const packager = new PackagerAdlMac(dir);
				packager.descriptorFile = fixtureFile(
					sample.name,
					sample.format,
					descriptor
				);

				if (extras) {
					// Enable all of the extra features.
					packager.debug = true;
					packager.preserveResourceMtime = true;
					if (!versionBefore(sdk.version, 2, 0)) {
						packager.profile = 'extendedDesktop';
					}
				}

				packager.sdkPath = sdkPath;

				await packager.write(async packager => {
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
