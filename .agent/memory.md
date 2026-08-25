# Durable Memory

## Current facts

- NexusFactory-Kits owns generator meaning, manifests, deterministic inputs, artifacts, validation, exports, and the generated registry.
- NexusFactory-Studio is the linked generic browser host and loads Kit modules from the registry.
- `main` is the live registry channel consumed through jsDelivr.
- `registry.json` is generated and must not be edited manually.
- The public catalog includes a raster Fish Kit and a separate Procedural Reef Fish textured-mesh Kit.
- `factory-object-creature-fish` uses domain `n:factory:object:creature:aquatic:fish` and capability `aquatic:fish:mesh`.
- The 3D fish runs anatomy, appendages, face, surface, artifact, and validation phases.
- Public fish runtime modules are browser-safe; filesystem and review output remain under Node-only tools.
- Mesh artifacts can optionally carry UVs, tangents, colors, embedded textures, and extended PBR materials while retaining `nexusfactory.artifact/1` compatibility.
- GLB export supports embedded PBR textures, alpha behavior, clearcoat, iridescence, and transmission.
- Reef and Aquarium composition metadata use `reef` and `aquarium`.
- The generated registry currently contains 45 domains and 8 public Kits.
- Complete repository validation currently passes 33/33 tests.
- A 2026-08-25 live-CDN run imported and exercised all 8 Kits sequentially from the generated registry.
- Live Studio browser checks fully exercised all 5 image Kits; the 3 mesh Kits generated, validated, randomized, rerolled, and exported, but cloud-browser mesh preview remained blocked by unavailable WebGL.
- `validation/` is ignored generated output.
- Ballista timeline tracks are still not encoded as glTF animations.
- Artifact provenance still omits exact source commit, registry integrity, and implementation fingerprint.

## Locked constraints

- Keep the raster Fish Generator and 3D fish Kit semantically separate.
- Keep Studio generic; do not add fish-specific UI or rendering fallbacks.
- Do not claim worker, WebGL mesh-preview, performance, publication, or production support without direct evidence.
- Do not commit generated `validation/` output without explicit authorization.
- Do not describe Ballista GLB output as animated.

## Handoff state

The Procedural Reef Fish integration includes a browser-safe core, phased Kit runtime, textured artifact contract, embedded-texture GLB export, focused tests, Node tools, and seven accepted image-review loops. Complete Kits validation, registry synchronization, live CDN imports, image previews, browser actions, and exports are proven. The next operational proof is a WebGL-capable browser pass for the three mesh previews.
