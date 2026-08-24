# Validation

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

NexusFactory-Studio was separately upgraded on `main` to consume generic textured mesh attributes and PBR materials. Its local syntax and fixture tests were run before that change was pushed. The live deployed registry/CDN/browser path still requires a separate post-propagation smoke test before it is described as end-to-end verified.

## What current checks prove

- deterministic generator behavior in the tested implementation;
- valid artifact structure and subject-specific rules;
- GLB framing, mesh attributes, embedded textures, and declared extensions;
- close source/reload visual parity in the deterministic review renderer;
- bounded visual diversity across twenty representative fish;
- generic Studio contract support in source and fixture tests.

## What current checks do not prove

- swimming animation or skinned deformation;
- Little Reef game integration;
- every possible procedural combination;
- worker execution;
- deployed CDN timing or cross-origin behavior;
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
