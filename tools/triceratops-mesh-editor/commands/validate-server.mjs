#!/usr/bin/env node
import fs from 'node:fs';
import { startServer } from '../services/server-service.mjs';
import { writeJson } from '../services/io-service.mjs';

const running = await startServer({ port: 4174 });
let report;
try {
  const health = await fetch(`${running.url}api/health`).then((response) => response.json());
  const indexResponse = await fetch(running.url);
  const index = await indexResponse.text();
  const before = await fetch(`${running.url}api/state`).then((response) => response.json());
  const transaction = { transactionId: 'api-preview', baseRevision: before.revision, mode: 'preview', patch: [{ op: 'replace', path: '/nodes/anatomy.frill-crown/params/radii/2', value: 1.31 }] };
  const previewResponse = await fetch(`${running.url}api/transactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(transaction) });
  const preview = await previewResponse.json();
  const rollbackResponse = await fetch(`${running.url}api/actions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'rollback' }) });
  const rollback = await rollbackResponse.json();
  const staleResponse = await fetch(`${running.url}api/transactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...transaction, transactionId: 'api-stale', baseRevision: 99 }) });
  const stale = await staleResponse.json();
  const checks = {
    ready: health.status === 'ready',
    htmlServed: indexResponse.ok && index.includes('id="viewport"') && index.includes('/services/preview-service.mjs'),
    previewAccepted: previewResponse.ok && preview.preview?.transactionId === transaction.transactionId,
    previewChangedSignature: preview.activeSignature !== before.activeSignature,
    previewTopologyPassed: preview.validation?.verdict === 'pass',
    rollbackRestored: rollback.activeSignature === before.activeSignature && rollback.preview === null,
    staleRejected: staleResponse.status === 409 && stale.error === 'STALE_REVISION'
  };
  report = { schema: 'mesh-harness-server-api-validation/v1', verdict: Object.values(checks).every(Boolean) ? 'pass' : 'fail', target: running.url, checks, health, before: { revision: before.revision, signature: before.activeSignature }, preview: { revision: preview.revision, signature: preview.activeSignature }, rollback: { revision: rollback.revision, signature: rollback.activeSignature }, stale };
} finally {
  await running.close();
}
writeJson('evidence/server-api-validation.json', report);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== 'pass') process.exitCode = 1;
