import { defineDomain } from "../../../../../domain.js";
import { createRasterSurface } from "../../../../../foundation/raster/surface.js";
import { drawLine } from "../../../../../foundation/raster/primitives.js";
export const aquaticFloraDomain=defineDomain({id:"factory-texture-subject-aquatic-flora-domain",domainPath:"n:factory:texture:subject:aquatic-flora",parentDomainPath:"n:factory:texture:subject",requires:["factory:texture:subject"],provides:["aquatic:flora"],owns:["aquatic plant silhouettes","plant variation","standalone flora rasterization"],doesNotOwn:["scene population","terrain profile","water"],services:["aquatic-flora-raster"]});
export const FLORA_STYLES=Object.freeze(["seagrass","kelp","branching","tuft"]);
export const FLORA_PALETTES=Object.freeze({green:["#17382f","#2f6145","#55915c","#91c477"],gold:["#3f3925","#6e6635","#a39b4f","#d0c96e"],red:["#43292b","#72403f","#a85d52","#dc8971"]});
export const FLORA_DESIGN_PROFILES=Object.freeze({
  seagrass:Object.freeze({silhouette:"rooted ribbon meadow",features:["curved-blades","tapered-tips","shared-rhizome"]}),
  kelp:Object.freeze({silhouette:"upright stalks with broad leaves",features:["stipes","alternating-blades","air-bladders"]}),
  branching:Object.freeze({silhouette:"open forked thicket",features:["tapered-trunks","forked-branches","rounded-tips"]}),
  tuft:Object.freeze({silhouette:"radial fountain rosette",features:["central-holdfast","fanned-fronds","arched-crown"]})
});
export function drawAquaticFloraPopulation(surface,rng,profile,count,palette="green"){const foreground=rng.fork("foreground"),colors=Array.isArray(palette)?palette:(FLORA_PALETTES[palette]??FLORA_PALETTES.green);for(let i=0;i<count;i++){const x=foreground.int(2,surface.width-3),y=profile.heights[x],h0=foreground.int(4,11),lean=foreground.sign()*foreground.int(0,2);drawLine(surface,x,y,x+lean,y-h0,foreground.pick(Array.isArray(palette)?colors:[colors[1],colors[2],colors[3]]));}return surface;}
function curve(surface,points,color,radius=0){for(let i=1;i<points.length;i++)drawLine(surface,points[i-1][0],points[i-1][1],points[i][0],points[i][1],color,radius);}
function disk(surface,x,y,r,color){for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++)if(ox*ox+oy*oy<=r*r)surface.setPixel(x+ox,y+oy,color);}
function rootedBase(surface,baseY,minX,maxX,colors){
  drawLine(surface,minX,baseY,maxX,baseY,colors[0],1);
  drawLine(surface,minX+2,baseY-1,maxX-2,baseY-1,colors[1]);
  for(let x=minX+2;x<=maxX-2;x+=4)surface.setPixel(x,baseY-2,colors[2]);
}
function renderSeagrass(surface,r,colors,{baseY,size,density,sway}){
  const bladeCount=Math.round(9+density*13),span=Math.round(20+density*17),minX=Math.round(32-span/2),maxX=Math.round(32+span/2),maxHeight=18+size*27;
  rootedBase(surface,baseY,minX,maxX,colors);
  for(let i=0;i<bladeCount;i++){
    const x=Math.round(minX+2+(span-4)*(i/(bladeCount-1||1))+r.range(-1.5,1.5)),h=maxHeight*r.range(.58,1),bend=r.range(-1,1)*(2+sway*9),midY=baseY-h*.48;
    curve(surface,[[x,baseY-2],[x+bend*.25,midY],[x+bend,baseY-h]],colors[0],1);
    curve(surface,[[x,baseY-3],[x+bend*.25,midY],[x+bend,baseY-h]],r.pick([colors[2],colors[3]]));
  }
  return{stemCount:bladeCount,bladeCount,branchCount:0,bulbCount:0,featureCount:bladeCount,baseWidth:maxX-minX+1};
}
function renderKelp(surface,r,colors,{baseY,size,density,sway}){
  const stemCount=Math.round(2+density*2),span=18+Math.round(density*7),minX=Math.round(32-span/2),maxX=Math.round(32+span/2),maxHeight=22+size*25;let bladeCount=0,bulbCount=0;
  rootedBase(surface,baseY,minX,maxX,colors);
  for(let i=0;i<stemCount;i++){
    const x=Math.round(minX+4+(span-8)*(i/(stemCount-1||1))+r.range(-1,1)),h=maxHeight*r.range(.7,1),bend=r.range(-1,1)*(1+sway*5),topX=x+bend;
    curve(surface,[[x,baseY-2],[x+bend*.3,baseY-h*.52],[topX,baseY-h]],colors[0],1);
    curve(surface,[[x,baseY-3],[x+bend*.3,baseY-h*.52],[topX,baseY-h]],colors[2]);
    const leaves=Math.max(3,Math.round(3+density*4));
    for(let leaf=1;leaf<=leaves;leaf++){
      const t=.16+leaf*(.7/(leaves+1)),cx=x+bend*t,cy=baseY-h*t,side=(leaf+i)%2?1:-1,length=r.range(5,9)*(0.7+size*.4),rise=r.range(-2,2);
      drawLine(surface,cx,cy,cx+side*length,cy-2+rise,colors[1],2);
      drawLine(surface,cx+side,cy-1,cx+side*(length-.5),cy-2+rise,colors[3]);bladeCount++;
      if(leaf%2===0){disk(surface,cx+side*2,cy-1,1,colors[3]);bulbCount++;}
    }
  }
  return{stemCount,bladeCount,branchCount:0,bulbCount,featureCount:bladeCount+bulbCount,baseWidth:maxX-minX+1};
}
function renderBranching(surface,r,colors,{baseY,size,density,sway}){
  const stemCount=Math.round(2+density*3),span=29+Math.round(density*10),minX=Math.round(32-span/2),maxX=Math.round(32+span/2),maxHeight=20+size*27;let branchCount=0;
  rootedBase(surface,baseY,minX,maxX,colors);
  for(let i=0;i<stemCount;i++){
    const x=Math.round(minX+3+(span-6)*(i/(stemCount-1||1))+r.range(-1,1)),h=maxHeight*r.range(.62,1),lean=r.range(-1,1)*(1+sway*6),topX=x+lean;
    curve(surface,[[x,baseY-2],[x+lean*.35,baseY-h*.48],[topX,baseY-h]],colors[0],1);
    curve(surface,[[x,baseY-3],[x+lean*.35,baseY-h*.48],[topX,baseY-h]],colors[2]);
    const forks=Math.round(2+density*3);
    for(let fork=0;fork<forks;fork++){
      const t=.3+fork*(.5/(forks||1)),cx=x+lean*t,cy=baseY-h*t,side=(fork+i)%2?1:-1,length=r.range(5,9)*(0.75+size*.3),endX=cx+side*length,endY=cy-r.range(4,9);
      drawLine(surface,cx,cy,endX,endY,colors[1],1);drawLine(surface,cx,cy-1,endX,endY,colors[3]);disk(surface,endX,endY,1,colors[3]);branchCount++;
    }
    disk(surface,topX,baseY-h,1,colors[3]);
  }
  return{stemCount,bladeCount:0,branchCount,bulbCount:0,featureCount:branchCount+stemCount,baseWidth:maxX-minX+1};
}
function renderTuft(surface,r,colors,{baseY,size,density,sway}){
  const frondCount=Math.round(10+density*12),centerX=32,maxHeight=18+size*25,spread=12+density*11;
  disk(surface,centerX,baseY-1,4,colors[0]);drawLine(surface,centerX-3,baseY-2,centerX+3,baseY-2,colors[2],1);
  for(let i=0;i<frondCount;i++){
    const u=frondCount===1?0:i/(frondCount-1),direction=(u*2-1),endX=centerX+direction*spread+r.range(-2,2)+direction*sway*3,endY=baseY-maxHeight*(.62+.38*(1-Math.abs(direction)))*r.range(.82,1),midX=centerX+direction*spread*.35+r.range(-1,1),midY=baseY-(baseY-endY)*.58;
    curve(surface,[[centerX+r.range(-2,2),baseY-3],[midX,midY],[endX,endY]],colors[0],1);
    curve(surface,[[centerX+r.range(-2,2),baseY-4],[midX,midY],[endX,endY]],r.pick([colors[2],colors[3]]));
  }
  return{stemCount:frondCount,bladeCount:frondCount,branchCount:0,bulbCount:0,featureCount:frondCount,baseWidth:9};
}
export function renderAquaticFloraAsset({rng,width=64,height=64,style="seagrass",palette="green",size=0.55,density=0.6,sway=0.4}){
  const surface=createRasterSurface({width,height,transparent:true}),colors=FLORA_PALETTES[palette]??FLORA_PALETTES.green,r=rng.fork("flora-v2"),baseY=Math.round(height*.87),settings={baseY,size,density,sway};
  const renderers={seagrass:renderSeagrass,kelp:renderKelp,branching:renderBranching,tuft:renderTuft},metrics=(renderers[style]??renderSeagrass)(surface,r,colors,settings);
  return{surface,metrics:{...metrics,style,designProfile:FLORA_DESIGN_PROFILES[style]??FLORA_DESIGN_PROFILES.seagrass,generatorVersion:"aquatic-flora-v2"}};
}
