import forge from 'node-forge';

import {SecurityKeyPrivate} from '../private';

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
	public sign(data: Readonly<Buffer>, digest: string) {
		const privateKey = forge.pki.privateKeyFromPem(this._privateKey);
		digest = digest.toLowerCase();
		if (digest !== 'sha1') {
			throw new Error(`Unsupported digest algorithm: ${digest}`);
		}

		const md = forge.md.sha1.create();
		md.update(forge.util.decode64(data.toString('base64')));
		const signature = (
			privateKey as {
				sign: (md: forge.md.MessageDigest, algo: string) => string;
			}
		).sign(md, 'RSASSA-PKCS1-V1_5');
		return Buffer.from(forge.util.encode64(signature), 'base64');
	}
}
