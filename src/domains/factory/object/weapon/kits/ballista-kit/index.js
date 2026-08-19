import { defineKit } from "../../../../../../domain.js";
import { createArtifact, normalizeParameters, validateArtifactShape } from "../../../../../../contracts.js";
import { createSeededRandom, randomBetween, deriveSeed } from "../../../../../../foundation/random.js";
import { createBeamMesh, createBoxMesh, createConeMesh, createCylinderMesh } from "../../../../../../foundation/geometry.js";
import { exportArtifactGlb } from "../../../../../../foundation/glb.js";

const parameterSchema = [
  { id: "scale", label: "Scale", type: "number", minimum: 0.85, maximum: 1.2, default: 1, step: 0.01 },
  { id: "mechanismCount", label: "Mechanism Count", type: "integer", minimum: 2, maximum: 6, default: 3, step: 1 },
  { id: "wear", label: "Wear", type: "number", minimum: 0, maximum: 0.8, default: 0.2, step: 0.01 },
  { id: "armSpan", label: "Arm Span", type: "number", minimum: 2.4, maximum: 4.6, default: 3.4, step: 0.05 },
  { id: "railLength", label: "Rail Length", type: "number", minimum: 2.8, maximum: 5.2, default: 3.8, step: 0.05 }
];

export const manifest = defineKit({
  id: "factory-object-weapon-ballista",
  displayName: "Windup Ballista Turret",
  domainPath: "n:factory:object:weapon",
  requires: ["factory:object:weapon", "factory:seed", "factory:artifact"],
  provides: ["factory:generate", "factory:validate", "factory:variation", "factory:export", "artifact:mesh", "artifact:animation", "seed:deterministic", "editor:parameters", "editor:animation-preview", "export:glb"],
  services: ["describe", "generate", "reroll", "validate", "export"],
  parameterSchema,
  editor: { preview: "mesh-3d", inspector: "schema", surfaces: ["seed", "parameters", "animation", "export", "diagnostics"] },
  runtime: { environments: ["node", "browser", "worker"], permissions: [] },
  source: { module: "src/domains/factory/object/weapon/kits/ballista-kit/index.js", exportName: "kit" },
  metadata: {
    deterministic: true,
    artifactType: "mesh",
    identity: "rotating base, central launch rail, lateral torsion arms, winding drum, string, bolt and ammunition rack",
    provenance: "Object-specific replacement for the historical generic loft ballista candidate."
  }
});

function materialPalette(wear, random) {
  const woodJitter = randomBetween(random, -0.025, 0.025);
  return {
    "dark-wood": { baseColor: [0.24 + woodJitter, 0.11 + woodJitter, 0.045, 1], metallic: 0.05, roughness: 0.62 + wear * 0.3, emissive: [0, 0, 0] },
    "forged-iron": { baseColor: [0.15, 0.16, 0.17, 1], metallic: 0.82, roughness: 0.3 + wear * 0.45, emissive: [0, 0, 0] },
    "rope": { baseColor: [0.31, 0.23, 0.13, 1], metallic: 0, roughness: 0.92, emissive: [0, 0, 0] },
    "bolt-steel": { baseColor: [0.42, 0.45, 0.48, 1], metallic: 0.9, roughness: 0.24 + wear * 0.2, emissive: [0, 0, 0] },
    "state-accent": { baseColor: [0.34, 0.12, 0.045, 1], metallic: 0.5, roughness: 0.4, emissive: [0.08, 0.02, 0] }
  };
}

function generationSeed(request) {
  const seed = String(request?.seed ?? "ballista-default").trim();
  if (!seed) throw new TypeError("Ballista generation requires a non-empty seed.");
  return seed;
}

