import {Writable} from 'stream';

import fse from 'fs-extra';

import {
	Zipper,
	ZipperEntry
} from '../zipper';
import {
	IPackagerResourceOptions,
	Packager
} from '../packager';

/**
 * PackagerAir constructor.
 *
 * @param path Output path.
 */
export abstract class PackagerAir extends Packager {
	/**
	 * Zipper instance.
	 */
	protected _zipper: Zipper | null = null;

	/**
	 * Zipper hash entry to be updated.
	 */
	protected _zipperEntryHash: ZipperEntry | null = null;

	constructor(path: string) {
		super(path);
	}

	/**
	 * ZIP file Ux metadata user ID.
	 *
	 * @returns User ID.
	 */
	protected get _zipUxUid() {
		return 203;
	}

	/**
	 * ZIP file Ux metadata group ID.
	 *
	 * @returns Group ID.
	 */
	protected get _zipUxGid() {
		return 0;
	}

	/**
	 * ZIP file metadata create version number.
	 *
	 * @returns Version number.
	 */
	protected get _zipCreateVersion() {
		return 0x17;
	}

	/**
	 * ZIP file metadata create host OS.
	 *
	 * @returns OS ID.
	 */
	protected get _zipCreateHostOS() {
		return 3;
	}

	/**
	 * ZIP file internal attributes.
	 *
	 * @returns Internal attributes.
	 */
	protected get _zipInternalAttributes() {
		return 1;
	}

	/**
	 * ZIP file external attributes.
	 *
	 * @param executable Is the entry executable.
	 * @returns External attributes.
	 */
	protected _zipGetExternalAttributes(executable: boolean) {
		return executable ? 0x81ED0000 : 0x81A40000;
	}

	/**
	 * Create a Zipper instance.
	 *
	 * @param writable Writable stream.
	 * @returns Zipper instance.
	 */
	protected _createZipper(writable: Writable) {
		return new Zipper(writable);
	}

	/**
	 * Get the active Zipper.
	 *
	 * @returns Zipper instance.
	 */
	protected _activeZipper() {
		const r = this._zipper;
		if (!r) {
			throw new Error('Internal error');
		}
		return r;
	}

	/**
	 * Check if resource is compressable file.
	 *
	 * @param destination Resource destination.
	 * @returns Returne true if not a match for the excluded files.
	 */
	protected _isResourceCompressible(destination: string) {
		// Do not compress the following resources.
		return (
			destination !== this._metaResourceMimetypePath &&
			destination !== this._metaResourceHashPath
		);
	}

	/**
	 * Check if resource is hash file.
	 *
	 * @param destination Resource destination.
	 * @returns Returns true if match.
	 */
	protected _isResourceHash(destination: string) {
		return destination === this._metaResourceHashPath;
	}

	/**
	 * Open implementation.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected async _open(applicationData: Readonly<Buffer>) {
		await fse.ensureFile(this.path);
		this._zipper = this._createZipper(fse.createWriteStream(this.path));
	}

	/**
	 * Close implementation.
	 */
	protected async _close() {
		const zipper = this._activeZipper();
		await zipper.close();
		this._zipper = null;

		// Update the hash in the hash meta resource, if present.
		const hashEntry = this._zipperEntryHash;
		if (!hashEntry) {
			return;
		}
		this._zipperEntryHash = null;

		// First get the digest.
		const hashDigest = this._hasher.digest();

		// Get the offset of the local file header.
		const {headerOffsetLocal} = hashEntry;

		// Init entry with the hash data, no compression.
		await hashEntry.initData(hashDigest, false);

		// Encode the local file header.
		const localBuffer = hashEntry.getLocalBuffer();

		// Merge both the header and digest together.
		const data = Buffer.concat([localBuffer, hashDigest]);

		// Write that buffer at the offset.
		const fd = await fse.open(this.path, 'r+');
		try {
			await fse.write(fd, data, 0, data.length, headerOffsetLocal);
		}
		finally {
			await fse.close(fd);
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
		data: Readonly<Buffer>,
		options: Readonly<IPackagerResourceOptions>
	) {
		const zipper = this._activeZipper();
		const compressible = this._isResourceCompressible(destination);
		const hash = this._isResourceHash(destination);
		const mtime = options.mtime || new Date();

		const entry = zipper.createEntry();
		entry.path = destination;
		entry.createVersion = this._zipCreateVersion;
		entry.createHostOS = this._zipCreateHostOS;
		entry.internalAttributes = this._zipInternalAttributes;
		entry.externalAttributes = this._zipGetExternalAttributes(
			options.executable === true
		);
		entry.setDate(mtime);
		entry.addExtraFieldsExtendedTimestamp(mtime, mtime, null);
		entry.addExtraFieldsInfoZipUnix2(this._zipUxUid, this._zipUxGid);
		const entryData = await entry.initData(
			data,
			compressible ? null : false
		);
		await zipper.addEntry(entry, entryData);

		if (hash) {
			this._zipperEntryHash = entry;
		}
	}
}
