import {join as pathJoin} from 'node:path';

import {PathType} from '@shockpkg/archive-files';

import {pathRelativeBaseMatch} from '../util';
import {Packager} from '../packager';

/**
 * PackagerAdl object.
 */
export abstract class PackagerAdl extends Packager {
	/**
	 * Path to the SDK, an archive or directory.
	 */
	public sdkPath: string | null = null;

	/**
	 * Application pubid.
	 */
	public pubid: string | null = null;

	/**
	 * Application profile.
	 */
	public profile: string | null = null;

	/**
	 * Application screensize.
	 */
	public screensize: string | null = null;

	/**
	 * Application nodebug.
	 */
	public nodebug = false;

	/**
	 * Application atlogin.
	 */
	public atlogin = false;

	/**
	 * PackagerAdl constructor.
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
		return false;
	}

	/**
	 * Get app sdk path.
	 *
	 * @returns Resources path.
	 */
	public get appSdkPath() {
		return 'sdk';
	}

	/**
	 * Get app resources path.
	 *
	 * @returns Resources path.
	 */
	public get appResourcesPath() {
		return 'app';
	}

	/**
	 * Get app run path.
	 *
	 * @returns Resources path.
	 */
	public abstract get appRunPath(): string;

	/**
	 * Open the configured SDK.
	 *
	 * @returns Archive instance.
	 */
	protected async _openSdk() {
		const {sdkPath} = this;
		if (!sdkPath) {
			throw new Error('SDK path not set');
		}
		const archive = await this._openArchive(sdkPath);
		return archive;
	}

	/**
	 * Generate aruments.
	 *
	 * @returns Argument options.
	 */
	protected _generateOptionArguments() {
		const {pubid, profile, screensize, nodebug, atlogin} = this;
		const r = [];
		if (pubid !== null) {
			r.push('-pubid', pubid);
		}
		if (profile !== null) {
			r.push('-profile', profile);
		}
		if (screensize !== null) {
			r.push('-screensize', screensize);
		}
		if (nodebug) {
			r.push('-nodebug');
		}
		if (atlogin) {
			r.push('-atlogin');
		}
		return r;
	}

	/**
	 * Open implementation.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected async _open(applicationData: Readonly<Buffer>) {
		const {required, optional} = this._sdkComponents();

		const components = [
			...required.map(paths => ({
				paths,
				required: true,
				found: false
			})),
			...optional.map(paths => ({
				paths,
				required: false,
				found: false
			}))
		];

		/**
		 * Search function.
		 *
		 * @param volumePath Volume path.
		 * @returns A boolean or null.
		 */
		const component = (volumePath: string) => {
			// Default to not searching any subpaths.
			let r: boolean | null = false;
			for (const component of components) {
				for (const path of component.paths) {
					// If extracting, mark found, return true.
					if (pathRelativeBaseMatch(volumePath, path, true)) {
						component.found = true;
						return true;
					}

					// If a parent path, remember to search down.
					if (pathRelativeBaseMatch(path, volumePath, true)) {
						r = null;
					}
				}
			}
			return r;
		};

		// Extract everything needed from the SDK.
		const sdk = await this._openSdk();
		await sdk.read(async entry => {
			// Ignore any resource forks.
			if (entry.type === PathType.RESOURCE_FORK) {
				return true;
			}
			const path = entry.volumePath;
			const action = component(path);

			if (action === true) {
				const dest = this._getSdkPath(path);
				await entry.extract(dest);
				return true;
			}

			// Optimization to avoid walking unrelated directories if possible.
			return action === null ? true : null;
		});

		// Check that everything necessary was extracted.
		for (const {found, required, paths} of components) {
			if (found || !required) {
				continue;
			}
			const info = paths.map(s => JSON.stringify(s)).join(' | ');
			throw new Error(`Failed to locate component in SDK: ${info}`);
		}
	}

	/**
	 * Get path to a resource file.
	 *
	 * @param parts Path parts.
	 * @returns Full path.
	 */
	protected _getSdkPath(...parts: string[]) {
		return pathJoin(this.path, this.appSdkPath, ...parts);
	}

	/**
	 * Get path to a resource file.
	 *
	 * @param parts Path parts.
	 * @returns Full path.
	 */
	protected _getResourcePath(...parts: string[]) {
		return pathJoin(this.path, this.appResourcesPath, ...parts);
	}

	/**
	 * The SDK components to be copied.
	 *
	 * @returns Required and optional components.
	 */
	protected abstract _sdkComponents(): {
		required: string[][];
		optional: string[][];
	};
}
