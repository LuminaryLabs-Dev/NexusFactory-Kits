export function hashSeed(seed) {
  let value = 2166136261;
  for (const char of String(seed)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function randomBetween(random, min, max) {
  return min + (max - min) * random();
}

export function randomInt(random, min, maxInclusive) {
  return Math.floor(randomBetween(random, min, maxInclusive + 1));
}

export function deriveSeed(seed, label) {
  return `${String(seed)}:${String(label)}:${hashSeed(`${seed}:${label}`).toString(16)}`;
}
