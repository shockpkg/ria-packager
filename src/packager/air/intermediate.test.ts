import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec.ts';
import {test} from '../air.spec.ts';
import {PackagerAir} from '../air.ts';

import {PackagerAirIntermediate} from './intermediate.ts';

void describe('packages/airs/intermediate', () => {
	void describe('PackagerAirIntermediate', () => {
		void it('instanceof PackagerAir', () => {
			ok(PackagerAirIntermediate.prototype instanceof PackagerAir);
		});

		if (!(shouldTest('air') || shouldTest('air-intermediate'))) {
			return;
		}

		test(PackagerAirIntermediate, 'intermediate', '.airi', false, true);
	});
});
