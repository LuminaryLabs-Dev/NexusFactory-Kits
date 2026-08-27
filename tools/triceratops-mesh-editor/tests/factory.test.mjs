import test from 'node:test';
import assert from 'node:assert/strict';
import * as factory from '../services/factory-service.mjs';
import { MeshStateManager } from '../services/state-service.mjs';
import { geometrySha256 } from '../services/io-service.mjs';

const runtime = factory.createFactoryRuntime();
const kit = runtime.resolveKit();

test('six-operation factory surface is complete', async () => {
  const description = await factory.describe();
  assert.deepEqual(description.capabilities.serviceSurface, ['describe', 'generate', 'randomize', 'reroll', 'validate', 'export']);
});

test('baseline reproduces exact geometry and topology', async () => {
  const result = await factory.generate({ document: kit.document, forceClean: true });
  const validation = await factory.validate(result);
  assert.equal(validation.verdict, 'pass');
  assert.equal(geometrySha256(result.outputs.body.geometry), kit.kit.baseline.geometrySha256);
  assert.equal(validation.aggregate.totalTriangles, kit.kit.baseline.completeAssetTriangles);
  assert.equal(validation.body.logicalQuads, 8894);
  assert.equal(validation.body.quadTopologyKind, 'paired-triangle-quads');
});

test('randomize and selective reroll stay within declared ranges', async () => {
  const randomized = await factory.randomize({ seed: 42 });
  for (const operation of randomized.patch) {
    const rule = kit.constraints.parameters[operation.path];
    assert.ok(operation.value >= rule.min && operation.value <= rule.max);
  }
  const rerolled = await factory.reroll({ seed: 43, groups: ['frill'] });
  assert.ok(rerolled.patch.length > 0);
  assert.ok(rerolled.patch.every((operation) => kit.constraints.parameters[operation.path].groups.includes('frill')));
});

test('preview, commit, undo and redo are deterministic', async () => {
  const manager = new MeshStateManager({ document: kit.document, evaluator: runtime.evaluator, validateResult: async (result) => factory.validate(result) });
  await manager.initialize();
  const baseline = geometrySha256(manager.committedResult.outputs.body.geometry);
  await manager.preview({ transactionId: 'test-edit', baseRevision: 0, mode: 'preview', patch: [{ op: 'replace', path: '/nodes/anatomy.frill-crown/params/radii/2', value: 1.31 }] });
  assert.notEqual(geometrySha256(manager.previewState.result.outputs.body.geometry), baseline);
  await manager.commit('test-edit');
  const edited = geometrySha256(manager.committedResult.outputs.body.geometry);
  await manager.undo();
  assert.equal(geometrySha256(manager.committedResult.outputs.body.geometry), baseline);
  await manager.redo();
  assert.equal(geometrySha256(manager.committedResult.outputs.body.geometry), edited);
});

test('unsafe, stale and unknown-node edits are rejected', async () => {
  const manager = new MeshStateManager({ document: kit.document, evaluator: runtime.evaluator, validateResult: async (result) => factory.validate(result) });
  await manager.initialize();
  await assert.rejects(() => manager.preview({ transactionId: 'stale', baseRevision: 2, mode: 'preview', patch: [{ op: 'replace', path: '/seed', value: 4 }] }), (error) => error.code === 'STALE_REVISION');
  await assert.rejects(() => manager.preview({ transactionId: 'unsafe', baseRevision: 0, mode: 'preview', patch: [{ op: 'add', path: '/nodes/__proto__', value: {} }] }), (error) => error.code === 'UNSAFE_PATCH');
  const invalid = structuredClone(kit.document);
  invalid.nodes['anatomy.torso'].type = 'runtime.javascript.eval';
  await assert.rejects(() => factory.generate({ document: invalid, forceClean: true }), (error) => error.code === 'UNKNOWN_NODE_TYPE');
});

test('atomic loop-ring edit reuses extraction and deforms body plus attachments', async () => {
  const baseline = await factory.generate({ document: kit.document, forceClean: true });
  const patch = [
    { op: 'replace', path: '/nodes/edit.ring.head/params/scale/1', value: 0.9 },
    { op: 'replace', path: '/nodes/edit.ring.head/params/scale/2', value: 0.92 }
  ];
  const edited = await factory.generate({ document: kit.document, patch });
  const validation = await factory.validate(edited);
  assert.equal(validation.verdict, 'pass');
  assert.notEqual(geometrySha256(edited.outputs.body.geometry), geometrySha256(baseline.outputs.body.geometry));
  assert.equal(edited.stages.find((stage) => stage.id === 'mesh.body').status, 'reused');
  assert.equal(edited.stages.find((stage) => stage.id === 'mesh.body.ring.head').status, 'computed');
  const baselineEye = baseline.values.get('attachments.ring.head').items.find((item) => item.id === 'eye-1');
  const editedEye = edited.values.get('attachments.ring.head').items.find((item) => item.id === 'eye-1');
  assert.notDeepEqual(editedEye.position, baselineEye.position);
});
