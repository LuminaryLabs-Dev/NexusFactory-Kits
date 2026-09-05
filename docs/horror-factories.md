# Procedural horror factories

Three independent browser-safe Kits support authored games and generic Studio consumers. All output is synthetic mathematical geometry. Public services and the artifact schema are unchanged.

| Kit | Domain | Purpose |
| --- | --- | --- |
| `factory-object-creature-horror` | `n:factory:object:creature` | Six sculpted creature grammars |
| `factory-object-structure-liminal` | `n:factory:object:structure` | Parameterized corridors with guaranteed central clearance |
| `factory-material-procedural-distressed` | `n:factory:material:procedural` | Seeded stained, cracked, woven and scratched vertex-color surfaces |

## Service contract

Each exports `kit`, `manifest`, named `describe`, `generate`, `randomize`, `reroll`, `validate`, and `exportArtifact`. `kit.services.export` follows the existing public export name. All runtime modules have no third-party or Node dependencies. GLB encoding uses the existing browser-safe exporter.

```js
import { kit } from './src/domains/factory/object/creature/kits/horror-kit/index.js';
const request = {
  seed: 'wrong-floor:12:entity',
  params: { archetype: 'tall-one', distortion: 0.8, stature: 2.7, detail: 24, age: 0.7 }
};
const artifact = kit.services.generate(request);
const report = kit.services.validate(artifact);
const glb = kit.services.export(artifact, 'glb');
```

Artifacts retain `nexusfactory.artifact/1`: positions, normals, indices, UVs, vertex colors, PBR materials, bounds, statistics, provenance, and deterministic hash. Colors are linear RGB multipliers. A Three.js consumer should enable vertex colors and multiply them by `baseColorFactor`, use `roughnessFactor`, `metallicFactor`, `emissiveFactor`, and honor `doubleSided`.

`randomize({ seed, params, groupId, entropy })` respects the manifest's groups and returns normalized parameters plus an artifact. `reroll` preserves parameters and derives an individual seed. Default entropy is the explicit stable string `0`; supply new entropy for new rerolls. Identical input, seed and implementation produce identical output. Blocked source status, invalid enums, empty seeds, nonfinite parameters and unsupported exports are errors. Numeric inputs clamp according to the existing project contract.

## Creature contract

Archetypes: `guest`, `tall-one`, `ceiling-walker`, `porter`, `shadow`, `mannequin`.

- Surfaces use continuous parameterization, cubic swept tissue, deformed facial fields, rib arches, hooked spines, hanging cloth, and torn ribbons.
- No Three.js primitive assembly or external image/model asset is used by the generator.
- Coordinates use meters, +Y up, +Z forward, minimum Y at floor contact.
- `stature` is a scale reference: 2.4 means unit design scale. Actual bounds differ with archetype anatomy and should be measured from artifact bounds.
- `detail` controls sampling between 12 and 40; custom meshes are not guaranteed watertight. Deliberately open cloth, mouth recesses and ribbons require double-sided materials.
- `distortion` controls facial/body deformation and swept-limb perturbation. `age` attenuates vertex coloration.
- Named meshes and `extras.role` / `extras.pivot` expose head, torso, arms, fingers, cloth and ribbons for consumer animation. Pivot coordinates are in artifact space.
- Static GLB exports contain no skeleton, skinning, clips, or gameplay. Runtime animation, threat progression, fairness, and collisions belong to the game.

## Corridor contract

Import `src/domains/factory/object/structure/kits/liminal-kit/index.js`.

Parameters: environment (`office`, `hotel`, `basement`), width 2.8–6 m, height 2.8–5 m, length 8–22 m, distortion and wear 0–1. Default dimensions 3.8 × 3.2 × 14 m.

Entrance is at origin; hallway recedes along -Z. There is no entrance or rear wall. A consumer places its doorway and far-wall dressing. `metadata.dimensions`, `propAnchors`, `lightAnchors`, and `clearance` provide integration coordinates. The protected central corridor is x ±1.2 m, y 0–2.5 m. Distorted walls bow outside this volume; the floor remains planar.

## Distressed surface contract

Import `src/domains/factory/material/procedural/kits/distressed-kit/index.js`.

Parameters: finish (`plaster`, `rust`, `cloth`, `porcelain`, `metal`), wear 0–1, scale 0.2–4, resolution 12–100. Generates a two-meter inspection swatch with PBR material and vertex colors. The exported `createDistressSampler(seed, params)` returns `(x, y) => [r,g,b]` for custom consumer geometry. Its named surface stream varies stains, oscillatory fracture fields, weave and directional scratches. This is a sampled color field, not a normal map or physical material simulation.

## Harness and validation

```bash
node scripts/build-registry.mjs
node --test tests/*.test.mjs
node tools/horror/headless-run.mjs
python -m http.server 8091
# Open http://localhost:8091/tools/horror/ after installing the pinned dev dependency.
```

`tools/horror/factory.manifest.json` maps the service module, interactive preview, automated API entry, technical tests, exports and report. Preview uses the exact registered factory implementation and the pinned local Three.js dependency. `window.horrorHarness.generate(request)`, `.inspect()`, and `.orbit(radians)` support capture automation.

The headless report under ignored `validation/horror/latest` records eight generated examples, repeated creature signatures, validation, GLB/JSON exports, timing and environment. Technical validity checks mesh data, indexed ranges, UV/color lengths, normal lengths, material references and integrity. Tests additionally exercise bounds, all archetypes, group preservation and failure rejection. The report deliberately remains `partial` until real browser captures have been inspected. Technical tests do not establish subjective horror, Steam readiness, or live Studio rendering.

## Licensing and distribution

Authored factory source uses this repository's MIT license. Consumers vendoring source must retain the root LICENSE and exact source revision. No external model or texture license is required for these synthetic outputs. Three.js is a separate consumer/dev dependency with its own MIT license. Registry publication and game integration are verified separately.
