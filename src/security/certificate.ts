/**
 * SecurityCertificate object.
 */
export abstract class SecurityCertificate {
	/**
	 * SecurityCertificate constructor.
	 */
	constructor() {}

	/**
	 * Reset the internal state.
	 */
	public abstract reset(): void;

	/**
	 * Encode for certchain data.
	 *
	 * @returns Certchain data.
	 */
	public abstract encodeCertchain(): Buffer;
}
