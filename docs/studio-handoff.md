# NexusFactory-Studio Handoff

NexusFactory-Studio is a generic visual consumer of this repository. The integration is registry-driven and does not use the package export map for live browser loading.

## Ownership

NexusFactory-Kits owns:

- domain and capability meaning;
- parameters, sections, randomization, seeds, and phases;
- geometry, UVs, textures, and materials;
- artifact and validation contracts;
- GLB, PNG, and JSON encoding;
- registry contents and source module locations.

NexusFactory-Studio owns:

- registry loading and module resolution;
- generic controls and section presentation;
- service invocation and stale-request rejection;
- image and textured-mesh preview;
- viewport snapshots;
- export-format selection and downloads;
- recent and favorite presentation state.

Studio must not contain fish-specific conditionals or generation behavior.

## Live loading

Studio defaults to:

```text
https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusFactory-Kits@main/registry.json
```

`RegistryHost` cache-busts registry and module requests, resolves relative source modules against the canonical registry URL, loads the declared export, and checks manifest identity.

## Procedural Reef Fish contract

Manifest:

```text
kit:     factory-object-creature-fish
domain:  n:factory:object:creature:aquatic:fish
preview: mesh-3d
exports: glb, json
```

Studio derives:

- Form, Fins, Face, Pattern, and Surface sections;
- primary and advanced controls;
- Anatomy, Fins, Face, Pattern, Surface, and Everything randomization groups;
- six phase controls in developer mode;
- a 420 ms generation debounce;
- GLB and JSON export choices.

## Textured mesh preview

The generic viewer consumes:

- positions, normals, indices;
- UVs, tangents, and optional colors;
- artifact textures with sRGB or linear interpretation;
- PBR maps and alpha behavior;
- clearcoat, iridescence, and transmission;
- artifact-owned sidedness and render hints.

It uses ACES tone mapping, sRGB output, antialiasing, key/fill/rim lighting, shadows, orbit controls, and generic framing. The same viewer must continue to render older untextured mesh artifacts.

## Export boundary

Studio snapshots its own viewport as PNG. Kit export services return `nexusfactory.export-result/1`. The fish Kit exports the exact generated artifact as an embedded-texture GLB; Studio does not regenerate it.

## Compatibility checks

Before changing a public manifest or artifact field:

- preserve or intentionally migrate schema compatibility;
- keep source modules browser-safe and URL-resolvable;
- keep manifest IDs aligned between registry and module;
- preserve declared services and export-result shapes;
- validate old image and mesh viewers;
- validate Kits and Studio separately;
- perform a live smoke test before claiming deployed end-to-end support.

The 2026-08-25 live smoke test passed all 8 module contracts and all 5 image-Kit browser flows. Ballista, Tree, and Procedural Reef Fish reached validated artifacts and GLB export, but their visual preview remains pending in a WebGL-capable browser.
