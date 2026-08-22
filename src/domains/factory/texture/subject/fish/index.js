import { defineDomain } from "../../../../../domain.js";
import { createRasterSurface } from "../../../../../foundation/raster/surface.js";
import { fillRect, drawLine } from "../../../../../foundation/raster/primitives.js";
export const fishDomain=defineDomain({id:"factory-texture-subject-fish-domain",domainPath:"n:factory:texture:subject:fish",parentDomainPath:"n:factory:texture:subject",requires:["factory:texture:subject"],provides:["aquatic:fish"],owns:["fish silhouette","body proportions","tail and fin form","fish raster coloration"],doesNotOwn:["scene placement","water","reef population policy"],services:["fish-raster"]});
export const FISH_PALETTES=Object.freeze({reef:["#163846","#2d6b78","#72bdaf","#f0d28a"],gold:["#4b3420","#9b6231","#e7a84e","#ffe09b"],blue:["#18324f","#315d84","#6ca5c9","#d1eff5"],pink:["#4b293d","#8b4566","#d97891","#ffd0c2"]});
export const FISH_SHAPES=Object.freeze(["streamlined","round","long"]);
export const FISH_FINS=Object.freeze(["short","fan","fork"]);
function fishColors(palette){return FISH_PALETTES[palette]??FISH_PALETTES.reef;}
function drawFishShape(surface,{x,y,direction=1,size=1,bodyShape="streamlined",finStyle="short",colors,detail=0.5}){
  const dir=direction==="left"||direction===-1?-1:1,s=Math.max(1,Math.round(size));
  const bodyW=bodyShape==="long"?6:bodyShape==="round"?4:5,bodyH=bodyShape==="round"?3:2;
  fillRect(surface,x-Math.floor(bodyW*s/2),y-Math.floor(bodyH*s/2),bodyW*s,bodyH*s+1,colors[2]);
  fillRect(surface,x-dir*Math.floor(bodyW*s/3),y-Math.floor(bodyH*s/2),Math.max(1,s),bodyH*s+1,colors[3]);
  const tailX=x-dir*Math.ceil(bodyW*s/2),tail=finStyle==="fan"?2*s:s;
  drawLine(surface,tailX,y,tailX-dir*2*s,y-tail,colors[1]);drawLine(surface,tailX,y,tailX-dir*2*s,y+tail,colors[1]);
  if(finStyle==="fork"){surface.setPixel(tailX-dir*2*s,y,colors[0]);}
  if(detail>0.35)surface.setPixel(x+dir*Math.max(1,Math.floor(bodyW*s/3)),y-1,colors[0]);
  if(detail>0.7)drawLine(surface,x,y+Math.max(1,s),x-dir*s,y+2*s,colors[1]);
}
export function renderFishAsset({rng,width=64,height=64,bodyShape="streamlined",size=0.55,palette="reef",direction="right",finStyle="short",detail=0.5}){const surface=createRasterSurface({width,height,transparent:true}),scale=1+Math.round(size*2),x=Math.round(width/2+rng.range(-2,2)),y=Math.round(height/2+rng.range(-2,2));drawFishShape(surface,{x,y,direction,size:scale,bodyShape,finStyle,colors:fishColors(palette),detail});return{surface,metrics:{fishCount:1,bodyShape,finStyle}};}
export function drawFishPopulation(surface,rng,count,palette){const r=rng.fork("fish"),colors=Array.isArray(palette)?palette:fishColors(Object.hasOwn(FISH_PALETTES,palette)?palette:"reef"),choices=colors.length>=5?[colors[2],colors[3],colors[4]]:[colors[1],colors[2],colors[3]];for(let i=0;i<count;i++){const x=r.int(8,surface.width-9),y=r.int(16,Math.min(88,surface.height-10)),dir=r.sign(),s=r.chance(0.14)?2:1,c=r.pick(choices);fillRect(surface,x-2*s,y-s,4*s,2*s+1,c);surface.setPixel(x+2*s*dir,y,c);surface.setPixel(x-3*s*dir,y-s,c);surface.setPixel(x-3*s*dir,y+s,c);surface.setPixel(x+1*s*dir,y-1,"#102b35");}return surface;}
