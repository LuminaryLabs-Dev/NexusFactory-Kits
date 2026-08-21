# NexusFactory-Kits

Registry-driven procedural generation domains and kits for NexusFactory.

## Architectural boundary

**This repository owns factory-generation meaning and capability.** It contains domain/subdomain contracts, deterministic seed behavior, parameter/randomization policy, generation math, mesh/image construction, normals, validation, artifact descriptors, variation, and export. It does **not** own editor UI, viewport rendering, workspace UX, snapshots, or cloud-routing UI; those belong to `NexusFactory-Studio`.

The hierarchy follows the Nexus Engine domain model:

```text
n:factory
├── n:factory:object
│   ├── n:factory:object:weapon
│   │   └── factory-object-weapon-ballista
│   ├── n:factory:object:foliage
│   │   └── n:factory:object:foliage:tree
│   │       ├── growth
│   │       ├── curve
│   │       │   └── bezier
│   │       ├── wood
│   │       ├── crown
│   │       └── factory-object-foliage-tree
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

A **domain** owns vocabulary/rules, a **subdomain** specializes them, and a **kit** composes executable services. Kits declare `requires`, `provides`, a parameter schema, runtime environments, and an editor descriptor that a host can render without knowing generator-specific code.

## Runtime services

All Studio-facing kits expose the standard service boundary:

- `describe()`
- `generate({ seed, params })`
- `randomize({ seed, params, groupId })`
- `reroll({ seed, params })`
- `validate(artifact)`
- `export(artifact, format)` → `nexusfactory.export-result/1`

Kits that support inspectable generation may additionally expose:

- `createState({ seed, params })`
- `inspectState(state)`
- `runPhase(state, phase)`

The current Tree pipeline declares:

```text
spec
  → growth
  → bezier
  → wood
  → foliage
  → artifact
  → validate
```

`generate()` remains the convenience path across all phases. Growth owns the structural intent; cubic Bézier interprets those axes without mutating growth; Wood converts curves into tapered meshes; Crown derives storybook/clay foliage pods from leader terminal regions.

Generation is deterministic: the same kit version, seed, and normalized parameters produce the same artifact hash. Parameter randomization and seed reroll are separate Kit-owned operations.

Mesh artifacts include Kit-generated normals. GLB export consumes those normals directly. Snapshot rendering is deliberately not part of the Kit contract.

## Included proof kits

- **Windup Ballista Turret** — object-specific weapon geometry with a central launch rail, lateral torsion arms, winding drum, bowstring, bolt, ammunition rack, and wind/fire/reload tracks.
- **Procedural Broadleaf Tree** — phased growth-driven broadleaf generation with cubic Bézier wood and leader-derived storybook/clay foliage pods.
- **Coral Generator** — isolated transparent coral assets and composed reef scenes from shared morphology grammars, with deterministic PNG export.

## Validate

```bash
npm run validate
npm run demo
npm run coral:render
```

`npm run registry:build` materializes `registry.json`, the Studio-facing discovery surface. `.github/workflows/validate-registry.yml` validates source changes and commits the regenerated registry only after the full validation command succeeds.
