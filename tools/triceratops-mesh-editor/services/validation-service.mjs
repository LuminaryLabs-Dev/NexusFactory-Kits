import * as THREE from '../vendor/three.module.js';

export function analyzeMesh(mesh, tolerance = 1e-6) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const sourceIndex = geometry.getIndex();
  const weldedMap = new Map();
  const weldedIds = [];
  const factor = 1 / tolerance;
  for (let i = 0; i < position.count; i++) {
    const key = `${Math.round(position.getX(i) * factor)},${Math.round(position.getY(i) * factor)},${Math.round(position.getZ(i) * factor)}`;
    if (!weldedMap.has(key)) weldedMap.set(key, weldedMap.size);
    weldedIds.push(weldedMap.get(key));
  }
  const triangleCount = sourceIndex ? sourceIndex.count / 3 : position.count / 3;
  const edgeUse = new Map();
  const faceUse = new Set();
  const adjacency = Array.from({ length: weldedMap.size }, () => []);
  let degenerateTriangles = 0, duplicateFaces = 0, invalidValues = 0, normalDefects = 0;
  if (normal) for (let i = 0; i < normal.count; i++) {
    const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
    if (!Number.isFinite(length) || length < 0.5 || length > 1.5) normalDefects++;
  }
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const original = [0, 1, 2].map((offset) => sourceIndex ? sourceIndex.getX(triangle * 3 + offset) : triangle * 3 + offset);
    const vertices = original.map((vertex) => weldedIds[vertex]);
    const values = original.flatMap((vertex) => [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]);
    if (!values.every(Number.isFinite)) invalidValues++;
    const ax = position.getX(original[0]), ay = position.getY(original[0]), az = position.getZ(original[0]);
    const bx = position.getX(original[1]), by = position.getY(original[1]), bz = position.getZ(original[1]);
    const cx = position.getX(original[2]), cy = position.getY(original[2]), cz = position.getZ(original[2]);
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (new Set(vertices).size < 3 || nx * nx + ny * ny + nz * nz < 1e-12) degenerateTriangles++;
    const faceKey = [...vertices].sort((a, b) => a - b).join(':');
    if (faceUse.has(faceKey)) duplicateFaces++;
    faceUse.add(faceKey);
    for (let edge = 0; edge < 3; edge++) {
      const from = vertices[edge], to = vertices[(edge + 1) % 3];
      const low = Math.min(from, to), high = Math.max(from, to);
      const key = `${low}:${high}`;
      const current = edgeUse.get(key) ?? { count: 0, direction: 0 };
      current.count++;
      current.direction += from === low ? 1 : -1;
      edgeUse.set(key, current);
      adjacency[from].push(to);
      adjacency[to].push(from);
    }
  }
  let boundaryEdges = 0, nonManifoldEdges = 0, inconsistentWindingEdges = 0;
  for (const edge of edgeUse.values()) {
    if (edge.count === 1) boundaryEdges++;
    if (edge.count > 2) nonManifoldEdges++;
    if (edge.count === 2 && edge.direction !== 0) inconsistentWindingEdges++;
  }
  const visited = new Uint8Array(weldedMap.size);
  let connectedComponents = 0;
  for (let start = 0; start < visited.length; start++) {
    if (visited[start]) continue;
    connectedComponents++;
    visited[start] = 1;
    const stack = [start];
    while (stack.length) {
      const current = stack.pop();
      for (const next of adjacency[current]) if (!visited[next]) {
        visited[next] = 1;
        stack.push(next);
      }
    }
  }
  const closedTwoManifold = boundaryEdges === 0 && nonManifoldEdges === 0 && inconsistentWindingEdges === 0 && degenerateTriangles === 0 && duplicateFaces === 0 && invalidValues === 0 && normalDefects === 0 && connectedComponents === 1;
  return {
    name: mesh.name,
    role: mesh.userData.role ?? 'replaceable-attachment',
    sourceVertices: position.count,
    weldedVertices: weldedMap.size,
    triangles: triangleCount,
    connectedComponents,
    boundaryEdges,
    nonManifoldEdges,
    inconsistentWindingEdges,
    duplicateFaces,
    degenerateTriangles,
    invalidValues,
    normalDefects,
    uvVertices: uv?.count ?? 0,
    logicalQuads: geometry.userData.quadTopology?.quads?.length ?? 0,
    quadTopologyKind: geometry.userData.quadTopology?.kind ?? null,
    closedTwoManifold
  };
}

