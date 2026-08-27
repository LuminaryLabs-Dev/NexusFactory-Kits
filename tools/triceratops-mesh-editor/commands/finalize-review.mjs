#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as factory from '../services/factory-service.mjs';
import { applyJsonPatch } from '../services/transaction-service.mjs';
import { MeshStateManager } from '../services/state-service.mjs';
import { fileSha256, geometrySha256, writeJson } from '../services/io-service.mjs';
import { createContactSheet, renderOrbit } from '../services/render-service.mjs';

const runRoot = path.resolve('output/guided-review-50');
const outputRoot = path.resolve('output/triceratops-guided-final');
const state = JSON.parse(fs.readFileSync(path.join(runRoot, 'state.json'), 'utf8'));
const prepared = JSON.parse(fs.readFileSync(path.join(runRoot, 'prepared-baseline.json'), 'utf8'));
if (state.completedLoop !== 50 || state.loopSummaries.length !== 50) throw new Error('The guided run is incomplete');
if (state.transactions.length !== state.acceptedImprovements) throw new Error('Accepted transaction count does not match state');

const runtime = factory.createFactoryRuntime();
const kit = runtime.resolveKit();
const finalResult = await factory.generate({ document: state.document, forceClean: true });
const repeatResult = await factory.generate({ document: state.document, forceClean: true });
const validation = await factory.validate(finalResult);
if (validation.verdict !== 'pass') throw new Error(`Final topology failed: ${validation.failures.join(', ')}`);
const finalHash = geometrySha256(finalResult.outputs.body.geometry);
if (geometrySha256(repeatResult.outputs.body.geometry) !== finalHash) throw new Error('Clean geometry regeneration is not deterministic');

let replayDocument = structuredClone(prepared);
for (const transaction of state.transactions) {
  replayDocument = applyJsonPatch(replayDocument, transaction.patch).document;
  replayDocument.revision = transaction.baseRevision + 1;
}
const replayResult = await factory.generate({ document: replayDocument, forceClean: true });
const replayHash = geometrySha256(replayResult.outputs.body.geometry);
if (replayHash !== finalHash) throw new Error('Transaction replay does not reproduce the final geometry');

const manager = new MeshStateManager({
  document: prepared,
  evaluator: runtime.evaluator,
  validateResult: async (result) => factory.validate({ ...result, kit })
});
await manager.initialize();
const baselineHash = geometrySha256(manager.committedResult.outputs.body.geometry);
for (const transaction of state.transactions) {
  await manager.preview({ ...transaction, baseRevision: manager.revision, mode: 'preview' });
  await manager.commit(transaction.transactionId);
}
const incrementalHash = geometrySha256(manager.committedResult.outputs.body.geometry);
await manager.undo();
const undoHash = geometrySha256(manager.committedResult.outputs.body.geometry);
await manager.redo();
const redoHash = geometrySha256(manager.committedResult.outputs.body.geometry);
if (incrementalHash !== finalHash || redoHash !== finalHash || undoHash === finalHash) throw new Error('Incremental replay, undo, or redo proof failed');

fs.mkdirSync(outputRoot, { recursive: true });
const profile = structuredClone(kit.reviewProfile);
profile.capture.width = 640;
profile.capture.height = 640;
profile.capture.startAzimuth = 140;
profile.capture.elevation = 18;
profile.orbitViews = 10;
const baselineResult = await factory.generate({ document: prepared, forceClean: true });
const baselineOrbit = await renderOrbit(baselineResult, path.join(outputRoot, 'baseline-orbit'), profile);
const finalOrbit = await renderOrbit(finalResult, path.join(outputRoot, 'final-orbit'), profile);
if (!baselineOrbit.allVisible || !finalOrbit.allVisible) throw new Error('Final high-resolution orbit framing failed');
fs.copyFileSync(finalOrbit.records[0].file, path.join(outputRoot, 'final-reference.png'));

const referencePath = path.resolve(kit.root, kit.reviewProfile.referencePath);
await createContactSheet([
  { file: referencePath, label: 'REFERENCE', detail: 'approved original' },
  { file: baselineOrbit.records[0].file, label: 'BASELINE', detail: 'pre-loop procedural model' },
  { file: finalOrbit.records[0].file, label: 'FINAL', detail: 'Loop 49 incumbent retained at Loop 50', selected: true }
], path.join(outputRoot, 'reference-baseline-final.png'), 3);

const primaryExport = await factory.export(finalResult, { validation, outputRoot: path.join(outputRoot, 'export'), name: 'triceratops-guided-final.glb' });
const repeatExport = await factory.export(finalResult, { validation, outputRoot: path.join(outputRoot, 'export-repeat'), name: 'triceratops-guided-final-repeat.glb' });
if (primaryExport.manifest.glb.sha256 !== repeatExport.manifest.glb.sha256) throw new Error('GLB export is not deterministic');

