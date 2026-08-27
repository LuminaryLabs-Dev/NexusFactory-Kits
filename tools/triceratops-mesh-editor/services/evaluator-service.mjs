import { stableStringify, signature, nowMs } from './runtime-service.mjs';
import { validateMeshProgram } from './ast-service.mjs';

export class NodeRegistry {
  #handlers = new Map();

  register(type, handler) {
    if (this.#handlers.has(type)) throw new Error(`Node type already registered: ${type}`);
    this.#handlers.set(type, handler);
    return this;
  }

  has(type) {
    return this.#handlers.has(type);
  }

  get(type) {
    const handler = this.#handlers.get(type);
    if (!handler) throw new Error(`Unknown node type: ${type}`);
    return handler;
  }

  describe() {
    return [...this.#handlers.keys()].sort();
  }
}

export class IncrementalEvaluator {
  constructor(registry) {
    this.registry = registry;
    this.cache = new Map();
  }

  clear() {
    this.cache.clear();
  }

  async evaluate(document, context = {}, options = {}) {
    const schema = validateMeshProgram(document, this.registry);
    const values = new Map();
    const signatures = new Map();
    const stages = [];
    for (const id of schema.order) {
      const node = document.nodes[id];
      const inputValues = (node.inputs ?? []).map((input) => values.get(input));
      const inputSignatures = (node.inputs ?? []).map((input) => signatures.get(input));
      const cacheKey = signature({ id, type: node.type, params: node.params ?? {}, inputSignatures, seed: document.seed });
      const cached = options.forceClean ? null : this.cache.get(id);
      if (cached?.key === cacheKey) {
        values.set(id, cached.value);
        signatures.set(id, cached.signature);
        stages.push({ id, type: node.type, status: 'reused', inputSignature: signature(inputSignatures), outputSignature: cached.signature, timingMs: 0 });
        continue;
      }
      const started = nowMs();
      const value = await this.registry.get(node.type)({ id, node, inputs: inputValues, document, context });
      const outputSignature = value?.semanticSignature ?? cacheKey;
      const timingMs = Number((nowMs() - started).toFixed(3));
      this.cache.set(id, { key: cacheKey, value, signature: outputSignature });
      values.set(id, value);
      signatures.set(id, outputSignature);
      stages.push({ id, type: node.type, status: 'computed', inputSignature: signature(inputSignatures), outputSignature, timingMs });
    }
    const outputs = Object.fromEntries(Object.entries(document.outputs ?? {}).map(([name, id]) => [name, values.get(id)]));
    return {
      document,
      outputs,
      values,
      signatures,
      stages,
      semanticSignature: signature({ schema: document.schema, seed: document.seed, outputs: Object.fromEntries(Object.entries(document.outputs ?? {}).map(([name, id]) => [name, signatures.get(id)])) })
    };
  }
}
