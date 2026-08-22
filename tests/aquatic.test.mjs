import test from "node:test";
import assert from "node:assert/strict";
import { kit as coral } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { kit as fish } from "../src/domains/factory/texture/kits/fish-kit/index.js";
import { kit as flora } from "../src/domains/factory/texture/kits/aquatic-flora-kit/index.js";
import { kit as reef } from "../src/domains/factory/scene/kits/reef-kit/index.js";
import { kit as aquarium } from "../src/domains/factory/scene/kits/aquarium-kit/index.js";

const pngSig=[137,80,78,71,13,10,26,10];
const kits=[coral,fish,flora,reef,aquarium];

test("aquatic public kits expose valid generic image contracts",()=>{
  for(const kit of kits){const manifest=kit.services.describe();assert.equal(manifest.editor.preview,"image-2d");assert.ok(manifest.provides.includes("artifact:image"));for(const service of ["generate","randomize","reroll","validate","export"])assert.equal(typeof kit.services[service],"function");const a=kit.services.generate({seed:`contract:${manifest.id}`,params:{}}),b=kit.services.generate({seed:`contract:${manifest.id}`,params:{}});assert.equal(a.deterministicHash,b.deterministicHash);assert.equal(kit.services.validate(a).valid,true);const out=kit.services.export(a,"png");assert.equal(out.mimeType,"image/png");assert.deepEqual([...out.bytes.slice(0,8)],pngSig);}
});

test("reef and aquarium expose typed phased generation",()=>{
  for(const kit of [reef,aquarium]){const manifest=kit.services.describe(),phases=manifest.metadata.phaseOrder;assert.deepEqual(phases,["terrain","environment","population","placement","subjects","effects","compose","artifact","validate"]);for(const service of ["createState","inspectState","runPhase"])assert.equal(typeof kit.services[service],"function");let state=kit.services.createState({seed:`phases:${manifest.id}`,params:{}});for(const phase of phases)state=kit.services.runPhase(state,phase);assert.equal(state.validation.valid,true);assert.equal(state.artifact.artifactKind,"image");}
});

test("reef and aquarium have distinct composition semantics",()=>{
  const r=reef.services.generate({seed:"shared-scene",params:{}}),a=aquarium.services.generate({seed:"shared-scene",params:{}});assert.notEqual(r.deterministicHash,a.deterministicHash);assert.equal(r.metadata.composition,"reef");assert.equal(a.metadata.composition,"aquarium");
});

test("aquatic stress validation",()=>{
  for(const [kit,count] of [[coral,50],[fish,50],[flora,50],[reef,100],[aquarium,100]]){for(let i=0;i<count;i++){const seed=`stress:${kit.services.describe().id}:${i}`,artifact=kit.services.generate({seed,params:{}});assert.equal(kit.services.validate(artifact).valid,true,seed);assert.ok(artifact.deterministicHash.startsWith("sha256:"));}}
});
