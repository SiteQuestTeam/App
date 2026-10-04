import assert from 'node:assert/strict';
import test from 'node:test';
import { preparationCopy } from '../src/kck-preparation-layout.ts';

test('distinguishes GPS lookup from KCK image analysis', () => {
  assert.equal(preparationCopy(false).title, 'Ustalam lokalizację…');
  assert.equal(preparationCopy(true).title, 'Analizuję zdjęcie…');
});
