import {PackagerAir} from '../air';

/**
 * PackagerAirNative constructor.
 *
 * @param path Output path.
 */
export class PackagerAirNative extends PackagerAir {
	constructor(path: string) {
		super(path);
	}

	/**
	 * Package mimetype.
	 *
	 * @returns Mimetype string.
	 */
	public get mimetype() {
		return (
			'application/vnd.adobe.air-native-application-installer-package+zip'
		);
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
