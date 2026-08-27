import * as THREE from '../vendor/three.module.js';
import { clamp, lerp, namedStream } from './runtime-service.mjs';

function ellipsoidSample(params) {
  const [cx, cy, cz] = params.center;
  const [rx, ry, rz] = params.radii;
  return (x, y, z) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const dz = (z - cz) / rz;
    return (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) * Math.min(rx, ry, rz);
  };
}

function taperedCapsuleSample(params) {
  const [ax, ay, az] = params.start;
  const [bx, by, bz] = params.end;
  const [radiusA, radiusB] = params.radii;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const lengthSquared = bax * bax + bay * bay + baz * baz;
  return (x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / lengthSquared, 0, 1);
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - lerp(radiusA, radiusB, h);
  };
}

function smoothUnion(a, b, radius) {
  const h = clamp(0.5 + 0.5 * (b - a) / radius, 0, 1);
  return lerp(b, a, h) - radius * h * (1 - h);
}

function gradient(field, x, y, z) {
  const e = 0.0025;
  const dx = field.sample(x + e, y, z) - field.sample(x - e, y, z);
  const dy = field.sample(x, y + e, z) - field.sample(x, y - e, z);
  const dz = field.sample(x, y, z + e) - field.sample(x, y, z - e);
  const length = Math.hypot(dx, dy, dz) || 1;
  return [dx / length, dy / length, dz / length];
}

