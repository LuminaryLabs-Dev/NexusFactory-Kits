# NexusFactory-Studio Handoff

NexusFactory-Studio is a thin visual consumer of this repository. The integration is registry-driven and does not use the package export map for live browser loading.

## Ownership

NexusFactory-Kits owns:

- domain meaning and capability declarations;
- parameter and randomization policy;
- seed behavior and generation phases;
- geometry and raster construction;
- artifact and validation contracts;
- artifact export encoding;
- registry contents and kit module locations.

NexusFactory-Studio owns:

- loading and validating a registry snapshot;
- deriving generic controls from manifests;
- invoking kit services;
- selecting mesh or image viewers;
- phase inspection UI;
- viewport snapshots;
- export download interaction;
- recent and favorite presentation state.

Studio must not add generator-specific fallbacks. Its `RuntimeHost` rejects missing services.

## Live loading sequence

Studio's `src/app.js` defaults to:

```text
https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusFactory-Kits@main/registry.json
```

The implemented sequence is:

1. `RegistryHost.load()` appends a unique `load` query and fetches with `cache: "no-store"`.
2. `loadSnapshot()` requires schema `nexusfactory.registry/1`, domain and kit arrays, a valid capability graph, and a registered domain for every kit.
3. `resolveModuleUrl()` resolves the manifest's relative `source.module` against the canonical registry URL.
4. It adds the manifest `contentFingerprint` as `v` and a load nonce as `load`.
5. `loadKit()` dynamically imports the module and selects `source.exportName` or the default export.
6. It requires a `services` object and rejects a manifest ID mismatch.
7. `RuntimeHost` invokes the requested generic service.

Because `main` is embedded in the URL, changes to Kits `main` become the live channel after CDN propagation and cache-busting. There is no verified compatibility pin or release channel.

## Current registry contract

At the audited baseline the registry provides:

- schema `nexusfactory.registry/1`;
- revision `1`;
- 42 domains;
- seven kits;
- a valid capability graph with no missing providers;
- integrity `sha256:a0e255b52b7afb47c1c77701bd22983419027bfa6c8f145aa1ff8d53dffdd93b`.

Studio uses each manifest's services, parameters, editor metadata, preview type, export capabilities, phases, and source location. The package `exports` field is relevant to package consumers but is not the live Studio path.

## Preview and export boundary

Studio currently supports:

- `mesh-3d` through its Three.js viewer;
- `image-2d` through a canvas viewer with nearest-neighbor behavior.

Studio snapshots the rendered viewport as PNG. Kits separately return artifact exports such as GLB, PNG, or JSON. Studio requires Kit exports to use `nexusfactory.export-result/1`; this is why the registry routes Ballista through `ballista-kit/runtime.js` rather than its package-root implementation.

## Verified consumer evidence

NexusFactory-Studio `main` was inspected at `87a3307251391cb384d63405f1564ca222feb982`.

The following passed under Node 24.19.0:

- syntax checks for the application, host, contract, and viewer modules;
- 17 Studio tests covering control values, editor models, catalog behavior, generic aquatic manifests, registry validation and URL resolution, RuntimeHost delegation, preview contracts, image decoding, viewer reuse, snapshots, and viewer switching.

These tests use fixture registries and mock modules. They do not prove that a deployed browser can fetch the live CDN registry, import every live kit, render every artifact, or download every export.

## Compatibility expectations

Before changing a manifest or public service:

- preserve or explicitly migrate schema versions;
- keep `source.module` resolvable relative to the registry URL;
- keep `source.exportName` valid;
- keep registry and module manifest IDs aligned;
- return declared services and export-result shapes;
- update the registry and validate Studio separately;
- add a live integration check before claiming end-to-end support.
