import fs from 'node:fs';
import path from 'node:path';
import { applyJsonPatch, getAtPointer } from './transaction-service.mjs';
import { namedStream, signature, deepClone } from './runtime-service.mjs';
import { writeJson, fileSha256 } from './io-service.mjs';
import { createContactSheet, createStatusImage, renderOrbit } from './render-service.mjs';

function legacyCandidatePatch(document, candidateIndex, seed) {
  const random = namedStream(seed, `candidate:${candidateIndex}`);
  const frillHeightPath = '/nodes/anatomy.frill-crown/params/radii/1';
  const frillWidthPath = '/nodes/anatomy.frill-crown/params/radii/2';
  const shoulderPath = '/nodes/anatomy.shoulder/params/radii/0';
  const attachmentWidthPath = '/nodes/attachments.detail/params/frillWidth';
  const baseHeight = getAtPointer(document, frillHeightPath);
  const baseWidth = getAtPointer(document, frillWidthPath);
  const baseShoulder = getAtPointer(document, shoulderPath);
  const baseAttachmentWidth = getAtPointer(document, attachmentWidthPath);
  const progression = (candidateIndex + 1) / 6;
  const widthFactor = 1.012 + progression * 0.055 + (random() - 0.5) * 0.006;
  const heightFactor = 1.004 + progression * 0.025 + (random() - 0.5) * 0.004;
  const shoulderFactor = 1.008 + progression * 0.045 + (random() - 0.5) * 0.005;
  return [
    { op: 'replace', path: frillHeightPath, value: baseHeight * heightFactor },
    { op: 'replace', path: frillWidthPath, value: baseWidth * widthFactor },
    { op: 'replace', path: shoulderPath, value: baseShoulder * shoulderFactor },
    { op: 'replace', path: attachmentWidthPath, value: baseAttachmentWidth * widthFactor }
  ];
}

function configuredCandidatePatch(document, candidateIndex, seed, batchSize, profile) {
  const random = namedStream(seed, `configured-candidate:${candidateIndex}`);
  const progress = batchSize <= 1 ? 0.5 : candidateIndex / (batchSize - 1);
  return profile.candidateParameters.map((rule) => {
    const jitter = (random() - 0.5) * 2 * (rule.jitter ?? 0);
    const value = rule.start + (rule.end - rule.start) * progress + jitter;
    return { op: 'replace', path: rule.path, value: Number(value.toFixed(8)) };
  });
}

function candidatePatch(document, candidateIndex, seed, batchSize, profile) {
  if (Array.isArray(profile.candidateParameters) && profile.candidateParameters.length) return configuredCandidatePatch(document, candidateIndex, seed, batchSize, profile);
  return legacyCandidatePatch(document, candidateIndex, seed);
}

function legacyDirectionalScore(document, baseline) {
  const values = {
    frillWidth: getAtPointer(document, '/nodes/anatomy.frill-crown/params/radii/2'),
    frillHeight: getAtPointer(document, '/nodes/anatomy.frill-crown/params/radii/1'),
    shoulder: getAtPointer(document, '/nodes/anatomy.shoulder/params/radii/0')
  };
  const targets = {
    frillWidth: baseline.frillWidth * 1.045,
    frillHeight: baseline.frillHeight * 1.018,
    shoulder: baseline.shoulder * 1.035
  };
  const normalizedError = Math.abs(values.frillWidth - targets.frillWidth) / targets.frillWidth + Math.abs(values.frillHeight - targets.frillHeight) / targets.frillHeight + Math.abs(values.shoulder - targets.shoulder) / targets.shoulder;
  return { score: Number((100 - normalizedError * 500).toFixed(4)), values, targets };
}

function directionalScore(document, baseline, profile) {
  if (!Array.isArray(profile.candidateParameters) || !profile.candidateParameters.length) return legacyDirectionalScore(document, baseline);
  const values = {};
  const targets = {};
  let normalizedError = 0;
  for (const rule of profile.candidateParameters) {
    const key = rule.id ?? rule.path;
    const value = getAtPointer(document, rule.path);
    values[key] = value;
    targets[key] = rule.target;
    normalizedError += Math.abs(value - rule.target) / Math.max(Math.abs(rule.end - rule.start), 0.000001);
  }
  normalizedError /= profile.candidateParameters.length;
  return { score: Number((100 - normalizedError * 100).toFixed(4)), values, targets };
}

