# Repository Profile

| Field | Value |
| --- | --- |
| Repository | `LuminaryLabs-Dev/NexusFactory-Kits` |
| Canonical source | `https://github.com/LuminaryLabs-Dev/NexusFactory-Kits` |
| Default branch | `main` |
| Documentation audit baseline | `464d404eadad9e70ecdbf27fca265963226f63b4` |
| Visibility | Public |
| Ownership | Luminary Labs organization |
| Fork state | Not a fork |
| Archive state | Not archived |
| Repository class | Active JavaScript procedural-generator platform/library |
| Lifecycle | Active, experimental |
| Profile ID | `active-agent-operated-v1` |
| Pattern set | `luminary-repository-documentation-patterns` |
| Pattern revision | `2` |
| Pattern authority | Explicit user approval for this repository |
| Required headings | None |
| Source access at baseline | Complete |

The profile was explicitly approved for this repository. It does not establish a company-wide rule for other Luminary repositories.

## Maintenance scope

This repository owns:

- factory domain and capability declarations;
- public kit manifests and generator implementations;
- deterministic randomization and hashing helpers;
- mesh, raster, artifact, generation-state, validation, and export contracts;
- generated registry construction;
- repository tests, demos, validation scripts, workflow, and documentation.

NexusFactory-Studio is a linked consumer. It owns registry loading, generic service invocation, UI controls, previews, snapshots, and download interaction. It does not own generator-specific behavior.

## Derived and generated paths

- `registry.json` is generated from `src/catalog.js` through `scripts/build-registry.mjs`.
- `validation/` is created by `scripts/render-coral-validation.mjs` and was untracked at the audit baseline.

## Authoritative documentation paths

```text
README.md
AGENTS.md
CHANGELOG.md
.agent/repository-profile.md
.agent/start-here.md
.agent/memory.md
.agent/change-log.md
docs/architecture.md
docs/development.md
docs/generator-catalog.md
docs/kit-contract.md
docs/known-issues.md
docs/studio-handoff.md
docs/validation.md
```

Reserved root filenames use exact uppercase casing. Files below `docs/` and `.agent/` use lower-kebab-case names.

## Update conditions

Update this profile when repository identity, ownership, lifecycle, maintenance scope, profile ID, pattern revision, authoritative paths, or generated-path classification changes. Do not update it for routine commits.
