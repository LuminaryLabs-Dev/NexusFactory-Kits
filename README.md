# NexusFactory-Kits

Registry-driven procedural generation domains and kits for NexusFactory.

## Architectural boundary

**This repository owns factory-generation meaning and capability.** It contains domain/subdomain contracts, deterministic seed behavior, generator kits, validation, artifact descriptors, variation, and export. It does **not** own editor UI, viewport rendering, workspace UX, or cloud-routing UI; those belong to `NexusFactory-Studio`.

The hierarchy follows the Nexus Engine domain model:

```text
n:factory
├── n:factory:object
│   ├── n:factory:object:weapon
│   │   └── factory-object-weapon-ballista
│   ├── n:factory:object:foliage
│   │   └── factory-object-foliage-tree
│   ├── n:factory:object:prop
│   ├── n:factory:object:structure
│   └── n:factory:object:vehicle
├── n:factory:material
│   ├── n:factory:material:pbr
│   ├── n:factory:material:stylized
│   └── n:factory:material:procedural
├── n:factory:texture
│   └── factory-texture-coral
├── n:factory:vfx
├── n:factory:scene
└── n:factory:animation
```

A **domain** owns vocabulary/rules, a **subdomain** specializes them, and a **kit** provides executable services. Kits declare `requires`, `provides`, a parameter schema, runtime environments, and an editor descriptor that a host can render without knowing generator-specific code.

## Services

Executable kits expose the same service boundary:

- `describe()`
- `generate({ seed, params })`
- `reroll({ seed, params })`
- `validate(artifact)`
- `export(artifact, format)`

Generation is deterministic: the same kit version, seed, and normalized parameters produce the same artifact hash.

Artifacts may be mesh or image artifacts. Image kits use an RGBA8 image descriptor so browser, Node, worker, validation, export, and Studio preview can consume the same deterministic payload without a DOM dependency.

## Included proof kits

- **Windup Ballista Turret** — object-specific weapon geometry with a central launch rail, lateral torsion arms, winding drum, bowstring, bolt, ammunition rack, and wind/fire/reload tracks.
- **Procedural Broadleaf Tree** — a separate foliage subdomain with seeded branching and canopy generation, proving the host architecture is not weapon-specific.
- **Coral Generator** — one texture kit with two modes: isolated transparent coral assets and composed reef scenes. Seven real-species-inspired presets share reusable branching, frond, mound, column, plate, fan, rod, raster, shading, and seeded-noise foundations. PNG export uses nearest-neighbor scaling.

## Validate

```bash
npm run validate
npm run demo
npm run coral:render
```

`npm run registry:build` materializes `registry.json`, which is the Studio-facing discovery surface. `npm run coral:render` writes a fixed-seed visual validation matrix under `validation/` for deterministic art review.
