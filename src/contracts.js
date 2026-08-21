import { sha256 } from "./foundation/hash.js";
import { computeMeshNormals, meshBounds, triangleCount } from "./foundation/geometry.js";

export const ARTIFACT_SCHEMA = "nexusfactory.artifact/1";
export const REGISTRY_SCHEMA = "nexusfactory.registry/1";
export const GENERATION_STATE_SCHEMA = "nexusfactory.generation-state/1";
export const EXPORT_RESULT_SCHEMA = "nexusfactory.export-result/1";

export function normalizeNumber(value, descriptor) {
  const numeric = Number(value ?? descriptor.default);
  if (!Number.isFinite(numeric)) throw new TypeError(`Parameter ${descriptor.id} must be finite.`);
  const clamped = Math.min(descriptor.maximum, Math.max(descriptor.minimum, numeric));
  return descriptor.type === "integer" ? Math.round(clamped) : clamped;
}
export function normalizeParameter(value, descriptor) {
  if (descriptor.type === "enum" || descriptor.type === "select" || Array.isArray(descriptor.options)) {
    const options = (descriptor.options ?? []).map((option) => typeof option === "object" ? String(option.value) : String(option));
    const fallback = String(descriptor.default ?? options[0] ?? "");
    const candidate = String(value ?? fallback);
    if (!options.includes(candidate)) throw new RangeError(`Parameter ${descriptor.id} must be one of: ${options.join(", ")}.`);
    return candidate;
  }
  return normalizeNumber(value, descriptor);
}
export function normalizeParameters(schema, input = {}) { return Object.fromEntries(schema.map((descriptor) => [descriptor.id, normalizeParameter(input[descriptor.id], descriptor)])); }
export function normalizeEditorDescriptor(editor = {}) { return Object.freeze({ preview:editor.preview??"none", inspector:editor.inspector??"schema", surfaces:Object.freeze([...(editor.surfaces??[])]) }); }

function normalizeMesh(source) {
  const mesh = { ...source, positions: [...(source.positions ?? [])], indices: [...(source.indices ?? [])] };
  mesh.normals = Array.isArray(source.normals) && source.normals.length === mesh.positions.length ? [...source.normals] : computeMeshNormals(mesh);
  return Object.freeze(mesh);
}

export function createArtifact({ kitId, domainPath, seed, params, meshes, materials, timeline = [], metadata = {} }) {
  const normalizedMeshes = (meshes ?? []).map(normalizeMesh);
  const bounds = meshBounds(normalizedMeshes);
  const base = { schemaVersion:ARTIFACT_SCHEMA, kitId, domainPath, seed:String(seed), params, meshes:normalizedMeshes, materials, timeline, bounds, statistics:{ meshCount:normalizedMeshes.length, triangleCount:triangleCount(normalizedMeshes), animationTrackCount:timeline.length }, metadata };
  return Object.freeze({ ...base, deterministicHash: sha256(base) });
}

export function createImageArtifact({ kitId, domainPath, seed, params, image, statistics = {}, metadata = {} }) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0) throw new TypeError("Image artifact requires positive integer width and height.");
  if (image.pixelFormat !== "rgba8" || typeof image.rgbaBase64 !== "string") throw new TypeError("Image artifact requires rgba8 base64 pixel data.");
  const normalizedImage = Object.freeze({ width:image.width, height:image.height, channels:4, pixelFormat:"rgba8", rgbaBase64:image.rgbaBase64, transparent:image.transparent === true, sampling:image.sampling ?? "nearest" });
  const base = { schemaVersion:ARTIFACT_SCHEMA, artifactKind:"image", kitId, domainPath, seed:String(seed), params, image:normalizedImage, statistics:{ pixelCount:image.width*image.height, ...statistics }, metadata };
  return Object.freeze({ ...base, deterministicHash: sha256(base) });
}

