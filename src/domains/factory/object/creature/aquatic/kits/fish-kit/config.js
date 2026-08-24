import { FISH_PALETTES, FISH_SPECIES } from '../../fish/generator.js';

export const PHASE_ORDER=Object.freeze(["anatomy","appendages","face","surface","artifact","validate"]);
export const PHASE_DESCRIPTORS=Object.freeze(PHASE_ORDER.map((id,index)=>Object.freeze({id,label:id[0].toUpperCase()+id.slice(1),order:index})));
export const parameterSchema=Object.freeze([
  {id:"speciesFamily",label:"Species Family",type:"select",options:Object.keys(FISH_SPECIES),default:"oval"},
  {id:"tailProfile",label:"Tail Profile",type:"select",options:["forked","fan","rounded"],default:"forked"},
  {id:"patternType",label:"Pattern",type:"select",options:["bands","spots","mottled","saddles"],default:"bands"},
  {id:"palette",label:"Palette",type:"select",options:Object.keys(FISH_PALETTES),default:"azureGold"},
  {id:"eyeProfile",label:"Eye Profile",type:"select",options:["amber","dark"],default:"amber"},
  {id:"mouthProfile",label:"Mouth Profile",type:"select",options:["terminal","upturned","nibbler","beak"],default:"terminal"},
  {id:"size",label:"Size",type:"number",minimum:0,maximum:1,default:0.5,step:0.01},
  {id:"lengthScale",label:"Body Length",type:"number",minimum:0.84,maximum:1.18,default:1,step:0.01},
  {id:"heightScale",label:"Body Height",type:"number",minimum:0.84,maximum:1.18,default:1,step:0.01},
  {id:"depthScale",label:"Body Depth",type:"number",minimum:0.84,maximum:1.18,default:1,step:0.01},
  {id:"bellyFullness",label:"Belly Fullness",type:"number",minimum:0.86,maximum:1.16,default:1,step:0.01},
  {id:"snoutLength",label:"Snout Length",type:"number",minimum:0.86,maximum:1.16,default:1,step:0.01},
  {id:"tailScale",label:"Tail Scale",type:"number",minimum:0.82,maximum:1.22,default:1,step:0.01},
  {id:"eyeScale",label:"Eye Scale",type:"number",minimum:0.78,maximum:1.16,default:0.94,step:0.01},
  {id:"patternStrength",label:"Pattern Strength",type:"number",minimum:0,maximum:1,default:0.78,step:0.01},
  {id:"clearcoat",label:"Wet Clearcoat",type:"number",minimum:0,maximum:1,default:0.62,step:0.01},
  {id:"iridescence",label:"Iridescence",type:"number",minimum:0,maximum:1,default:0.34,step:0.01},
  {id:"finTransmission",label:"Fin Transmission",type:"number",minimum:0,maximum:1,default:0.54,step:0.01},
  {id:"surfaceVariation",label:"Surface Variation",type:"number",minimum:0,maximum:1,default:0.55,step:0.01},
  {id:"quality",label:"Quality",type:"select",options:["preview","high"],default:"preview"}
]);
