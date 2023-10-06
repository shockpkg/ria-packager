/* eslint-disable max-classes-per-file */

import {Writable} from 'node:stream';
import {deflateRaw} from 'node:zlib';

import bufferCrc32 from 'buffer-crc32';

/**
 * Convert Date object or timestamp to DOS date and time values.
 *
 * @param date Data object or timestamp.
 * @returns Date and time values.
 */
function dateToDosTime(date: Readonly<Date> | number) {
	const d = typeof date === 'number' ? new Date(date * 1000) : date;
	return {
		date:
			// eslint-disable-next-line no-bitwise
			(d.getDate() & 0x1f) |
			// eslint-disable-next-line no-bitwise
			(((d.getMonth() + 1) & 0xf) << 5) |
			// eslint-disable-next-line no-bitwise
			(((d.getFullYear() - 1980) & 0x7f) << 9),
		time:
			// eslint-disable-next-line no-bitwise
			Math.floor(d.getSeconds() / 2) |
			// eslint-disable-next-line no-bitwise
			((d.getMinutes() & 0x3f) << 5) |
			// eslint-disable-next-line no-bitwise
			((d.getHours() & 0x1f) << 11)
	};
}

/**
 * Zipper Entry Extra Field object.
 */
export class ZipperEntryExtraField {
	/**
	 * Type ID.
	 */
	public type = 0;

	/**
	 * Data for the type.
	 */
	public data: Buffer | null = null;

	/**
	 * Zipper Entry Extra Field constructor.
	 */
	constructor() {}

	/**
	 * Encode type and data as buffer.
	 *
	 * @returns Buffer data.
	 */
	public toBuffer() {
		const {data} = this;
		const b = Buffer.alloc(4);
		b.writeUInt16LE(this.type, 0);
		if (data) {
			b.writeUInt16LE(data.length, 2);
		}
		return data ? Buffer.concat([b, data]) : b;
	}

	/**
	 * Init Info-ZIP UNIX type 2 data, local header.
	 *
	 * @param uid User ID.
	 * @param gid Group ID.
	 */
	public initInfoZipUnix2Local(uid = 0, gid = 0) {
		this._initInfoZipUnix2(true, uid, gid);
	}

	/**
	 * Init Info-ZIP UNIX type 2 data, central header.
	 *
	 * @param uid User ID.
	 * @param gid Group ID.
	 */
	public initInfoZipUnix2Central(uid = 0, gid = 0) {
		this._initInfoZipUnix2(false, uid, gid);
	}

	/**
	 * Init Extended Timestamp data, local header.
	 *
	 * @param mtime Modification time.
	 * @param atime Access time.
	 * @param ctime Creation time.
	 */
	public initExtendedTimestampLocal(
		mtime: Readonly<Date> | number | null = null,
		atime: Readonly<Date> | number | null = null,
		ctime: Readonly<Date> | number | null = null
	) {
		this._initExtendedTimestamp(true, mtime, atime, ctime);
	}

	/**
	 * Init Extended Timestamp data, central header.
	 *
	 * @param mtime Modification time.
	 * @param atime Access time.
	 * @param ctime Creation time.
	 */
	public initExtendedTimestampCentral(
		mtime: Readonly<Date> | number | null = null,
		atime: Readonly<Date> | number | null = null,
		ctime: Readonly<Date> | number | null = null
	) {
		this._initExtendedTimestamp(false, mtime, atime, ctime);
	}

	/**
	 * Init Info-ZIP UNIX type 2 data.
	 *
	 * @param local Local header or central.
	 * @param uid User ID.
	 * @param gid Group ID.
	 */
	protected _initInfoZipUnix2(local: boolean, uid: number, gid: number) {
		const d = local ? Buffer.alloc(4) : null;
		if (d) {
			d.writeUInt16LE(uid, 0);
			d.writeUInt16LE(gid, 2);
		}

		// Type: 'Ux'
		this.type = 0x7855;
		this.data = d;
	}

