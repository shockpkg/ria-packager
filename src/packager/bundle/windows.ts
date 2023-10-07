import {
	copyFile,
	mkdir,
	readFile,
	stat,
	utimes,
	writeFile
} from 'node:fs/promises';
import {dirname, join as pathJoin} from 'node:path';

import {signatureSet} from 'portable-executable-signature';
import {createImage} from '@rgba-image/create-image';
import {fromPng, toPng} from '@rgba-image/png';
import {lanczos} from '@rgba-image/lanczos';
import {PathType} from '@shockpkg/archive-files';
import {IconIco} from '@shockpkg/icon-encoder';
import {
	NtExecutable,
	NtExecutableResource,
	Resource,
	Data
} from '@shockpkg/resedit';

import {pathRelativeBaseMatch, pathRelativeBase, align} from '../../util';
import {IPackagerResourceOptions} from '../../packager';
import {IIcon, PackagerBundle} from '../bundle';

// IMAGE_DATA_DIRECTORY indexes.
const IDD_RESOURCE = 2;
const IDD_BASE_RELOCATION = 5;

// IMAGE_SECTION_HEADER characteristics.
const IMAGE_SCN_CNT_CODE = 0x00000020;
const IMAGE_SCN_CNT_INITIALIZED_DATA = 0x00000040;
const IMAGE_SCN_CNT_UNINITIALIZED_DATA = 0x00000080;

/**
 * Assert the given section is last section.
 *
 * @param exe NtExecutable instance.
 * @param index ImageDirectory index.
 * @param name Friendly name for messages.
 */
function exeAssertLastSection(
	exe: (typeof NtExecutable)['prototype'],
	index: number,
	name: string
) {
	const section = exe.getSectionByEntry(index);
	if (!section) {
		throw new Error(`Missing section: ${index}:${name}`);
	}
	const allSections = exe.getAllSections();
	let last = allSections[0].info;
	for (const {info} of allSections) {
		if (info.pointerToRawData > last.pointerToRawData) {
			last = info;
		}
	}
	const {info} = section;
	if (info.pointerToRawData < last.pointerToRawData) {
		throw new Error(`Not the last section: ${index}:${name}`);
	}
}

/**
 * Removes the reloc section if exists, fails if not the last section.
 *
 * @param exe NtExecutable instance.
 * @returns Restore function.
 */
function exeRemoveReloc(exe: (typeof NtExecutable)['prototype']) {
	const section = exe.getSectionByEntry(IDD_BASE_RELOCATION);
	if (!section) {
		return () => {};
	}
	const {size} =
		exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
	exeAssertLastSection(exe, IDD_BASE_RELOCATION, '.reloc');
	exe.setSectionByEntry(IDD_BASE_RELOCATION, null);
	return () => {
		exe.setSectionByEntry(IDD_BASE_RELOCATION, section);
		const {virtualAddress} =
			exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
		exe.newHeader.optionalHeaderDataDirectory.set(IDD_BASE_RELOCATION, {
			virtualAddress,
			size
		});
	};
}

/**
 * Update the sizes in EXE headers.
 *
 * @param exe NtExecutable instance.
 */
function exeUpdateSizes(exe: (typeof NtExecutable)['prototype']) {
	const {optionalHeader} = exe.newHeader;
	const {fileAlignment} = optionalHeader;
	let sizeOfCode = 0;
	let sizeOfInitializedData = 0;
	let sizeOfUninitializedData = 0;
	for (const {
		info: {characteristics, sizeOfRawData, virtualSize}
	} of exe.getAllSections()) {
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_CODE) {
			sizeOfCode += sizeOfRawData;
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_INITIALIZED_DATA) {
			sizeOfInitializedData += Math.max(
				sizeOfRawData,
				align(virtualSize, fileAlignment)
			);
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_UNINITIALIZED_DATA) {
			sizeOfUninitializedData += align(virtualSize, fileAlignment);
		}
	}
	optionalHeader.sizeOfCode = sizeOfCode;
	optionalHeader.sizeOfInitializedData = sizeOfInitializedData;
	optionalHeader.sizeOfUninitializedData = sizeOfUninitializedData;
}

