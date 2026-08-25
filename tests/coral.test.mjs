import test from "node:test";
import assert from "node:assert/strict";
import { manifest, generate, validate, exportArtifact } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { SPECIES } from "../src/domains/factory/texture/subject/coral/index.js";
import { surfaceFromImage } from "../src/foundation/raster/surface.js";

const params={species:"staghorn",palette:"pink",size:0.55,density:0.58,asymmetry:0.28,highlight:0.55};

function normalizedSilhouette(artifact, resolution=20){
  const surface=surfaceFromImage(artifact.image),bounds=artifact.statistics.bounds,profile=[];
  for(let row=0;row<resolution;row++)for(let column=0;column<resolution;column++){
    const x=Math.round(bounds.x+(column+0.5)/resolution*(bounds.width-1));
    const y=Math.round(bounds.y+(row+0.5)/resolution*(bounds.height-1));
    profile.push(surface.pixels[(y*surface.width+x)*4+3]>0?1:0);
  }
  return profile;
}

function silhouetteDistance(a,b){
  const left=normalizedSilhouette(a),right=normalizedSilhouette(b);
  return left.reduce((total,value,index)=>total+Math.abs(value-right[index]),0)/left.length;
}

test("coral is a standalone deterministic image generator",()=>{
  assert.equal(manifest.id,"factory-texture-coral");
  assert.equal(manifest.version,"0.3.0");
  assert.equal(manifest.domainPath,"n:factory:texture:subject:coral");
  assert.equal(manifest.editor.preview,"image-2d");
  assert.equal(manifest.parameterSchema.some(p=>p.id==="mode"),false);
  const a=generate({seed:"coral-fixed",params}),b=generate({seed:"coral-fixed",params});
  assert.equal(a.deterministicHash,b.deterministicHash);
  assert.equal(validate(a).valid,true);
  assert.equal(a.image.width,96); assert.equal(a.image.height,96); assert.equal(a.image.transparent,true);
});

test("all coral species have measurably distinct visual identities",()=>{
  const artifacts=SPECIES.map(species=>[species,generate({seed:"visual-identity",params:{...params,size:0.58,density:0.62,asymmetry:0.32,highlight:0.62,species:species.id}})]);
  assert.equal(new Set(SPECIES.map(species=>species.designProfile)).size,SPECIES.length);
  for(const [species,artifact] of artifacts){
    assert.equal(validate(artifact).valid,true,species.id);
    assert.equal(artifact.metadata.designProfile,species.designProfile);
    assert.equal(artifact.metadata.generator,"coral-morphology-v3");
    assert.ok(artifact.statistics.morphologyFeatureCount>=4,species.id);
    assert.ok(artifact.statistics.morphologyShadowPixels>4,species.id);
    assert.ok(artifact.statistics.morphologyHighlightPixels>2,species.id);
  }
  for(let left=0;left<artifacts.length;left++)for(let right=left+1;right<artifacts.length;right++){
    const distance=silhouetteDistance(artifacts[left][1],artifacts[right][1]);
    assert.ok(distance>=0.23,`${artifacts[left][0].id}/${artifacts[right][0].id}: ${distance.toFixed(3)}`);
  }

  const byId=Object.fromEntries(artifacts.map(([species,artifact])=>[species.id,artifact.statistics]));
  assert.ok(byId.staghorn.morphologyTipCount>=20&&byId.staghorn.silhouetteFill<0.58);
  assert.ok(byId.elkhorn.silhouetteAspect>1.2&&byId.elkhorn.morphologyTipCount>=8);
  assert.ok(byId.brain.silhouetteAspect>1.35&&byId.brain.silhouetteFill>0.7&&byId.brain.morphologyTipCount===0);
  assert.ok(byId.pillar.silhouetteAspect<1.1&&byId.pillar.silhouetteFill>0.55);
  assert.ok(byId.lettuce.silhouetteAspect>1.05&&byId.lettuce.silhouetteFill<0.58&&byId.lettuce.morphologyTipCount===0);
  assert.ok(byId["sea-fan"].silhouetteFill<0.3&&byId["sea-fan"].morphologyFeatureCount>35);
  assert.ok(byId["sea-rod"].silhouetteFill>0.45&&byId["sea-rod"].morphologyTipCount>=8);
});

test("size and density change every species without erasing its identity",()=>{
  for(const species of SPECIES){
    const common={species:species.id,palette:"pink",asymmetry:0.2,highlight:0.5};
    const sparse=generate({seed:"parameter-response",params:{...common,size:0.25,density:0.15}});
    const dense=generate({seed:"parameter-response",params:{...common,size:0.25,density:0.9}});
    const large=generate({seed:"parameter-response",params:{...common,size:0.9,density:0.15}});
    assert.ok(dense.statistics.morphologyFeatureCount>sparse.statistics.morphologyFeatureCount,`${species.id}: density`);
    assert.ok(large.statistics.occupiedPixels>sparse.statistics.occupiedPixels,`${species.id}: size occupancy`);
    assert.ok(large.statistics.bounds.width>=sparse.statistics.bounds.width,`${species.id}: size width`);
    assert.ok(large.statistics.bounds.height>=sparse.statistics.bounds.height,`${species.id}: size height`);
    assert.equal(validate(sparse).valid,true,`${species.id}: sparse`);
    assert.equal(validate(dense).valid,true,`${species.id}: dense`);
    assert.equal(validate(large).valid,true,`${species.id}: large`);
  }
});

test("species identity survives a representative seed sweep",()=>{
  for(const species of SPECIES)for(let index=0;index<8;index++){
    const artifact=generate({seed:`sweep:${species.id}:${index}`,params:{...params,species:species.id,asymmetry:index/7}});
    assert.equal(validate(artifact).valid,true,`${species.id}:${index}`);
    assert.equal(artifact.metadata.designProfile,species.designProfile);
  }
});

test("coral PNG export is valid",()=>{
  const out=exportArtifact(generate({seed:"coral-png",params}),"png");
  assert.equal(out.schemaVersion,"nexusfactory.export-result/1");
  assert.equal(out.mimeType,"image/png");
  assert.deepEqual([...out.bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
});
