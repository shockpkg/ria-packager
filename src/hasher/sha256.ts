import {createHash} from 'node:crypto';

import {Hasher} from '../hasher.ts';

/**
 * HasherSha256 object.
 */
export class HasherSha256 extends Hasher {
	/**
	 * Hasher stream.
	 */
	private _hash_ = createHash('sha256');

	/**
	 * HasherSha256 constructor.
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
		this._hash_ = createHash('sha256');
	}

	/**
	 * Update with more data.
	 *
	 * @param data Data to be hashed.
	 */
	public update(data: Readonly<Uint8Array>) {
		this._hash_.update(data);
	}

	/**
	 * Finish digest.
	 *
	 * @returns Digest data.
	 */
	public digest() {
		const d = this._hash_.digest();
		return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
	}
}
