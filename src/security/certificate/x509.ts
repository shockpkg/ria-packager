import {base64Decode} from '@shockpkg/plist-dom';

import {SecurityCertificate} from '../certificate';

/**
 * SecurityCertificateX509 object.
 */
export class SecurityCertificateX509 extends SecurityCertificate {
	/**
	 * X509 certificate in PEM format.
	 */
	protected readonly _certificate;

	/**
	 * SecurityCertificateX509 constructor.
	 *
	 * @param certificate X509 certificate in PEM format.
	 */
	constructor(certificate: string) {
		super();

		this._certificate = certificate;
	}

	/**
	 * Encode as PEM data.
	 *
	 * @returns The binary PEM data.
	 */
	public encodePemData() {
		// Remove all the non-base64 lines, then decode.
		const base64 = this._certificate
			.split(/[\n\r]+/)
			.map(s => s.trim())
			.filter(s => !s.startsWith('-'))
			.join('');
		return base64Decode(base64);
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
