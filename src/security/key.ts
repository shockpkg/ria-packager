/**
 * SecurityKey object.
 */
export abstract class SecurityKey extends Object {
	/**
	 * SecurityKey constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public abstract reset(): void;
}