export function validateAssetResult(result, gates = {}) {
  const asset = result.outputs.asset;
  if (!asset?.root || !asset?.body) return { verdict: 'fail', error: 'Asset output is missing root or body' };
  asset.root.updateMatrixWorld(true);
  const components = [];
  asset.root.traverse((object) => {
    if (object.isMesh) components.push(analyzeMesh(object));
  });
  const body = components.find((component) => component.role === 'structural-shell');
  const bounds = new THREE.Box3().setFromObject(asset.root);
  const structure = {
    structuralShellMeshes: components.filter((component) => component.role === 'structural-shell').length,
    replaceableAttachmentMeshes: components.filter((component) => component.role !== 'structural-shell').length,
    totalMeshes: components.length
  };
  const aggregate = {
    totalTriangles: components.reduce((sum, component) => sum + component.triangles, 0),
    totalSourceVertices: components.reduce((sum, component) => sum + component.sourceVertices, 0),
    failedComponents: components.filter((component) => !component.closedTwoManifold).length,
    boundaryEdges: components.reduce((sum, component) => sum + component.boundaryEdges, 0),
    nonManifoldEdges: components.reduce((sum, component) => sum + component.nonManifoldEdges, 0),
    inconsistentWindingEdges: components.reduce((sum, component) => sum + component.inconsistentWindingEdges, 0),
    duplicateFaces: components.reduce((sum, component) => sum + component.duplicateFaces, 0),
    degenerateTriangles: components.reduce((sum, component) => sum + component.degenerateTriangles, 0),
    invalidValues: components.reduce((sum, component) => sum + component.invalidValues, 0),
    normalDefects: components.reduce((sum, component) => sum + component.normalDefects, 0)
  };
  const expectations = {
    structuralShellMeshes: gates.structuralShellMeshes ?? 1,
    connectedComponents: gates.connectedComponents ?? 1,
    boundaryEdges: gates.boundaryEdges ?? 0,
    nonManifoldEdges: gates.nonManifoldEdges ?? 0,
    inconsistentWindingEdges: gates.inconsistentWindingEdges ?? 0,
    duplicateFaces: gates.duplicateFaces ?? 0,
    degenerateTriangles: gates.degenerateTriangles ?? 0,
    invalidValues: gates.invalidValues ?? 0,
    normalDefects: gates.normalDefects ?? 0,
    minLogicalQuads: gates.minLogicalQuads ?? 0,
    triangleBudget: gates.triangleBudget ?? 32000
  };
  const failures = [];
  if (structure.structuralShellMeshes !== expectations.structuralShellMeshes) failures.push('structural-shell-count');
  if (!body || body.connectedComponents !== expectations.connectedComponents) failures.push('body-connected-components');
  for (const field of ['boundaryEdges', 'nonManifoldEdges', 'inconsistentWindingEdges', 'duplicateFaces', 'degenerateTriangles', 'invalidValues', 'normalDefects']) {
    if (aggregate[field] !== expectations[field]) failures.push(field);
  }
  if (aggregate.failedComponents !== 0) failures.push('failed-components');
  if (aggregate.totalTriangles > expectations.triangleBudget) failures.push('triangle-budget');
  if (body && body.uvVertices !== body.sourceVertices) failures.push('body-uv-coverage');
  if (body && body.logicalQuads < expectations.minLogicalQuads) failures.push('body-logical-quad-topology');
  if (Math.abs(bounds.min.y) > 1e-5) failures.push('floor-contact');
  return {
    schema: 'mesh-integrity/v1',
    verdict: failures.length ? 'fail' : 'pass',
    failures,
    tolerance: 1e-6,
    structure,
    body,
    aggregate,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray(), floorContactError: Math.abs(bounds.min.y) },
    components
  };
}
