import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtifact, validateArtifactShape } from '../src/contracts.js';
import { sha256 } from '../src/foundation/hash.js';

const pixels=Uint8Array.from([255,128,32,255]);
const rgbaBase64=Buffer.from(pixels).toString('base64');

test('artifact/1 preserves optional textured-mesh fields without breaking old fields',()=>{
  const artifact=createArtifact({
    kitId:'test-textured-mesh',domainPath:'n:factory:object',seed:'one',params:{quality:'preview'},
    meshes:[{id:'triangle',positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],uvs:[0,0,1,0,0,1],tangents:[1,0,0,1,1,0,0,1,1,0,0,1],colors:[1,1,1,1,1,1,1,1,1],indices:[0,1,2],material:'skin'}],
    materials:{skin:{baseColorFactor:[1,1,1,1],baseColorTexture:'albedo',metallicFactor:0,roughnessFactor:.5}},
    textures:{albedo:{width:1,height:1,pixelFormat:'rgba8',rgbaBase64,colorSpace:'srgb'}},
  });
  assert.deepEqual(artifact.meshes[0].uvs,[0,0,1,0,0,1]);
  assert.equal(artifact.textures.albedo.contentHash,sha256(rgbaBase64));
  assert.equal(artifact.statistics.vertexCount,3);
  assert.equal(artifact.statistics.triangleCount,1);
  assert.equal(artifact.statistics.textureCount,1);
  assert.equal(artifact.statistics.textureBytes,4);
  assert.equal(validateArtifactShape(artifact).valid,true);
});
