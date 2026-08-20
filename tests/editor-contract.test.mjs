import test from "node:test";
import assert from "node:assert/strict";
import { defineKit } from "../src/domain.js";

test("factory kits infer a scalable editor contract", () => {
  const manifest = defineKit({
    id: "factory-object-weapon-example",
    displayName: "Example Weapon",
    domainPath: "n:factory:object:weapon",
    parameterSchema: [
      { id: "scale", type: "number", minimum: 0.5, maximum: 2, default: 1 },
      { id: "detailCount", type: "integer", minimum: 1, maximum: 8, default: 3 },
      { id: "wear", type: "number", minimum: 0, maximum: 1, default: 0.2 }
    ]
  });
  assert.equal(manifest.editor.category, "Weapons");
  assert.deepEqual(manifest.editor.primary, ["scale", "wear"]);
  assert.deepEqual(manifest.editor.advanced, ["detailCount"]);
  assert.ok(manifest.editor.randomizationGroups.some((group) => group.id === "everything" && group.rerollSeed));
  assert.ok(manifest.editor.randomizationGroups.some((group) => group.id === "materials" && group.parameters.includes("wear")));
});

test("explicit editor levels reject unknown and duplicate controls", () => {
  assert.throws(() => defineKit({ id: "bad", domainPath: "n:factory", parameterSchema: [{ id: "scale" }], editor: { primary: ["missing"] } }), /unknown control/);
  assert.throws(() => defineKit({ id: "dup", domainPath: "n:factory", parameterSchema: [{ id: "scale" }], editor: { primary: ["scale"], advanced: ["scale"] } }), /assigned more than once/);
});
