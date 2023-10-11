import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {
	generateSamplesWindows,
	cleanPackageDir,
	fixtureFile,
	fixtureKeystoreRead,
	// timestampUrl,
	getPackageFile,
	shouldTest,
	versionBefore
} from '../../util.spec';
import {PackagerBundle} from '../bundle';

import {PackagerBundleWindows} from './windows';

const fileVersion = '3.14.15.92';
const productVersion = '3.1.4.1';
const versionStrings = {
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Pruduct Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

void describe('packages/bundles/windows', () => {
	void describe('PackagerBundleWindows', () => {
		void it('instanceof PackagerBundle', () => {
			ok(PackagerBundleWindows.prototype instanceof PackagerBundle);
		});

		if (!shouldTest('bundle-windows')) {
			return;
		}

		for (const {
			sdk,
			sample,
			uid,
			descriptor,
			extras
		} of generateSamplesWindows()) {
			// No captive runtime before SDK 3.0.
			if (versionBefore(sdk.version, 3, 0)) {
				continue;
			}

			void it(uid, async () => {
				const sdkPath = await getPackageFile(sdk.name);
				const dir = await cleanPackageDir('bundles', 'windows', uid);

				const packager = new PackagerBundleWindows(dir);
				packager.descriptorFile = fixtureFile(
					sample.name,
					sample.format,
					descriptor
				);

				if (extras) {
					// Enable all of the extra features (except architecture).
					packager.debug = true;
					packager.frameworkCleanHelpers = true;
					packager.preserveResourceMtime = true;
					packager.applicationIconModern = true;
					packager.fileTypeIconModern = true;
					packager.fileVersion = fileVersion;
					packager.productVersion = productVersion;
					packager.versionStrings = versionStrings;
					packager.architecture = null;
				}

				packager.keystore = await fixtureKeystoreRead();
				// packager.timestampUrl = timestampUrl;

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
