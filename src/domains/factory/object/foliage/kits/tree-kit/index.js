import { defineKit } from "../../../../../../domain.js";
import { createArtifact, normalizeParameters, validateArtifactShape } from "../../../../../../contracts.js";
import { createSeededRandom, randomBetween, deriveSeed } from "../../../../../../foundation/random.js";
import { createBeamMesh, createCylinderMesh, createMesh, meshBounds } from "../../../../../../foundation/geometry.js";
import { exportArtifactGlb } from "../../../../../../foundation/glb.js";

const TWO_PI = Math.PI * 2;

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
  metadata: {
    deterministic: true,
    artifactType: "mesh",
    identity: "merged wood structure with one connected, welded, faceted broadleaf crown",
    crownTopology: "single-welded-radial-shell"
  }
});

const SHAPES = {
  rounded: { widthX: 1.0, widthZ: 0.96, crownStart: 0.50, lobeAmplitude: 0.075, asymmetry: 0.035, ringScale: [0.56, 0.83, 0.98, 1.0, 0.90, 0.66] },
  broad: { widthX: 1.18, widthZ: 1.10, crownStart: 0.54, lobeAmplitude: 0.07, asymmetry: 0.035, ringScale: [0.62, 0.90, 1.02, 1.0, 0.86, 0.60] },
  compact: { widthX: 0.88, widthZ: 0.86, crownStart: 0.53, lobeAmplitude: 0.055, asymmetry: 0.025, ringScale: [0.58, 0.82, 0.95, 0.96, 0.84, 0.60] },
  irregular: { widthX: 1.05, widthZ: 0.98, crownStart: 0.49, lobeAmplitude: 0.15, asymmetry: 0.075, ringScale: [0.54, 0.84, 1.0, 0.98, 0.90, 0.64] }
};

function palette(random) {
  const bark = randomBetween(random, -0.025, 0.025);
  const leaf = randomBetween(random, -0.035, 0.035);
  return {
    bark: { baseColor: [0.26 + bark, 0.13 + bark, 0.065, 1], metallic: 0, roughness: 0.9, emissive: [0, 0, 0] },
    leaf: { baseColor: [0.16 + leaf, 0.39 + leaf, 0.12 + leaf * 0.4, 1], metallic: 0, roughness: 0.84, emissive: [0, 0, 0] }
  };
}

function mergeMeshParts(id, parts, material) {
  if (!Array.isArray(parts) || parts.length === 0) throw new TypeError(`Cannot build ${id} without mesh parts.`);
  const merged = { id, material, positions: [], indices: [] };
  for (const part of parts) {
    if (!part || !Array.isArray(part.positions) || !Array.isArray(part.indices)) throw new TypeError(`Invalid mesh part while building ${id}.`);
    const vertexOffset = merged.positions.length / 3;
    merged.positions.push(...part.positions);
    merged.indices.push(...part.indices.map((index) => index + vertexOffset));
  }
  return merged;
}

function clamp01(value) { return Math.max(0, Math.min(1, value)); }

function angularDistance(a, b) {
  const raw = Math.abs(a - b) % TWO_PI;
  return Math.min(raw, TWO_PI - raw);
}

