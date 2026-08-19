import { REGISTRY_SCHEMA } from "../contracts.js";
import { sha256 } from "../foundation/hash.js";

function clone(value) { return structuredClone(value); }

export function createRegistry({ domains = [], kits = [] } = {}) {
  const domainMap = new Map();
  const kitMap = new Map();
  for (const domain of domains) {
    if (domainMap.has(domain.id)) throw new TypeError(`Duplicate domain id: ${domain.id}`);
    if ([...domainMap.values()].some((entry) => entry.domainPath === domain.domainPath)) throw new TypeError(`Duplicate domain path: ${domain.domainPath}`);
    domainMap.set(domain.id, domain);
  }
  for (const domain of domainMap.values()) {
    if (domain.parentDomainPath && ![...domainMap.values()].some((entry) => entry.domainPath === domain.parentDomainPath)) {
      throw new TypeError(`Domain ${domain.id} has missing parent ${domain.parentDomainPath}`);
    }
  }
  for (const kit of kits) {
    if (kitMap.has(kit.id)) throw new TypeError(`Duplicate kit id: ${kit.id}`);
    if (![...domainMap.values()].some((entry) => entry.domainPath === kit.domainPath)) throw new TypeError(`Kit ${kit.id} references unknown domain ${kit.domainPath}`);
    kitMap.set(kit.id, kit);
  }

  const nodes = [...domainMap.values(), ...kitMap.values()];
  const providers = new Map();
  for (const node of nodes) for (const token of node.provides ?? []) providers.set(token, [...(providers.get(token) ?? []), node.id].sort());
  const missing = [];
  const edges = {};
  for (const node of nodes) {
    edges[node.id] = [];
    for (const token of node.requires ?? []) {
      const candidates = providers.get(token) ?? [];
      if (!candidates.length) missing.push({ id: node.id, token });
      else edges[node.id].push(...candidates.filter((id) => id !== node.id));
    }
    edges[node.id] = [...new Set(edges[node.id])].sort();
  }

  const snapshotBase = {
    schemaVersion: REGISTRY_SCHEMA,
    revision: 1,
    domains: [...domainMap.values()].sort((a, b) => a.domainPath.localeCompare(b.domainPath)),
    kits: [...kitMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
    capabilityGraph: {
      providers: Object.fromEntries([...providers.entries()].sort(([a], [b]) => a.localeCompare(b))),
      edges,
      missing,
      valid: missing.length === 0
    }
  };
  const snapshot = Object.freeze({ ...snapshotBase, integrity: sha256(snapshotBase) });

  return Object.freeze({
    getDomain(id) { return clone(domainMap.get(String(id)) ?? null); },
    getKit(id) { return clone(kitMap.get(String(id)) ?? null); },
    listDomains() { return clone(snapshot.domains); },
    listKits() { return clone(snapshot.kits); },
    findProviders(token) { return clone(snapshot.capabilityGraph.providers[String(token)] ?? []); },
    search(query = "") {
      const text = String(query).trim().toLowerCase();
      return clone(snapshot.kits.filter((kit) => !text || [kit.id, kit.displayName, kit.domainPath, ...kit.provides].some((value) => String(value).toLowerCase().includes(text))));
    },
    snapshot() { return clone(snapshot); }
  });
}
