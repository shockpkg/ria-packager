import {PackagerAir} from '../air';

/**
 * PackagerAirNative object.
 */
export class PackagerAirNative extends PackagerAir {
	/**
	 * PackagerAirNative constructor.
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
		// eslint-disable-next-line max-len
		return 'application/vnd.adobe.air-native-application-installer-package+zip';
	}

	/**
	 * Package signed.
	 *
	 * @returns Boolean for if package is signed or not.
	 */
	public get signed() {
		return true;
	}
}