function topologyStats(mesh) {
  const vertexCount = Math.floor((mesh?.positions?.length ?? 0) / 3);
  const triangleCount = Math.floor((mesh?.indices?.length ?? 0) / 3);
  const edges = new Map();
  const adjacency = Array.from({ length: vertexCount }, () => new Set());
  const used = new Set();
  for (let index = 0; index < (mesh?.indices?.length ?? 0); index += 3) {
    const triangle = [mesh.indices[index], mesh.indices[index + 1], mesh.indices[index + 2]];
    for (const vertex of triangle) used.add(vertex);
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const a = triangle[edgeIndex];
      const b = triangle[(edgeIndex + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
      adjacency[a]?.add(b);
      adjacency[b]?.add(a);
    }
  }
  let connectedComponents = 0;
  const visited = new Set();
  for (const start of used) {
    if (visited.has(start)) continue;
    connectedComponents += 1;
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const current = stack.pop();
      for (const next of adjacency[current] ?? []) if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const count of edges.values()) {
    if (count === 1) boundaryEdges += 1;
    else if (count !== 2) nonManifoldEdges += 1;
  }
  return { vertexCount, triangleCount, connectedComponents, boundaryEdges, nonManifoldEdges };
}

function createUnifiedCrownMesh({ height, density, profile, branchTips, random }) {
  const mesh = createMesh("foliage-crown", "leaf");
  const segments = 14;
  const ringT = [0.08, 0.22, 0.39, 0.56, 0.73, 0.89];
  const canopyBottom = height * profile.crownStart;
  const canopyTop = height * randomBetween(random, 0.985, 1.015);
  const crownHeight = Math.max(height * 0.34, canopyTop - canopyBottom);
  const densityT = clamp01((density - 0.7) / (1.25 - 0.7));
  const baseRadius = height * (0.285 + densityT * 0.045);
  const lobeCount = Math.max(4, Math.min(7, branchTips.length + 1));
  const lobePhase = randomBetween(random, 0, TWO_PI);
  const secondaryPhase = randomBetween(random, 0, TWO_PI);
  const asymmetryPhase = randomBetween(random, 0, TWO_PI);
  const asymmetryRadius = baseRadius * profile.asymmetry;

  const branchInfluences = branchTips.map((tip) => ({
    angle: Math.atan2(tip[2], tip[0]),
    radial: Math.hypot(tip[0], tip[2]),
    t: clamp01((tip[1] - canopyBottom) / crownHeight)
  }));

  const pushVertex = (point) => {
    const vertex = mesh.positions.length / 3;
    mesh.positions.push(...point);
    return vertex;
  };

  const bottomCenter = pushVertex([
    Math.cos(asymmetryPhase) * asymmetryRadius * 0.22,
    canopyBottom,
    Math.sin(asymmetryPhase) * asymmetryRadius * 0.22
  ]);

  const rings = [];
  for (let ringIndex = 0; ringIndex < ringT.length; ringIndex += 1) {
    const t = ringT[ringIndex];
    const yBase = canopyBottom + crownHeight * t;
    const profileRadius = profile.ringScale[ringIndex] + densityT * 0.035 * (1 - profile.ringScale[ringIndex]);
    const centerFactor = Math.sin(Math.PI * t);
    const centerX = Math.cos(asymmetryPhase) * asymmetryRadius * centerFactor;
    const centerZ = Math.sin(asymmetryPhase) * asymmetryRadius * centerFactor;
    const ring = [];
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment * TWO_PI / segments;
      const seededFacet = randomBetween(random, -0.035, 0.035) * (profile === SHAPES.irregular ? 1.8 : 1);
      const primaryLobe = Math.sin(angle * lobeCount + lobePhase) * profile.lobeAmplitude;
      const secondaryLobe = Math.sin(angle * Math.max(3, lobeCount - 2) + secondaryPhase) * profile.lobeAmplitude * 0.42;
      let branchBoost = 0;
      for (const influence of branchInfluences) {
        const angleWeight = Math.exp(-Math.pow(angularDistance(angle, influence.angle) / 0.62, 2));
        const verticalWeight = Math.exp(-Math.pow((t - influence.t) / 0.22, 2));
        branchBoost = Math.max(branchBoost, angleWeight * verticalWeight * clamp01(influence.radial / Math.max(baseRadius, 1e-6)) * 0.13);
      }
      const radiusFactor = Math.max(0.42, profileRadius * (1 + primaryLobe + secondaryLobe + seededFacet + branchBoost));
      const xRadius = baseRadius * profile.widthX * radiusFactor;
      const zRadius = baseRadius * profile.widthZ * radiusFactor;
      const yJitter = crownHeight * randomBetween(random, -0.012, 0.012);
      ring.push(pushVertex([
        centerX + Math.cos(angle) * xRadius,
        yBase + yJitter,
        centerZ + Math.sin(angle) * zRadius
      ]));
    }
    rings.push(ring);
  }

  const topCenter = pushVertex([
    Math.cos(asymmetryPhase) * asymmetryRadius * 0.45,
    canopyTop,
    Math.sin(asymmetryPhase) * asymmetryRadius * 0.45
  ]);

  const first = rings[0];
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    mesh.indices.push(bottomCenter, first[next], first[segment]);
  }

  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    const lower = rings[ringIndex];
    const upper = rings[ringIndex + 1];
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      if ((ringIndex + segment) % 2 === 0) {
        mesh.indices.push(lower[segment], upper[next], upper[segment]);
        mesh.indices.push(lower[segment], lower[next], upper[next]);
      } else {
        mesh.indices.push(lower[segment], lower[next], upper[segment]);
        mesh.indices.push(lower[next], upper[next], upper[segment]);
      }
    }
  }

  const last = rings[rings.length - 1];
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    mesh.indices.push(last[segment], last[next], topCenter);
  }

  const topology = topologyStats(mesh);
  return { mesh, topology, canopyBottom, canopyTop, crownHeight, baseRadius, segments, rings: rings.length };
}

