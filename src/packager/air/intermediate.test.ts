import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirIntermediate} from './intermediate';

describe('packages/airs/intermediate', () => {
	describe('PackagerAirIntermediate', () => {
		it('instanceof PackagerAir', () => {
			ok(PackagerAirIntermediate.prototype instanceof PackagerAir);
		});

		if (!shouldTest('air-intermediate')) {
			return;
		}

		test(PackagerAirIntermediate, 'intermediate', '.airi', false, true);
	});
});