const candidateRecords = [];
for (let loop = 1; loop <= 50; loop++) {
  const directory = path.join(runRoot, 'loops', String(loop).padStart(2, '0'), 'candidates');
  const files = fs.readdirSync(directory).sort().map((id) => path.join(directory, id, 'candidate.json'));
  if (files.length !== 5) throw new Error(`Loop ${loop} does not contain exactly five candidate records`);
  candidateRecords.push(...files.map((file) => JSON.parse(fs.readFileSync(file, 'utf8'))));
}
const rejected = candidateRecords.filter((candidate) => candidate.validation.verdict !== 'pass');
const feedbackFiles = Array.from({ length: 50 }, (_, index) => path.join(runRoot, 'loops', String(index + 1).padStart(2, '0'), 'review-feedback.json'));
if (!feedbackFiles.every((file) => fs.existsSync(file))) throw new Error('One or more per-loop feedback records are missing');

fs.writeFileSync(path.join(outputRoot, 'accepted-transactions.ndjson'), `${state.transactions.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
writeJson(path.join(outputRoot, 'final-mesh-program.json'), state.document);
writeJson(path.join(outputRoot, 'guided-review-report.json'), {
  schema: 'triceratops-guided-review-report/v1',
  technicalVerdict: 'pass',
  visualVerdict: 'improved-user-approval-required',
  seed: state.document.seed,
  incumbentId: state.incumbentId,
  loops: 50,
  candidates: candidateRecords.length,
  acceptedImprovements: state.acceptedImprovements,
  retainedPhaseGates: state.retainedLoops,
  technicalRejects: rejected.length,
  perLoopFeedbackRecords: feedbackFiles.length,
  reference: { path: referencePath, sha256: fileSha256(referencePath), alwaysFirstInComparisons: true },
  topology: validation,
  determinism: {
    baselineGeometrySha256: baselineHash,
    finalGeometrySha256: finalHash,
    cleanRepeatGeometrySha256: geometrySha256(repeatResult.outputs.body.geometry),
    replayGeometrySha256: replayHash,
    incrementalGeometrySha256: incrementalHash,
    undoChangedHash: undoHash !== finalHash,
    redoGeometrySha256: redoHash,
    glbSha256: primaryExport.manifest.glb.sha256,
    repeatGlbSha256: repeatExport.manifest.glb.sha256,
    pass: true
  },
  lighting: {
    loopReviews: 50,
    timeStatesPerLoop: 8,
    sunPositionsPerLoop: 12,
    expandedCheckpoints: [10, 20, 30, 40, 50],
    checkpointViewsPerLight: 10,
    movingSunFramesPerCheckpoint: 36,
    finalDayCycle: path.join(runRoot, 'checkpoints/50/day-cycle-ten-angle/day-cycle-contact-sheet.png'),
    finalMovingSunVideo: path.join(runRoot, 'checkpoints/50/moving-sun/moving-sun.mp4')
  },
  visualReview: {
    improvements: ['more adult stance', 'clearer brow horns and frill', 'separated toes and joint breaks', 'better shoulder, belly, haunch, and tail-root continuity', 'drier triangular hide response'],
    remainingReferenceGaps: ['muzzle is still too blunt', 'frill rim remains too sparse', 'face lacks the reference sculpture depth', 'toe and claw anatomy remain simplified', 'horn-to-skull integration remains abrupt'],
    finalDecision: 'Retain the Loop 49 incumbent as the technically validated guided-pass result; require user approval before treating it as final art.'
  },
  export: { primary: primaryExport.manifest, repeat: repeatExport.manifest, deterministic: true },
  files: {
    finalReference: path.join(outputRoot, 'final-reference.png'),
    finalOrbit: finalOrbit.contactSheet,
    comparison: path.join(outputRoot, 'reference-baseline-final.png'),
    sourceAst: path.join(outputRoot, 'final-mesh-program.json'),
    transactions: path.join(outputRoot, 'accepted-transactions.ndjson')
  }
});

console.log(JSON.stringify({
  verdict: 'pass',
  visualVerdict: 'improved-user-approval-required',
  loops: 50,
  candidates: candidateRecords.length,
  acceptedImprovements: state.acceptedImprovements,
  retainedPhaseGates: state.retainedLoops,
  technicalRejects: rejected.length,
  geometrySha256: finalHash,
  glbSha256: primaryExport.manifest.glb.sha256,
  triangles: validation.aggregate.totalTriangles,
  outputRoot
}, null, 2));
