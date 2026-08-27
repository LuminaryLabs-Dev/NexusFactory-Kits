#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as factory from '../services/factory-service.mjs';
import { renderOrbit } from '../services/render-service.mjs';
import { fileSha256, geometrySha256, writeJson } from '../services/io-service.mjs';

const outputRoot = path.resolve('output/render-proof');
fs.mkdirSync(outputRoot, { recursive: true });
const runtime = factory.createFactoryRuntime();
const kit = runtime.resolveKit();
const result = await factory.generate({ document: kit.document, forceClean: true });
const validation = await factory.validate(result);
if (validation.verdict !== 'pass') throw new Error(`Topology failed: ${validation.failures.join(', ')}`);

const orbit = await renderOrbit(result, path.join(outputRoot, 'orbit'), kit.reviewProfile);
const hero = orbit.records[0];
const checks = {
  allTenViewsVisible: orbit.views === 10 && orbit.allVisible,
  heroMatchesReviewedEvidence: hero.sha256 === fileSha256('evidence/final-reference.png'),
  geometryMatchesReviewedCandidate: geometrySha256(result.outputs.body.geometry) === kit.kit.baseline.geometrySha256
};
const report = {
  schema: 'triceratops-mesh-editor-render-proof/v1',
  verdict: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  checks,
  profile: kit.reviewProfile.profileId,
  contactSheet: path.relative(process.cwd(), orbit.contactSheet),
  heroSha256: hero.sha256,
  reviewedHeroSha256: fileSha256('evidence/final-reference.png')
};
writeJson('evidence/render-proof.json', report);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== 'pass') process.exitCode = 1;