export function generate(request = {}) {
  const seed = String(request.seed ?? "tree-default").trim();
  if (!seed) throw new TypeError("Tree generation requires a non-empty seed.");
  const params = normalizeParameters(parameterSchema, request.params);
  const random = createSeededRandom(seed);
  const profile = SHAPES[params.shape];
  const height = params.height * randomBetween(random, 0.985, 1.015);
  const woodParts = [];
  const branchTips = [];
  const crownStart = height * profile.crownStart;
  const branchStart = Math.max(height * 0.50, crownStart + height * 0.015);
  const branchEnd = Math.min(height * 0.72, branchStart + height * 0.19);
  const densityT = clamp01((params.canopyDensity - 0.7) / (1.25 - 0.7));
  const estimatedCrownRadius = height * (0.285 + densityT * 0.045) * Math.max(profile.widthX, profile.widthZ);
  const trunkTop = height * 0.91;
  woodParts.push(createCylinderMesh("trunk", [0, 0, 0], [0, trunkTop, 0], params.trunkRadius, 14, "bark"));

  for (let index = 0; index < params.branchCount; index += 1) {
    const band = params.branchCount === 1 ? 0.5 : index / (params.branchCount - 1);
    const y = branchStart + (branchEnd - branchStart) * band + randomBetween(random, -0.018, 0.018) * height;
    const angle = index * (TWO_PI / params.branchCount) + randomBetween(random, -0.38, 0.38);
    const reach = estimatedCrownRadius * randomBetween(random, 0.52, 0.76);
    const lift = height * randomBetween(random, 0.045, 0.085);
    const tip = [Math.cos(angle) * reach, y + lift, Math.sin(angle) * reach];
    branchTips.push(tip);
    woodParts.push(createBeamMesh(
      `branch-${index + 1}`,
      [0, y, 0],
      tip,
      params.trunkRadius * randomBetween(random, 0.34, 0.48),
      params.trunkRadius * 0.30,
      "bark"
    ));
  }

  const crown = createUnifiedCrownMesh({ height, density: params.canopyDensity, profile, branchTips, random });
  const meshes = [mergeMeshParts("wood-structure", woodParts, "bark"), crown.mesh];

  return createArtifact({
    kitId: manifest.id,
    domainPath: manifest.domainPath,
    seed,
    params,
    meshes,
    materials: palette(random),
    metadata: {
      recognizableAs: "broadleaf tree",
      branchTips,
      shape: params.shape,
      branchCount: params.branchCount,
      submeshes: ["wood-structure", "foliage-crown"],
      crownTopology: {
        type: "single-welded-radial-shell",
        ...crown.topology,
        rings: crown.rings,
        segments: crown.segments
      },
      crownBounds: { bottom: crown.canopyBottom, top: crown.canopyTop, height: crown.crownHeight, baseRadius: crown.baseRadius }
    }
  });
}

export function validate(artifact) {
  const shape = validateArtifactShape(artifact);
  const meshes = artifact?.meshes ?? [];
  const ids = new Set(meshes.map((mesh) => mesh.id));
  const wood = meshes.find((mesh) => mesh.id === "wood-structure");
  const foliage = meshes.find((mesh) => mesh.id === "foliage-crown");
  const foliageBounds = meshBounds(foliage ? [foliage] : []);
  const treeHeight = artifact?.bounds?.size?.[1] ?? 0;
  const canopyWidth = Math.max(foliageBounds.size[0] ?? 0, foliageBounds.size[2] ?? 0);
  const canopyBottom = foliageBounds.min[1] ?? 0;
  const canopyTop = foliageBounds.max[1] ?? 0;
  const branches = Number(artifact?.metadata?.branchCount ?? 0);
  const topology = foliage ? topologyStats(foliage) : { connectedComponents: 0, boundaryEdges: Infinity, nonManifoldEdges: Infinity, vertexCount: 0, triangleCount: 0 };
  const checks = [
    ...shape.checks,
    { id: "structure:two-submeshes", pass: meshes.length === 2 && ids.has("wood-structure") && ids.has("foliage-crown"), detail: `meshes=${meshes.map((mesh) => mesh.id).join(",")}` },
    { id: "identity:wood", pass: Boolean(wood) && wood.material === "bark" && wood.positions.length > 0, detail: "merged trunk and branches" },
    { id: "identity:canopy", pass: Boolean(foliage) && foliage.material === "leaf" && foliage.positions.length > 0, detail: "one connected crown surface" },
    { id: "topology:crown-connected", pass: topology.connectedComponents === 1, detail: `components=${topology.connectedComponents}` },
    { id: "topology:crown-closed", pass: topology.boundaryEdges === 0 && topology.nonManifoldEdges === 0, detail: `boundary=${topology.boundaryEdges} nonManifold=${topology.nonManifoldEdges}` },
    { id: "topology:crown-low-poly", pass: topology.vertexCount >= 50 && topology.vertexCount <= 160 && topology.triangleCount >= 90 && topology.triangleCount <= 260, detail: `vertices=${topology.vertexCount} triangles=${topology.triangleCount}` },
    { id: "structure:branch-count", pass: branches >= 4 && branches <= 6, detail: `branches=${branches}` },
    { id: "silhouette:canopy-width", pass: treeHeight > 0 && canopyWidth >= treeHeight * 0.45, detail: `width=${canopyWidth.toFixed(2)} height=${treeHeight.toFixed(2)}` },
    { id: "silhouette:canopy-zone", pass: treeHeight > 0 && canopyBottom >= treeHeight * 0.42 && canopyBottom <= treeHeight * 0.58 && canopyTop >= treeHeight * 0.94, detail: `bottom=${canopyBottom.toFixed(2)} top=${canopyTop.toFixed(2)}` },
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