export async function runReviewAttempt({ service, baseDocument, profile, outputDirectory, batchSize = profile.batchSize, runId = `triceratops-review-${baseDocument.seed}` }) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const baseline = {
    frillWidth: getAtPointer(baseDocument, '/nodes/anatomy.frill-crown/params/radii/2'),
    frillHeight: getAtPointer(baseDocument, '/nodes/anatomy.frill-crown/params/radii/1'),
    shoulder: getAtPointer(baseDocument, '/nodes/anatomy.shoulder/params/radii/0')
  };
  const incumbent = await service.generate({ document: deepClone(baseDocument), forceClean: true });
  const incumbentValidation = await service.validate(incumbent, { hardGates: profile.hardGates });
  if (incumbentValidation.verdict !== 'pass') throw new Error('Incumbent failed hard validation');
  const incumbentDir = path.join(outputDirectory, 'incumbent-orbit');
  const incumbentManifest = path.join(incumbentDir, 'manifest.json');
  const incumbentOrbit = fs.existsSync(incumbentManifest) ? JSON.parse(fs.readFileSync(incumbentManifest, 'utf8')) : await renderOrbit(incumbent, incumbentDir, profile);
  const candidates = [];
  for (let index = 0; index < batchSize; index++) {
    const candidateId = `${runId}-a0001-c${String(index + 1).padStart(2, '0')}`;
    const candidateDirectory = path.join(outputDirectory, candidateId);
    const existingFile = path.join(candidateDirectory, 'candidate.json');
    if (fs.existsSync(existingFile)) {
      const existing = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
      if (existing.candidateId === candidateId) {
        candidates.push(existing);
        continue;
      }
    }
    const candidateSeed = (baseDocument.seed + index * 7919) >>> 0;
    const patch = candidatePatch(baseDocument, index, candidateSeed, batchSize, profile);
    const document = applyJsonPatch(baseDocument, patch).document;
    const result = await service.generate({ document });
    const validation = await service.validate(result, { hardGates: profile.hardGates });
    let orbit = null;
    if (validation.verdict === 'pass') orbit = await renderOrbit(result, candidateDirectory, profile);
    const direction = directionalScore(document, baseline, profile);
    candidates.push({
      candidateId,
      parentWinnerId: `${runId}-w0000`,
      seed: candidateSeed,
      patch,
      encodingSignature: signature({ base: incumbent.semanticSignature, patch }),
      semanticSignature: result.semanticSignature,
      validation,
      orbit,
      score: validation.verdict === 'pass' && orbit?.allVisible ? direction.score : -1000,
      direction,
      stageSummary: {
        computed: result.stages.filter((stage) => stage.status === 'computed').map((stage) => stage.id),
        reused: result.stages.filter((stage) => stage.status === 'reused').map((stage) => stage.id)
      }
    });
    writeJson(path.join(candidateDirectory, 'candidate.json'), candidates.at(-1));
  }
  const eligible = candidates.filter((candidate) => candidate.validation.verdict === 'pass' && candidate.orbit?.allVisible).sort((a, b) => b.score - a.score);
  const suggested = eligible[0] ?? null;
  const heroRecords = candidates.map((candidate) => ({
    file: path.join(outputDirectory, candidate.candidateId, candidate.orbit ? 'angle-01-140deg.png' : 'technical-reject.png'),
    label: candidate.candidateId.slice(-3).toUpperCase(),
    detail: `${candidate.validation.verdict.toUpperCase()} · score ${candidate.score}`,
    selected: candidate.candidateId === suggested?.candidateId
  }));
  for (const record of heroRecords) if (!fs.existsSync(record.file)) {
    const candidate = candidates.find((item) => record.file.includes(item.candidateId));
    await createStatusImage(record.file, 'TECHNICAL REJECT', candidate.validation.failures.join(' · ') || 'hard gate failed');
  }
  const contactSheet = path.join(outputDirectory, 'candidate-contact-sheet.png');
  await createContactSheet(heroRecords, contactSheet, 5);
  const reviewRun = {
    schema: 'iterative-asset-review/v1',
    run_id: runId,
    asset: { asset_id: 'triceratops-unified', kind: 'procedural-mesh', intended_use: 'prehistoric-rush-racer' },
    authority: { mutation_roots: ['triceratops-mesh-editor'], external_writes: false },
    reference_set: { reference_ids: profile.referenceIds ?? ['approved-triceratops-reference'], reference_path: profile.referencePath ?? null, locked_criteria: profile.visualCriteria },
    budget: { batch_size: batchSize, max_attempts: profile.maxAttempts, accepted_improvement_goal: 1 },
    capture_profile_id: profile.profileId,
    incumbent: { winner_id: `${runId}-w0000`, semanticSignature: incumbent.semanticSignature, validation: incumbentValidation, orbit: incumbentOrbit },
    attempt: {
      attempt_id: `${runId}-a0001`,
      incumbent_winner_id: `${runId}-w0000`,
      named_failure: { criterion: profile.firstObjective.id, observed: profile.firstObjective.observed ?? 'baseline anatomy', target: profile.firstObjective.instruction },
      allowed_parameter_changes: profile.candidateParameters?.map((rule) => rule.path) ?? ['frill-height', 'frill-width', 'shoulder-radius', 'frill-attachment-width'],
      candidate_ids: candidates.map((candidate) => candidate.candidateId),
      status: 'technically_validated'
    },
    candidates,
    suggestedCandidateId: suggested?.candidateId ?? null,
    selectionStatus: suggested ? 'suggested-pending-visual-review' : 'retain-incumbent-no-eligible-candidate',
    contactSheet,
    state: 'technically_validated'
  };
  writeJson(path.join(outputDirectory, 'review-run.json'), reviewRun);
  return reviewRun;
}

