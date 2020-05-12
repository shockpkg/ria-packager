import forge from 'node-forge';

import {SecurityKeyPrivate} from '../private';

/**
 * SecurityKeyPrivateRsa constructor.
 */
export class SecurityKeyPrivateRsa extends SecurityKeyPrivate {
	/**
	 * Forge private key.
	 */
	protected _forgePrivateKey: Readonly<forge.pki.PrivateKey> | null = null;

	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._forgePrivateKey = null;
	}

	/**
	 * Read a forge private key.
	 *
	 * @param privateKey Forge private key.
	 */
	public readForgeKeyPrivate(privateKey: Readonly<forge.pki.PrivateKey>) {
		this.reset();

		this._forgePrivateKey = privateKey;
	}

	/**
	 * Sign data.
	 *
	 * @param data Data to be signed.
	 * @param digest Digest algorithm.
	 * @returns The signature.
	 */
	public sign(data: Readonly<Buffer>, digest: string) {
		const privateKey = this._forgePrivateKey;
		if (!privateKey) {
			throw new Error('Private key not initialized');
		}

		digest = digest.toLowerCase();
		if (digest !== 'sha1') {
			throw new Error(`Unsupported digest algorithm: ${digest}`);
		}

		const md = forge.md.sha1.create();
		md.update(forge.util.decode64(data.toString('base64')));
		const signature = (privateKey as any).sign(md, 'RSASSA-PKCS1-V1_5');
		return Buffer.from(forge.util.encode64(signature), 'base64');
	}
}
