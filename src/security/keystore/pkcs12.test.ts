import {describe, it} from 'node:test';
import {ok, throws} from 'node:assert';
import {readFile} from 'node:fs/promises';

import {fixtureFile} from '../../util.spec.ts';

import {SecurityKeystorePkcs12} from './pkcs12.ts';

const file = fixtureFile('signature', 'key.p12');
const pass = 'password';

void describe('security/keystores/pkcs12', () => {
	void describe('Signature', () => {
		void it('readFile', async () => {
			const keystore = SecurityKeystorePkcs12.decode(
				await readFile(file),
				pass
			);

			ok(keystore.getCertificate());
			ok(keystore.getPrivateKey());
		});

		void it('reset', async () => {
			const keystore = SecurityKeystorePkcs12.decode(
				await readFile(file),
				pass
			);
			keystore.reset();

			throws(() => keystore.getCertificate());
			throws(() => keystore.getPrivateKey());
		});
	});
});
