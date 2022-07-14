import {createHash} from 'crypto';

import {Hasher} from '../hasher';

/**
 * HasherSha1 object.
 */
export class HasherSha1 extends Hasher {
	/**
	 * Hasher stream.
	 */
	protected _hash = createHash('sha1');

	/**
	 * HasherSha1 constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * The number of bytes in the hash digest.
	 *
	 * @returns Byte size.
	 */
	public get bytes() {
		return 32;
	}

	/**
	 * Reset digest.
	 */
	public reset() {
		this._hash = createHash('sha1');
	}

	/**
	 * Update with more data.
	 *
	 * @param data Data to be hashed.
	 */
	public update(data: Readonly<Buffer>) {
		this._hash.update(data as Buffer);
	}

	/**
	 * Finish digest.
	 *
	 * @returns Digest data.
	 */
	public digest(): Buffer {
		return this._hash.digest();
	}
}
