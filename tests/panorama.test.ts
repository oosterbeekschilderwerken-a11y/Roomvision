import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFile, validateDimensions, MAX_FILE_BYTES } from '../lib/panorama.ts';
test('accepts supported local photos and rejects unsupported or oversized files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateFile(type, 12345), null);
  assert.match(validateFile('image/svg+xml', 100)!, /bestandstype/);
  assert.match(validateFile('application/pdf', 100)!, /bestandstype/);
  assert.match(validateFile('image/jpeg', MAX_FILE_BYTES + 1)!, /25 MB/);
  assert.equal(validateFile('image/jpeg', MAX_FILE_BYTES), null);
});
test('validates the panorama aspect ratio, resolution, and pixel limit', () => {
  for (const [w,h] of [[1024,512],[4096,2048],[8192,4096],[4000,2001]]) assert.equal(validateDimensions(w,h), null);
  assert.match(validateDimensions(800,400)!, /klein/);
  assert.match(validateDimensions(2048,2048)!, /verhouding/);
  assert.match(validateDimensions(9000,4500)!, /pixels/);
});
