import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec.ts';
import {test} from '../air.spec.ts';
import {PackagerAir} from '../air.ts';

import {PackagerAirNative} from './native.ts';

void describe('packages/airs/native', () => {
	void describe('PackagerAirNative', () => {
		void it('instanceof PackagerAir', () => {
			ok(PackagerAirNative.prototype instanceof PackagerAir);
		});

		if (!(shouldTest('air') || shouldTest('air-native'))) {
			return;
		}

		test(PackagerAirNative, 'native', '.airn', true, true);
	});
});
