import assert from 'node:assert/strict';
import test from 'node:test';
import { captureVoteLocation } from '../src/vote-location-snapshot.ts';

const location = {
  timestamp: 1_000,
  coords: { latitude: 50.067, longitude: 19.991 },
};

test('keeps a fresh location captured when voting opens', () => {
  assert.equal(captureVoteLocation(location, 5_999), location);
});

test('does not capture a stale location when voting opens', () => {
  assert.equal(captureVoteLocation(location, 6_001), null);
});
