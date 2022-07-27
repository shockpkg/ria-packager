import {mkdir, utimes, writeFile} from 'fs/promises';
import {dirname, join as pathJoin} from 'path';

// @ts-ignore-file
import * as puka from 'puka';

import {IPackagerResourceOptions} from '../../packager';
import {PackagerAdl} from '../adl';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const quoteForCmd = (puka.quoteForCmd || puka.default.quoteForCmd) as (
	s: string
) => string;

/**
 * Convert forward slashes to back slashes.
 *
 * @param s String with forward slashes.
 * @returns String with back slaches.
 */
const bs = (s: string) => s.replace(/\//g, '\\');

/**
 * PackagerAdlWindows object.
 *
 * @param path Output path.
 */
export class PackagerAdlWindows extends PackagerAdl {
	/**
	 * Optionally preserve resource mtime.
	 * The official packager does not preserve resource mtimes.
	 */
	public preserveResourceMtime = false;

	/**
	 * Optionally use specific architecture.
	 */
	public architecture: 'x86' | 'x64' | null = null;

	/**
	 * PackagerAdlWindows constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Get app run path.
	 *
	 * @returns Resources path.
	 */
	public get appRunPath() {
		return 'run.bat';
	}

	/**
	 * Get file mode value.
	 *
	 * @param executable Is the entry executable.
	 * @returns File mode.
	 */
	protected _getFileMode(executable: boolean) {
		return executable ? 0b111100100 : 0b110100100;
	}

	/**
	 * The SDK components to be copied.
	 *
	 * @returns Required and optional components.
	 */
	protected _sdkComponents() {
		const arch = this.architecture === 'x64' ? '64' : '';
		return {
			required: [
				[`bin/adl${arch}.exe`],
				[
					`runtimes/air/win${arch}`,
					// Old SDK 1.0 and 1.1 location:
					'runtime/Adobe AIR'
				]
			],
			optional: []
		};
	}

	/**
	 * Close implementation.
	 */
	protected async _close() {
		await this._writeRunScript();
	}

	/**
	 * Write resource with data implementation.
	 *
	 * @param destination Packaged file relative destination.
	 * @param data Resource data.
	 * @param options Resource options.
	 */
	protected async _writeResource(
		destination: string,
		data: Readonly<Buffer>,
		options: Readonly<IPackagerResourceOptions>
	) {
		// Write resource to file.
		const mode = this._getFileMode(options.executable || false);
		const dest = this._getResourcePath(destination);
		await mkdir(dirname(dest), {recursive: true});
		await writeFile(dest, data, {mode});

		// Optionally preserve mtime information.
		if (this.preserveResourceMtime) {
			const {mtime} = options;
			if (mtime) {
				await utimes(dest, mtime, mtime);
			}
		}
	}

	/**
	 * Write the run script.
	 */
	protected async _writeRunScript() {
		const {
			path,
			appSdkPath,
			appResourcesPath,
			_metaResourceApplicationPath
		} = this;
		const arch = this.architecture === 'x64' ? '64' : '';
		const metaPath = `${appResourcesPath}/${_metaResourceApplicationPath}`;
		await mkdir(dirname(path), {recursive: true});
		await writeFile(
			pathJoin(path, this.appRunPath),
			[
				'@ECHO OFF',
				'',
				[
					...[
						bs(`${appSdkPath}/bin/adl${arch}`),
						...this._generateOptionArguments(),
						bs(metaPath),
						bs(appResourcesPath)
					].map(quoteForCmd),
					'--',
					'%*'
				].join(' '),
				''
			].join('\r\n'),
			{
				encoding: 'utf8',
				mode: 0o777
			}
		);
	}
}
