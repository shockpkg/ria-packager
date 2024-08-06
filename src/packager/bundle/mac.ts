import {mkdir, readFile, utimes, writeFile} from 'node:fs/promises';
import {dirname, join as pathJoin} from 'node:path';

import {
	PathType,
	createArchiveByFileStatOrThrow
} from '@shockpkg/archive-files';
import {IconIcns} from '@shockpkg/icon-encoder';
import {
	Plist,
	Value,
	ValueString,
	ValueBoolean,
	ValueArray,
	ValueDict
} from '@shockpkg/plist-dom';

import {pathRelativeBaseMatch, pathRelativeBase} from '../../util';
import {IPackagerResourceOptions} from '../../packager';
import {IIcon, PackagerBundle} from '../bundle';

// eslint-disable-next-line jsdoc/require-jsdoc
const asValue = (v: Value) => v;
// eslint-disable-next-line jsdoc/require-jsdoc
const toValueBoolean = (v: boolean) => new ValueBoolean(v);
// eslint-disable-next-line jsdoc/require-jsdoc
const toValueString = (v: string) => new ValueString(v);

/**
 * PackagerBundleMac object.
 */
export class PackagerBundleMac extends PackagerBundle {
	/**
	 * Create modern application icon file.
	 * Enables higher resolutions icons and PNG compression.
	 * Default false uses the legacy formats of the official packager.
	 */
	public applicationIconModern = false;

	/**
	 * Create modern document type icon file.
	 * Enables higher resolutions icons and PNG compression.
	 * Default false uses the legacy formats of the official packager.
	 */
	public fileTypeIconModern = false;

	/**
	 * Info.plist file.
	 */
	public infoPlistFile: string | null = null;

	/**
	 * Info.plist data.
	 */
	public infoPlistData:
		| string
		| Readonly<Uint8Array>
		| (() => string | Readonly<Uint8Array>)
		| (() => Promise<string | Readonly<Uint8Array>>)
		| null = null;

	/**
	 * PkgInfo file.
	 */
	public pkgInfoFile: string | null = null;

	/**
	 * PkgInfo data.
	 */
	public pkgInfoData:
		| string
		| Readonly<Uint8Array>
		| (() => string | Readonly<Uint8Array>)
		| (() => Promise<string | Readonly<Uint8Array>>)
		| null = null;

	/**
	 * Remove unnecessary OS files from older versions of the framework.
	 * The official packages will include these if they are present in SDK.
	 */
	public frameworkCleanOsFiles = false;

	/**
	 * Optionally preserve resource mtime.
	 * The official packager does not preserve resource mtimes.
	 */
	public preserveResourceMtime = false;

	/**
	 * Value of CFBundleDocumentTypes CFBundleTypeName is description, not name.
	 * Tag value controlled by application descriptor.
	 * Set to false to match the behavior of SDK versions before 3.2.0.2070.
	 */
	public plistDocumentTypeNameIsDescription = true;

	/**
	 * Add an NSHighResolutionCapable tag to the Info.plist file.
	 * Tag value controlled by application descriptor.
	 * Set to false to match the behavior of SDK versions before 3.6.0.6090.
	 */
	public plistHighResolutionCapable = true;

	/**
	 * Remove unnecessary helper files from framework.
	 * Set to false to match the behavior of SDK versions before 25.0.0.134.
	 */
	public frameworkCleanHelpers = true;

	/**
	 * Add an NSAppTransportSecurity tag to the Info.plist file.
	 * Tag value controlled by application descriptor.
	 * Set to false to match the behavior of SDK versions before 27.0.0.128.
	 */
	public plistHasAppTransportSecurity = true;

	/**
	 * Extension mapping.
	 */
	protected _extensionMapping = new Map<string, string>();

