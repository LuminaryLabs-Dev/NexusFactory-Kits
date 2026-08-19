import { defineKit } from "../../../../../../domain.js";
import { createArtifact, normalizeParameters, validateArtifactShape } from "../../../../../../contracts.js";
import { createSeededRandom, randomBetween, deriveSeed } from "../../../../../../foundation/random.js";
import { createBeamMesh, createCylinderMesh, createOctahedronMesh } from "../../../../../../foundation/geometry.js";
import { exportArtifactGlb } from "../../../../../../foundation/glb.js";

const parameterSchema = [
  { id: "height", label: "Height", type: "number", minimum: 2.5, maximum: 9, default: 5.2, step: 0.1 },
  { id: "trunkRadius", label: "Trunk Radius", type: "number", minimum: 0.12, maximum: 0.55, default: 0.28, step: 0.01 },
  { id: "branchCount", label: "Branch Count", type: "integer", minimum: 4, maximum: 14, default: 8, step: 1 },
  { id: "canopyDensity", label: "Canopy Density", type: "number", minimum: 0.4, maximum: 1.4, default: 0.9, step: 0.05 }
];

export const manifest = defineKit({
  id: "factory-object-foliage-tree",
  displayName: "Procedural Broadleaf Tree",
  domainPath: "n:factory:object:foliage",
  requires: ["factory:object:foliage", "factory:seed", "factory:artifact"],
  provides: ["factory:generate", "factory:validate", "factory:variation", "factory:export", "artifact:mesh", "seed:deterministic", "editor:parameters", "export:glb"],
  services: ["describe", "generate", "reroll", "validate", "export"],
  parameterSchema,
  editor: { preview: "mesh-3d", inspector: "schema", surfaces: ["seed", "parameters", "export", "diagnostics"] },
  runtime: { environments: ["node", "browser", "worker"], permissions: [] },
  source: { module: "src/domains/factory/object/foliage/kits/tree-kit/index.js", exportName: "kit" },
  metadata: { deterministic: true, artifactType: "mesh", identity: "rooted trunk, radial branches and clustered broadleaf canopy" }
});

function palette(random) {
  const bark = randomBetween(random, -0.025, 0.025);
  const leaf = randomBetween(random, -0.04, 0.04);
  return {
    bark: { baseColor: [0.26 + bark, 0.13 + bark, 0.065, 1], metallic: 0, roughness: 0.9, emissive: [0, 0, 0] },
    leaf: { baseColor: [0.16 + leaf, 0.39 + leaf, 0.12 + leaf * 0.4, 1], metallic: 0, roughness: 0.82, emissive: [0, 0, 0] }
  };
}

export function generate(request = {}) {
  const seed = String(request.seed ?? "tree-default").trim();
  if (!seed) throw new TypeError("Tree generation requires a non-empty seed.");
  const params = normalizeParameters(parameterSchema, request.params);
  const random = createSeededRandom(seed);
  const height = params.height * randomBetween(random, 0.96, 1.04);
  const meshes = [createCylinderMesh("trunk", [0, 0, 0], [0, height, 0], params.trunkRadius, 14, "bark")];
  const branchTips = [];
  for (let index = 0; index < params.branchCount; index += 1) {
    const t = (index + 1) / (params.branchCount + 1);
    const y = height * (0.25 + t * 0.58);
    const angle = index * 2.399963229728653 + randomBetween(random, -0.32, 0.32);
    const reach = height * randomBetween(random, 0.14, 0.28) * (0.7 + params.canopyDensity * 0.25);
    const tip = [Math.cos(angle) * reach, y + randomBetween(random, 0.2, 0.75), Math.sin(angle) * reach];
    branchTips.push(tip);
    meshes.push(createBeamMesh(`branch-${index + 1}`, [0, y, 0], tip, params.trunkRadius * randomBetween(random, 0.32, 0.52), params.trunkRadius * 0.34, "bark"));
    const clusterCount = Math.max(1, Math.round(params.canopyDensity * randomBetween(random, 1.2, 2.5)));
    for (let cluster = 0; cluster < clusterCount; cluster += 1) {
      const center = [tip[0] + randomBetween(random, -0.35, 0.35), tip[1] + randomBetween(random, -0.2, 0.45), tip[2] + randomBetween(random, -0.35, 0.35)];
      meshes.push(createOctahedronMesh(`branch-${index + 1}-canopy-${cluster + 1}`, center, randomBetween(random, 0.45, 0.78) * params.canopyDensity, "leaf"));
    }
  }
  for (let index = 0; index < 3; index += 1) {
    const angle = index * Math.PI * 2 / 3 + randomBetween(random, -0.3, 0.3);
    meshes.push(createOctahedronMesh(`crown-${index + 1}`, [Math.cos(angle) * 0.35, height + index * 0.12, Math.sin(angle) * 0.35], 0.8 * params.canopyDensity, "leaf"));
  }
  return createArtifact({ kitId: manifest.id, domainPath: manifest.domainPath, seed, params, meshes, materials: palette(random), metadata: { recognizableAs: "broadleaf tree", branchTips } });
}

export function validate(artifact) {
  const shape = validateArtifactShape(artifact);
  const ids = new Set((artifact?.meshes ?? []).map((mesh) => mesh.id));
  const checks = [
    ...shape.checks,
    { id: "identity:trunk", pass: ids.has("trunk"), detail: "rooted trunk" },
    { id: "identity:branches", pass: [...ids].filter((id) => /^branch-\d+$/.test(id)).length >= 4, detail: "radial branches" },
    { id: "identity:canopy", pass: [...ids].some((id) => id.includes("canopy") || id.startsWith("crown-")), detail: "leaf clusters" }
  ];
  return { valid: checks.every((check) => check.pass), checks, deterministicHash: artifact?.deterministicHash ?? null };
}

export function reroll(request = {}) {
  let entropy = request.entropy;
  if (entropy == null) {
    if (globalThis.crypto?.getRandomValues) { const values = new Uint32Array(2); globalThis.crypto.getRandomValues(values); entropy = `${values[0]}:${values[1]}`; }
    else entropy = `${Date.now()}:${Math.random()}`;
  }
  const seed = deriveSeed(request.seed ?? "tree", entropy);
  return { seed, artifact: generate({ seed, params: request.params }) };
}

export function exportArtifact(artifact, format = "glb") {
  if (format === "glb") return exportArtifactGlb(artifact);
  if (format === "json") return JSON.stringify(artifact, null, 2);
  throw new RangeError(`Unsupported tree export format: ${format}`);
}

export const kit = Object.freeze({ manifest, services: Object.freeze({ describe: () => structuredClone(manifest), generate, reroll, validate, export: exportArtifact }) });
export default kit;
