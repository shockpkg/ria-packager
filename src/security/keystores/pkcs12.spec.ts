import {fixtureFile} from '../../util.spec';

import {SecurityKeystorePkcs12} from './pkcs12';

const file = fixtureFile('signature', 'key.p12');
const pass = 'password';

describe('security/keystores/pkcs12', () => {
	describe('Signature', () => {
		it('readFile', async () => {
			const keystore = new SecurityKeystorePkcs12();
			await keystore.readFile(file, pass);

			expect(keystore.getCertificate()).toBeTruthy();
			expect(keystore.getKeyPrivate()).toBeTruthy();
		});

		it('reset', async () => {
			const keystore = new SecurityKeystorePkcs12();
			await keystore.readFile(file, pass);
			keystore.reset();

			expect(() => keystore.getCertificate()).toThrow();
			expect(() => keystore.getKeyPrivate()).toThrow();
		});
	});
});
