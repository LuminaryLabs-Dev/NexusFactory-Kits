import { sha256 } from '../../../../../../foundation/hash.js';
import { quantizeKey3, V3 } from './math.js';

function finite(values = []) { return values.every(Number.isFinite); }

function meshTopology(mesh) {
  const vertexCount = mesh.positions.length / 3;
  const keys = [];
  for (let i = 0; i < mesh.positions.length; i += 3) keys.push(quantizeKey3(mesh.positions.slice(i, i + 3), 100000));
  const edges = new Map();
  const add = (a, b) => {
    const ka = keys[a], kb = keys[b];
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  };
  let zeroArea = 0;
  let inverted = 0;
  let outOfRange = 0;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ids = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    if (ids.some((id) => !Number.isInteger(id) || id < 0 || id >= vertexCount)) { outOfRange += 1; continue; }
    add(ids[0], ids[1]); add(ids[1], ids[2]); add(ids[2], ids[0]);
    const p = ids.map((id) => mesh.positions.slice(id * 3, id * 3 + 3));
    const cross = V3.cross(V3.sub(p[1], p[0]), V3.sub(p[2], p[0]));
    if (V3.len(cross) < 1e-9) zeroArea += 1;
    if (mesh.normals.length === mesh.positions.length && V3.len(cross) >= 1e-9) {
      const normal = V3.norm(ids.reduce((sum, id) => V3.add(sum, mesh.normals.slice(id * 3, id * 3 + 3)), [0, 0, 0]));
      if (V3.dot(V3.norm(cross), normal) < -0.15) inverted += 1;
    }
  }
  let boundary = 0, nonManifold = 0;
  for (const count of edges.values()) { if (count === 1) boundary += 1; if (count > 2) nonManifold += 1; }
  return { vertexCount, zeroArea, inverted, outOfRange, boundary, nonManifold };
}

export function validateFishArtifact(artifact, baseReport) {
  const checks = [...(baseReport?.checks ?? [])];
  const add = (id, pass, detail = '') => checks.push({ id, pass: Boolean(pass), detail: String(detail) });
  const textures = artifact?.textures ?? {};
  const materials = artifact?.materials ?? {};
  const meshes = artifact?.meshes ?? [];
  add('fish:mesh-count', meshes.length >= 12, meshes.length);
  add('fish:material-count', Object.keys(materials).length >= 5, Object.keys(materials).length);
  add('fish:texture-count', Object.keys(textures).length >= 5, Object.keys(textures).length);
  let vertices = 0, triangles = 0;
  for (const mesh of meshes) {
    const count = mesh.positions.length / 3;
    vertices += count; triangles += mesh.indices.length / 3;
    add(`fish:${mesh.id}:finite`, finite(mesh.positions) && finite(mesh.normals) && finite(mesh.uvs ?? []) && finite(mesh.tangents ?? []));
    add(`fish:${mesh.id}:uvs`, Array.isArray(mesh.uvs) && mesh.uvs.length === count * 2, `${mesh.uvs?.length ?? 0}/${count * 2}`);
    add(`fish:${mesh.id}:tangents`, Array.isArray(mesh.tangents) && mesh.tangents.length === count * 4, `${mesh.tangents?.length ?? 0}/${count * 4}`);
    add(`fish:${mesh.id}:material`, typeof mesh.material === 'string' && Object.hasOwn(materials, mesh.material), mesh.material);
    const topology = meshTopology(mesh);
    add(`fish:${mesh.id}:indices`, topology.outOfRange === 0, topology.outOfRange);
    add(`fish:${mesh.id}:zero-area`, topology.zeroArea === 0, topology.zeroArea);
    add(`fish:${mesh.id}:manifold`, topology.nonManifold === 0, topology.nonManifold);
    if (!mesh.doubleSided) add(`fish:${mesh.id}:winding`, topology.inverted <= Math.max(2, triangles * 0.001), topology.inverted);
    if (!mesh.extras?.allowOpenBoundary) add(`fish:${mesh.id}:closed`, topology.boundary === 0, topology.boundary);
  }
  for (const [id, texture] of Object.entries(textures)) {
    const expectedLength = texture.width * texture.height * 4;
    const base64Bytes = Math.floor((texture.rgbaBase64?.length ?? 0) * 3 / 4);
    add(`texture:${id}:dimensions`, Number.isInteger(texture.width) && texture.width > 0 && Number.isInteger(texture.height) && texture.height > 0, `${texture.width}x${texture.height}`);
    add(`texture:${id}:payload`, typeof texture.rgbaBase64 === 'string' && base64Bytes >= expectedLength - 2, base64Bytes);
    add(`texture:${id}:color-space`, ['srgb', 'linear'].includes(texture.colorSpace), texture.colorSpace);
    add(`texture:${id}:hash`, texture.contentHash === sha256(texture.rgbaBase64), texture.contentHash);
  }
  for (const [id, material] of Object.entries(materials)) {
    add(`material:${id}:base-color`, Array.isArray(material.baseColorFactor) && material.baseColorFactor.length === 4 && finite(material.baseColorFactor));
    for (const field of ['baseColorTexture', 'normalTexture', 'metallicRoughnessTexture', 'occlusionTexture', 'emissiveTexture']) {
      if (material[field]) add(`material:${id}:${field}`, Object.hasOwn(textures, material[field]), material[field]);
    }
  }
  add('fish:vertex-budget', vertices > 1000 && vertices <= (artifact.params?.quality === 'high' ? 80000 : 30000), vertices);
  add('fish:triangle-budget', triangles > 1000 && triangles <= (artifact.params?.quality === 'high' ? 80000 : 30000), triangles);
  add('fish:bounds', artifact?.bounds?.size?.every((value) => Number.isFinite(value) && value > 0), artifact?.bounds?.size?.join('x'));
  return {
    schemaVersion: 'nexusfactory.validation-report/1',
    valid: checks.every((check) => check.pass),
    checks,
    deterministicHash: artifact?.deterministicHash ?? null,
    statistics: { vertices, triangles, meshes: meshes.length, materials: Object.keys(materials).length, textures: Object.keys(textures).length },
    limitations: ['Topology checks are deterministic and bounded; exhaustive triangle-pair self-intersection is not performed in the browser runtime.'],
  };
}
