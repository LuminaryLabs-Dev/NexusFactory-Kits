import { createArtifact } from '../../../../../../contracts.js';
import { bytesToBase64 } from '../../../../../../foundation/raster/surface.js';
import { sha256 } from '../../../../../../foundation/hash.js';

function plainArray(values = []) {
  return Array.from(values, Number);
}

function textureRecord(texture) {
  const bytes = Uint8Array.from(texture.data ?? []);
  const rgbaBase64 = bytesToBase64(bytes);
  return {
    width: texture.width,
    height: texture.height,
    channels: 4,
    pixelFormat: 'rgba8',
    rgbaBase64,
    colorSpace: texture.colorSpace ?? 'linear',
    sampling: texture.sampling ?? 'linear',
    wrapS: texture.wrapS ?? 'repeat',
    wrapT: texture.wrapT ?? 'repeat',
    contentHash: sha256(rgbaBase64),
  };
}

export function createFishArtifact(model, { kitId, domainPath, seed, params, phaseOrder } = {}) {
  const meshes = model.meshes.map((mesh) => ({
    id: mesh.name,
    positions: plainArray(mesh.positions),
    normals: plainArray(mesh.normals),
    uvs: plainArray(mesh.uvs),
    tangents: plainArray(mesh.tangents),
    colors: plainArray(mesh.colors),
    indices: plainArray(mesh.indices),
    material: mesh.material,
    transparent: mesh.transparent === true,
    doubleSided: mesh.doubleSided === true,
    extras: structuredClone(mesh.extras ?? {}),
  }));
  const textures = Object.fromEntries(Object.entries(model.textures).map(([id, texture]) => [id, textureRecord(texture)]));
  const materials = Object.fromEntries(Object.entries(model.materials).map(([id, material]) => [id, structuredClone(material)]));
  return createArtifact({
    kitId,
    domainPath,
    seed,
    params,
    meshes,
    materials,
    textures,
    metadata: {
      generator: 'procedural-fish-v1',
      profile: model.definition.paletteName,
      speciesFamily: model.definition.speciesFamily,
      tailProfile: model.definition.tailProfile,
      patternType: model.definition.patternType,
      mouthProfile: model.definition.head.mouthProfile,
      eyeProfile: model.definition.eyeProfile,
      phaseOrder,
      anatomy: {
        length: model.definition.body.length,
        height: model.definition.body.height,
        depth: model.definition.body.depth,
      },
      surface: structuredClone(model.definition.surface),
      renderHints: {
        upAxis: 'y',
        background: '#071923',
        showGrid: false,
        camera: { azimuth: 0.98, elevation: 0.22, framing: 1.14 },
      },
      source: model.extras,
    },
  });
}
