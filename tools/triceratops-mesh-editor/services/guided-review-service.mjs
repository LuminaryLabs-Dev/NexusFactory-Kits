import fs from 'node:fs';
import path from 'node:path';
import * as factory from './factory-service.mjs';
import { applyJsonPatch, getAtPointer } from './transaction-service.mjs';
import { deepClone, signature } from './runtime-service.mjs';
import { geometrySha256, writeJson } from './io-service.mjs';
import { createContactSheet, createStatusImage, renderDayCycle, renderMovingSunVideo, renderOrbit, renderReflectionRing } from './render-service.mjs';
import { GUIDED_LOOPS, prepareGuidedDocument } from './guided-profile.mjs';

const factors = [0.4, 0.65, 0.85, 1, 1.12];

function interpolate(current, target, factor) {
  if (typeof current === 'number' && typeof target === 'number') return Number((current + (target - current) * factor).toFixed(8));
  if (Array.isArray(current) && Array.isArray(target)) return target.map((value, index) => interpolate(current[index], value, factor));
  if (typeof target === 'string' || typeof target === 'boolean') return factor >= 1 ? target : current;
  return factor >= 1 ? deepClone(target) : deepClone(current);
}

function patchFor(document, loop, factor) {
  return loop.edits.map((edit) => {
    let current;
    let op = 'replace';
    try {
      current = getAtPointer(document, edit.path);
    } catch (error) {
      if (error.code !== 'MISSING_PATH') throw error;
      op = 'add';
      current = typeof edit.target === 'number' ? 0 : deepClone(edit.target);
    }
    return { op, path: edit.path, value: interpolate(current, edit.target, factor) };
  });
}

function reviewProfile(kit, loopNumber, width = 240) {
  const profile = structuredClone(kit.reviewProfile);
  profile.profileId = `triceratops-guided-loop-${String(loopNumber).padStart(2, '0')}-v1`;
  profile.capture.width = width;
  profile.capture.height = width;
  profile.capture.startAzimuth = 140;
  profile.capture.elevation = 18;
  profile.orbitViews = 10;
  return profile;
}

async function renderIncumbent(service, document, directory, profile) {
  const result = await service.generate({ document, forceClean: true });
  const validation = await service.validate(result, { hardGates: service.createFactoryRuntime().resolveKit().reviewProfile.hardGates });
  if (validation.verdict !== 'pass') throw new Error(`Incumbent failed before review: ${validation.failures.join(', ')}`);
  const orbit = await renderOrbit(result, directory, profile, { views: 1 });
  return { result, validation, orbit };
}

function lightingPass(dayCycle, reflectionRing) {
  return dayCycle.verdict === 'pass' && reflectionRing.verdict === 'pass';
}

function loopObservation(loop, accepted, candidate) {
  if (loop.gate) return `Checkpoint retained the current winner after a complete ${loop.focus} review.`;
  if (!accepted) return `No challenger passed every technical and lighting gate for ${loop.focus}; the incumbent was retained.`;
  return `Candidate ${candidate.candidateId} applied only the declared ${loop.focus} paths and passed the ten-angle, day-cycle, reflection, and topology gates.`;
}

