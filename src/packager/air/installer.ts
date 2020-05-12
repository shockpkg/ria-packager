import {PackagerAir} from '../air';

/**
 * PackagerAirInstaller constructor.
 *
 * @param path Output path.
 */
export class PackagerAirInstaller extends PackagerAir {
	constructor(path: string) {
		super(path);
	}

	/**
	 * Package mimetype.
	 *
	 * @returns Mimetype string.
	 */
	public get mimetype() {
		return 'application/vnd.adobe.air-application-installer-package+zip';
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
