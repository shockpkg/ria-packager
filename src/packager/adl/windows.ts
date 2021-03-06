import {
	join as pathJoin
} from 'path';

// @ts-ignore-file
import * as puka from 'puka';
import fse from 'fs-extra';

import {IPackagerResourceOptions} from '../../packager';
import {PackagerAdl} from '../adl';

const quoteForCmd = puka.quoteForCmd || puka.default.quoteForCmd;

/**
 * PackagerAdlWindows constructor.
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
		await fse.outputFile(dest, data, {
			mode
		});

		// Optionally preserve mtime information.
		if (this.preserveResourceMtime) {
			const {mtime} = options;
			if (mtime) {
				await fse.utimes(dest, mtime, mtime);
			}
		}
	}

	/**
	 * Write the run script.
	 */
	protected async _writeRunScript() {
		const {
			appSdkPath,
			appResourcesPath,
			_metaResourceApplicationPath
		} = this;
		const arch = this.architecture === 'x64' ? '64' : '';
		const bs = (s: string) => s.replace(/\//g, '\\');
		await fse.outputFile(pathJoin(this.path, this.appRunPath), [
			'@ECHO OFF',
			'',
			[
				...[
					bs(`${appSdkPath}/bin/adl${arch}`),
					...this._generateOptionArguments(),
					bs(`${appResourcesPath}/${_metaResourceApplicationPath}`),
					bs(appResourcesPath)
				].map(quoteForCmd),
				'--',
				'%*'
			].join(' '),
			''
		].join('\r\n'), {
			encoding: 'utf8',
			mode: 0o777
		});
	}
}
