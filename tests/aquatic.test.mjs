import test from "node:test";
import assert from "node:assert/strict";
import { kit as coral } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { kit as fish } from "../src/domains/factory/texture/kits/fish-kit/index.js";
import { kit as flora } from "../src/domains/factory/texture/kits/aquatic-flora-kit/index.js";
import { kit as reef } from "../src/domains/factory/scene/kits/reef-kit/index.js";
import { kit as aquarium } from "../src/domains/factory/scene/kits/aquarium-kit/index.js";
import { surfaceFromImage } from "../src/foundation/raster/surface.js";

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

function alphaJaccard(left,right){const a=surfaceFromImage(left.image).pixels,b=surfaceFromImage(right.image).pixels;let intersection=0,union=0;for(let i=3;i<a.length;i+=4){const av=a[i]>0,bv=b[i]>0;if(av||bv)union++;if(av&&bv)intersection++;}return union?intersection/union:1;}

test("aquatic flora styles have separate design profiles and silhouettes",()=>{
  const styles=["seagrass","kelp","branching","tuft"],artifacts=styles.map(style=>flora.services.generate({seed:"flora-style-proof",params:{style,size:.65,density:.65,sway:.45}}));
  assert.deepEqual(artifacts.map(artifact=>artifact.statistics.style),styles);
  assert.equal(new Set(artifacts.map(artifact=>artifact.statistics.designProfile.silhouette)).size,styles.length);
  for(let i=0;i<artifacts.length;i++)for(let j=i+1;j<artifacts.length;j++)assert.ok(alphaJaccard(artifacts[i],artifacts[j])<.72,`${styles[i]} and ${styles[j]} should separate`);
});

test("aquatic flora size and density controls have measurable responses",()=>{
  for(const style of ["seagrass","kelp","branching","tuft"]){
    const small=flora.services.generate({seed:`flora-response:${style}`,params:{style,size:.15,density:.2,sway:.4}}),large=flora.services.generate({seed:`flora-response:${style}`,params:{style,size:.9,density:.9,sway:.4}});
    assert.ok(large.statistics.bounds.height>small.statistics.bounds.height,`${style} size response`);
    assert.ok(large.statistics.featureCount>small.statistics.featureCount,`${style} density response`);
    assert.equal(flora.services.validate(small).valid,true);
    assert.equal(flora.services.validate(large).valid,true);
  }
});