function orientClosedTriangles(positions, triangles, field) {
  const edgeMap = new Map();
  for (let triangle = 0; triangle < triangles.length; triangle++) {
    const vertices = triangles[triangle];
    for (let edge = 0; edge < 3; edge++) {
      const from = vertices[edge], to = vertices[(edge + 1) % 3];
      const low = Math.min(from, to), high = Math.max(from, to);
      const key = `${low}:${high}`;
      const entries = edgeMap.get(key) ?? [];
      entries.push({ triangle, direction: from === low ? 1 : -1 });
      edgeMap.set(key, entries);
    }
  }
  const signs = new Int8Array(triangles.length);
  const components = [];
  for (let start = 0; start < triangles.length; start++) {
    if (signs[start]) continue;
    signs[start] = 1;
    const stack = [start];
    const component = [];
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      const vertices = triangles[current];
      for (let edge = 0; edge < 3; edge++) {
        const from = vertices[edge], to = vertices[(edge + 1) % 3];
        const low = Math.min(from, to), high = Math.max(from, to);
        const entries = edgeMap.get(`${low}:${high}`) ?? [];
        const currentDirection = from === low ? 1 : -1;
        for (const entry of entries) {
          if (entry.triangle === current) continue;
          const requiredSign = -currentDirection * signs[current] * entry.direction;
          if (!signs[entry.triangle]) {
            signs[entry.triangle] = requiredSign;
            stack.push(entry.triangle);
          }
        }
      }
    }
    components.push(component);
  }
  for (const component of components) {
    let outwardEvidence = 0;
    const stride = Math.max(1, Math.floor(component.length / 500));
    for (let sample = 0; sample < component.length; sample += stride) {
      const triangleIndex = component[sample];
      const source = triangles[triangleIndex];
      const vertices = signs[triangleIndex] === 1 ? source : [source[0], source[2], source[1]];
      const [a, b, c] = vertices;
      const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
      const cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      const direction = gradient(field, (ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
      outwardEvidence += nx * direction[0] + ny * direction[1] + nz * direction[2];
    }
    if (outwardEvidence < 0) for (const triangleIndex of component) signs[triangleIndex] *= -1;
  }
  const indices = [];
  for (let i = 0; i < triangles.length; i++) {
    const [a, b, c] = triangles[i];
    if (signs[i] === 1) indices.push(a, b, c);
    else indices.push(a, c, b);
  }
  return indices;
}

function smoothShellPositions(positions, triangles, field, settings) {
  const vertexCount = positions.length / 3;
  const adjacency = Array.from({ length: vertexCount }, () => new Set());
  for (const [a, b, c] of triangles) {
    adjacency[a].add(b); adjacency[a].add(c);
    adjacency[b].add(a); adjacency[b].add(c);
    adjacency[c].add(a); adjacency[c].add(b);
  }
  const applyPass = (factor) => {
    const next = positions.slice();
    for (let i = 0; i < vertexCount; i++) {
      const neighbors = adjacency[i];
      if (!neighbors.size) continue;
      let x = 0, y = 0, z = 0;
      for (const neighbor of neighbors) {
        x += positions[neighbor * 3];
        y += positions[neighbor * 3 + 1];
        z += positions[neighbor * 3 + 2];
      }
      x /= neighbors.size; y /= neighbors.size; z /= neighbors.size;
      next[i * 3] += (x - positions[i * 3]) * factor;
      next[i * 3 + 1] += (y - positions[i * 3 + 1]) * factor;
      next[i * 3 + 2] += (z - positions[i * 3 + 2]) * factor;
    }
    for (let i = 0; i < positions.length; i++) positions[i] = next[i];
  };
  for (let iteration = 0; iteration < settings.iterations; iteration++) {
    applyPass(settings.forwardFactor);
    applyPass(settings.reverseFactor);
    for (let i = 0; i < vertexCount; i++) {
      const offset = i * 3;
      const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
      const distance = field.sample(x, y, z);
      const direction = gradient(field, x, y, z);
      positions[offset] -= direction[0] * distance * settings.reprojectFactor;
      positions[offset + 1] -= direction[1] * distance * settings.reprojectFactor;
      positions[offset + 2] -= direction[2] * distance * settings.reprojectFactor;
    }
  }
}

function buildBodyGeometry(positions, indices, surface, seed) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const uvs = new Float32Array((positions.length / 3) * 2);
  const colors = new Float32Array(positions.length);
  const zones = new Float32Array(positions.length / 3);
  const base = new THREE.Color(surface.baseColor);
  const underside = new THREE.Color(surface.undersideColor);
  const dorsal = new THREE.Color(surface.dorsalColor);
  const colorNoise = namedStream(seed, 'body-vertex-color');
  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    uvs[i * 2] = (x - bounds.min.x) / (bounds.max.x - bounds.min.x);
    uvs[i * 2 + 1] = (y - bounds.min.y) / (bounds.max.y - bounds.min.y);
    const color = base.clone();
    color.offsetHSL(surface.hueShift, surface.saturationShift, surface.brightnessShift + (colorNoise() - 0.5) * 0.035);
    const underMask = clamp((0.86 - y) / 0.7, 0, 1) * clamp(1 - Math.abs(z) / 1.5, 0, 1);
    color.lerp(underside, underMask * 0.58);
    const dorsalMask = clamp((y - 2.05) / 1.3, 0, 1);
    color.lerp(dorsal, dorsalMask * surface.mottling * 0.45);
    const limbCrease = clamp(1 - Math.min(Math.abs(x + 1.3), Math.abs(x - 1.3)) / 0.48, 0, 1)
      * clamp((1.38 - y) / 0.62, 0, 1)
      * clamp((Math.abs(z) - 0.38) / 0.45, 0, 1);
    const neckCrease = clamp(1 - Math.abs(x + 1.58) / 0.58, 0, 1)
      * clamp((y - 1.55) / 0.75, 0, 1)
      * clamp((Math.abs(z) - 0.28) / 0.55, 0, 1);
    const cavityMask = clamp(Math.max(limbCrease, neckCrease), 0, 1);
    if ((surface.cavityStrength ?? 0) > 0) color.lerp(new THREE.Color(surface.cavityColor ?? '#4a2417'), cavityMask * surface.cavityStrength);
    const mouthY = 1.53 + (x + 3.05) * 0.028;
    const mouthMask = x < -2.63 && x > -3.48 && Math.abs(y - mouthY) < 0.065 && Math.abs(z) > 0.43;
    const nostrilDistance = ((x + 3.42) / 0.072) ** 2 + ((y - 1.83) / 0.052) ** 2;
    const nostrilMask = nostrilDistance < 1 && Math.abs(z) > 0.43;
    if (mouthMask) color.lerp(new THREE.Color('#24150f'), 0.48);
    if (nostrilMask) color.lerp(new THREE.Color('#17110d'), 0.9);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    zones[i] = underMask > 0.42 ? 1 : dorsalMask > 0.35 ? 2 : x < -2.3 ? 3 : Math.abs(z) > 0.72 ? 4 : 0;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('surfaceZone', new THREE.BufferAttribute(zones, 1));
  geometry.userData.surfaceZones = {
    schema: 'triceratops-surface-zones/v1',
    labels: ['body', 'underside', 'dorsal', 'face', 'extremity'],
    complete: true
  };
  return geometry;
}

