import * as THREE from 'three';

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function range(random, minimum, maximum) {
  return minimum + (maximum - minimum) * random();
}

function material(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
}

function addSegment(group, start, end, startRadius, endRadius, surface, radialSegments = 7, flatten = 1) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(endRadius, startRadius, length, radialSegments, 1, false),
    surface,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.scale.z = flatten;
  group.add(mesh);
  return mesh;
}

function addBlob(group, position, radius, surface, scale = [1, 1, 1], detail = 1) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), surface);
  mesh.position.copy(position);
  mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}

function growBranch(group, random, start, direction, length, radius, depth, surface, options = {}) {
  const end = start.clone().addScaledVector(direction, length);
  addSegment(group, start, end, radius, radius * 0.72, surface, options.radialSegments ?? 7, options.flatten ?? 1);
  addBlob(group, end, radius * 0.82, surface, [1, 1.08, options.flatten ?? 1], 0);
  if (depth <= 0) return;

  const forks = options.forks ?? (depth > 1 ? 2 : 3);
  for (let index = 0; index < forks; index += 1) {
    const azimuth = range(random, -Math.PI, Math.PI) + index * Math.PI * 2 / forks;
    const tilt = range(random, options.tiltMin ?? 0.38, options.tiltMax ?? 0.8);
    const local = new THREE.Vector3(
      Math.cos(azimuth) * Math.sin(tilt),
      Math.cos(tilt),
      Math.sin(azimuth) * Math.sin(tilt) * (options.planar ?? 1),
    );
    const nextDirection = local.lerp(direction, options.inheritance ?? 0.32).normalize();
    growBranch(
      group,
      random,
      end,
      nextDirection,
      length * range(random, 0.6, 0.78),
      radius * range(random, 0.58, 0.72),
      depth - 1,
      surface,
      options,
    );
  }
}

function createRuffledDisc(radius, thickness, lobes, phase, surface) {
  const geometry = new THREE.CylinderGeometry(radius * 0.9, radius, thickness, 28, 2, false);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const distance = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const edge = Math.min(1, distance / radius);
    const radialNoise = 1 + 0.075 * Math.sin(lobes * angle + phase) * edge;
    positions.setXYZ(
      index,
      x * radialNoise,
      y + Math.sin((lobes - 1) * angle + phase * 0.6) * 0.07 * edge,
      z * radialNoise,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, surface);
}

function buildStaghorn(root, random, surfaces) {
  const bases = [-0.58, 0, 0.55];
  for (const x of bases) {
    const start = new THREE.Vector3(x, 0.03, range(random, -0.16, 0.16));
    const direction = new THREE.Vector3(range(random, -0.14, 0.14), 1, range(random, -0.1, 0.1)).normalize();
    growBranch(root, random, start, direction, range(random, 0.82, 1.05), 0.16, 2, surfaces.base, {
      forks: 2,
      tiltMin: 0.42,
      tiltMax: 0.72,
      inheritance: 0.4,
      radialSegments: 7,
    });
  }
}

function buildElkhorn(root, random, surfaces) {
  const starts = [-0.55, 0, 0.52];
  for (const x of starts) {
    const start = new THREE.Vector3(x, 0.02, range(random, -0.12, 0.12));
    const direction = new THREE.Vector3(x * 0.22, 1, 0).normalize();
    growBranch(root, random, start, direction, range(random, 1.0, 1.2), 0.22, 2, surfaces.base, {
      forks: 2,
      tiltMin: 0.28,
      tiltMax: 0.56,
      inheritance: 0.48,
      radialSegments: 6,
      planar: 0.16,
      flatten: 0.58,
    });
  }
}

function buildBrain(root, random, surfaces) {
  addBlob(root, new THREE.Vector3(0, 0.62, 0), 0.95, surfaces.base, [1.12, 0.72, 0.9], 2);
  for (let row = -3; row <= 3; row += 1) {
    let previous = null;
    for (let step = 0; step <= 12; step += 1) {
      const x = -0.84 + step * 0.14;
      const z = row * 0.17 + Math.sin(step * 1.15 + row) * 0.085;
      const normalized = Math.min(0.98, (x / 1.02) ** 2 + (z / 0.82) ** 2);
      const y = 0.6 + Math.sqrt(Math.max(0, 1 - normalized)) * 0.64;
      const point = new THREE.Vector3(x, y, z);
      if (previous) addSegment(root, previous, point, 0.055, 0.055, surfaces.accent, 6);
      previous = point;
    }
  }
}

