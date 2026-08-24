# Start Here

1. Confirm the repository is `LuminaryLabs-Dev/NexusFactory-Kits`, the intended branch is `main`, and the worktree contains no unexpected changes.
2. Read [repository-profile.md](repository-profile.md) and [memory.md](memory.md).
3. Read [../README.md](../README.md), then route the task below.
4. Recheck current source, registry, tests, and current head before changing behavior.

## Task routing

| Task | Read first | Primary evidence |
| --- | --- | --- |
| Generator behavior | [Generator catalog](../docs/generator-catalog.md) | `src/domains/factory/**/kits/`, relevant tests |
| Public services or artifacts | [Kit contract](../docs/kit-contract.md) | `src/contracts.js`, `src/domain.js`, Kit runtime |
| Domains or registry | [Architecture](../docs/architecture.md), [Development](../docs/development.md) | `src/catalog.js`, registry source and snapshot |
| Testing or completion claims | [Validation](../docs/validation.md), [Known issues](../docs/known-issues.md) | tests, tools, scripts, workflow |
| Studio integration | [Studio handoff](../docs/studio-handoff.md) | Kits registry plus current Studio source |
| Procedural fish work | [Generator catalog](../docs/generator-catalog.md), [Validation](../docs/validation.md) | creature fish core, fish Kit, fish tests, review tools |

Run the complete validation command before reporting repository-wide success. Focused fish tests and image reviews are additional evidence, not a substitute for the registry build and full suite.

Record durable facts in [memory.md](memory.md), material maintenance events in [change-log.md](change-log.md), and human-visible changes in [../CHANGELOG.md](../CHANGELOG.md).