/**
 * Helper function to resize images using lanczos algorithm.
 *
 * @param img Image object.
 * @param w Resized width.
 * @param h Resized height.
 * @returns Resized image.
 */
function resizeLanczos(
	img: Readonly<ReturnType<typeof createImage>>,
	w: number,
	h: number
) {
	const r = createImage(w, h);
	lanczos(img, r, 0, 0, img.width, img.height, 0, 0, w, h);
	return r;
}

/**
 * PackagerBundleWindows object.
 */
export class PackagerBundleWindows extends PackagerBundle {
	/**
	 * Create modern application icon resource.
	 * Enables higher resolution 256x256 icon with PNG compression.
	 * Higher resolutions resized with lanczos from 512x512 or 1024x1024.
	 * Default false uses the legacy formats of the official packager.
	 */
	public applicationIconModern = false;

	/**
	 * Create modern document type icon resource.
	 * Enables higher resolution 256x256 icon with PNG compression.
	 * Higher resolutions resized with lanczos from 512x512 or 1024x1024.
	 * Default false uses the legacy formats of the official packager.
	 */
	public fileTypeIconModern = false;

	/**
	 * Remove unnecessary helper files from framework.
	 * The official packages will include these.
	 */
	public frameworkCleanHelpers = false;

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
	 * Version strings.
	 *
	 * @default null
	 */
	public fileVersion: string | null = null;

	/**
	 * Product version.
	 *
	 * @default null
	 */
	public productVersion: string | null = null;

	/**
	 * Version strings.
	 *
	 * @default null
	 */
	public versionStrings: {[key: string]: string} | null = null;

	/**
	 * PackagerBundleWindows constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Get app binary path.
	 *
	 * @returns Binary path.
	 */
	public getAppBinaryPath() {
		return `${this._getFilename()}.exe`;
	}

	/**
	 * Get app framework path.
	 *
	 * @returns Framework path.
	 */
	public getAppFrameworkPath() {
		return 'Adobe AIR';
	}

	/**
	 * Get SDK binary path.
	 *
	 * @returns Binary path.
	 */
	public getSdkBinaryPath() {
		const framework = this.getSdkFrameworkPath();
		return `${framework}/Versions/1.0/Resources/CaptiveAppEntry.exe`;
	}

	/**
	 * Get SDK framework path.
	 *
	 * @returns Framework path.
	 */
	public getSdkFrameworkPath() {
		const win = this._getArchitecture() === 'x64' ? 'win64' : 'win';
		return `runtimes/air-captive/${win}/Adobe AIR`;
	}

