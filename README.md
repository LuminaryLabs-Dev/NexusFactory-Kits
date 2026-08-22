# NexusFactory-Kits

Registry-driven procedural generation domains and kits for NexusFactory.

## Architectural boundary

**This repository owns factory-generation meaning and capability.** Domains own semantic responsibilities; specialist subdomains provide composable capabilities; public Kits turn those capabilities into independently useful generators. Studio owns hosting and UI, not generator-specific behavior.

```text
n:factory
├── object
│   ├── weapon → Ballista
│   └── foliage
│       └── tree
│           ├── growth
│           ├── curve → bezier
│           ├── wood
│           ├── crown
│           └── Broadleaf Tree
├── texture
│   ├── subject
│   │   ├── coral → Coral Generator
│   │   ├── fish → Fish Generator
│   │   └── aquatic-flora → Aquatic Flora Generator
│   └── environment
│       ├── water
│       ├── substrate
│       └── rock
├── vfx
│   └── aquatic
│       ├── bubbles
│       ├── particles
│       └── light-shafts
└── scene
    ├── layer
    │   ├── stack
    │   └── placement
    ├── terrain
    │   └── profile
    └── aquatic
        ├── population
        ├── reef → Reef Generator
        └── aquarium → Aquarium Generator
```

A Domain is a semantic owner, not a filesystem alias. Every immediate parent is registered and every Kit declares explicit `requires` / `provides` capabilities. Infrastructure subdomains are reusable services; they are not exposed as generators unless they are independently useful outputs.

## Runtime services

All Studio-facing Kits expose `describe`, `generate`, `randomize`, `reroll`, `validate`, and `export`. Phased Kits additionally expose `createState`, `inspectState`, and `runPhase`.

Tree phases are `growth → bezier → wood → foliage → artifact → validate`.

Reef and Aquarium phases are `terrain → environment → population → placement → subjects → effects → compose → artifact → validate`.

## Public generators

- **Windup Ballista Turret** — deterministic weapon mesh + animation export.
- **Procedural Broadleaf Tree** — phased tree generation.
- **Coral Generator** — standalone transparent coral assets; seven coral species remain variants of one Kit.
- **Fish Generator** — standalone transparent pixel-art fish assets.
- **Aquatic Flora Generator** — standalone aquatic vegetation assets.
- **Reef Generator** — natural open-water reef scenes assembled from shared aquatic capabilities.
- **Aquarium Generator** — contained fish-tank scenes using the same shared capabilities with aquarium-specific composition.

## Live registry

`main` is the live NexusFactory-Kits channel. `registry.json` is generated from source and consumed by Studio from `NexusFactory-Kits@main`. Fixes move `main` forward; consumers are not normally pinned backward to old commits.

## Validate

```bash
npm run validate
npm run demo
npm run coral:render
```

`npm run registry:build` materializes `registry.json`. The `Validate Kits and Registry` workflow runs full validation on `main` changes and commits a rebuilt registry only after validation succeeds.
