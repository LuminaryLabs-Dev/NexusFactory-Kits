import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeRegistry, IncrementalEvaluator } from './evaluator-service.mjs';
import { registerCoreNodes } from './node-service.mjs';
import { applyJsonPatch, getAtPointer } from './transaction-service.mjs';
import { validateAssetResult } from './validation-service.mjs';
import { exportGlbPackage } from './export-service.mjs';
import { deepClone, namedStream, signature } from './runtime-service.mjs';
import { readJson } from './io-service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultKitRoot = path.join(root, 'kit');
const registry = registerCoreNodes(new NodeRegistry());
const evaluator = new IncrementalEvaluator(registry);

function resolveKit(kitRoot = defaultKitRoot) {
  const resolved = path.resolve(kitRoot);
  const kit = readJson(path.join(resolved, 'kit.json'));
  const document = readJson(path.join(resolved, kit.program));
  const constraints = readJson(path.join(resolved, kit.constraints));
  const reviewProfile = readJson(path.join(resolved, kit.reviewProfile));
  return { root: resolved, kit, document, constraints, reviewProfile };
}

export async function describe(context = {}) {
  const kit = resolveKit(context.kitRoot);
  return {
    factory: readJson(path.join(root, 'kit.manifest.json')),
    kit: kit.kit,
    capabilities: {
      serviceSurface: ['describe', 'generate', 'randomize', 'reroll', 'validate', 'export'],
      interactive: true,
      headless: true,
      transactionalEditing: true,
      incrementalEvaluation: true,
      reviewOrbit: true
    },
    nodeTypes: registry.describe(),
    parameterSchema: kit.constraints,
    stageGraph: kit.document.pipeline,
    outputFormats: ['glb', 'mesh-program-json', 'png', 'json'],
    limits: kit.reviewProfile.hardGates,
    validationClaims: readJson(path.join(root, 'kit.manifest.json')).validationClaims,
    provenance: readJson(path.join(root, 'source-model.json'))
  };
}

export async function generate(request = {}) {
  const kit = resolveKit(request.kitRoot);
  let document = deepClone(request.document ?? kit.document);
  if (request.seed !== undefined) document.seed = Number(request.seed);
  if (request.patch?.length) document = applyJsonPatch(document, request.patch).document;
  const result = await evaluator.evaluate(document, request.context ?? {}, { forceClean: request.forceClean === true });
  return { ...result, kit };
}

function randomizedPatch(document, constraints, seed, groups = null) {
  const patch = [];
  for (const [pointer, rule] of Object.entries(constraints.parameters).sort(([a], [b]) => a.localeCompare(b))) {
    if (groups && !rule.groups?.some((group) => groups.includes(group))) continue;
    const random = namedStream(seed, `parameter:${pointer}`);
    let value;
    if (rule.type === 'number') value = rule.min + (rule.max - rule.min) * random();
    else if (rule.type === 'integer') value = Math.floor(rule.min + (rule.max - rule.min + 1) * random());
    else continue;
    patch.push({ op: 'replace', path: pointer, value });
  }
  return patch;
}

export async function randomize(request = {}) {
  const kit = resolveKit(request.kitRoot);
  const document = deepClone(request.document ?? kit.document);
  const seed = Number(request.seed ?? document.seed);
  const patch = randomizedPatch(document, request.constraints ?? kit.constraints, seed, null);
  const randomized = applyJsonPatch(document, patch).document;
  return { seed, patch, document: randomized, encodingSignature: signature({ seed, patch }) };
}

export async function reroll(request = {}) {
  const kit = resolveKit(request.kitRoot);
  const document = deepClone(request.document ?? kit.document);
  const seed = Number(request.seed ?? document.seed);
  const groups = Array.isArray(request.groups) ? request.groups : [];
  if (!groups.length) throw new Error('reroll requires at least one named parameter group');
  const patch = randomizedPatch(document, request.constraints ?? kit.constraints, seed, groups);
  const rerolled = applyJsonPatch(document, patch).document;
  return { seed, groups, patch, document: rerolled, encodingSignature: signature({ seed, groups, patch }) };
}

export async function validate(result, context = {}) {
  const gates = context.hardGates ?? result.kit?.reviewProfile?.hardGates ?? resolveKit(context.kitRoot).reviewProfile.hardGates;
  return validateAssetResult(result, gates);
}

export async function exportArtifact(result, request = {}) {
  const validation = request.validation ?? await validate(result, request);
  return exportGlbPackage(result, validation, { outputRoot: request.outputRoot ?? path.join(root, 'exports'), name: request.name ?? 'triceratops.glb' });
}

export function inspectParameter(document, pointer) {
  return getAtPointer(document, pointer);
}

export function createFactoryRuntime() {
  return { root, registry, evaluator, resolveKit };
}

export { exportArtifact as export };
