import { defineKit } from "../../../../../domain.js";
import { createImageArtifact, normalizeParameters, validateArtifactShape } from "../../../../../contracts.js";
import { createRandomStream, deriveSeed } from "../../../../../foundation/random.js";
import { imageFromSurface, surfaceFromImage } from "../../../../../foundation/raster/surface.js";
import { encodePngRgba } from "../../../../../foundation/raster/png.js";
import { rasterMetrics, connectedComponentsAlpha } from "../../../../../foundation/raster/metrics.js";
import { generateCoralAsset } from "./asset.js";
import { generateReefScene } from "./reef.js";
import { SPECIES, PALETTES, WATER_STYLES } from "./presets.js";

export const KIT_ID = "factory-texture-coral";
export const DOMAIN_PATH = "n:factory:texture";

export const manifest = defineKit({
  id:KIT_ID,
  displayName:"Coral Generator",
  version:"0.1.0",
  domainPath:DOMAIN_PATH,
  requires:["factory:texture","factory:seed","factory:artifact"],
  provides:["factory:generate","factory:validate","factory:variation","factory:export","artifact:image","seed:deterministic","editor:parameters","export:png"],
  services:["describe","generate","reroll","validate","export"],
  parameterSchema:[
    {id:"mode",label:"Mode",type:"select",options:["asset","reef"],default:"asset"},
    {id:"species",label:"Species",type:"select",options:[...SPECIES.map((entry)=>entry.id),"mixed"],default:"staghorn"},
    {id:"palette",label:"Coral Palette",type:"select",options:Object.keys(PALETTES),default:"pink"},
    {id:"size",label:"Size",type:"number",minimum:0,maximum:1,default:0.55,step:0.01},
    {id:"density",label:"Density",type:"number",minimum:0,maximum:1,default:0.58,step:0.01},
    {id:"asymmetry",label:"Asymmetry",type:"number",minimum:0,maximum:1,default:0.28,step:0.01},
    {id:"highlight",label:"Highlight",type:"number",minimum:0,maximum:1,default:0.55,step:0.01},
    {id:"reefComplexity",label:"Reef Complexity",type:"number",minimum:0,maximum:1,default:0.62,step:0.01},
    {id:"fishDensity",label:"Fish Density",type:"number",minimum:0,maximum:1,default:0.48,step:0.01},
    {id:"waterStyle",label:"Water Style",type:"select",options:Object.keys(WATER_STYLES),default:"tropical"}
  ],
  editor:{
    title:"Coral Generator",category:"Textures",tags:["coral","pixel-art","reef","procedural"],preview:"image-2d",inspector:"schema",surfaces:["seed","parameters","export","diagnostics"],
    primary:["mode","species","palette","size","density","asymmetry"],advanced:["highlight","reefComplexity","fishDensity","waterStyle","seed"],internal:[],
    randomizationGroups:[
      {id:"everything",label:"Everything",parameters:["mode","species","palette","size","density","asymmetry","highlight","reefComplexity","fishDensity","waterStyle"],rerollSeed:true},
      {id:"form",label:"Form",parameters:["species","size","density","asymmetry"],rerollSeed:false},
      {id:"color",label:"Color",parameters:["palette","highlight","waterStyle"],rerollSeed:false},
      {id:"scene",label:"Scene",parameters:["reefComplexity","fishDensity"],rerollSeed:false}
    ]
  },
  runtime:{environments:["node","browser","worker"],permissions:[]},
  source:{module:"src/domains/factory/texture/kits/coral-kit/index.js",exportName:"kit"},
  metadata:{deterministic:true,artifactType:"image",identity:"pixel-art coral assets and composed reef scenes generated from shared morphology grammars",modes:["asset","reef"],species:SPECIES.map((entry)=>({id:entry.id,common:entry.common,scientific:entry.scientific,form:entry.form}))}
});

export function describe(){return manifest;}
export function generate({seed=`${KIT_ID}:001`,params={}}={}){
  const normalized=normalizeParameters(manifest.parameterSchema,params),rng=createRandomStream(seed);
  const result=normalized.mode==="reef"?generateReefScene({rng:rng.fork("reef"),seed:String(seed),params:normalized}):generateCoralAsset({rng:rng.fork("asset"),seed:String(seed),params:normalized});
  return createImageArtifact({kitId:KIT_ID,domainPath:DOMAIN_PATH,seed,params:normalized,image:imageFromSurface(result.surface),statistics:result.metrics,metadata:{mode:normalized.mode,resolvedSpecies:result.resolvedSpecies??(normalized.species==="mixed"?"mixed":normalized.species),generator:"coral-shared-morphology-v1"}});
}
export function reroll({seed=`${KIT_ID}:001`,params={}}={}){const nextSeed=deriveSeed(seed,"reroll");return {seed:nextSeed,artifact:generate({seed:nextSeed,params})};}
export function validate(artifact){
  const base=validateArtifactShape(artifact),checks=[...base.checks];const add=(id,pass,detail="")=>checks.push({id,pass:Boolean(pass),detail});
  if(artifact?.artifactKind==="image"){
    try{const surface=surfaceFromImage(artifact.image),metrics=rasterMetrics(surface),mode=artifact.params?.mode;add("image:payload-length",surface.pixels.length===surface.width*surface.height*4);add("image:dimensions",mode==="reef"?surface.width===128&&surface.height===128:surface.width===96&&surface.height===96,`${surface.width}x${surface.height}`);if(mode==="asset"){add("asset:transparent",artifact.image.transparent===true);add("asset:occupied",metrics.occupiedRatio>0.015&&metrics.occupiedRatio<0.55,metrics.occupiedRatio.toFixed(4));add("asset:connected",connectedComponentsAlpha(surface)<=6,String(connectedComponentsAlpha(surface)));}else{add("reef:opaque",artifact.image.transparent===false);add("reef:corals",Number(artifact.statistics?.coralCount)>0,String(artifact.statistics?.coralCount??0));}}
    catch(error){add("image:decode",false,error.message);}
  }
  return {valid:checks.every((check)=>check.pass),checks};
}
export function exportArtifact(artifact,format="png"){
  const validation=validate(artifact);if(!validation.valid)throw new TypeError(`Cannot export invalid coral artifact: ${validation.checks.filter((c)=>!c.pass).map((c)=>c.id).join(", ")}`);
  if(format==="png")return encodePngRgba(surfaceFromImage(artifact.image),{scale:8});
  if(format==="json")return JSON.stringify(artifact,null,2);
  throw new RangeError(`Unsupported coral export format: ${format}`);
}
export const kit=Object.freeze({manifest,describe,generate,reroll,validate,export:exportArtifact});
