# Dependencies and runtime requirements

NexusFactory-Kits separates the **browser-importable generator core** from **Node-only offline asset and review tools**. Do not conflate dependencies used by optional tooling with those required to execute a public Kit in the browser.

## Main package

The root `package.json` declares:

| Item | Requirement | Notes |
| --- | --- | --- |
| Node.js | `>=20` | Test, registry build, demos and offline tools |
| ECMAScript modules | native ESM (`"type": "module"`) | No transpilation stage |
| `three` | `0.180.0` | Root **development dependency** for offline 3D tooling |
| Runtime npm dependencies | None declared | Registered Kit import graphs are designed to be browser-safe |

Use the committed root `package-lock.json` for reproducible Node installations (`npm ci`), then `npm run validate` to regenerate and check `registry.json`.

## Standalone tool packages

The repository also contains separate Node package manifests. These dependencies are **not automatically imported by registered browser Kits**.

| Package | Direct dependencies as committed |
| --- | --- |
| `tools/amethyst-profile-factory/` | `@sparticuz/chromium` 152.0.0, `playwright` 1.58.2, `sharp` 0.34.5, `three` 0.185.1 |
| `tools/triceratops-mesh-editor/` | `@headless-three/renderer` 0.4.0, `sharp` 0.34.3, `three` 0.183.0 |

Both tools have their own lockfiles and install/test commands; see [development](development.md) and the root [README](../README.md). Their different `three` versions reflect separate package manifests, not a single shared runtime version.

## Connected systems and outputs

- [NexusFactory-Studio](https://github.com/LuminaryLabs-Dev/NexusFactory-Studio) consumes the published registry and loads browser-safe Kit modules; it owns the UI, not the generators.
- `src/` owns generation contracts, seeded computation, artifacts, validation, and exporters.
- `scripts/build-registry.mjs` generates `registry.json`. Do **not** edit it by hand.
- Registered Kits export images, JSON, and/or GLB as declared by each Kit.
- `tools/` workflows may require Node, optional native packages, Chromium, and graphical review environments.

`main` is described in existing project docs as the live registry channel. CDN propagation, graphics availability, and third-party service behavior are not proven merely by successful source inspection.
