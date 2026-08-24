# Agent Maintenance Change Log

Record only material changes to repository state, governing documentation, validation state, or durable context.

## 2026-08-24 — Establish repository documentation system

- Change: Added the active agent-operation package and code-grounded human documentation; replaced the minimal README.
- Baseline: `main` at `464d404eadad9e70ecdbf27fca265963226f63b4` before the documentation change.
- Evidence: Repository source, manifests, generated registry, tests, scripts, workflow, Git history, and NexusFactory-Studio integration source at `87a3307251391cb384d63405f1564ca222feb982`.
- Validation: Registry rebuilt without a diff; demos passed; coral validation rendered 14 assets and four scenes; Kits tests reported 23 pass and one known failure; Studio syntax checks and 17 fixture-based tests passed.
- Result: Documentation and agent roles are explicit. Product code and runtime behavior were not changed.
- Follow-up: Reconcile the aquatic composition metadata expectation, then rerun the full validation baseline.
