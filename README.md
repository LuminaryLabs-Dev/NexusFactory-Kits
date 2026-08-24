# NexusFactory-Kits

NexusFactory-Kits is the registry-driven procedural generation library behind NexusFactory. It owns generator semantics, deterministic inputs, artifacts, validation, exports, and the domain/capability graph. [NexusFactory-Studio](https://github.com/LuminaryLabs-Dev/NexusFactory-Studio) owns the browser UI that discovers and invokes these kits.

The repository is active but experimental. Registered domains default to experimental stability, the package has no verified npm release, and the current test baseline contains one known aquatic metadata assertion failure.

## Requirements

- Node.js 20 or newer
- Git, when cloning the repository

The project declares no third-party package dependencies and has no build or transpilation step. A dependency installation step is not currently required.

## Quick start

```bash
git clone https://github.com/LuminaryLabs-Dev/NexusFactory-Kits.git
cd NexusFactory-Kits
node scripts/build-registry.mjs
node --test tests/*.test.mjs
node scripts/demo.mjs
```

`node --test tests/*.test.mjs` currently runs 24 tests: 23 pass and one fails because the test expects `reef` while the implementation records `reef-v1`. See [Validation](docs/validation.md) and [Known issues](docs/known-issues.md).

`npm run validate`, `npm test`, `npm run demo`, and `npm run coral:render` are equivalent package-script entry points. The coral renderer creates an untracked `validation/` directory.

## Public generators

| Generator | Kit ID | Output | Version |
| --- | --- | --- | --- |
| Windup Ballista Turret | `factory-object-weapon-ballista` | Mesh artifact; GLB or JSON export | `0.1.0` |
| Procedural Broadleaf Tree | `factory-object-foliage-tree` | Mesh artifact; GLB or JSON export | `0.2.0` |
| Coral Generator | `factory-texture-coral` | 96×96 RGBA image; PNG or JSON export | `0.2.0` |
| Fish Generator | `factory-texture-fish` | 64×64 RGBA image; PNG or JSON export | `0.1.0` |
| Aquatic Flora Generator | `factory-texture-aquatic-flora` | 64×64 RGBA image; PNG or JSON export | `0.1.0` |
| Reef Generator | `factory-scene-aquatic-reef` | 128×128 RGBA scene; PNG or JSON export | `0.1.0` |
| Aquarium Generator | `factory-scene-aquatic-aquarium` | 128×128 RGBA scene; PNG or JSON export | `0.1.0` |

See the [Generator catalog](docs/generator-catalog.md) for parameters, phases, validation, and limitations.

## Basic use

```js
import { treeKit } from "./src/index.js";

const artifact = treeKit.services.generate({
  seed: "storybook-007",
  params: { maturity: 0.65, foliageDensity: 0.72 }
});

const validation = treeKit.services.validate(artifact);
const exported = treeKit.services.export(artifact, "glb");
```

The package root exports the domain definitions, artifact helpers, registry factory, and seven kits. `registry.json` is the generated Studio-facing catalog. Studio loads the live registry from `main` and dynamically imports each manifest's `source.module`; see [Studio handoff](docs/studio-handoff.md).

## Documentation

- [Architecture](docs/architecture.md) — ownership, data flow, domains, capability graph, and phased generation
- [Kit contract](docs/kit-contract.md) — public services, artifacts, determinism, validation, and exports
- [Generator catalog](docs/generator-catalog.md) — the seven public generators
- [Development](docs/development.md) — commands, registry generation, CI, and safe change flow
- [Validation](docs/validation.md) — reproducible checks and observed results
- [Known issues](docs/known-issues.md) — verified defects, limitations, and unsupported claims
- [Studio handoff](docs/studio-handoff.md) — live registry and consumer boundary
- [Changelog](CHANGELOG.md) — human-facing project chronology
- [Agent instructions](AGENTS.md) — rules for automated maintenance

## Current limitations

- The complete test command is not green at the audited baseline.
- Ballista's package-root API differs from its registry runtime adapter.
- Ballista artifacts contain timeline tracks, but the GLB encoder does not serialize animations.
- Browser and worker compatibility are declared but not directly tested here.
- No live cross-repository browser test verifies Studio against the current registry.
- Performance, production stability, package publication, and release compatibility are not validated.

## History

The registry and initial Ballista and Tree kits were introduced on August 19, 2026. Editor contracts and Coral followed on August 20, phased Tree generation and standardized runtime adapters on August 21, and layered aquatic generators on August 22. These are development milestones, not tagged releases.

## License

[MIT](LICENSE)
