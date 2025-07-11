/* eslint-disable max-classes-per-file */
import {describe, it} from 'node:test';
import {ok, strictEqual, throws} from 'node:assert';
import {readFile} from 'node:fs/promises';

import {fixtureFile, timestampUrl} from './util.spec.ts';
import {SecurityKeystorePkcs12} from './security/keystore/pkcs12.ts';
import {SecurityTimestamper} from './security/timestamper.ts';
import {Signature} from './signature.ts';

const mimetype = 'application/vnd.adobe.air-application-installer-package+zip';

const files: [string, () => Promise<Uint8Array>][] = [
	['mimetype', async () => new TextEncoder().encode(mimetype)],
	[
		'META-INF/AIR/application.xml',
		async () => readFile(fixtureFile('signature', 'application.xml'))
	],
	['HelloWorld.swf', async () => readFile(fixtureFile('HelloWorld.swf'))]
];

const replayTimestampBody = fixtureFile('signature', 'timestamp.body.bin');

const expectedSha1TimestampNo = fixtureFile(
	'signature',
	'signatures.xml.sha1.timestamp.no.bin'
);
const expectedSha1TimestampYes = fixtureFile(
	'signature',
	'signatures.xml.sha1.timestamp.yes.bin'
);
const expectedSha256TimestampNo = fixtureFile(
	'signature',
	'signatures.xml.sha256.timestamp.no.bin'
);

function extractTimestamp(xml: string) {
	const m = xml.match(
		/^([\S\s]*)(<Object\s+xmlns:xades[^>]+>[\S\s]+<\/Object>)([\S\s]*)$/
	);
	if (!m) {
		throw new Error('No timestamp');
	}
	return {
		timestamp: m[2],
		removed: `${m[1]}${m[3]}`
	};
}

async function getKeystore() {
	return SecurityKeystorePkcs12.decode(
		await readFile(fixtureFile('signature', 'key.p12')),
		'password'
	);
}

// Hijack the request sender to replay known response.
class SignatureReplay extends Signature {
	protected _createSecurityTimestamper(timestampUrl: string) {
		return new (class extends SecurityTimestamper {
			protected async _sendRequest(message: Readonly<Uint8Array>) {
				return readFile(replayTimestampBody) as Promise<
					Uint8Array<ArrayBuffer>
				>;
			}
		})(timestampUrl);
	}
}

async function expectError(tester: () => Promise<unknown>) {
	let error: Error | null = null;
	try {
		await tester();
	} catch (err) {
		error = err as Error;
	}
	ok(error);
}

void describe('signature', () => {
	void describe('Signature', () => {
		void it('Timestamp: OFF', async () => {
			const signature = new Signature();
			signature.signDigest = 'sha1';
			signature.timestampDigest = 'sha1';

			const keystore = await getKeystore();
			signature.certificate = keystore.getCertificate();
			signature.privateKey = keystore.getPrivateKey();

			for (const [name, data] of files) {
				// eslint-disable-next-line no-await-in-loop
				const d = await data();
				signature.addFile(name, d);
			}
			signature.digest();
			signature.sign();
			const encoded = signature.encode();

			// Check that code matches expected code.
			const expected = await readFile(expectedSha1TimestampNo);
			strictEqual(
				new TextDecoder().decode(encoded),
				expected.toString('utf8')
			);
		});

		void it('Timestamp: REPLAY', async () => {
			const signature = new SignatureReplay();
			signature.signDigest = 'sha1';
			signature.timestampDigest = 'sha1';

			const keystore = await getKeystore();
			signature.certificate = keystore.getCertificate();
			signature.privateKey = keystore.getPrivateKey();

			signature.timestampUrl = timestampUrl;

			for (const [name, data] of files) {
				// eslint-disable-next-line no-await-in-loop
				const d = await data();
				signature.addFile(name, d);
			}
			signature.digest();
			signature.sign();
			await signature.timestamp();
			const encoded = signature.encode();

			// Check that code matches expected code.
			const expected = await readFile(expectedSha1TimestampYes);
			strictEqual(
				new TextDecoder().decode(encoded),
				expected.toString('utf8')
			);
		});

		void it('Timestamp: REAL', async () => {
			const signature = new Signature();
			signature.signDigest = 'sha256';
			signature.timestampDigest = 'sha256';

			const keystore = await getKeystore();
			signature.certificate = keystore.getCertificate();
			signature.privateKey = keystore.getPrivateKey();

			signature.timestampUrl = timestampUrl;

			for (const [name, data] of files) {
				// eslint-disable-next-line no-await-in-loop
				const d = await data();
				signature.addFile(name, d);
			}
			signature.digest();
			signature.sign();
			await signature.timestamp();

			// Check that code without timestamp matched expected code.
			const encoded = signature.encode();
			const extracted = extractTimestamp(
				new TextDecoder().decode(encoded)
			);

			const expected = await readFile(expectedSha256TimestampNo);
			strictEqual(extracted.removed, expected.toString('utf8'));
		});

		void it('Linear Methods', async () => {
			const signature = new SignatureReplay();
			signature.signDigest = 'sha1';
			signature.timestampDigest = 'sha1';

			const keystore = await getKeystore();
			signature.certificate = keystore.getCertificate();
			signature.privateKey = keystore.getPrivateKey();

			signature.timestampUrl = timestampUrl;

			const expectedNo = await readFile(expectedSha1TimestampNo);
			const expectedYes = await readFile(expectedSha1TimestampYes);

			const expectedEncode = (data: Uint8Array, timestamp: boolean) => {
				const expected = timestamp ? expectedYes : expectedNo;
				strictEqual(
					new TextDecoder().decode(data),
					expected.toString('utf8')
				);
			};

			const itter = async () => {
				signature.reset();

				throws(() => signature.sign());
				await expectError(async () => signature.timestamp());
				throws(() => signature.encode());

				for (const [name, data] of files) {
					// eslint-disable-next-line no-await-in-loop
					const d = await data();
					signature.addFile(name, d);
				}

				throws(() => signature.sign());
				await expectError(async () => signature.timestamp());
				throws(() => signature.encode());

				signature.digest();

				throws(() => signature.digest());
				throws(() => signature.addFile('a', new Uint8Array(4)));
				await expectError(async () => signature.timestamp());
				throws(() => signature.encode());

				signature.sign();

				throws(() => signature.addFile('b', new Uint8Array(4)));
				throws(() => signature.digest());
				throws(() => signature.sign());

				expectedEncode(signature.encode(), false);

				await signature.timestamp();

				throws(() => signature.addFile('c', new Uint8Array(4)));
				throws(() => signature.digest());
				throws(() => signature.sign());
				await expectError(async () => signature.timestamp());

				expectedEncode(signature.encode(), true);
			};

			await itter();
			await itter();
		});
	});
});
