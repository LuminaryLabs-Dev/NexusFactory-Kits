import * as T from 'three';
import {mergeGeometries,mergeVertices,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {rocks} from './catalogue.mjs';
import {stream,mix,clamp} from './random.mjs';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const noise=(x,y,z)=>Math.sin(x*2.31+y*3.73+z*.82)*.45+Math.sin(x*5.72-y*2.17+z*3.32)*.3+Math.sin(x*11.3+y*7.2-z*8.1)*.15;
export const visualDefaults={rockRelief:1,termination:1,colorPockets:1,grain:1};
function faceGeometry(faces,colorFor){const pos=[],col=[],uv=[];for(const face of faces)for(let i=1;i<face.length-1;i++)for(const p of [face[0],face[i],face[i+1]]){pos.push(p.x,p.y,p.z);uv.push(p.x*.73+p.z*.41,p.y*.81+p.z*.59);if(colorFor){const c=colorFor(p);col.push(c.r,c.g,c.b);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colorFor)g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;}
function convexWinding(faces,inside){for(const f of faces){const n=f[1].clone().sub(f[0]).cross(f[2].clone().sub(f[0]));const c=f.reduce((a,b)=>a.add(b),V()).divideScalar(f.length);if(n.dot(c.sub(inside))<0)f.reverse();}return faces;}
function clipFaces(faces,n,d){const next=[],cap=[];for(const f of faces){const out=[];for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],da=n.dot(a)-d,db=n.dot(b)-d,insideA=da<=1e-10,insideB=db<=1e-10;if(insideA)out.push(a);if(insideA!==insideB){const p=a.clone().lerp(b,da/(da-db));out.push(p);}}const clean=out.filter((p,i)=>!i||p.distanceToSquared(out[i-1])>1e-16);if(clean.length>2&&clean[0].distanceToSquared(clean.at(-1))<1e-16)clean.pop();for(const p of clean)if(Math.abs(n.dot(p)-d)<1e-8&&!cap.some(c=>c.distanceToSquared(p)<1e-16))cap.push(p);if(clean.length>=3)next.push(clean);}
 if(cap.length>=3){const center=cap.reduce((a,b)=>a.add(b),V()).divideScalar(cap.length),u=(Math.abs(n.y)<.9?V(0,1,0):V(1,0,0)).cross(n).normalize(),v=n.clone().cross(u).normalize();cap.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));next.push(cap);}return next;}
