# Triceratops Mesh Editor

This offline factory tool evaluates a typed `mesh-program/v1` JSON AST. It preserves every accepted edit as an RFC 6902 transaction and exposes the same six operations through the CLI and service module: `describe`, `generate`, `randomize`, `reroll`, `validate`, and `export`.

The implementation is intentionally service-driven and shallow. Each file in `services/` owns one production responsibility; there is no generic helper layer and no direct vertex-buffer editing path.

```text
tools/triceratops-mesh-editor/
├── mesh-editor.mjs             # CLI surface
├── factory-contract.json       # typed operation contract
├── kit.manifest.json           # package identity and boundaries
├── source-model.json           # reference and provenance record
├── services/                   # flat production services
│   ├── factory-service.mjs
│   ├── evaluator-service.mjs
│   ├── transaction-service.mjs
│   ├── state-service.mjs
│   ├── validation-service.mjs
│   ├── render-service.mjs
│   ├── review-service.mjs
│   └── export-service.mjs
├── kit/                        # AST, constraints, and replay log
├── tests/                      # deterministic service contract
├── commands/                   # headless validation and review entrypoints
├── evidence/                   # compact accepted evidence
└── exports/                    # reviewed candidate GLB
```

## Run

```bash
npm install
npm test
npm run validate
npm run clean-room
npm run render
npm run serve
```

The browser editor is served at `http://127.0.0.1:4173/`. Its controls emit JSON Patch transactions; they never mutate geometry buffers directly.

## Current candidate

- Seed: `927239`
- Revision: `45`
- Body: one connected watertight shell
- Attachments: `27`
- Total triangles: `18,614`
- GLB SHA-256: `c20fe58886cf05d5482616dbdf341a08aba44f861acb819ed6a728f0ffe146a9`
- Status: `reviewed-candidate`

The model is technically validated and improved, but it is not reference-identical and has no rig or animation. The 101 MB full guided-review archive is deliberately excluded from Git; the committed files retain the final AST, accepted transaction log, reference comparison, orbit sheet, topology evidence, and deterministic export.
