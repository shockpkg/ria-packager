import {lstat, readFile, stat} from 'node:fs/promises';
import {join as pathJoin, basename} from 'node:path';

import {
	ArchiveDir,
	ArchiveHdi,
	createArchiveByFileExtension,
	fsWalk,
	pathNormalize
} from '@shockpkg/archive-files';

import {SecurityKeystore} from './security/keystore';
import {Signature} from './signature';
import {Hasher} from './hasher';
import {HasherSha256} from './hasher/sha256';

/**
 * Options for adding resources.
 */
export interface IPackagerResourceOptions {
	/**
	 * Mark file as executable.
	 */
	executable?: boolean | null;

	/**
	 * Specific file modification time.
	 */
	mtime?: Date | null;
}

/**
 * Packager object.
 */
export abstract class Packager {
	/**
	 * Make a debug build.
	 */
	public debug = false;

	/**
	 * Keystore object to use for signing.
	 */
	public keystore: Readonly<SecurityKeystore> | null = null;

	/**
	 * Timestamp URL.
	 */
	public timestampUrl: string | null = null;

	/**
	 * File and directory names to exclude when added a directory.
	 */
	public excludes = [/^\./, /^ehthumbs\.db$/, /^Thumbs\.db$/];

	/**
	 * Output path.
	 */
	public readonly path: string;

	/**
	 * Open flag.
	 */
	protected _isOpen = false;

	/**
	 * Adding a resource flag.
	 */
	protected _isAddingResource = false;

	/**
	 * Hasher object.
	 */
	protected _hasher: Hasher;

	/**
	 * Signature object.
	 */
	protected _signature: Signature | null = null;

	/**
	 * Packager constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		this._hasher = this._createHasher();

		this.path = path;
	}

	/**
	 * Check if output open.
	 *
	 * @returns Returns true if open, else false.
	 */
	public get isOpen() {
		return this._isOpen;
	}

	/**
	 * Open with application descriptor XML data.
	 *
	 * @param applicationData XML data.
	 */
	public async open(applicationData: Readonly<Uint8Array>) {
		if (this._isOpen) {
			throw new Error('Already open');
		}
		this._applicationInfoInit(applicationData);
		await this._open(applicationData);
		this._isOpen = true;

		this._hasher.reset();

		this._signature = null;
		if (this.signed) {
			this._signature = this._createSignature();
			this._signature.timestampUrl = this.timestampUrl;

			const keystore = this._getKeystore();
			this._signature.certificate = keystore.getCertificate();
			this._signature.privateKey = keystore.getPrivateKey();
		}

		await this._addMetaResourcesStart(applicationData);
	}

	/**
	 * Open with application descriptor file.
	 *
	 * @param descriptorFile Application descriptor file.
	 */
	public async openFile(descriptorFile: string) {
		const applicationData = await readFile(descriptorFile);
		await this.open(applicationData);
	}

	/**
	 * Close output.
	 */
	public async close() {
		if (!this._isOpen) {
			throw new Error('Not open');
		}
		await this._addMetaResourcesEnd();
		await this._close();
		this._isOpen = false;
		this._applicationInfoClear();

		this._hasher.reset();
		this._signature = null;
	}

	/**
	 * Run asyncronous function with automatic open and close.
	 *
	 * @param applicationData XML data.
	 * @param func Async function.
	 * @returns Return value of the async function.
	 */
	public async with<T>(
		applicationData: Readonly<Uint8Array>,
		func: (self: this) => Promise<T>
	): Promise<T> {
		await this.open(applicationData);
		let r: T;
		try {
			r = (await func.call(this, this)) as T;
		} finally {
			await this.close();
		}
		return r;
	}

	/**
	 * Run asyncronous function with automatic open and close.
	 *
	 * @param descriptorFile Application descriptor file.
	 * @param func Async function.
	 * @returns Return value of the async function.
	 */
	public async withFile<T>(
		descriptorFile: string,
		func: (self: this) => Promise<T>
	): Promise<T> {
		await this.openFile(descriptorFile);
		let r: T;
		try {
			r = (await func.call(this, this)) as T;
		} finally {
			await this.close();
		}
		return r;
	}

