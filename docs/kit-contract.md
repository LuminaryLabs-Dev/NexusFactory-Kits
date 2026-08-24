# Kit Contract

## Terms

- **Domain:** semantic owner of capabilities and responsibilities.
- **Kit:** independently callable generator with a manifest and services.
- **Artifact:** immutable generated mesh or image data.
- **Generation state:** inspectable phased-work state.
- **Validation report:** individual evidence-backed checks plus aggregate validity.
- **Export result:** self-describing file output containing MIME type, filename, and bytes or text.

## Manifest

`defineKit()` produces a frozen manifest containing:

```text
kind, id, displayName, version, domainPath
requires[], provides[], services[]
parameterSchema[]
editor {
  preview, inspector, surfaces,
  primary, advanced, internal,
  sections[], generation,
  randomizationGroups[]
}
runtime { environments[], permissions[] }
source { module, exportName }
metadata
contentFingerprint
```

Numeric parameters are finite, clamped, and rounded when integer. Choice parameters must match a declared option.

## Services

| Service | Outcome |
| --- | --- |
| `describe()` | Clone of the manifest |
| `generate({ seed, params })` | Deterministic artifact for normalized inputs |
| `randomize(...)` | Varies one declared parameter group and may reroll the seed |
| `reroll(...)` | Derives a new individual seed while preserving parameters |
| `validate(artifact)` | Validation report |
| `export(artifact, format)` | GLB, PNG, or JSON export result |
| `createState(request)` | Initial phased state |
| `inspectState(state)` | Clone-safe phase summary |
| `runPhase(state, phase)` | Executes one phase and invalidates stale downstream outputs |

## Artifact schema

All artifacts retain schema `nexusfactory.artifact/1` and identify Kit, domain, seed, normalized parameters, metadata, and deterministic hash.

### Mesh fields

Required:

```text
id, positions, normals, indices, material
```

Optional:

```text
uvs, tangents, colors, transparent, doubleSided, extras
```

### Texture fields

```text
width, height, channels, pixelFormat, rgbaBase64
colorSpace, sampling, wrapS, wrapT, contentHash
```

### Material fields

Materials support both legacy aliases and the textured PBR contract:

```text
baseColorFactor, baseColorTexture
normalTexture, normalScale
metallicFactor, roughnessFactor, metallicRoughnessTexture
occlusionTexture, occlusionStrength
emissiveFactor, emissiveTexture
alphaMode, alphaCutoff, doubleSided
clearcoat, clearcoatRoughness
iridescence, transmission, thickness, ior
```

These fields are optional, preserving older untextured mesh artifacts.

### Statistics

Mesh artifacts report mesh, vertex, triangle, material, texture, texture-byte, transparent-mesh, and animation-track counts.

## Determinism

The same implementation, seed, and normalized parameters must produce the same artifact hash. Seed changes must produce a new individual. Fixed randomization entropy makes group variation reproducible.

A matching seed does not guarantee identical output after the implementation changes. Current provenance does not identify the exact source commit automatically.

## Validation

`validateArtifactShape()` checks shared structure. Subject validators add stronger rules. Procedural Reef Fish validates:

- finite geometry and valid indices;
- UV and tangent dimensions;
- non-zero triangles and healthy bounds;
- expected anatomy, appendages, face, material, and texture roles;
- texture references and payload hashes;
- bounded eye and body proportions;
- transparent fin material behavior.

Validation proves encoded checks, not subjective visual quality or deployed browser support.

## Exports

- Mesh kits: GLB or JSON.
- Image kits: PNG or JSON.

Exports use `nexusfactory.export-result/1`. The fish GLB embeds generated texture maps and supported standard material extensions. The exporter uses the artifact it receives; it does not regenerate a separate asset.

## Browser compatibility

Registered browser runtimes must have a browser-safe transitive import graph. Node-only tools can import the public core, but public Kit modules must not import filesystem, process, compression, or child-process built-ins.

## Errors

Invalid parameters, empty seeds, unknown groups, unsupported phases, missing prerequisites, invalid artifacts, broken texture references, and unsupported formats throw typed errors. Consumers should expose those failures rather than substituting generator-specific fallbacks.