export function generate(request = {}) {
  const seed = generationSeed(request);
  const params = normalizeParameters(parameterSchema, request.params);
  const random = createSeededRandom(seed);
  const scale = params.scale;
  const armSpan = params.armSpan * scale * randomBetween(random, 0.94, 1.06);
  const railLength = params.railLength * scale * randomBetween(random, 0.96, 1.04);
  const armRise = randomBetween(random, -0.12, 0.16) * scale;
  const armSweep = randomBetween(random, -0.22, 0.22) * scale;
  const centerY = 1.38 * scale;
  const pivotZ = 0.2 * scale;
  const leftEnd = [-armSpan / 2, centerY + 0.18 * scale + armRise, 0.52 * scale + armSweep];
  const rightEnd = [armSpan / 2, centerY + 0.18 * scale - armRise * 0.35, 0.52 * scale - armSweep];
  const carriage = [0, centerY + 0.16 * scale, 1.08 * scale];
  const railFront = 0.18 * scale + railLength / 2;
  const railCenterZ = 0.18 * scale + railLength / 2 - 0.7 * scale;
  const meshes = [];

  meshes.push(createCylinderMesh("rotating-base", [0, 0, 0], [0, 0.28 * scale, 0], 0.88 * scale, 24, "forged-iron"));
  meshes.push(createCylinderMesh("pedestal", [0, 0.28 * scale, 0], [0, 1.02 * scale, 0], 0.42 * scale, 18, "forged-iron"));
  meshes.push(createBoxMesh("central-launch-rail", [0, centerY, railCenterZ], [0.34 * scale, 0.26 * scale, railLength], "dark-wood"));
  meshes.push(createBoxMesh("rail-metal-cap", [0, centerY + 0.15 * scale, railCenterZ], [0.18 * scale, 0.055 * scale, railLength * 0.94], "forged-iron"));
  meshes.push(createCylinderMesh("left-torsion-post", [-0.48 * scale, 0.98 * scale, pivotZ], [-0.48 * scale, 1.7 * scale, pivotZ], 0.12 * scale, 14, "forged-iron"));
  meshes.push(createCylinderMesh("right-torsion-post", [0.48 * scale, 0.98 * scale, pivotZ], [0.48 * scale, 1.7 * scale, pivotZ], 0.12 * scale, 14, "forged-iron"));
  meshes.push(createBeamMesh("left-torsion-arm", [-0.4 * scale, centerY + 0.14 * scale, pivotZ], leftEnd, 0.18 * scale, 0.16 * scale, "dark-wood"));
  meshes.push(createBeamMesh("right-torsion-arm", [0.4 * scale, centerY + 0.14 * scale, pivotZ], rightEnd, 0.18 * scale, 0.16 * scale, "dark-wood"));
  meshes.push(createBeamMesh("left-support-brace", [-0.24 * scale, 0.72 * scale, 0], [-armSpan * 0.38, centerY, 0.35 * scale], 0.1 * scale, 0.09 * scale, "forged-iron"));
  meshes.push(createBeamMesh("right-support-brace", [0.24 * scale, 0.72 * scale, 0], [armSpan * 0.38, centerY, 0.35 * scale], 0.1 * scale, 0.09 * scale, "forged-iron"));
  meshes.push(createCylinderMesh("winding-drum", [-0.52 * scale, 1.02 * scale, -0.48 * scale], [0.52 * scale, 1.02 * scale, -0.48 * scale], 0.22 * scale, 18, "forged-iron"));
  meshes.push(createBeamMesh("crank-handle", [0.55 * scale, 1.02 * scale, -0.48 * scale], [0.86 * scale, 1.27 * scale, -0.62 * scale], 0.07 * scale, 0.07 * scale, "state-accent"));
  meshes.push(createBoxMesh("release-carriage", carriage, [0.42 * scale, 0.19 * scale, 0.5 * scale], "forged-iron"));
  meshes.push(createBeamMesh("left-bowstring", leftEnd, carriage, 0.035 * scale, 0.035 * scale, "rope"));
  meshes.push(createBeamMesh("right-bowstring", rightEnd, carriage, 0.035 * scale, 0.035 * scale, "rope"));

  const boltStart = [0, centerY + 0.25 * scale, 0.88 * scale];
  const boltEnd = [0, centerY + 0.25 * scale, railFront];
  meshes.push(createCylinderMesh("loaded-bolt-shaft", boltStart, boltEnd, 0.035 * scale, 10, "bolt-steel"));
  meshes.push(createConeMesh("loaded-bolt-head", boltEnd, [0, boltEnd[1], boltEnd[2] + 0.28 * scale], 0.1 * scale, 10, "bolt-steel"));

  for (let index = 0; index < params.mechanismCount; index += 1) {
    const z = (-0.4 + index * 0.32) * scale;
    const x = -0.68 * scale;
    meshes.push(createCylinderMesh(`rack-bolt-${index + 1}`, [x, 1.16 * scale, z], [x, 1.16 * scale, z + 0.78 * scale], 0.024 * scale, 8, "bolt-steel"));
  }

  const materials = materialPalette(params.wear, random);
  const timeline = [
    { clipId: "Ballista_Wind", target: "winding-drum", path: "rotation", axis: "x", keyframes: [{ time: 0, value: 0 }, { time: 1.5, value: Math.PI * 2 }, { time: 3, value: Math.PI * 4 }] },
    { clipId: "Ballista_Wind", target: "release-carriage", path: "translation", axis: "z", keyframes: [{ time: 0, value: 0.45 }, { time: 3, value: -0.4 }] },
    { clipId: "Ballista_Fire", target: "release-carriage", path: "translation", axis: "z", keyframes: [{ time: 0, value: -0.4 }, { time: 0.25, value: 1.25 }, { time: 0.7, value: 0.45 }] },
    { clipId: "Ballista_Fire", target: "left-torsion-arm", path: "rotation", axis: "y", keyframes: [{ time: 0, value: -0.14 }, { time: 0.25, value: 0.12 }, { time: 0.7, value: 0 }] },
    { clipId: "Ballista_Fire", target: "right-torsion-arm", path: "rotation", axis: "y", keyframes: [{ time: 0, value: 0.14 }, { time: 0.25, value: -0.12 }, { time: 0.7, value: 0 }] },
    { clipId: "Ballista_Reload", target: "loaded-bolt-shaft", path: "translation", axis: "z", keyframes: [{ time: 0, value: 0.8 }, { time: 2.5, value: 0 }] }
  ];

  return createArtifact({
    kitId: manifest.id,
    domainPath: manifest.domainPath,
    seed,
    params,
    meshes,
    materials,
    timeline,
    metadata: {
      identitySignals: ["long central launch rail", "two lateral torsion arms", "rotating base", "winding drum", "bowstring", "loaded bolt"],
      recognizableAs: "ballista turret"
    }
  });
}

