import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../vendor/three.module.js';
import { ensureInside, sha256, writeJson } from './io-service.mjs';

const COMPONENT = { FLOAT: 5126, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125 };

function pad4(value) {
  return (value + 3) & ~3;
}

function minMax(attribute) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < attribute.count; i++) for (let axis = 0; axis < 3; axis++) {
    const value = attribute.array[i * attribute.itemSize + axis];
    min[axis] = Math.min(min[axis], value);
    max[axis] = Math.max(max[axis], value);
  }
  return { min, max };
}

function toFloat32(attribute, matrix, kind) {
  const array = new Float32Array(attribute.count * attribute.itemSize);
  const vector = new THREE.Vector3();
  const normalMatrix = kind === 'normal' ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
  for (let i = 0; i < attribute.count; i++) {
    if (attribute.itemSize >= 3) {
      vector.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
      if (kind === 'position') vector.applyMatrix4(matrix);
      if (kind === 'normal') vector.applyMatrix3(normalMatrix).normalize();
      array[i * attribute.itemSize] = vector.x;
      array[i * attribute.itemSize + 1] = vector.y;
      array[i * attribute.itemSize + 2] = vector.z;
      for (let part = 3; part < attribute.itemSize; part++) array[i * attribute.itemSize + part] = attribute.array[i * attribute.itemSize + part];
    } else for (let part = 0; part < attribute.itemSize; part++) array[i * attribute.itemSize + part] = attribute.array[i * attribute.itemSize + part];
  }
  return array;
}

export function buildGlb(asset) {
  asset.root.updateMatrixWorld(true);
  const gltf = {
    asset: { version: '2.0', generator: 'triceratops-mesh-editor/1.0.0' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
    extras: { synthetic: true, source: 'mesh-program/v1' }
  };
  const chunks = [];
  let byteOffset = 0;
  const append = (typedArray, target) => {
    const buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const padded = Buffer.alloc(pad4(buffer.length));
    buffer.copy(padded);
    const index = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, ...(target ? { target } : {}) });
    chunks.push(padded);
    byteOffset += padded.length;
    return index;
  };
  const materialMap = new Map();
  const materialIndex = (material) => {
    const key = `${material.color?.getHexString?.() ?? 'ffffff'}:${material.roughness ?? 1}:${material.metalness ?? 0}:${material.vertexColors ? 1 : 0}`;
    if (materialMap.has(key)) return materialMap.get(key);
    const color = material.color ?? new THREE.Color(1, 1, 1);
    const index = gltf.materials.length;
    gltf.materials.push({
      name: material.name || `material-${index}`,
      pbrMetallicRoughness: {
        baseColorFactor: [color.r, color.g, color.b, material.opacity ?? 1],
        metallicFactor: material.metalness ?? 0,
        roughnessFactor: material.roughness ?? 1
      },
      doubleSided: material.side === THREE.DoubleSide
    });
    materialMap.set(key, index);
    return index;
  };
  asset.root.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    const primitive = { attributes: {}, material: materialIndex(object.material), mode: 4 };
    for (const [name, semantic, kind] of [['position', 'POSITION', 'position'], ['normal', 'NORMAL', 'normal'], ['uv', 'TEXCOORD_0', 'plain'], ['color', 'COLOR_0', 'plain']]) {
      const attribute = geometry.getAttribute(name);
      if (!attribute) continue;
      const data = toFloat32(attribute, object.matrixWorld, kind);
      const view = append(data, 34962);
      const accessor = { bufferView: view, componentType: COMPONENT.FLOAT, count: attribute.count, type: ['SCALAR', 'VEC2', 'VEC3', 'VEC4'][attribute.itemSize - 1] };
      if (name === 'position') Object.assign(accessor, minMax({ count: attribute.count, itemSize: attribute.itemSize, array: data }));
      primitive.attributes[semantic] = gltf.accessors.length;
      gltf.accessors.push(accessor);
    }
    const sourceIndex = geometry.getIndex();
    const vertexCount = geometry.getAttribute('position').count;
    const indexData = sourceIndex ? sourceIndex.array : Array.from({ length: vertexCount }, (_, i) => i);
    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const indices = indexData instanceof IndexArray ? indexData : new IndexArray(indexData);
    const indexView = append(indices, 34963);
    primitive.indices = gltf.accessors.length;
    gltf.accessors.push({ bufferView: indexView, componentType: IndexArray === Uint32Array ? COMPONENT.UNSIGNED_INT : COMPONENT.UNSIGNED_SHORT, count: indices.length, type: 'SCALAR' });
    const meshIndex = gltf.meshes.length;
    gltf.meshes.push({ name: object.name, primitives: [primitive], extras: { role: object.userData.role ?? 'replaceable-attachment' } });
    const nodeIndex = gltf.nodes.length;
    gltf.nodes.push({ name: object.name, mesh: meshIndex });
    gltf.scenes[0].nodes.push(nodeIndex);
  });
  gltf.buffers[0].byteLength = byteOffset;
  const binary = Buffer.concat(chunks);
  let json = Buffer.from(JSON.stringify(gltf));
  const paddedJson = Buffer.alloc(pad4(json.length), 0x20);
  json.copy(paddedJson);
  const totalLength = 12 + 8 + paddedJson.length + 8 + binary.length;
  const output = Buffer.alloc(totalLength);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(paddedJson.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(output, 20);
  const binHeader = 20 + paddedJson.length;
  output.writeUInt32LE(binary.length, binHeader);
  output.writeUInt32LE(0x004e4942, binHeader + 4);
  binary.copy(output, binHeader + 8);
  return { buffer: output, gltf };
}

