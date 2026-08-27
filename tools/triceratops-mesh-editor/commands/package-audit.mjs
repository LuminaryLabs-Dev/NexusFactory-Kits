#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson } from '../services/io-service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selfPath = 'evidence/package-audit.json';
const excludedRoots = new Set(['node_modules', 'output']);
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ndjson']);

function walk(directory, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!prefix && excludedRoots.has(entry.name)) continue;
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, relative));
    else files.push(relative);
  }
  return files;
}

function roleFor(relative) {
  if (relative.startsWith('services/')) return 'runtime service';
  if (relative.startsWith('commands/')) return 'headless command';
  if (relative.startsWith('tests/')) return 'test';
  if (relative.startsWith('kit/references/')) return 'visual reference';
  if (relative.startsWith('kit/')) return 'kit source';
  if (relative.startsWith('evidence/')) return 'compact evidence';
  if (relative.startsWith('exports/')) return 'validated export';
  if (relative.startsWith('vendor/')) return 'browser runtime dependency';
  if (relative.startsWith('web/')) return 'editor presentation';
  return 'package contract or entrypoint';
}

const absolutePathFailures = [];
const secretFailures = [];
const inventory = [];
for (const relative of walk(root)) {
  const absolute = path.join(root, relative);
  const buffer = fs.readFileSync(absolute);
  inventory.push({
    path: relative,
    role: roleFor(relative),
    bytes: relative === selfPath ? null : buffer.length,
    sha256: relative === selfPath ? null : crypto.createHash('sha256').update(buffer).digest('hex')
  });
  if (!textExtensions.has(path.extname(relative))) continue;
  const content = buffer.toString('utf8');
  if (/\/(workspace|home|Users)\//.test(content) || /[A-Za-z]:\\Users\\/.test(content)) absolutePathFailures.push(relative);
  if (/(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,})/.test(content)) secretFailures.push(relative);
}

const expectedCore = [
  'factory-contract.json',
  'kit.manifest.json',
  'source-model.json',
  'services/factory-service.mjs',
  'services/transaction-service.mjs',
  'services/state-service.mjs',
  'services/validation-service.mjs',
  'services/review-service.mjs',
  'services/export-service.mjs',
  'kit/mesh-program.json',
  'kit/accepted-transactions.ndjson',
  'exports/triceratops-reviewed-candidate.glb'
];
const paths = new Set(inventory.map((entry) => entry.path));
const missing = expectedCore.filter((entry) => !paths.has(entry));
const checks = {
  inventoryComplete: missing.length === 0,
  noAbsoluteDependencyPaths: absolutePathFailures.length === 0,
  noSecretPatterns: secretFailures.length === 0,
  fullArchiveExcluded: !paths.has('triceratops-guided-review-50-package.zip')
};
const report = {
  schema: 'triceratops-mesh-editor-package-audit/v1',
  verdict: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  checks,
  missing,
  absolutePathFailures,
  secretFailures,
  inventory
};
writeJson(path.join(root, selfPath), report);
console.log(JSON.stringify({ verdict: report.verdict, checks, files: inventory.length }, null, 2));
if (report.verdict !== 'pass') process.exitCode = 1;
