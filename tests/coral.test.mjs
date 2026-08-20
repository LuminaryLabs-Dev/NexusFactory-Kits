import test from "node:test";
import assert from "node:assert/strict";
import { manifest, generate, validate, exportArtifact } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { SPECIES } from "../src/domains/factory/texture/kits/coral-kit/presets.js";
import { createArtifact, validateArtifactShape } from "../src/contracts.js";

const assetParams={mode:"asset",species:"staghorn",palette:"pink",size:0.55,density:0.58,asymmetry:0.28,highlight:0.55,reefComplexity:0.62,fishDensity:0.48,waterStyle:"tropical"};
const reefParams={...assetParams,mode:"reef",species:"mixed"};

test("manifest exposes one coral kit with two modes and generic image preview",()=>{
  assert.equal(manifest.id,"factory-texture-coral");
  assert.equal(manifest.editor.preview,"image-2d");
  assert.ok(manifest.provides.includes("artifact:image"));
  assert.ok(manifest.provides.includes("export:png"));
  const mode=manifest.parameterSchema.find((p)=>p.id==="mode");
  assert.deepEqual([...mode.options],["asset","reef"]);
});

test("legacy mesh artifact contract remains valid",()=>{
  const artifact=createArtifact({kitId:"legacy",domainPath:"n:factory:object",seed:"1",params:{},meshes:[{id:"m",positions:[0,0,0,1,0,0,0,1,0],indices:[0,1,2]}],materials:[]});
  assert.equal(validateArtifactShape(artifact).valid,true);
  assert.equal(artifact.artifactKind,undefined);
});

test("asset generation is deterministic",()=>{
  const a=generate({seed:"asset-fixed",params:assetParams}),b=generate({seed:"asset-fixed",params:assetParams});
  assert.equal(a.deterministicHash,b.deterministicHash);
  assert.equal(validate(a).valid,true);
  assert.equal(a.image.width,96);assert.equal(a.image.height,96);assert.equal(a.image.transparent,true);
});

test("all seven species produce valid differentiated silhouettes",()=>{
  const hashes=new Set();
  for(const species of SPECIES){const artifact=generate({seed:`species:${species.id}`,params:{...assetParams,species:species.id}});const result=validate(artifact);assert.equal(result.valid,true,`${species.id}: ${JSON.stringify(result.checks.filter((c)=>!c.pass))}`);hashes.add(artifact.deterministicHash);}
  assert.equal(hashes.size,SPECIES.length);
});

test("shape parameters materially affect output",()=>{
  const base=generate({seed:"shape",params:assetParams});
  const dense=generate({seed:"shape",params:{...assetParams,density:0.95}});
  const asym=generate({seed:"shape",params:{...assetParams,asymmetry:0.95}});
  assert.notEqual(base.image.rgbaBase64,dense.image.rgbaBase64);
  assert.notEqual(base.image.rgbaBase64,asym.image.rgbaBase64);
});


test("species controls alter actual pixel morphology",()=>{
  for(const species of SPECIES){
    const base=generate({seed:`sensitivity:${species.id}`,params:{...assetParams,species:species.id,density:0.25,asymmetry:0.05}});
    const dense=generate({seed:`sensitivity:${species.id}`,params:{...assetParams,species:species.id,density:0.9,asymmetry:0.05}});
    const asym=generate({seed:`sensitivity:${species.id}`,params:{...assetParams,species:species.id,density:0.25,asymmetry:0.9}});
    assert.notEqual(base.image.rgbaBase64,dense.image.rgbaBase64,`${species.id} density must alter pixels`);
    assert.notEqual(base.image.rgbaBase64,asym.image.rgbaBase64,`${species.id} asymmetry must alter pixels`);
  }
});

test("reef mode reuses coral generator and produces valid opaque scene",()=>{
  const reef=generate({seed:"reef-fixed",params:reefParams}),result=validate(reef);
  assert.equal(result.valid,true,JSON.stringify(result.checks.filter((c)=>!c.pass)));
  assert.equal(reef.image.width,128);assert.equal(reef.image.height,128);assert.equal(reef.image.transparent,false);
  assert.ok(reef.statistics.coralCount>=8);assert.ok(reef.statistics.fishCount>=3);
});

test("PNG export is valid and nearest-neighbor scaled",()=>{
  for(const [params,w,h] of [[assetParams,768,768],[reefParams,1024,1024]]){
    const png=exportArtifact(generate({seed:`png:${w}`,params}),"png");
    assert.deepEqual([...png.slice(0,8)],[137,80,78,71,13,10,26,10]);
    const view=new DataView(png.buffer,png.byteOffset,png.byteLength);assert.equal(view.getUint32(16,false),w);assert.equal(view.getUint32(20,false),h);
  }
});

test("stress: 210 deterministic generations stay valid",()=>{
  let count=0;
  for(let i=0;i<30;i++)for(const species of SPECIES){const params=i%5===0?{...assetParams,mode:"reef",species:i%10===0?"mixed":species.id,reefComplexity:(i%11)/10,fishDensity:(i%7)/6}:{...assetParams,species:species.id,size:(i%9)/8,density:(i%8)/7,asymmetry:(i%6)/5,highlight:(i%10)/9};const seed=`stress:${i}:${species.id}`,a=generate({seed,params}),b=generate({seed,params});assert.equal(a.deterministicHash,b.deterministicHash);const result=validate(a);assert.equal(result.valid,true,`${seed}: ${JSON.stringify(result.checks.filter((c)=>!c.pass))}`);count++;}
  assert.equal(count,210);
});
