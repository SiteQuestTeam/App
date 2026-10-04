import assert from 'node:assert/strict';
import test from 'node:test';
import { appendImage } from '../src/multipart-upload.ts';

test('appendImage adds a Blob instead of React Native URI metadata', async () => {
  const form = new FormData();
  const image = new Blob(['photo-bytes'], { type: 'image/jpeg' });

  appendImage(form, 'file', image);

  const part = form.get('file');
  assert.ok(part instanceof Blob);
  assert.equal(part.type, 'image/jpeg');
  assert.equal(await part.text(), 'photo-bytes');
});
