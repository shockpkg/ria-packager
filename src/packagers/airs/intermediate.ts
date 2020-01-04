import {PackagerAir} from '../air';

/**
 * PackagerAirIntermediate constructor.
 *
 * @param path Output path.
 */
export class PackagerAirIntermediate extends PackagerAir {
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
