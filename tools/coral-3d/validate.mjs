import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const artifactRoot = path.resolve('artifacts/coral-3d');
const manifest = JSON.parse(await fs.readFile(path.join(artifactRoot, 'export-records.json'), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

assert.equal(manifest.schema, 'nexus-factory/coral-3d-exports/v1');
assert.equal(manifest.records.length, 10);

for (const record of manifest.records) {
  const modelPath = path.join(artifactRoot, 'models', record.file);
  const buffer = await fs.readFile(modelPath);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', `${record.id}: GLB header`);
  assert.equal(buffer.byteLength, record.bytes, `${record.id}: byte length`);
  assert.equal(sha256(buffer), record.sha256, `${record.id}: checksum`);

  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    '',
    resolve,
    reject,
  ));
  let meshCount = 0;
  let triangles = 0;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    const positions = object.geometry.getAttribute('position');
    assert.ok(positions, `${record.id}: position attribute`);
    for (let index = 0; index < positions.count; index += 1) {
      assert.ok(Number.isFinite(positions.getX(index)), `${record.id}: finite x`);
      assert.ok(Number.isFinite(positions.getY(index)), `${record.id}: finite y`);
      assert.ok(Number.isFinite(positions.getZ(index)), `${record.id}: finite z`);
    }
    triangles += object.geometry.index ? object.geometry.index.count / 3 : positions.count / 3;
  });
  assert.ok(meshCount > 0, `${record.id}: contains meshes`);
  assert.equal(Math.round(triangles), record.triangles, `${record.id}: triangle count`);
  assert.ok(record.triangles <= 12000, `${record.id}: triangle budget`);
  assert.equal(record.bounds.minimum[1], 0, `${record.id}: floor contact`);
}

console.log(`Validated ${manifest.records.length} reviewed coral GLBs.`);
