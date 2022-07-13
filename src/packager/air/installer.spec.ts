import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirInstaller} from './installer';

describe('packages/airs/installer', () => {
	describe('PackagerAirInstaller', () => {
		it('function', () => {
			expect(PackagerAirInstaller.prototype instanceof PackagerAir)
				.toBeTrue();
		});

		if (!shouldTest('air-installer')) {
			return;
		}

		test(PackagerAirInstaller, 'installer', '.air', true, true);
	});
});
