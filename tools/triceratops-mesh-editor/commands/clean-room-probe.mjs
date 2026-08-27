#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeJson } from '../services/io-service.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cleanRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'triceratops-mesh-editor-'));
fs.cpSync(sourceRoot, cleanRoot, {
  recursive: true,
  filter(source) {
    const relative = path.relative(sourceRoot, source);
    return !relative.startsWith('node_modules') && !relative.startsWith('output');
  }
});

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: cleanRoot, encoding: 'utf8' });
  return {
    command: [process.execPath, ...args].join(' '),
    status: result.status,
    outputSha256: crypto.createHash('sha256').update(`${result.stdout}\n${result.stderr}`).digest('hex')
  };
}

const testRun = run(['--test', 'tests/factory.test.mjs']);
const validationRun = run(['commands/validate-kit.mjs']);
const exportDirectory = path.join(cleanRoot, 'output', 'export-proof');
const exportRun = run(['mesh-editor.mjs', 'export', `--out=${exportDirectory}`, '--name=triceratops-clean-room.glb']);
const checks = {
  isolatedDirectory: cleanRoot !== sourceRoot,
  noCopiedNodeModules: !fs.existsSync(path.join(cleanRoot, 'node_modules')),
  testsPass: testRun.status === 0,
  validationPass: validationRun.status === 0,
  exportPass: exportRun.status === 0,
  exportExists: fs.existsSync(path.join(exportDirectory, 'triceratops-clean-room.glb'))
};
const report = {
  schema: 'triceratops-mesh-editor-clean-room/v1',
  verdict: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  checks,
  runs: [testRun, validationRun, exportRun]
};
writeJson(path.join(sourceRoot, 'evidence', 'clean-room.json'), report);
console.log(JSON.stringify({ verdict: report.verdict, checks }, null, 2));
if (report.verdict !== 'pass') process.exitCode = 1;
