import assert from 'node:assert/strict';
import test from 'node:test';
import { voteActionState } from '../src/initiative-vote-state.ts';

test('replaces vote actions with confirmation after a player voted', () => {
  assert.deepEqual(voteActionState(true), {
    showActions: false,
    message: 'Głos już oddany na tę inicjatywę',
  });
});

test('keeps vote actions available before voting', () => {
  assert.deepEqual(voteActionState(false), { showActions: true, message: null });
});
