# Kit Contract

This document describes the implemented contracts at the audited baseline. Manifests declare intended services and environments; the callable module remains the final evidence for actual behavior.

## Terms

- **Domain:** semantic owner of capabilities and responsibilities.
- **Capability:** a string token in `requires` or `provides`.
- **Kit:** independently callable generator with a manifest and services.
- **Runtime:** the module and service object loaded by a consumer.
- **Artifact:** immutable generated mesh or image data.
- **Generation state:** inspectable phased-work state for Tree, Reef, and Aquarium.
- **Validation report:** evidence-backed checks for an artifact.
- **Export result:** self-describing file output with format, MIME type, filename, and bytes or text.

## Manifest

`defineKit()` returns a frozen manifest containing:

```text
kind, id, displayName, version, domainPath
requires[], provides[], services[]
parameterSchema[]
editor { preview, controls, randomizationGroups, surfaces }
runtime { environments[], permissions[] }
source { module, exportName }
metadata
contentFingerprint
```

Numeric parameters are converted, checked for finiteness, clamped to minimum/maximum, and rounded when integer. Choice parameters must match a declared option or throw `RangeError`.

`contentFingerprint` hashes the normalized manifest. It does not hash the kit's source files.

## Services

| Service | Implemented outcome |
| --- | --- |
| `describe()` | Structured clone of the manifest |
| `generate({ seed, params })` | Deterministic artifact for normalized inputs |
| `randomize({ seed, params, groupId, entropy })` | Varies parameters in one declared group; may also reroll the seed when the group requests it |
| `reroll({ seed, params, entropy })` | Derives a new seed while preserving normalized parameters |
| `validate(artifact)` | Validation report with `valid`, individual checks, and artifact hash |
| `export(artifact, format)` | Kit-owned GLB, PNG, or JSON representation |
| `createState(request)` | Initial typed state for phased kits |
| `inspectState(state)` | Clone-safe summary of completed phases and available outputs |
| `runPhase(state, phase)` | Runs one phase, enforces prerequisites, and invalidates downstream state |

Tree, Coral, Fish, Aquatic Flora, Reef, and Aquarium expose the standard service shape directly. Ballista has the exception described below.

## Artifact schemas

All artifacts use `nexusfactory.artifact/1`, include `kitId`, `domainPath`, string seed, normalized parameters, metadata, and `deterministicHash`.

Mesh artifacts add:

- normalized meshes with positions, indices, and computed or provided normals;
- materials and optional timeline tracks;
- bounds;
- mesh, triangle, and timeline-track statistics.

Image artifacts add:

- `artifactKind: "image"`;
- width, height, four channels, `rgba8`, base64 pixels, transparency, and sampling;
- pixel count and kit-specific statistics.

Artifacts do not carry a dedicated kit version, registry integrity, source commit, or implementation fingerprint.

## Generation state

Phased states use `nexusfactory.generation-state/1` and contain kit identity, seed, normalized parameters, phase order, completed phases, outputs, artifact, and validation. They begin with `completedPhases: ["spec"]`.

Running an earlier phase removes downstream outputs so stale artifacts and validation cannot survive a partial rerun.

## Validation

`validateArtifactShape()` verifies common schema, identity, seed, hash, and mesh/image structure. Each kit adds subject-specific checks such as required Ballista parts, Tree submeshes and normals, image dimensions, transparency, occupancy, connectedness, or scene population.

Validation reports demonstrate only the encoded checks. They do not prove visual quality, browser support, performance, production readiness, or Studio integration.

## Exports

- Ballista: GLB or JSON.
- Tree: GLB or JSON.
- Coral, Fish, Aquatic Flora, Reef, Aquarium: PNG or JSON.

Standard exports use `nexusfactory.export-result/1` with `format`, `mimeType`, `fileName`, and either `bytes` or `text`. Mesh export validates Tree before encoding; image exports validate their artifacts before encoding.

The GLB encoder writes glTF 2.0 mesh, normal, index, material, node, and artifact identity data. It does not convert artifact timeline tracks to glTF animations.

## Determinism and variation

Generation is deterministic for the same implementation, seed, and normalized parameters. Seed derivation and named random streams separate stages. Randomization and reroll operations are intentionally nondeterministic when callers omit `entropy`; callers can provide fixed entropy for reproducible variation tests.

A matching seed does not guarantee matching output after source, manifest, or algorithm changes. Current artifact provenance does not encode enough information to reconstruct the exact implementation automatically.

## Ballista surface divergence

`src/index.js` exports `ballista-kit/index.js`. Its manifest omits `randomize`; its GLB export returns raw `Uint8Array` and JSON export returns a raw string.

`src/catalog.js` registers `ballista-kit/runtime.js`. That adapter adds `randomize`, changes `source.module` to itself, and wraps exports in `nexusfactory.export-result/1`. NexusFactory-Studio follows the registry and therefore receives the adapter surface.

Consumers importing the package root must not assume the registry adapter contract until this divergence is intentionally resolved.

## Errors

Invalid parameters, empty required seeds, unknown groups, unsupported phases, missing phase prerequisites, invalid artifacts, and unsupported formats throw typed errors. Callers should surface the error and preserve the request context rather than substituting generator-specific fallback behavior.
