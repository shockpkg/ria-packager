/**
 * Hasher object.
 */
export abstract class Hasher {
	/**
	 * Hasher constructor.
	 */
	constructor() {}

	/**
	 * The number of bytes in the hash digest.
	 *
	 * @returns Byte size.
	 */
	public abstract get bytes(): number;

	/**
	 * Reset digest.
	 */
	public abstract reset(): void;

	/**
	 * Update with more data.
	 *
	 * @param data Data to be hashed.
	 */
	public abstract update(data: Readonly<Uint8Array>): void;

	/**
	 * Finish digest.
	 *
	 * @returns Digest data.
	 */
	public abstract digest(): Uint8Array;
}
