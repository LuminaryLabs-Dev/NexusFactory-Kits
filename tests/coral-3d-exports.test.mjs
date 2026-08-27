import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const artifactRoot = path.resolve('artifacts/coral-3d');
const manifest = JSON.parse(await fs.readFile(path.join(artifactRoot, 'export-records.json'), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

test('the reviewed 3D coral export catalog is complete and immutable', async () => {
  assert.deepEqual(manifest.records.map(({ id }) => id), [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  ]);
  for (const record of manifest.records) {
    const buffer = await fs.readFile(path.join(artifactRoot, 'models', record.file));
    assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
    assert.equal(buffer.byteLength, record.bytes);
    assert.equal(sha256(buffer), record.sha256);
    assert.ok(record.triangles > 0 && record.triangles <= 12000);
    assert.equal(record.bounds.minimum[1], 0);
  }
});
