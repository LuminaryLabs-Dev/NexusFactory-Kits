# Start Here

1. Confirm the repository is `LuminaryLabs-Dev/NexusFactory-Kits`, the intended branch is `main`, and the worktree contains no unexpected changes.
2. Read [repository-profile.md](repository-profile.md) and [memory.md](memory.md).
3. Read [../README.md](../README.md), then route the task below.
4. Recheck current source and tests; the documentation audit commit is a baseline, not permission to assume the head is unchanged.

## Task routing

| Task | Read first | Primary evidence |
| --- | --- | --- |
| Generator behavior | [Generator catalog](../docs/generator-catalog.md) | `src/domains/factory/**/kits/`, relevant tests |
| Public services or artifacts | [Kit contract](../docs/kit-contract.md) | `src/contracts.js`, `src/domain.js`, kit runtime |
| Domains or registry | [Architecture](../docs/architecture.md), [Development](../docs/development.md) | `src/catalog.js`, `src/registry/registry.js`, `registry.json` |
| Testing or completion claims | [Validation](../docs/validation.md), [Known issues](../docs/known-issues.md) | `tests/`, scripts, workflow |
| Studio integration | [Studio handoff](../docs/studio-handoff.md) | Kits registry plus current NexusFactory-Studio source |
| Documentation maintenance | [README](../README.md), related topic document | Current implementation and history |

The audited Kits test baseline is not green: 23 of 24 tests pass. Read the validation and known-issues documents before changing behavior or reporting completion.

Record durable facts in [memory.md](memory.md), qualifying maintenance events in [change-log.md](change-log.md), and human-visible project changes in [../CHANGELOG.md](../CHANGELOG.md).
