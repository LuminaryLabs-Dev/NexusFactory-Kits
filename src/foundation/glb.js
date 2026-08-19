function pad4(value) { return (value + 3) & ~3; }
function minMaxPositions(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c += 1) {
      min[c] = Math.min(min[c], positions[i + c]);
      max[c] = Math.max(max[c], positions[i + c]);
    }
  }
  return { min, max };
}

export function exportArtifactGlb(artifact) {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  let byteOffset = 0;
  const materialIds = Object.keys(artifact.materials ?? {});
  const materialIndex = new Map(materialIds.map((id, index) => [id, index]));

  function appendTypedArray(array, target) {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    const padded = pad4(bytes.byteLength);
    const copy = new Uint8Array(padded);
    copy.set(bytes);
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength, target });
    chunks.push(copy);
    byteOffset += padded;
    return viewIndex;
  }

  for (const source of artifact.meshes) {
    const positions = new Float32Array(source.positions);
    const indices = new Uint32Array(source.indices);
    const positionView = appendTypedArray(positions, 34962);
    const indexView = appendTypedArray(indices, 34963);
    const bounds = minMaxPositions(source.positions);
    const positionAccessor = accessors.length;
    accessors.push({ bufferView: positionView, componentType: 5126, count: positions.length / 3, type: "VEC3", min: bounds.min, max: bounds.max });
    const indexAccessor = accessors.length;
    accessors.push({ bufferView: indexView, componentType: 5125, count: indices.length, type: "SCALAR" });
    const meshIndex = meshes.length;
    meshes.push({ name: source.id, primitives: [{ attributes: { POSITION: positionAccessor }, indices: indexAccessor, material: materialIndex.get(source.material) ?? 0 }] });
    nodes.push({ name: source.id, mesh: meshIndex });
  }

  const binary = new Uint8Array(byteOffset);
  let cursor = 0;
  for (const chunk of chunks) { binary.set(chunk, cursor); cursor += chunk.byteLength; }

  const materials = materialIds.map((id) => {
    const source = artifact.materials[id] ?? {};
    return {
      name: id,
      pbrMetallicRoughness: {
        baseColorFactor: source.baseColor ?? [0.7, 0.7, 0.7, 1],
        metallicFactor: source.metallic ?? 0,
        roughnessFactor: source.roughness ?? 0.7
      },
      emissiveFactor: source.emissive ?? [0, 0, 0]
    };
  });

  const gltf = {
    asset: { version: "2.0", generator: "NexusFactory-Kits" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes,
    materials,
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews,
    accessors,
    extras: {
      kitId: artifact.kitId,
      seed: artifact.seed,
      deterministicHash: artifact.deterministicHash
    }
  };

  const encoder = new TextEncoder();
  const jsonRaw = encoder.encode(JSON.stringify(gltf));
  const jsonLength = pad4(jsonRaw.byteLength);
  const json = new Uint8Array(jsonLength);
  json.fill(0x20);
  json.set(jsonRaw);
  const totalLength = 12 + 8 + json.byteLength + 8 + binary.byteLength;
  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, json.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(json, 20);
  const binHeader = 20 + json.byteLength;
  view.setUint32(binHeader, binary.byteLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  out.set(binary, binHeader + 8);
  return out;
}
