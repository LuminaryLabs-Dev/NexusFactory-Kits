import { defineKit } from "../../../../../../domain.js";
import { createExportResult, normalizeParameters, randomizeParameters } from "../../../../../../contracts.js";
import { createSeededRandom, deriveSeed } from "../../../../../../foundation/random.js";
import { manifest as baseManifest, kit as baseKit } from "./index.js";

export const manifest=defineKit({id:baseManifest.id,displayName:baseManifest.displayName,version:baseManifest.version,domainPath:baseManifest.domainPath,requires:baseManifest.requires,provides:baseManifest.provides,services:[...new Set([...(baseManifest.services??[]),"randomize"])],parameterSchema:baseManifest.parameterSchema,editor:baseManifest.editor,runtime:baseManifest.runtime,source:{module:"src/domains/factory/object/weapon/kits/ballista-kit/runtime.js",exportName:"kit"},metadata:{...baseManifest.metadata,serviceContract:"standard-runtime-v1"}});
function entropy(){if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return`${a[0]}:${a[1]}`;}return`${Date.now()}:${Math.random()}`;}
function baseServices(){return baseKit.services??baseKit;}
export function generate(request={}){return baseServices().generate(request);}
export function validate(artifact){return baseServices().validate(artifact);}
export function reroll(request={}){const result=baseServices().reroll(request);return{...result,params:normalizeParameters(manifest.parameterSchema,request.params)};}
export function randomize(request={}){const seed=String(request.seed??`${manifest.id}:001`),groupId=String(request.groupId??"everything"),group=manifest.editor.randomizationGroups.find(g=>g.id===groupId);if(!group)throw new RangeError(`Unknown randomization group: ${groupId}`);const token=request.entropy??entropy(),random=createSeededRandom(deriveSeed(seed,`range:${groupId}:${token}`)),params=randomizeParameters({schema:manifest.parameterSchema,input:request.params,parameterIds:group.parameters,random}),nextSeed=group.rerollSeed?deriveSeed(seed,`reroll:${token}`):seed;return{seed:nextSeed,params,artifact:generate({seed:nextSeed,params})};}
export function exportArtifact(artifact,format="glb"){const raw=baseServices().export(artifact,format),suffix=artifact.deterministicHash?.slice(-8)??"artifact";if(format==="glb")return createExportResult({format,mimeType:"model/gltf-binary",fileName:`ballista-${suffix}.glb`,bytes:raw});if(format==="json")return createExportResult({format,mimeType:"application/json",fileName:`ballista-${suffix}.json`,text:String(raw)});throw new RangeError(`Unsupported ballista export format: ${format}`);}
export const kit=Object.freeze({manifest,services:Object.freeze({describe:()=>structuredClone(manifest),generate,randomize,reroll,validate,export:exportArtifact})});
export default kit;