	/**
	 * Check if name is excluded file.
	 *
	 * @param name File name.
	 * @returns Returns true if excluded, else false.
	 */
	public isExcludedFile(name: string) {
		for (const exclude of this.excludes) {
			if (exclude.test(name)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Add resource with file.
	 *
	 * @param source File path.
	 * @param destination Packaged file relative destination.
	 * @param options Resource options.
	 */
	public async addResourceFile(
		source: string,
		destination: string | null = null,
		options: Readonly<IPackagerResourceOptions> | null = null
	) {
		const opts = options || {};
		const dest = destination === null ? source : destination;
		const stat = await lstat(source);

		// Symlinks would only be allowed in a macOS native extension.
		// Throw an error like the official packager does.
		if (stat.isSymbolicLink()) {
			throw new Error(`Cannot add symlink: ${source}`);
		}

		// Throw if not a regular file.
		if (!stat.isFile()) {
			throw new Error(`Unsupported file type: ${source}`);
		}

		let {executable} = opts;
		if (executable !== true && executable !== false) {
			// eslint-disable-next-line no-bitwise
			executable = !!(stat.mode & 0b001000000);
		}

		const data = await readFile(source);
		await this.addResource(dest, data, {
			executable,
			mtime: opts.mtime || stat.mtime
		});
	}

	/**
	 * Add resource with directory.
	 * Walks the directory looking for files to add, skips excluded file names.
	 *
	 * @param source Directory path.
	 * @param destination Packaged directory relative destination.
	 * @param options Resource options.
	 */
	public async addResourceDirectory(
		source: string,
		destination: string | null = null,
		options: Readonly<IPackagerResourceOptions> | null = null
	) {
		const dest = destination === null ? source : destination;

		await fsWalk(source, async (path, stat) => {
			// If this name is excluded, skip without descending.
			if (this.isExcludedFile(basename(path))) {
				return false;
			}

			// Ignore directories, but descend into them.
			// Only files are listed in the ZIP packages.
			// Created automatically for files in any other package.
			if (stat.isDirectory()) {
				return true;
			}

			// Anything else assume file.
			await this.addResourceFile(
				pathJoin(source, path),
				pathJoin(dest, path),
				options
			);

			return true;
		});
	}

	/**
	 * Add resource with data.
	 *
	 * @param destination Packaged file relative destination.
	 * @param data Resource data.
	 * @param options Resource options.
	 */
	public async addResource(
		destination: string,
		data: Readonly<Uint8Array>,
		options: Readonly<IPackagerResourceOptions> | null = null
	) {
		if (!this._isOpen) {
			throw new Error('Not open');
		}
		if (this._isAddingResource) {
			throw new Error('Resources must be added sequentially');
		}
		this._isAddingResource = true;
		await this._addResource(
			pathNormalize(destination),
			data,
			options || {},
			true,
			true
		);
		this._isAddingResource = false;
	}

	/**
	 * Create Hasher object.
	 *
	 * @returns Hasher object.
	 */
	protected _createHasher(): Hasher {
		return new HasherSha256();
	}

	/**
	 * Create Signature object.
	 *
	 * @returns Hasher object.
	 */
	protected _createSignature() {
		return new Signature();
	}

	/**
	 * Path of the mimetype meta resource.
	 *
	 * @returns Resource path.
	 */
	protected get _metaResourceMimetypePath() {
		return 'mimetype';
	}

	/**
	 * Path of the application meta resource.
	 *
	 * @returns Resource path.
	 */
	protected get _metaResourceApplicationPath() {
		return 'META-INF/AIR/application.xml';
	}

	/**
	 * Path of the hash meta resource.
	 *
	 * @returns Resource path.
	 */
	protected get _metaResourceHashPath() {
		return 'META-INF/AIR/hash';
	}

	/**
	 * Path of the debug meta resource.
	 *
	 * @returns Resource path.
	 */
	protected get _metaResourceDebugPath() {
		return 'META-INF/AIR/debug';
	}

	/**
	 * Path of the signatures meta resource.
	 *
	 * @returns Resource path.
	 */
	protected get _metaResourceSignaturesPath() {
		return 'META-INF/signatures.xml';
	}

	/**
	 * Get encoded mimetype data.
	 *
	 * @returns Mimetype buffer.
	 */
	protected _getMimetypeData() {
		// The mimetype is UTF-8.
		return new TextEncoder().encode(this.mimetype);
	}

	/**
	 * Get the keystore object.
	 *
	 * @returns Keystore object.
	 */
	protected _getKeystore() {
		const r = this.keystore;
		if (!r) {
			throw new Error('A keystore not set');
		}
		return r;
	}

	/**
	 * Add resource with data, with options controlling hashing and signing.
	 *
	 * @param destination Packaged file relative destination.
	 * @param data Resource data.
	 * @param options Resource options.
	 * @param hashed This file is hashed.
	 * @param signed This file is signed.
	 */
	protected async _addResource(
		destination: string,
		data: Readonly<Uint8Array>,
		options: Readonly<IPackagerResourceOptions>,
		hashed: boolean,
		signed: boolean
	) {
		if (hashed) {
			this._hasher.update(data);
		}
		if (signed) {
			const signature = this._signature;
			if (signature) {
				signature.addFile(destination, data);
			}
		}
		await this._writeResource(destination, data, options);
	}

	/**
	 * Add meta resources start.
	 *
	 * @param applicationData XML data.
	 */
	protected async _addMetaResourcesStart(
		applicationData: Readonly<Uint8Array>
	) {
		await this._addMetaResourceMimetype();
		await this._addMetaResourceApplication(applicationData);
		await this._addMetaResourceHash();
		if (this.debug) {
			await this._addMetaResourceDebug();
		}
	}

	/**
	 * Add meta resources end.
	 */
	protected async _addMetaResourcesEnd() {
		if (this.signed) {
			await this._addMetaResourceSignatures();
		}
	}

	/**
	 * Add meta resource for the mimetype.
	 */
	protected async _addMetaResourceMimetype() {
		const path = this._metaResourceMimetypePath;
		const data = this._getMimetypeData();
		await this._addResource(path, data, {}, true, true);
	}

	/**
	 * Add meta resource for the application descriptor.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected async _addMetaResourceApplication(
		applicationData: Readonly<Uint8Array>
	) {
		const path = this._metaResourceApplicationPath;
		await this._addResource(path, applicationData, {}, true, true);
	}

	/**
	 * Add meta resource for the hash (needs updating on close).
	 */
	protected async _addMetaResourceHash() {
		const path = this._metaResourceHashPath;
		const data = new Uint8Array(this._hasher.bytes);
		await this._addResource(path, data, {}, false, false);
	}

	/**
	 * Add meta resource for debug.
	 */
	protected async _addMetaResourceDebug() {
		const path = this._metaResourceDebugPath;
		const data = new Uint8Array(0);
		await this._addResource(path, data, {}, true, true);
	}

	/**
	 * Add resource for signatures.
	 */
	protected async _addMetaResourceSignatures() {
		const path = this._metaResourceSignaturesPath;
		const signature = this._signature;
		if (!signature) {
			throw new Error('Internal error');
		}

		signature.digest();
		signature.sign();
		if (signature.timestampUrl) {
			await signature.timestamp();
		}

		const data = signature.encode();
		await this._addResource(path, data, {}, false, false);
	}

	/**
	 * Init application info from descriptor data.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected _applicationInfoInit(applicationData: Readonly<Uint8Array>) {
		// Do nothing.
	}

	/**
	 * Clear application info from descriptor data.
	 */
	protected _applicationInfoClear() {
		// Do nothing.
	}

	/**
	 * Open path as archive.
	 *
	 * @param path Archive path.
	 * @returns Archive instance.
	 */
	protected async _openArchive(path: string) {
		const st = await stat(path);
		if (st.isDirectory()) {
			return new ArchiveDir(path);
		}
		const archive = createArchiveByFileExtension(path);
		if (!archive) {
			throw new Error(`Unrecognized archive format: ${path}`);
		}
		if (archive instanceof ArchiveHdi) {
			archive.nobrowse = true;
		}
		return archive;
	}

	/**
	 * Package mimetype.
	 *
	 * @returns Mimetype string.
	 */
	public abstract get mimetype(): string;

	/**
	 * Package signed.
	 *
	 * @returns Boolean for if package is signed or not.
	 */
	public abstract get signed(): boolean;

	/**
	 * Open implementation.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected abstract _open(
		applicationData: Readonly<Uint8Array>
	): Promise<void>;

	/**
	 * Close implementation.
	 */
	protected abstract _close(): Promise<void>;

	/**
	 * Write resource with data implementation.
	 *
	 * @param destination Packaged file relative destination.
	 * @param data Resource data.
	 * @param options Resource options.
	 */
	protected abstract _writeResource(
		destination: string,
		data: Readonly<Uint8Array>,
		options: Readonly<IPackagerResourceOptions>
	): Promise<void>;
}
