import { defineKit } from "../../../../../../domain.js";
import { createArtifact, normalizeParameters, validateArtifactShape } from "../../../../../../contracts.js";
import { createSeededRandom, randomBetween, deriveSeed } from "../../../../../../foundation/random.js";
import { createBeamMesh, createCylinderMesh, createLowPolyClusterMesh, meshBounds } from "../../../../../../foundation/geometry.js";
import { exportArtifactGlb } from "../../../../../../foundation/glb.js";

const parameterSchema = [
  { id: "shape", label: "Shape", type: "enum", options: ["rounded", "broad", "compact", "irregular"], optionLabels: { rounded: "Rounded", broad: "Broad", compact: "Compact", irregular: "Irregular" }, default: "rounded" },
  { id: "height", label: "Height", type: "number", minimum: 3.8, maximum: 7.5, default: 5.1, step: 0.1 },
  { id: "trunkRadius", label: "Trunk Radius", type: "number", minimum: 0.14, maximum: 0.48, default: 0.27, step: 0.01 },
  { id: "branchCount", label: "Branch Count", type: "integer", minimum: 4, maximum: 6, default: 5, step: 1 },
  { id: "canopyDensity", label: "Canopy Density", type: "number", minimum: 0.7, maximum: 1.25, default: 1.0, step: 0.05 }
];

export const manifest = defineKit({
  id: "factory-object-foliage-tree",
  displayName: "Procedural Broadleaf Tree",
  domainPath: "n:factory:object:foliage",
  requires: ["factory:object:foliage", "factory:seed", "factory:artifact"],
  provides: ["factory:generate", "factory:validate", "factory:variation", "factory:export", "artifact:mesh", "seed:deterministic", "editor:parameters", "export:glb"],
  services: ["describe", "generate", "reroll", "validate", "export"],
  parameterSchema,
  editor: {
    title: "Broadleaf Tree",
    category: "Nature",
    tags: ["tree", "broadleaf", "foliage", "low-poly"],
    preview: "mesh-3d",
    inspector: "schema",
    surfaces: ["seed", "parameters", "export", "diagnostics"],
    primary: ["shape", "height", "canopyDensity"],
    advanced: ["trunkRadius", "branchCount", "seed"],
    internal: [],
    randomizationGroups: [
      { id: "everything", label: "Everything", parameters: ["shape", "height", "canopyDensity", "trunkRadius", "branchCount"], rerollSeed: true },
      { id: "shape", label: "Shape", parameters: ["shape", "height", "canopyDensity"], rerollSeed: false },
      { id: "details", label: "Details", parameters: ["trunkRadius", "branchCount"], rerollSeed: false }
    ]
  },
  runtime: { environments: ["node", "browser", "worker"], permissions: [] },
  source: { module: "src/domains/factory/object/foliage/kits/tree-kit/index.js", exportName: "kit" },
  metadata: { deterministic: true, artifactType: "mesh", identity: "grounded trunk, sparse radial branches and cohesive rounded broadleaf canopy" }
});

const SHAPES = {
  rounded: { scale: [1, 1, 1], radius: 1, irregularity: 0.08 },
  broad: { scale: [1.22, 0.78, 1.18], radius: 1.02, irregularity: 0.07 },
  compact: { scale: [0.88, 0.92, 0.88], radius: 0.9, irregularity: 0.05 },
  irregular: { scale: [1.08, 0.94, 0.98], radius: 1.02, irregularity: 0.2 }
};

function palette(random) {
  const bark = randomBetween(random, -0.025, 0.025);
  const leaf = randomBetween(random, -0.035, 0.035);
  return {
    bark: { baseColor: [0.26 + bark, 0.13 + bark, 0.065, 1], metallic: 0, roughness: 0.9, emissive: [0, 0, 0] },
    leaf: { baseColor: [0.16 + leaf, 0.39 + leaf, 0.12 + leaf * 0.4, 1], metallic: 0, roughness: 0.82, emissive: [0, 0, 0] }
  };
}

function foliageMesh(id, center, radius, profile, random) {
  return createLowPolyClusterMesh(id, center, radius * profile.radius, "leaf", {
    scale: profile.scale.map((value) => value * randomBetween(random, 0.92, 1.08)),
    rotation: randomBetween(random, 0, Math.PI * 2),
    irregularity: profile.irregularity,
    random
  });
}

function countBranches(meshes) { return meshes.filter((mesh) => /^branch-\d+$/.test(mesh.id)).length; }
function foliageMeshes(meshes) { return meshes.filter((mesh) => mesh.id.includes("canopy") || mesh.id.startsWith("crown-")); }

