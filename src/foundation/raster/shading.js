import { hashSeed } from "../random.js";
import { color } from "./surface.js";
const occ=(mask,x,y)=>x>=0&&y>=0&&x<mask.width&&y<mask.height&&mask.data[y*mask.width+x]?1:0;
export function shadeMask(surface,mask,palette,{seed="shade",light=[-0.6,-0.8],accentMask=null,tipMask=null,texture=0.12}={}){
  const ramp=palette.map((entry)=>color(entry)); const length=Math.hypot(light[0],light[1])||1,lx=light[0]/length,ly=light[1]/length;
  for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){
    const i=y*mask.width+x; if(!mask.data[i])continue;
    if(accentMask?.data[i]){surface.setPixel(x,y,ramp[0]);continue;}
    if(tipMask?.data[i]){surface.setPixel(x,y,ramp[4]);continue;}
    const gx=occ(mask,x-1,y)-occ(mask,x+1,y),gy=occ(mask,x,y-1)-occ(mask,x,y+1),glen=Math.hypot(gx,gy);
    let level=2;
    if(glen>0){const dot=(gx/glen)*lx+(gy/glen)*ly; if(dot>0.55)level=4; else if(dot>0.1)level=3; else if(dot<-0.45)level=0; else if(dot<0)level=1;}
    else {const noise=(hashSeed(`${seed}:${x}:${y}`)%1000)/1000;if(noise<texture*0.28)level=1;else if(noise>1-texture*0.18)level=3;}
    surface.setPixel(x,y,ramp[level]);
  }
  return surface;
}
export function tintColor(rgb,factor){const c=color(rgb);return [Math.max(0,Math.min(255,c[0]*factor)),Math.max(0,Math.min(255,c[1]*factor)),Math.max(0,Math.min(255,c[2]*factor)),c[3]];}
