import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';

import {PackagerAirInstaller} from './installer';

describe('packages/airs/installer', () => {
	if (!shouldTest('air-installer')) {
		return;
	}
	describe('PackagerAirInstaller', () => {
		test(PackagerAirInstaller, 'installer', '.air', true, true);
	});
});
