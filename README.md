# NexusFactory-Kits

NexusFactory-Kits is the registry-driven procedural generation library behind NexusFactory. It owns generator semantics, deterministic inputs, artifacts, validation, exports, and the domain/capability graph. [NexusFactory-Studio](https://github.com/LuminaryLabs-Dev/NexusFactory-Studio) owns the generic browser UI that discovers and invokes these kits.

The repository is active and experimental. `main` is the live registry channel consumed by Studio.

## Requirements

- Node.js 20 or newer
- Git when cloning the repository

The project uses native ECMAScript modules, declares no third-party runtime dependencies, and has no transpilation step.

## Quick start

```bash
git clone https://github.com/LuminaryLabs-Dev/NexusFactory-Kits.git
cd NexusFactory-Kits
npm run validate
npm run demo
```

## Public generators

| Generator | Kit ID | Output | Version |
| --- | --- | --- | --- |
| Windup Ballista Turret | `factory-object-weapon-ballista` | Mesh artifact; GLB or JSON | `0.1.0` |
| Procedural Broadleaf Tree | `factory-object-foliage-tree` | Mesh artifact; GLB or JSON | `0.2.0` |
| Procedural Reef Fish | `factory-object-creature-fish` | Textured mesh artifact; GLB or JSON | `0.1.0` |
| Coral Generator | `factory-texture-coral` | 96×96 RGBA image; PNG or JSON | `0.2.0` |
| Fish Generator | `factory-texture-fish` | 64×64 pixel-art image; PNG or JSON | `0.1.0` |
| Aquatic Flora Generator | `factory-texture-aquatic-flora` | 64×64 RGBA image; PNG or JSON | `0.1.0` |
| Reef Generator | `factory-scene-aquatic-reef` | 128×128 RGBA scene; PNG or JSON | `0.1.0` |
| Aquarium Generator | `factory-scene-aquatic-aquarium` | 128×128 RGBA scene; PNG or JSON | `0.1.0` |

The two fish kits are intentionally separate: `factory-texture-fish` remains the raster subject used by pixel-art scene kits, while `factory-object-creature-fish` produces a reusable PBR 3D asset.

## Procedural Reef Fish

```js
import { creatureFishKit } from "./src/index.js";

const artifact = creatureFishKit.services.generate({
  seed: "reef-fish-001",
  params: {
    speciesFamily: "oval",
    tailProfile: "forked",
    patternType: "bands",
    palette: "azureGold",
    quality: "preview"
  }
});

const validation = creatureFishKit.services.validate(artifact);
if (!validation.valid) throw new Error("Generated fish is invalid");
const output = creatureFishKit.services.export(artifact, "glb");
```

The kit executes:

```text
anatomy → appendages → face → surface → artifact → validate
```

Artifacts can contain UVs, tangents, vertex colors, embedded RGBA textures, transparent meshes, and extended PBR materials. GLB export embeds textures and the clearcoat, iridescence, and transmission extensions used by the fish.

## Fish development tools

```bash
npm run fish:generate
npm run fish:validate
npm run fish:inspect
npm run fish:batch
npm run fish:review
```

These tools import the same browser-safe generation core as the registered kit. Generated evidence is written under the ignored `validation/` directory.

## Registry and Studio

`registry.json` is generated from `src/catalog.js`:

```bash
npm run registry:build
```

Do not edit `registry.json` manually. Studio resolves each manifest's `source.module`, derives controls and phases from manifest metadata, previews image or mesh artifacts, and downloads Kit-owned exports.

## Documentation

- [Architecture](docs/architecture.md)
- [Kit contract](docs/kit-contract.md)
- [Generator catalog](docs/generator-catalog.md)
- [Development](docs/development.md)
- [Validation](docs/validation.md)
- [Known issues](docs/known-issues.md)
- [Studio handoff](docs/studio-handoff.md)
- [Changelog](CHANGELOG.md)
- [Agent instructions](AGENTS.md)

## Current limits

- The 3D fish is a static asset; animation, skeletons, genetics, breeding, and aquarium simulation are outside this kit.
- Worker execution, live deployed Studio browser operation, and performance budgets require separate direct evidence.
- Ballista timeline tracks are still not serialized into glTF animations.
- Artifact provenance does not yet identify the exact source commit and implementation fingerprint.

## License

[MIT](LICENSE)
