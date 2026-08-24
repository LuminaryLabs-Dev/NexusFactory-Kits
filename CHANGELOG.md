# Changelog

This file records notable human-facing project changes. The dated sections below are development milestones reconstructed from repository history; they are not tagged releases.

## Unreleased

### Documentation

- Added a code-grounded repository guide, architecture, kit contract, generator catalog, development guide, validation baseline, known-issues register, Studio handoff, and agent-operation package.

### Known limitations

- The current test baseline has one aquatic composition-metadata assertion failure.
- Browser, worker, live Studio integration, performance, package publication, and production stability remain unverified.

## 2026-08-22 — Layered aquatic generators and live registry

- Added Fish, Aquatic Flora, Reef, and Aquarium generators.
- Added reusable aquatic environment, scene-layer, terrain, population, subject, and VFX domains.
- Added phased Reef and Aquarium generation.
- Expanded the public registry to 42 domains and seven kits.
- Synchronized the generated registry used by the live `main` channel.

## 2026-08-21 — Phased Tree and standardized runtimes

- Split Tree generation into growth, Bezier, wood, foliage, artifact, and validation phases.
- Added typed phase outputs, inspectable generation state, partial phase reruns, and Kit-owned mesh normals.
- Added self-describing generation/export contracts.
- Added standardized Ballista and Coral runtime adapters.
- Added registry validation automation for changes on `main`.

## 2026-08-20 — Editor contracts and Coral

- Added generic editor metadata, inferred controls, enum parameters, and editor-contract tests.
- Reworked broadleaf foliage into a connected, unified crown mesh.
- Added the deterministic Coral Generator, raster foundation utilities, PNG export, and coral validation rendering.

## 2026-08-19 — Initial registry-driven platform

- Established the factory domain and capability model.
- Added deterministic random, hashing, geometry, GLB, artifact, registry, and catalog foundations.
- Added the Windup Ballista Turret and initial Broadleaf Tree generators.
- Added the first test and demo commands.
