# Validation

## Complete repository and live-channel validation — 2026-08-25

At `ef56843def052d55b0685e96b8e9d29c114e6477`:

```text
npm run validate
tests:   33 passed, 0 failed
domains: 45
kits:    8
registry integrity: sha256:376af9547304ce640243435008db7a816277a9dd8cfea83151e8b2802e71f658
```

NexusFactory-Studio then fetched the live jsDelivr registry and downloaded each Kit's entry module and relative dependency graph into an isolated temporary ESM tree. All 8 Kits passed module import, manifest identity, deterministic repeat generation, randomize, reroll, validation, declared phases, and export.

Live browser behavior was split by renderer capability:

- all 5 image Kits passed generation, preview, randomize, reroll, validation, and PNG export;
- ten distinct image variations were captured with passing artifact reports;
- all 3 mesh Kits generated and validated, changed controls during randomize and reroll, and completed GLB export;
- the cloud browser returned `Error creating WebGL context.`, so its Three.js mesh-preview stage is blocked rather than passed.

The machine-readable module report, browser report, and ten images live in `NexusFactory-Studio/validation/live-registry/`.

## Integration validation — 2026-08-24

The Procedural Reef Fish integration was validated in a sandbox before the source change was prepared for `main`.

### Focused source tests

```text
node --test tests/*.test.mjs
pass: 9
fail: 0
```

The focused workspace covered:

- manifest and service contract;
- deterministic and seed-sensitive generation;
- all four body families;
- phased generation and downstream invalidation;
- group randomization and seed reroll;
- textured artifact normalization;
- browser-safe import graph;
- embedded-texture GLB structure and material extensions.

The repository CI remains the authority for the complete pre-existing suite because `npm run validate` requires the complete checkout and generated registry.

### Review pipeline

The accepted review run used seed `integration-review-001` with preview quality and generated:

- 44 meshes;
- 8,220 vertices;
- 14,256 triangles;
- 10 materials;
- 9 textures;
- approximately 3.8 MB GLB.

All seven automated and visual loops passed:

1. render correctness;
2. anatomy and silhouette;
3. appendages and face;
4. materials and texture response;
5. GLB export and reload;
6. twenty-fish procedural variety;
7. final acceptance.

Source-versus-reloaded image comparison measured:

```text
mean absolute difference: 0.00006696428571428572
RMS difference:          0.008183170883849714
maximum channel delta:   1
```

Generated evidence remains ignored under `validation/`.

### Resolved aquatic baseline mismatch

Reef composition metadata now uses `reef` and Aquarium uses `aquarium`, matching the existing contract test. This removes the previously documented `reef-v1`/`aquarium-v1` mismatch.

## Studio validation boundary

NexusFactory-Studio consumes the live registry and all public module graphs successfully. Image preview and browser action coverage is direct. Complete end-to-end browser verification still requires a WebGL-capable environment for Ballista, Tree, and Procedural Reef Fish pixels.

## What current checks prove

- deterministic generator behavior in the tested implementation;
- valid artifact structure and subject-specific rules;
- GLB framing, mesh attributes, embedded textures, and declared extensions;
- close source/reload visual parity in the deterministic review renderer;
- bounded visual diversity across twenty representative fish;
- generic Studio contract support in source and fixture tests;
- live CDN availability, URL-resolvable relative imports, and all 8 public runtime contracts;
- complete browser behavior for the 5 image Kits.

## What current checks do not prove

- swimming animation or skinned deformation;
- Little Reef game integration;
- every possible procedural combination;
- worker execution;
- WebGL browser preview for the 3 mesh Kits;
- long-running CDN availability or propagation guarantees beyond the observed run;
- production performance and memory budgets;
- third-party DCC compatibility beyond encoded glTF structure;
- npm publication or release compatibility.

## Reproduction

```bash
npm run validate
npm run demo
npm run coral:render
npm run fish:review -- --seed integration-review-001
```

In the NexusFactory-Studio checkout, run its local validation script and its `validate:live-registry` package script. Pass `--report validation/live-registry/module-report.json` to refresh the retained module evidence.
