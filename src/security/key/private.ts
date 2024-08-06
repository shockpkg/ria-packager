import {SecurityKey} from '../key.ts';

/**
 * SecurityKeyPrivate object.
 */
export abstract class SecurityKeyPrivate extends SecurityKey {
	/**
	 * SecurityKeyPrivate constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * Sign data.
	 *
	 * @param data Data to be signed.
	 * @param digest Digest algorithm.
	 * @returns The signature.
	 */
	public abstract sign(
		data: Readonly<Uint8Array>,
		digest: string
	): Uint8Array;
}
