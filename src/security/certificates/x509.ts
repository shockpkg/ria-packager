import forge from 'node-forge';

import {SecurityCertificate} from '../certificate';

/**
 * SecurityCertificateX509 constructor.
 */
export class SecurityCertificateX509 extends SecurityCertificate {
	/**
	 * Forge certificate.
	 */
	protected _forgeCertificate: Readonly<forge.pki.Certificate> | null = null;

	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._forgeCertificate = null;
	}

	/**
	 * Read a forge certificate.
	 *
	 * @param certificate Forge certificate.
	 */
	public readForgeCertificate(certificate: Readonly<forge.pki.Certificate>) {
		this.reset();

		this._forgeCertificate = certificate;
	}

	/**
	 * Encode as PEM string.
	 *
	 * @returns PEM string.
	 */
	public encodePem() {
		const forgeCertificate = this._forgeCertificate;
		if (!forgeCertificate) {
			throw new Error('Certificate not initialized');
		}
		return forge.pki.certificateToPem(forgeCertificate);
	}

	/**
	 * Encode as PEM data.
	 *
	 * @returns The binary PEM data.
	 */
	public encodePemData() {
		// Remove all the non-base64 lines, then decode.
		const base64 = this.encodePem()
			.split(/[\r\n]+/)
			.map(s => s.trim())
			.filter(s => !s.startsWith('-'))
			.join('');
		return Buffer.from(base64, 'base64');
	}

	/**
	 * Encode for certchain data.
	 *
	 * @returns Certchain data.
	 */
	public encodeCertchain() {
		return this.encodePemData();
	}
}
