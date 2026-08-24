import { defineKit } from "../../../../../../../domain.js";
import { parameterSchema, PHASE_DESCRIPTORS, PHASE_ORDER } from './config.js';
export const KIT_ID="factory-object-creature-fish",DOMAIN_PATH="n:factory:object:creature:aquatic:fish";
export const manifest=defineKit({
  id:KIT_ID,
  displayName:"Procedural Reef Fish",
  version:"0.1.0",
  domainPath:DOMAIN_PATH,
  requires:["aquatic:fish:mesh","factory:seed","factory:artifact","factory:material:pbr"],
  provides:["factory:generate","factory:validate","factory:variation","factory:export","factory:phases","artifact:mesh","artifact:textured-mesh","seed:deterministic","editor:parameters","export:glb","export:json"],
  services:["describe","createState","inspectState","runPhase","generate","randomize","reroll","validate","export"],
  parameterSchema,
  editor:{
    title:"Procedural Reef Fish",category:"Creatures",tags:["fish","aquatic","creature","reef","3d","pbr"],preview:"mesh-3d",inspector:"schema",surfaces:["seed","parameters","phases","export","diagnostics"],
    primary:["speciesFamily","size","tailProfile","eyeProfile","mouthProfile","patternType","palette"],
    advanced:["lengthScale","heightScale","depthScale","bellyFullness","snoutLength","tailScale","finTransmission","eyeScale","patternStrength","clearcoat","iridescence","surfaceVariation","quality","seed"],
    internal:[],
    sections:[
      {id:"form",label:"Form",parameters:["speciesFamily","size","lengthScale","heightScale","depthScale","bellyFullness","snoutLength"]},
      {id:"fins",label:"Fins",parameters:["tailProfile","tailScale","finTransmission"]},
      {id:"face",label:"Face",parameters:["eyeProfile","eyeScale","mouthProfile"]},
      {id:"pattern",label:"Pattern",parameters:["patternType","palette","patternStrength"]},
      {id:"surface",label:"Surface",parameters:["clearcoat","iridescence","surfaceVariation","quality"]}
    ],
    generation:{mode:"debounced",debounceMs:420},
    randomizationGroups:[
      {id:"everything",label:"Everything",parameters:parameterSchema.map((p)=>p.id),rerollSeed:true},
      {id:"anatomy",label:"Anatomy",parameters:["speciesFamily","size","lengthScale","heightScale","depthScale","bellyFullness","snoutLength"],rerollSeed:false},
      {id:"fins",label:"Fins",parameters:["tailProfile","tailScale","finTransmission"],rerollSeed:false},
      {id:"face",label:"Face",parameters:["eyeProfile","eyeScale","mouthProfile"],rerollSeed:false},
      {id:"pattern",label:"Pattern",parameters:["patternType","palette","patternStrength"],rerollSeed:false},
      {id:"surface",label:"Surface",parameters:["clearcoat","iridescence","surfaceVariation","quality"],rerollSeed:false}
    ]
  },
  runtime:{environments:["node","browser"],permissions:[]},
  source:{module:"src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js",exportName:"kit"},
  metadata:{deterministic:true,artifactType:"textured-mesh",phaseOrder:PHASE_ORDER,phases:PHASE_DESCRIPTORS,identity:"high-fidelity procedural reef fish mesh",serviceContract:"standard-runtime-v1"}
});
