import test from "node:test";
import assert from "node:assert/strict";
import { kit } from "../src/domains/factory/object/foliage/kits/tree-kit/index.js";

const base = { seed: "broadleaf-007", params: { shape: "rounded", height: 5.1, trunkRadius: 0.27, branchCount: 5, canopyDensity: 1 } };

test("tree generation is deterministic and seed-sensitive", () => {
  const a = kit.services.generate(base);
  const b = kit.services.generate(base);
  assert.equal(a.deterministicHash, b.deterministicHash);
  assert.notEqual(a.deterministicHash, kit.services.generate({ ...base, seed: "broadleaf-008" }).deterministicHash);
  assert.equal(kit.services.validate(a).valid, true);
});

test("tree emits exactly one wood submesh and one merged foliage crown", () => {
  const artifact = kit.services.generate(base);
  assert.deepEqual(artifact.meshes.map((mesh) => mesh.id), ["wood-structure", "foliage-crown"]);
  assert.equal(artifact.meshes[0].material, "bark");
  assert.equal(artifact.meshes[1].material, "leaf");
  assert.ok(artifact.meshes[0].positions.length > 0);
  assert.ok(artifact.meshes[1].positions.length > 0);
  assert.ok(artifact.meshes[1].indices.length > 3);
  assert.ok(!artifact.meshes.some((mesh) => mesh.id.includes("canopy-") || mesh.id.startsWith("crown-")));
  assert.equal(artifact.metadata.submeshes.length, 2);
});

test("shape options change the generated geometry", () => {
  const rounded = kit.services.generate(base);
  const broad = kit.services.generate({ ...base, params: { ...base.params, shape: "broad" } });
  const compact = kit.services.generate({ ...base, params: { ...base.params, shape: "compact" } });
  assert.notEqual(rounded.deterministicHash, broad.deterministicHash);
  assert.notEqual(rounded.deterministicHash, compact.deterministicHash);
});

test("branch range is preserved inside the merged wood structure", () => {
  for (const branchCount of [4, 6]) {
    const artifact = kit.services.generate({ ...base, params: { ...base.params, branchCount } });
    assert.equal(artifact.metadata.branchCount, branchCount);
    assert.equal(artifact.meshes.filter((mesh) => mesh.id === "wood-structure").length, 1);
    assert.equal(artifact.meshes.filter((mesh) => mesh.id === "foliage-crown").length, 1);
    assert.equal(kit.services.validate(artifact).valid, true);
  }
});

test("legal height and canopy density extremes remain valid", () => {
  const extremes = [
    { ...base.params, height: 3.8, canopyDensity: 0.7, branchCount: 4 },
    { ...base.params, height: 7.5, canopyDensity: 1.25, branchCount: 6 }
  ];
  for (const params of extremes) assert.equal(kit.services.validate(kit.services.generate({ ...base, params })).valid, true);
});

test("unsupported foliage shapes are rejected", () => {
  assert.throws(() => kit.services.generate({ ...base, params: { ...base.params, shape: "diamond" } }), /must be one of/);
});

test("tree GLB export remains valid and contains two meshes", () => {
  const artifact = kit.services.generate(base);
  const output = kit.services.export(artifact, "glb");
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  assert.equal(view.getUint32(0, true), 0x46546c67);
  assert.equal(view.getUint32(4, true), 2);
  assert.equal(artifact.meshes.length, 2);
});
