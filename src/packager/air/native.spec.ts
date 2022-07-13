import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirNative} from './native';

describe('packages/airs/native', () => {
	describe('PackagerAirInstaller', () => {
		it('instanceof PackagerAir', () => {
			expect(PackagerAirNative.prototype instanceof PackagerAir)
				.toBeTrue();
		});

		if (!shouldTest('air-native')) {
			return;
		}

		test(PackagerAirNative, 'native', '.airn', true, true);
	});
});
