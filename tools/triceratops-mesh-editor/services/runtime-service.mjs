export function deepClone(value) {
  return structuredClone(value);
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function signature(value) {
  return fnv1a(stableStringify(value)).toString(16).padStart(8, '0');
}

export function namedStream(seed, label) {
  let state = (Number(seed) ^ fnv1a(label)) >>> 0 || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function assert(condition, message, code = 'ASSERTION_FAILED') {
  if (condition) return;
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
