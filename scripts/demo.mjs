import { ballistaKit, treeKit } from "../src/index.js";

for (const [name, kit, request] of [
  ["ballista", ballistaKit, { seed: "demo-ballista-001", params: { scale: 1, mechanismCount: 4, wear: 0.25 } }],
  ["tree", treeKit, { seed: "demo-tree-001", params: { height: 5.8, branchCount: 9, canopyDensity: 0.95 } }]
]) {
  const artifact = kit.services.generate(request);
  const validation = kit.services.validate(artifact);
  console.log(JSON.stringify({ name, kitId: artifact.kitId, hash: artifact.deterministicHash, statistics: artifact.statistics, valid: validation.valid }, null, 2));
}
