import {SecurityKey} from '../key';

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
	public abstract sign(data: Readonly<Buffer>, digest: string): Buffer;
}
