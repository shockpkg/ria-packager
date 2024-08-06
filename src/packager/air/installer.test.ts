import {describe, it} from 'node:test';
import {ok} from 'node:assert';

import {shouldTest} from '../../util.spec.ts';
import {test} from '../air.spec.ts';
import {PackagerAir} from '../air.ts';

import {PackagerAirInstaller} from './installer.ts';

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