function buildPillars(root, random, surfaces) {
  const positions = [[-0.62, 0.05], [-0.27, -0.16], [0.12, 0.12], [0.55, -0.02], [0.72, 0.32]];
  positions.forEach(([x, z], index) => {
    const height = range(random, 0.9, 1.75) * (index === 2 ? 1.12 : 1);
    const points = [new THREE.Vector3(x, 0.02, z)];
    for (let segment = 1; segment <= 4; segment += 1) {
      points.push(new THREE.Vector3(
        x + Math.sin(segment * 1.2 + index) * 0.06,
        height * segment / 4,
        z + Math.cos(segment + index) * 0.045,
      ));
    }
    for (let segment = 0; segment < 4; segment += 1) {
      const taper = 1 - segment * 0.1;
      addSegment(root, points[segment], points[segment + 1], 0.2 * taper, 0.18 * taper, surfaces.base, 8);
    }
    addBlob(root, points.at(-1), 0.2, surfaces.accent, [1, 0.72, 1], 1);
  });
}

function buildLettuce(root, random, surfaces) {
  for (let layer = 0; layer < 6; layer += 1) {
    const radius = 0.52 + layer * 0.15;
    const disc = createRuffledDisc(radius, 0.07, 7 + layer % 3, layer * 0.9, layer % 2 ? surfaces.accent : surfaces.base);
    disc.position.y = 0.18 + layer * 0.15;
    disc.rotation.x = range(random, -0.16, 0.16);
    disc.rotation.z = range(random, -0.12, 0.12);
    disc.rotation.y = layer * 0.7;
    root.add(disc);
  }
}

function buildSeaFan(root, random, surfaces) {
  const base = new THREE.Vector3(0, 0.02, 0);
  const trunkTop = new THREE.Vector3(0, 0.65, 0);
  addSegment(root, base, trunkTop, 0.16, 0.11, surfaces.base, 7, 0.48);
  for (let side = -1; side <= 1; side += 2) {
    for (let branch = 0; branch < 5; branch += 1) {
      const start = new THREE.Vector3(0, 0.48 + branch * 0.19, 0);
      const end = new THREE.Vector3(side * (0.48 + branch * 0.13), 0.92 + branch * 0.24, range(random, -0.035, 0.035));
      addSegment(root, start, end, 0.075, 0.038, surfaces.base, 6, 0.42);
      let previous = end;
      for (let twig = 1; twig <= 3; twig += 1) {
        const tip = new THREE.Vector3(
          end.x + side * twig * 0.16,
          end.y + twig * 0.2 + Math.sin(branch + twig) * 0.05,
          range(random, -0.045, 0.045),
        );
        addSegment(root, previous, tip, 0.038, 0.018, twig === 3 ? surfaces.accent : surfaces.base, 5, 0.35);
        previous = tip;
      }
    }
  }
}

function buildSeaRods(root, random, surfaces) {
  for (let index = 0; index < 12; index += 1) {
    const angle = index * 2.399963 + range(random, -0.16, 0.16);
    const radius = 0.2 + Math.sqrt(index / 12) * 0.75;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.64;
    const height = range(random, 0.9, 1.75);
    let previous = new THREE.Vector3(x, 0.02, z);
    for (let segment = 1; segment <= 5; segment += 1) {
      const point = new THREE.Vector3(
        x + Math.sin(segment * 1.5 + index) * 0.06,
        height * segment / 5,
        z + Math.cos(segment * 1.2 + index) * 0.05,
      );
      addSegment(root, previous, point, 0.065, 0.05, index % 3 === 0 ? surfaces.accent : surfaces.base, 6);
      previous = point;
    }
    addBlob(root, previous, 0.07, surfaces.tip, [1, 1.1, 1], 0);
  }
}

function buildTable(root, random, surfaces) {
  const trunkBase = new THREE.Vector3(0, 0.02, 0);
  const trunkTop = new THREE.Vector3(0.05, 0.85, 0);
  addSegment(root, trunkBase, trunkTop, 0.24, 0.15, surfaces.base, 8);
  const plate = createRuffledDisc(1.22, 0.13, 9, 0.4, surfaces.base);
  plate.position.set(0.05, 0.9, 0);
  root.add(plate);
  for (let index = 0; index < 18; index += 1) {
    const angle = index * Math.PI * 2 / 18 + range(random, -0.08, 0.08);
    const start = new THREE.Vector3(Math.cos(angle) * 0.28, 0.97, Math.sin(angle) * 0.28);
    const end = new THREE.Vector3(Math.cos(angle) * range(random, 0.76, 1.1), 1.02 + range(random, -0.05, 0.08), Math.sin(angle) * range(random, 0.62, 0.98));
    addSegment(root, start, end, 0.07, 0.035, index % 4 === 0 ? surfaces.accent : surfaces.base, 6);
  }
}

