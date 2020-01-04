import {
	join as pathJoin
} from 'path';

import fse from 'fs-extra';
import * as resedit from 'resedit';
import * as rgbaImageCreateImage from '@rgba-image/create-image';
import * as rgbaImagePng from '@rgba-image/png';
import * as rgbaImageLanczos from '@rgba-image/lanczos';
import {
	PathType
} from '@shockpkg/archive-files';
import {
	IconIco
} from '@shockpkg/icon-encoder';

import {
	pathRelativeBaseMatch,
	pathRelativeBase,
	bufferToArrayBuffer
} from '../../util';
import {IPackagerResourceOptions} from '../../packager';
import {
	IIcon,
	PackagerBundle
} from '../bundle';

const ResEditNtExecutable =
	resedit.NtExecutable ||
	(resedit as any).default.NtExecutable;

const ResEditNtExecutableResource =
	resedit.NtExecutableResource ||
	(resedit as any).default.NtExecutableResource;

const ResEditResource =
	resedit.Resource ||
	(resedit as any).default.Resource;

const ResEditData =
	resedit.Data ||
	(resedit as any).default.Data;

const createImage =
	rgbaImageCreateImage.createImage ||
	(rgbaImageCreateImage as any).default.createImage;

const fromPng =
	rgbaImagePng.fromPng ||
	(rgbaImagePng as any).default.fromPng;

const toPng =
	rgbaImagePng.toPng ||
	(rgbaImagePng as any).default.toPng;

const lanczos =
	rgbaImageLanczos.lanczos ||
	(rgbaImageLanczos as any).default.lanczos;

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
 * PackagerBundleWindows constructor.
 *
 * @param path Output path.
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
	protected async _open(applicationData: Readonly<Buffer>) {
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

			const sdkBinaryPathRel =
				pathRelativeBase(path, sdkBinaryPath, true);
			const frameworkPathRel =
				pathRelativeBase(path, sdkFrameworkPath, true);

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
			return (
				pathRelativeBaseMatch(sdkFrameworkPath, path, true) ||
				pathRelativeBaseMatch(sdkBinaryPath, path, true)
			) ? true : null;
		});

		// If the binary is in framework, copy it.
		if (binaryInFrameworkPath) {
			await fse.copy(binaryInFrameworkPath, appBinaryPathFull, {
				preserveTimestamps: true
			});
			extractedBinary = true;
		}

		// Check that required components were extracted.
		if (!extractedBinary) {
			throw new Error(
				`Failed to locate binary in SDK: ${sdkBinaryPath}`
			);
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
		return this.architecture || (
			this._applicationInfoArchitecture === '64' ? 'x64' : 'x86'
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

		// Read EXE file and parse resources.
		const appBinaryPath = this.getAppBinaryPath();
		const appBinaryPathFull = pathJoin(this.path, appBinaryPath);
		const exe = ResEditNtExecutable.from(bufferToArrayBuffer(
			await fse.readFile(appBinaryPathFull)
		));
		const res = ResEditNtExecutableResource.from(exe);

		// Check that icons and version info not present.
		if (ResEditResource.IconGroupEntry.fromEntries(res.entries).length) {
			throw new Error('Executable resources contains unexpected icons');
		}
		if (ResEditResource.VersionInfo.fromEntries(res.entries).length) {
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
			const ico = ResEditData.IconFile.from(
				bufferToArrayBuffer(iconData)
			);

			// Get the next icon group ID.
			const iconGroupId = resIdsNext++;

			// Add this group to the list.
			ResEditResource.IconGroupEntry.replaceIconsForResource(
				res.entries,
				iconGroupId,
				0,
				ico.icons.map(icon => icon.data)
			);

			// List all the resources now in the list.
			const entriesById = new Map(res.entries.map((resource, index) => [
				resource.id,
				{index, resource}
			]));

			// Get icon group info.
			const entryInfo = entriesById.get(iconGroupId);
			if (!entryInfo) {
				throw new Error('Internal error');
			}

			// Read icon group entry.
			const [iconGroup] = ResEditResource.IconGroupEntry.fromEntries([
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
			res.entries[entryInfo.index] = iconGroup.generateEntry();
		}

		// Add the version info if any.
		if (versionStrings) {
			const versionInfo = ResEditResource.VersionInfo.createEmpty();
			versionInfo.setStringValues({
				lang,
				codepage
			}, versionStrings);
			versionInfo.outputToResourceEntries(res.entries);
		}

		// Update the codepage on all resources, matches the official packager.
		for (const entry of res.entries) {
			entry.codepage = codepage;
		}

		// Update resources and write EXE file.
		res.outputResource(exe);
		await fse.writeFile(appBinaryPathFull, Buffer.from(exe.generate()));
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
		return has ?
			paths.map(s => `${s ? s.length : 0}:${s || ''}`).join('|') :
			null;
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
		return modern ?
			this._encodeIconModern(icon) :
			this._encodeIconReference(icon);
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
			// eslint-disable-next-line no-await-in-loop
			r.push(await (modern ?
				this._encodeIconModern(icon) :
				this._encodeIconReference(icon)
			));
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
			const data = await fse.readFile(this._getResourcePath(path));
			ico.addFromPng(data, false);
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
			const data = await fse.readFile(this._getResourcePath(path));
			ico.addFromPng(data, false);
		}

		// Add a 256x256 icon if possible.
		const icon256 = await this._getIcon256x256Data(icon);
		if (icon256) {
			ico.addFromPng(icon256, true);
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
			const d = await fse.readFile(this._getResourcePath(image512x512));
			return Buffer.from(toPng(
				resizeLanczos(fromPng(d), 256, 256)
			));
		}

		// Resize 1024x1024 icon down if available.
		// Do this in two half-res steps to minorly improve quality.
		if (image1024x1024) {
			const d = await fse.readFile(this._getResourcePath(image1024x1024));
			return Buffer.from(toPng(
				resizeLanczos(resizeLanczos(fromPng(d), 512, 512), 256, 256)
			));
		}

		// Otherwise no icon to resize down.
		return null;
	}
}
