import test from "node:test";
import assert from "node:assert/strict";
import { manifest, generate, validate, exportArtifact } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { SPECIES } from "../src/domains/factory/texture/subject/coral/index.js";

const params={species:"staghorn",palette:"pink",size:0.55,density:0.58,asymmetry:0.28,highlight:0.55};

test("coral is a standalone deterministic image generator",()=>{
  assert.equal(manifest.id,"factory-texture-coral");
  assert.equal(manifest.domainPath,"n:factory:texture:subject:coral");
  assert.equal(manifest.editor.preview,"image-2d");
  assert.equal(manifest.parameterSchema.some(p=>p.id==="mode"),false);
  const a=generate({seed:"coral-fixed",params}),b=generate({seed:"coral-fixed",params});
  assert.equal(a.deterministicHash,b.deterministicHash);
  assert.equal(validate(a).valid,true);
  assert.equal(a.image.width,96); assert.equal(a.image.height,96); assert.equal(a.image.transparent,true);
});

test("all coral species remain differentiated and valid",()=>{
  const hashes=new Set();
  for(const species of SPECIES){const a=generate({seed:`species:${species.id}`,params:{...params,species:species.id}});assert.equal(validate(a).valid,true);hashes.add(a.deterministicHash);}
  assert.equal(hashes.size,SPECIES.length);
});

test("coral PNG export is valid",()=>{
  const out=exportArtifact(generate({seed:"coral-png",params}),"png");
  assert.equal(out.schemaVersion,"nexusfactory.export-result/1");
  assert.equal(out.mimeType,"image/png");
  assert.deepEqual([...out.bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
});
