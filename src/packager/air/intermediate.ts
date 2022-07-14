import {PackagerAir} from '../air';

/**
 * PackagerAirIntermediate object.
 */
export class PackagerAirIntermediate extends PackagerAir {
	/**
	 * PackagerAirIntermediate constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Package mimetype.
	 *
	 * @returns Mimetype string.
	 */
	public get mimetype() {
		return 'application/vnd.adobe.air-application-intermediate-package+zip';
	}

	/**
	 * Package signed.
	 *
	 * @returns Boolean for if package is signed or not.
	 */
	public get signed() {
		return false;
	}
}
