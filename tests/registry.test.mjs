import test from "node:test";
import assert from "node:assert/strict";
import { createRegistry } from "../src/registry/registry.js";
import { domains, kits } from "../src/catalog.js";

test("registry resolves domain hierarchy and all capability dependencies", () => {
  const registry = createRegistry({ domains, kits });
  const snapshot = registry.snapshot();
  assert.equal(snapshot.capabilityGraph.valid, true);
  assert.equal(snapshot.capabilityGraph.missing.length, 0);
  assert.ok(snapshot.domains.some((domain) => domain.domainPath === "n:factory:object:weapon"));
  assert.ok(snapshot.domains.some((domain) => domain.domainPath === "n:factory:object:foliage"));
  assert.deepEqual(registry.findProviders("factory:object:weapon"), ["factory-object-weapon-domain"]);
  assert.equal(registry.getKit("factory-object-weapon-ballista").editor.preview, "mesh-3d");
});
