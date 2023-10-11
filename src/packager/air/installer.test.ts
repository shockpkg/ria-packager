import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec';
import {test} from '../air.spec';
import {PackagerAir} from '../air';

import {PackagerAirInstaller} from './installer';

void describe('packages/airs/installer', () => {
	void describe('PackagerAirInstaller', () => {
		void it('instanceof PackagerAir', () => {
			ok(PackagerAirInstaller.prototype instanceof PackagerAir);
		});

		if (!(shouldTest('air') || shouldTest('air-installer'))) {
			return;
		}

		test(PackagerAirInstaller, 'installer', '.air', true, true);
	});
});
