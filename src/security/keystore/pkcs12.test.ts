import {describe, it} from 'node:test';
import {ok, throws} from 'node:assert';

import {fixtureFile} from '../../util.spec';

import {SecurityKeystorePkcs12} from './pkcs12';

const file = fixtureFile('signature', 'key.p12');
const pass = 'password';

void describe('security/keystores/pkcs12', () => {
	void describe('Signature', () => {
		void it('readFile', async () => {
			const keystore = await SecurityKeystorePkcs12.fromFile(file, pass);

			ok(keystore.getCertificate());
			ok(keystore.getPrivateKey());
		});

		void it('reset', async () => {
			const keystore = await SecurityKeystorePkcs12.fromFile(file, pass);
			keystore.reset();

			throws(() => keystore.getCertificate());
			throws(() => keystore.getPrivateKey());
		});
	});
});
