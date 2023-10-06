import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirIntermediate} from './intermediate';

void describe('packages/airs/intermediate', () => {
	void describe('PackagerAirIntermediate', () => {
		void it('instanceof PackagerAir', () => {
			ok(PackagerAirIntermediate.prototype instanceof PackagerAir);
		});

		if (!shouldTest('air-intermediate')) {
			return;
		}

		test(PackagerAirIntermediate, 'intermediate', '.airi', false, true);
	});
});
