# Validation

## Audited baseline

- Repository: `LuminaryLabs-Dev/NexusFactory-Kits`
- Branch: `main`
- Source commit before documentation: `464d404eadad9e70ecdbf27fca265963226f63b4`
- Validation runtime: Node `v24.19.0`
- Source access: complete
- Validation date: 2026-08-24

## Results

| Check | Result | What it proves |
| --- | --- | --- |
| `npm run validate` | Failed after registry build; 23/24 tests passed | Registry generation works; one test contract remains inconsistent |
| `node scripts/build-registry.mjs` | Passed; no registry diff | Current `registry.json` matches `src/catalog.js` and manifests |
| Registry snapshot | 42 domains, seven kits, valid graph, no missing providers | Registered hierarchy and declared capability dependencies resolve |
| `node scripts/demo.mjs` | Passed | Default Ballista and Tree artifacts generate and pass their validators |
| `node scripts/render-coral-validation.mjs` | Passed | Fourteen coral assets and four reef scenes render and produce a report |
| Studio syntax checks | Passed | Inspected Studio JavaScript parses under Node |
| Studio tests | 17/17 passed | Fixture-based generic host, model, and viewer contracts pass |

The registry integrity produced during validation was:

```text
sha256:a0e255b52b7afb47c1c77701bd22983419027bfa6c8f145aa1ff8d53dffdd93b
```

## Test-suite result

The complete Kits suite ran 24 tests:

```text
pass: 23
fail: 1
cancelled: 0
skipped: 0
todo: 0
```

The failure is `reef and aquarium have distinct composition semantics` in `tests/aquatic.test.mjs`. The first failing assertion is:

```text
actual:   reef-v1
expected: reef
```

`src/domains/factory/scene/kits/reef-kit/index.js` deliberately sets policy ID `reef-v1`; the equivalent Aquarium policy is `aquarium-v1` while the test expects `aquarium`. This documentation does not decide whether implementation or test is authoritative.

## Test coverage by file

| Test | Covered behavior |
| --- | --- |
| `tests/aquatic.test.mjs` | Generic image services, phased Reef/Aquarium state, composition semantics, 350 total stress generations across five aquatic kits |
| `tests/ballista.test.mjs` | Determinism, recognizable structure, seed/mechanism variation, GLB container framing |
| `tests/coral.test.mjs` | Determinism, seven differentiated species, validation, PNG signature |
| `tests/editor-contract.test.mjs` | Inferred editor contract and explicit-control validation |
| `tests/hash.test.mjs` | SHA-256 reference vector |
| `tests/registry.test.mjs` | Domain hierarchy, capability graph, registry integrity |
| `tests/runtime-contract.test.mjs` | Standard Ballista and Coral registry runtime services and export results |
| `tests/tree.test.mjs` | Determinism, typed phases, prerequisites, partial reruns, normals, variation, GLB export |

## Demo observations

`node scripts/demo.mjs` generated:

- Ballista: 21 meshes, 660 triangles, six timeline tracks, valid.
- Tree: two meshes, 3,969 triangles, no timeline tracks, valid.

These counts are observations for the script's fixed requests, not universal output sizes.

## Coral-render observations

The renderer produced:

- two 96×96 samples for each of seven coral species;
- four 128×128 reef scenes: tropical, dense, deep, and emerald;
- `validation/report.json` with hashes and raster statistics.

The output was generated locally for inspection and is not part of the committed documentation package.

## Studio validation

NexusFactory-Studio was inspected at `87a3307251391cb384d63405f1564ca222feb982`. Its configured syntax checks passed and all 17 tests passed under Node 24.19.0.

Studio tests use local fixtures and mock kit modules. They verify generic hosting behavior but not the live CDN path or current Kits implementations in a browser.

## Unsupported completion claims

Current checks do not prove:

- subjective visual quality;
- browser or worker execution of every kit;
- deployed Studio access to the live registry;
- live cross-origin dynamic imports;
- exported-file playback in third-party applications;
- Ballista GLB animation, because no animation is encoded;
- performance, memory, concurrency, or stress budgets outside the test loops;
- npm publication or release compatibility;
- production stability.

## Reproduction

From a clean checkout with Node 20 or newer:

```bash
npm run validate
npm run demo
npm run coral:render
```

Expect `npm run validate` to exit nonzero with the documented aquatic assertion until that contract mismatch is resolved. Run coral rendering in a disposable worktree because it creates an untracked `validation/` directory.
