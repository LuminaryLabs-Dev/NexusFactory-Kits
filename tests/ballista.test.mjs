import test from "node:test";
import assert from "node:assert/strict";
import { kit } from "../src/domains/factory/object/weapon/kits/ballista-kit/index.js";

const request = { seed: "windup-ballista-turret-003", params: { scale: 1.02, mechanismCount: 4, wear: 0.34, armSpan: 3.6, railLength: 4.1 } };

test("ballista is deterministic and structurally recognizable", () => {
  const a = kit.services.generate(request);
  const b = kit.services.generate(request);
  assert.equal(a.deterministicHash, b.deterministicHash);
  assert.deepEqual(a, b);
  const ids = new Set(a.meshes.map((mesh) => mesh.id));
  for (const id of ["central-launch-rail", "left-torsion-arm", "right-torsion-arm", "winding-drum", "loaded-bolt-shaft", "rotating-base"]) assert.ok(ids.has(id), id);
  assert.equal(kit.services.validate(a).valid, true);
  assert.ok(a.bounds.size[0] > 2.5);
  assert.ok(a.bounds.size[2] > 3);
});

test("ballista seed and mechanism settings produce meaningful variation", () => {
  const a = kit.services.generate(request);
  const seeded = kit.services.generate({ ...request, seed: "windup-ballista-turret-004" });
  const fewer = kit.services.generate({ ...request, params: { ...request.params, mechanismCount: 2 } });
  assert.notEqual(a.deterministicHash, seeded.deterministicHash);
  assert.notEqual(a.statistics.meshCount, fewer.statistics.meshCount);
});

test("ballista exports a valid GLB 2.0 container", () => {
  const artifact = kit.services.generate(request);
  const glb = kit.services.export(artifact, "glb");
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  assert.equal(view.getUint32(0, true), 0x46546c67);
  assert.equal(view.getUint32(4, true), 2);
  assert.equal(view.getUint32(8, true), glb.byteLength);
});
