/**
 * Hasher object.
 */
export abstract class Hasher extends Object {
	/**
	 * Hasher constructor.
	 */
	constructor() {
		super();
	}

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
	public abstract update(data: Readonly<Buffer>): void;

	/**
	 * Finish digest.
	 *
	 * @returns Digest data.
	 */
	public abstract digest(): Buffer;
}
