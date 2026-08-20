import { createRasterSurface, color } from "../../../../../foundation/raster/surface.js";
import { fillRect, drawLine, blitNearest } from "../../../../../foundation/raster/primitives.js";
import { octaveNoise1D } from "../../../../../foundation/noise.js";
import { poissonSample1D } from "../../../../../foundation/random.js";
import { renderCoralMorphology } from "./morphology.js";
import { PALETTES, SPECIES, WATER_STYLES } from "./presets.js";

function mix(a,b,t){const ca=color(a),cb=color(b);return [ca[0]+(cb[0]-ca[0])*t,ca[1]+(cb[1]-ca[1])*t,ca[2]+(cb[2]-ca[2])*t,255];}
function drawBackground(surface,style,rng){
  for(let y=0;y<surface.height;y++){const t=y/(surface.height-1),section=Math.min(2,Math.floor(t*3)),local=t*3-section,a=style.water[3-section],b=style.water[Math.max(0,2-section)];fillRect(surface,0,y,surface.width,1,mix(a,b,local));}
  const shafts=rng.fork("shafts");for(let i=0;i<6;i++){const x=shafts.int(5,surface.width-12),len=shafts.int(24,66),w=shafts.int(1,3);for(let y=0;y<len;y+=2)fillRect(surface,x+Math.floor(y/18),y,w,1,mix(style.water[2],style.water[3],0.65));}
  const particles=rng.fork("particles");for(let i=0;i<65;i++){const x=particles.int(0,surface.width-1),y=particles.int(6,94);surface.setPixel(x,y,particles.chance(0.5)?style.water[2]:style.water[3]);}
}
function terrainProfile(width,seed,lift=0){const out=[];for(let x=0;x<width;x++)out.push(Math.round(103+lift+octaveNoise1D(seed,x*0.055,{octaves:4})*4.2+Math.sin(x*0.09)*1.5));return out;}
function drawTerrain(surface,style,profile,rng){
  for(let x=0;x<surface.width;x++){const y=profile[x];for(let yy=y;yy<surface.height;yy++){const grain=(x*17+yy*31+((x*y)%13))%19;surface.setPixel(x,yy,grain<2?style.sand[2]:grain<7?style.sand[1]:style.sand[0]);}surface.setPixel(x,y,style.sand[2]);}
  const rocks=rng.fork("rocks");for(let i=0;i<11;i++){const x=rocks.int(2,surface.width-10),y=profile[x]-rocks.int(0,3),w=rocks.int(3,8),h=rocks.int(2,4);fillRect(surface,x,y,w,h,style.rock[0]);fillRect(surface,x+1,y,Math.max(1,w-2),1,style.rock[2]);}
}
function drawFish(surface,rng,count,palette){
  const r=rng.fork("fish");for(let i=0;i<count;i++){const x=r.int(8,surface.width-9),y=r.int(16,88),dir=r.sign(),s=r.chance(0.14)?2:1,c=r.pick([palette[2],palette[3],palette[4]]);fillRect(surface,x-2*s,y-s,4*s,2*s+1,c);surface.setPixel(x+2*s*dir,y,c);surface.setPixel(x-3*s*dir,y-s,c);surface.setPixel(x-3*s*dir,y+s,c);surface.setPixel(x+1*s*dir,y-1,"#102b35");}
}
function drawBubbles(surface,rng,count){const r=rng.fork("bubbles");for(let i=0;i<count;i++){const x=r.int(5,surface.width-6),y=r.int(8,86),rr=r.int(1,2),c="#d9f7f5";surface.setPixel(x-rr,y,c);surface.setPixel(x+rr,y,c);surface.setPixel(x,y-rr,c);surface.setPixel(x,y+rr,c);}}

export function generateReefScene({rng,seed,params,width=128,height=128}){
  const style=WATER_STYLES[params.waterStyle]??WATER_STYLES.tropical,surface=createRasterSurface({width,height,transparent:false,background:style.water[0]});drawBackground(surface,style,rng);
  const profile=terrainProfile(width,`${seed}:terrain`,Math.round((params.size-0.5)*5));
  const complexity=0.55+params.reefComplexity*0.9,density=0.6+params.density*0.75;
  const layers=[{id:"back",depth:0.2,count:Math.max(2,Math.round(3*complexity*density)),scale:[0.34,0.5],opacity:0.5},{id:"mid",depth:0.55,count:Math.max(3,Math.round(4*complexity*density)),scale:[0.5,0.7],opacity:0.78},{id:"front",depth:0.9,count:Math.max(3,Math.round(4*complexity*density)),scale:[0.66,0.94],opacity:1}];
  let coralCount=0;const placement=rng.fork("placement");
  for(const layer of layers){const layerR=placement.fork(layer.id),minDistance=Math.max(7,Math.floor(width/(layer.count+2)*0.78)),anchors=poissonSample1D({random:layerR.float,min:5,max:width-6,count:layer.count,minDistance});for(let i=0;i<anchors.length;i++){const x=anchors[i],xIndex=Math.max(0,Math.min(width-1,Math.round(x))),floorY=profile[xIndex]+layerR.int(-2,2),resolved=params.species==="mixed"?layerR.fork(`species-${i}`).pick(SPECIES).id:params.species,palette=PALETTES[params.palette]??PALETTES.gold,local=renderCoralMorphology({rng:layerR.fork(`coral-${i}`),width:64,height:64,speciesId:resolved,size:Math.max(0,Math.min(1,params.size+layerR.range(-0.22,0.22))),density:Math.max(0,Math.min(1,params.density+layerR.range(-0.18,0.18))),asymmetry:Math.max(0,Math.min(1,params.asymmetry+layerR.range(-0.1,0.1))),palette,highlight:params.highlight,seed:`${seed}:${layer.id}:${i}`,withBase:false}).surface,scale=layerR.range(layer.scale[0],layer.scale[1]);blitNearest(surface,local,{x:x-32*scale,y:floorY-51*scale,scale,opacity:layer.opacity});coralCount++;}}
  drawTerrain(surface,style,profile,rng);
  const foreground=rng.fork("foreground");for(let i=0;i<Math.round(8+params.reefComplexity*12);i++){const x=foreground.int(2,width-3),y=profile[x],h0=foreground.int(4,11);drawLine(surface,x,y,x+foreground.sign()*foreground.int(0,2),y-h0,foreground.pick([PALETTES.green[2],PALETTES.green[3],PALETTES.gold[2]]));}
  const fishCount=Math.round(3+params.fishDensity*13);drawFish(surface,rng,fishCount,PALETTES[params.palette]??PALETTES.gold);drawBubbles(surface,rng,Math.round(3+params.reefComplexity*10));
  return {surface,metrics:{coralCount,fishCount,layerCounts:Object.fromEntries(layers.map((l)=>[l.id,l.count]))}};
}
