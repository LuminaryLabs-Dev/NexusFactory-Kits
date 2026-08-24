# Generator Catalog

The generated registry exposes eight independently callable kits. They are deterministic for the same implementation, seed, and normalized parameters.

## Procedural Reef Fish

- Kit: `factory-object-creature-fish`, version `0.1.0`
- Domain: `n:factory:object:creature:aquatic:fish`
- Source: `src/domains/factory/object/creature/aquatic/kits/fish-kit/`
- Output: textured 3D mesh artifact
- Export: embedded-texture GLB or JSON
- Phases: `anatomy → appendages → face → surface → artifact → validate`
- Preview: `mesh-3d`

Primary controls:

| Parameter | Values/default |
| --- | --- |
| `speciesFamily` | oval, torpedo, disc, boxy; default oval |
| `size` | `0–1`, default `0.5` |
| `tailProfile` | forked, fan, rounded; default forked |
| `eyeProfile` | amber, dark; default amber |
| `mouthProfile` | terminal, upturned, nibbler, beak; default terminal |
| `patternType` | bands, spots, mottled, saddles; default bands |
| `palette` | bounded named biological palettes; default azureGold |

Advanced controls cover body proportions, belly and snout form, tail and eye scale, pattern strength, wet clearcoat, iridescence, fin transmission, surface variation, and preview/high quality.

The generator builds anatomical body regions, curved fins and rays, layered eyes and cornea, mouth and gill detail, procedural UV textures, and PBR materials. It does not generate animation, genetics, breeding, AI, or aquarium behavior.

## Raster Fish Generator

- Kit: `factory-texture-fish`, version `0.1.0`
- Domain: `n:factory:texture:subject:fish`
- Output: transparent 64×64 RGBA8 pixel-art image
- Export: PNG or JSON

This remains the lightweight raster subject used by Reef and Aquarium. It is not replaced by the 3D fish kit.

## Procedural Broadleaf Tree

- Kit: `factory-object-foliage-tree`, version `0.2.0`
- Output: wood and foliage mesh artifact
- Export: GLB or JSON
- Phases: `growth → bezier → wood → foliage → artifact → validate`

## Windup Ballista Turret

- Kit: `factory-object-weapon-ballista`, version `0.1.0`
- Output: mesh artifact with timeline metadata
- Export: GLB or JSON

Timeline tracks remain metadata; current GLB export does not encode animations.

## Coral Generator

- Kit: `factory-texture-coral`, version `0.2.0`
- Output: transparent 96×96 RGBA8 image
- Export: PNG or JSON

## Aquatic Flora Generator

- Kit: `factory-texture-aquatic-flora`, version `0.1.0`
- Output: transparent 64×64 RGBA8 image
- Export: PNG or JSON

## Reef Generator

- Kit: `factory-scene-aquatic-reef`, version `0.1.0`
- Output: opaque 128×128 open-water reef scene
- Export: PNG or JSON
- Phases: terrain, environment, population, placement, subjects, effects, compose, artifact, validate
- Composition metadata: `reef`

## Aquarium Generator

- Kit: `factory-scene-aquatic-aquarium`, version `0.1.0`
- Output: opaque 128×128 framed aquarium scene
- Export: PNG or JSON
- Phases: same nine aquatic phases
- Composition metadata: `aquarium`

## Example

```js
import { creatureFishKit } from "./src/index.js";

const request = {
  seed: "catalog-fish-001",
  params: { speciesFamily: "disc", tailProfile: "fan", patternType: "spots" }
};

const artifact = creatureFishKit.services.generate(request);
const report = creatureFishKit.services.validate(artifact);
if (!report.valid) throw new Error("Generated artifact is invalid");
const output = creatureFishKit.services.export(artifact, "glb");
```
