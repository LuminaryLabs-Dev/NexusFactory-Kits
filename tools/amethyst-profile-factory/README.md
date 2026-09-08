# Amethyst profile factory

Standalone `.mjs` factory in NexusFactory-Kits. This tool is not registered in the Studio public catalog. Synthetic procedural specimens, not scans or a scientific growth simulation.

## Three layers

1. `src/catalogue.mjs`: rock identity, compatible specimen families, profile categories, weights, bounds, units and provenance. Every required recipe parameter is explicit. Numeric ranges are authored artistic controls.
2. `src/resolver.mjs`: chooses categories, applies categorical overrides, resolves dependent ranges, samples numbers, applies numeric overrides and then calculates dependent dimensions. Invalid or incompatible overrides throw; they are never silently clamped.
3. `src/geometry.mjs`: constructs actual geometry from the resolved parameters through five distinct recipes. `src/factory.mjs` is the shared service used by both the interactive and headless paths.

Profiles: raw compact cluster, curved geode fragment, sawn geode half, loose crystal, tumbled piece. Other catalogue ideas such as scepters, cathedral displays and carved ornaments are future recipes, not implemented labels.

## Run

Requires Node 22+ and compatible Linux Chromium libraries for automated rendering.

```sh
npm ci
npm test
npm start
```

Open localhost port 4173. The UI exposes category choices, numeric locks, seeds, a selective shape reroll, the resolved profile, settings download and GLB download. Geometry generation also works directly in Node without a browser.

```js
import {generate, randomize, reroll, balancedBatch} from './src/factory.mjs';
const specimen = randomize({profile:'raw-compact-cluster', seed:1042,
  overrides:{size:4, exposedHeightToWidth:1.1}});
const result = generate({specimen});
// Add result.group to a Three.js scene.
const changed = reroll({specimen, groups:['shape'], seed:77});
const batch = balancedBatch({count:10, seed:20260908});
```

Named streams isolate profile choices, parameter sampling, rock geometry, placement, crystal shape and color. Selective reroll preserves unrelated stream seeds and locks. Changing categories can legitimately change dependent numeric ranges. Save full resolved settings AND source/version; a seed alone is insufficient. Replaying a resolved object validates it against the current catalogue and rejects drift.

## Capture

```sh
node scripts/headless-run.mjs raw-compact-cluster evidence/new-preview 10
node scripts/batch.mjs
```

The exact local source is served on localhost and rendered by Chromium WebGL2 using SwiftShader. The browser package is pinned through package-lock.json and expanded inside runtime/. No system packages are installed. The standard Playwright CDN failed in this environment; the npm-distributed Chromium package was used instead. No native Vulkan or image-generation substitute is claimed.

## Validation boundaries

Technical checks cover finite triangle positions and normals, degenerate triangles, welded two-use edges, duplicate faces, winding, component signed volume, floor contact, deterministic geometry, invalid inputs, blocked sources, bounds and dependencies. Host plus crystals are intentionally separate components, not Boolean-unioned. Footprint spacing and buried roots are conservative placement controls, not exhaustive self-intersection proof. GLB exports use meters, converted from generator centimeters.

Realism is judged against the user's visible criteria and qualitative museum/GIA references. The source model separates those observations from artistic range choices. Exact mineral identities in the original reference photo remain unknown; the dark/brown/pale treatment is an appearance recipe.

## Recovery and provenance

The prior `Amethyst-Raw-Cluster-Review.zip` was recovered and inspected. It provided a raw-only generator, parameters and native capture script. The new implementation reuses its named-stream approach, surface-sampled root idea and clipped crystal geometry approach, while replacing the flat raw-only construction with the three-layer API and five recipes. The recovered source remains untouched outside this deliverable folder.

GIA: https://www.gia.edu/gems-gemology/spring-2015-amethyst-from-boudi-morocco

Smithsonian: https://naturalhistory.si.edu/explore/collections/geogallery/10026017

No third-party reference photographs or copied articles are bundled. Final images are generated from the included Three.js source.

## Reviewed evidence

`reviewed/final-v1/gallery.html` contains the ten-specimen, thirty-view review set with resolved settings. Reports in `reviewed/` record the original sandbox validation. Regenerate GLBs and previews with `npm run batch`; fresh outputs go to ignored `evidence/`. Dependencies and Chromium binaries are installed locally, not committed.
