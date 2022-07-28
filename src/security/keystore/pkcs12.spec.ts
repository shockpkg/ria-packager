import {fixtureFile} from '../../util.spec';

import {SecurityKeystorePkcs12} from './pkcs12';

const file = fixtureFile('signature', 'key.p12');
const pass = 'password';

describe('security/keystores/pkcs12', () => {
	describe('Signature', () => {
		it('readFile', async () => {
			const keystore = await SecurityKeystorePkcs12.fromFile(file, pass);

			expect(keystore.getCertificate()).toBeTruthy();
			expect(keystore.getPrivateKey()).toBeTruthy();
		});

		it('reset', async () => {
			const keystore = await SecurityKeystorePkcs12.fromFile(file, pass);
			keystore.reset();

			expect(() => keystore.getCertificate()).toThrow();
			expect(() => keystore.getPrivateKey()).toThrow();
		});
	});
});
