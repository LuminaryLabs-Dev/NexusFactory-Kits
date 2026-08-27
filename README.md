# NexusFactory-Kits

NexusFactory-Kits is the registry-driven procedural generation library behind NexusFactory. It owns generator semantics, deterministic inputs, artifacts, validation, exports, and the domain/capability graph. [NexusFactory-Studio](https://github.com/LuminaryLabs-Dev/NexusFactory-Studio) owns the generic browser UI that discovers and invokes these kits.

The repository is active and experimental. `main` is the live registry channel consumed by Studio.

## Requirements

- Node.js 20 or newer
- Git when cloning the repository

The project uses native ECMAScript modules, declares no third-party runtime dependencies, and has no transpilation step. Offline 3D export tools use the pinned `three` development dependency.

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
| Coral Generator | `factory-texture-coral` | 96×96 RGBA image; PNG or JSON | `0.3.0` |
| Fish Generator | `factory-texture-fish` | 64×64 pixel-art image; PNG or JSON | `0.1.0` |
| Aquatic Flora Generator | `factory-texture-aquatic-flora` | 64×64 RGBA image; PNG or JSON | `0.2.0` |
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

## Coral Generator

The Coral Generator preserves one five-color pixel-art language while giving all seven species separate procedural identities:

- Staghorn grows tapered antler colonies with many terminal fingers.
- Elkhorn forms broad, flattened paddle crowns.
- Brain produces a low dome with continuous labyrinth valleys.
- Pillar grows uneven rounded columns with channels and polyp marks.
- Lettuce stacks angled, ruffled plates around a central rosette.
- Sea Fan builds an asymmetric open lattice on a narrow holdfast.
- Sea Rod grows fewer, softer candelabrum branches with rounded polyp tips.

`size`, `density`, `asymmetry`, and `highlight` retain the same public meanings but now affect each species through its own growth rules. The Kit remains deterministic and exports transparent 96×96 RGBA images as PNG or JSON.

## Reviewed 3D coral exports

The offline `tools/coral-3d` pipeline owns ten deterministic, numbered coral models used by Little Reef. It keeps the reviewed GLBs and their checksums under `artifacts/coral-3d`; it is an asset-production tool and is not registered as a browser runtime Kit.

```bash
npm run coral:3d:generate -- /tmp/coral-exports
npm run coral:3d:validate
```

The first command regenerates the ten GLBs and export records. The second reloads the approved exports, validates finite mesh positions, exact checksums and triangle counts, and proves floor contact.

## Triceratops mesh editor

`tools/triceratops-mesh-editor` is a reusable offline procedural editor built around a typed JSON AST and a flat service surface. It owns the reviewed Triceratops program, accepted RFC 6902 transactions, incremental evaluation, topology gates, browser preview, guided review runner, and deterministic GLB export. It is not registered as a public browser Kit.

```bash
npm run triceratops:install
npm run triceratops:test
npm run triceratops:validate
npm run triceratops:serve
```

The committed GLB is a `reviewed-candidate`: it passes structural validation but still requires user art approval and has no rig or animation clips. Compact comparison, orbit, validation, and replay evidence is committed; the 101 MB full review archive is intentionally kept outside Git history.

## Aquatic Flora Generator

Aquatic Flora `0.2.0` gives Seagrass, Kelp, Branching, and Tuft separate rooted growth grammars while preserving the existing style, palette, size, density, and sway controls. Artifacts now record design profiles and feature counts, and validation proves connected silhouettes, palette depth, style identity, and parameter response.

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
- Worker execution, WebGL mesh-preview completion, and performance budgets require separate direct evidence. Live image-Kit Studio operation is validated.
- Ballista timeline tracks are still not serialized into glTF animations.
- Artifact provenance does not yet identify the exact source commit and implementation fingerprint.

## License

[MIT](LICENSE)
