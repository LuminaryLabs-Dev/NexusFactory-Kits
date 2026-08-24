# Generator Catalog

The generated registry exposes seven independently callable kits. All are deterministic for the same implementation, seed, and normalized parameters. All seven kit manifests declare Node, browser, and worker environments; only Node execution is directly validated in this repository.

## Windup Ballista Turret

- Kit: `factory-object-weapon-ballista`, version `0.1.0`
- Domain: `n:factory:object:weapon`
- Source: `src/domains/factory/object/weapon/kits/ballista-kit/index.js`
- Registry runtime: `src/domains/factory/object/weapon/kits/ballista-kit/runtime.js`
- Output: mesh artifact with materials and six timeline tracks
- Export: GLB or JSON
- Default demo result: 21 meshes, 660 triangles, six timeline tracks

| Parameter | Range/default |
| --- | --- |
| `scale` | `0.85–1.2`, default `1` |
| `mechanismCount` | `2–6`, default `3` |
| `wear` | `0–0.8`, default `0.2` |
| `armSpan` | `2.4–4.6`, default `3.4` |
| `railLength` | `2.8–5.2`, default `3.8` |

Validation checks the artifact shape, required recognizable parts, silhouette bounds, and at least three animation clip IDs. Tests cover determinism, seed/mechanism variation, structural identity, GLB 2.0 framing, and the registry runtime adapter.

Limitation: package-root and registry runtime services differ. The artifact timeline is not encoded as glTF animation.

## Procedural Broadleaf Tree

- Kit: `factory-object-foliage-tree`, version `0.2.0`
- Domain: `n:factory:object:foliage:tree`
- Source: `src/domains/factory/object/foliage/kits/tree-kit/`
- Output: `wood-structure` and `foliage-pods` mesh submeshes with normals
- Export: GLB or JSON
- Phases: `growth → bezier → wood → foliage → artifact → validate`
- Default demo result: two meshes and 3,969 triangles

| Parameter | Range/default |
| --- | --- |
| `maturity` | `0.2–0.95`, default `0.65` |
| `gravityPull` | `0–1`, default `0.28` |
| `upwardGrowth` | `0.25–1`, default `0.72` |
| `branchSeparation` | `0–1`, default `0.6` |
| `branchSpread` | `0.2–1`, default `0.62` |
| `branchDensity` | `0.2–1`, default `0.58` |
| `leaderDominance` | `0–1`, default `0.48` |
| `foliageDensity` | `0.35–1`, default `0.72` |

Tests cover deterministic and seed-sensitive generation, typed phases, prerequisite enforcement, preserved upstream state, partial foliage reruns, Kit-owned normals, randomization versus reroll, and GLB normals.

## Coral Generator

- Kit: `factory-texture-coral`, version `0.2.0`
- Domain: `n:factory:texture:subject:coral`
- Source: `src/domains/factory/texture/kits/coral-kit/`
- Output: transparent 96×96 RGBA8 image
- Export: PNG scaled 8× with nearest sampling, or JSON
- Species: staghorn, elkhorn, brain, pillar, lettuce, sea-fan, sea-rod
- Palettes: gold, pink, purple, green, orange, bleached

Numeric controls are `size`, `density`, `asymmetry`, and `highlight`, each from `0–1`. Validation checks dimensions, transparency, occupied-pixel bounds, and connected components. Tests cover deterministic generation, species differentiation, validation, and PNG signatures.

## Fish Generator

- Kit: `factory-texture-fish`, version `0.1.0`
- Domain: `n:factory:texture:subject:fish`
- Source: `src/domains/factory/texture/kits/fish-kit/index.js`
- Output: transparent 64×64 RGBA8 image
- Export: PNG scaled 8× with nearest sampling, or JSON

| Parameter | Options/default |
| --- | --- |
| `bodyShape` | streamlined, round, long; default streamlined |
| `size` | `0–1`, default `0.55` |
| `palette` | reef, gold, blue, pink; default reef |
| `direction` | left or right; default right |
| `finStyle` | short, fan, fork; default short |
| `detail` | `0–1`, default `0.55` |

Validation checks dimensions, transparency, and occupied-pixel bounds. Coverage is shared through aquatic public-contract and 50-seed stress tests rather than a dedicated fish test file.

## Aquatic Flora Generator

- Kit: `factory-texture-aquatic-flora`, version `0.1.0`
- Domain: `n:factory:texture:subject:aquatic-flora`
- Source: `src/domains/factory/texture/kits/aquatic-flora-kit/index.js`
- Output: transparent 64×64 RGBA8 image
- Export: PNG scaled 8× with nearest sampling, or JSON

| Parameter | Options/default |
| --- | --- |
| `style` | seagrass, kelp, branching, tuft; default seagrass |
| `palette` | green, gold, red; default green |
| `size` | `0–1`, default `0.55` |
| `density` | `0–1`, default `0.6` |
| `sway` | `0–1`, default `0.4` |

Validation checks dimensions, transparency, and occupied-pixel bounds. Coverage is shared through aquatic public-contract and 50-seed stress tests.

## Reef Generator

- Kit: `factory-scene-aquatic-reef`, version `0.1.0`
- Domain: `n:factory:scene:aquatic:reef`
- Source: `src/domains/factory/scene/kits/reef-kit/index.js`
- Output: opaque 128×128 RGBA8 open-water reef scene
- Export: PNG scaled 8× with nearest sampling, or JSON
- Phases: terrain, environment, population, placement, subjects, effects, compose, artifact, validate

Parameters combine Coral controls with `reefComplexity`, `fishDensity`, and `waterStyle` (`tropical`, `deep`, or `emerald`). `species` also supports `mixed`. Validation checks dimensions, opacity, positive coral count, and at least three fish.

The implementation records `metadata.composition: "reef-v1"`. A current test expects `"reef"`, producing the repository's one known test failure.

## Aquarium Generator

- Kit: `factory-scene-aquatic-aquarium`, version `0.1.0`
- Domain: `n:factory:scene:aquatic:aquarium`
- Source: `src/domains/factory/scene/kits/aquarium-kit/index.js`
- Output: opaque 128×128 RGBA8 framed aquarium scene
- Export: PNG scaled 8× with nearest sampling, or JSON
- Phases: the same nine typed phases as Reef

Aquarium adds `decorDensity` and `substrateDepth` to the shared aquatic controls and uses aquarium-specific layer, terrain, rock, flora, color, and border policies. It records `metadata.composition: "aquarium-v1"`.

Validation checks the same structural scene conditions as Reef. Its direct composition assertion appears after the currently failing Reef assertion, so the expected `"aquarium"` versus actual `"aquarium-v1"` mismatch is not reached in that test run.

## Generic example

```js
import { coralKit } from "./src/index.js";

const request = {
  seed: "coral-example-001",
  params: { species: "brain", palette: "purple", size: 0.6 }
};

const artifact = coralKit.services.generate(request);
const report = coralKit.services.validate(artifact);
if (!report.valid) throw new Error("Generated artifact is invalid");
const output = coralKit.services.export(artifact, "png");
```
