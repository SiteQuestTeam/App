import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKGROUND_REFRESH_MS } from '../src/background-refresh.ts';

test('refreshes live API data every fifteen seconds', () => {
  assert.equal(BACKGROUND_REFRESH_MS, 15_000);
});
