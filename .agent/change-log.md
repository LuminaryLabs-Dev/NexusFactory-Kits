# Agent Maintenance Change Log

Record only material changes to repository state, governing documentation, validation state, or durable context.

## 2026-08-24 — Integrate Procedural Reef Fish

- Change: Added a browser-safe high-fidelity 3D fish Kit, creature domains, textured artifact/GLB contracts, review tools, focused tests, and documentation.
- Compatibility: Preserved the existing raster Fish Generator and backward compatibility for untextured mesh artifacts.
- Validation: Focused integration tests passed 9/9; seven automated and visually reviewed loops passed; twenty representative fish were reviewed; source/reloaded GLB render difference remained negligible.
- Baseline correction: Aligned Reef and Aquarium composition metadata with their existing test contract.
- Studio: Generic textured-mesh/PBR viewer support was validated separately and added to `LuminaryLabs-Dev/NexusFactory-Studio`.
- Follow-up: Confirm complete Kits CI, generated registry synchronization, CDN propagation, and live Studio smoke behavior.

## 2026-08-24 — Establish repository documentation system

- Change: Added the active agent-operation package and code-grounded human documentation; replaced the minimal README.
- Baseline: `main` at `464d404eadad9e70ecdbf27fca265963226f63b4` before the documentation change.
- Validation: Registry rebuilt without a diff; demos passed; coral validation rendered assets and scenes; Kits tests reported 23 pass and one known failure; Studio syntax and fixture tests passed.
- Result: Documentation and agent roles became explicit.
