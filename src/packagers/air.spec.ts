import {
	join as pathJoin
} from 'path';

import {
	generateSamples,
	fixtureFile,
	cleanPackageDir,
	timestampUrl,
	fixtureKeystoreRead
} from '../util.spec';

import {PackagerAir} from './air';

export function test(
	Packager: new(path: string) => PackagerAir,
	name: string,
	ext: string,
	signed: boolean
) {
	for (const sample of generateSamples()) {
		const {descriptor64} = sample;
		const samples: [string, string][] = [
			[`${sample.name}-${sample.format}`, sample.descriptor]
		];
		if (descriptor64) {
			samples.push([`${sample.name}-${sample.format}-64`, descriptor64]);
		}

		for (const [uid, descriptor] of samples) {
			it(uid, async () => {
				const dir = await cleanPackageDir(
					'airs',
					name,
					uid
				);
				const path = pathJoin(dir, `${uid}${ext}`);

				const packager = new Packager(path);
				packager.debug = true;

				if (signed) {
					packager.keystore = await fixtureKeystoreRead();
					packager.timestampUrl = timestampUrl;
				}

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
	}
}
