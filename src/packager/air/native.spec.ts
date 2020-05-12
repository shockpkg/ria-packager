import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';

import {PackagerAirNative} from './native';

describe('packages/airs/native', () => {
	if (!shouldTest('air-native')) {
		return;
	}
	describe('PackagerAirInstaller', () => {
		test(PackagerAirNative, 'native', '.airn', true, true);
	});
});
