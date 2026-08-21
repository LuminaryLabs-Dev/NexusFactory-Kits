export const PHASE_ORDER=Object.freeze(["growth","bezier","wood","foliage","artifact","validate"]);
export const parameterSchema=Object.freeze([
  {id:"maturity",label:"Maturity",type:"number",minimum:.2,maximum:.95,default:.65,step:.01},
  {id:"gravityPull",label:"Gravity Pull",type:"number",minimum:0,maximum:1,default:.28,step:.01},
  {id:"upwardGrowth",label:"Upward Growth",type:"number",minimum:.25,maximum:1,default:.72,step:.01},
  {id:"branchSeparation",label:"Branch Separation",type:"number",minimum:0,maximum:1,default:.60,step:.01},
  {id:"branchSpread",label:"Branch Spread",type:"number",minimum:.2,maximum:1,default:.62,step:.01},
  {id:"branchDensity",label:"Branch Density",type:"number",minimum:.2,maximum:1,default:.58,step:.01},
  {id:"leaderDominance",label:"Leader Dominance",type:"number",minimum:0,maximum:1,default:.48,step:.01},
  {id:"foliageDensity",label:"Foliage Density",type:"number",minimum:.35,maximum:1,default:.72,step:.01}
]);
export const editorConfig=Object.freeze({title:"Broadleaf Tree",category:"Nature",tags:["tree","broadleaf","storybook","clay","procedural"],preview:"mesh-3d",inspector:"schema",surfaces:["seed","parameters","export","diagnostics","phases"],primary:["maturity","gravityPull","upwardGrowth","branchSeparation","branchSpread","foliageDensity"],advanced:["branchDensity","leaderDominance","seed"],internal:[],randomizationGroups:[{id:"everything",label:"Everything",parameters:parameterSchema.map(p=>p.id),rerollSeed:false},{id:"growth",label:"Growth",parameters:["maturity","gravityPull","upwardGrowth","branchSeparation","branchSpread","branchDensity","leaderDominance"],rerollSeed:false},{id:"foliage",label:"Foliage",parameters:["foliageDensity"],rerollSeed:false}]});
