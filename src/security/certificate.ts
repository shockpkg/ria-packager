/**
 * SecurityCertificate object.
 */
export abstract class SecurityCertificate {
	/**
	 * SecurityCertificate constructor.
	 */
	constructor() {}

	/**
	 * Encode for certchain data.
	 *
	 * @returns Certchain data.
	 */
	public abstract encodeCertchain(): Buffer;
}
