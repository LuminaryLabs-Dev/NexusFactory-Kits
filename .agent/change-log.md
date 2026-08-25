# Agent Maintenance Change Log

Record only material changes to repository state, governing documentation, validation state, or durable context.

## 2026-08-25 — Redesign Coral species identities

- Change: Replaced shared generic Coral structures with seven species-specific morphology renderers and updated the public Kit to `0.3.0` without changing its services, controls, artifact schema, or Studio boundary.
- Visual system: Preserved the five-color nearest-neighbor style while separating antler, paddle, labyrinth, column, ruffled-plate, lattice-fan, and soft-rod treatments.
- Validation: Added actual silhouette-distance, morphology-signature, parameter-response, and seed-sweep checks; complete validation passed 35/35 tests.
- Integration: A local Studio validator downloaded and exercised all 8 generated registry module graphs before publication; 21 Coral variants and 4 reef scenes were generated and visually inspected.

## 2026-08-25 — Validate live registry and Studio consumption

- Kits: Complete validation passed 33/33 tests; the generated registry remained valid with 45 domains and 8 Kits.
- Live channel: A Studio-side MJS runner downloaded each Kit and relative dependency separately from jsDelivr; 8/8 Kits passed import, describe, deterministic generation, randomize, reroll, validation, declared phases, and export.
- Browser: All 5 image Kits passed generation, preview, randomize, reroll, validation, and PNG export; ten distinct valid variations were captured.
- Boundary: The 3 mesh Kits reached validated artifacts and GLB export, but the cloud browser could not create WebGL contexts, so their Three.js preview remains unverified.

## 2026-08-24 — Integrate Procedural Reef Fish

- Change: Added a browser-safe high-fidelity 3D fish Kit, creature domains, textured artifact/GLB contracts, review tools, focused tests, and documentation.
- Compatibility: Preserved the existing raster Fish Generator and backward compatibility for untextured mesh artifacts.
- Validation: Focused integration tests passed 9/9; seven automated and visually reviewed loops passed; twenty representative fish were reviewed; source/reloaded GLB render difference remained negligible.
- Baseline correction: Aligned Reef and Aquarium composition metadata with their existing test contract.
- Studio: Generic textured-mesh/PBR viewer support was validated separately and added to `LuminaryLabs-Dev/NexusFactory-Studio`.
- Follow-up: Close the remaining mesh-preview check in a WebGL-capable browser.

## 2026-08-24 — Establish repository documentation system

- Change: Added the active agent-operation package and code-grounded human documentation; replaced the minimal README.
- Baseline: `main` at `464d404eadad9e70ecdbf27fca265963226f63b4` before the documentation change.
- Validation: Registry rebuilt without a diff; demos passed; coral validation rendered assets and scenes; Kits tests reported 23 pass and one known failure; Studio syntax and fixture tests passed.
- Result: Documentation and agent roles became explicit.
