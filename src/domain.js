import { sha256 } from "./foundation/hash.js";

function list(value) { return Object.freeze([...(value ?? [])]); }

export function defineDomain(config) {
  if (!config?.id || !config?.domainPath) throw new TypeError("Domain requires id and domainPath.");
  if (!/^n:factory(?:$|:)/.test(config.domainPath)) throw new TypeError(`Invalid factory domain path: ${config.domainPath}`);
  const record = {
    kind: "domain",
    id: config.id,
    domainPath: config.domainPath,
    parentDomainPath: config.parentDomainPath ?? null,
    apiName: config.apiName ?? config.id.replaceAll("-", "_"),
    version: config.version ?? "0.1.0",
    stability: config.stability ?? "experimental",
    requires: list(config.requires),
    provides: list(config.provides),
    owns: list(config.owns),
    doesNotOwn: list(config.doesNotOwn),
    services: list(config.services),
    metadata: Object.freeze({ ...(config.metadata ?? {}) })
  };
  return Object.freeze({ ...record, contentFingerprint: sha256(record) });
}

export function defineKit(config) {
  if (!config?.id || !config?.domainPath) throw new TypeError("Kit requires id and domainPath.");
  const manifest = {
    kind: "kit",
    id: config.id,
    displayName: config.displayName ?? config.id,
    version: config.version ?? "0.1.0",
    domainPath: config.domainPath,
    requires: list(config.requires),
    provides: list(config.provides),
    services: list(config.services),
    parameterSchema: Object.freeze((config.parameterSchema ?? []).map((entry) => Object.freeze({ ...entry }))),
    editor: Object.freeze({ preview: config.editor?.preview ?? "none", inspector: config.editor?.inspector ?? "schema", surfaces: list(config.editor?.surfaces) }),
    runtime: Object.freeze({ environments: list(config.runtime?.environments ?? ["node", "browser"]), permissions: list(config.runtime?.permissions) }),
    source: Object.freeze({ module: config.source?.module ?? null, exportName: config.source?.exportName ?? "kit" }),
    metadata: Object.freeze({ ...(config.metadata ?? {}) })
  };
  return Object.freeze({ ...manifest, contentFingerprint: sha256(manifest) });
}
