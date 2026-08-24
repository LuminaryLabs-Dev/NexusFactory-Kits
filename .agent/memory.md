# Durable Memory

## Current facts

- NexusFactory-Kits owns procedural generator meaning, manifests, deterministic inputs, artifacts, validation, exports, and the generated registry.
- NexusFactory-Studio is the linked generic browser host. It loads the registry and kit modules rather than implementing generator-specific fallbacks.
- `main` is the live registry channel consumed by Studio through jsDelivr.
- `registry.json` is generated; edit source manifests and rebuild it instead of editing the snapshot directly.
- The audited registry contains 42 domains, seven public kits, a valid capability graph, and no missing capability providers.
- Domains describe semantic ownership and capabilities. A registered domain does not, by itself, prove a complete independently usable generator.
- Tree generation uses six phases. Reef and Aquarium use nine phases.
- The package-root Ballista export points to `ballista-kit/index.js`; the generated registry points to `ballista-kit/runtime.js`. The adapter adds `randomize` and self-describing export results.
- Ballista artifacts include six timeline tracks across Wind, Fire, and Reload clips, but `src/foundation/glb.js` does not serialize glTF animations.
- Artifact hashes cover the artifact object. Manifest `contentFingerprint` values cover manifests, not generator implementation or full generated content provenance.
- Artifacts do not currently include source commit, registry integrity, kit implementation fingerprint, or a dedicated kit-version field.
- The audited Node 24.19.0 baseline is 23 passing tests and one failing aquatic metadata assertion.
- No verified npm publication, tagged release, browser/worker execution check, performance gate, or live Studio browser end-to-end test exists.

## Locked documentation constraints

- Separate verified behavior, reasonable inference, unsupported claims, and unknowns.
- Do not report `npm run validate` as passing until the aquatic failure is resolved and validation is rerun.
- Do not describe Ballista GLB output as animated.
- Do not describe runtime environment declarations as tested platform support.
- Do not describe package exports as Studio's live consumption path.
- Do not commit generated `validation/` output without explicit authorization.

## Handoff state

The repository documentation and agent-operation package was established from the `464d404eadad9e70ecdbf27fca265963226f63b4` source baseline. The smallest justified rehabilitation action is to reconcile the Reef/Aquarium composition metadata contract with its test before claiming full validation success.

## Excluded from memory

Do not add routine activity, raw command logs, speculative features, full project history, or human release notes here. Use `.agent/change-log.md`, `CHANGELOG.md`, or the relevant human document.
