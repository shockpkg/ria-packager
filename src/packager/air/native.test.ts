import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirNative} from './native';

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
