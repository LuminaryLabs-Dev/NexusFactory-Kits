const rad=(degrees)=>degrees*Math.PI/180;
export function generateBranchSkeleton({rng,origin,height,trunkCount=5,branchFrequency=0.35,branchAngle=[28,56],curvature=0.15,taper=0.7,spread=0.55,asymmetry=0.2}){
  const segments=[]; const [ox,oy]=origin;
  for(let t=0;t<trunkCount;t++){
    const lateral=(t-(trunkCount-1)/2)*spread*height*0.16 + rng.range(-1,1)*asymmetry*height*0.08;
    const trunkHeight=height*rng.range(0.72,1.02); const bend=rng.range(-1,1)*curvature*height + lateral*0.25;
    let prev=[ox+lateral*0.28,oy], currentRadius=Math.max(1,height*0.035*rng.range(0.8,1.2)); const nodes=Math.max(3,Math.round(4+branchFrequency*10));
    for(let n=1;n<=nodes;n++){
      const u=n/nodes; const curve=bend*u*u + Math.sin(u*Math.PI)*rng.range(-1,1)*curvature*height*0.12; const next=[ox+lateral+curve,oy-trunkHeight*u];
      segments.push({a:prev,b:next,radius:Math.max(1,currentRadius*(1-u*0.55))}); prev=next;
      if(n<nodes && rng.chance(Math.min(0.9,branchFrequency+u*0.2))){
        const dir=(n+t)%2?1:-1; const angle=rad(rng.range(branchAngle[0],branchAngle[1])); const len=height*rng.range(0.12,0.28)*(1-u*0.35); const bias=1+asymmetry*rng.range(-0.6,0.9)*dir; const ex=next[0]+dir*Math.sin(angle)*len*bias, ey=next[1]-Math.cos(angle)*len; segments.push({a:next,b:[ex,ey],radius:Math.max(1,currentRadius*taper*(1-u*0.25)),tip:true});
      }
    }
  }
  return segments;
}
export function generateFanNetwork({rng,origin,height,width,ribCount=10,connectivity=0.7,asymmetry=0.1}){
  const [ox,oy]=origin,ribs=[],connectors=[];
  for(let i=0;i<ribCount;i++){ const u=i/(ribCount-1),centered=u*2-1, envelope=Math.cos(centered*Math.PI*0.5), ex=ox+centered*width*0.5*(1+rng.range(-1,1)*asymmetry), ey=oy-height*(0.72+0.28*envelope)+rng.range(-2,2); ribs.push([[ox,oy],[ox+centered*width*0.18,oy-height*0.28],[ex,ey]]); }
  for(let i=0;i<ribs.length-1;i++)for(const u of [0.42,0.58,0.74,0.88])if(rng.chance(connectivity)){ const p=(path,t)=>{const a=path[0],b=path[1],c=path[2]; if(t<0.5){const q=t*2;return[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];}const q=(t-0.5)*2;return[b[0]+(c[0]-b[0])*q,b[1]+(c[1]-b[1])*q];}; connectors.push([p(ribs[i],u),p(ribs[i+1],Math.min(0.96,u+rng.range(-0.04,0.04)))]); }
  return {ribs,connectors};
}
export function generateFronds({rng,origin,count=5,height=42,width=24,asymmetry=0.15}){
  const [ox,oy]=origin,fronds=[];
  for(let i=0;i<count;i++){ const dir=i%2?1:-1,u=(i+1)/(count+1),baseY=oy-height*(0.12+u*0.48),len=width*rng.range(0.55,1.02)*(1+dir*asymmetry*rng.range(-0.4,0.8)),lift=height*rng.range(0.18,0.38),thickness=rng.range(2.5,4.5); fronds.push({points:[[ox,baseY],[ox+dir*len*0.45,baseY-lift*0.35],[ox+dir*len,baseY-lift]],radius:thickness}); }
  return fronds;
}
export function generateLayeredPlates({rng,origin,layers=6,width=48,height=38,curl=0.2}){
  const [ox,oy]=origin,paths=[];
  for(let i=0;i<layers;i++){ const u=i/(layers-1||1),y=oy-u*height,w=width*(0.45+0.55*u),phase=rng.range(0,Math.PI*2),points=[]; for(let s=0;s<=24;s++){const t=s/24,x=ox-w/2+w*t,edge=Math.sin(t*Math.PI),yy=y+Math.sin(t*Math.PI*3+phase)*2.2+edge*curl*6;points.push([x,yy]);} paths.push({points,radius:1+i%2}); }
  return paths;
}
