import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';

import {pathRelativeBase} from './util.ts';

void describe('util', () => {
	void describe('pathRelativeBase', () => {
		void it('file', () => {
			strictEqual(pathRelativeBase('test', 'test'), '');
			strictEqual(pathRelativeBase('test/', 'test'), '');
			strictEqual(pathRelativeBase('test', 'Test'), null);
		});

		void it('file nocase', () => {
			strictEqual(pathRelativeBase('test', 'Test', true), '');
		});

		void it('dir', () => {
			strictEqual(pathRelativeBase('test/123', 'test'), '123');
			strictEqual(pathRelativeBase('test/123', 'Test'), null);
		});

		void it('dir nocase', () => {
			strictEqual(pathRelativeBase('test/123', 'Test', true), '123');
		});
	});
});
