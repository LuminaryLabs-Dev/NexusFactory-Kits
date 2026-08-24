# Known Issues and Limits

These items are grounded in the audited `main` baseline. “Open” means the repository does not yet contain evidence of resolution.

## Aquatic composition metadata test fails

- Status: Open defect or contract mismatch
- Evidence: `tests/aquatic.test.mjs`, `src/domains/factory/scene/kits/reef-kit/index.js`, and `aquarium-kit/index.js`
- Observed result: the test expects Reef composition `reef`; the implementation emits `reef-v1`.
- Related risk: Aquarium emits `aquarium-v1`, while the same test expects `aquarium`. The Reef assertion stops execution before the Aquarium assertion is reached.
- Impact: `npm test` and `npm run validate` exit nonzero despite 23 passing tests.
- Resolution evidence: choose the intended public metadata contract, align both implementation and tests, then obtain 24 passing tests.

## Ballista has two public service shapes

- Status: Open contract divergence
- Evidence: `src/index.js`, `src/catalog.js`, `ballista-kit/index.js`, and `ballista-kit/runtime.js`
- Observed result: package-root Ballista lacks `randomize` and returns raw GLB bytes or JSON text; the registry adapter adds `randomize` and returns `nexusfactory.export-result/1`.
- Impact: package importers and registry consumers cannot assume an identical service result shape.
- Resolution evidence: select one canonical surface, route both exports to it, and add parity tests.

## Ballista timeline is not encoded in GLB

- Status: Open limitation
- Evidence: `ballista-kit/index.js` creates six timeline tracks; `src/foundation/glb.js` does not create a glTF `animations` property.
- Impact: validation can confirm timeline metadata, but exported GLB files contain static meshes only.
- Resolution evidence: implement animation channels and samplers, then parse exported GLB and assert the expected clips and tracks.

## Provenance is incomplete

- Status: Open limitation
- Evidence: `src/contracts.js` artifact constructors and `src/domain.js` manifest constructors
- Observed result: artifacts identify kit, domain, seed, parameters, metadata, and deterministic hash, but omit source commit, registry integrity, kit implementation fingerprint, and a dedicated kit version.
- Impact: an artifact cannot independently identify the exact source implementation required for reproduction.
- Resolution evidence: define and test a versioned provenance contract covering source, manifest, registry, and implementation identity.

## Manifest fingerprint does not cover implementation

- Status: Open limitation
- Evidence: `defineKit()` in `src/domain.js`
- Observed result: `contentFingerprint` hashes the normalized manifest object.
- Impact: source behavior can change without a fingerprint change when the manifest remains identical.
- Resolution evidence: generate a build-time implementation fingerprint or explicitly redefine the fingerprint as manifest-only throughout consumers and documentation.

## Render validation output is unignored

- Status: Open repository-hygiene issue
- Evidence: `scripts/render-coral-validation.mjs`; no root `.gitignore` at baseline
- Observed result: `npm run coral:render` creates an untracked `validation/` tree.
- Impact: generated PNGs and reports can be committed accidentally.
- Resolution evidence: establish an explicit output policy and ignore or intentionally track the exact generated paths.

## Runtime environment declarations exceed direct coverage

- Status: Unverified claim
- Evidence: manifests declare `node`, `browser`, and `worker`; repository tests run under Node.
- Impact: browser and worker compatibility may regress without a local failing check.
- Resolution evidence: execute the public kits in supported browser and worker harnesses and record reproducible results.

## Live Studio integration is not end-to-end tested

- Status: Unverified integration
- Evidence: NexusFactory-Studio tests load fixture registries and mock kit modules.
- Impact: CDN availability, module MIME behavior, cross-origin imports, current registry/module compatibility, rendering, and downloads are not covered together.
- Resolution evidence: run the Studio browser against the live `NexusFactory-Kits@main/registry.json` and exercise all seven kits.

## No performance or release gate

- Status: Unverified operational readiness
- Evidence: no benchmarks, performance budgets, package publication workflow, tags, or GitHub releases were present at baseline.
- Impact: generation cost, memory use, compatibility across versions, and package distribution are unknown.
- Resolution evidence: establish measurable benchmarks and an explicit release process; do not infer them from kit version fields.
