#!/usr/bin/env node
import fs from 'node:fs';
import * as factory from '../services/factory-service.mjs';
import { MeshStateManager } from '../services/state-service.mjs';
import { fileSha256, geometrySha256, writeJson } from '../services/io-service.mjs';

const runtime = factory.createFactoryRuntime();
const kit = runtime.resolveKit();
const result = await factory.generate({ document: kit.document, forceClean: true });
const repeat = await factory.generate({ document: kit.document, forceClean: true });
const validation = await factory.validate(result, { hardGates: kit.reviewProfile.hardGates });
const geometryHash = geometrySha256(result.outputs.body.geometry);
const repeatHash = geometrySha256(repeat.outputs.body.geometry);

const manager = new MeshStateManager({
  document: kit.document,
  evaluator: runtime.evaluator,
  validateResult: async (candidate) => factory.validate({ ...candidate, kit })
});
await manager.initialize();
const baselineHash = geometrySha256(manager.committedResult.outputs.body.geometry);
const transaction = {
  transactionId: 'validation-wider-frill',
  baseRevision: 0,
  mode: 'preview',
  patch: [
    { op: 'replace', path: '/nodes/anatomy.frill-crown/params/radii/2', value: 1.31 },
    { op: 'replace', path: '/nodes/anatomy.shoulder/params/radii/0', value: 1.22 }
  ]
};
const preview = await manager.preview(transaction);
const previewHash = geometrySha256(manager.previewState.result.outputs.body.geometry);
await manager.rollback();
const rollbackHash = geometrySha256(manager.committedResult.outputs.body.geometry);

let staleRejected = false;
try {
  await manager.preview({ ...transaction, transactionId: 'stale', baseRevision: 99 });
} catch (error) {
  staleRejected = error.code === 'STALE_REVISION';
}

let unknownTypeRejected = false;
try {
  const invalid = structuredClone(kit.document);
  invalid.nodes['anatomy.torso'].type = 'runtime.javascript.eval';
  await factory.generate({ document: invalid, forceClean: true });
} catch (error) {
  unknownTypeRejected = error.code === 'UNKNOWN_NODE_TYPE';
}

const checks = {
  topology: validation.verdict === 'pass',
  geometryParity: geometryHash === kit.kit.baseline.geometrySha256,
  deterministicGeometry: geometryHash === repeatHash,
  deterministicSemantic: result.semanticSignature === repeat.semanticSignature,
  triangleParity: validation.aggregate.totalTriangles === kit.kit.baseline.completeAssetTriangles,
  oneStructuralShell: validation.structure.structuralShellMeshes === 1,
  attachmentParity: validation.structure.replaceableAttachmentMeshes === kit.kit.baseline.replaceableAttachments,
  previewChangesGeometry: previewHash !== baselineHash,
  rollbackRestoresGeometry: rollbackHash === baselineHash,
  previewReusesUnaffectedNodes: preview.stages.some((stage) => stage.status === 'reused'),
  staleRevisionRejected: staleRejected,
  unknownNodeTypeRejected: unknownTypeRejected,
  referencePresent: fs.existsSync('kit/references/approved-reference.webp'),
  historyPresent: fs.existsSync('kit/accepted-transactions.ndjson')
};

const report = {
  schema: 'triceratops-mesh-editor-validation/v1',
  verdict: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  candidateStatus: kit.kit.status,
  checks,
  signatures: {
    semantic: result.semanticSignature,
    geometrySha256: geometryHash,
    repeatedGeometrySha256: repeatHash,
    referenceSha256: fileSha256('kit/references/approved-reference.webp'),
    glbSha256: fileSha256('exports/triceratops-reviewed-candidate.glb')
  },
  topology: validation,
  incremental: {
    computed: preview.stages.filter((stage) => stage.status === 'computed').map((stage) => stage.id),
    reused: preview.stages.filter((stage) => stage.status === 'reused').map((stage) => stage.id),
    baselineHash,
    previewHash,
    rollbackHash
  },
  limitations: ['reviewed candidate', 'user art approval required', 'not rigged', 'no animation clips']
};

writeJson('evidence/technical-validation.json', report);
console.log(JSON.stringify({ verdict: report.verdict, checks, signatures: report.signatures }, null, 2));
if (report.verdict !== 'pass') process.exitCode = 1;