function crystalFaces(width,height,p,r,double=false){
 const radius=width/2,base=[],top=[],phase=r()*6.28;
 for(let i=0;i<6;i++){const a=phase+i*Math.PI/3,rad=radius*(1+(r()-.5)*p.facetVariation);base.push(V(Math.cos(a)*rad,0,Math.sin(a)*rad));top.push(V(Math.cos(a)*rad,height,Math.sin(a)*rad));}
 let faces=[[...base].reverse(),top];for(let i=0;i<6;i++)faces.push([base[i],base[(i+1)%6],top[(i+1)%6],top[i]]);
 // Cut an actual hexagonal prism with six unequal rhombohedral termination planes.
 const ox=(r()-.5)*width*p.tipOffset,oz=(r()-.5)*width*p.tipOffset;
 for(let i=0;i<6;i++){const a=phase+(i+.5)*Math.PI/3,slope=radius/(height*p.terminationHeightRatio)*(i%2?.87:1.12),n=V(Math.cos(a),slope,Math.sin(a));faces=clipFaces(faces,n,height*slope+ox*n.x+oz*n.z);}
 if(double)for(let i=0;i<6;i++){const a=phase+(i+.5)*Math.PI/3,slope=radius/(height*.27),n=V(Math.cos(a),-slope,Math.sin(a));faces=clipFaces(faces,n,0);}
 const chipped=r()<p.chipProbability;if(chipped)faces=clipFaces(faces,V(.17,1,-.12),height*(1-p.chipDepth));
 return {faces:convexWinding(faces,V(0,height*.5,0)),chipped};
}
function texture(seed){const r=stream(seed,'texture'),n=128,bytes=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=Math.round(130+r()*90+25*noise(x*.2,0,y*.2));const i=(y*n+x)*4;bytes[i]=bytes[i+1]=bytes[i+2]=v;bytes[i+3]=255;}const tx=new T.DataTexture(bytes,n,n);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.LinearFilter;tx.minFilter=T.LinearMipmapLinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;return tx;}
function setup(x,visual){const p=x.values,d=x.derived,mat=rocks[x.rock].material,grain=texture(x.streamSeeds.rock);return {
 crystal:new T.MeshPhysicalMaterial({vertexColors:true,roughness:p.crystalRoughness,transmission:p.transmission,thickness:d.crystalWidth??p.size*.45,ior:mat.ior,attenuationColor:'#663285',attenuationDistance:p.size*.12,metalness:0,clearcoat:.32,clearcoatRoughness:.1}),
 rock:new T.MeshStandardMaterial({vertexColors:true,color:'#b0afa8',map:grain,roughness:p.rockRoughness??.9,bumpMap:grain,bumpScale:(p.rockGrain??.04)*visual.grain}),
 lining:new T.MeshStandardMaterial({vertexColors:true,roughness:.7,bumpMap:grain,bumpScale:.022*visual.grain}),
 cut:new T.MeshPhysicalMaterial({vertexColors:true,roughness:p.cutRoughness??.65,clearcoat:x.categories.preparation==='polishedRim'?.3:0})};}
