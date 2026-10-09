# Source, asset and dependency provenance

## Repository source

The root `LICENSE` is the **MIT License**, with copyright notice for LuminaryLabs-Dev, 2026. Root source includes ESM generator contracts, semantic domain registration, procedural implementations, validators, output encoding, and tests. The MIT project license should not be assumed to override rights in any independently licensed dependency or supplied material.

## Committed asset evidence

The repo includes a reproducible coral asset group under `artifacts/coral-3d/`, including ten GLB models and `export-records.json`. Generator programs, screenshots, comparison images, and review materials may also be stored in specialized `tools/` packages. Their presence and checksums provide traceability of the exported artifacts, but do **not** independently establish artistic ownership, redistribution rights, or final review acceptance.

A standalone Triceratops candidate is described as a structural-review result in the README and agent memory. The root documentation explicitly says it still needs art approval, has no rig and has no animation clips. Other generated geometry/texture output should also not be marketed as art-approved by default.

## Third-party packages and attribution

The main package pins `three` 0.180.0 for developer tools. Subpackages use different `three` versions and additional dependencies (`sharp`, `playwright`, `@sparticuz/chromium`, and `@headless-three/renderer`). See [dependencies](dependencies.md) for exact committed versions. Upstream software and licensed materials remain governed by their own package licenses/notices; audit those before redistributing bundled outputs.

## Project and publication boundaries

- NexusFactory-Studio and live jsDelivr fetching are integration mechanisms, not evidence of who owns a given asset.
- Current [known issues](known-issues.md) document missing source-commit, registry-integrity, implementation-fingerprint and dedicated Kit-version fields in exported artifact provenance.
- Do not claim a generated mesh is rigged, animated, or production-certified based solely on structural validation.
- Commit authorship, seed/replay data, deterministic hashes, and asset review records are distinct forms of evidence; none alone settles legal provenance.

Before publishing a pack commercially, establish output-specific ownership/attribution, dependency notices, asset review decisions, and any external source licensing. This is an evidence inventory, **not** a legal determination.