export function inspectGlb(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) return { verdict: 'fail', reason: 'invalid-header' };
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) return { verdict: 'fail', reason: 'missing-json-chunk' };
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
  const binHeader = 20 + jsonLength;
  const binaryLength = buffer.readUInt32LE(binHeader);
  const failures = [];
  if (gltf.asset?.version !== '2.0') failures.push('asset-version');
  if (!gltf.meshes?.length) failures.push('meshes');
  if (gltf.buffers?.[0]?.byteLength !== binaryLength) failures.push('buffer-length');
  for (const accessor of gltf.accessors ?? []) {
    if (!Number.isInteger(accessor.count) || accessor.count <= 0) failures.push('accessor-count');
    if (!gltf.bufferViews?.[accessor.bufferView]) failures.push('accessor-buffer-view');
  }
  const triangles = (gltf.meshes ?? []).reduce((sum, mesh) => sum + (gltf.accessors[mesh.primitives[0].indices]?.count ?? 0) / 3, 0);
  return { verdict: failures.length ? 'fail' : 'pass', failures, meshCount: gltf.meshes?.length ?? 0, nodeCount: gltf.nodes?.length ?? 0, triangles, json: gltf };
}

export function exportGlbPackage(result, validation, request) {
  if (validation.verdict !== 'pass') throw new Error('Cannot export an unvalidated result');
  const outRoot = path.resolve(request.outputRoot);
  const glbFile = ensureInside(outRoot, path.join(outRoot, request.name ?? 'asset.glb'));
  fs.mkdirSync(path.dirname(glbFile), { recursive: true });
  const built = buildGlb(result.outputs.asset);
  fs.writeFileSync(glbFile, built.buffer);
  const inspection = inspectGlb(fs.readFileSync(glbFile));
  if (inspection.verdict !== 'pass') throw new Error(`GLB reimport validation failed: ${inspection.failures.join(', ')}`);
  const programFile = ensureInside(outRoot, path.join(outRoot, 'mesh-program.json'));
  writeJson(programFile, result.document);
  const manifest = {
    schema: 'mesh-export/v1',
    validated: true,
    semanticSignature: result.semanticSignature,
    glb: { path: path.basename(glbFile), bytes: built.buffer.length, sha256: sha256(built.buffer), inspection: { verdict: inspection.verdict, meshCount: inspection.meshCount, nodeCount: inspection.nodeCount, triangles: inspection.triangles } },
    source: { path: path.basename(programFile), schema: result.document.schema, revision: result.document.revision ?? 0 },
    synthetic: true
  };
  const manifestFile = ensureInside(outRoot, path.join(outRoot, 'export-manifest.json'));
  writeJson(manifestFile, manifest);
  return { format: 'glb', paths: { glb: glbFile, program: programFile, manifest: manifestFile }, manifest };
}
