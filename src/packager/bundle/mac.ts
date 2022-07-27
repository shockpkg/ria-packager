import {mkdir, readFile, utimes, writeFile} from 'fs/promises';
import {dirname, join as pathJoin} from 'path';

import {PathType} from '@shockpkg/archive-files';
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

export interface IFileTypeIcon {
	data?: Buffer | null;
	file?: string | null;
}

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
	public infoPlistData: string | Readonly<Buffer> | null = null;

	/**
	 * PkgInfo file.
	 */
	public pkgInfoFile: string | null = null;

	/**
	 * PkgInfo data.
	 */
	public pkgInfoData: string | Readonly<Buffer> | null = null;

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
	 * Get Info.plist data as DOM if any specified.
	 *
	 * @returns Info.plist DOM or null.
	 */
	public async getInfoPlistDocument() {
		const {infoPlistData, infoPlistFile} = this;
		let xml;
		if (typeof infoPlistData === 'string') {
			xml = infoPlistData;
		} else if (infoPlistData) {
			xml = infoPlistData.toString('utf8');
		} else if (infoPlistFile) {
			xml = await readFile(infoPlistFile, 'utf8');
		} else {
			return null;
		}
		const dom = new Plist();
		dom.fromXml(xml);
		return dom;
	}

	/**
	 * Get Info.plist data as DOM if any specified, or default.
	 *
	 * @returns Info.plist DOM.
	 */
	public async getInfoPlistDocumentOrDefault() {
		const dom = await this.getInfoPlistDocument();
		return dom || new Plist();
	}

	/**
	 * Get PkgInfo data if any specified, from data or file.
	 *
	 * @returns PkgInfo data or null.
	 */
	public async getPkgInfoData() {
		const {pkgInfoData, pkgInfoFile} = this;
		if (typeof pkgInfoData === 'string') {
			return Buffer.from(pkgInfoData, 'ascii');
		}
		return pkgInfoData || (pkgInfoFile ? readFile(pkgInfoFile) : null);
	}

	/**
	 * Get PkgInfo data if any specified, or default.
	 *
	 * @returns PkgInfo data.
	 */
	public async getPkgInfoDataOrDefault() {
		const r = await this.getPkgInfoData();
		return r || Buffer.from('APPL????', 'ascii');
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
	protected _getPlistCFBundleExecutable(): Value | null {
		return new ValueString(this._getFilename());
	}

	/**
	 * Get plist CFBundleIdentifier value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleIdentifier(): Value | null {
		return new ValueString(this._getId());
	}

	/**
	 * Get plist CFBundleShortVersionString value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleShortVersionString(): Value | null {
		return new ValueString(this._getVersionNumber());
	}

	/**
	 * Get plist CFBundleGetInfoString value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleGetInfoString(): Value | null {
		// Strange when no copyright but matches official packager.
		const copyright = this._getCopyright();
		const versionNumber = this._getVersionNumber();
		const add = copyright ? ` ${copyright}` : '';
		return new ValueString(`${versionNumber},${add}`);
	}

	/**
	 * Get plist NSHumanReadableCopyright value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSHumanReadableCopyright(): Value | null {
		return new ValueString(this._getCopyright() || '');
	}

	/**
	 * Get plist CFBundleIconFile value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleIconFile(): Value | null {
		const icon = this._getIcon();
		return icon && this._uidIcon(icon)
			? new ValueString(this.appIcnsFile)
			: null;
	}

	/**
	 * Get plist CFBundleLocalizations value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleLocalizations(): Value | null {
		const langs = this._applicationInfoSupportedLanguages;
		const list = langs ? langs.trim().split(/\s+/) : null;
		return list && list.length
			? new ValueArray(list.map(s => new ValueString(s)))
			: null;
	}

	/**
	 * Get plist NSHighResolutionCapable value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSHighResolutionCapable(): Value | null {
		return this.plistHighResolutionCapable
			? new ValueBoolean(
					this._applicationInfoRequestedDisplayResolution === 'high'
			  )
			: null;
	}

	/**
	 * Get plist NSAppTransportSecurity value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistNSAppTransportSecurity(): Value | null {
		return this.plistHasAppTransportSecurity
			? new ValueDict(
					new Map([
						['NSAllowsArbitraryLoads', new ValueBoolean(true)]
					])
			  )
			: null;
	}

	/**
	 * Get plist CFBundleDocumentTypes value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleDocumentTypes(): Value | null {
		const extensionMapping = this._extensionMapping;
		const fileTypes = this._applicationInfoFileTypes;
		if (!fileTypes || !fileTypes.size) {
			return null;
		}
		const useDesc = this.plistDocumentTypeNameIsDescription;
		const list: ValueDict[] = [];
		for (const [ext, info] of fileTypes) {
			const dict = new ValueDict();
			const {value} = dict;
			value.set(
				'CFBundleTypeExtensions',
				new ValueArray([new ValueString(ext)])
			);
			value.set(
				'CFBundleTypeMIMETypes',
				new ValueArray([new ValueString(info.contentType)])
			);
			value.set(
				'CFBundleTypeName',
				new ValueString(useDesc ? info.description || '' : info.name)
			);
			value.set('CFBundleTypeRole', new ValueString('Editor'));

			const iconFile = extensionMapping.get(ext);
			if (iconFile) {
				value.set('CFBundleTypeIconFile', new ValueString(iconFile));
			}

			list.push(dict);
		}
		return new ValueArray(list);
	}

	/**
	 * Get plist CFBundleAllowMixedLocalizations value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleAllowMixedLocalizations(): Value | null {
		return new ValueBoolean(true);
	}

	/**
	 * Get plist CFBundlePackageType value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundlePackageType(): Value | null {
		return new ValueString('APPL');
	}

	/**
	 * Get plist CFBundleInfoDictionaryVersion value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistCFBundleInfoDictionaryVersion(): Value | null {
		return new ValueString('6.0');
	}

	/**
	 * Get plist LSMinimumSystemVersion value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistLSMinimumSystemVersion(): Value | null {
		return new ValueString('10.6');
	}

	/**
	 * Get plist LSRequiresCarbon value.
	 *
	 * @returns The value or null if excluded.
	 */
	protected _getPlistLSRequiresCarbon(): Value | null {
		return new ValueBoolean(true);
	}

	/**
	 * Open implementation.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected async _open(applicationData: Readonly<Buffer>) {
		this._extensionMapping.clear();

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
		const sdk = await this._openSdk();
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
		await this._writeApplicationIcon();
		await this._writeFileTypeIcons();
		await this._writePkgInfo();
		await this._writeInfoPlist();

		this._extensionMapping.clear();
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
		const modern = this.applicationIconModern;
		const path = pathJoin(this.path, this.appIcnsPath);

		// Write either a modern or a reference icon.
		if (modern) {
			// eslint-disable-next-line no-await-in-loop
			await this._writeIconModern(path, icon);
		} else {
			// eslint-disable-next-line no-await-in-loop
			await this._writeIconReference(path, icon);
		}
	}

	/**
	 * Write file type icons, creating extension name mapping.
	 * Avoids writting duplicate icons where the file/data is the same.
	 */
	protected async _writeFileTypeIcons() {
		this._extensionMapping.clear();
		const mapping = this._extensionMapping;

		const fileIcons = this._getFileTypes();
		if (!fileIcons) {
			return;
		}
		const modern = this.fileTypeIconModern;

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

			// Write either a modern or a reference icon.
			if (modern) {
				// eslint-disable-next-line no-await-in-loop
				await this._writeIconModern(path, icon);
			} else {
				// eslint-disable-next-line no-await-in-loop
				await this._writeIconReference(path, icon);
			}
		}
	}

	/**
	 * Write out PkgInfo file.
	 */
	protected async _writePkgInfo() {
		const data = await this.getPkgInfoDataOrDefault();
		const path = pathJoin(this.path, this.appPkgInfoPath);
		await writeFile(path, data);
	}

	/**
	 * Generate Info.plist DOM object.
	 *
	 * @returns Plist DOM.
	 */
	protected async _generateInfoPlist() {
		const dom = await this.getInfoPlistDocumentOrDefault();
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
		 * @param value Value object.
		 */
		const val = (key: string, value: Value | null) => {
			if (done.has(key)) {
				return;
			}
			if (value) {
				dict.value.set(key, value);
			}
			done.add(key);
		};

		// Set all the values in the same order as the official packager.
		val(
			'CFBundleAllowMixedLocalizations',
			this._getPlistCFBundleAllowMixedLocalizations()
		);
		val('CFBundlePackageType', this._getPlistCFBundlePackageType());
		val(
			'CFBundleInfoDictionaryVersion',
			this._getPlistCFBundleInfoDictionaryVersion()
		);
		val('LSMinimumSystemVersion', this._getPlistLSMinimumSystemVersion());
		val('LSRequiresCarbon', this._getPlistLSRequiresCarbon());
		val('CFBundleIdentifier', this._getPlistCFBundleIdentifier());
		val('CFBundleGetInfoString', this._getPlistCFBundleGetInfoString());
		val(
			'CFBundleShortVersionString',
			this._getPlistCFBundleShortVersionString()
		);
		val(
			'NSHumanReadableCopyright',
			this._getPlistNSHumanReadableCopyright()
		);
		val('CFBundleExecutable', this._getPlistCFBundleExecutable());
		val('NSAppTransportSecurity', this._getPlistNSAppTransportSecurity());
		val('NSHighResolutionCapable', this._getPlistNSHighResolutionCapable());
		val('CFBundleIconFile', this._getPlistCFBundleIconFile());
		val('CFBundleDocumentTypes', this._getPlistCFBundleDocumentTypes());
		val('CFBundleLocalizations', this._getPlistCFBundleLocalizations());

		// If any existing values, copy the ones not already set.
		if (existing) {
			for (const [key, value] of existing.value) {
				val(key, value);
			}
		}

		return dom;
	}

	/**
	 * Write out Info.plist file.
	 */
	protected async _writeInfoPlist() {
		const dom = await this._generateInfoPlist();
		const path = pathJoin(this.path, this.appInfoPlistPath);
		await writeFile(
			path,
			dom.toXml({
				indentRoot: true,
				indentString: '    '
			})
		);
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
		for (const [path, types] of [
			[icon.image16x16, ['is32', 's8mk']],
			[icon.image32x32, ['il32', 'l8mk']],
			[icon.image48x48, ['ih32', 'h8mk']],
			[icon.image128x128, ['it32', 't8mk']]
		] as [string | null, string[]][]) {
			if (!path) {
				continue;
			}

			// eslint-disable-next-line no-await-in-loop
			const data = await readFile(this._getResourcePath(path));
			icns.addFromPng(data, types);
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
			if (!path) {
				continue;
			}

			// eslint-disable-next-line no-await-in-loop
			const data = await readFile(this._getResourcePath(path));
			icns.addFromPng(data, [type]);
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
