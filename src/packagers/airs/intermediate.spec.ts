import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';

import {PackagerAirIntermediate} from './intermediate';

describe('packages/airs/intermediate', () => {
	if (!shouldTest('air-intermediate')) {
		return;
	}
	describe('PackagerAirInstaller', () => {
		test(PackagerAirIntermediate, 'intermediate', '.airi', false);
	});
});
