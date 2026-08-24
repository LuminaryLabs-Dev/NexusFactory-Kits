import fs from 'node:fs';
import crypto from 'node:crypto';
import { decodePng } from './png.mjs';
import { modelBounds } from '../../../src/domains/factory/object/creature/aquatic/fish/geometry.js';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function typedArray(componentType, buffer, byteOffset, count) {
  if (componentType === 5126) return new Float32Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
  if (componentType === 5125) return new Uint32Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
  if (componentType === 5123) return new Uint16Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
  if (componentType === 5121) return new Uint8Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
  throw new Error(`Unsupported accessor component type ${componentType}`);
}
function components(type) { return {SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[type]; }

export function parseGlb(input) {
  const buffer = Buffer.isBuffer(input) || input instanceof Uint8Array ? Buffer.from(input) : fs.readFileSync(input);
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('Not a GLB file.');
  if (buffer.readUInt32LE(4) !== 2) throw new Error(`Unsupported GLB version ${buffer.readUInt32LE(4)}.`);
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB length mismatch.');
  let offset=12,json,binary;
  while(offset+8<=buffer.length){const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4),data=buffer.subarray(offset+8,offset+8+length);if(type===JSON_CHUNK)json=JSON.parse(data.toString('utf8').trim());else if(type===BIN_CHUNK)binary=data;offset+=8+length;}
  if(!json||!binary)throw new Error('GLB is missing JSON or BIN chunk.');
  const getAccessor=(index)=>{const accessor=json.accessors[index],view=json.bufferViews[accessor.bufferView],count=accessor.count*components(accessor.type),byteOffset=(view.byteOffset??0)+(accessor.byteOffset??0);return Array.from(typedArray(accessor.componentType,binary,byteOffset,count));};
  const textureNames=new Map(),textures={};
  (json.textures??[]).forEach((entry,index)=>{const image=json.images[entry.source],view=json.bufferViews[image.bufferView],bytes=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),decoded=decodePng(bytes),name=entry.name??image.name??`texture-${index}`;textures[name]={...decoded,colorSpace:image.extras?.colorSpace??'linear'};textureNames.set(index,name);});
  const materials={};
  (json.materials??[]).forEach((material,index)=>{const pbr=material.pbrMetallicRoughness??{},clearcoat=material.extensions?.KHR_materials_clearcoat,iridescence=material.extensions?.KHR_materials_iridescence,transmission=material.extensions?.KHR_materials_transmission,name=material.name??`material-${index}`;materials[name]={name,kind:material.extras?.kind??'generic',baseColorFactor:pbr.baseColorFactor??[1,1,1,1],baseColorTexture:pbr.baseColorTexture?textureNames.get(pbr.baseColorTexture.index):undefined,metallicRoughnessTexture:pbr.metallicRoughnessTexture?textureNames.get(pbr.metallicRoughnessTexture.index):undefined,normalTexture:material.normalTexture?textureNames.get(material.normalTexture.index):undefined,normalScale:material.normalTexture?.scale??1,occlusionTexture:material.occlusionTexture?textureNames.get(material.occlusionTexture.index):undefined,occlusionStrength:material.occlusionTexture?.strength??1,emissiveTexture:material.emissiveTexture?textureNames.get(material.emissiveTexture.index):undefined,emissiveFactor:material.emissiveFactor??[0,0,0],metallicFactor:pbr.metallicFactor??0,roughnessFactor:pbr.roughnessFactor??1,alphaMode:material.alphaMode??'OPAQUE',alphaCutoff:material.alphaCutoff??0.5,doubleSided:Boolean(material.doubleSided),clearcoat:clearcoat?.clearcoatFactor??0,clearcoatRoughness:clearcoat?.clearcoatRoughnessFactor??0.16,iridescence:iridescence?.iridescenceFactor??0,transmission:transmission?.transmissionFactor??material.extras?.customTransmission??0,subsurface:material.extras?.subsurface??0,thickness:material.extras?.thickness??0,ior:material.extras?.ior??1.33};});
  const materialNames=(json.materials??[]).map((material,index)=>material.name??`material-${index}`),meshes=[];
  for(const node of json.nodes??[]){if(node.mesh===undefined)continue;const gm=json.meshes[node.mesh];for(let p=0;p<gm.primitives.length;p+=1){const primitive=gm.primitives[p],name=p===0?(node.name??gm.name):`${node.name??gm.name}_${p}`;meshes.push({name,material:materialNames[primitive.material],positions:getAccessor(primitive.attributes.POSITION),normals:primitive.attributes.NORMAL!==undefined?getAccessor(primitive.attributes.NORMAL):[],uvs:primitive.attributes.TEXCOORD_0!==undefined?getAccessor(primitive.attributes.TEXCOORD_0):[],tangents:primitive.attributes.TANGENT!==undefined?getAccessor(primitive.attributes.TANGENT):[],colors:primitive.attributes.COLOR_0!==undefined?getAccessor(primitive.attributes.COLOR_0):[],indices:getAccessor(primitive.indices),transparent:(json.materials?.[primitive.material]?.alphaMode??'OPAQUE')==='BLEND',doubleSided:Boolean(json.materials?.[primitive.material]?.doubleSided),extras:{...(node.extras??{}),...(primitive.extras??{})}});}}
  return {name:json.scenes?.[json.scene??0]?.name??'GLB Model',definition:json.asset?.extras?.sourceDefinition,meshes,materials,textures,bounds:modelBounds(meshes),extras:json.extras?.metadata??json.nodes?.[0]?.extras??{},gltf:json,sourceBytes:buffer.length,sourceSha256:crypto.createHash('sha256').update(buffer).digest('hex')};
}

export function inspectGlb(input){const model=parseGlb(input);return{name:model.name,bytes:model.sourceBytes,sha256:model.sourceSha256,meshCount:model.meshes.length,materialCount:Object.keys(model.materials).length,textureCount:Object.keys(model.textures).length,nodes:model.meshes.map((mesh)=>mesh.name),materials:Object.keys(model.materials),textures:Object.entries(model.textures).map(([name,image])=>({name,width:image.width,height:image.height,colorSpace:image.colorSpace})),bounds:model.bounds,extensionsUsed:model.gltf.extensionsUsed??[]};}
