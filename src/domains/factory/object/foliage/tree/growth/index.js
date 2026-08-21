import { defineDomain } from "../../../../../../domain.js";
import { createRandomStream } from "../../../../../../foundation/random.js";
import { add, normalize, scale } from "../../../../../../foundation/geometry.js";
export const TREE_GROWTH_SCHEMA="nexusfactory.tree-growth/1";
export const treeGrowthDomain=defineDomain({id:"factory-object-foliage-tree-growth-domain",domainPath:"n:factory:object:foliage:tree:growth",parentDomainPath:"n:factory:object:foliage:tree",requires:["factory:object:foliage:tree"],provides:["tree:growth"],owns:["growth axes","leader competition abstraction","maturity posture","terminal regions"],doesNotOwn:["curve fitting","mesh construction","foliage geometry"],services:["tree-growth"]});
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function pointAt(points,t){const i=clamp(Math.round(t*(points.length-1)),0,points.length-1);return points[i];}
export function generateTreeGrowth({seed,params}){
  const rng=createRandomStream(`${seed}:growth`),height=4.4+params.maturity*4.9,trunkRadius=.17+params.maturity*.31,trunkSteps=7;
  const trunk=[];let pos=[0,0,0],dir=[0,1,0];trunk.push([...pos]);
  for(let i=1;i<=trunkSteps;i++){const t=i/trunkSteps,lateral=(1-params.upwardGrowth)*.11+.025;dir=normalize([dir[0]*.82+rng.range(-lateral,lateral),dir[1]*.82+.42*params.upwardGrowth-.07*params.gravityPull*t,dir[2]*.82+rng.range(-lateral,lateral)]);pos=add(pos,scale(dir,height/trunkSteps));trunk.push([...pos]);}
  const axes=[{id:"trunk",kind:"trunk",parentId:null,points:trunk,radiusStart:trunkRadius,radiusEnd:trunkRadius*.32,importance:1}];
  const sideLeaderCount=clamp(Math.round(4-1.7*params.leaderDominance),2,4),spread=.58+params.branchSpread*.92;
  for(let i=0;i<sideLeaderCount;i++){
    const spawnT=.43+.38*(i+.55)/sideLeaderCount,start=pointAt(trunk,spawnT),az=Math.PI*2*i/sideLeaderCount+params.branchSeparation*.62*i+rng.range(-.22,.22),outward=[Math.cos(az),0,Math.sin(az)];let d=normalize([outward[0]*spread,.36+params.upwardGrowth*.42-params.gravityPull*.18,outward[2]*spread]);const axisLength=height*(.27+params.maturity*.10)*rng.range(.9,1.08),points=[[...start]];let current=[...start];
    for(let j=1;j<=4;j++){const t=j/4;d=normalize([d[0]+rng.range(-.055,.055),d[1]+.07*params.upwardGrowth-.14*params.gravityPull*t,d[2]+rng.range(-.055,.055)]);current=add(current,scale(d,axisLength/4));points.push([...current]);}
    const id=`leader-${i+1}`;axes.push({id,kind:"leader",parentId:"trunk",points,radiusStart:trunkRadius*(.42+.10*params.maturity),radiusEnd:trunkRadius*.08,importance:.78});
    const secondaryCount=params.branchDensity>.72?2:params.branchDensity>.46?1:0;
    for(let b=0;b<secondaryCount;b++){const attach=pointAt(points,.5+b*.16),baseDirection=normalize([outward[0]*(1.05+b*.18),.22+params.upwardGrowth*.25-params.gravityPull*.18,outward[2]*(1.05+b*.18)]),branchLength=axisLength*(.34+.12*params.branchDensity)*rng.range(.86,1.08),branchPoints=[[...attach]];let bp=[...attach],bd=baseDirection;for(let s=1;s<=3;s++){const st=s/3;bd=normalize([bd[0]+rng.range(-.08,.08),bd[1]+.04*params.upwardGrowth-.17*params.gravityPull*st,bd[2]+rng.range(-.08,.08)]);bp=add(bp,scale(bd,branchLength/3));branchPoints.push([...bp]);}axes.push({id:`branch-${i+1}-${b+1}`,kind:"branch",parentId:id,points:branchPoints,radiusStart:trunkRadius*.18,radiusEnd:trunkRadius*.035,importance:.35});}
  }
  const terminalRegions=[{axisId:"trunk",kind:"apical",weight:1.18},...axes.filter(a=>a.kind==="leader").map(a=>({axisId:a.id,kind:"leader",weight:1}))];
  return {schemaVersion:TREE_GROWTH_SCHEMA,height,trunkRadius,axes,leaderCount:sideLeaderCount,branchCount:axes.filter(a=>a.kind==="branch").length,terminalRegions,hierarchy:axes.map(a=>({id:a.id,parentId:a.parentId,kind:a.kind})),provenance:{seed:String(seed),algorithm:"tree-growth-v1"}};
}
