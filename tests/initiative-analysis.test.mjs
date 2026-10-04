import assert from 'node:assert/strict';
import test from 'node:test';
import { needsInitiativeDescription } from '../src/initiative-analysis.ts';

test('asks for the initiative description when AI reports opisz_zmiane', () => {
  assert.equal(needsInitiativeDescription('opisz_zmiane'), true);
  assert.equal(needsInitiativeDescription('nowe_zdjecie'), false);
});
