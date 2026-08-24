# Architecture

NexusFactory-Kits is a procedural generation platform organized around semantic domains, reusable capabilities, and independently callable kits. It produces data artifacts; it does not provide the Studio interface or a game runtime.

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

The runtime generation path is separate:

```text
request { seed, params }
        ↓
parameter normalization + deterministic random streams
        ↓
kit-specific generation or phased generation
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
| `src/contracts.js` | Artifact, registry, generation-state, export-result, parameter-normalization, randomization, and artifact-shape contracts |
| `src/domain.js` | `defineDomain()` and `defineKit()`, editor metadata, runtime declarations, and manifest fingerprints |
| `src/catalog.js` | Canonical in-memory list of all registered domains and public kit manifests |
| `src/registry/registry.js` | Identity checks, domain-parent checks, capability provider graph, registry snapshot, search, and integrity hash |
| `src/foundation/` | Deterministic random, hashing, geometry, normals, GLB encoding, noise, and software raster/PNG utilities |
| `src/domains/factory/` | Semantic domains, domain services, and public kit implementations |
| `src/index.js` | Package-root exports for contracts, helpers, domains, and seven public kits |
| `scripts/build-registry.mjs` | Materializes `registry.json` from `src/catalog.js` |

## Domain model

Every domain has an ID, `n:factory` path, optional parent, version, stability, `requires`, `provides`, owned responsibilities, non-responsibilities, and services. Immediate parents must exist. A domain is a semantic owner rather than a filesystem alias or proof of an independently usable generator.

The audited catalog contains 42 domains under these major branches:

- `n:factory:object`: weapon, foliage/tree, prop, structure, and vehicle semantics.
- `n:factory:material`: PBR, stylized, and procedural material semantics.
- `n:factory:texture`: coral, fish, aquatic flora, water, substrate, and rock capabilities.
- `n:factory:vfx`: aquatic bubbles, particles, and light shafts.
- `n:factory:scene`: layers, placement, terrain profiles, aquatic population, reef, and aquarium composition.
- `n:factory:animation`: animation ownership boundary.

`src/registry/registry.js` builds capability providers from every domain and kit. At the audited baseline the graph is valid and has no missing providers.

## Kit model

A kit combines:

- a manifest produced by `defineKit()`;
- a parameter schema and editor presentation metadata;
- declared capabilities and runtime environments;
- a `source.module` and `source.exportName` for registry consumers;
- callable services that generate, validate, vary, and export artifacts.

There are seven public kits. The package root and generated registry expose the same subjects, but Ballista has two runtime surfaces: `src/index.js` exports `ballista-kit/index.js`, while `src/catalog.js` registers `ballista-kit/runtime.js`. The runtime adapter adds `randomize` and wraps exports in `nexusfactory.export-result/1`.

## Phased generation

Tree creates a typed mutable generation state and executes:

```text
growth → bezier → wood → foliage → artifact → validate
```

`runPhase()` enforces prerequisites and invalidates later outputs when a phase is rerun. Growth, Bezier, wood, and foliage have separate schema-tagged outputs.

Reef and Aquarium share `src/domains/factory/scene/aquatic/phased-kit.js` and execute:

```text
terrain → environment → population → placement → subjects
        → effects → compose → artifact → validate
```

They reuse the same pipeline but pass different policies for layers, terrain, flora, rocks, colors, framing, and composition metadata.

## Artifact boundaries

Mesh kits produce positions, normals, indices, materials, bounds, statistics, optional timeline tracks, metadata, and a deterministic hash. Image kits produce an RGBA8 base64 image, dimensions, transparency and sampling declarations, statistics, metadata, and a deterministic hash.

The GLB encoder serializes meshes, normals, indices, materials, nodes, and artifact identity extras. It does not serialize `artifact.timeline` into glTF animations. Image kits use the repository's software raster and PNG encoder.

## Generated registry

`registry.json` is a derived snapshot containing:

- schema `nexusfactory.registry/1`;
- revision `1`;
- sorted domains and kits;
- capability providers, edges, missing dependencies, and graph validity;
- an integrity SHA-256 over the snapshot body.

At baseline it contains 42 domains, seven kits, and integrity `sha256:a0e255b52b7afb47c1c77701bd22983419027bfa6c8f145aa1ff8d53dffdd93b`.

## Ownership boundary

Kits owns generation meaning, parameters, seeds, phases, artifacts, validation, and export encoding. Studio owns registry loading, generic invocation, controls, previews, snapshots, and downloads. Details of that handoff are in [studio-handoff.md](studio-handoff.md).