function buildTubes(root, random, surfaces) {
  const points = [[-0.52, 0], [-0.2, -0.18], [0.16, 0.05], [0.48, -0.12], [0.7, 0.18], [-0.68, 0.28], [0.05, 0.38]];
  points.forEach(([x, z], index) => {
    const height = range(random, 0.75, 1.55);
    const radius = range(random, 0.16, 0.25);
    const top = new THREE.Vector3(x + range(random, -0.06, 0.06), height, z + range(random, -0.05, 0.05));
    addSegment(root, new THREE.Vector3(x, 0.02, z), top, radius * 1.08, radius, surfaces.base, 9);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, radius * 0.2, 5, 10), surfaces.accent);
    rim.position.copy(top);
    rim.rotation.x = Math.PI / 2;
    root.add(rim);
    const opening = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.65, 10), surfaces.dark);
    opening.position.copy(top).add(new THREE.Vector3(0, 0.006, 0));
    opening.rotation.x = -Math.PI / 2;
    root.add(opening);
  });
}

function buildMixed(root, random, surfaces) {
  const left = new THREE.Group();
  buildStaghorn(left, random, surfaces);
  left.scale.setScalar(0.62);
  left.position.set(-0.62, 0, 0.05);
  root.add(left);

  const center = new THREE.Group();
  buildBrain(center, random, surfaces);
  center.scale.setScalar(0.62);
  center.position.set(0.05, 0, 0.22);
  root.add(center);

  const right = new THREE.Group();
  buildSeaRods(right, random, surfaces);
  right.scale.setScalar(0.58);
  right.position.set(0.72, 0, -0.05);
  root.add(right);
}

const BUILDERS = {
  staghorn: buildStaghorn,
  elkhorn: buildElkhorn,
  brain: buildBrain,
  pillars: buildPillars,
  lettuce: buildLettuce,
  'sea-fan': buildSeaFan,
  'sea-rods': buildSeaRods,
  table: buildTable,
  tubes: buildTubes,
  mixed: buildMixed,
};

function geometrySignature(root) {
  let hash = 2166136261;
  const absorb = (number) => {
    const value = Math.round(number * 100000) | 0;
    hash ^= value;
    hash = Math.imul(hash, 16777619) >>> 0;
  };
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!object.isMesh) return;
    for (const value of object.matrixWorld.elements) absorb(value);
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      absorb(positions.getX(index));
      absorb(positions.getY(index));
      absorb(positions.getZ(index));
    }
  });
  return hash.toString(16).padStart(8, '0');
}

function measure(root) {
  root.updateMatrixWorld(true);
  let triangles = 0;
  let vertices = 0;
  let meshCount = 0;
  let valid = true;
  root.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    vertices += positions.count;
    triangles += geometry.index ? geometry.index.count / 3 : positions.count / 3;
    for (let index = 0; index < positions.count; index += 1) {
      if (![positions.getX(index), positions.getY(index), positions.getZ(index)].every(Number.isFinite)) valid = false;
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  return {
    meshCount,
    vertices,
    triangles: Math.round(triangles),
    finitePositions: valid,
    bounds: {
      minimum: box.min.toArray().map((value) => Number(value.toFixed(4))),
      maximum: box.max.toArray().map((value) => Number(value.toFixed(4))),
      size: size.toArray().map((value) => Number(value.toFixed(4))),
    },
  };
}

export function buildCoralCandidate(preset) {
  const random = mulberry32(preset.seed);
  const root = new THREE.Group();
  root.name = preset.id;
  const surfaces = {
    base: material(preset.palette.base),
    accent: material(preset.palette.accent),
    tip: material(preset.palette.tip),
    dark: material(preset.palette.dark, 0.95),
  };
  BUILDERS[preset.type](root, random, surfaces);

  root.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(root);
  const initialSize = initial.getSize(new THREE.Vector3());
  const scale = preset.targetSize / Math.max(initialSize.x, initialSize.y, initialSize.z);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(root);
  const center = scaled.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaled.min.y;
  root.updateMatrixWorld(true);

  return {
    root,
    metrics: measure(root),
    signature: geometrySignature(root),
    encoding: {
      schema: 'nexus-factory/coral-candidate/v1',
      id: preset.id,
      type: preset.type,
      seed: preset.seed,
      palette: preset.palette,
      targetSize: preset.targetSize,
    },
  };
}
