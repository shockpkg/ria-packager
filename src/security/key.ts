/**
 * SecurityKey object.
 */
export abstract class SecurityKey {
	/**
	 * SecurityKey constructor.
	 */
	constructor() {}

	/**
	 * Reset the internal state.
	 */
	public abstract reset(): void;
}
