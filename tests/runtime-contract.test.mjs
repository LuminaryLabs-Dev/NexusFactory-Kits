import test from "node:test";
import assert from "node:assert/strict";
import { kit as ballista } from "../src/domains/factory/object/weapon/kits/ballista-kit/runtime.js";
import { kit as coral } from "../src/domains/factory/texture/kits/coral-kit/runtime.js";

for (const [name, kit, request, format] of [
  ["ballista", ballista, { seed:"runtime-ballista", params:{} }, "glb"],
  ["coral", coral, { seed:"runtime-coral", params:{} }, "png"]
]) {
  test(`${name} exposes the standard Studio runtime contract`, () => {
    for (const service of ["describe","generate","randomize","reroll","validate","export"]) assert.equal(typeof kit.services[service], "function");
    const artifact=kit.services.generate(request);
    assert.equal(kit.services.validate(artifact).valid,true);
    const randomized=kit.services.randomize({...request,groupId:"everything",entropy:"fixed"});
    assert.ok(randomized.artifact);
    assert.ok(randomized.params);
    const rerolled=kit.services.reroll({...request,entropy:"fixed"});
    assert.ok(rerolled.artifact);
    assert.ok(rerolled.params);
    const output=kit.services.export(artifact,format);
    assert.equal(output.schemaVersion,"nexusfactory.export-result/1");
    assert.equal(output.format,format);
    assert.ok(output.fileName.endsWith(`.${format}`));
  });
}
