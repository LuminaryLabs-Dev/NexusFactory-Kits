#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runGuidedReview } from '../services/guided-review-service.mjs';

function argument(name, fallback) {
  const entry = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
}

const source = JSON.parse(fs.readFileSync('kit/mesh-program.json', 'utf8'));
const outputRoot = path.resolve(argument('output', 'output/guided-review-50'));
const fromLoop = Number(argument('from', '1'));
const toLoop = Number(argument('to', '50'));
const captureWidth = Number(argument('width', '240'));
const state = await runGuidedReview({ outputRoot, sourceDocument: source, fromLoop, toLoop, captureWidth });
console.log(JSON.stringify({ outputRoot, completedLoop: state.completedLoop, incumbentId: state.incumbentId, acceptedImprovements: state.acceptedImprovements, retainedLoops: state.retainedLoops, failedCandidates: state.failedCandidates }, null, 2));