	/**
	 * Init Extended Timestamp data.
	 *
	 * @param local Local header or central.
	 * @param mtime Modification time.
	 * @param atime Access time.
	 * @param ctime Creation time.
	 */
	protected _initExtendedTimestamp(
		local: boolean,
		mtime: Readonly<Date> | number | null,
		atime: Readonly<Date> | number | null,
		ctime: Readonly<Date> | number | null
	) {
		let flags = 0;
		const flagsB = Buffer.alloc(1);
		const buffers = [flagsB];
		[mtime, atime, ctime].forEach((v, i) => {
			if (v === null) {
				return;
			}

			// eslint-disable-next-line no-bitwise
			flags |= 1 << i;
			if (!local && !i) {
				return;
			}

			const time =
				typeof v === 'number' ? v : Math.round(v.getTime() / 1000);
			const b = Buffer.alloc(4);
			b.writeUInt32LE(time, 0);
			buffers.push(b);
		});
		flagsB.writeUInt8(flags, 0);

		// Type: 'UT'
		this.type = 0x5455;
		this.data = Buffer.concat(buffers);
	}
}

/**
 * Zipper Entry object.
 */
export class ZipperEntry {
	/**
	 * Tag signature, local header.
	 */
	public signatureLocal = 0x4034b50;

	/**
	 * Tag signature, central header.
	 */
	public signatureCentral = 0x2014b50;

	/**
	 * Extract version.
	 */
	public extractVersion = 0x14;

	/**
	 * Extract host OS.
	 */
	public extractHostOS = 0;

	/**
	 * Create version.
	 */
	public createVersion = 0x14;

	/**
	 * Create host OS.
	 */
	public createHostOS = 0;

	/**
	 * Extract flags.
	 */
	public flags = 0;

	/**
	 * Compression type.
	 */
	public compression = 0;

	/**
	 * DOS time.
	 */
	public time = 0;

	/**
	 * DOS date.
	 */
	public date = 0;

	/**
	 * Data CRC32.
	 */
	public crc32 = 0;

	/**
	 * Size compressed.
	 */
	public sizeCompressed = 0;

	/**
	 * Size uncompressed.
	 */
	public sizeUncompressed = 0;

	/**
	 * Disk number start.
	 */
	public diskNumberStart = 0;

	/**
	 * Internal attributes.
	 */
	public internalAttributes = 0;

	/**
	 * External attributes.
	 */
	public externalAttributes = 0;

	/**
	 * Header offset, local header.
	 */
	public headerOffsetLocal = 0;

	/**
	 * Entry path.
	 */
	public path = '';

	/**
	 * Entry comment.
	 */
	public comment = '';

	/**
	 * Extra fields, local header.
	 */
	public extraFieldsLocal: ZipperEntryExtraField[] = [];

	/**
	 * Extra fields, central header.
	 */
	public extraFieldsCentral: ZipperEntryExtraField[] = [];

	/**
	 * Zipper Entry constructor.
	 */
	constructor() {}

	/**
	 * Create new ZipperEntryExtraField object.
	 *
	 * @returns ZipperEntryExtraField object.
	 */
	public createExtraField() {
		return new ZipperEntryExtraField();
	}

	/**
	 * Set date from a date object or timestamp.
	 *
	 * @param date Date object or timestamp.
	 */
	public setDate(date: Readonly<Date> | number) {
		const dosTime = this._dateToDosTime(date);
		this.date = dosTime.date;
		this.time = dosTime.time;
	}

	/**
	 * Get path as data.
	 *
	 * @returns Path as data buffer.
	 */
	public getPathBuffer() {
		return Buffer.from(this.path, 'utf8');
	}

	/**
	 * Get comment as data.
	 *
	 * @returns Comment as data buffer.
	 */
	public getCommentBuffer() {
		return Buffer.from(this.comment, 'utf8');
	}

	/**
	 * Get the file record extra fields as data.
	 *
	 * @returns Extra fields as data.
	 */
	public getExtraFieldsLocalBuffer() {
		return Buffer.concat(this.extraFieldsLocal.map(e => e.toBuffer()));
	}

	/**
	 * Get the director entry extra fields as data.
	 *
	 * @returns Extra fields as data.
	 */
	public getExtraFieldsCentralBuffer() {
		return Buffer.concat(this.extraFieldsCentral.map(e => e.toBuffer()));
	}

