import { assert } from './runtime-service.mjs';

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

function inspectValue(value, path = '') {
  if (typeof value === 'number') assert(Number.isFinite(value), `Non-finite number at ${path}`, 'INVALID_NUMBER');
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    assert(!unsafeKeys.has(key), `Unsafe key at ${path}/${key}`, 'UNSAFE_KEY');
    inspectValue(value[key], `${path}/${key}`);
  }
}

export function topologicalOrder(document) {
  const nodes = document.nodes;
  const temporary = new Set();
  const permanent = new Set();
  const order = [];
  const visit = (id, lineage = []) => {
    assert(nodes[id], `Unknown node reference: ${id}`, 'UNKNOWN_NODE');
    if (permanent.has(id)) return;
    assert(!temporary.has(id), `Dependency cycle: ${[...lineage, id].join(' -> ')}`, 'DEPENDENCY_CYCLE');
    temporary.add(id);
    for (const input of nodes[id].inputs ?? []) visit(input, [...lineage, id]);
    temporary.delete(id);
    permanent.add(id);
    order.push(id);
  };
  for (const id of Object.keys(nodes).sort()) visit(id);
  return order;
}

export function validateMeshProgram(document, registry) {
  assert(document && typeof document === 'object', 'Mesh program must be an object', 'INVALID_DOCUMENT');
  assert(document.schema === 'mesh-program/v1', 'Unsupported mesh program schema', 'INVALID_SCHEMA');
  assert(Number.isInteger(document.seed) && document.seed > 0 && document.seed <= 0xffffffff, 'Seed must be a positive uint32', 'INVALID_SEED');
  assert(document.nodes && typeof document.nodes === 'object' && !Array.isArray(document.nodes), 'nodes must be an object map', 'INVALID_NODES');
  assert(Object.keys(document.nodes).length > 0, 'Mesh program contains no nodes', 'EMPTY_PROGRAM');
  for (const [id, node] of Object.entries(document.nodes)) {
    assert(/^[a-z0-9][a-z0-9._-]*$/i.test(id), `Invalid stable node ID: ${id}`, 'INVALID_NODE_ID');
    assert(node && typeof node === 'object', `Node ${id} must be an object`, 'INVALID_NODE');
    assert(typeof node.type === 'string' && registry.has(node.type), `Unknown node type ${node.type} at ${id}`, 'UNKNOWN_NODE_TYPE');
    assert(node.params === undefined || (node.params && typeof node.params === 'object' && !Array.isArray(node.params)), `Node ${id} params must be an object`, 'INVALID_PARAMS');
    assert(node.inputs === undefined || (Array.isArray(node.inputs) && node.inputs.every((input) => typeof input === 'string')), `Node ${id} inputs must be string IDs`, 'INVALID_INPUTS');
    inspectValue(node.params ?? {}, `/nodes/${id}/params`);
  }
  const order = topologicalOrder(document);
  const outputs = document.outputs ?? {};
  assert(outputs.asset && document.nodes[outputs.asset], 'outputs.asset must reference a node', 'INVALID_OUTPUT');
  assert(outputs.scene && document.nodes[outputs.scene], 'outputs.scene must reference a node', 'INVALID_OUTPUT');
  assert(Array.isArray(document.pipeline) && document.pipeline.length > 0, 'pipeline must be a non-empty array', 'INVALID_PIPELINE');
  return { verdict: 'pass', order, nodeCount: order.length };
}
