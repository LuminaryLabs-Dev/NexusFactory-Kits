#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as factory from './services/factory-service.mjs';
import { startServer } from './services/server-service.mjs';
import { runReviewAttempt, finalizeReview } from './services/review-service.mjs';
import { writeJson } from './services/io-service.mjs';

function parseArgs(argv) {
  const values = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
    else positional.push(arg);
  }
  return { command: positional[0] ?? 'describe', values };
}

async function main() {
  const { command, values } = parseArgs(process.argv);
  const kitRoot = values.kit ? path.resolve(values.kit) : undefined;
  if (command === 'describe') return console.log(JSON.stringify(await factory.describe({ kitRoot }), null, 2));
  if (command === 'generate') {
    const result = await factory.generate({ kitRoot, seed: values.seed, forceClean: values.clean === 'true' });
    const validation = await factory.validate(result);
    return console.log(JSON.stringify({ semanticSignature: result.semanticSignature, validation, stages: result.stages }, null, 2));
  }
  if (command === 'randomize' || command === 'reroll') {
    const request = { kitRoot, seed: Number(values.seed ?? 927239), groups: values.groups?.split(',') };
    const result = command === 'randomize' ? await factory.randomize(request) : await factory.reroll(request);
    if (values.out) writeJson(path.resolve(values.out), result);
    return console.log(JSON.stringify(result, null, 2));
  }
  if (command === 'validate') {
    const result = await factory.generate({ kitRoot, forceClean: true });
    return console.log(JSON.stringify(await factory.validate(result), null, 2));
  }
  if (command === 'export') {
    const result = await factory.generate({ kitRoot, forceClean: true });
    const validation = await factory.validate(result);
    return console.log(JSON.stringify(await factory.export(result, { validation, outputRoot: path.resolve(values.out ?? './exports'), name: values.name ?? 'triceratops.glb' }), null, 2));
  }
  if (command === 'review') {
    const runtime = factory.createFactoryRuntime();
    const kit = runtime.resolveKit(kitRoot);
    const outputDirectory = values.out ?? 'output/review-run';
    const review = await runReviewAttempt({ service: factory, baseDocument: kit.document, profile: kit.reviewProfile, outputDirectory, batchSize: Number(values.count ?? kit.reviewProfile.batchSize), runId: values.runId });
    return console.log(JSON.stringify({ runId: review.run_id, suggestedCandidateId: review.suggestedCandidateId, contactSheet: review.contactSheet, reviewRun: path.join(outputDirectory, 'review-run.json') }, null, 2));
  }
  if (command === 'accept-review') {
    const outputDirectory = values.out ?? path.dirname(values.review);
    return console.log(JSON.stringify(finalizeReview({ reviewRunFile: path.resolve(values.review), candidateId: values.candidate, reason: values.reason ?? 'Accepted after comparable visual inspection.', outputDirectory }), null, 2));
  }
  if (command === 'inject') {
    if (!values.file) throw new Error('--file=<transaction.json> is required');
    const transaction = JSON.parse(fs.readFileSync(path.resolve(values.file), 'utf8'));
    const response = await fetch(`${values.url ?? 'http://127.0.0.1:4173'}/api/transactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(transaction) });
    const body = await response.json();
    if (!response.ok) throw new Error(`${body.error}: ${body.message}`);
    return console.log(JSON.stringify(body, null, 2));
  }
  if (command === 'serve') {
    const running = await startServer({ port: Number(values.port ?? 4173), kitRoot });
    console.log(JSON.stringify({ status: 'ready', url: running.url, pid: process.pid }, null, 2));
    process.on('SIGINT', async () => { await running.close(); process.exit(0); });
    process.on('SIGTERM', async () => { await running.close(); process.exit(0); });
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.code ?? 'CLI_ERROR', message: error.message }, null, 2));
  process.exitCode = 1;
});