	/**
	 * PackagerBundleMac constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * If Info.plist is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasInfoPlist() {
		return !!(this.infoPlistData || this.infoPlistFile);
	}

	/**
	 * If PkgInfo is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasPkgInfo() {
		return !!(this.pkgInfoData || this.pkgInfoFile);
	}

	/**
	 * Get app icns file.
	 *
	 * @returns File name.
	 */
	public get appIcnsFile() {
		return 'Icon.icns';
	}

	/**
	 * Get app icns path.
	 *
	 * @returns File path.
	 */
	public get appIcnsPath() {
		return `Contents/Resources/${this.appIcnsFile}`;
	}

	/**
	 * Get app Info.plist path.
	 *
	 * @returns File path.
	 */
	public get appInfoPlistPath() {
		return 'Contents/Info.plist';
	}

	/**
	 * Get app PkgInfo path.
	 *
	 * @returns File path.
	 */
	public get appPkgInfoPath() {
		return 'Contents/PkgInfo';
	}

	/**
	 * Get app resources path.
	 *
	 * @returns Resources path.
	 */
	public get appResourcesPath() {
		return 'Contents/Resources';
	}

	/**
	 * Get app binary path.
	 *
	 * @returns Binary path.
	 */
	public getAppBinaryPath() {
		return `Contents/MacOS/${this._getFilename()}`;
	}

	/**
	 * Get app framework path.
	 *
	 * @returns Framework path.
	 */
	public getAppFrameworkPath() {
		return 'Contents/Frameworks/Adobe AIR.framework';
	}

	/**
	 * Get SDK binary path.
	 *
	 * @returns Binary path.
	 */
	public getSdkBinaryPath() {
		return 'lib/nai/lib/CaptiveAppEntry';
	}

	/**
	 * Get SDK framework path.
	 *
	 * @returns Framework path.
	 */
	public getSdkFrameworkPath() {
		return 'runtimes/air-captive/mac/Adobe AIR.framework';
	}

	/**
	 * Get framework files excluded.
	 *
	 * @returns Excluded files in framework.
	 */
	public getFrameworkExcludes() {
		const r: string[] = [];
		if (this.frameworkCleanHelpers) {
			// Some files used to create applications, not used after that.
			r.push(
				'Versions/1.0/Adobe AIR_64 Helper',
				'Versions/1.0/Resources/ExtendedAppEntryTemplate64'
			);
		}
		if (this.frameworkCleanOsFiles) {
			// Some empty junk likely leftover from an Apple ZIP file.
			r.push('Versions/1.0/Resources/__MACOSX');
		}
		return r;
	}

