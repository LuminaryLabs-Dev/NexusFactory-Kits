const EPSILON = 1e-9;

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function length(v) { return Math.hypot(v[0], v[1], v[2]); }
function normalize(v) {
  const n = length(v);
  if (n < EPSILON) throw new TypeError("Cannot normalize a zero-length vector.");
  return scale(v, 1 / n);
}

export function createMesh(id, material) {
  return { id, material, positions: [], indices: [] };
}

export function addTriangle(mesh, a, b, c) {
  const offset = mesh.positions.length / 3;
  mesh.positions.push(...a, ...b, ...c);
  mesh.indices.push(offset, offset + 1, offset + 2);
}

function addQuad(mesh, a, b, c, d) {
  addTriangle(mesh, a, b, c);
  addTriangle(mesh, a, c, d);
}

export function createBoxMesh(id, center, size, material) {
  const mesh = createMesh(id, material);
  const [cx, cy, cz] = center;
  const [hx, hy, hz] = size.map((value) => value / 2);
  const p = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]
  ];
  addQuad(mesh, p[0], p[3], p[2], p[1]);
  addQuad(mesh, p[4], p[5], p[6], p[7]);
  addQuad(mesh, p[0], p[4], p[7], p[3]);
  addQuad(mesh, p[1], p[2], p[6], p[5]);
  addQuad(mesh, p[3], p[7], p[6], p[2]);
  addQuad(mesh, p[0], p[1], p[5], p[4]);
  return mesh;
}

export function createBeamMesh(id, start, end, width, depth, material) {
  const mesh = createMesh(id, material);
  const axis = normalize(sub(end, start));
  const reference = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const side = normalize(cross(axis, reference));
  const up = normalize(cross(side, axis));
  const sw = scale(side, width / 2);
  const ud = scale(up, depth / 2);
  const corners = (origin) => [
    add(add(origin, sw), ud), add(sub(origin, sw), ud),
    sub(sub(origin, sw), ud), add(sub(origin, ud), sw)
  ];
  const a = corners(start);
  const b = corners(end);
  addQuad(mesh, a[0], a[1], a[2], a[3]);
  addQuad(mesh, b[3], b[2], b[1], b[0]);
  for (let i = 0; i < 4; i += 1) {
    const next = (i + 1) % 4;
    addQuad(mesh, a[i], b[i], b[next], a[next]);
  }
  return mesh;
}

export function createCylinderMesh(id, start, end, radius, segments, material) {
  const mesh = createMesh(id, material);
  const axis = normalize(sub(end, start));
  const reference = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalize(cross(axis, reference));
  const bitangent = normalize(cross(tangent, axis));
  const ringPoint = (origin, angle) => add(origin, add(scale(tangent, Math.cos(angle) * radius), scale(bitangent, Math.sin(angle) * radius)));
  for (let i = 0; i < segments; i += 1) {
    const a0 = i * Math.PI * 2 / segments;
    const a1 = (i + 1) * Math.PI * 2 / segments;
    const s0 = ringPoint(start, a0);
    const s1 = ringPoint(start, a1);
    const e0 = ringPoint(end, a0);
    const e1 = ringPoint(end, a1);
    addQuad(mesh, s0, e0, e1, s1);
    addTriangle(mesh, start, s1, s0);
    addTriangle(mesh, end, e0, e1);
  }
  return mesh;
}

export function createConeMesh(id, baseCenter, tip, radius, segments, material) {
  const mesh = createMesh(id, material);
  const axis = normalize(sub(tip, baseCenter));
  const reference = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalize(cross(axis, reference));
  const bitangent = normalize(cross(tangent, axis));
  for (let i = 0; i < segments; i += 1) {
    const a0 = i * Math.PI * 2 / segments;
    const a1 = (i + 1) * Math.PI * 2 / segments;
    const p0 = add(baseCenter, add(scale(tangent, Math.cos(a0) * radius), scale(bitangent, Math.sin(a0) * radius)));
    const p1 = add(baseCenter, add(scale(tangent, Math.cos(a1) * radius), scale(bitangent, Math.sin(a1) * radius)));
    addTriangle(mesh, p0, tip, p1);
    addTriangle(mesh, baseCenter, p1, p0);
  }
  return mesh;
}

export function createOctahedronMesh(id, center, radius, material) {
  const mesh = createMesh(id, material);
  const [x, y, z] = center;
  const top = [x, y + radius, z];
  const bottom = [x, y - radius, z];
  const ring = [[x + radius, y, z], [x, y, z + radius], [x - radius, y, z], [x, y, z - radius]];
  for (let i = 0; i < 4; i += 1) {
    const next = (i + 1) % 4;
    addTriangle(mesh, top, ring[i], ring[next]);
    addTriangle(mesh, bottom, ring[next], ring[i]);
  }
  return mesh;
}

export function createLowPolyClusterMesh(id, center, radius, material, options = {}) {
  const mesh = createMesh(id, material);
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = options.scale ?? [1, 1, 1];
  const rotation = Number(options.rotation ?? 0);
  const irregularity = Math.max(0, Number(options.irregularity ?? 0));
  const random = typeof options.random === "function" ? options.random : null;
  const ringSegments = 6;
  const jitter = () => random ? 1 + (random() - 0.5) * 2 * irregularity : 1;
  const top = [cx, cy + radius * sy, cz];
  const bottom = [cx, cy - radius * sy, cz];
  const upper = [];
  const lower = [];
  for (let i = 0; i < ringSegments; i += 1) {
    const upperAngle = rotation + i * Math.PI * 2 / ringSegments;
    const lowerAngle = upperAngle + Math.PI / ringSegments;
    upper.push([
      cx + Math.cos(upperAngle) * radius * 0.88 * sx * jitter(),
      cy + radius * 0.35 * sy * jitter(),
      cz + Math.sin(upperAngle) * radius * 0.88 * sz * jitter()
    ]);
    lower.push([
      cx + Math.cos(lowerAngle) * radius * 0.82 * sx * jitter(),
      cy - radius * 0.32 * sy * jitter(),
      cz + Math.sin(lowerAngle) * radius * 0.82 * sz * jitter()
    ]);
  }
  for (let i = 0; i < ringSegments; i += 1) {
    const next = (i + 1) % ringSegments;
    addTriangle(mesh, top, upper[i], upper[next]);
    addTriangle(mesh, upper[i], lower[i], upper[next]);
    addTriangle(mesh, upper[next], lower[i], lower[next]);
    addTriangle(mesh, bottom, lower[next], lower[i]);
  }
  return mesh;
}

export function meshBounds(meshes) {
  const points = meshes.flatMap((mesh) => {
    const out = [];
    for (let i = 0; i < mesh.positions.length; i += 3) out.push([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]]);
    return out;
  });
  if (!points.length) return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return { min, max, size: max.map((value, index) => value - min[index]) };
}

export function triangleCount(meshes) {
  return meshes.reduce((total, mesh) => total + Math.floor(mesh.indices.length / 3), 0);
}
