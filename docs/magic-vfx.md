# Magic VFX Kit

The registered `factory-vfx-magic-effect` Kit produces deterministic, transparent, animated pixel-art magic effects from one formation engine. It is a single Kit with ten elemental profiles, not ten unrelated generator implementations.

## Ownership

`n:factory:vfx` owns effect formation and motion. The existing image artifact schema `nexusfactory.artifact/1` is retained, with an animation descriptor in `metadata.animation` (`nexusfactory.sprite-atlas/1`). Studio owns only the generic viewer and download interface. This module does not modify integrated NexusFactory, NexusEngine, or any publishing system.

## Profiles and formation controls

Elements: arcane, fire, frost, lightning, nature, poison, holy, shadow, cosmic, earth.

Formations: aura, bolt, burst, eruption, nova, orb, pillar, portal, rain, rune, shield, sigil, spiral, trail, volley, vortex.

A one-shot samples a deterministic effect timeline with an intentional exit. Ten sustained formations also support periodic loops: aura, orb, pillar, portal, rain, rune, shield, sigil, spiral, vortex. Frames are 32×32 RGBA with nearest-neighbor sampling and a protected two-pixel boundary. Elemental profiles have different graphical motifs and motion modifiers; this does not establish commercial art approval.

## Quick start

```js
import { magicEffectKit } from './src/index.js';

const artifact = magicEffectKit.services.generate({
  seed: 'fire-sigil-001',
  params: { element: 'fire', formation: 'sigil', mode: 'one-shot', frameCount: 24, fps: 12 }
});
const report = magicEffectKit.services.validate(artifact);
if (!report.valid) throw new Error('Invalid Magic VFX output');
const png = magicEffectKit.services.export(artifact, 'png');
const atlas = magicEffectKit.services.export(artifact, 'atlas');
const data = magicEffectKit.services.export(artifact, 'json');
```

- `png`: actual 32px-per-frame horizontal RGBA strip.
- `atlas`: 1024×1024 RGBA PNG, frames packed in row-major 32×32 slots.
- `json`: immutable image artifact, normalized parameters, animation metadata and seed/hash.
- `randomize` and `reroll` reuse the standard Kit service contract.

The offline builder is a Node-only authoring tool; it is not part of the browser import graph:

```bash
npm run validate
node scripts/generate-magic-packs.mjs ./validation/magic-vfx-packs release-seed
```

The builder produces ten folders with separate 24-frame one-shots, 16-frame sustained loops, individual 32×32 PNGs, grouped 1024×1024 atlases, and manifests. It produces 160 one-shot sequences, 100 loop sequences and 5,440 native 32px frames.

## Quality and release boundary

Structural checks cover identity, bounds, distinct frames, one-shot ending, deterministic replay, format and 160/100 profile coverage. Playback, visual appeal, accessibility, in-game use and user acceptance must be checked separately. Repo CI does not prove a game integration or commercial marketability. Do not market these outputs as a finished premium art pack without human acceptance and tested licensing.

Use NexusFactory-Studio for generic `sprite-2d` playback; Studio never implements element-specific generation rules.
