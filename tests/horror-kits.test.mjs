import test from 'node:test';
import assert from 'node:assert/strict';
import { kit as horror, ARCHETYPES } from '../src/domains/factory/object/creature/kits/horror-kit/index.js';
import { kit as liminal } from '../src/domains/factory/object/structure/kits/liminal-kit/index.js';
import { kit as distressed } from '../src/domains/factory/material/procedural/kits/distressed-kit/index.js';
import { sha256 } from '../src/foundation/hash.js';
for(const kit of [horror,liminal,distressed]){
 test(`${kit.manifest.id}: six services, deterministic generation, bounded variation and immutable GLB`,()=>{
  for(const name of ['describe','generate','randomize','reroll','validate','export'])assert.equal(typeof kit.services[name],'function');
  const a=kit.services.generate({seed:'horror-fixed'}),b=kit.services.generate({seed:'horror-fixed'});
  assert.equal(a.deterministicHash,b.deterministicHash);assert.ok(kit.services.validate(a).valid);
  assert.notEqual(a.deterministicHash,kit.services.generate({seed:'horror-other'}).deterministicHash);
  const e=kit.services.export(a,'glb');assert.equal(new DataView(e.bytes.buffer).getUint32(0,true),0x46546c67);
  assert.equal(sha256(Array.from(e.bytes)),sha256(Array.from(kit.services.export(a,'glb').bytes)));
  assert.equal(JSON.parse(kit.services.export(a,'json').text).deterministicHash,a.deterministicHash);
  const rr=kit.services.reroll({seed:a.seed,params:a.params,entropy:5});assert.deepEqual(rr.params,a.params);assert.notEqual(rr.seed,a.seed);
  const varied=kit.services.randomize({seed:a.seed,params:a.params,entropy:5});assert.ok(kit.services.validate(varied.artifact).valid);
  assert.deepEqual(varied.params,kit.services.randomize({seed:a.seed,params:a.params,entropy:5}).params);
  const group=kit.manifest.editor.randomizationGroups.find(g=>g.id!=='everything');if(group){const x=kit.services.randomize({seed:a.seed,params:a.params,groupId:group.id,entropy:3});for(const key of Object.keys(a.params))if(!group.parameters.includes(key))assert.equal(x.params[key],a.params[key]);}
  const corrupt=structuredClone(a);corrupt.meshes[0].indices[0]=1e9;assert.equal(kit.services.validate(corrupt).valid,false);assert.throws(()=>kit.services.export(corrupt,'glb'));
  assert.throws(()=>kit.services.generate({seed:' '}));assert.throws(()=>kit.services.generate({sourceStatus:'blocked'}));assert.throws(()=>kit.services.randomize({groupId:'missing'}));assert.throws(()=>kit.services.export(a,'obj'));
 });
}
test('horror grammar produces six distinct sculpted silhouettes with floor contact and face roles',()=>{
 const hashes=new Set();
 for(const archetype of ARCHETYPES){const a=horror.services.generate({seed:'review-03',params:{archetype,detail:16}});hashes.add(a.deterministicHash);assert.ok(horror.services.validate(a).valid);assert.ok(Math.abs(a.bounds.min[1])<1e-6);assert.ok(a.statistics.triangleCount>4000);assert.ok(a.meshes.every(m=>m.uvs.length===m.positions.length/3*2&&m.colors.length===m.positions.length));assert.ok(a.meshes.some(m=>['head','cloth','ribbon'].includes(m.extras.role)));assert.equal(a.metadata.synthetic,true);}
 assert.equal(hashes.size,6);
 assert.throws(()=>horror.services.generate({params:{archetype:'zombie'}}));assert.throws(()=>horror.services.generate({params:{distortion:NaN}}));
});
test('corridor environments share entrance coordinates and preserve declared clearance',()=>{
 for(const environment of ['office','hotel','basement']){const a=liminal.services.generate({seed:'hall',params:{environment,distortion:1}});assert.deepEqual(a.metadata.entrance,[0,0,0]);assert.equal(a.metadata.forward,'-Z');assert.ok(a.meshes.find(m=>m.id==='floor'));assert.ok(a.metadata.propAnchors.length>=4);for(const m of a.meshes.filter(m=>m.id.startsWith('wall')))for(let i=0;i<m.positions.length;i+=3)assert.ok(Math.abs(m.positions[i])>1.2);}
});
