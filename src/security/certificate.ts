/**
 * SecurityCertificate object.
 */
export abstract class SecurityCertificate extends Object {
	/**
	 * SecurityCertificate constructor.
	 */
	constructor() {
		super();
	}

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
