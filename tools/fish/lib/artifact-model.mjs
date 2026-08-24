import { base64ToBytes } from '../../../src/foundation/raster/surface.js';
import { modelBounds } from '../../../src/domains/factory/object/creature/aquatic/fish/geometry.js';

export function artifactToModel(artifact) {
  if (!artifact || !Array.isArray(artifact.meshes)) throw new TypeError('artifactToModel requires a mesh artifact.');
  const meshes = artifact.meshes.map((mesh) => ({
    name: mesh.id,
    material: mesh.material,
    positions: [...mesh.positions],
    normals: [...mesh.normals],
    uvs: [...(mesh.uvs ?? [])],
    tangents: [...(mesh.tangents ?? [])],
    colors: [...(mesh.colors ?? [])],
    indices: [...mesh.indices],
    transparent: mesh.transparent === true,
    doubleSided: mesh.doubleSided === true,
    extras: structuredClone(mesh.extras ?? {}),
  }));
  const textures = Object.fromEntries(Object.entries(artifact.textures ?? {}).map(([id, texture]) => [id, {
    width: texture.width,
    height: texture.height,
    data: base64ToBytes(texture.rgbaBase64),
    colorSpace: texture.colorSpace ?? 'linear',
    sampling: texture.sampling ?? 'linear',
    wrapS: texture.wrapS ?? 'repeat',
    wrapT: texture.wrapT ?? 'repeat',
  }]));
  return {
    name: artifact.metadata?.source?.name ?? artifact.metadata?.generator ?? artifact.kitId,
    definition: structuredClone(artifact.metadata?.sourceDefinition ?? artifact.metadata ?? {}),
    meshes,
    materials: structuredClone(artifact.materials ?? {}),
    textures,
    bounds: modelBounds(meshes),
    extras: structuredClone(artifact.metadata ?? {}),
  };
}
