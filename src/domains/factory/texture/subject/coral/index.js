import { defineDomain } from "../../../../../domain.js";
import { createRasterSurface } from "../../../../../foundation/raster/surface.js";
import { createMask, maskCircle, maskEllipse, maskLine, maskPolyline, maskRect, cleanMask } from "../../../../../foundation/raster/primitives.js";
import { generateBranchSkeleton, generateFanNetwork, generateFronds, generateLayeredPlates } from "../../../../../foundation/raster/growth.js";
import { shadeMask } from "../../../../../foundation/raster/shading.js";

export const coralDomain=defineDomain({id:"factory-texture-subject-coral-domain",domainPath:"n:factory:texture:subject:coral",parentDomainPath:"n:factory:texture:subject",requires:["factory:texture:subject"],provides:["aquatic:coral"],owns:["coral morphology","coral species","coral coloration","standalone coral rasterization"],doesNotOwn:["fish","water","terrain","reef layout","scene composition"],services:["coral-morphology"]});
export const SPECIES=Object.freeze([
{id:"staghorn",common:"Staghorn coral",scientific:"Acropora cervicornis",form:"cylindrical antler branches",morphology:"branching"},
{id:"elkhorn",common:"Elkhorn coral",scientific:"Acropora palmata",form:"broad flattened fronds",morphology:"frond"},
{id:"brain",common:"Grooved brain coral",scientific:"Diploria labyrinthiformis",form:"labyrinth ridges",morphology:"mound"},
{id:"pillar",common:"Pillar coral",scientific:"Dendrogyra cylindrus",form:"upright columns",morphology:"column"},
{id:"lettuce",common:"Lettuce coral",scientific:"Agaricia agaricites",form:"layered plates",morphology:"plate"},
{id:"sea-fan",common:"Purple sea fan",scientific:"Gorgonia ventalina",form:"reticulate fan",morphology:"fan"},
{id:"sea-rod",common:"Bent sea rod",scientific:"Eunicea flexuosa",form:"bushy candelabrum rods",morphology:"rod"}
]);
export const PALETTES=Object.freeze({gold:["#4a3327","#76503a","#aa784c","#d8ad6e","#f5dfaa"],pink:["#4d2b30","#81434a","#bd6670","#e69791","#ffd0b8"],purple:["#35283e","#60466c","#9670a0","#d09bc0","#efd5e8"],green:["#26382f","#47634b","#709568","#a8c68a","#e0e7b5"],orange:["#513024","#824733","#bd7047","#efa16a","#ffd29c"],bleached:["#625e55","#8b8578","#b8b09e","#ded6c2","#fff4da"]});
export const speciesById=(id)=>SPECIES.find((entry)=>entry.id===id)??SPECIES[0];
function clipAccent(mask,accent){for(let i=0;i<accent.data.length;i++)if(!mask.data[i])accent.data[i]=0;}
function baseMound(mask,w,h,scale=1,baseY=Math.round(h*0.8)){maskEllipse(mask,w/2,baseY+2,w*0.26*scale,Math.max(3,h*0.05*scale));}
function maskPixelSafe(mask,x,y){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<mask.width&&y<mask.height)mask.data[y*mask.width+x]=1;}
export function renderCoralMorphology({rng,width=96,height=96,speciesId="staghorn",size=0.5,density=0.5,asymmetry=0.3,palette,highlight=0.5,seed="coral",withBase=true}){
  const species=speciesById(speciesId),surface=createRasterSurface({width,height,transparent:true}),mask=createMask(width,height),accent=createMask(width,height),tips=createMask(width,height);
  const baseY=Math.round(height*0.80),centerX=Math.round(width/2),h=height*(0.38+size*0.32),spread=0.38+size*0.22;
  if(withBase){const baseScale={column:1.2,mound:1.12,plate:0.98,fan:0.72,branching:0.82,frond:0.9,rod:0.82}[species.morphology]??0.9;baseMound(mask,width,height,baseScale+size*0.12,baseY);}
  if(species.morphology==="branching"){
    const segments=generateBranchSkeleton({rng:rng.fork("branch"),origin:[centerX,baseY],height:h,trunkCount:4+Math.round(density*5),branchFrequency:0.28+density*0.35,branchAngle:[28,58],curvature:0.08+asymmetry*0.22,taper:0.72,spread,asymmetry});
    for(const seg of segments){maskLine(mask,...seg.a,...seg.b,Math.max(1,Math.round(seg.radius)));if(seg.tip)maskCircle(tips,seg.b[0],seg.b[1],1+Math.round(highlight));}
  }else if(species.morphology==="frond"){
    maskLine(mask,centerX,baseY,centerX,baseY-h*0.44,3+Math.round(size*2));const fronds=generateFronds({rng:rng.fork("frond"),origin:[centerX,baseY],count:5+Math.round(density*3),height:h,width:width*(0.28+size*0.18),asymmetry});for(const frond of fronds){maskPolyline(mask,frond.points,Math.max(2,Math.round(frond.radius+size)));const end=frond.points.at(-1);maskCircle(tips,end[0],end[1],2+Math.round(highlight));}
  }else if(species.morphology==="mound"){
    const rr=rng.fork("mound"),rx=width*(0.20+size*0.08),ry=height*(0.14+size*0.06),cx=centerX+rr.range(-1,1)*asymmetry*width*0.075,cy=baseY-ry*0.8+rr.range(-1,1)*asymmetry*2;maskEllipse(mask,cx,cy,rx*(1+asymmetry*rr.range(-0.08,0.08)),ry);const rows=6+Math.round(density*5),phase=rng.fork("ridges").range(0,Math.PI*2),warp=0.6+asymmetry*2.2;for(let r=0;r<rows;r++){const yy=cy-ry+4+r*(ry*2-8)/Math.max(1,rows-1),points=[];for(let x=Math.round(cx-rx+3);x<=cx+rx-3;x++){const wobble=Math.sin(x*0.28+phase+r*0.9)*1.6+Math.sin(x*0.11-r)*0.8+Math.sin(x*0.055+r*1.7)*warp;points.push([x,yy+wobble]);}maskPolyline(accent,points,0);}
  }else if(species.morphology==="column"){
    const count=4+Math.round(density*3),rr=rng.fork("columns");for(let i=0;i<count;i++){const x=centerX+(i-(count-1)/2)*(width*0.09)+rr.range(-2,2)*asymmetry,height0=h*rr.range(0.62,1.02),w=4+size*4+rr.range(-1,1);maskRect(mask,x-w/2,baseY-height0,w,height0);maskEllipse(mask,x,baseY-height0,w/2,2+size);for(let y=baseY-height0+5;y<baseY-3;y+=5)if(rr.chance(0.7))maskPixelSafe(accent,x+(y%2?1:-1),y);}
  }else if(species.morphology==="plate"){
    const paths=generateLayeredPlates({rng:rng.fork("plates"),origin:[centerX,baseY-2],layers:5+Math.round(density*3),width:width*(0.42+size*0.18),height:h*0.78,curl:0.15+asymmetry*0.35});maskLine(mask,centerX,baseY,centerX,baseY-h*0.6,2);for(const path of paths){maskPolyline(mask,path.points,2+Math.round(size));maskPolyline(accent,path.points,0);}
  }else if(species.morphology==="fan"){
    const fan=generateFanNetwork({rng:rng.fork("fan"),origin:[centerX,baseY],height:h,width:width*(0.48+size*0.16),ribCount:8+Math.round(density*6),connectivity:0.55+density*0.35,asymmetry});maskLine(mask,centerX,baseY,centerX,baseY-h*0.28,1);for(const path of fan.ribs)maskPolyline(mask,path,0);for(const [a,b] of fan.connectors)maskLine(mask,...a,...b,0);for(const path of fan.ribs){const end=path.at(-1);maskCircle(tips,end[0],end[1],highlight>0.55?1:0);}
  }else{
    const segments=generateBranchSkeleton({rng:rng.fork("rod"),origin:[centerX,baseY],height:h*0.92,trunkCount:3+Math.round(density*3),branchFrequency:0.18+density*0.26,branchAngle:[18,42],curvature:0.18+asymmetry*0.34,taper:0.82,spread:0.28+size*0.18,asymmetry:0.25+asymmetry*0.5});for(const seg of segments){maskLine(mask,...seg.a,...seg.b,Math.max(1,Math.round(seg.radius*0.85)));if(seg.tip)maskCircle(tips,seg.b[0],seg.b[1],1);}
  }
  cleanMask(mask,{minNeighbors:1,passes:1});clipAccent(mask,accent);clipAccent(mask,tips);shadeMask(surface,mask,palette,{seed,accentMask:accent,tipMask:tips,texture:0.08+highlight*0.16});return{surface,species,mask,accent,tips};
}
