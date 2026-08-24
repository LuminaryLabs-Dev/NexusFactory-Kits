import test from 'node:test';
import assert from 'node:assert/strict';
import { kit } from '../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';

const request={seed:'reef-fish-test-001',params:{quality:'preview',speciesFamily:'oval',tailProfile:'forked',patternType:'bands',palette:'azureGold',eyeProfile:'amber',mouthProfile:'terminal'}};

test('procedural reef fish manifest exposes the standard textured-mesh contract',()=>{
  const manifest=kit.services.describe();
  assert.equal(manifest.id,'factory-object-creature-fish');
  assert.equal(manifest.domainPath,'n:factory:object:creature:aquatic:fish');
  assert.equal(manifest.editor.preview,'mesh-3d');
  assert.deepEqual(manifest.runtime.environments,['node','browser']);
  for(const capability of ['artifact:mesh','artifact:textured-mesh','export:glb','export:json'])assert.ok(manifest.provides.includes(capability));
  for(const service of ['describe','createState','inspectState','runPhase','generate','randomize','reroll','validate','export'])assert.equal(typeof kit.services[service],'function');
});

test('phased generation is inspectable and invalidates downstream outputs',()=>{
  let state=kit.services.createState(request);
  assert.deepEqual(state.completedPhases,['spec']);
  for(const phase of ['anatomy','appendages','face','surface','artifact','validate'])state=kit.services.runPhase(state,phase);
  assert.equal(state.validation.valid,true);
  assert.equal(state.artifact.schemaVersion,'nexusfactory.artifact/1');
  assert.ok(state.artifact.meshes.length>=12);
  state=kit.services.runPhase(state,'face');
  assert.ok(state.outputs.anatomy);
  assert.ok(state.outputs.appendages);
  assert.ok(state.outputs.face);
  assert.equal(state.outputs.surface,undefined);
  assert.equal(state.artifact,null);
  assert.equal(state.validation,null);
});

test('fish exports self-describing GLB and JSON results',()=>{
  const artifact=kit.services.generate(request);
  assert.equal(kit.services.validate(artifact).valid,true);
  const glb=kit.services.export(artifact,'glb');
  assert.equal(glb.schemaVersion,'nexusfactory.export-result/1');
  assert.equal(glb.mimeType,'model/gltf-binary');
  assert.ok(glb.fileName.endsWith('.glb'));
  assert.equal(new DataView(glb.bytes.buffer,glb.bytes.byteOffset,glb.bytes.byteLength).getUint32(0,true),0x46546c67);
  const json=kit.services.export(artifact,'json');
  assert.equal(json.mimeType,'application/json');
  assert.equal(JSON.parse(json.text).deterministicHash,artifact.deterministicHash);
});
