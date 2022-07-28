import {SecurityCertificate} from './certificate';
import {SecurityKeyPrivate} from './key/private';

/**
 * SecurityKeystore object.
 */
export abstract class SecurityKeystore {
	/**
	 * SecurityKeystore constructor.
	 */
	constructor() {}

	/**
	 * Reset the internal state.
	 */
	public abstract reset(): void;

	/**
	 * Get certificate or throw if none.
	 *
	 * @returns Certificate instance.
	 */
	public abstract getCertificate(): SecurityCertificate;

	/**
	 * Get private key or throw if none.
	 *
	 * @returns Private key instance.
	 */
	public abstract getPrivateKey(): SecurityKeyPrivate;
}
