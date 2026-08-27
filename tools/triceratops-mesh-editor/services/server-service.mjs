import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshStateManager } from './state-service.mjs';
import { createFactoryRuntime } from './factory-service.mjs';
import { validateAssetResult } from './validation-service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.glb': 'model/gltf-binary' };

function jsonResponse(response, status, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store' });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error('Request body exceeds 1 MiB'), { code: 'BODY_TOO_LARGE' });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function publicState(manager) {
  return manager.getState();
}

export async function startServer(options = {}) {
  const port = Number(options.port ?? 4173);
  const runtime = createFactoryRuntime();
  const kit = runtime.resolveKit(options.kitRoot);
  const manager = new MeshStateManager({ document: kit.document, evaluator: runtime.evaluator, validateResult: async (result) => validateAssetResult(result, kit.reviewProfile.hardGates) });
  await manager.initialize();
  const clients = new Set();
  const transactionLog = path.join(root, 'output/session/transaction-log.ndjson');
  fs.mkdirSync(path.dirname(transactionLog), { recursive: true });
  const broadcast = (event = 'state') => {
    const payload = `event: ${event}\ndata: ${JSON.stringify({ revision: manager.revision, activeSignature: manager.getState().activeSignature })}\n\n`;
    for (const client of clients) client.write(payload);
  };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? '127.0.0.1'}`);
      if (request.method === 'GET' && url.pathname === '/api/health') return jsonResponse(response, 200, { status: 'ready', revision: manager.revision, surface: 'webgl' });
      if (request.method === 'GET' && url.pathname === '/api/state') return jsonResponse(response, 200, publicState(manager));
      if (request.method === 'GET' && url.pathname === '/api/events') {
        response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        response.write(`event: ready\ndata: ${JSON.stringify({ revision: manager.revision })}\n\n`);
        clients.add(response);
        request.on('close', () => clients.delete(response));
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/transactions') {
        const transaction = await readBody(request);
        const state = await manager.preview(transaction);
        if (transaction.mode === 'commit') fs.appendFileSync(transactionLog, `${JSON.stringify(manager.history.at(-1))}\n`);
        broadcast(transaction.mode === 'commit' ? 'commit' : 'preview');
        return jsonResponse(response, 200, state);
      }
      if (request.method === 'POST' && url.pathname === '/api/actions') {
        const body = await readBody(request);
        let state;
        if (body.action === 'commit') {
          state = await manager.commit(body.transactionId);
          fs.appendFileSync(transactionLog, `${JSON.stringify(manager.history.at(-1))}\n`);
        } else if (body.action === 'rollback') state = await manager.rollback();
        else if (body.action === 'undo') state = await manager.undo();
        else if (body.action === 'redo') state = await manager.redo();
        else if (body.action === 'branch') state = manager.createBranch(body.name);
        else if (body.action === 'checkout') state = await manager.checkoutBranch(body.name);
        else throw Object.assign(new Error(`Unknown action: ${body.action}`), { code: 'UNKNOWN_ACTION' });
        broadcast(body.action);
        return jsonResponse(response, 200, state);
      }
      if (request.method !== 'GET') return jsonResponse(response, 405, { error: 'METHOD_NOT_ALLOWED' });
      let relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (relative.includes('\0')) return jsonResponse(response, 400, { error: 'INVALID_PATH' });
      const target = path.resolve(root, `.${relative}`);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) return jsonResponse(response, 403, { error: 'PATH_FORBIDDEN' });
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return jsonResponse(response, 404, { error: 'NOT_FOUND' });
      const data = fs.readFileSync(target);
      response.writeHead(200, { 'content-type': mimeTypes[path.extname(target)] ?? 'application/octet-stream', 'content-length': data.length, 'cache-control': 'no-store' });
      response.end(data);
    } catch (error) {
      const status = error.code === 'STALE_REVISION' ? 409 : ['INVALID_TRANSACTION', 'INVALID_PATCH', 'INVALID_POINTER', 'MISSING_PATH', 'UNKNOWN_NODE_TYPE', 'DEPENDENCY_CYCLE', 'VALIDATION_FAILED'].includes(error.code) ? 422 : 500;
      jsonResponse(response, status, { error: error.code ?? 'SERVER_ERROR', message: error.message, revision: manager.revision });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, manager, url: `http://127.0.0.1:${port}/`, close: () => new Promise((resolve) => server.close(resolve)) };
}
