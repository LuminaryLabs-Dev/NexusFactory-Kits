# Known Issues and Limits

## Ballista service-surface divergence

- Package-root Ballista and registry runtime still expose different service/result shapes.
- Resolution requires selecting one canonical runtime and adding parity tests.

## Ballista timeline is not encoded in GLB

- Ballista artifacts contain timeline tracks.
- `src/foundation/glb.js` does not serialize glTF animations.
- Exported Ballista GLB files are static.

## Provenance is incomplete

Artifacts identify Kit, domain, seed, parameters, metadata, and deterministic hash, but do not identify source commit, registry integrity, Kit implementation fingerprint, or a dedicated Kit-version field.

## Manifest fingerprint is manifest-only

`contentFingerprint` hashes normalized manifest data, not generator source. Source behavior can change without a fingerprint change if the manifest remains identical.

## Browser and worker coverage

All live public module graphs run through the Studio-side Node validator. Direct browser generation, preview, randomize, reroll, validation, and export pass for all 5 image Kits. Worker execution and WebGL mesh-preview execution remain separate validation requirements.

## Live Studio integration

The deployed Studio and jsDelivr registry path has been smoke-tested for 8 live Kits. The 3 mesh Kits reached validated artifacts and GLB downloads, but the cloud browser had no WebGL context. A WebGL-capable browser run is still required before claiming complete visual end-to-end coverage.

## Performance budgets

No repository-wide benchmark gate exists. Preview and high-quality generation budgets remain targets until measured across supported browsers and hardware.

## Fish generator scope

The 3D fish Kit is static. It does not provide skeletal animation, swimming behavior, genetics, breeding, ecosystem simulation, direct Little Reef integration, cloud generation, or asset storage.

## Exhaustive topology validation

The fish validator checks finite geometry, indices, normals, UVs, tangents, bounds, material references, texture payloads, and subject structure. It does not perform exhaustive all-triangle self-intersection analysis for every generated combination.
