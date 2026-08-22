import { defineDomain } from "../../../../../domain.js";
import { color } from "../../../../../foundation/raster/surface.js";
import { fillRect } from "../../../../../foundation/raster/primitives.js";
export const waterDomain=defineDomain({id:"factory-texture-environment-water-domain",domainPath:"n:factory:texture:environment:water",parentDomainPath:"n:factory:texture:environment",requires:["factory:texture:environment"],provides:["aquatic:water"],owns:["water gradient","water palette","depth coloration"],doesNotOwn:["light shafts","particles","fish","coral"],services:["water-background"]});
function mix(a,b,t){const ca=color(a),cb=color(b);return[ca[0]+(cb[0]-ca[0])*t,ca[1]+(cb[1]-ca[1])*t,ca[2]+(cb[2]-ca[2])*t,255];}
export function drawWaterBackground(surface,style){for(let y=0;y<surface.height;y++){const t=y/(surface.height-1),section=Math.min(2,Math.floor(t*3)),local=t*3-section,a=style.water[3-section],b=style.water[Math.max(0,2-section)];fillRect(surface,0,y,surface.width,1,mix(a,b,local));}return surface;}
