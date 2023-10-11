import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {
	generateSamplesWindows,
	cleanPackageDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	versionBefore
} from '../../util.spec';
import {PackagerAdl} from '../adl';

import {PackagerAdlWindows} from './windows';

void describe('packages/adls/windows', () => {
	void describe('PackagerAdlWindows', () => {
		void it('instanceof PackagerAdl', () => {
			ok(PackagerAdlWindows.prototype instanceof PackagerAdl);
		});

		if (!(shouldTest('adl') || shouldTest('adl-windows'))) {
			return;
		}

		for (const {
			sdk,
			sample,
			uid,
			descriptor,
			architecture,
			extras
		} of generateSamplesWindows()) {
			void it(uid, async () => {
				const sdkPath = await getPackageFile(sdk.name);
				const dir = await cleanPackageDir('adls', 'windows', uid);

				const packager = new PackagerAdlWindows(dir);
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
					// 64-bit launcher adl64.exe was not added until later.
					if (!versionBefore(sdk.version, 33, 0)) {
						packager.architecture = architecture;
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