	/**
	 * Get file record data.
	 *
	 * @returns File record data.
	 */
	public getLocalBuffer() {
		const pathBuffer = this.getPathBuffer();
		const extraFieldsBuffer = this.getExtraFieldsLocalBuffer();

		const head = Buffer.alloc(30);
		head.writeUInt32LE(this.signatureLocal, 0);
		head.writeUInt8(this.extractVersion, 4);
		head.writeUInt8(this.extractHostOS, 5);
		head.writeUInt16LE(this.flags, 6);
		head.writeUInt16LE(this.compression, 8);
		head.writeUInt16LE(this.time, 10);
		head.writeUInt16LE(this.date, 12);
		head.writeUInt32LE(this.crc32, 14);
		head.writeUInt32LE(this.sizeCompressed, 18);
		head.writeUInt32LE(this.sizeUncompressed, 22);
		head.writeUInt16LE(pathBuffer.length, 26);
		head.writeUInt16LE(extraFieldsBuffer.length, 28);

		return Buffer.concat([head, pathBuffer, extraFieldsBuffer]);
	}

	/**
	 * Get directory entry data.
	 *
	 * @returns Directory entry data.
	 */
	public getCentralBuffer() {
		const pathBuffer = this.getPathBuffer();
		const extraFieldsBuffer = this.getExtraFieldsCentralBuffer();
		const commentBuffer = this.getCommentBuffer();

		const head = Buffer.alloc(46);
		head.writeUInt32LE(this.signatureCentral, 0);
		head.writeUInt8(this.createVersion, 4);
		head.writeUInt8(this.createHostOS, 5);
		head.writeUInt8(this.extractVersion, 6);
		head.writeUInt8(this.extractHostOS, 7);
		head.writeUInt16LE(this.flags, 8);
		head.writeUInt16LE(this.compression, 10);
		head.writeUInt16LE(this.time, 12);
		head.writeUInt16LE(this.date, 14);
		head.writeUInt32LE(this.crc32, 16);
		head.writeUInt32LE(this.sizeCompressed, 20);
		head.writeUInt32LE(this.sizeUncompressed, 24);
		head.writeUInt16LE(pathBuffer.length, 28);
		head.writeUInt16LE(extraFieldsBuffer.length, 30);
		head.writeUInt16LE(commentBuffer.length, 32);
		head.writeUInt16LE(this.diskNumberStart, 34);
		head.writeUInt16LE(this.internalAttributes, 36);
		head.writeUInt32LE(this.externalAttributes, 38);
		head.writeUInt32LE(this.headerOffsetLocal, 42);

		return Buffer.concat([
			head,
			pathBuffer,
			extraFieldsBuffer,
			commentBuffer
		]);
	}

	/**
	 * Setup data for entry.
	 *
	 * @param data Data for the entry.
	 * @param compress Compress option, true to force, false to disable.
	 * @returns Resulting data, or null if no data passed.
	 */
	public async initData(
		data: Readonly<Buffer> | null,
		compress: boolean | null = null
	) {
		this.compression = 0;
		this.crc32 = 0;
		this.sizeCompressed = 0;
		this.sizeUncompressed = 0;

		if (!data) {
			return null;
		}
		const crc32 = this._bufferCrc32(data);

		if (compress === false) {
			this.crc32 = crc32;
			this.sizeCompressed = this.sizeUncompressed = data.length;
			this.compression = 0;
			return data;
		}

		if (compress === true) {
			const comp = await this._zlibDeflateRaw(data);
			this.crc32 = crc32;
			this.sizeUncompressed = data.length;
			this.sizeCompressed = comp.length;
			this.compression = 8;
			return comp;
		}

		const comp = await this._zlibDeflateRaw(data);
		const r = comp.length < data.length ? comp : data;
		this.crc32 = crc32;
		this.sizeUncompressed = data.length;
		this.sizeCompressed = r.length;
		this.compression = r === data ? 0 : 8;
		return r;
	}

	/**
	 * Add extra fields for Extended Timestamp.
	 *
	 * @param mtime Modification time.
	 * @param atime Access time.
	 * @param ctime Creation time.
	 */
	public addExtraFieldsExtendedTimestamp(
		mtime: Readonly<Date> | number | null = null,
		atime: Readonly<Date> | number | null = null,
		ctime: Readonly<Date> | number | null = null
	) {
		const efl = this.createExtraField();
		efl.initExtendedTimestampLocal(mtime, atime, ctime);
		this.extraFieldsLocal.push(efl);

		const efc = this.createExtraField();
		efc.initExtendedTimestampCentral(mtime, atime, ctime);
		this.extraFieldsCentral.push(efc);
	}

