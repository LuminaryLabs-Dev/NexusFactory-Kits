import { sha256 } from "./foundation/hash.js";
import { meshBounds, triangleCount } from "./foundation/geometry.js";

export const ARTIFACT_SCHEMA = "nexusfactory.artifact/1";
export const REGISTRY_SCHEMA = "nexusfactory.registry/1";

export function normalizeNumber(value, descriptor) {
  const numeric = Number(value ?? descriptor.default);
  if (!Number.isFinite(numeric)) throw new TypeError(`Parameter ${descriptor.id} must be finite.`);
  const clamped = Math.min(descriptor.maximum, Math.max(descriptor.minimum, numeric));
  return descriptor.type === "integer" ? Math.round(clamped) : clamped;
}

export function normalizeParameters(schema, input = {}) {
  return Object.fromEntries(schema.map((descriptor) => [descriptor.id, normalizeNumber(input[descriptor.id], descriptor)]));
}

export function normalizeEditorDescriptor(editor = {}) {
  return Object.freeze({
    preview: editor.preview ?? "none",
    inspector: editor.inspector ?? "schema",
    surfaces: Object.freeze([...(editor.surfaces ?? [])])
  });
}

export function createArtifact({ kitId, domainPath, seed, params, meshes, materials, timeline = [], metadata = {} }) {
  const bounds = meshBounds(meshes);
  const base = {
    schemaVersion: ARTIFACT_SCHEMA,
    kitId,
    domainPath,
    seed: String(seed),
    params,
    meshes,
    materials,
    timeline,
    bounds,
    statistics: { meshCount: meshes.length, triangleCount: triangleCount(meshes), animationTrackCount: timeline.length },
    metadata
  };
  return Object.freeze({ ...base, deterministicHash: sha256(base) });
}

export function validateArtifactShape(artifact) {
  const checks = [];
  const add = (id, pass, detail = "") => checks.push({ id, pass: Boolean(pass), detail });
  add("schema", artifact?.schemaVersion === ARTIFACT_SCHEMA, artifact?.schemaVersion ?? "missing");
  add("kit", typeof artifact?.kitId === "string" && artifact.kitId.length > 0);
  add("seed", typeof artifact?.seed === "string" && artifact.seed.length > 0);
  add("meshes", Array.isArray(artifact?.meshes) && artifact.meshes.length > 0);
  add("hash", typeof artifact?.deterministicHash === "string" && artifact.deterministicHash.startsWith("sha256:"));
  if (Array.isArray(artifact?.meshes)) {
    for (const mesh of artifact.meshes) {
      add(`mesh:${mesh.id}:positions`, Array.isArray(mesh.positions) && mesh.positions.length % 3 === 0);
      add(`mesh:${mesh.id}:indices`, Array.isArray(mesh.indices) && mesh.indices.length % 3 === 0);
      add(`mesh:${mesh.id}:finite`, (mesh.positions ?? []).every(Number.isFinite));
    }
  }
  return { valid: checks.every((check) => check.pass), checks };
}
