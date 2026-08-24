import test from 'node:test';
import assert from 'node:assert/strict';
import { kit } from '../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';

function parseJson(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);assert.equal(view.getUint32(8,true),bytes.byteLength);const length=view.getUint32(12,true);return JSON.parse(new TextDecoder().decode(bytes.slice(20,20+length)).trim());}

test('fish GLB embeds attributes, PNG textures, hierarchy and physical material extensions',()=>{
  const artifact=kit.services.generate({seed:'glb-textured-fish',params:{quality:'preview'}}),output=kit.services.export(artifact,'glb'),gltf=parseJson(output.bytes);
  assert.ok(gltf.meshes.length>=12);
  assert.ok(gltf.images.length>=5);
  assert.equal(gltf.images.every((image)=>image.mimeType==='image/png'&&image.bufferView!==undefined),true);
  assert.ok(gltf.images.some((image)=>image.extras?.colorSpace==='srgb'));
  assert.ok(gltf.meshes.every((mesh)=>mesh.primitives.every((primitive)=>primitive.attributes.NORMAL!==undefined&&primitive.attributes.TEXCOORD_0!==undefined&&primitive.attributes.TANGENT!==undefined)));
  assert.ok(gltf.materials.some((material)=>material.pbrMetallicRoughness?.baseColorTexture));
  assert.ok(gltf.materials.some((material)=>material.normalTexture));
  assert.ok(gltf.materials.some((material)=>material.extensions?.KHR_materials_clearcoat));
  assert.ok(gltf.extensionsUsed.includes('KHR_materials_iridescence'));
  assert.ok(gltf.extensionsUsed.includes('KHR_materials_transmission'));
  const root=gltf.nodes[gltf.scenes[0].nodes[0]];
  assert.equal(root.name,'Artifact_Root');
  assert.equal(root.children.length,gltf.meshes.length);
});
