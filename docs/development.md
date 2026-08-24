# Development

## Environment

- Node.js: `>=20`, declared in `package.json`
- Module system: native ECMAScript modules
- Third-party package dependencies: none declared
- Lockfile: none at the audited baseline
- Build or transpilation stage: none

An install step is not required for the current source tree. Running `npm install` would add local package-manager state without installing declared dependencies.

## Commands

| Command | Effect |
| --- | --- |
| `npm run registry:build` | Runs `scripts/build-registry.mjs` and rewrites `registry.json` from source |
| `npm test` | Runs all `tests/*.test.mjs` through Node's test runner |
| `npm run validate` | Rebuilds the registry, then runs the complete test suite |
| `npm run demo` | Generates and validates the default Ballista and Tree demonstration artifacts in memory |
| `npm run coral:render` | Writes coral and reef PNGs plus `validation/report.json` under `validation/` |

Direct Node commands are also valid:

```bash
node scripts/build-registry.mjs
node --test tests/*.test.mjs
node scripts/demo.mjs
node scripts/render-coral-validation.mjs
```

The current full validation command exits nonzero because of the known aquatic metadata assertion described in [known-issues.md](known-issues.md).

## Safe change flow

1. Identify the owning domain and public kit.
2. Update the implementation and manifest together when behavior or capability changes.
3. Update or add focused tests for the changed contract.
4. Run `node scripts/build-registry.mjs`.
5. Inspect `git diff -- registry.json`; accept only changes caused by source manifests or catalog membership.
6. Run `node --test tests/*.test.mjs` and compare with the documented baseline.
7. Run the relevant demo or render validation.
8. Update documentation, `CHANGELOG.md`, and qualifying `.agent` state files.
9. Inspect the complete path allowlist before committing.

Do not edit `registry.json` directly. `src/catalog.js` selects registered manifests; `createRegistry()` validates identities, parent paths, kit domain paths, and capability providers before producing the snapshot.

## Generated validation output

`scripts/render-coral-validation.mjs` writes:

```text
validation/
├── asset/       # 14 coral PNGs: two seeds for each of seven species
├── reef/        # tropical, dense, deep, and emerald scene PNGs
└── report.json
```

The root currently has no `.gitignore`, so these outputs appear as untracked files. Run this command in a disposable worktree or remove only the generated directory after inspection.

## Continuous integration

`.github/workflows/validate-registry.yml` runs on manual dispatch and pushes to `main` that change:

- `src/**`
- `tests/**`
- `scripts/**`
- `package.json`

The workflow uses Ubuntu and Node 22, runs `npm run validate`, and has `contents: write`. If validation succeeds and the rebuilt registry differs, it commits `registry.json` and pushes directly to `main` as `github-actions[bot]`.

Documentation, `registry.json`, and the workflow file itself are not listed in the push path filter. A documentation-only commit therefore does not automatically exercise this workflow.

## Distribution state

`package.json` defines package exports for `.` and `./registry`, but repository evidence does not show an npm publication workflow, package provenance, release tags, or GitHub releases. Treat the project as source-consumed until a distribution process is verified.
