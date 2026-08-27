import * as THREE from '../vendor/three.module.js';
import { NodeRegistry, IncrementalEvaluator } from './evaluator-service.mjs';
import { registerCoreNodes } from './node-service.mjs';
import { validateAssetResult } from './validation-service.mjs';
import { getAtPointer } from './transaction-service.mjs';

const canvas = document.querySelector('#viewport');
const status = document.querySelector('#status');
const revision = document.querySelector('#revision');
const stats = document.querySelector('#mesh-stats');
const stages = document.querySelector('#stage-list');
const parameterList = document.querySelector('#parameter-list');
const transactionEditor = document.querySelector('#transaction-editor');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const registry = registerCoreNodes(new NodeRegistry());
const evaluator = new IncrementalEvaluator(registry);
let appState = null;
let evaluated = null;
let activeScene = null;
let activeCamera = null;
let pointerStart = null;
let azimuthOffset = 0;

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.message ?? body.error), body);
  return body;
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    if (activeCamera) {
      activeCamera.aspect = width / height;
      activeCamera.updateProjectionMatrix();
    }
  }
}

function positionCamera(delta = 0) {
  if (!activeCamera || !appState) return;
  const params = appState.document.nodes[appState.document.outputs.scene].params;
  const az = THREE.MathUtils.degToRad(params.azimuth + azimuthOffset + delta);
  const el = THREE.MathUtils.degToRad(params.elevation);
  activeCamera.position.set(Math.cos(az) * params.radius, params.cameraBaseY + Math.sin(el) * params.radius * 0.42, Math.sin(az) * params.radius);
  activeCamera.lookAt(...params.lookAt);
}

function renderLoop() {
  resize();
  if (activeScene && activeCamera) renderer.render(activeScene, activeCamera);
  requestAnimationFrame(renderLoop);
}

function setStatus(text, tone = 'ready') {
  status.textContent = text;
  status.dataset.tone = tone;
}

function renderParameters(constraints) {
  parameterList.replaceChildren();
  let ringHeadingAdded = false;
  for (const [path, rule] of Object.entries(constraints.parameters)) {
    const isRing = path.includes('/edit.ring.');
    if (isRing && !ringHeadingAdded) {
      const heading = document.createElement('h3');
      heading.textContent = 'Atomic loop-ring edits';
      parameterList.append(heading);
      ringHeadingAdded = true;
    }
    const row = document.createElement('label');
    row.className = 'parameter-row';
    row.dataset.group = isRing ? 'loop-ring' : 'base';
    const name = document.createElement('span');
    const parts = path.split('/').filter(Boolean);
    const axisName = { 0: 'X', 1: 'Y', 2: 'Z' }[parts.at(-1)] ?? parts.at(-1);
    name.textContent = isRing ? `${parts[1].replace('edit.ring.', '')} · ${parts.at(-2)} ${axisName}` : parts.slice(-4).join(' / ');
    const input = document.createElement('input');
    input.type = 'range'; input.min = rule.min; input.max = rule.max; input.step = (rule.max - rule.min) / 100;
    input.value = getAtPointer(appState.document, path);
    const value = document.createElement('output');
    value.textContent = Number(input.value).toFixed(3);
    input.addEventListener('input', () => value.textContent = Number(input.value).toFixed(3));
    input.addEventListener('change', async () => {
      try {
        setStatus('Evaluating preview…', 'working');
        await api('/api/transactions', { method: 'POST', body: JSON.stringify({ transactionId: `ui-${Date.now()}`, baseRevision: appState.revision, mode: 'preview', patch: [{ op: 'replace', path, value: Number(input.value) }] }) });
        await refresh();
      } catch (error) { setStatus(error.message, 'error'); }
    });
    row.append(name, input, value);
    parameterList.append(row);
  }
}

async function refresh() {
  appState = await api('/api/state');
  evaluated = await evaluator.evaluate(appState.document);
  const validation = validateAssetResult(evaluated, { triangleBudget: 32000 });
  activeScene = evaluated.outputs.scene.scene;
  activeCamera = evaluated.outputs.scene.camera;
  positionCamera();
  revision.textContent = `r${appState.revision}${appState.preview ? ' · preview' : ' · committed'}`;
  const aggregate = validation.aggregate;
  stats.innerHTML = `<strong>${aggregate.totalTriangles.toLocaleString()}</strong> triangles · <strong>${validation.structure.totalMeshes}</strong> meshes · <strong>${validation.structure.structuralShellMeshes}</strong> body shell`;
  stages.innerHTML = evaluated.stages.map((stage) => `<li><span>${stage.id}</span><b class="${stage.status}">${stage.status}</b></li>`).join('');
  setStatus(validation.verdict === 'pass' ? 'Topology gate passed' : `Blocked: ${validation.failures.join(', ')}`, validation.verdict === 'pass' ? 'ready' : 'error');
  window.__MESH_HARNESS__ = { ready: true, revision: appState.revision, preview: Boolean(appState.preview), validation: validation.verdict, triangles: aggregate.totalTriangles, meshes: validation.structure.totalMeshes, webgl: renderer.getContext().getParameter(renderer.getContext().VERSION), semanticSignature: evaluated.semanticSignature };
}

document.querySelector('#commit').addEventListener('click', async () => {
  try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'commit', transactionId: appState.preview?.transactionId }) }); await refresh(); } catch (error) { setStatus(error.message, 'error'); }
});
document.querySelector('#rollback').addEventListener('click', async () => { try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'rollback' }) }); await refresh(); } catch (error) { setStatus(error.message, 'error'); } });
document.querySelector('#undo').addEventListener('click', async () => { try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'undo' }) }); await refresh(); } catch (error) { setStatus(error.message, 'error'); } });
document.querySelector('#redo').addEventListener('click', async () => { try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'redo' }) }); await refresh(); } catch (error) { setStatus(error.message, 'error'); } });
document.querySelector('#apply-json').addEventListener('click', async () => {
  try {
    const transaction = JSON.parse(transactionEditor.value);
    transaction.baseRevision = appState.revision;
    await api('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) });
    await refresh();
  } catch (error) { setStatus(error.message, 'error'); }
});
for (const button of document.querySelectorAll('[data-angle]')) button.addEventListener('click', () => { azimuthOffset = Number(button.dataset.angle) - appState.document.nodes[appState.document.outputs.scene].params.azimuth; positionCamera(); });
canvas.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, azimuth: azimuthOffset }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => { if (!pointerStart) return; azimuthOffset = pointerStart.azimuth + (event.clientX - pointerStart.x) * 0.35; positionCamera(); });
canvas.addEventListener('pointerup', () => pointerStart = null);

async function boot() {
  try {
    const [state, constraints] = await Promise.all([api('/api/state'), fetch('/kit/constraints.json').then((response) => response.json())]);
    appState = state;
    renderParameters(constraints);
    transactionEditor.value = JSON.stringify({ transactionId: 'loop-ring-preview-001', baseRevision: state.revision, mode: 'preview', patch: [{ op: 'replace', path: '/nodes/edit.ring.head/params/scale/1', value: 0.9 }] }, null, 2);
    await refresh();
    const events = new EventSource('/api/events');
    events.addEventListener('commit', refresh);
    events.addEventListener('undo', refresh);
    events.addEventListener('redo', refresh);
  } catch (error) {
    console.error(error);
    setStatus(error.message, 'error');
    window.__MESH_HARNESS__ = { ready: false, error: error.message };
  }
}

renderLoop();
boot();
