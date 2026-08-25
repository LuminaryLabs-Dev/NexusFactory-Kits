# Agent Instructions

These instructions apply to `LuminaryLabs-Dev/NexusFactory-Kits`. The default and live registry branch is `main`.

## Read before changing anything

1. Verify the repository, branch, current head, and worktree state.
2. Read [.agent/start-here.md](.agent/start-here.md), [.agent/repository-profile.md](.agent/repository-profile.md), and [.agent/memory.md](.agent/memory.md).
3. Read [README.md](README.md), then the documents relevant to the task.
4. Inspect the implementation, manifests, tests, and history that support the intended change.

## Sources of truth

Use this order when evidence disagrees:

1. Source implementation and kit manifests.
2. `src/catalog.js` and the generated `registry.json`.
3. Tests, scripts, and workflows.
4. Human documentation.
5. `.agent/memory.md`.

Record contradictions; do not silently choose the most convenient claim.

## Change boundaries

- Keep work inside the explicitly authorized paths and task scope.
- Do not change public services, artifact schemas, manifest capabilities, or registry semantics without explicit authorization.
- Never edit `registry.json` manually. Change source manifests and run `node scripts/build-registry.mjs`.
- Treat `validation/` as generated output. Do not commit it unless a future task explicitly establishes it as a tracked artifact.
- Do not claim browser, worker, Studio, visual, performance, publication, release, or production support without direct evidence.
- Preserve the zero-failure test baseline. Do not hide, skip, or relabel a failing check as passing.
- Do not create branches, commits, pull requests, releases, deployments, tracker updates, or other external writes without explicit authorization.

## Validation routing

- Documentation-only: validate Markdown paths, links, commands, claim evidence, and the allowlisted diff.
- Manifest, domain, registry, source, script, or test changes: run `node scripts/build-registry.mjs`, confirm the registry diff is intended, then run `node --test tests/*.test.mjs`.
- Ballista or Tree changes: also run `node scripts/demo.mjs`.
- Coral or aquatic-render changes: run `node scripts/render-coral-validation.mjs` in a disposable worktree and inspect its report and outputs.
- Studio contract changes: validate the linked NexusFactory-Studio repository separately; its fixture tests are not live cross-repository coverage.

The current reproducible baseline is recorded in [docs/validation.md](docs/validation.md).

## Stop conditions

Stop and report when:

- repository identity, target branch, source access, or scope is ambiguous;
- the head changed after the task was grounded;
- unrelated worktree changes cannot be isolated;
- a public behavior or compatibility claim lacks implementation evidence;
- validation produces failures beyond the recorded baseline;
- required credentials, runtime, network access, or ownership evidence is unavailable.

## State files

- Update `.agent/repository-profile.md` only when repository identity, lifecycle, maintenance scope, authoritative paths, profile, or pattern revision changes.
- Update `.agent/memory.md` only for durable current facts, constraints, or handoff state.
- Update `.agent/change-log.md` only for material repository, governing-documentation, validation-state, or durable-context changes.
- Update `CHANGELOG.md` for human-visible project changes, not routine agent activity.