	/**
	 * Get all version strings, if any.
	 *
	 * @returns Verion strings.
	 */
	public getVersionStrings() {
		const {fileVersion, productVersion, versionStrings} = this;
		if (
			fileVersion === null &&
			productVersion === null &&
			versionStrings === null
		) {
			return null;
		}
		const values = {...(versionStrings || {})};
		if (fileVersion !== null) {
			values.FileVersion = fileVersion;
		}
		if (productVersion !== null) {
			values.ProductVersion = productVersion;
		}
		return values;
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
	 * Open implementation.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected async _open(applicationData: Readonly<Uint8Array>) {
		const {frameworkCleanHelpers} = this;

		const appBinaryPath = this.getAppBinaryPath();
		const appFrameworkPath = this.getAppFrameworkPath();

		const sdkBinaryPath = this.getSdkBinaryPath();
		const sdkFrameworkPath = this.getSdkFrameworkPath();

		const appBinaryPathFull = pathJoin(this.path, appBinaryPath);
		const appFrameworkPathFull = pathJoin(this.path, appFrameworkPath);

		let extractedBinary = false;
		let extractedFramework = false;

		let binaryInFrameworkPath = '';

		// Extract everything needed from the SDK.
		const sdk = await this._openSdk();
		await sdk.read(async entry => {
			// Ignore any resource forks.
			if (entry.type === PathType.RESOURCE_FORK) {
				return true;
			}
			const path = entry.volumePath;

			const sdkBinaryPathRel = pathRelativeBase(
				path,
				sdkBinaryPath,
				true
			);
			const frameworkPathRel = pathRelativeBase(
				path,
				sdkFrameworkPath,
				true
			);

			// Extract if the framework.
			if (frameworkPathRel !== null) {
				const dest = pathJoin(appFrameworkPathFull, frameworkPathRel);
				extractedFramework = true;

				// If also the binary, remember it for later.
				if (sdkBinaryPathRel === null) {
					await entry.extract(dest);
					return true;
				}

				// If not removing framework binary, copy into framework.
				// Remember where to copy again after.
				// Otherwise let it be extracted to destination below.
				if (!frameworkCleanHelpers) {
					// Remember the shortest path, not empty.
					binaryInFrameworkPath = binaryInFrameworkPath || dest;
					if (dest.length < binaryInFrameworkPath.length) {
						binaryInFrameworkPath = dest;
					}
					await entry.extract(dest);
					return true;
				}
			}

			// Copy binary from framework if there.
			if (sdkBinaryPathRel !== null) {
				const dest = pathJoin(appBinaryPathFull, sdkBinaryPathRel);
				await entry.extract(dest);
				extractedBinary = true;
				return true;
			}

			// Optimization to avoid walking unrelated directories if possible.
			return pathRelativeBaseMatch(sdkFrameworkPath, path, true) ||
				pathRelativeBaseMatch(sdkBinaryPath, path, true)
				? true
				: null;
		});

		// If the binary is in framework, copy it.
		if (binaryInFrameworkPath) {
			const st = await stat(binaryInFrameworkPath);
			await copyFile(binaryInFrameworkPath, appBinaryPathFull);
			await utimes(binaryInFrameworkPath, st.atime, st.mtime);
			extractedBinary = true;
		}

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
		await this._updateResources();
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
		return pathJoin(this.path, ...parts);
	}

	/**
	 * Get the configured architecture.
	 * Prefers the architecture option, descriptor file, then default of x86.
	 *
	 * @returns Architecture string.
	 */
	protected _getArchitecture() {
		return (
			this.architecture ||
			(this._applicationInfoArchitecture === '64' ? 'x64' : 'x86')
		);
	}

	/**
	 * Update main executable resources.
	 */
	protected async _updateResources() {
		// Get any version strings.
		const versionStrings = this.getVersionStrings();

		// Get all the icons.
		const applicationIcon = await this._encodeApplicationIcon();
		const fileTypeIcons = await this._encodeFileTypeIcons();

		// Assemble the icons into a list.
		const icons = [
			...(applicationIcon ? [applicationIcon] : []),
			...(fileTypeIcons || [])
		];

		// Skip if nothing to be changed.
		if (!versionStrings && !icons.length) {
			return;
		}

		// Parse EXE.
		const appBinaryPath = this.getAppBinaryPath();
		const appBinaryPathFull = pathJoin(this.path, appBinaryPath);
		const exe = NtExecutable.from(
			signatureSet(await readFile(appBinaryPathFull), null, true, true)
		);

		// Remove reloc so rsrc can safely be resized.
		const relocRestore = exeRemoveReloc(exe);

		// Remove rsrc to modify.
		exeAssertLastSection(exe, IDD_RESOURCE, '.rsrc');
		const rsrc = NtExecutableResource.from(exe);
		exe.setSectionByEntry(IDD_RESOURCE, null);

		// Check that icons and version info not present.
		if (Resource.IconGroupEntry.fromEntries(rsrc.entries).length) {
			throw new Error('Executable resources contains unexpected icons');
		}
		if (Resource.VersionInfo.fromEntries(rsrc.entries).length) {
			throw new Error(
				'Executable resources contains unexpected version info'
			);
		}

		// The lang and codepage resource values.
		const lang = 1033;
		const codepage = 1252;

		// Add icons, resource ID 100 plus.
		let resIdsNext = 100;
		for (const iconData of icons) {
			// Parse ico.
			const ico = Data.IconFile.from(iconData);

			// Get the next icon group ID.
			const iconGroupId = resIdsNext++;

			// Add this group to the list.
			Resource.IconGroupEntry.replaceIconsForResource(
				rsrc.entries,
				iconGroupId,
				0,
				ico.icons.map(icon => icon.data)
			);

			// List all the resources now in the list.
			const entriesById = new Map(
				rsrc.entries.map((resource, index) => [
					resource.id,
					{index, resource}
				])
			);

			// Get icon group info.
			const entryInfo = entriesById.get(iconGroupId);
			if (!entryInfo) {
				throw new Error('Internal error');
			}

			// Read icon group entry.
			const [iconGroup] = Resource.IconGroupEntry.fromEntries([
				entryInfo.resource
			]);

			// Change individual icon resource id values.
			for (const icon of iconGroup.icons) {
				const iconInfo = entriesById.get(icon.iconID);
				if (!iconInfo) {
					throw new Error('Internal error');
				}

				icon.iconID = iconInfo.resource.id = resIdsNext++;
			}

			// Update the group entry.
			rsrc.entries[entryInfo.index] = iconGroup.generateEntry();
		}

		// Add the version info if any.
		if (versionStrings) {
			const versionInfo = Resource.VersionInfo.createEmpty();
			versionInfo.setStringValues(
				{
					lang,
					codepage
				},
				versionStrings
			);

			// Update integer values from parsed strings if possible.
			const {FileVersion, ProductVersion} = versionStrings;
			if (FileVersion) {
				const uints = this._peVersionInts(FileVersion);
				if (uints) {
					const [ms, ls] = uints;
					versionInfo.fixedInfo.fileVersionMS = ms;
					versionInfo.fixedInfo.fileVersionLS = ls;
				}
			}
			if (ProductVersion) {
				const uints = this._peVersionInts(ProductVersion);
				if (uints) {
					const [ms, ls] = uints;
					versionInfo.fixedInfo.productVersionMS = ms;
					versionInfo.fixedInfo.productVersionLS = ls;
				}
			}

			versionInfo.outputToResourceEntries(rsrc.entries);
		}

		// Update the codepage on all resources, matches the official packager.
		for (const entry of rsrc.entries) {
			entry.codepage = codepage;
		}

		// Update resources.
		rsrc.outputResource(exe, false, true);

		// Add reloc back.
		relocRestore();

		// Update sizes.
		exeUpdateSizes(exe);

		// Write the EXE file.
		await writeFile(appBinaryPathFull, Buffer.from(exe.generate()));
	}

	/**
	 * Parse PE version string to integers (MS then LS bits) or null.
	 *
	 * @param version Version string.
	 * @returns Version integers ([MS, LS]) or null.
	 */
	protected _peVersionInts(version: string): [number, number] | null {
		const parts = version.split(/[.,]/);
		const numbers = [];
		for (const part of parts) {
			const n = /^\d+$/.test(part) ? +part : -1;
			if (n < 0 || n > 0xffff) {
				return null;
			}
			numbers.push(n);
		}
		return numbers.length
			? [
					// eslint-disable-next-line no-bitwise
					(((numbers[0] || 0) << 16) | (numbers[1] || 0)) >>> 0,
					// eslint-disable-next-line no-bitwise
					(((numbers[2] || 0) << 16) | (numbers[3] || 0)) >>> 0
			  ]
			: null;
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
	 * Encode the application icon if specified.
	 *
	 * @returns Encoded icon.
	 */
	protected async _encodeApplicationIcon() {
		const icon = this._getIcon();
		if (!icon || !this._uidIcon(icon)) {
			return null;
		}
		const modern = this.applicationIconModern;

		// Encode either a modern or a reference icon.
		return modern
			? this._encodeIconModern(icon)
			: this._encodeIconReference(icon);
	}

	/**
	 * Encode file type icons.
	 * Avoids writting duplicate icons where the file/data is the same.
	 *
	 * @returns Encoded icons.
	 */
	protected async _encodeFileTypeIcons() {
		const fileIcons = this._getFileTypes();
		if (!fileIcons) {
			return null;
		}
		const modern = this.fileTypeIconModern;

		const r = [];
		const did = new Set<string>();
		for (const [, {icon}] of fileIcons) {
			if (!icon) {
				continue;
			}

			// Compute a unique identifier for the used icon set paths.
			const uid = this._uidIcon(icon);
			if (!uid) {
				continue;
			}

			// Check if file was already generated for this icon set.
			if (did.has(uid)) {
				continue;
			}
			did.add(uid);

			// Write either a modern or a reference icon.
			r.push(
				// eslint-disable-next-line no-await-in-loop
				await (modern
					? this._encodeIconModern(icon)
					: this._encodeIconReference(icon))
			);
		}
		return r;
	}

	/**
	 * Encode icon matching official format.
	 *
	 * @param icon Icon info.
	 * @returns Encoded icon.
	 */
	protected async _encodeIconReference(icon: Readonly<IIcon>) {
		// Add icons in the same order official packager would use.
		const ico = new IconIco();
		for (const path of [
			icon.image16x16,
			icon.image48x48,
			icon.image128x128,
			icon.image32x32
		]) {
			if (!path) {
				continue;
			}

			// eslint-disable-next-line no-await-in-loop
			const data = await readFile(this._getResourcePath(path));
			// eslint-disable-next-line no-await-in-loop
			await ico.addFromPng(data, false);
		}
		return ico.encode();
	}

	/**
	 * Encode icon using modern format.
	 *
	 * @param icon Icon info.
	 * @returns Encoded icon.
	 */
	protected async _encodeIconModern(icon: Readonly<IIcon>) {
		// Add icons in the same order official packager would use, plus extra.
		const ico = new IconIco();
		for (const path of [
			icon.image16x16,
			icon.image48x48,
			icon.image128x128,
			icon.image32x32
		]) {
			if (!path) {
				continue;
			}

			// eslint-disable-next-line no-await-in-loop
			const data = await readFile(this._getResourcePath(path));
			// eslint-disable-next-line no-await-in-loop
			await ico.addFromPng(data, false);
		}

		// Add a 256x256 icon if possible.
		const icon256 = await this._getIcon256x256Data(icon);
		if (icon256) {
			// eslint-disable-next-line no-await-in-loop
			await ico.addFromPng(icon256, true);
		}
		return ico.encode();
	}

	/**
	 * Get 256x256 icon data from icon set.
	 * Unfortuantely the icon set does not support this icon size.
	 * This functions will resize a larger icon instead.
	 * Uses the lanczos algorithm to resize icon down.
	 *
	 * @param icon Icon info.
	 * @returns Encoded icon.
	 */
	protected async _getIcon256x256Data(icon: Readonly<IIcon>) {
		const {image512x512, image1024x1024} = icon;

		// Resize 512x512 icon down if available.
		if (image512x512) {
			const d = await readFile(this._getResourcePath(image512x512));
			return Buffer.from(toPng(resizeLanczos(fromPng(d), 256, 256)));
		}

		// Resize 1024x1024 icon down if available.
		// Do this in two half-res steps to minorly improve quality.
		if (image1024x1024) {
			const d = await readFile(this._getResourcePath(image1024x1024));
			return Buffer.from(
				toPng(
					resizeLanczos(resizeLanczos(fromPng(d), 512, 512), 256, 256)
				)
			);
		}

		// Otherwise no icon to resize down.
		return null;
	}
}
