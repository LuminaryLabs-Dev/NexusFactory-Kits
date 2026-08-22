import { createRandomStream } from "../../../../foundation/random.js";
import { createRasterSurface, imageFromSurface, surfaceFromImage } from "../../../../foundation/raster/surface.js";
import { blitNearest, fillRect } from "../../../../foundation/raster/primitives.js";
import { renderCoralMorphology, SPECIES, PALETTES } from "../../texture/subject/coral/index.js";
import { drawFishPopulation } from "../../texture/subject/fish/index.js";
import { drawAquaticFloraPopulation } from "../../texture/subject/aquatic-flora/index.js";
import { environmentStyle } from "../../texture/environment/index.js";
import { drawWaterBackground } from "../../texture/environment/water/index.js";
import { drawSubstrate } from "../../texture/environment/substrate/index.js";
import { drawRocks } from "../../texture/environment/rock/index.js";
import { drawBubbles } from "../../vfx/aquatic/bubbles/index.js";
import { drawAquaticParticles } from "../../vfx/aquatic/particles/index.js";
import { drawLightShafts } from "../../vfx/aquatic/light-shafts/index.js";
import { createLayerStack } from "../layer/stack/index.js";
import { sampleLayerAnchors } from "../layer/placement/index.js";
import { generateTerrainProfile } from "../terrain/profile/index.js";
import { planAquaticPopulation } from "./population/index.js";

export const ENVIRONMENT_SCHEMA="nexusfactory.aquatic-environment/1";
export const PLACEMENT_SCHEMA="nexusfactory.scene-placement/1";
export const SUBJECT_SET_SCHEMA="nexusfactory.aquatic-subject-set/1";
export const EFFECTS_SCHEMA="nexusfactory.aquatic-effects/1";
const clamp01=(v)=>Math.max(0,Math.min(1,v));
export function buildTerrain(seed,params,policy){return generateTerrainProfile({width:128,seed:`${seed}:terrain`,baseY:policy.baseY??103,lift:policy.terrainLift(params)});}
export function buildEnvironment(params){const styleId=params.waterStyle??"tropical",style=environmentStyle(styleId);return Object.freeze({schemaVersion:ENVIRONMENT_SCHEMA,styleId,style});}
export function buildPopulation(params,policy){return planAquaticPopulation({reefComplexity:params.reefComplexity,density:params.density,fishDensity:params.fishDensity,floraDensity:policy.floraDensity(params)});}
export function buildPlacement(seed,params,terrain,population,policy){const root=createRandomStream(seed).fork(policy.rngLabel),placement=root.fork("placement"),layers=createLayerStack({complexity:population.complexity,density:population.densityFactor,layers:policy.layers}),items=[];for(const layer of layers){const layerR=placement.fork(layer.id),anchors=sampleLayerAnchors({rng:layerR,width:128,count:layer.count});for(let i=0;i<anchors.length;i++){const x=anchors[i],xi=Math.max(0,Math.min(127,Math.round(x))),floorY=terrain.heights[xi]+layerR.int(-2,2),resolved=params.species==="mixed"?layerR.fork(`species-${i}`).pick(SPECIES).id:params.species,size=clamp01(params.size+layerR.range(-0.22,0.22)),density=clamp01(params.density+layerR.range(-0.18,0.18)),asymmetry=clamp01(params.asymmetry+layerR.range(-0.1,0.1)),scale=layerR.range(layer.scale[0],layer.scale[1]);items.push({id:`${layer.id}-${i}`,layerId:layer.id,index:i,x,floorY,resolvedSpecies:resolved,size,density,asymmetry,scale,opacity:layer.opacity,coralRngSeed:layerR.fork(`coral-${i}`).seed});}}return Object.freeze({schemaVersion:PLACEMENT_SCHEMA,layers,items});}
export function buildSubjects(seed,params,placement){const palette=PALETTES[params.palette]??PALETTES.gold,corals=placement.items.map(item=>{const result=renderCoralMorphology({rng:createRandomStream(item.coralRngSeed),width:64,height:64,speciesId:item.resolvedSpecies,size:item.size,density:item.density,asymmetry:item.asymmetry,palette,highlight:params.highlight,seed:`${seed}:${item.layerId}:${item.index}`,withBase:false});return{...item,image:imageFromSurface(result.surface)};});return Object.freeze({schemaVersion:SUBJECT_SET_SCHEMA,corals});}
export function buildEffects(population){return Object.freeze({schemaVersion:EFFECTS_SCHEMA,bubbleCount:population.bubbleCount,particleCount:65,shaftCount:6});}
export function composeAquaticImage(seed,params,terrain,environment,population,subjects,effects,policy){const rng=createRandomStream(seed).fork(policy.rngLabel),style=environment.style,surface=createRasterSurface({width:128,height:128,transparent:false,background:style.water[0]});drawWaterBackground(surface,style);drawLightShafts(surface,style,rng,effects.shaftCount);drawAquaticParticles(surface,style,rng,effects.particleCount);for(const item of subjects.corals){blitNearest(surface,surfaceFromImage(item.image),{x:item.x-32*item.scale,y:item.floorY-51*item.scale,scale:item.scale,opacity:item.opacity});}drawSubstrate(surface,style,terrain);drawRocks(surface,style,terrain,rng,policy.rockCount(params));const floraColors=policy.floraColors(params);drawAquaticFloraPopulation(surface,rng,terrain,population.floraCount,floraColors);drawFishPopulation(surface,rng,population.fishCount,policy.fishColors(params));drawBubbles(surface,rng,effects.bubbleCount);if(policy.frame){const frame=policy.frame(params);fillRect(surface,0,0,128,2,frame);fillRect(surface,0,126,128,2,frame);fillRect(surface,0,0,2,128,frame);fillRect(surface,126,0,2,128,frame);fillRect(surface,4,4,34,1,"#d9f7f5");}return {schemaVersion:"nexusfactory.image/1",...imageFromSurface(surface)};}
