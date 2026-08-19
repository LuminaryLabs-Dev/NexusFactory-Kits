import test from "node:test";
import assert from "node:assert/strict";
import { kit } from "../src/domains/factory/object/foliage/kits/tree-kit/index.js";

test("tree proves the registry architecture is not weapon-specific", () => {
  const request = { seed: "broadleaf-007", params: { height: 6, trunkRadius: 0.3, branchCount: 8, canopyDensity: 0.9 } };
  const a = kit.services.generate(request);
  const b = kit.services.generate(request);
  assert.equal(a.deterministicHash, b.deterministicHash);
  assert.equal(kit.services.validate(a).valid, true);
  assert.ok(a.meshes.some((mesh) => mesh.id === "trunk"));
  assert.ok(a.meshes.filter((mesh) => /^branch-\d+$/.test(mesh.id)).length >= 4);
  assert.notEqual(a.deterministicHash, kit.services.generate({ ...request, seed: "broadleaf-008" }).deterministicHash);
});
