import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirIntermediate} from './intermediate';

describe('packages/airs/intermediate', () => {
	describe('PackagerAirIntermediate', () => {
		it('function', () => {
			expect(PackagerAirIntermediate.prototype instanceof PackagerAir)
				.toBeTrue();
		});

		if (!shouldTest('air-intermediate')) {
			return;
		}

		test(PackagerAirIntermediate, 'intermediate', '.airi', false, true);
	});
});