	/**
	 * Add extra fields for Info-ZIP UNIX type 2.
	 *
	 * @param uid User ID.
	 * @param gid Group ID.
	 */
	public addExtraFieldsInfoZipUnix2(uid = 0, gid = 0) {
		const efl = this.createExtraField();
		efl.initInfoZipUnix2Local(uid, gid);
		this.extraFieldsLocal.push(efl);

		const efc = this.createExtraField();
		efc.initInfoZipUnix2Central(uid, gid);
		this.extraFieldsCentral.push(efc);
	}

	/**
	 * Convert date from a date object or timestamp.
	 *
	 * @param date Date object or timestamp.
	 * @returns DOS time.
	 */
	protected _dateToDosTime(date: Readonly<Date> | number) {
		return dateToDosTime(date);
	}

	/**
	 * Calculate the CRC32 hash for data.
	 *
	 * @param data Data to be hashed.
	 * @returns CRC32 hash.
	 */
	protected _bufferCrc32(data: Readonly<Buffer>) {
		// Cast to number to ensure no dependency on library types.
		return bufferCrc32.unsigned(data) as unknown as number;
	}

	/**
	 * Zlib deflate raw data.
	 *
	 * @param data Data to be compressed.
	 * @returns Compressed data.
	 */
	protected async _zlibDeflateRaw(data: Readonly<Buffer>) {
		return new Promise<Buffer>((resolve, reject) => {
			deflateRaw(data, (err, comp) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(comp);
			});
		});
	}
}

/**
 * Zipper, a low-level ZIP file writter.
 */
export class Zipper {
	/**
	 * Tag signature.
	 */
	public signature = 0x6054b50;

	/**
	 * Archive comment.
	 */
	public comment = '';

	/**
	 * Added entries.
	 */
	public entries: ZipperEntry[] = [];

	/**
	 * Current offset.
	 */
	protected _offset = 0;

	/**
	 * Output stream.
	 */
	protected readonly _output: Writable;

	/**
	 * Zipper constructor.
	 *
	 * @param output Writable stream.
	 */
	constructor(output: Writable) {
		this._output = output;
	}

	/**
	 * Create new ZipperEntry object.
	 *
	 * @returns ZipperEntry object.
	 */
	public createEntry() {
		return new ZipperEntry();
	}

	/**
	 * Get comment as data.
	 *
	 * @returns Comment data.
	 */
	public getCommentBuffer() {
		return Buffer.from(this.comment, 'utf8');
	}

	/**
	 * Get directory buffer data.
	 *
	 * @returns Directory data.
	 */
	public getDirectoryBuffer() {
		const {_offset, entries} = this;
		const directoryData = Buffer.concat(
			entries.map(e => e.getCentralBuffer())
		);
		const commentBuffer = this.getCommentBuffer();

		const end = Buffer.alloc(22);
		end.writeUInt32LE(this.signature, 0);
		end.writeUInt16LE(0, 4);
		end.writeUInt16LE(0, 6);
		end.writeUInt16LE(entries.length, 8);
		end.writeUInt16LE(entries.length, 10);
		end.writeUInt32LE(directoryData.length, 12);
		end.writeUInt32LE(_offset, 16);
		end.writeUInt16LE(commentBuffer.length, 20);

		return Buffer.concat([directoryData, end, commentBuffer]);
	}

	/**
	 * Add Entry and any associated data.
	 *
	 * @param entry Entry object.
	 * @param data Data from the entry initData method.
	 */
	public async addEntry(
		entry: ZipperEntry,
		data: Readonly<Buffer> | null = null
	) {
		const {_offset} = this;
		const {sizeCompressed} = entry;
		if (data) {
			if (data.length !== sizeCompressed) {
				throw new Error('Data length and compressed size must match');
			}
		} else if (sizeCompressed) {
			throw new Error('Data required when compressed size not zero');
		}
		entry.headerOffsetLocal = _offset;
		this.entries.push(entry);
		await this._writeOutput(entry.getLocalBuffer());
		if (data) {
			await this._writeOutput(data);
		}
	}

	/**
	 * Close stream.
	 */
	public async close() {
		await this._writeOutput(this.getDirectoryBuffer());
		await new Promise<void>((resolve, reject) => {
			this._output.end((err: Error) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	/**
	 * Write data buffer to output stream.
	 *
	 * @param data Data buffer.
	 */
	protected async _writeOutput(data: Readonly<Buffer>) {
		await new Promise<void>((resolve, reject) => {
			this._output.write(data, err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
		this._offset += data.length;
	}
}
