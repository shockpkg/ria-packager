/**
 * SecurityKey constructor.
 */
export abstract class SecurityKey extends Object {
	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public abstract reset(): void;
}
