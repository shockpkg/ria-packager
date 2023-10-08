/* eslint-disable max-classes-per-file */

import {deflateRaw} from 'node:zlib';

import {crc32} from '@shockpkg/icon-encoder';

/**
 * Zipper write stream interface.
 * A subset of Writable.
 */
export interface IZipperWriteStream {
	/**
	 * Write data.
	 *
	 * @param data Data chunk.
	 * @param cb Callback function.
	 */
	write(data: Readonly<Uint8Array>, cb: (err: Error) => void): void;

	/**
	 * Write end.
	 *
	 * @param cb Callback function.
	 */
	end(cb: (err: Error) => void): void;
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
	public data: Uint8Array = new Uint8Array(0);

	/**
	 * Zipper Entry Extra Field constructor.
	 */
	constructor() {}

	/**
	 * Get the encode size.
	 *
	 * @returns Encode size.
	 */
	public sizeof() {
		return 4 + this.data.length;
	}

	/**
	 * Encode type and data as data.
	 *
	 * @returns Encoded data.
	 */
	public encode() {
		const {data, type} = this;
		const d = new Uint8Array(this.sizeof());
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		v.setUint16(0, type, true);
		v.setUint16(2, data.length, true);
		d.set(data, 4);
		return d;
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
		const d = local ? new Uint8Array(4) : new Uint8Array(0);
		if (local) {
			const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
			v.setUint16(0, uid, true);
			v.setUint16(2, gid, true);
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
		const times: number[] = [];
		[mtime, atime, ctime].forEach((v, i) => {
			if (v === null) {
				return;
			}

			// eslint-disable-next-line no-bitwise
			flags |= 1 << i;
			if (local || i) {
				times.push(
					typeof v === 'number' ? v : Math.round(v.getTime() / 1000)
				);
			}
		});

		const d = new Uint8Array(1 + times.length * 4);
		let i = 0;
		d[i++] = flags;
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		for (const time of times) {
			v.setUint32(i, time, true);
			i += 4;
		}

		// Type: 'UT'
		this.type = 0x5455;
		this.data = d;
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
	public path = new Uint8Array(0);

	/**
	 * Entry comment.
	 */
	public comment = new Uint8Array(0);

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
	 * Get the file record extra fields size.
	 *
	 * @returns Extra fields size.
	 */
	public sizeofExtraFieldsLocal() {
		let r = 0;
		for (const ef of this.extraFieldsLocal) {
			r += ef.sizeof();
		}
		return r;
	}

	/**
	 * Get the file record extra fields size.
	 *
	 * @returns Extra fields size.
	 */
	public sizeofLocal() {
		return 30 + this.path.length + this.sizeofExtraFieldsLocal();
	}

	/**
	 * Get the file record extra fields size.
	 *
	 * @returns Extra fields size.
	 */
	public sizeofExtraFieldsCentral() {
		let r = 0;
		for (const ef of this.extraFieldsCentral) {
			r += ef.sizeof();
		}
		return r;
	}

	/**
	 * Get the central record extra fields size.
	 *
	 * @returns Extra fields size.
	 */
	public sizeofCentral() {
		return (
			46 +
			this.path.length +
			this.comment.length +
			this.sizeofExtraFieldsCentral()
		);
	}

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
	 * Get local record data.
	 *
	 * @returns Local record data.
	 */
	public encodeLocal() {
		const {path, extraFieldsLocal} = this;

		const d = new Uint8Array(this.sizeofLocal());
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		let i = 0;

		v.setUint32(i, this.signatureLocal, true);
		i += 4;
		v.setUint8(i++, this.extractVersion);
		v.setUint8(i++, this.extractHostOS);
		v.setUint16(i, this.flags, true);
		i += 2;
		v.setUint16(i, this.compression, true);
		i += 2;
		v.setUint16(i, this.time, true);
		i += 2;
		v.setUint16(i, this.date, true);
		i += 2;
		v.setUint32(i, this.crc32, true);
		i += 4;
		v.setUint32(i, this.sizeCompressed, true);
		i += 4;
		v.setUint32(i, this.sizeUncompressed, true);
		i += 4;
		v.setUint16(i, path.length, true);
		i += 2;
		v.setUint16(i, this.sizeofExtraFieldsLocal(), true);
		i += 2;

		d.set(path, i);
		i += path.length;

		for (const ef of extraFieldsLocal) {
			const e = ef.encode();
			d.set(e, i);
			i += e.length;
		}
		return d;
	}

	/**
	 * Get central record data.
	 *
	 * @returns Central entry data.
	 */
	public encodeCentral() {
		const {path, comment, extraFieldsCentral} = this;
		const d = new Uint8Array(this.sizeofCentral());
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		let i = 0;

		v.setUint32(i, this.signatureCentral, true);
		i += 4;
		v.setUint8(i++, this.createVersion);
		v.setUint8(i++, this.createHostOS);
		v.setUint8(i++, this.extractVersion);
		v.setUint8(i++, this.extractHostOS);
		v.setUint16(i, this.flags, true);
		i += 2;
		v.setUint16(i, this.compression, true);
		i += 2;
		v.setUint16(i, this.time, true);
		i += 2;
		v.setUint16(i, this.date, true);
		i += 2;
		v.setUint32(i, this.crc32, true);
		i += 4;
		v.setUint32(i, this.sizeCompressed, true);
		i += 4;
		v.setUint32(i, this.sizeUncompressed, true);
		i += 4;
		v.setUint16(i, path.length, true);
		i += 2;
		v.setUint16(i, this.sizeofExtraFieldsCentral(), true);
		i += 2;
		v.setUint16(i, comment.length, true);
		i += 2;
		v.setUint16(i, this.diskNumberStart, true);
		i += 2;
		v.setUint16(i, this.internalAttributes, true);
		i += 2;
		v.setUint32(i, this.externalAttributes, true);
		i += 4;
		v.setUint32(i, this.headerOffsetLocal, true);
		i += 4;

		d.set(path, i);
		i += path.length;

		for (const ef of extraFieldsCentral) {
			const e = ef.encode();
			d.set(e, i);
			i += e.length;
		}

		d.set(comment, i);

		return d;
	}

	/**
	 * Setup data for entry.
	 *
	 * @param data Data for the entry.
	 * @param compress Compress option, true to force, false to disable.
	 * @returns Resulting data, or null if no data passed.
	 */
	public async initData(
		data: Readonly<Uint8Array> | null,
		compress: boolean | null = null
	) {
		this.compression = 0;
		this.crc32 = 0;
		this.sizeCompressed = 0;
		this.sizeUncompressed = 0;

		if (!data) {
			return null;
		}
		const crc32 = this._crc32(data);

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
	 * Calculate the CRC32 hash for data.
	 *
	 * @param data Data to be hashed.
	 * @returns CRC32 hash.
	 */
	protected _crc32(data: Readonly<Uint8Array>) {
		// eslint-disable-next-line no-bitwise
		return crc32(data) >>> 0;
	}

	/**
	 * Zlib deflate raw data.
	 *
	 * @param data Data to be compressed.
	 * @returns Compressed data.
	 */
	protected async _zlibDeflateRaw(data: Readonly<Uint8Array>) {
		return new Promise<Uint8Array>((resolve, reject) => {
			deflateRaw(data, (err, d) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(new Uint8Array(d.buffer, d.byteOffset, d.byteLength));
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
	public comment = new Uint8Array(0);

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
	protected readonly _output: IZipperWriteStream;

	/**
	 * Zipper constructor.
	 *
	 * @param output Writable stream.
	 */
	constructor(output: IZipperWriteStream) {
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
	 * Add Entry and any associated data.
	 *
	 * @param entry Entry object.
	 * @param data Data from the entry initData method.
	 */
	public async addEntry(
		entry: ZipperEntry,
		data: Readonly<Uint8Array> | null = null
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
		await this._writeOutput(entry.encodeLocal());
		if (data) {
			await this._writeOutput(data);
		}
	}

	/**
	 * Close stream.
	 */
	public async close() {
		const {_offset, entries, comment} = this;
		let size = 0;
		for (const e of entries) {
			const d = e.encodeCentral();
			// eslint-disable-next-line no-await-in-loop
			await this._writeOutput(d);
			size += d.length;
		}

		const d = new Uint8Array(22 + comment.length);
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		let i = 0;

		v.setUint32(i, this.signature, true);
		i += 4;
		v.setUint16(i, 0, true);
		i += 2;
		v.setUint16(i, 0, true);
		i += 2;
		v.setUint16(i, entries.length, true);
		i += 2;
		v.setUint16(i, entries.length, true);
		i += 2;
		v.setUint32(i, size, true);
		i += 4;
		v.setUint32(i, _offset, true);
		i += 4;
		v.setUint16(i, comment.length, true);
		i += 2;
		d.set(comment, i);

		await this._writeOutput(d);

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
	 * @param data Output data.
	 */
	protected async _writeOutput(data: Readonly<Uint8Array>) {
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
