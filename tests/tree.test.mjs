import test from "node:test";
import assert from "node:assert/strict";
import { kit } from "../src/domains/factory/object/foliage/kits/tree-kit/index.js";

const base = { seed: "broadleaf-007", params: { shape: "rounded", height: 5.1, trunkRadius: 0.27, branchCount: 5, canopyDensity: 1 } };

function crown(artifact) { return artifact.meshes.find((mesh) => mesh.id === "foliage-crown"); }

test("tree generation is deterministic and seed-sensitive", () => {
  const a = kit.services.generate(base);
  const b = kit.services.generate(base);
  assert.equal(a.deterministicHash, b.deterministicHash);
  assert.notEqual(a.deterministicHash, kit.services.generate({ ...base, seed: "broadleaf-008" }).deterministicHash);
  assert.equal(kit.services.validate(a).valid, true);
});

test("tree emits one welded crown and one wood submesh", () => {
  const artifact = kit.services.generate(base);
  assert.deepEqual(artifact.meshes.map((mesh) => mesh.id), ["wood-structure", "foliage-crown"]);
  assert.equal(artifact.meshes.length, 2);
  assert.equal(crown(artifact).material, "leaf");
  assert.equal(artifact.metadata.crownTopology.type, "single-welded-radial-shell");
  assert.equal(artifact.metadata.crownTopology.connectedComponents, 1);
  assert.equal(artifact.metadata.crownTopology.boundaryEdges, 0);
  assert.equal(artifact.metadata.crownTopology.nonManifoldEdges, 0);
  assert.ok(artifact.metadata.crownTopology.vertexCount >= 50);
  assert.ok(artifact.metadata.crownTopology.triangleCount >= 90);
  assert.equal(artifact.meshes.some((mesh) => /canopy|crown-\d|branch-\d+-canopy/.test(mesh.id)), false);
});

test("crown stays in the upper tree and remains broad enough to read as a canopy", () => {
  const artifact = kit.services.generate(base);
  const foliage = crown(artifact);
  const ys = [];
  const xs = [];
  const zs = [];
  for (let index = 0; index < foliage.positions.length; index += 3) {
    xs.push(foliage.positions[index]);
    ys.push(foliage.positions[index + 1]);
    zs.push(foliage.positions[index + 2]);
  }
  const canopyBottom = Math.min(...ys);
  const canopyTop = Math.max(...ys);
  const canopyWidth = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  const treeHeight = artifact.bounds.size[1];
  assert.ok(canopyBottom / treeHeight >= 0.42 && canopyBottom / treeHeight <= 0.58);
  assert.ok(canopyTop / treeHeight >= 0.94);
  assert.ok(canopyWidth / treeHeight >= 0.45);
});

test("shape options change the connected crown without changing the asset contract", () => {
  const rounded = kit.services.generate(base);
  for (const shape of ["broad", "compact", "irregular"]) {
    const variant = kit.services.generate({ ...base, params: { ...base.params, shape } });
    assert.notEqual(rounded.deterministicHash, variant.deterministicHash);
    assert.deepEqual(variant.meshes.map((mesh) => mesh.id), ["wood-structure", "foliage-crown"]);
    assert.equal(variant.metadata.crownTopology.connectedComponents, 1);
    assert.equal(kit.services.validate(variant).valid, true);
  }
});

test("branch range stays sparse while the crown remains unified", () => {
  for (const branchCount of [4, 6]) {
    const artifact = kit.services.generate({ ...base, params: { ...base.params, branchCount } });
    assert.equal(artifact.metadata.branchCount, branchCount);
    assert.equal(artifact.metadata.crownTopology.connectedComponents, 1);
    assert.equal(artifact.meshes.length, 2);
    assert.equal(kit.services.validate(artifact).valid, true);
  }
});

test("legal height and canopy density extremes remain valid", () => {
  const extremes = [
    { ...base.params, height: 3.8, canopyDensity: 0.7, branchCount: 4 },
    { ...base.params, height: 7.5, canopyDensity: 1.25, branchCount: 6 }
  ];
  for (const params of extremes) {
    const artifact = kit.services.generate({ ...base, params });
    assert.equal(artifact.metadata.crownTopology.connectedComponents, 1);
    assert.equal(kit.services.validate(artifact).valid, true);
  }
});

test("unsupported foliage shapes are rejected", () => {
  assert.throws(() => kit.services.generate({ ...base, params: { ...base.params, shape: "diamond" } }), /must be one of/);
});

test("tree GLB export remains valid and contains only the two logical tree meshes", () => {
  const artifact = kit.services.generate(base);
  const output = kit.services.export(artifact, "glb");
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  assert.equal(view.getUint32(0, true), 0x46546c67);
  assert.equal(view.getUint32(4, true), 2);
  assert.equal(artifact.meshes.length, 2);
});