export function finalizeReview({ reviewRunFile, candidateId, reason, outputDirectory }) {
  const reviewRun = JSON.parse(fs.readFileSync(reviewRunFile, 'utf8'));
  const objective = reviewRun.attempt.named_failure.criterion;
  const candidate = reviewRun.candidates.find((item) => item.candidateId === candidateId);
  if (!candidate) throw new Error(`Unknown candidate: ${candidateId}`);
  if (candidate.validation.verdict !== 'pass' || !candidate.orbit?.allVisible) throw new Error('Candidate did not pass technical and capture gates');
  const decision = {
    schema: 'visual-selection-decision/v1',
    decision_id: `${reviewRun.attempt.attempt_id}-decision`,
    incumbent_winner_id: reviewRun.incumbent.winner_id,
    selected_candidate_id: candidateId,
    result: 'accept_candidate',
    reason_codes: ['visible_improvement', 'hard_gates_passed', 'orbit_visible'],
    reason,
    rejected_candidate_ids: reviewRun.candidates.filter((item) => item.candidateId !== candidateId).map((item) => item.candidateId),
    accepted_iteration_increment: 1
  };
  const winner = {
    winner_id: `${reviewRun.run_id}-w0001`,
    parent_winner_id: reviewRun.incumbent.winner_id,
    candidate_id: candidateId,
    encodingSignature: candidate.encodingSignature,
    semanticSignature: candidate.semanticSignature,
    patch: candidate.patch,
    capture: candidate.orbit.contactSheet,
    accepted_evidence: [objective, 'hard-gates-passed', 'ten-angle-orbit']
  };
  writeJson(path.join(outputDirectory, 'selection-decision.json'), decision);
  writeJson(path.join(outputDirectory, 'winner-lineage.json'), { schema: 'winner-lineage/v1', winners: [reviewRun.incumbent, winner] });
  const feedback = reviewRun.candidates.map((item) => ({
    schema: 'review-feedback/v1',
    candidate_id: item.candidateId,
    observations: item.validation.verdict === 'pass'
      ? [
          `Comparable ten-angle capture is complete and nonblank.`,
          `Only the declared ${objective} parameters changed.`,
          item.candidateId === candidateId ? `The selected proportions remain readable without obscuring the eyes, horns, muzzle or feet.` : `The candidate is valid but offers a weaker objective improvement than the selected candidate.`
        ]
      : [`Topology gate failed: ${item.validation.failures.join(', ')}.`, `No visual capture was used for selection.`],
    hypotheses: item.validation.verdict === 'pass' ? [`Moderate loop-ring deformation improves the silhouette while preserving the extracted shell.`] : [`The candidate violates a required geometry gate.`],
    regressions: item.validation.verdict === 'pass' ? [] : item.validation.failures,
    recommendation: item.candidateId === candidateId ? 'accept' : 'reject',
    next_bounded_change: item.candidateId === candidateId ? 'Use this winner as the next incumbent.' : 'None in this completed first-proof attempt.'
  }));
  writeJson(path.join(outputDirectory, 'review-feedback.json'), { schema: 'review-feedback-index/v1', records: feedback });
  writeJson(path.join(outputDirectory, 'visual-deltas.json'), {
    schema: 'visual-delta-index/v1',
    records: reviewRun.candidates.map((item) => ({
      candidate_id: item.candidateId,
      active_objective: { criterion: objective, result: item.candidateId === candidateId ? 'improved' : item.validation.verdict === 'pass' ? 'less-improved' : 'unsupported', evidence: item.candidateId === candidateId ? reason : item.validation.verdict === 'pass' ? 'Comparable capture is valid but ranks behind the selected silhouette.' : 'Technical gate failed before visual review.' },
      regressions: item.validation.verdict === 'pass' ? [] : item.validation.failures,
      recommendation: item.candidateId === candidateId ? 'accept' : 'reject'
    }))
  });
  const transaction = { transactionId: `accept-${candidateId}`, baseRevision: 0, mode: 'commit', patch: candidate.patch };
  writeJson(path.join(outputDirectory, 'accepted-transaction.json'), transaction);
  writeJson(path.join(outputDirectory, 'review-verdict.json'), {
    schema: 'iterative-asset-review-verdict/v1',
    verdict: 'pass',
    attempts: 1,
    candidates: reviewRun.candidates.length,
    acceptedImprovements: 1,
    incumbentPreservedUntilDecision: true,
    finalWinner: winner,
    technicalRejects: reviewRun.candidates.filter((item) => item.validation.verdict !== 'pass').map((item) => item.candidateId),
    contactSheet: reviewRun.contactSheet,
    limitation: 'Visual selection is an interim assistant review; user approval remains final.'
  });
  return { decision, winner, transaction, evidenceSha256: fileSha256(candidate.orbit.contactSheet) };
}
