# Development

## Environment

- Node.js `>=20`
- Native ECMAScript modules
- No declared third-party runtime dependencies
- No build or transpilation stage

## Commands

| Command | Effect |
| --- | --- |
| `npm run registry:build` | Regenerates `registry.json` from source |
| `npm test` | Runs all Node tests |
| `npm run validate` | Rebuilds the registry and runs the complete suite |
| `npm run demo` | Generates and validates Ballista and Tree demos |
| `npm run coral:render` | Generates three reviewed variations for each coral species plus four reef scenes |
| `npm run fish:generate` | Generates one fish artifact, GLB, and validation report |
| `npm run fish:validate` | Validates a generated fish artifact |
| `npm run fish:inspect` | Inspects exported GLB structure |
| `npm run fish:batch` | Generates a representative fish batch |
| `npm run fish:review` | Runs seven image-review loops |

## Safe change flow

1. Identify the owning domain and Kit.
2. Update implementation, manifest, tests, and documentation together.
3. Keep registered runtime modules browser-safe.
4. Run focused syntax and tests.
5. Run `node scripts/build-registry.mjs`.
6. Inspect the generated registry diff.
7. Run `node --test tests/*.test.mjs`.
8. Run relevant demo or visual validation.
9. Inspect the complete change allowlist before committing.

Do not edit `registry.json` manually.

## Fish architecture

The registered runtime lives under:

```text
src/domains/factory/object/creature/aquatic/
├── fish/                 # browser-safe reusable generation core
└── kits/fish-kit/        # manifest and standard Kit runtime
```

Node-only review tooling lives under:

```text
tools/fish/
```

The tools import the same core; duplicated generator implementations are prohibited.

## Fish review output

`npm run fish:review` writes under:

```text
validation/fish/<run>/
├── artifact.json
├── fish.glb
├── validation.json
├── previews/
├── reviews/
└── variants/
```

`validation/` is ignored and must not be committed unless a future task explicitly changes that policy.

## Required fish validation

Before registration or release-channel claims:

- deterministic and seed-sensitive generation;
- phase prerequisites and invalidation;
- finite geometry, UVs, tangents, textures, and material references;
- GLB structure and embedded textures;
- browser-safe public imports;
- source-versus-reloaded render comparison;
- at least twenty representative variants;
- seven image-review loops with explicit pass/fail records.

## Continuous integration

`.github/workflows/validate-registry.yml` runs `npm run validate` for source, test, script, and package changes. If successful and `registry.json` differs, the workflow commits the generated snapshot to `main`.

## Distribution

The package export map exposes source and registry entry points, but no npm publication or tagged release process is currently verified. Treat the project as source-consumed.