	/**
	 * Get PkgInfo data if from data or file, else default.
	 *
	 * @returns PkgInfo data.
	 */
	public async getPkgInfoData() {
		const {pkgInfoData, pkgInfoFile} = this;
		if (typeof pkgInfoData === 'string') {
			return new TextEncoder().encode(pkgInfoData);
		}
		return (
			pkgInfoData ||
			(pkgInfoFile
				? readFile(pkgInfoFile)
				: new TextEncoder().encode('APPL????'))
		);
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
	 * Get plist CFBundleExecutable value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleExecutable(): string | null {
		return this._getFilename();
	}

	/**
	 * Get plist CFBundleIdentifier value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleIdentifier(): string | null {
		return this._getId();
	}

	/**
	 * Get plist CFBundleShortVersionString value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleShortVersionString(): string | null {
		return this._getVersionNumber();
	}

	/**
	 * Get plist CFBundleGetInfoString value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleGetInfoString(): string | null {
		// Strange when no copyright but matches official packager.
		const copyright = this._getCopyright();
		const versionNumber = this._getVersionNumber();
		const add = copyright ? ` ${copyright}` : '';
		return `${versionNumber},${add}`;
	}

	/**
	 * Get plist NSHumanReadableCopyright value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSHumanReadableCopyright(): string | null {
		return this._getCopyright() || '';
	}

	/**
	 * Get plist CFBundleIconFile value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleIconFile(): string | null {
		const icon = this._getIcon();
		return icon && this._uidIcon(icon) ? this.appIcnsFile : null;
	}

	/**
	 * Get plist CFBundleLocalizations value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleLocalizations(): string[] | null {
		const langs = this._applicationInfoSupportedLanguages;
		const list = langs ? langs.trim().split(/\s+/) : null;
		return list?.length ? list : null;
	}

	/**
	 * Get plist NSHighResolutionCapable value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSHighResolutionCapable(): boolean | null {
		return this.plistHighResolutionCapable
			? this._applicationInfoRequestedDisplayResolution === 'high'
			: null;
	}

	/**
	 * Get plist NSAppTransportSecurity value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSAppTransportSecurity(): Map<string, boolean> | null {
		return this.plistHasAppTransportSecurity
			? new Map([['NSAllowsArbitraryLoads', true]])
			: null;
	}

	/**
	 * Get plist CFBundleDocumentTypes value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleDocumentTypes():
		| Map<string, string | string[]>[]
		| null {
		const extensionMapping = this._extensionMapping;
		const fileTypes = this._applicationInfoFileTypes;
		if (!fileTypes?.size) {
			return null;
		}
		const useDesc = this.plistDocumentTypeNameIsDescription;
		const list: Map<string, string | string[]>[] = [];
		for (const [ext, info] of fileTypes) {
			const map = new Map<string, string | string[]>();
			map.set('CFBundleTypeExtensions', [ext]);
			map.set('CFBundleTypeMIMETypes', [info.contentType]);
			map.set(
				'CFBundleTypeName',
				useDesc ? info.description || '' : info.name
			);
			map.set('CFBundleTypeRole', 'Editor');

			const iconFile = extensionMapping.get(ext);
			if (iconFile) {
				map.set('CFBundleTypeIconFile', iconFile);
			}
			list.push(map);
		}
		return list;
	}

	/**
	 * Get plist CFBundleAllowMixedLocalizations value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleAllowMixedLocalizations(): boolean | null {
		return true;
	}

	/**
	 * Get plist CFBundlePackageType value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundlePackageType(): string | null {
		return 'APPL';
	}

	/**
	 * Get plist CFBundleInfoDictionaryVersion value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleInfoDictionaryVersion(): string | null {
		return '6.0';
	}

	/**
	 * Get plist LSMinimumSystemVersion value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistLSMinimumSystemVersion(): string | null {
		return '10.6';
	}

	/**
	 * Get plist LSRequiresCarbon value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistLSRequiresCarbon(): boolean | null {
		return true;
	}

	/**
	 * Open implementation.
	 */
	protected async _open() {
		this._extensionMapping.clear();

		const {sdkPath} = this;
		if (!sdkPath) {
			throw new Error('SDK path not set');
		}

		const appBinaryPath = this.getAppBinaryPath();
		const appFrameworkPath = this.getAppFrameworkPath();

		const sdkBinaryPath = this.getSdkBinaryPath();
		const sdkFrameworkPath = this.getSdkFrameworkPath();

		const frameworkExcludes = new Set(
			this.getFrameworkExcludes().map(s => s.toLowerCase())
		);

		const appBinaryPathFull = pathJoin(this.path, appBinaryPath);
		const appFrameworkPathFull = pathJoin(this.path, appFrameworkPath);

		let extractedBinary = false;
		let extractedFramework = false;

		// Extract everything needed from the SDK.
		const sdk = await createArchiveByFileStatOrThrow(sdkPath, {
			nobrowse: this.nobrowse
		});
		await sdk.read(async entry => {
			// Ignore any resource forks.
			if (entry.type === PathType.RESOURCE_FORK) {
				return true;
			}
			const path = entry.volumePath;

			// Extract if the binary.
			const sdkBinaryPathRel = pathRelativeBase(
				path,
				sdkBinaryPath,
				true
			);
			if (sdkBinaryPathRel !== null) {
				const dest = pathJoin(appBinaryPathFull, sdkBinaryPathRel);
				await entry.extract(dest);
				extractedBinary = true;
				return true;
			}

			// Extract if the framework.
			const frameworkPathRel = pathRelativeBase(
				path,
				sdkFrameworkPath,
				true
			);
			if (frameworkPathRel !== null) {
				// If this is an excluded path, skip over.
				if (frameworkExcludes.has(frameworkPathRel.toLowerCase())) {
					return null;
				}

				const dest = pathJoin(appFrameworkPathFull, frameworkPathRel);
				await entry.extract(dest);
				extractedFramework = true;
				return true;
			}

			// Optimization to avoid walking unrelated directories if possible.
			return pathRelativeBaseMatch(sdkFrameworkPath, path, true) ||
				pathRelativeBaseMatch(sdkBinaryPath, path, true)
				? true
				: null;
		});

		// Check that required components were extracted.
		if (!extractedBinary) {
			throw new Error(`Failed to locate binary in SDK: ${sdkBinaryPath}`);
		}
		if (!extractedFramework) {
			throw new Error(
				`Failed to locate framework in SDK: ${sdkFrameworkPath}`
			);
		}
	}

	/**
	 * Close implementation.
	 */
	protected async _close() {
		try {
			await Promise.all([
				this._writeApplicationIcon(),
				this._writeFileTypeIcons(),
				this._writePkgInfo()
			]);
			await this._writeInfoPlist();
		} finally {
			this._extensionMapping.clear();
		}
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
		data: Readonly<Uint8Array>,
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
	 * Get path to a resource file.
	 *
	 * @param parts Path parts.
	 * @returns Full path.
	 */
	protected _getResourcePath(...parts: string[]) {
		return pathJoin(this.path, this.appResourcesPath, ...parts);
	}

	/**
	 * Write the application icon if specified.
	 */
	protected async _writeApplicationIcon() {
		const icon = this._getIcon();
		if (!icon || !this._uidIcon(icon)) {
			return;
		}

		const path = pathJoin(this.path, this.appIcnsPath);

		// Write either a modern or a reference icon.
		// eslint-disable-next-line unicorn/prefer-ternary
		if (this.applicationIconModern) {
			await this._writeIconModern(path, icon);
		} else {
			await this._writeIconReference(path, icon);
		}
	}

	/**
	 * Write file type icons, creating extension name mapping.
	 * Avoids writting duplicate icons where the file/data is the same.
	 */
	protected async _writeFileTypeIcons() {
		const mapping = this._extensionMapping;
		mapping.clear();

		const fileIcons = this._getFileTypes();
		if (!fileIcons) {
			return;
		}

		// Write either a modern or a reference icon.
		const write = this.fileTypeIconModern
			? async (path: string, icon: IIcon) =>
					this._writeIconModern(path, icon)
			: async (path: string, icon: IIcon) =>
					this._writeIconReference(path, icon);

		const writes = [];
		const did = new Map<string, string>();
		let index = 0;
		for (const [ext, {icon}] of fileIcons) {
			if (!icon) {
				continue;
			}

			// Compute a unique identifier for the used icon set paths.
			const uid = this._uidIcon(icon);
			if (!uid) {
				continue;
			}

			// Check if file was already generated for this icon set.
			const done = did.get(uid);
			if (done) {
				mapping.set(ext, done);
				continue;
			}

			// Compute name for this icon set and cache.
			const name = this._getFileTypeIconName(index++);
			did.set(uid, name);
			mapping.set(ext, name);

			// Get the path to write to.
			const path = pathJoin(this.path, this._getFileTypeIconPath(name));
			writes.push(write(path, icon));
		}
		await Promise.all(writes);
	}

	/**
	 * Write out PkgInfo file.
	 */
	protected async _writePkgInfo() {
		const data = await this.getPkgInfoData();
		const d = typeof data === 'function' ? await data() : data;
		const path = pathJoin(this.path, this.appPkgInfoPath);
		await writeFile(path, d);
	}

	/**
	 * Generate Info.plist XML string.
	 *
	 * @returns XML string.
	 */
	protected async _generateInfoPlist() {
		const {infoPlistData, infoPlistFile} = this;

		const dom = new Plist();
		if (typeof infoPlistData === 'function') {
			const d = await infoPlistData();
			dom.fromXml(
				typeof d === 'string' ? d : new TextDecoder().decode(d)
			);
		} else if (typeof infoPlistData === 'string') {
			dom.fromXml(infoPlistData);
		} else if (infoPlistData) {
			dom.fromXml(new TextDecoder().decode(infoPlistData));
		} else if (infoPlistFile) {
			dom.fromXml(await readFile(infoPlistFile, 'utf8'));
		}

		const existing =
			dom.value && dom.value.type === ValueDict.TYPE
				? (dom.value as ValueDict)
				: null;
		const dict = (dom.value = new ValueDict());

		const done = new Set<string>();

		/**
		 * A little helper to set values only once.
		 *
		 * @param key Key string.
		 * @param value The value or null.
		 * @param wrap Wrap value.
		 */
		const val = <T>(
			key: string,
			value: T | null,
			wrap: (v: T) => Value
		) => {
			if (done.has(key)) {
				return;
			}
			if (value !== null) {
				dict.value.set(key, wrap(value));
			}
			done.add(key);
		};

		// Set all the values in the same order as the official packager.
		val(
			'CFBundleAllowMixedLocalizations',
			this._getPlistCFBundleAllowMixedLocalizations(),
			toValueBoolean
		);
		val(
			'CFBundlePackageType',
			this._getPlistCFBundlePackageType(),
			toValueString
		);
		val(
			'CFBundleInfoDictionaryVersion',
			this._getPlistCFBundleInfoDictionaryVersion(),
			toValueString
		);
		val(
			'LSMinimumSystemVersion',
			this._getPlistLSMinimumSystemVersion(),
			toValueString
		);
		val(
			'LSRequiresCarbon',
			this._getPlistLSRequiresCarbon(),
			toValueBoolean
		);
		val(
			'CFBundleIdentifier',
			this._getPlistCFBundleIdentifier(),
			toValueString
		);
		val(
			'CFBundleGetInfoString',
			this._getPlistCFBundleGetInfoString(),
			toValueString
		);
		val(
			'CFBundleShortVersionString',
			this._getPlistCFBundleShortVersionString(),
			toValueString
		);
		val(
			'NSHumanReadableCopyright',
			this._getPlistNSHumanReadableCopyright(),
			toValueString
		);
		val(
			'CFBundleExecutable',
			this._getPlistCFBundleExecutable(),
			toValueString
		);
		val(
			'NSAppTransportSecurity',
			this._getPlistNSAppTransportSecurity(),
			v => {
				const r = new ValueDict();
				for (const [k, d] of v) {
					r.set(k, new ValueBoolean(d));
				}
				return r;
			}
		);
		val(
			'NSHighResolutionCapable',
			this._getPlistNSHighResolutionCapable(),
			toValueBoolean
		);
		val(
			'CFBundleIconFile',
			this._getPlistCFBundleIconFile(),
			toValueString
		);
		val(
			'CFBundleDocumentTypes',
			this._getPlistCFBundleDocumentTypes(),
			v => {
				const r = new ValueArray();
				for (const map of v) {
					const d = new ValueDict();
					for (const [k, t] of map) {
						d.set(
							k,
							Array.isArray(t)
								? new ValueArray(t.map(toValueString))
								: new ValueString(t)
						);
					}
					r.push(d);
				}
				return r;
			}
		);
		val(
			'CFBundleLocalizations',
			this._getPlistCFBundleLocalizations(),
			v => new ValueArray(v.map(toValueString))
		);

		// If any existing values, copy the ones not already set.
		if (existing) {
			for (const [key, value] of existing.value) {
				val(key, value, asValue);
			}
		}

		return dom.toXml({
			indentRoot: true,
			indentString: '    '
		});
	}

	/**
	 * Write out Info.plist file.
	 */
	protected async _writeInfoPlist() {
		const xml = await this._generateInfoPlist();
		const path = pathJoin(this.path, this.appInfoPlistPath);
		await writeFile(path, xml);
	}

	/**
	 * Calculate UID for icon, or null if none of required icons set.
	 *
	 * @param icon Icon info.
	 * @returns UID string or null.
	 */
	protected _uidIcon(icon: Readonly<IIcon>) {
		const paths = [
			icon.image16x16,
			icon.image32x32,
			icon.image48x48,
			icon.image128x128
		];

		// If none set, skip.
		let has = false;
		for (const p of paths) {
			if (p) {
				has = true;
				break;
			}
		}

		// Compute a unique identifier for the used icon set paths.
		return has
			? paths.map(s => `${s ? s.length : 0}:${s || ''}`).join('|')
			: null;
	}

	/**
	 * Write icon matching official format.
	 *
	 * @param path Icon path.
	 * @param icon Icon info.
	 */
	protected async _writeIconReference(path: string, icon: Readonly<IIcon>) {
		// Add icons in the same order official packager would use.
		const icns = new IconIcns();
		const readers = [];
		for (const [path, types] of [
			[icon.image16x16, ['is32', 's8mk']],
			[icon.image32x32, ['il32', 'l8mk']],
			[icon.image48x48, ['ih32', 'h8mk']],
			[icon.image128x128, ['it32', 't8mk']]
		] as [string | null, string[]][]) {
			if (path) {
				readers.push(async () =>
					readFile(this._getResourcePath(path)).then(
						d => [d, types] as [Buffer, string[]]
					)
				);
			}
		}
		const datas = await Promise.all(readers.map(async f => f()));
		for (const [data, types] of datas) {
			// eslint-disable-next-line no-await-in-loop
			await icns.addFromPng(data, types);
		}
		await writeFile(path, icns.encode());
	}

	/**
	 * Write icon using modern format.
	 *
	 * @param path Icon path.
	 * @param icon Icon info.
	 * @returns Icon written.
	 */
	protected async _writeIconModern(path: string, icon: Readonly<IIcon>) {
		// Add icons in the same order iconutil would.
		const icns = new IconIcns();
		const readers = [];
		for (const [path, type] of [
			// [icon.image64x64, 'ic12'],
			[icon.image128x128, 'ic07'],
			// [icon.image256x256, 'ic13'],
			// [icon.image256x256, 'ic08'],
			[icon.image16x16, 'ic04'],
			[icon.image512x512, 'ic14'],
			[icon.image512x512, 'ic09'],
			[icon.image32x32, 'ic05'],
			[icon.image1024x1024, 'ic10'],
			[icon.image32x32, 'ic11']
		] as [string | null, string][]) {
			if (path) {
				readers.push(async () =>
					readFile(this._getResourcePath(path)).then(
						d => [d, type] as [Buffer, string]
					)
				);
			}
		}
		const datas = await Promise.all(readers.map(async f => f()));
		for (const [data, type] of datas) {
			// eslint-disable-next-line no-await-in-loop
			await icns.addFromPng(data, [type]);
		}
		await writeFile(path, icns.encode());
	}

	/**
	 * Get path for a file type icon file.
	 *
	 * @param name File name.
	 * @returns File path.
	 */
	protected _getFileTypeIconPath(name: string) {
		return pathJoin('Contents', 'Resources', name);
	}

	/**
	 * Get name for a file type icon file.
	 *
	 * @param index Unique index.
	 * @returns File name.
	 */
	protected _getFileTypeIconName(index: number) {
		return `DocumentIcon${index}.icns`;
	}
}