export function createGenerationState({ kitId, domainPath, seed, params, phaseOrder = [] }) {
  return { schemaVersion:GENERATION_STATE_SCHEMA, kitId, domainPath, seed:String(seed), params:structuredClone(params), phaseOrder:[...phaseOrder], completedPhases:["spec"], outputs:{}, artifact:null, validation:null };
}
export function inspectGenerationState(state) {
  if (state?.schemaVersion !== GENERATION_STATE_SCHEMA) throw new TypeError("Unsupported generation state.");
  return structuredClone({ schemaVersion:state.schemaVersion, kitId:state.kitId, domainPath:state.domainPath, seed:state.seed, params:state.params, phaseOrder:state.phaseOrder, completedPhases:state.completedPhases, outputs:Object.fromEntries(Object.entries(state.outputs ?? {}).map(([key, value]) => [key, { available:value != null }])), artifactHash:state.artifact?.deterministicHash ?? null, validation:state.validation });
}

export function randomizeParameters({ schema, input = {}, parameterIds = [], random }) {
  if (typeof random !== "function") throw new TypeError("randomizeParameters requires random().");
  const selected = new Set(parameterIds.map(String));
  const normalized = normalizeParameters(schema, input);
  for (const descriptor of schema) {
    if (!selected.has(String(descriptor.id))) continue;
    if (descriptor.type === "enum" || descriptor.type === "select" || Array.isArray(descriptor.options)) {
      const options = (descriptor.options ?? []).map((option) => typeof option === "object" ? option.value : option);
      normalized[descriptor.id] = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
      continue;
    }
    const step = Number(descriptor.step ?? (descriptor.type === "integer" ? 1 : 0));
    const raw = descriptor.minimum + (descriptor.maximum - descriptor.minimum) * random();
    let next = step > 0 ? Math.round((raw - descriptor.minimum) / step) * step + descriptor.minimum : raw;
    next = Math.min(descriptor.maximum, Math.max(descriptor.minimum, next));
    normalized[descriptor.id] = descriptor.type === "integer" ? Math.round(next) : Number(next.toFixed(8));
  }
  return normalized;
}

export function createExportResult({ format, mimeType, fileName, bytes, text }) {
  if (!format || !mimeType || !fileName) throw new TypeError("Export result requires format, mimeType and fileName.");
  if (bytes == null && text == null) throw new TypeError("Export result requires bytes or text.");
  if (bytes != null && !(bytes instanceof Uint8Array)) throw new TypeError("Export bytes must be Uint8Array.");
  return Object.freeze({ schemaVersion:EXPORT_RESULT_SCHEMA, format:String(format), mimeType:String(mimeType), fileName:String(fileName), ...(bytes != null ? { bytes } : { text:String(text) }) });
}

export function validateArtifactShape(artifact) {
  const checks=[]; const add=(id,pass,detail="")=>checks.push({id,pass:Boolean(pass),detail});
  add("schema",artifact?.schemaVersion===ARTIFACT_SCHEMA,artifact?.schemaVersion??"missing");
  add("kit",typeof artifact?.kitId==="string"&&artifact.kitId.length>0);
  add("seed",typeof artifact?.seed==="string"&&artifact.seed.length>0);
  add("hash",typeof artifact?.deterministicHash==="string"&&artifact.deterministicHash.startsWith("sha256:"));
  if (artifact?.artifactKind === "image") {
    add("image:width",Number.isInteger(artifact?.image?.width)&&artifact.image.width>0);
    add("image:height",Number.isInteger(artifact?.image?.height)&&artifact.image.height>0);
    add("image:channels",artifact?.image?.channels===4);
    add("image:format",artifact?.image?.pixelFormat==="rgba8");
    add("image:data",typeof artifact?.image?.rgbaBase64==="string"&&artifact.image.rgbaBase64.length>0);
  } else {
    add("meshes",Array.isArray(artifact?.meshes)&&artifact.meshes.length>0);
    if(Array.isArray(artifact?.meshes)) for(const mesh of artifact.meshes){
      add(`mesh:${mesh.id}:positions`,Array.isArray(mesh.positions)&&mesh.positions.length%3===0);
      add(`mesh:${mesh.id}:indices`,Array.isArray(mesh.indices)&&mesh.indices.length%3===0);
      add(`mesh:${mesh.id}:finite`,(mesh.positions??[]).every(Number.isFinite));
      add(`mesh:${mesh.id}:normals`,Array.isArray(mesh.normals)&&mesh.normals.length===mesh.positions.length);
      add(`mesh:${mesh.id}:normal-finite`,(mesh.normals??[]).every(Number.isFinite));
    }
  }
  return { valid:checks.every((check)=>check.pass), checks };
}
