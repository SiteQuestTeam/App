import assert from 'node:assert/strict';
import test from 'node:test';
import { focusedFieldScrollOffset } from '../src/keyboard-scroll.ts';

test('places a focused field near the top of the keyboard-resized viewport', () => {
  assert.equal(focusedFieldScrollOffset(420), 396);
  assert.equal(focusedFieldScrollOffset(12), 0);
});
