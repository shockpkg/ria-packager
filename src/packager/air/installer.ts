import {PackagerAir} from '../air.ts';

/**
 * PackagerAirInstaller object.
 */
export class PackagerAirInstaller extends PackagerAir {
	/**
	 * PackagerAirInstaller constructor.
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