function mesh(g,mat,name){if(name==='layered-host'||name.includes('outer'))g=toCreasedNormals(g,Math.PI*.24);const m=new T.Mesh(g,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;}
function colorField(p,phase,v,x,visual){const f=.5+.5*noise(x.x*p.colorPocketScale,x.y*.45+phase,x.z*p.colorPocketScale);const t=clamp(.35+p.colorDepth*.55+f*p.colorContrast*visual.colorPockets,0,1);const deep=new T.Color('#24043e'),light=new T.Color('#9051af');const c=light.lerp(deep,t);return c.lerp(new T.Color('#b1a0b5'),p.cloudiness*.17*(1-v));}
function appendCrystal(list,s,p,r,phase,visual){const c=crystalFaces(s.width,s.height,p,r,s.double),g=faceGeometry(c.faces,q=>colorField(p,phase,q.y/s.height,s.point.clone().add(q.clone().multiplyScalar(.4)),visual));const rotation=new T.Quaternion().setFromUnitVectors(V(0,1,0),s.normal);g.applyQuaternion(rotation);g.translate(s.point.x,s.point.y,s.point.z);list.push(g);return c.chipped;}
function joinCrystals(group,geoms,mat){if(geoms.length){group.add(mesh(mergeGeometries(geoms),mat,'amethyst-growth'));for(const g of geoms)g.dispose();}}
function raySurface(faces){const g=faceGeometry(faces),m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld(true);const ray=new T.Raycaster();return {hit(origin,direction){ray.set(origin,direction);return ray.intersectObject(m,false)[0];},dispose(){g.dispose();m.material.dispose();}};}
function makeRaw(x,visual,mats){const p=x.values,d=x.derived,r=stream(x.streamSeeds.rock,'base'),pr=stream(x.streamSeeds.placement,'growth'),sr=stream(x.streamSeeds.shape,'facets'),phase=r()*6.28,colorPhase=stream(x.streamSeeds.color,'field')()*6.28;
 const group=new T.Group(),N=64,R=16,w=p.size,depth=d.baseDepth;
 const outline=a=>{const irregular=1+p.outlineIrregularity*(.55*Math.sin(a*3+phase)+.25*Math.sin(a*7-phase)+.14*Math.sin(a*13));const wedge=x.categories.baseShape==='wedge'?(.78+.22*Math.cos(a)):1;return [Math.cos(a)*w*.5*irregular,Math.sin(a)*depth*.5*irregular*wedge];};
 const h=(xx,zz)=>d.baseThickness+p.size*p.surfaceRelief*.28*noise(xx*.8,phase,zz*.8)+p.size*p.fractureDepth*.22*visual.rockRelief*noise(xx*2.2,phase,zz*2.2)+(x.categories.baseShape==='wedge'?xx*.09:0);
 const pale=(xx,zz)=>d.paleLayerThickness*(1+p.layerVariation*noise(xx*2,phase,zz*2));
 const seam=(xx,zz)=>d.brownSeamThickness*(1+p.layerVariation*noise(xx*3,phase,zz*3));
 const rings=[];for(let j=1;j<=R;j++)rings.push(Array.from({length:N},(_,i)=>{const [a,b]=outline(i*2*Math.PI/N);return V(a*j/R,h(a*j/R,b*j/R),b*j/R);}));
 const faces=[],center=V(0,h(0,0),0);for(let i=0;i<N;i++){const n=(i+1)%N;faces.push([center,rings[0][n],rings[0][i]]);for(let j=1;j<R;j++)faces.push([rings[j-1][i],rings[j-1][n],rings[j][n]],[rings[j-1][i],rings[j][n],rings[j][i]]);}
 const topFaces=faces.map(f=>f.map(v=>v.clone())),border=rings.at(-1);const sideRings=[border];
 for(let k=1;k<=7;k++)sideRings.push(border.map((q,i)=>{let yy;if(k===1)yy=q.y-pale(q.x,q.z);else if(k===2)yy=q.y-pale(q.x,q.z)-seam(q.x,q.z);else yy=mix(q.y-pale(q.x,q.z)-seam(q.x,q.z),0,(k-2)/5);
 const scale=1-(k/7)*.08+Math.sin(k*Math.PI/7)*p.fractureDepth*visual.rockRelief*noise(i*.7,k,phase);return V(q.x*scale,yy,q.z*scale);}));
 for(let k=0;k<7;k++)for(let i=0;i<N;i++){const n=(i+1)%N;faces.push([sideRings[k][i],sideRings[k][n],sideRings[k+1][n]],[sideRings[k][i],sideRings[k+1][n],sideRings[k+1][i]]);}for(let i=0;i<N;i++)faces.push([V(),sideRings[7][i],sideRings[7][(i+1)%N]]);
 const hostColor=q=>{const dep=h(q.x,q.z)-q.y;const col=new T.Color(dep<=pale(q.x,q.z)*.99?'#c8c2b5':dep<=pale(q.x,q.z)+seam(q.x,q.z)?'#846047':'#42443b');return col.multiplyScalar(.9+.18*noise(q.x*3,q.y*4,q.z*3));};
 group.add(mesh(faceGeometry(faces,hostColor),mats.rock,'layered-host'));
 const surface=raySurface(topFaces),occupied=[],geoms=[];let chipped=0,rejected=0;const counts={primary:0,secondary:0,filler:0};
 const hit=(xx,zz)=>surface.hit(V(xx,10,zz),V(0,-1,0));
 const add=(kind,count,sizeRatio)=>{for(let i=0;i<count;i++)for(let attempt=0;attempt<65;attempt++){
 const width=d.crystalWidth*sizeRatio*mix(.78,1.25,pr()),rad=width*.5,xx=(pr()-.5)*w,zz=(pr()-.5)*depth;
 if(x.categories.growthPattern==='patchy'&&noise(xx*1.7,phase,zz*1.7)<-.1)continue;
 if(occupied.some(o=>Math.hypot(xx-o.x,zz-o.z)<(rad+o.radius)*.91))continue;
 const centerHit=hit(xx,zz);if(!centerHit)continue;const samples=[];for(let j=0;j<8;j++){const a=j*Math.PI/4;const q=hit(xx+Math.cos(a)*(rad*1.08+width*p.leanAmount),zz+Math.sin(a)*(rad*1.08+width*p.leanAmount));if(q)samples.push(q.point.y);}
 if(samples.length<8){rejected++;continue;}const exposed=width*p.exposedHeightToWidth*mix(.85,1.1,pr()),burial=width*p.rootBurialRatio,rootY=Math.min(...samples,centerHit.point.y)-burial;
 if(rootY<d.brownSeamThickness+.03){rejected++;continue;}
 const normal=centerHit.face.normal.clone();if(normal.y<0)normal.negate();normal.lerp(V(0,1,0),.6);normal.x+=(pr()-.5)*p.leanAmount;normal.z+=(pr()-.5)*p.leanAmount;normal.normalize();
 chipped+=appendCrystal(geoms,{point:V(xx,rootY,zz),width,height:exposed+centerHit.point.y-rootY,normal},p,sr,colorPhase,visual);occupied.push({x:xx,z:zz,radius:rad});counts[kind]++;break;
 }};
 add('primary',p.primaryCrystalCount,1.3);add('secondary',d.secondaryCount,.8);add('filler',Math.round(d.secondaryCount*2.8),p.fillerSizeRatio);
 joinCrystals(group,geoms,mats.crystal);surface.dispose();group.userData={recipe:x.recipe,counts,chipped,rejectedPlacements:rejected,attachment:'8 actual triangulated-surface footprint samples; conservative spacing; no exact intercrystal Boolean guarantee'};return group;
}
function makeCavity(x,visual,mats){const p=x.values,d=x.derived,r=stream(x.streamSeeds.rock,'cavity'),pr=stream(x.streamSeeds.placement,'growth'),sr=stream(x.streamSeeds.shape,'facets'),phase=r()*6.28,colorPhase=stream(x.streamSeeds.color,'field')()*6.28;
 const cut=x.recipe==='cut-cavity',N=96,R=28,rx=p.size*.5,rz=d.baseDepth*.5,dep=d.cavityDepth,max=p.openingAngle,th=d.baseThickness;
 const thetaMax=a=>max+(cut?0:p.rimBreakage*Math.sin(a*3+phase)+p.rimBreakage*.35*Math.sin(a*7));
 const point=(t,a)=>{const shape=1+p.outlineIrregularity*.55*Math.sin(a*3+phase)*Math.sin(t)**2;return V(rx*Math.sin(t)*Math.cos(a)*shape,dep*(1-Math.cos(t)),rz*Math.sin(t)*Math.sin(a)*shape);};
 const normal=(t,a)=>V(-Math.sin(t)*Math.cos(a)/rx,Math.cos(t)/dep,-Math.sin(t)*Math.sin(a)/rz).normalize();
 const rings=Array.from({length:R},(_,j)=>Array.from({length:N},(_,i)=>point(thetaMax(i*2*Math.PI/N)*(j+1)/R,i*2*Math.PI/N)));
 const inner=[],outer=[],rim=[];const outerPoint=(q,t,a)=>q.clone().addScaledVector(normal(t,a),-th*(1+p.fractureDepth*visual.rockRelief*noise(q.x*3,phase,q.z*3)));
 const outerRings=rings.map((ring,j)=>ring.map((q,i)=>outerPoint(q,thetaMax(i*2*Math.PI/N)*(j+1)/R,i*2*Math.PI/N)));
 for(let i=0;i<N;i++){const n=(i+1)%N;inner.push([V(),rings[0][n],rings[0][i]]);outer.push([V(0,-th,0),outerRings[0][i],outerRings[0][n]]);for(let j=1;j<R;j++){inner.push([rings[j-1][i],rings[j-1][n],rings[j][n]],[rings[j-1][i],rings[j][n],rings[j][i]]);outer.push([outerRings[j-1][i],outerRings[j][n],outerRings[j-1][n]],[outerRings[j-1][i],outerRings[j][i],outerRings[j][n]]);}
 const bands=[0,p.paleLayerRatio,p.paleLayerRatio+p.brownSeamRatio,1];for(let j=0;j<3;j++){const a=rings.at(-1)[i].clone().lerp(outerRings.at(-1)[i],bands[j]),b=rings.at(-1)[n].clone().lerp(outerRings.at(-1)[n],bands[j]),c=rings.at(-1)[n].clone().lerp(outerRings.at(-1)[n],bands[j+1]),dd=rings.at(-1)[i].clone().lerp(outerRings.at(-1)[i],bands[j+1]);rim.push({face:[a,b,c,dd],band:j});}}
 const group=new T.Group();group.add(mesh(faceGeometry(inner,q=>new T.Color('#b6a9b6').multiplyScalar(.95+.1*noise(q.x*4,phase,q.z*4))),mats.lining,'cavity-lining'));
 group.add(mesh(faceGeometry(outer,q=>new T.Color('#41483d').multiplyScalar(.85+.22*noise(q.x*4,q.y*4,q.z*4))),mats.rock,'outer-shell'));
 for(let b=0;b<3;b++)group.add(mesh(faceGeometry(rim.filter(f=>f.band===b).map(f=>f.face),q=>new T.Color(['#d3cfc2','#8b684b','#4b5144'][b]).multiplyScalar(1+.08*noise(q.x*4,phase,q.z*4))),mats.cut,`rim-${b}`));
 const surface=raySurface(inner),occupied=[],geoms=[];let chipped=0;const counts={primary:0,secondary:0,filler:0};
 const add=(kind,count,scale)=>{for(let i=0;i<count;i++)for(let k=0;k<60;k++){const a=pr()*Math.PI*2,t=Math.acos(mix(1,Math.cos(max*.9),pr())),width=d.crystalWidth*scale*mix(.8,1.2,pr()),edge=width/rx*1.15;if(t>thetaMax(a)-edge)continue;const q=point(t,a);if(occupied.some(o=>o.q.distanceTo(q)<(o.w+width)*.49))continue;
 const origin=V(0,dep+.005,0),hit=surface.hit(origin,q.clone().sub(origin).normalize());if(!hit)continue;const n=hit.face.normal.clone();if(n.dot(origin.clone().sub(hit.point))<0)n.negate();const bury=Math.min(width*p.rootBurialRatio,th*.42),root=hit.point.clone().addScaledVector(n,-bury);
 chipped+=appendCrystal(geoms,{point:root,width,height:Math.min(width*p.exposedHeightToWidth+bury,Math.min(rx,rz,dep)*.38),normal:n},p,sr,colorPhase,visual);occupied.push({q:hit.point,w:width});counts[kind]++;break;}};
 add('primary',p.primaryCrystalCount,1.35);add('secondary',Math.round(d.secondaryCount*1.65),.85);add('filler',Math.round(d.secondaryCount*2.5),p.fillerSizeRatio);
 joinCrystals(group,geoms,mats.crystal);surface.dispose();group.rotation.x=.3;group.userData={recipe:x.recipe,counts,chipped,cutPlane:cut?dep:null,attachment:'Raycast actual inner shell; buried roots; radius-based rim clearance',shellThickness:th};return group;
}
function makeFragment(x,visual,mats){const p=x.values,d=x.derived,r=stream(x.streamSeeds.rock,'fragment'),pr=stream(x.streamSeeds.placement,'growth'),sr=stream(x.streamSeeds.shape,'facets'),phase=r()*6.28,colorPhase=stream(x.streamSeeds.color,'field')()*6.28,N=72,R=24,rx=p.size*.5,rz=d.baseDepth*.5,dep=d.cavityDepth,th=d.baseThickness;
 const normal=(t,a)=>V(-Math.sin(t)*Math.cos(a)/rx,Math.cos(t)/dep,-Math.sin(t)*Math.sin(a)/rz).normalize();
 const point=(t,a)=>{const irregular=1+p.outlineIrregularity*.5*Math.sin(a*3+phase)*Math.sin(t);return V(rx*Math.sin(t)*Math.cos(a)*irregular,dep*(1-Math.cos(t)),rz*Math.sin(t)*Math.sin(a)*irregular);};
 const aFor=i=>-Math.PI*.5-p.fragmentArc*.5+i/N*p.fragmentArc;
 const tFor=(j,a)=>mix(p.fragmentStart,p.openingAngle+p.rimBreakage*Math.sin(a*5+phase),j/R);
 const inside=Array.from({length:R+1},(_,j)=>Array.from({length:N+1},(_,i)=>point(tFor(j,aFor(i)),aFor(i))));
 const outside=inside.map((row,j)=>row.map((q,i)=>q.clone().addScaledVector(normal(tFor(j,aFor(i)),aFor(i)),-th*(1+p.fractureDepth*2*noise(q.x*2,phase,q.z*2)))));
 const inner=[],outer=[],edges=[];for(let j=0;j<R;j++)for(let i=0;i<N;i++){inner.push([inside[j][i],inside[j][i+1],inside[j+1][i+1]],[inside[j][i],inside[j+1][i+1],inside[j+1][i]]);outer.push([outside[j][i],outside[j+1][i+1],outside[j][i+1]],[outside[j][i],outside[j+1][i],outside[j+1][i+1]]);}
 for(let i=0;i<N;i++){edges.push([[R,i],[R,i+1]],[[0,i+1],[0,i]]);}for(let j=0;j<R;j++){edges.push([[j,0],[j+1,0]],[[j+1,N],[j,N]]);}
 const group=new T.Group();group.add(mesh(faceGeometry(inner,q=>new T.Color('#ac9cae').multiplyScalar(.94+.16*noise(q.x*4,phase,q.z*4))),mats.lining,'fragment-lining'));group.add(mesh(faceGeometry(outer,q=>new T.Color('#42483c').multiplyScalar(.88+.2*noise(q.x*4,q.y*4,q.z*4))),mats.rock,'fragment-outer'));
 const bands=[0,p.paleLayerRatio,p.paleLayerRatio+p.brownSeamRatio,1];for(let b=0;b<3;b++){const fs=edges.map(([a,c])=>{const p0=inside[a[0]][a[1]],p1=inside[c[0]][c[1]],q0=outside[a[0]][a[1]],q1=outside[c[0]][c[1]];return [p0.clone().lerp(q0,bands[b]),p1.clone().lerp(q1,bands[b]),p1.clone().lerp(q1,bands[b+1]),p0.clone().lerp(q0,bands[b+1])];});group.add(mesh(faceGeometry(fs,q=>new T.Color(['#cec8ba','#7f563d','#434637'][b]).multiplyScalar(.88+.16*noise(q.x*5,q.y*5,q.z*5))),mats.rock,`broken-end-${b}`));}
 const surface=raySurface(inner),occupied=[],geoms=[],counts={primary:0,secondary:0,filler:0};let chipped=0;const add=(kind,count,scale)=>{for(let i=0;i<count;i++)for(let k=0;k<60;k++){const a=aFor(pr()*N),t=mix(p.fragmentStart,p.openingAngle,pr()),width=d.crystalWidth*scale*mix(.8,1.2,pr()),margin=width/rx;
 if(t<p.fragmentStart+margin||t>tFor(R,a)-margin||a<aFor(0)+margin||a>aFor(N)-margin)continue;const q=point(t,a);if(occupied.some(o=>o.q.distanceTo(q)<(o.w+width)*.49))continue;const origin=V(0,dep,0),hit=surface.hit(origin,q.clone().sub(origin).normalize());if(!hit)continue;const n=hit.face.normal.clone();if(n.dot(origin.clone().sub(hit.point))<0)n.negate();const burial=Math.min(width*p.rootBurialRatio,th*.4);chipped+=appendCrystal(geoms,{point:hit.point.clone().addScaledVector(n,-burial),width,height:Math.min(width*p.exposedHeightToWidth+burial,dep*.35),normal:n},p,sr,colorPhase,visual);occupied.push({q:hit.point,w:width});counts[kind]++;break;}};
 add('primary',p.primaryCrystalCount,1.3);add('secondary',d.secondaryCount,.8);add('filler',d.secondaryCount*2,p.fillerSizeRatio);joinCrystals(group,geoms,mats.crystal);surface.dispose();group.rotation.x=.15;group.userData={recipe:x.recipe,counts,chipped,fragmentArc:p.fragmentArc,attachment:'Actual surface raycast and rim/end margin',shellThickness:th};return group;
}
function makeSingle(x,visual,mats){const p=x.values,d=x.derived,r=stream(x.streamSeeds.shape,'facets'),phase=stream(x.streamSeeds.color,'field')()*6.28,group=new T.Group(),geoms=[];const normal=V(Math.sin(p.leanAmount),Math.cos(p.leanAmount),.13).normalize();const chipped=appendCrystal(geoms,{point:V(),width:d.crystalWidth,height:d.crystalHeight,normal,double:x.categories.baseShape==='doubleTerminated'},p,r,phase,visual);joinCrystals(group,geoms,mats.crystal);group.userData={recipe:x.recipe,counts:{single:1},chipped,termination:x.categories.baseShape};return group;}
function makeTumbled(x,visual,mats){const p=x.values,d=x.derived,phase=stream(x.streamSeeds.shape,'solid')()*6.28,colorPhase=stream(x.streamSeeds.color,'field')()*6.28;
 let g=new T.IcosahedronGeometry(1,24);const pos=g.attributes.position,colors=[];for(let i=0;i<pos.count;i++){const q=V().fromBufferAttribute(pos,i);const shape=1+(p.roundness-1)*.3*(q.x*q.x*q.x*q.x+q.z*q.z*q.z*q.z);const asym=x.categories.baseShape==='roundedFreeform'?1+.14*q.x+.08*q.z:1;const rr=asym*shape*(1+p.outlineIrregularity*noise(q.x*1.3,phase,q.z*1.3));q.set(q.x*p.size*.5*rr,q.y*d.solidHeight*.5*rr,q.z*d.baseDepth*.5*rr);pos.setXYZ(i,q.x,q.y,q.z);const c=colorField(p,colorPhase,.5,q,visual);const veil=Math.exp(-Math.pow(noise(q.x*.65,q.y*.5+colorPhase,q.z*.6)/.38,2))*p.cloudiness*.3;c.lerp(new T.Color('#c4afd4'),veil);colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g=toCreasedNormals(g,Math.PI);const group=new T.Group();group.add(mesh(g,mats.crystal,'tumbled-solid'));group.userData={recipe:x.recipe,counts:{solid:1},surface:'Continuous rounded mesh; no discrete crystal tips or host slab'};return group;}
export function construct(x,{visual=visualDefaults}={}){visual={...visualDefaults,...visual};const mats=setup(x,visual);let group;if(x.recipe==='attached-cluster')group=makeRaw(x,visual,mats);else if(x.recipe==='cavity-fragment')group=makeFragment(x,visual,mats);else if(x.recipe==='cut-cavity')group=makeCavity(x,visual,mats);else if(x.recipe==='single-crystal')group=makeSingle(x,visual,mats);else if(x.recipe==='rounded-solid')group=makeTumbled(x,visual,mats);else throw new Error('Unsupported recipe');
 group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(group);group.position.y-=box.min.y;group.updateMatrixWorld(true);group.name=x.profile;group.userData={...group.userData,profile:x.profile,seed:x.seed,synthetic:true,units:'centimeters',visual};return group;
}
