// Deterministic, browser-safe animated magic formation. Time is the only advancing input;
// particle identities and their trajectories depend on seed, never on frame index.
import { createRasterSurface } from '../../../../../foundation/raster/surface.js';
import { createSeededRandom, deriveSeed } from '../../../../../foundation/random.js';

export const THEMES=Object.freeze({
  arcane:{colors:['#312064','#834bd2','#c580ff','#e8ddff'],behavior:'glyph'},
  fire:{colors:['#78232c','#dc4922','#ff9b2b','#fff0b1'],behavior:'convection'},
  frost:{colors:['#17477d','#2586bd','#6bdbf7','#f2ffff'],behavior:'crystal'},
  lightning:{colors:['#21477b','#2b9be5','#ffe15a','#f6ffff'],behavior:'electric'},
  nature:{colors:['#28552e','#528b38','#a0d94b','#e9f6a3'],behavior:'growth'},
  poison:{colors:['#2c4932','#55892d','#b0e142','#f6ff9b'],behavior:'bubble'},
  holy:{colors:['#6a5232','#c99a41','#ffde8c','#fffae5'],behavior:'radiance'},
  shadow:{colors:['#281935','#5c267c','#a84dbb','#edb2f2'],behavior:'smoke'},
  cosmic:{colors:['#203667','#5d4cb1','#d469c8','#a5f0ff'],behavior:'orbit'},
  earth:{colors:['#50372a','#936640','#c99a60','#f6ddb0'],behavior:'gravity'}
});
export const EFFECTS=Object.freeze(['aura','bolt','burst','eruption','nova','orb','pillar','portal','rain','rune','shield','sigil','spiral','trail','volley','vortex']);
export const SUSTAINED=Object.freeze(['aura','orb','pillar','portal','rain','rune','shield','sigil','spiral','vortex']);
const TAU=2*Math.PI;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const phase=(t,a,b)=>smooth((t-a)/(b-a));
const oneShot=t=>phase(t,.018,.18)*(1-phase(t,.77,.985));
function parseHex(hex){const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255,255];}
function makeBrush(surface,colors,behavior){
  const palette=colors.map(parseHex),w=surface.width,h=surface.height;
  function dot(x,y,c=2,alpha=1){
    x=Math.round(x);y=Math.round(y);if(x<3||x>=w-3||y<3||y>=h-3||alpha<=.02)return;
    const i=(y*w+x)*4,prev=surface.pixels[i+3],a=Math.round(clamp(alpha)*255),color=palette[clamp(c,0,3)];
    if(a<prev)return;surface.pixels.set(color.slice(0,3).concat(a),i);
  }
  function line(x0,y0,x1,y1,c=2,alpha=1,weight=1){
    const n=Math.min(160,Math.ceil(Math.hypot(x1-x0,y1-y0)*2)+1);
    for(let i=0;i<=n;i++){const t=i/Math.max(1,n),x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
      dot(x,y,c,alpha);if(weight>1){dot(x+1,y,c,alpha*.9);dot(x,y+1,c,alpha*.9);}}
  }
  function radialOffset(a,r){
    if(behavior==='crystal')return r*(.88+.12*Math.cos(6*a));
    if(behavior==='electric')return r*(.94+.10*Math.sin(11*a));
    if(behavior==='growth')return r*(.9+.12*Math.cos(5*a));
    if(behavior==='bubble')return r*(.97+.05*Math.sin(4*a));
    if(behavior==='gravity')return r*(.82+.17*Math.cos(5*a));
    if(behavior==='convection')return r*(.89+.11*Math.sin(3*a));
    if(behavior==='smoke')return r*(.87+.11*Math.sin(4*a+.8));
    if(behavior==='orbit')return r*(.93+.11*Math.cos(3*a));
    if(behavior==='radiance')return r*(.95+.09*Math.cos(8*a));
    return r;
  }
  function circle(cx,cy,r,c=2,alpha=1,filled=false){
    if(r<.5)return;
    if(filled){for(let y=Math.floor(cy-r-1);y<=Math.ceil(cy+r+1);y++)for(let x=Math.floor(cx-r-1);x<=Math.ceil(cx+r+1);x++){
      if(Math.hypot(x-cx,y-cy)<=r)dot(x,y,c,alpha);
    }return;}
    const segments=Math.max(18,Math.ceil(11*r));
    for(let i=0;i<=segments;i++){
      const a=i*TAU/segments;
      if(behavior==='bubble'&&i%17<3)continue;
      const rad=radialOffset(a,r);
      dot(cx+rad*Math.cos(a),cy+rad*Math.sin(a),c,alpha);
    }
  }
  function arc(cx,cy,r,start,end,c=2,alpha=1){
    if(r<.7)return;const segments=Math.max(12,Math.ceil(r*Math.abs(end-start)*3));
    for(let i=0;i<=segments;i++){
      if(behavior==='bubble'&&i%23<3)continue;
      const a=start+(end-start)*i/segments,rad=radialOffset(a,r);
      dot(cx+rad*Math.cos(a),cy+rad*Math.sin(a),c,alpha);
    }
  }
  function star(x,y,s=2,c=3,alpha=1){line(x-s,y,x+s,y,c,alpha);line(x,y-s,x,y+s,c,alpha);}
  return {dot,line,circle,arc,star};
}
function outline(surface){
  const src=surface.pixels,copy=src.slice(),w=surface.width,h=surface.height;
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const i=(y*w+x)*4;if(src[i+3])continue;
    let near=false;for(let yy=-1;yy<=1&&!near;yy++)for(let xx=-1;xx<=1;xx++){
      if(src[((y+yy)*w+x+xx)*4+3]>=70){near=true;break;}
    }
    if(near){copy[i]=3;copy[i+1]=3;copy[i+2]=5;copy[i+3]=255;}
  }
  surface.pixels.set(copy);
}
function identity(seed,element,effect,index){const r=createSeededRandom(deriveSeed(seed,`${element}:${effect}:identity:${index}`));return {a:r()*TAU,b:r(),c:r(),d:r(),e:r()};}
function atom(g,theme,x,y,size,alpha=1,angle=0){
  if(alpha<=.035)return;
  const physics=THEMES[theme].behavior,r=Math.max(.7,size);
  switch(physics){
    case 'convection':
      g.line(x-r*.45,y+r*.65,x+r*.22+Math.sin(angle)*r*.2,y-r*.85,2,alpha);
      g.line(x+r*.25,y+r*.55,x-r*.1,y-r*.45,3,alpha*.85);break;
    case 'crystal':
      g.line(x,y-r,x+r*.6,y,3,alpha);g.line(x+r*.6,y,x,y+r,2,alpha);
      g.line(x,y+r,x-r*.6,y,2,alpha);g.line(x-r*.6,y,x,y-r,3,alpha);break;
    case 'electric':
      g.line(x-r,y-r*.6,x+r*.1,y-r*.1,2,alpha);g.line(x+r*.1,y-r*.1,x-r*.4,y+r*.2,3,alpha);g.line(x-r*.4,y+r*.2,x+r,y+r*.7,2,alpha);break;
    case 'growth':
      g.line(x-r*.7,y+r*.3,x+r*.7,y-r*.3,1,alpha);g.dot(x-r*.2,y-r*.3,2,alpha);g.dot(x+r*.3,y+.2,3,alpha);break;
    case 'bubble':g.circle(x,y,r*.7,2,alpha);g.dot(x-r*.2,y-r*.3,3,alpha);break;
    case 'radiance':g.star(x,y,Math.max(1,r),3,alpha);break;
    case 'smoke':g.arc(x,y,Math.max(1,r),angle,angle+Math.PI*1.3,2,alpha);break;
    case 'orbit':g.star(x,y,r*.6,3,alpha);g.arc(x,y,r,angle,angle+Math.PI,1,alpha*.75);break;
    case 'gravity':g.line(x-r*.8,y+r*.5,x-r*.25,y-r*.7,1,alpha);g.line(x-r*.25,y-r*.7,x+r*.8,y+r*.4,2,alpha);g.line(x+r*.8,y+r*.4,x-r*.8,y+r*.5,3,alpha);break;
    default:g.star(x,y,r*.75,2,alpha);g.dot(x,y,3,alpha);
  }
}
function particles(g,theme,effect,seed,t,{count=15,originX=16,originY=16,speed=12,start=.15,gravity=0,drag=0,alpha=1,kind='radial'}={}){
  for(let i=0;i<count;i++){
    const p=identity(seed,theme,effect,i),birth=start+(i%6)*.015+p.d*.022,age=t-birth;
    if(age<0)continue;
    const life=(kind==='rain'? .65:.67)+(p.c-.5)*.08,fade=1-phase(age,life*.64,life);
    if(age>life||fade<=0)continue;
    const ang=p.a,velocity=speed*(.55+p.b*.55),dist=velocity*age/(1+drag*age);
    let x=originX+Math.cos(ang)*dist,y=originY+Math.sin(ang)*dist+gravity*age*age;
    if(kind==='lift'){x=originX+(p.b-.5)*10+Math.sin(t*9+p.a)*1.6;y=originY-dist;}
    if(kind==='rain'){x=4+p.b*24;y=3+velocity*age;}
    atom(g,theme,x,y,.85+p.c*1.3,alpha*fade*phase(age,0,.05),ang+t*TAU);
  }
}
function temporalPosition(t,a=.08,b=.74){return phase(t,a,b);}
function drawEffect(g,theme,effect,seed,t,options){
  const {loop,density,turbulence,radius}=options;
  const life=loop?1:oneShot(t),grow=loop?1:phase(t,.04,.27),fade=loop?1:1-phase(t,.76,.98),rr=clamp(radius,.45,1.18);
  const clock=t*TAU,osc=(angle=0)=>Math.sin(clock+angle),n=Math.round(12*clamp(density,.35,1.2));
  const ring=(r,c=2,a=life)=>g.circle(16,16,r*rr,c,a);
  const spawn=(p,x,y,size=1,a=life)=>atom(g,theme,x,y,size,a,p?.a??0);
  if(!loop&&(t<.02||t>.985))return;
  switch(effect){
    case 'aura':{
      g.arc(16,23,5*grow*rr,0,TAU,1,life*.8);
      for(let i=0;i<n;i++){const p=identity(seed,theme,effect,i),birth=(i%6)*.065+.08,age=loop?(t+i*.1)%1:t-birth;
        if(age<0||age>.77)continue;
        const x=16+(p.b-.5)*11+osc(p.a)*turbulence,y=25-age*20;
        spawn(p,x,y,1.1+p.c,life*phase(age,0,.08)*(1-phase(age,.49,.77)));}
      break;}
    case 'bolt':case 'trail':case 'volley':{
      const count=effect==='volley'?4:1;
      for(let j=0;j<count;j++){
        const stagger=j*.075,pos=temporalPosition(t-stagger,.07,.7),base=effect==='trail'?14:16+(j-(count-1)/2)*4;
        const x=2+27*pos,y=base+Math.sin(pos*TAU*1.2+j)*((effect==='trail')?3:1.5);
        const visible=life*phase(t,.06+stagger,.15+stagger)*(1-phase(t,.7+stagger,.94));
        spawn(identity(seed,theme,effect,j),x,y,2.0,visible);
        for(let k=1;k<=7;k++){
          const prev=temporalPosition(t-stagger-k*.021,.07,.7);if(prev<=0)continue;
          const xp=2+27*prev,yp=base+Math.sin(prev*TAU*1.2+j)*((effect==='trail')?3:1.5);
          spawn(identity(seed,theme,effect,j+k),xp,yp,1.7-k*.13,visible*(1-k/8));
        }
      }
      break;}
    case 'burst':case 'nova':{
      const q=phase(t,.13,.52); if(t<.42)g.circle(16,16,3+3*phase(t,.05,.2),3,life*(1-phase(t,.3,.42)),true);
      if(effect==='nova'&&t>.21)ring(3+9*q,2,life*(1-q*.65));
      particles(g,theme,effect,seed,t,{count:18,originY:16,speed:16,start:.22,gravity:theme==='earth'?9:theme==='fire'?-5:0,alpha:life});
      break;}
    case 'eruption':case 'pillar':{
      const h=15*grow*(loop?1:fade),base=25;
      g.arc(16,base,4.3,0,TAU,1,life*.75);
      for(let j=0;j<7;j++){
        const p=identity(seed,theme,effect,j),x=10+j*2+osc(j)*turbulence*.9,tip=base-h*(.5+.45*p.c)*(1+.08*osc(j));
        if(h>2)g.line(x,base-1,x+(p.b-.5)*1.5,tip,2+j%2,life*(.75+.25*p.b),j%2?1:2);
      }
      particles(g,theme,effect,seed,t,{count:13,originX:16,originY:23,speed:16,start:.15,gravity:theme==='earth'?10:theme==='fire'?-6:0,kind:'lift',alpha:life});
      break;}
    case 'orb':{
      const r=(2+5*grow*(loop?1:fade))*rr;
      g.circle(16,16,r,1,life,true);g.circle(16,16,r*.65,2,life,true);g.circle(16,16,r*.33,3,life,true);
      for(let i=0;i<6;i++){const p=identity(seed,theme,effect,i),th=p.a+clock*(loop?1:1.4),rad=r+1;
        spawn(p,16+rad*Math.cos(th),16+rad*Math.sin(th),1,life*.7);}
      break;}
    case 'portal':case 'shield':case 'sigil':case 'rune':{
      const r=(3+7*grow*(loop?1:fade))*rr;
      if(effect==='shield'){
        g.arc(16,19,r,Math.PI,TAU,2,life);
        g.arc(16,19,r-2,Math.PI,TAU,1,life*.9);
        for(let i=0;i<4;i++){
          const px=16+(i-1.5)*r*.45,py=19-Math.sqrt(Math.max(0,r*r-(px-16)**2));
          if(r>6)g.dot(px,py,3,life*(.75+.25*osc(i)**2));
        }
        for(let i=0;i<5;i++){
          const angle=Math.PI+(i/5+(loop?.035*Math.sin(clock):t*.55))*Math.PI;
          const x=16+Math.cos(angle)*r,y=19+Math.sin(angle)*r;
          spawn(identity(seed,theme,effect,40+i),x,y,1,life*.75);
        }
      }else{
        if(effect==='rune'||effect==='sigil'){
          const portions=8;
          for(let i=0;i<portions;i++){
            const reveal=loop?1:phase(t,.045+i*.028,.14+i*.028)*(1-phase(t,.72+i*.02,.975));
            if(reveal<.06)continue;g.arc(16,16,r,i*TAU/portions,(i+1)*TAU/portions,2,life*reveal);
            const th=(i+.5)*TAU/portions+(loop?.12*Math.sin(clock):clock*(effect==='rune'?.1:.04));
            spawn(identity(seed,theme,effect,i),16+r*Math.cos(th),16+r*Math.sin(th),1,life*reveal);
          }
          if(effect==='sigil'){const innerAngle=loop?.36*Math.sin(clock):clock*.6;g.arc(16,16,3,innerAngle,innerAngle+Math.PI*1.65,1,life*.75);g.star(16,16,2,3,life*.65);}
        }else{
          ring(r,2,life);ring(Math.max(2,r-2.2),1,life*.7);
          for(let i=0;i<8;i++){const th=i*TAU/8+(loop?.35*Math.sin(clock):clock*.35);
            spawn(identity(seed,theme,effect,i),16+r*Math.cos(th),16+r*Math.sin(th),1,life*.7);}
        }
      }
      break;}
    case 'rain':{
      for(let i=0;i<22;i++){
        const p=identity(seed,theme,effect,i),birth=loop? (i%6)/6 : .05+(i%7)*.037+(Math.floor(i/7))*.05+p.e*.02;
        let age=loop?(t-birth+1)%1:t-birth;if(age<0)continue;
        const falling=age*(29+p.c*8),x=4+p.b*24,y=2.5+falling;
        const alpha=life*phase(age,0,.04)*(1-phase(age,.54,.77));
        if(y>3&&y<28){spawn(p,x,y,1.15,alpha);g.line(x+.5,y-1.1,x-1,y-2.5,2,alpha*.6);}
      }
      break;}
    case 'spiral':case 'vortex':{
      const r=10*grow*rr*(loop?1:fade),spin=clock*(loop?1:1.7);
      for(let arm=0;arm<(effect==='spiral'?2:3);arm++){
        let prev=null;
        for(let j=0;j<32;j++){
          const f=j/31,ang=spin+f*Math.PI*2.0+arm*TAU/(effect==='spiral'?2:3),rad=f*r;
          const x=16+Math.cos(ang)*rad,y=16+Math.sin(ang)*rad;
          if(prev)g.line(prev[0],prev[1],x,y,arm%2?1:2,life*(.55+.45*f));prev=[x,y];
        }
      }
      if(effect==='vortex'){
        for(let i=0;i<8;i++){const p=identity(seed,theme,effect,i),th=p.a+(loop?clock:spin*1.4);
          const rad=9*(1-(loop?t:phase(t,.13,.72)))*rr;
          spawn(p,16+rad*Math.cos(th),16+rad*Math.sin(th),1,life*.8);}
      }
      break;}
  }
  // Different elemental formation grammar affects geometry AND motion, not just color.
  const type=THEMES[theme].behavior;
  if(!loop && t<.1)return;
  const modulation=life*.65;
  if(['bolt','trail','volley'].includes(effect))return;
  if(type==='convection'){
    for(let j=0;j<5;j++){const p=identity(seed,theme,effect,30+j),y=23-grow*(4+p.b*10)+Math.sin(clock*2+p.a)*1.4;
      spawn(p,12+j*2+(p.c-.5)*2,y,1.2+p.b,modulation*.9);}
  }else if(type==='crystal'){
    for(let j=0;j<3;j++){const p=identity(seed,theme,effect,30+j),a=p.a+(loop?.2*Math.sin(clock):clock*.2);
      g.line(16,16,16+Math.cos(a)*(3+5*grow),16+Math.sin(a)*(3+5*grow),3,modulation*.65);}
  }else if(type==='electric'){
    for(let j=0;j<2;j++){const p=identity(seed,theme,effect,30+j),x=12+j*6,y=13+osc(j)*2;
      g.line(x-2,y-3,x+1,y,3,modulation*.8);g.line(x+1,y,x-1,y+4,2,modulation*.8);}
  }else if(type==='growth'){
    for(let j=0;j<4;j++){const a=j*TAU/4+(loop?.4*Math.sin(clock):clock*.4);
      spawn(identity(seed,theme,effect,30+j),16+5*grow*Math.cos(a),16+5*grow*Math.sin(a),1.4,modulation);}
  }else if(type==='bubble'){
    for(let j=0;j<5;j++){const p=identity(seed,theme,effect,30+j),y=23-14*((t+p.b)%1);
      g.circle(11+j*2,y,1+(j%2),2,modulation*.8);}
  }else if(type==='radiance'){
    g.star(16,16,3,3,modulation*.75);
  }else if(type==='smoke'){
    const a=loop?.6*Math.sin(clock):clock*.6;g.arc(16,16,5,a,a+Math.PI*1.2,1,modulation);
  }else if(type==='orbit'){
    for(let j=0;j<4;j++){const th=clock+j*TAU/4;
      spawn(identity(seed,theme,effect,30+j),16+5*Math.cos(th),16+5*Math.sin(th),1,modulation);}
  }else if(type==='gravity'){
    for(let j=0;j<4;j++){const p=identity(seed,theme,effect,30+j),age=loop?(t+p.e)%1:Math.max(0,t-.2);
      spawn(p,12+j*2,10+(p.c*4)+15*age*age,1.4,modulation*(1-phase(age,.65,.95)));}
  }else{
    for(let j=0;j<4;j++){const p=identity(seed,theme,effect,30+j);
      spawn(p,16+Math.cos(p.a)*5*grow,16+Math.sin(p.a)*5*grow,1,modulation);}
  }
}
export function generateFrame({element='fire',formation='sigil',seed='magic-001',time=0,loop=false,density=.7,turbulence=.35,radius=.9,outlinePixels=true}={}){
  if(!Object.hasOwn(THEMES,element))throw new RangeError('Unknown magic element');
  if(!EFFECTS.includes(formation))throw new RangeError('Unknown magic effect');
  if(!Number.isFinite(time)||time<0||time>=1)throw new RangeError('Time must be within [0,1)');
  if(loop&&!SUSTAINED.includes(formation))throw new RangeError('Only sustained formations may loop');
  const surface=createRasterSurface({width:32,height:32,transparent:true});
  const g=makeBrush(surface,THEMES[element].colors,THEMES[element].behavior);drawEffect(g,element,formation,String(seed),time,{loop,density,turbulence,radius});
  if(outlinePixels)outline(surface);
  return surface;
}
export function buildAnimationSurface({element='fire',formation='sigil',seed='magic-001',frameCount=24,loop=false,density=.7,turbulence=.35,radius=.9}={}){
  if(!Number.isInteger(frameCount)||frameCount<8||frameCount>32)throw new RangeError('Invalid frame count');
  const sheet=createRasterSurface({width:32*frameCount,height:32,transparent:true});
  for(let i=0;i<frameCount;i++){
    const frame=generateFrame({element,formation,seed,time:i/frameCount,loop,density,turbulence,radius});
    if(!loop&&i===frameCount-1)frame.pixels.fill(0);
    for(let y=0;y<32;y++){const src=y*32*4, dst=(y*sheet.width+i*32)*4;sheet.pixels.set(frame.pixels.subarray(src,src+32*4),dst);}
  }
  return sheet;
}
