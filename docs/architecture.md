# Architecture

NexusFactory-Kits is a procedural generation platform organized around semantic domains, reusable capabilities, independently callable kits, and registry-discovered runtimes. It produces data artifacts; it does not own the Studio interface or a game runtime.

## System flow

```text
defineDomain / defineKit contracts
              ↓
semantic domains + foundation utilities
              ↓
public generator implementations
              ↓
src/catalog.js
              ↓
createRegistry()
              ↓
registry.json
              ↓
NexusFactory-Studio RegistryHost → RuntimeHost → viewer/export UI
```

Runtime generation follows:

```text
request { seed, params }
        ↓
normalization + deterministic random streams
        ↓
kit generation or inspectable phases
        ↓
mesh or RGBA image artifact
        ↓
kit validation
        ↓
GLB, PNG, or JSON export
```

## Core modules

| Path | Responsibility |
| --- | --- |
| `src/contracts.js` | Artifact, textured-mesh, image, generation-state, validation, export-result, parameter, and randomization contracts |
| `src/domain.js` | Domain and Kit definitions, editor metadata, runtime declarations, and manifest fingerprints |
| `src/catalog.js` | Canonical in-memory list of registered domains and public Kit manifests |
| `src/registry/registry.js` | Identity, parent, capability-provider, graph, search, snapshot, and integrity validation |
| `src/foundation/` | Deterministic random, hashing, geometry, noise, raster/PNG, and GLB encoding |
| `src/domains/factory/` | Semantic domains, reusable subject logic, and public kits |
| `tools/fish/` | Node-only review and delivery tooling that imports the registered fish core |
| `scripts/build-registry.mjs` | Materializes `registry.json` from source |

## Domain model

A domain is a semantic owner, not merely a directory. The major branches are:

- `n:factory:object`: weapons, foliage, props, structures, vehicles, and creatures.
- `n:factory:material`: PBR, stylized, and procedural material semantics.
- `n:factory:texture`: raster subjects and environmental textures.
- `n:factory:vfx`: aquatic bubbles, particles, and light shafts.
- `n:factory:scene`: layers, terrain, populations, reefs, and aquariums.
- `n:factory:animation`: animation ownership boundary.

The creature hierarchy adds:

```text
n:factory:object:creature
└── n:factory:object:creature:aquatic
    └── n:factory:object:creature:aquatic:fish
```

`aquatic:fish:mesh` is distinct from the existing `aquatic:fish` raster capability.

## Kit model

Each Kit combines:

- a frozen manifest;
- parameter, section, and randomization metadata;
- declared capabilities and runtime environments;
- a resolvable source module;
- callable generation, variation, validation, phase, and export services.

The public catalog contains eleven kits, including horror creature, liminal structure, and distressed material factories. The raster Fish Generator remains independent from the Procedural Reef Fish mesh kit.

## Phased generation

Tree executes:

```text
growth → bezier → wood → foliage → artifact → validate
```

Reef and Aquarium execute:

```text
terrain → environment → population → placement → subjects
        → effects → compose → artifact → validate
```

Procedural Reef Fish executes:

```text
anatomy → appendages → face → surface → artifact → validate
```

`runPhase()` enforces prerequisites and invalidates downstream outputs when an earlier phase is rerun.

## Artifact boundaries

Mesh artifacts may contain:

- positions, normals, indices;
- optional UVs, tangents, and colors;
- material references and mesh flags;
- core and extended PBR material definitions;
- embedded RGBA textures with color-space and sampling metadata;
- bounds, statistics, metadata, timeline tracks, and deterministic hash.

Image artifacts contain RGBA8 base64 image data, dimensions, sampling, statistics, metadata, and deterministic hash.

Textured mesh support is a backward-compatible extension of `nexusfactory.artifact/1`; older mesh kits remain valid without optional fields.

## GLB encoding

The GLB encoder supports:

- `POSITION`, `NORMAL`, `TEXCOORD_0`, `TANGENT`, and `COLOR_0`;
- embedded PNG images, samplers, and textures;
- base-color, normal, metallic-roughness, AO, and emissive maps;
- alpha mode, alpha cutoff, and sidedness;
- `KHR_materials_clearcoat`, `KHR_materials_iridescence`, and `KHR_materials_transmission`;
- artifact identity and generator metadata.

It still does not convert artifact timeline tracks into glTF animations.

## Browser-safe runtime boundary

Modules reachable from a registered Kit must not import Node built-ins. Filesystem writes, batch review, contact sheets, and CLI parsing live under `tools/`. Studio can therefore dynamically import the registered fish Kit in the browser while Node tools reuse exactly the same generator core.

## Ownership boundary

Kits owns generation meaning, parameters, seeds, phases, artifacts, validation, and export encoding. Studio owns registry loading, generic invocation, controls, previews, snapshots, and downloads. Studio must not implement fish-specific behavior.
