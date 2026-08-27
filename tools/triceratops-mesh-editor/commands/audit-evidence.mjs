#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJson } from '../services/io-service.mjs';

const runRoot = path.resolve('output/guided-review-50');
const finalRoot = path.resolve('output/triceratops-guided-final');
const failures = [];
const loops = [];
for (let loop = 1; loop <= 50; loop++) {
  const root = path.join(runRoot, 'loops', String(loop).padStart(2, '0'));
  const candidateRoot = path.join(root, 'candidates');
  const candidates = fs.existsSync(candidateRoot) ? fs.readdirSync(candidateRoot).filter((name) => fs.existsSync(path.join(candidateRoot, name, 'candidate.json'))) : [];
  const feedback = path.join(root, 'review-feedback.json');
  const comparison = path.join(root, 'reference-first-contact-sheet.png');
  const dayManifest = path.join(root, 'lighting/day-cycle/day-cycle-manifest.json');
  const reflectionManifest = path.join(root, 'lighting/reflection-ring/reflection-ring-manifest.json');
  if (candidates.length !== 5) failures.push(`loop-${loop}-candidate-count`);
  for (const file of [feedback, comparison]) if (!fs.existsSync(file) || fs.statSync(file).size === 0) failures.push(`loop-${loop}-missing-${path.basename(file)}`);
  let day = null;
  let reflection = null;
  if (loop % 10 !== 0) {
    if (!fs.existsSync(dayManifest)) failures.push(`loop-${loop}-missing-day-cycle`);
    else day = JSON.parse(fs.readFileSync(dayManifest, 'utf8'));
    if (!fs.existsSync(reflectionManifest)) failures.push(`loop-${loop}-missing-reflection-ring`);
    else reflection = JSON.parse(fs.readFileSync(reflectionManifest, 'utf8'));
    if (day && (day.verdict !== 'pass' || day.records.length !== 32)) failures.push(`loop-${loop}-day-cycle-invalid`);
    if (reflection && (reflection.verdict !== 'pass' || reflection.records.length !== 12)) failures.push(`loop-${loop}-reflection-invalid`);
  }
  loops.push({ loop, candidates: candidates.length, feedback: fs.existsSync(feedback), comparison: fs.existsSync(comparison), dayCycle: day?.verdict ?? 'phase-gate', reflectionRing: reflection?.verdict ?? 'phase-gate' });
}

const checkpoints = [];
for (const checkpoint of [10, 20, 30, 40, 50]) {
  const root = path.join(runRoot, 'checkpoints', String(checkpoint));
  const day = JSON.parse(fs.readFileSync(path.join(root, 'day-cycle-ten-angle/day-cycle-manifest.json'), 'utf8'));
  const moving = JSON.parse(fs.readFileSync(path.join(root, 'moving-sun/reflection-ring-manifest.json'), 'utf8'));
  const video = path.join(root, 'moving-sun/moving-sun.mp4');
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', video], { encoding: 'utf8' });
  let videoData = null;
  if (probe.status === 0) videoData = JSON.parse(probe.stdout).format;
  if (day.verdict !== 'pass' || day.records.length !== 80) failures.push(`checkpoint-${checkpoint}-day-cycle-invalid`);
  if (moving.verdict !== 'pass' || moving.records.length !== 36) failures.push(`checkpoint-${checkpoint}-moving-sun-invalid`);
  if (!videoData || Number(videoData.duration) !== 3 || Number(videoData.size) < 1000) failures.push(`checkpoint-${checkpoint}-video-invalid`);
  checkpoints.push({ checkpoint, dayCycleViews: day.records.length, movingSunFrames: moving.records.length, video: videoData, verdict: day.verdict === 'pass' && moving.verdict === 'pass' && videoData ? 'pass' : 'fail' });
}

const report = {
  schema: 'guided-review-evidence-audit/v1',
  verdict: failures.length ? 'fail' : 'pass',
  failures,
  loops,
  checkpoints,
  totals: {
    loops: loops.length,
    candidates: loops.reduce((sum, entry) => sum + entry.candidates, 0),
    perLoopFeedback: loops.filter((entry) => entry.feedback).length,
    referenceFirstComparisons: loops.filter((entry) => entry.comparison).length,
    checkpointDayCycleViews: checkpoints.reduce((sum, entry) => sum + entry.dayCycleViews, 0),
    checkpointMovingSunFrames: checkpoints.reduce((sum, entry) => sum + entry.movingSunFrames, 0)
  }
};
writeJson(path.join(finalRoot, 'evidence-audit.json'), report);
if (failures.length) throw new Error(`Evidence audit failed: ${failures.join(', ')}`);
console.log(JSON.stringify({ verdict: report.verdict, totals: report.totals, checkpoints: report.checkpoints }, null, 2));