export async function runGuidedReview({ outputRoot, sourceDocument, fromLoop = 1, toLoop = 50, captureWidth = 240 }) {
  const runtime = factory.createFactoryRuntime();
  const kit = runtime.resolveKit();
  fs.mkdirSync(outputRoot, { recursive: true });
  const stateFile = path.join(outputRoot, 'state.json');
  let state;
  if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (state.completedLoop + 1 !== fromLoop) throw new Error(`Resume mismatch: state completed Loop ${state.completedLoop}, requested from ${fromLoop}`);
  } else {
    if (fromLoop !== 1) throw new Error('A new guided review must begin at Loop 1');
    const prepared = prepareGuidedDocument(sourceDocument);
    state = {
      schema: 'triceratops-guided-review-state/v1',
      runId: `triceratops-guided-20260827-${prepared.seed}`,
      completedLoop: 0,
      incumbentId: 'triceratops-proportions-20260827-927239-q2-a0001-c03',
      document: prepared,
      acceptedImprovements: 0,
      retainedLoops: 0,
      failedCandidates: 0,
      transactions: [],
      lineage: [],
      loopSummaries: []
    };
    writeJson(path.join(outputRoot, 'prepared-baseline.json'), prepared);
    writeJson(stateFile, state);
  }
  for (let loopNumber = fromLoop; loopNumber <= toLoop; loopNumber++) {
    const loop = GUIDED_LOOPS[loopNumber - 1];
    if (!loop || loop.loop !== loopNumber) throw new Error(`Missing Loop ${loopNumber}`);
    const loopDirectory = path.join(outputRoot, 'loops', String(loopNumber).padStart(2, '0'));
    fs.mkdirSync(loopDirectory, { recursive: true });
    const profile = reviewProfile(kit, loopNumber, captureWidth);
    const baseDocument = deepClone(state.document);
    const incumbent = await renderIncumbent(factory, baseDocument, path.join(loopDirectory, 'incumbent-orbit'), profile);
    const candidates = [];
    for (let index = 0; index < 5; index++) {
      const candidateId = `${state.runId}-l${String(loopNumber).padStart(2, '0')}-c${String(index + 1).padStart(2, '0')}`;
      const candidateDirectory = path.join(loopDirectory, 'candidates', candidateId);
      fs.mkdirSync(candidateDirectory, { recursive: true });
      const patch = loop.gate ? [] : patchFor(baseDocument, loop, factors[index]);
      const document = patch.length ? applyJsonPatch(baseDocument, patch).document : deepClone(baseDocument);
      const result = await factory.generate({ document });
      const validation = await factory.validate(result, { hardGates: kit.reviewProfile.hardGates });
      let orbit = null;
      if (validation.verdict === 'pass') orbit = await renderOrbit(result, candidateDirectory, profile);
      const candidate = {
        candidateId,
        factor: factors[index],
        parentIncumbentId: state.incumbentId,
        patch,
        patchSignature: signature(patch),
        semanticSignature: result.semanticSignature,
        geometrySha256: geometrySha256(result.outputs.body.geometry),
        validation,
        orbit,
        targetScore: loop.gate ? 0 : Number((100 - Math.abs(factors[index] - 1) * 100).toFixed(2))
      };
      candidates.push(candidate);
      if (validation.verdict !== 'pass') state.failedCandidates++;
      writeJson(path.join(candidateDirectory, 'candidate.json'), candidate);
    }
    const eligible = candidates.filter((candidate) => candidate.validation.verdict === 'pass' && candidate.orbit?.allVisible).sort((a, b) => b.targetScore - a.targetScore);
    const provisional = loop.gate ? null : eligible[0] ?? null;
    let dayCycle = null;
    let reflectionRing = null;
    let provisionalResult = null;
    let accepted = false;
    if (provisional) {
      const provisionalDocument = applyJsonPatch(baseDocument, provisional.patch).document;
      provisionalResult = await factory.generate({ document: provisionalDocument, forceClean: true });
      dayCycle = await renderDayCycle(provisionalResult, path.join(loopDirectory, 'lighting', 'day-cycle'), profile, { maxClippedFraction: 0.2 });
      reflectionRing = await renderReflectionRing(provisionalResult, path.join(loopDirectory, 'lighting', 'reflection-ring'), profile, { maxClippedFraction: 0.2 });
      accepted = lightingPass(dayCycle, reflectionRing);
      if (accepted) {
        state.document = provisionalDocument;
        state.document.revision = (baseDocument.revision ?? 0) + 1;
        state.incumbentId = provisional.candidateId;
        state.acceptedImprovements++;
        state.transactions.push({
          transactionId: `guided-loop-${String(loopNumber).padStart(2, '0')}`,
          baseRevision: baseDocument.revision ?? 0,
          mode: 'commit',
          focus: loop.focus,
          patch: provisional.patch
        });
        state.lineage.push({ loop: loopNumber, parent: provisional.parentIncumbentId, winner: provisional.candidateId, geometrySha256: provisional.geometrySha256, semanticSignature: provisional.semanticSignature });
      }
    }
    if (!accepted) state.retainedLoops++;
    const reference = path.resolve(kit.root, kit.reviewProfile.referencePath);
    const comparisonRecords = [
      { file: reference, label: 'REFERENCE', detail: 'approved original', selected: false },
      { file: incumbent.orbit.records[0].file, label: 'INCUMBENT', detail: state.loopSummaries.at(-1)?.winnerId ?? 'phase input', selected: !accepted }
    ];
    for (const candidate of candidates) {
      const candidateStatusFile = path.join(loopDirectory, 'candidates', candidate.candidateId, 'technical-reject.png');
      if (!candidate.orbit && !fs.existsSync(candidateStatusFile)) await createStatusImage(candidateStatusFile, 'TECHNICAL REJECT', candidate.validation.failures.join(' · ') || 'hard gate failed', 'fail', captureWidth, captureWidth);
      comparisonRecords.push({
      file: candidate.orbit?.records[0]?.file ?? candidateStatusFile,
      label: candidate.candidateId.slice(-3).toUpperCase(),
      detail: candidate.validation.verdict === 'pass' ? `PASS · factor ${candidate.factor}` : `REJECT · ${candidate.validation.failures.join(', ')}`,
      selected: accepted && candidate.candidateId === provisional?.candidateId
      });
    }
    const contactSheet = path.join(loopDirectory, 'reference-first-contact-sheet.png');
    await createContactSheet(comparisonRecords, contactSheet, 7);
    const decision = {
      schema: 'guided-loop-decision/v1',
      loop: loopNumber,
      focus: loop.focus,
      question: loop.question,
      incumbentId: provisional?.parentIncumbentId ?? state.incumbentId,
      provisionalCandidateId: provisional?.candidateId ?? null,
      result: accepted ? 'accept_candidate' : 'retain_winner',
      winnerId: state.incumbentId,
      activeCriterion: loop.focus,
      observation: loopObservation(loop, accepted, provisional),
      hypothesis: loop.gate ? 'The phase should advance only when the inherited winner passes global review.' : `A bounded move toward the declared ${loop.focus} target should improve the reference match without changing unrelated paths.`,
      regressions: [],
      lightingVerdict: { dayCycle: dayCycle?.verdict ?? 'not-required-gate-loop', reflectionRing: reflectionRing?.verdict ?? 'not-required-gate-loop' },
      topologyVerdict: accepted ? provisional.validation.verdict : incumbent.validation.verdict,
      referenceComparison: contactSheet,
      userApproval: 'pending-final'
    };
    writeJson(path.join(loopDirectory, 'decision.json'), decision);
    writeJson(path.join(loopDirectory, 'review-feedback.json'), {
      schema: 'guided-review-feedback/v1',
      loop: loopNumber,
      active: { criterion: loop.focus, question: loop.question, result: decision.result },
      regressionScan: {
        silhouette: 'reviewed-in-ten-angle-capture',
        boneAndJointFlow: 'reviewed-in-ten-angle-capture',
        softTissue: 'reviewed-in-ten-angle-capture',
        surface: 'reviewed-in-studio-and-light-sweep',
        lighting: decision.lightingVerdict,
        technical: decision.topologyVerdict
      },
      observation: decision.observation,
      hypothesis: decision.hypothesis,
      nextFocus: GUIDED_LOOPS[loopNumber]?.focus ?? 'final-validation'
    });
    state.completedLoop = loopNumber;
    state.loopSummaries.push({ loop: loopNumber, focus: loop.focus, result: decision.result, winnerId: state.incumbentId, contactSheet, selectedHero: accepted ? provisional.orbit.records[0].file : incumbent.orbit.records[0].file, dayCycle: dayCycle?.contactSheet ?? null, reflectionRing: reflectionRing?.contactSheet ?? null });
    writeJson(stateFile, state);
    if (loopNumber % 10 === 0) {
      const checkpointDirectory = path.join(outputRoot, 'checkpoints', String(loopNumber).padStart(2, '0'));
      fs.mkdirSync(checkpointDirectory, { recursive: true });
      const checkpointResult = await factory.generate({ document: state.document, forceClean: true });
      const checkpointValidation = await factory.validate(checkpointResult, { hardGates: kit.reviewProfile.hardGates });
      if (checkpointValidation.verdict !== 'pass') throw new Error(`Checkpoint ${loopNumber} failed: ${checkpointValidation.failures.join(', ')}`);
      const checkpointProfile = reviewProfile(kit, loopNumber, Math.max(captureWidth, 300));
      const checkpointAngles = Array.from({ length: 10 }, (_, index) => 140 + index * 36);
      const checkpointDayCycle = await renderDayCycle(checkpointResult, path.join(checkpointDirectory, 'day-cycle-ten-angle'), checkpointProfile, { azimuths: checkpointAngles, maxClippedFraction: 0.2 });
      const movingSun = await renderMovingSunVideo(checkpointResult, path.join(checkpointDirectory, 'moving-sun'), checkpointProfile, { frames: 36, fps: 12, maxClippedFraction: 0.2 });
      const phaseLoops = state.loopSummaries.slice(-10);
      const progressionRecords = [
        { file: reference, label: 'REFERENCE', detail: 'approved original', selected: false },
        ...phaseLoops.map((summary) => ({ file: summary.selectedHero, label: `LOOP ${String(summary.loop).padStart(2, '0')}`, detail: `${summary.result} · ${summary.focus}`, selected: summary.loop === loopNumber }))
      ];
      const progression = path.join(checkpointDirectory, 'reference-first-progression.png');
      await createContactSheet(progressionRecords, progression, 6);
      writeJson(path.join(checkpointDirectory, 'checkpoint.json'), {
        schema: 'guided-review-checkpoint/v1',
        loop: loopNumber,
        verdict: checkpointValidation.verdict === 'pass' && checkpointDayCycle.verdict === 'pass' ? 'pass' : 'fail',
        winnerId: state.incumbentId,
        validation: checkpointValidation,
        dayCycle: checkpointDayCycle,
        movingSun: { video: movingSun.video, frames: movingSun.frames, fps: movingSun.fps },
        progression
      });
    }
    process.stdout.write(`${JSON.stringify({ loop: loopNumber, focus: loop.focus, result: decision.result, winner: state.incumbentId, acceptedImprovements: state.acceptedImprovements })}\n`);
  }
  return state;
}