export function generate(request = {}) {
  const seed = String(request.seed ?? "tree-default").trim();
  if (!seed) throw new TypeError("Tree generation requires a non-empty seed.");
  const params = normalizeParameters(parameterSchema, request.params);
  const random = createSeededRandom(seed);
  const profile = SHAPES[params.shape];
  const height = params.height * randomBetween(random, 0.985, 1.015);
  const trunkTop = height * 0.91;
  const meshes = [createCylinderMesh("trunk", [0, 0, 0], [0, trunkTop, 0], params.trunkRadius, 14, "bark")];
  const branchTips = [];
  const canopyCenters = [];
  const canopyBaseRadius = height * 0.175 * (0.92 + params.canopyDensity * 0.2);

  for (let index = 0; index < params.branchCount; index += 1) {
    const band = params.branchCount === 1 ? 0.5 : index / (params.branchCount - 1);
    const y = height * (0.40 + band * 0.34) + randomBetween(random, -0.06, 0.06) * height;
    const angle = index * (Math.PI * 2 / params.branchCount) + randomBetween(random, -0.42, 0.42);
    const reach = height * randomBetween(random, 0.16, 0.22);
    const lift = height * randomBetween(random, 0.055, 0.11);
    const tip = [Math.cos(angle) * reach, y + lift, Math.sin(angle) * reach];
    branchTips.push(tip);
    meshes.push(createBeamMesh(`branch-${index + 1}`, [0, y, 0], tip, params.trunkRadius * randomBetween(random, 0.32, 0.46), params.trunkRadius * 0.30, "bark"));

    const clusterCount = Math.max(2, Math.round(1.6 + params.canopyDensity * 1.45));
    for (let cluster = 0; cluster < clusterCount; cluster += 1) {
      const radius = canopyBaseRadius * randomBetween(random, 0.88, 1.12);
      const offsetScale = radius * (0.17 + (1.25 - params.canopyDensity) * 0.08);
      const center = [
        tip[0] + randomBetween(random, -offsetScale, offsetScale),
        tip[1] + randomBetween(random, -offsetScale * 0.35, offsetScale * 0.6),
        tip[2] + randomBetween(random, -offsetScale, offsetScale)
      ];
      canopyCenters.push(center);
      meshes.push(foliageMesh(`branch-${index + 1}-canopy-${cluster + 1}`, center, radius, profile, random));
    }
  }

  const crownCount = Math.round(2 + params.canopyDensity * 1.5);
  for (let index = 0; index < crownCount; index += 1) {
    const angle = index * Math.PI * 2 / crownCount + randomBetween(random, -0.35, 0.35);
    const radial = height * randomBetween(random, 0.025, 0.075);
    const center = [Math.cos(angle) * radial, height * randomBetween(random, 0.75, 0.87), Math.sin(angle) * radial];
    canopyCenters.push(center);
    meshes.push(foliageMesh(`crown-${index + 1}`, center, canopyBaseRadius * randomBetween(random, 1.02, 1.2), profile, random));
  }

  return createArtifact({
    kitId: manifest.id,
    domainPath: manifest.domainPath,
    seed,
    params,
    meshes,
    materials: palette(random),
    metadata: { recognizableAs: "broadleaf tree", branchTips, canopyCenters, shape: params.shape }
  });
}

export function validate(artifact) {
  const shape = validateArtifactShape(artifact);
  const branches = countBranches(artifact?.meshes ?? []);
  const foliage = foliageMeshes(artifact?.meshes ?? []);
  const ids = new Set((artifact?.meshes ?? []).map((mesh) => mesh.id));
  const foliageBounds = meshBounds(foliage);
  const treeHeight = artifact?.bounds?.size?.[1] ?? 0;
  const canopyWidth = Math.max(foliageBounds.size[0] ?? 0, foliageBounds.size[2] ?? 0);
  const canopyBottom = foliageBounds.min[1] ?? 0;
  const canopyTop = foliageBounds.max[1] ?? 0;
  const checks = [
    ...shape.checks,
    { id: "identity:trunk", pass: ids.has("trunk"), detail: "grounded trunk" },
    { id: "structure:branch-count", pass: branches >= 4 && branches <= 6, detail: `branches=${branches}` },
    { id: "identity:canopy", pass: foliage.length >= branches * 2, detail: `foliage=${foliage.length}` },
    { id: "silhouette:canopy-width", pass: treeHeight > 0 && canopyWidth >= treeHeight * 0.32, detail: `width=${canopyWidth.toFixed(2)} height=${treeHeight.toFixed(2)}` },
    { id: "silhouette:canopy-zone", pass: treeHeight > 0 && canopyBottom >= treeHeight * 0.22 && canopyBottom <= treeHeight * 0.55 && canopyTop >= treeHeight * 0.76, detail: `bottom=${canopyBottom.toFixed(2)} top=${canopyTop.toFixed(2)}` },
    { id: "bounds:healthy", pass: (artifact?.bounds?.size ?? []).every((value) => Number.isFinite(value) && value > 0), detail: (artifact?.bounds?.size ?? []).map((value) => value.toFixed(2)).join("x") }
  ];
  return { valid: checks.every((check) => check.pass), checks, deterministicHash: artifact?.deterministicHash ?? null };
}

export function reroll(request = {}) {
  let entropy = request.entropy;
  if (entropy == null) {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      entropy = `${values[0]}:${values[1]}`;
    } else entropy = `${Date.now()}:${Math.random()}`;
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
