import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';

import {pathRelativeBase} from './util';

describe('util', () => {
	describe('pathRelativeBase', () => {
		it('file', () => {
			strictEqual(pathRelativeBase('test', 'test'), '');
			strictEqual(pathRelativeBase('test/', 'test'), '');
			strictEqual(pathRelativeBase('test', 'Test'), null);
		});

		it('file nocase', () => {
			strictEqual(pathRelativeBase('test', 'Test', true), '');
		});

		it('dir', () => {
			strictEqual(pathRelativeBase('test/123', 'test'), '123');
			strictEqual(pathRelativeBase('test/123', 'Test'), null);
		});

		it('dir nocase', () => {
			strictEqual(pathRelativeBase('test/123', 'Test', true), '123');
		});
	});
});
