import forge from 'node-forge';

import {SecurityKeyPrivate} from '../private.ts';

/**
 * SecurityKeyPrivateRsa object.
 */
export class SecurityKeyPrivateRsa extends SecurityKeyPrivate {
	/**
	 * RSA private key in PEM format.
	 */
	protected readonly _privateKey: string;

	/**
	 * SecurityKeyPrivateRsa constructor.
	 *
	 * @param privateKey RSA private key in PEM format.
	 */
	constructor(privateKey: string) {
		super();

		this._privateKey = privateKey;
	}

	/**
	 * Sign data.
	 *
	 * @param data Data to be signed.
	 * @param digest Digest algorithm.
	 * @returns The signature.
	 */
	public sign(data: Readonly<Uint8Array>, digest: string) {
		const privateKey = forge.pki.privateKeyFromPem(this._privateKey);
		digest = digest.toLowerCase();
		let md;
		switch (digest) {
			case 'sha1': {
				md = forge.md.sha1.create();
				break;
			}
			case 'sha256': {
				md = forge.md.sha256.create();
				break;
			}
			default: {
				throw new Error(`Unsupported digest algorithm: ${digest}`);
			}
		}

		// eslint-disable-next-line unicorn/prefer-code-point
		md.update(String.fromCharCode(...data));
		const signature = privateKey.sign(md, 'RSASSA-PKCS1-V1_5');
		return forge.util.binary.raw.decode(signature);
	}
}
