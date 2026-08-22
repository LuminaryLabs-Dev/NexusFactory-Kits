import { defineDomain } from "../../../../../domain.js";
import { color } from "../../../../../foundation/raster/surface.js";
import { fillRect } from "../../../../../foundation/raster/primitives.js";
export const lightShaftsDomain=defineDomain({id:"factory-vfx-aquatic-light-shafts-domain",domainPath:"n:factory:vfx:aquatic:light-shafts",parentDomainPath:"n:factory:vfx:aquatic",requires:["factory:vfx:aquatic"],provides:["aquatic:light-shafts"],owns:["underwater light shaft placement and rasterization"],doesNotOwn:["water coloration","scene layout"],services:["aquatic-light-shafts"]});
function mix(a,b,t){const ca=color(a),cb=color(b);return[ca[0]+(cb[0]-ca[0])*t,ca[1]+(cb[1]-ca[1])*t,ca[2]+(cb[2]-ca[2])*t,255];}
export function drawLightShafts(surface,style,rng,count=6){const shafts=rng.fork("shafts");for(let i=0;i<count;i++){const x=shafts.int(5,surface.width-12),len=shafts.int(24,66),w=shafts.int(1,3);for(let y=0;y<len;y+=2)fillRect(surface,x+Math.floor(y/18),y,w,1,mix(style.water[2],style.water[3],0.65));}return surface;}