function extractProjectedVoxelShell(field, params, seed) {
  const { domain, resolution, projection, smoothing, surface } = params;
  const cells = resolution - 1;
  const cellPlane = cells * cells;
  const occupied = new Uint8Array(cells * cells * cells);
  const xs = new Float64Array(cells + 1), ys = new Float64Array(cells + 1), zs = new Float64Array(cells + 1);
  for (let i = 0; i <= cells; i++) {
    xs[i] = lerp(domain.min[0], domain.max[0], i / cells);
    ys[i] = lerp(domain.min[1], domain.max[1], i / cells);
    zs[i] = lerp(domain.min[2], domain.max[2], i / cells);
  }
  for (let z = 0; z < cells; z++) for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const centerX = (xs[x] + xs[x + 1]) * 0.5;
    const centerY = (ys[y] + ys[y + 1]) * 0.5;
    const centerZ = (zs[z] + zs[z + 1]) * 0.5;
    occupied[x + y * cells + z * cellPlane] = field.sample(centerX, centerY, centerZ) <= 0 ? 1 : 0;
  }
  const positions = [];
  const triangles = [];
  const quads = [];
  const vertexMap = new Map();
  const vertex = (x, y, z) => {
    const key = `${x}:${y}:${z}`;
    const existing = vertexMap.get(key);
    if (existing !== undefined) return existing;
    const index = positions.length / 3;
    positions.push(xs[x], ys[y], zs[z]);
    vertexMap.set(key, index);
    return index;
  };
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < cells && y < cells && z < cells && occupied[x + y * cells + z * cellPlane] === 1;
  const faces = [
    { neighbor: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { neighbor: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { neighbor: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { neighbor: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { neighbor: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
    { neighbor: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }
  ];
  for (let z = 0; z < cells; z++) for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    if (!inside(x, y, z)) continue;
    for (const face of faces) {
      const [nx, ny, nz] = face.neighbor;
      if (inside(x + nx, y + ny, z + nz)) continue;
      const q = face.corners.map(([dx, dy, dz]) => vertex(x + dx, y + dy, z + dz));
      quads.push(q);
      const parity = (x + y + z) & 1;
      if (parity === 0) triangles.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
      else triangles.push([q[0], q[1], q[3]], [q[1], q[2], q[3]]);
    }
  }
  if (!triangles.length) throw new Error('Projected voxel shell produced no triangles');
  for (let i = 0; i < positions.length / 3; i++) {
    let x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    for (let iteration = 0; iteration < projection.iterations; iteration++) {
      const distance = field.sample(x, y, z);
      const direction = gradient(field, x, y, z);
      x -= direction[0] * distance * projection.factor;
      y -= direction[1] * distance * projection.factor;
      z -= direction[2] * distance * projection.factor;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  if (smoothing.enabled) smoothShellPositions(positions, triangles, field, smoothing);
  const indices = orientClosedTriangles(positions, triangles, field);
  const geometry = buildBodyGeometry(positions, indices, surface, seed);
  geometry.userData.quadTopology = { kind: 'paired-triangle-quads', source: 'projected-voxel-shell', quads };
  return geometry;
}

function loopRingWeight(point, params) {
  const axisIndex = { x: 0, y: 1, z: 2 }[params.axis];
  if (axisIndex === undefined) throw new Error(`Unsupported loop-ring axis: ${params.axis}`);
  if (!Number.isFinite(params.center) || !Number.isFinite(params.halfWidth) || params.halfWidth <= 0) throw new Error('Loop-ring center and halfWidth must be finite, with halfWidth above zero');
  const distance = Math.abs(point[axisIndex] - params.center) / params.halfWidth;
  const linear = clamp(1 - distance, 0, 1);
  const smooth = linear * linear * (3 - 2 * linear);
  return Math.pow(smooth, params.falloff ?? 1);
}

function applyLoopRingPoint(point, params) {
  const pivot = params.pivot ?? [0, 0, 0];
  const scale = params.scale ?? [1, 1, 1];
  const translate = params.translate ?? [0, 0, 0];
  const rotate = params.rotate ?? [0, 0, 0];
  if (![pivot, scale, translate, rotate].every((value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite))) throw new Error('Loop-ring pivot, scale, translate and rotate must be finite vec3 values');
  if (scale.some((value) => value <= 0)) throw new Error('Loop-ring scale values must be above zero');
  const weight = loopRingWeight(point, params);
  const local = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const blendedScale = 1 + (scale[axis] - 1) * weight;
    local[axis] = (point[axis] - pivot[axis]) * blendedScale;
  }
  const [rx, ry, rz] = rotate.map((degrees) => THREE.MathUtils.degToRad(degrees * weight));
  let [x, y, z] = local;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const result = [x, y, z].map((value, axis) => value + pivot[axis] + translate[axis] * weight);
  return { point: result, weight };
}

function deformGeometryWithLoopRing(source, params) {
  const geometry = source.clone();
  const position = geometry.getAttribute('position');
  const selected = new Set();
  const quads = geometry.userData.quadTopology?.quads;
  if (params.selectionMode === 'quad-ring' && Array.isArray(quads)) {
    const axisIndex = { x: 0, y: 1, z: 2 }[params.axis];
    for (const quad of quads) {
      const center = quad.reduce((sum, vertex) => sum + position.array[vertex * 3 + axisIndex], 0) / quad.length;
      if (Math.abs(center - params.center) <= params.halfWidth) for (const vertex of quad) selected.add(vertex);
    }
  }
  for (let index = 0; index < position.count; index++) {
    if (selected.size && !selected.has(index)) continue;
    const transformed = applyLoopRingPoint([position.getX(index), position.getY(index), position.getZ(index)], params).point;
    position.setXYZ(index, transformed[0], transformed[1], transformed[2]);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function deformAttachmentsWithLoopRing(source, params) {
  const descriptor = structuredClone(source);
  const scale = params.scale ?? [1, 1, 1];
  for (const item of descriptor.items) {
    const anchor = item.position ?? item.start;
    const weight = loopRingWeight(anchor, params);
    if (item.start) item.start = applyLoopRingPoint(item.start, params).point;
    if (item.end) item.end = applyLoopRingPoint(item.end, params).point;
    if (item.position) item.position = applyLoopRingPoint(item.position, params).point;
    const localScale = scale.map((value) => 1 + (value - 1) * weight);
    if (Number.isFinite(item.radius)) item.radius *= Math.cbrt(localScale[0] * localScale[1] * localScale[2]);
    if (Array.isArray(item.scale)) item.scale = item.scale.map((value, axis) => value * localScale[axis]);
  }
  return descriptor;
}

function texture(seed, size = 256, kind = 'hide', options = {}) {
  const random = namedStream(seed, `${kind}-texture`);
  const data = new Uint8Array(size * size * 4);
  const cells = Array.from({ length: 32 * 32 }, () => random());
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / size * 32, gy = y / size * 32;
    const x0 = Math.floor(gx) % 32, y0 = Math.floor(gy) % 32;
    const x1 = (x0 + 1) % 32, y1 = (y0 + 1) % 32;
    const tx = gx - Math.floor(gx), ty = gy - Math.floor(gy);
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = lerp(cells[y0 * 32 + x0], cells[y0 * 32 + x1], sx);
    const b = lerp(cells[y1 * 32 + x0], cells[y1 * 32 + x1], sx);
    const noise = lerp(a, b, sy);
    const brush = 0.5 + 0.5 * Math.sin(x * 0.19 + y * 0.07 + noise * 4);
    const facetScale = kind === 'hide' ? (options.facetScale ?? 14) : 18;
    const facetX = x / size * facetScale, facetY = y / size * facetScale;
    const cellX = Math.floor(facetX), cellY = Math.floor(facetY);
    const localX = facetX - cellX, localY = facetY - cellY;
    const triangle = localX + localY > 1 ? 1 : 0;
    const facetRandom = namedStream(seed ^ namedHash(kind), `facet-${cellX}-${cellY}-${triangle}`)();
    const facetValue = (facetRandom - 0.5) * (kind === 'hide' ? (options.facetContrast ?? 0.2) : 0.08);
    const value = (noise - 0.5) * (options.noiseStrength ?? 0.19) + (brush - 0.5) * (options.brushStrength ?? 0.045) + facetValue;
    const i = (y * size + x) * 4;
    if (kind === 'hide') {
      data[i] = clamp(Math.round((0.98 + value) * 255), 0, 255);
      data[i + 1] = clamp(Math.round((0.88 + value * 0.8) * 255), 0, 255);
      data[i + 2] = clamp(Math.round((0.72 + value * 0.55) * 255), 0, 255);
    } else {
      data[i] = clamp(Math.round((0.99 + value * 0.45) * 255), 0, 255);
      data[i + 1] = clamp(Math.round((0.95 + value * 0.4) * 255), 0, 255);
      data[i + 2] = clamp(Math.round((0.82 + value * 0.35) * 255), 0, 255);
    }
    data[i + 3] = 255;
  }
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.RepeatWrapping;
  result.repeat.set(kind === 'hide' ? 1.75 : 1.6, kind === 'hide' ? 1.45 : 1.6);
  result.colorSpace = THREE.SRGBColorSpace;
  result.needsUpdate = true;
  return result;
}

function scalarTexture(seed, size, kind, options = {}) {
  const random = namedStream(seed, `${kind}-texture`);
  const data = new Uint8Array(size * size * 4);
  const cells = Array.from({ length: 24 * 24 }, () => random());
  const scale = options.scale ?? 13;
  const strength = options.strength ?? 0.12;
  const base = options.base ?? 0.68;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / size * scale, gy = y / size * scale;
    const cx = Math.floor(gx), cy = Math.floor(gy);
    const localX = gx - cx, localY = gy - cy;
    const triangle = localX + localY > 1 ? 1 : 0;
    const facet = namedStream(seed ^ namedHash(kind), `${cx}:${cy}:${triangle}`)();
    const coarse = cells[(Math.abs(cy) % 24) * 24 + (Math.abs(cx) % 24)];
    const value = clamp(base + (facet - 0.5) * strength + (coarse - 0.5) * strength * 0.35, 0.04, 0.98);
    const byte = Math.round(value * 255);
    const index = (y * size + x) * 4;
    data[index] = byte;
    data[index + 1] = byte;
    data[index + 2] = byte;
    data[index + 3] = 255;
  }
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.RepeatWrapping;
  result.repeat.set(1.8, 1.5);
  result.needsUpdate = true;
  return result;
}

function normalTexture(seed, size, options = {}) {
  const random = namedStream(seed, 'hide-normal-texture');
  const data = new Uint8Array(size * size * 4);
  const scale = options.scale ?? 18;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / size * scale, gy = y / size * scale;
    const cx = Math.floor(gx), cy = Math.floor(gy);
    const localX = gx - cx, localY = gy - cy;
    const triangle = localX + localY > 1 ? 1 : 0;
    const angle = namedStream(seed ^ namedHash('normal'), `${cx}:${cy}:${triangle}`)() * Math.PI * 2;
    const jitter = 0.7 + random() * 0.3;
    const nx = Math.cos(angle) * 0.55 * jitter;
    const ny = Math.sin(angle) * 0.55 * jitter;
    const index = (y * size + x) * 4;
    data[index] = Math.round((nx * 0.5 + 0.5) * 255);
    data[index + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    data[index + 2] = 255;
    data[index + 3] = 255;
  }
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.RepeatWrapping;
  result.repeat.set(1.8, 1.5);
  result.needsUpdate = true;
  return result;
}

function namedHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function closedConeGeometry(radius, length, segments) {
  const positions = [];
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, -length * 0.5, Math.sin(angle) * radius);
  }
  const tip = positions.length / 3;
  positions.push(0, length * 0.5, 0);
  const baseCenter = positions.length / 3;
  positions.push(0, -length * 0.5, 0);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(i, tip, next, next, baseCenter, i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function coneBetween(item, material) {
  const start = new THREE.Vector3(...item.start);
  const end = new THREE.Vector3(...item.end);
  const direction = end.clone().sub(start);
  const geometry = closedConeGeometry(item.radius, direction.length(), item.segments);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = item.id;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createMaterials(descriptor, seed) {
  const v2 = descriptor.shaderVersion === 2;
  const bodyMap = texture(seed, 256, 'hide', descriptor);
  const boneMap = texture(seed, 192, 'bone');
  const roughnessMap = v2 ? scalarTexture(seed, 192, 'roughness', {
    base: descriptor.roughness,
    strength: descriptor.roughnessVariation,
    scale: descriptor.facetScale
  }) : null;
  const hideNormalMap = v2 && descriptor.normalStrength > 0 ? normalTexture(seed, 192, {
    strength: descriptor.normalStrength,
    scale: descriptor.normalScale
  }) : null;
  return {
    body: new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: bodyMap,
      roughnessMap,
      normalMap: hideNormalMap,
      normalScale: new THREE.Vector2(descriptor.normalStrength ?? 0, descriptor.normalStrength ?? 0),
      flatShading: descriptor.flatShading,
      roughness: descriptor.roughness,
      metalness: 0
    }),
    bone: new THREE.MeshStandardMaterial({ color: descriptor.boneColor, map: boneMap, flatShading: true, roughness: descriptor.boneRoughness, metalness: 0 }),
    iris: new THREE.MeshStandardMaterial({ color: descriptor.irisColor, flatShading: true, roughness: 0.5 }),
    pupil: new THREE.MeshStandardMaterial({ color: descriptor.pupilColor, flatShading: true, roughness: 0.42 })
  };
}

function assembleAsset(bodyGeometry, materialsDescriptor, attachmentDescriptor, seed) {
  const root = new THREE.Group();
  root.name = attachmentDescriptor.assetName;
  const materials = createMaterials(materialsDescriptor, seed);
  const body = new THREE.Mesh(bodyGeometry, materials.body);
  body.name = 'unified-body-shell';
  body.userData.role = 'structural-shell';
  body.userData.shaderVersion = materialsDescriptor.shaderVersion ?? 1;
  root.add(body);
  const attachments = new THREE.Group();
  attachments.name = 'replaceable-attachments';
  root.add(attachments);
  for (const item of attachmentDescriptor.items) {
    if (item.kind === 'cone') attachments.add(coneBetween(item, materials[item.material]));
    else if (item.kind === 'icosahedron') {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(item.radius, item.detail), materials[item.material]);
      mesh.name = item.id;
      mesh.position.set(...item.position);
      mesh.scale.set(...item.scale);
      attachments.add(mesh);
    }
  }
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  root.position.y -= bounds.min.y;
  root.updateMatrixWorld(true);
  root.userData.structure = {
    structuralShellMeshes: 1,
    structuralShellName: body.name,
    attachmentPolicy: ['horns', 'frill-spikes', 'claws', 'eyes', 'pupils', 'beak']
  };
  return { root, body, attachments, materials };
}

function createStudio(asset, params) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(params.background);
  const camera = new THREE.PerspectiveCamera(params.fov, params.width / params.height, 0.1, 100);
  const az = THREE.MathUtils.degToRad(params.azimuth);
  const el = THREE.MathUtils.degToRad(params.elevation);
  camera.position.set(Math.cos(az) * params.radius, params.cameraBaseY + Math.sin(el) * params.radius * 0.42, Math.sin(az) * params.radius);
  camera.lookAt(...params.lookAt);
  scene.add(new THREE.HemisphereLight(params.hemisphere.sky, params.hemisphere.ground, params.hemisphere.intensity));
  const key = new THREE.DirectionalLight(params.key.color, params.key.intensity);
  key.position.set(...params.key.position);
  scene.add(key);
  const fill = new THREE.DirectionalLight(params.fill.color, params.fill.intensity);
  fill.position.set(...params.fill.position);
  scene.add(fill);
  const rim = new THREE.PointLight(params.rim.color, params.rim.intensity, params.rim.distance);
  rim.position.set(...params.rim.position);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(params.floor.size, params.floor.size), new THREE.MeshStandardMaterial({ color: params.floor.color, roughness: params.floor.roughness, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(params.floor.size, params.floor.divisions, params.floor.gridMajor, params.floor.gridMinor);
  grid.position.y = 0.012;
  scene.add(grid);
  scene.add(asset.root);
  return { scene, camera, asset, width: params.width, height: params.height };
}

export function registerCoreNodes(registry) {
  registry.register('shape.sdf.ellipsoid', ({ node }) => ({ kind: 'sdf', sample: ellipsoidSample(node.params) }));
  registry.register('shape.sdf.taperedCapsule', ({ node }) => ({ kind: 'sdf', sample: taperedCapsuleSample(node.params) }));
  registry.register('shape.boolean.smoothUnionSequence', ({ node, inputs }) => {
    if (inputs.length < 1 || node.params.radii.length !== inputs.length - 1) throw new Error('smoothUnionSequence radii must match inputs minus one');
    return {
      kind: 'sdf',
      sample(x, y, z) {
        let distance = inputs[0].sample(x, y, z);
        for (let i = 1; i < inputs.length; i++) distance = smoothUnion(distance, inputs[i].sample(x, y, z), node.params.radii[i - 1]);
        return distance;
      }
    };
  });
  registry.register('shape.boolean.subtract', ({ inputs }) => ({ kind: 'sdf', sample: (x, y, z) => Math.max(inputs[0].sample(x, y, z), -inputs[1].sample(x, y, z)) }));
  registry.register('mesh.extract.projectedVoxelShell', ({ node, inputs, document }) => ({ kind: 'geometry', geometry: extractProjectedVoxelShell(inputs[0], node.params, document.seed) }));
  registry.register('edit.loopRing', ({ node }) => ({ kind: 'loop-ring-edit', ...structuredClone(node.params) }));
  registry.register('mesh.deform.loopRing', ({ inputs }) => {
    if (inputs[0]?.kind !== 'geometry' || inputs[1]?.kind !== 'loop-ring-edit') throw new Error('mesh.deform.loopRing requires geometry and loop-ring edit inputs');
    return { kind: 'geometry', geometry: deformGeometryWithLoopRing(inputs[0].geometry, inputs[1]) };
  });
  registry.register('material.characterPbr', ({ node }) => ({ kind: 'material-descriptor', ...structuredClone(node.params) }));
  registry.register('material.triceratopsSkinPbrV2', ({ node }) => ({ kind: 'material-descriptor', shaderVersion: 2, ...structuredClone(node.params) }));
  registry.register('lighting.sunPath', ({ node }) => ({ kind: 'sun-path-descriptor', ...structuredClone(node.params) }));
  registry.register('scene.environmentPreset', ({ node }) => ({ kind: 'environment-preset-descriptor', ...structuredClone(node.params) }));
  registry.register('review.lightSweep', ({ node }) => ({ kind: 'light-sweep-descriptor', ...structuredClone(node.params) }));
  registry.register('mesh.attachments', ({ node }) => {
    const descriptor = { kind: 'attachment-descriptor', ...structuredClone(node.params) };
    const hornLength = descriptor.hornLength ?? descriptor.baselineHornLength;
    const frillWidth = descriptor.frillWidth ?? descriptor.baselineFrillWidth;
    for (const item of descriptor.items) {
      if (item.id.startsWith('brow-horn-')) item.end[0] = item.start[0] - 1.08 * hornLength;
      if (item.id.startsWith('frill-spike-')) {
        const sourceZ = item.start[2] / descriptor.baselineFrillWidth;
        item.start[2] = sourceZ * frillWidth;
        item.end[2] = item.start[2] + (sourceZ >= 0 ? 0.28 : -0.28);
      }
    }
    return descriptor;
  });
  registry.register('mesh.attachments.deformLoopRing', ({ inputs }) => {
    if (inputs[0]?.kind !== 'attachment-descriptor' || inputs[1]?.kind !== 'loop-ring-edit') throw new Error('mesh.attachments.deformLoopRing requires attachment and loop-ring edit inputs');
    return deformAttachmentsWithLoopRing(inputs[0], inputs[1]);
  });
  registry.register('asset.assemble', ({ inputs, document }) => ({ kind: 'asset', ...assembleAsset(inputs[0].geometry, inputs[1], inputs[2], document.seed) }));
  registry.register('scene.studio', ({ node, inputs }) => ({ kind: 'scene', ...createStudio(inputs[0], node.params) }));
  return registry;
}

export { THREE, extractProjectedVoxelShell, closedConeGeometry, applyLoopRingPoint };
