# Changelog

This file records notable human-facing project changes. Dated sections are development milestones, not tagged releases.

## Unreleased

### Added

- Added `factory-object-creature-fish`, a deterministic high-fidelity Procedural Reef Fish textured-mesh Kit.
- Added creature, aquatic-creature, and aquatic-fish object domains with capability `aquatic:fish:mesh`.
- Added phased fish generation: anatomy, appendages, face, surface, artifact, and validation.
- Added procedural body families, tails, faces, biological patterns, texture maps, and PBR surface controls.
- Added browser-safe shared fish generation core and Node-only generation, inspection, batch, and seven-loop review tools.
- Added optional textured-mesh artifact fields for UVs, tangents, colors, embedded textures, and extended PBR materials.
- Added GLB support for embedded textures, PBR maps, alpha behavior, clearcoat, iridescence, and transmission.
- Added deterministic, browser-import, variation, artifact, GLB, and phased-generation tests.

### Changed

- Kept the existing `factory-texture-fish` raster Kit as an independent pixel-art generator.
- Aligned Reef and Aquarium composition metadata with their public test contract: `reef` and `aquarium`.
- Added Creatures category inference, editor sections, and manifest-driven generation debounce metadata.
- Added `.gitignore` coverage for generated validation output.

### Validation

- Focused fish integration suite: 9 passing tests, zero failures.
- Seven image-review loops passed, including a twenty-fish representative batch and source-versus-reloaded GLB comparison.
- Complete repository validation passed 33/33 tests with a valid 45-domain, 8-Kit registry.
- A live-CDN Studio runner imported and exercised 8/8 Kits through deterministic generation, randomize, reroll, validation, declared phases, and export.
- Studio browser validation fully passed all 5 image Kits and captured ten distinct variations. The 3 mesh Kits reached validated artifacts and GLB export, but cloud-browser preview remained blocked by unavailable WebGL.

### Known limitations

- Fish animation, genetics, breeding, game integration, worker execution, WebGL mesh-preview completion, and production performance gates remain outside this milestone.
- Ballista GLB animation and complete artifact provenance remain open.

## 2026-08-24 — Repository documentation system

- Added code-grounded architecture, contract, catalog, development, validation, known-issues, Studio-handoff, and agent-operation documentation.

## 2026-08-22 — Layered aquatic generators and live registry

- Added raster Fish, Aquatic Flora, Reef, and Aquarium generators.
- Added reusable aquatic environment, scene-layer, terrain, population, subject, and VFX domains.
- Added phased Reef and Aquarium generation.
- Synchronized the live registry channel.

## 2026-08-21 — Phased Tree and standardized runtimes

- Added typed Tree phases, inspectable state, partial reruns, Kit-owned normals, and standardized export contracts.

## 2026-08-20 — Editor contracts and Coral

- Added generic editor metadata, the deterministic Coral Generator, raster utilities, PNG export, and coral validation rendering.

## 2026-08-19 — Initial registry-driven platform

- Established the factory domain/capability model, deterministic foundations, registry, Ballista, Tree, tests, and demos.
