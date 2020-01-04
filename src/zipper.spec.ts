import {
	Writable
} from 'stream';

import {
	Zipper
} from './zipper';

class BufferCollector extends Writable {
	protected _offset = 0;

	protected _buffered: Buffer[] = [];

	// eslint-disable-next-line @typescript-eslint/member-naming
	public _write(
		chunk: any,
		encoding: string,
		callback: (error?: Error | null) => void
	) {
		// Should always be buffer.
		if (!Buffer.isBuffer(chunk)) {
			throw new Error('Expected a buffer chunk');
		}

		// Simulate a delay in writting data.
		setImmediate(() => {
			setImmediate(() => {
				setImmediate(() => {
					setImmediate(() => {
						this._buffered.push(chunk);
						callback();
					});
				});
			});
		});
	}

	public flushBuffer() {
		const buffered = this._buffered;
		this._buffered = [];
		const buffer = Buffer.concat(buffered);
		const offset = this._offset;
		this._offset += buffer.length;
		return {
			offset,
			buffer
		};
	}
}

function bufferHex(data: Buffer) {
	return data.toString('hex').split('')
		.map((v, i) => (i && (i % 2) === 0 ? ` ${v}` : v))
		.join('')
		.toUpperCase();
}

describe('zipper', () => {
	describe('Zipper', () => {
		it('stream writting', async () => {
			const out = new BufferCollector();
			const zipper = new Zipper(out);
			zipper.comment = 'archive comment';

			{
				const entry = zipper.createEntry();

				const data = await entry.initData(Buffer.from('aaaaaaaaaaaa'));
				await zipper.addEntry(entry, data);

				const {buffer, offset} = out.flushBuffer();
				const hex = bufferHex(buffer);
				expect(hex).toBe([
					'50 4B 03 04 14 00 00 00 08 00 00 00 00 00 76 0A',
					'E3 F6 05 00 00 00 0C 00 00 00 00 00 00 00 4B 4C',
					'44 00 00'
				].join(' '));
				expect(offset).toBe(0);
			}

			{
				const date = new Date('2019-12-25 12:34:56 UTC');

				const entry = zipper.createEntry();
				entry.path = 'b/b/b.txt';
				entry.comment = 'comment b';
				entry.setDate(date);

				entry.extractVersion = 0x12;
				entry.extractHostOS = 0x34;
				entry.createVersion = 0x56;
				entry.createHostOS = 0x78;
				entry.flags = 0x9ABC;
				entry.internalAttributes = 0xABCD;
				entry.externalAttributes = 0xFECDBA98;

				entry.addExtraFieldsExtendedTimestamp(date);
				entry.addExtraFieldsInfoZipUnix2(1234, 5678);

				const data = await entry.initData(
					Buffer.from('b'),
					true
				);
				await zipper.addEntry(entry, data);

				const {buffer, offset} = out.flushBuffer();
				const hex = bufferHex(buffer);
				expect(hex).toBe([
					'50 4B 03 04 12 34 BC 9A 08 00 5C 3C 99 4F F9 EF',
					'BE 71 03 00 00 00 01 00 00 00 09 00 11 00 62 2F',
					'62 2F 62 2E 74 78 74 55 54 05 00 01 70 57 03 5E',
					'55 78 04 00 D2 04 2E 16 4B 02 00'
				].join(' '));
				expect(offset).toBe(35);
			}

			{
				const entry = zipper.createEntry();
				entry.path = 'c/c/c.txt';

				entry.addExtraFieldsExtendedTimestamp();
				entry.addExtraFieldsInfoZipUnix2();

				entry.extraFieldsLocal.push(entry.createExtraField());
				entry.extraFieldsCentral.push(entry.createExtraField());

				const exL = entry.createExtraField();
				exL.type = 0xFFFF;
				exL.data = Buffer.from('local');
				entry.extraFieldsLocal.push(exL);

				const exC = entry.createExtraField();
				exC.type = 0xFFFF;
				exC.data = Buffer.from('central');
				entry.extraFieldsCentral.push(exC);

				const data = await entry.initData(
					Buffer.from('cccccccccccc'),
					false
				);
				await zipper.addEntry(entry, data);

				const {buffer, offset} = out.flushBuffer();
				const hex = bufferHex(buffer);
				expect(hex).toBe([
					'50 4B 03 04 14 00 00 00 00 00 00 00 00 00 E7 2E',
					'B0 FF 0C 00 00 00 0C 00 00 00 09 00 1A 00 63 2F',
					'63 2F 63 2E 74 78 74 55 54 01 00 00 55 78 04 00',
					'00 00 00 00 00 00 00 00 FF FF 05 00 6C 6F 63 61',
					'6C 63 63 63 63 63 63 63 63 63 63 63 63'
				].join(' '));
				expect(offset).toBe(94);
			}

			await zipper.close();

			const {buffer, offset} = out.flushBuffer();
			const hex = bufferHex(buffer);
			expect(hex).toBe([
				'50 4B 01 02 14 00 14 00 00 00 08 00 00 00 00 00',
				'76 0A E3 F6 05 00 00 00 0C 00 00 00 00 00 00 00',
				'00 00 00 00 00 00 00 00 00 00 00 00 00 00 50 4B',
				'01 02 56 78 12 34 BC 9A 08 00 5C 3C 99 4F F9 EF',
				'BE 71 03 00 00 00 01 00 00 00 09 00 09 00 09 00',
				'00 00 CD AB 98 BA CD FE 23 00 00 00 62 2F 62 2F',
				'62 2E 74 78 74 55 54 01 00 01 55 78 00 00 63 6F',
				'6D 6D 65 6E 74 20 62 50 4B 01 02 14 00 14 00 00',
				'00 00 00 00 00 00 00 E7 2E B0 FF 0C 00 00 00 0C',
				'00 00 00 09 00 18 00 00 00 00 00 00 00 00 00 00',
				'00 5E 00 00 00 63 2F 63 2F 63 2E 74 78 74 55 54',
				'01 00 00 55 78 00 00 00 00 00 00 FF FF 07 00 63',
				'65 6E 74 72 61 6C 50 4B 05 06 00 00 00 00 03 00',
				'03 00 C6 00 00 00 AB 00 00 00 0F 00 61 72 63 68',
				'69 76 65 20 63 6F 6D 6D 65 6E 74'
			].join(' '));
			expect(offset).toBe(171);
		});
	});
});
