import { createExportResult, createGenerationState, inspectGenerationState, normalizeParameters, randomizeParameters, validateArtifactShape } from "../../../../../../../contracts.js";
import { createSeededRandom, deriveSeed } from "../../../../../../../foundation/random.js";
import { exportArtifactGlb } from "../../../../../../../foundation/glb.js";
import { createFishArtifact } from "../../fish/artifact.js";
import { buildFishAnatomy, buildFishAppendages, buildFishFace, buildFishSurface, composeFishModel, createFishDefinition } from "../../fish/generator.js";
import { validateFishArtifact } from "../../fish/validation.js";
import { PHASE_ORDER, parameterSchema } from './config.js';
import { manifest } from './spec.js';
export { manifest };

function generationSeed(request={}){const seed=String(request.seed??`${manifest.id}:001`).trim();if(!seed)throw new TypeError("Fish generation requires a non-empty seed.");return seed;}
function definitionFrom(state){return createFishDefinition(state.seed,{...state.params,paletteName:state.params.palette,name:"Procedural Reef Fish"});}
export function createState(request={}){const seed=generationSeed(request),params=normalizeParameters(parameterSchema,request.params);return createGenerationState({kitId:manifest.id,domainPath:manifest.domainPath,seed,params,phaseOrder:PHASE_ORDER});}
export function inspectState(state){return inspectGenerationState(state);}
function requirePhase(state,phase){if(!state.completedPhases.includes(phase))throw new Error(`Phase ${phase} is required.`);}
function mark(state,phase){state.completedPhases=[...state.completedPhases.filter((item)=>item!==phase),phase];}
function invalidateAfter(state,phase){const index=PHASE_ORDER.indexOf(phase);for(const later of PHASE_ORDER.slice(index+1)){delete state.outputs[later];if(later==="artifact")state.artifact=null;if(later==="validate")state.validation=null;state.completedPhases=state.completedPhases.filter((item)=>item!==later);}}

export function runPhase(inputState,phase){
  const state=structuredClone(inputState);
  if(state?.kitId!==manifest.id)throw new TypeError("Fish state belongs to another kit.");
  if(!PHASE_ORDER.includes(phase))throw new RangeError(`Unsupported fish phase: ${phase}`);
  invalidateAfter(state,phase);
  const definition=definitionFrom(state),quality=state.params.quality;
  if(phase==="anatomy")state.outputs.anatomy={meshes:buildFishAnatomy(definition,{quality}).meshes};
  if(phase==="appendages"){requirePhase(state,"anatomy");state.outputs.appendages=buildFishAppendages(definition,{quality});}
  if(phase==="face"){requirePhase(state,"anatomy");state.outputs.face=buildFishFace(definition,{quality});}
  if(phase==="surface"){requirePhase(state,"anatomy");state.outputs.surface=buildFishSurface(definition,{quality});}
  if(phase==="artifact"){
    for(const required of ["anatomy","appendages","face","surface"])requirePhase(state,required);
    const model=composeFishModel(definition,{anatomy:state.outputs.anatomy,appendages:state.outputs.appendages,face:state.outputs.face,surface:state.outputs.surface});
    state.artifact=createFishArtifact(model,{kitId:manifest.id,domainPath:manifest.domainPath,seed:state.seed,params:state.params,phaseOrder:PHASE_ORDER});
    state.outputs.artifact=state.artifact;
  }
  if(phase==="validate"){
    requirePhase(state,"artifact");
    state.validation=validate(state.artifact);state.outputs.validate=state.validation;
    if(!state.validation.valid)throw new Error(`Fish validation failed: ${state.validation.checks.filter((check)=>!check.pass).map((check)=>check.id).join(", ")}`);
  }
  mark(state,phase);return state;
}

export function generate(request={}){let state=createState(request);for(const phase of PHASE_ORDER)state=runPhase(state,phase);return state.artifact;}
function entropyValue(){if(globalThis.crypto?.getRandomValues){const data=new Uint32Array(2);globalThis.crypto.getRandomValues(data);return `${data[0]}:${data[1]}`;}return `${Date.now()}:${Math.random()}`;}
export function randomize(request={}){const seed=generationSeed(request),groupId=String(request.groupId??"everything"),group=manifest.editor.randomizationGroups.find((entry)=>entry.id===groupId);if(!group)throw new RangeError(`Unknown randomization group: ${groupId}`);const entropy=request.entropy??entropyValue(),random=createSeededRandom(deriveSeed(seed,`range:${groupId}:${entropy}`)),params=randomizeParameters({schema:parameterSchema,input:request.params,parameterIds:group.parameters,random}),nextSeed=group.rerollSeed?deriveSeed(seed,`reroll:${entropy}`):seed;return{seed:nextSeed,params,artifact:generate({seed:nextSeed,params})};}
export function reroll(request={}){const seed=generationSeed(request),entropy=request.entropy??entropyValue(),nextSeed=deriveSeed(seed,`individual:${entropy}`),params=normalizeParameters(parameterSchema,request.params);return{seed:nextSeed,params,artifact:generate({seed:nextSeed,params})};}
export function validate(artifact){return validateFishArtifact(artifact,validateArtifactShape(artifact));}
export function exportArtifact(artifact,format="glb"){const validation=validate(artifact);if(!validation.valid)throw new TypeError("Cannot export invalid fish artifact.");const stem=`reef-fish-${artifact.deterministicHash.slice(-8)}`;if(format==="glb")return createExportResult({format,mimeType:"model/gltf-binary",fileName:`${stem}.glb`,bytes:exportArtifactGlb(artifact)});if(format==="json")return createExportResult({format,mimeType:"application/json",fileName:`${stem}.json`,text:JSON.stringify(artifact,null,2)});throw new RangeError(`Unsupported fish export format: ${format}`);}
export const kit=Object.freeze({manifest,services:Object.freeze({describe:()=>structuredClone(manifest),createState,inspectState,runPhase,generate,randomize,reroll,validate,export:exportArtifact})});
export default kit;