export function validate(artifact) {
  const shape = validateArtifactShape(artifact);
  const ids = new Set((artifact?.meshes ?? []).map((mesh) => mesh.id));
  const required = ["rotating-base", "central-launch-rail", "left-torsion-arm", "right-torsion-arm", "winding-drum", "left-bowstring", "right-bowstring", "loaded-bolt-shaft"];
  const identityChecks = required.map((id) => ({ id: `identity:${id}`, pass: ids.has(id), detail: id }));
  const size = artifact?.bounds?.size ?? [0, 0, 0];
  const silhouette = { id: "identity:crossbow-silhouette", pass: size[0] > 2 && size[2] > 2 && size[1] > 0.8, detail: `bounds=${size.map((v) => v.toFixed(2)).join("x")}` };
  const animation = { id: "animation:wind-fire-reload", pass: new Set((artifact?.timeline ?? []).map((track) => track.clipId)).size >= 3, detail: `${artifact?.timeline?.length ?? 0} tracks` };
  const checks = [...shape.checks, ...identityChecks, silhouette, animation];
  return { valid: checks.every((check) => check.pass), checks, deterministicHash: artifact?.deterministicHash ?? null };
}

export function reroll(request = {}) {
  let entropy = request.entropy;
  if (entropy == null) {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      entropy = `${values[0].toString(16)}${values[1].toString(16)}`;
    } else entropy = `${Date.now()}:${Math.random()}`;
  }
  const seed = deriveSeed(request.seed ?? "ballista", entropy);
  return { seed, artifact: generate({ seed, params: request.params }) };
}

export function exportArtifact(artifact, format = "glb") {
  if (format === "glb") return exportArtifactGlb(artifact);
  if (format === "json") return JSON.stringify(artifact, null, 2);
  throw new RangeError(`Unsupported ballista export format: ${format}`);
}

export const kit = Object.freeze({
  manifest,
  services: Object.freeze({
    describe: () => structuredClone(manifest),
    generate,
    reroll,
    validate,
    export: exportArtifact
  })
});
export default kit;
