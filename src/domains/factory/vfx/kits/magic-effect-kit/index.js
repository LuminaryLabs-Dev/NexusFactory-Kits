import { defineKit } from '../../../../../domain.js';
import { createExportResult,createImageArtifact,normalizeParameters,randomizeParameters,validateArtifactShape } from '../../../../../contracts.js';
import { createSeededRandom,deriveSeed } from '../../../../../foundation/random.js';
import { createRasterSurface,imageFromSurface,surfaceFromImage } from '../../../../../foundation/raster/surface.js';
import { encodePngRgba } from '../../../../../foundation/raster/png.js';
import { buildAnimationSurface,THEMES,EFFECTS,SUSTAINED } from './formation.js';

export const KIT_ID='factory-vfx-magic-effect';
export const DOMAIN_PATH='n:factory:vfx';
export const parameterSchema=Object.freeze([
  {id:'element',label:'Element',type:'select',options:Object.keys(THEMES),default:'fire'},
  {id:'formation',label:'Effect',type:'select',options:EFFECTS,default:'sigil'},
  {id:'mode',label:'Motion',type:'select',options:['one-shot','sustain'],default:'one-shot'},
  {id:'frameCount',label:'Frames',type:'integer',minimum:8,maximum:32,step:4,default:24},
  {id:'fps',label:'Playback FPS',type:'integer',minimum:4,maximum:30,step:1,default:12},
  {id:'density',label:'Particle Density',type:'number',minimum:.35,maximum:1.2,step:.05,default:.7},
  {id:'turbulence',label:'Turbulence',type:'number',minimum:0,maximum:1,step:.05,default:.35},
  {id:'radius',label:'Size',type:'number',minimum:.45,maximum:1.18,step:.05,default:.9}
]);
export const manifest=defineKit({
  id:KIT_ID,displayName:'Magic Effect Generator',version:'0.2.0',domainPath:DOMAIN_PATH,
  requires:['factory:vfx','factory:seed','factory:artifact'],
  provides:['factory:generate','factory:validate','factory:variation','factory:export','artifact:image','artifact:animation','seed:deterministic','editor:parameters','export:png','export:atlas','export:json'],
  services:['describe','generate','randomize','reroll','validate','export'],parameterSchema,
  editor:{title:'Magic Effect Generator',category:'VFX',tags:['procedural','pixel-art','magic','sprite-animation'],preview:'sprite-2d',inspector:'schema',surfaces:['seed','parameters','animation','export','diagnostics'],
    primary:['element','formation','mode','density','turbulence','radius'],advanced:['frameCount','fps','seed'],internal:[],
    sections:[{id:'formation',label:'Formation',parameters:['element','formation','mode','radius','density','turbulence']},{id:'motion',label:'Animation',parameters:['frameCount','fps']}],
    generation:{debounceMs:350},randomizationGroups:[{id:'everything',label:'Everything',parameters:parameterSchema.map(p=>p.id),rerollSeed:true},{id:'formation',label:'Formation',parameters:['formation','density','turbulence','radius'],rerollSeed:false},{id:'palette',label:'Element',parameters:['element'],rerollSeed:false}]},
  runtime:{environments:['node','browser','worker'],permissions:[]},
  source:{module:'src/domains/factory/vfx/kits/magic-effect-kit/index.js',exportName:'kit'},
  metadata:{deterministic:true,artifactType:'image',serviceContract:'standard-runtime-v1',animationContract:'nexusfactory.sprite-atlas/1',formationEngine:'magic-vfx-timeline-v2',frameSize:[32,32],elementCount:10,formationCount:16}
});
function entropy(){if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);globalThis.crypto.getRandomValues(a);return `${a[0]}:${a[1]}`;}return `${Date.now()}:${Math.random()}`;}
function frameStats(surface,count){
  const occupied=[],signatures=[],edge=[];
  for(let f=0;f<count;f++){
    let alpha=0,hash=2166136261,outer=0;
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const i=(y*surface.width+f*32+x)*4;
      for(let k=0;k<4;k++)hash=Math.imul(hash^surface.pixels[i+k],16777619)>>>0;
      if(surface.pixels[i+3]){alpha++;if(x<2||x>29||y<2||y>29)outer++;}
    }
    occupied.push(alpha);signatures.push(hash.toString(16).padStart(8,'0'));edge.push(outer);
  }
  return {occupiedFrames:occupied,distinctFrames:new Set(signatures).size,edgePixels:edge};
}
export function generate({seed=`${KIT_ID}:001`,params={}}={}){
  if(typeof seed!=='string'||seed.trim().length===0)throw new TypeError('Magic VFX requires a nonempty seed');
  const normalized=normalizeParameters(parameterSchema,params),loop=normalized.mode==='sustain';
  if(loop&&!SUSTAINED.includes(normalized.formation))throw new RangeError(`Sustained animation not supported for ${normalized.formation}`);
  const surface=buildAnimationSurface({element:normalized.element,formation:normalized.formation,seed,frameCount:normalized.frameCount,loop,density:normalized.density,turbulence:normalized.turbulence,radius:normalized.radius});
  const stats=frameStats(surface,normalized.frameCount);
  return createImageArtifact({kitId:KIT_ID,domainPath:DOMAIN_PATH,seed,params:normalized,image:imageFromSurface(surface),statistics:{frameCount:normalized.frameCount,frameWidth:32,frameHeight:32,...stats},
    metadata:{generator:'magic-vfx-timeline-v2',animation:{schemaVersion:'nexusfactory.sprite-atlas/1',frameWidth:32,frameHeight:32,frameCount:normalized.frameCount,columns:normalized.frameCount,rows:1,fps:normalized.fps,loop,frameOrder:'row-major'},profile:THEMES[normalized.element].behavior}});
}
export function validate(artifact){
  const base=validateArtifactShape(artifact),checks=[...base.checks],add=(id,pass,detail='')=>checks.push({id,pass:Boolean(pass),detail});
  try{
    const img=surfaceFromImage(artifact.image),a=artifact.metadata?.animation,p=artifact.params;
    add('kit:identity',artifact.kitId===KIT_ID);add('animation:contract',a?.schemaVersion==='nexusfactory.sprite-atlas/1');
    add('animation:dimensions',a?.frameWidth===32&&a?.frameHeight===32&&img.width===32*a.frameCount&&img.height===32);
    add('animation:count',a?.frameCount===p?.frameCount&&a?.frameCount>=8&&a?.frameCount<=32);
    add('animation:fps',a?.fps===p?.fps&&a?.fps>=4&&a?.fps<=30);
    add('animation:loop',a?.loop===(p?.mode==='sustain'));
    add('animation:frames',a?.frameOrder==='row-major'&&a?.columns===a?.frameCount&&a?.rows===1);
    add('animation:coverage',artifact.statistics?.distinctFrames>=Math.ceil(a.frameCount*.65),String(artifact.statistics?.distinctFrames));
    add('animation:safe-bounds',artifact.statistics?.edgePixels?.every(n=>n===0),JSON.stringify(artifact.statistics?.edgePixels));
    add('animation:visible',artifact.statistics?.occupiedFrames?.some(n=>n>=8));
    add('animation:one-shot-exit',a.loop===true||artifact.statistics.occupiedFrames.at(-1)<=3);
    add('params:element',Object.hasOwn(THEMES,p?.element));add('params:formation',EFFECTS.includes(p?.formation));
    add('params:mode',p?.mode==='one-shot'||(p?.mode==='sustain'&&SUSTAINED.includes(p?.formation)));
    add('image:transparent',artifact.image.transparent===true);
  }catch(error){add('animation:decode',false,error.message);}
  return {schemaVersion:'nexusfactory.validation-report/1',valid:checks.every(c=>c.pass),checks,deterministicHash:artifact?.deterministicHash??null};
}
export function randomize(request={}){
  const seed=String(request.seed??`${KIT_ID}:001`),groupId=String(request.groupId??'everything'),group=manifest.editor.randomizationGroups.find(g=>g.id===groupId);
  if(!group)throw new RangeError(`Unknown randomization group: ${groupId}`);
  const token=request.entropy??entropy(),rng=createSeededRandom(deriveSeed(seed,`range:${groupId}:${token}`)),params=randomizeParameters({schema:parameterSchema,input:request.params,parameterIds:group.parameters,random:rng}),nextSeed=group.rerollSeed?deriveSeed(seed,`reroll:${token}`):seed;
  if(params.mode==='sustain'&&!SUSTAINED.includes(params.formation))params.mode='one-shot';
  return {seed:nextSeed,params,artifact:generate({seed:nextSeed,params})};
}
export function reroll(request={}){
  const seed=String(request.seed??`${KIT_ID}:001`),nextSeed=deriveSeed(seed,`individual:${request.entropy??entropy()}`),params=normalizeParameters(parameterSchema,request.params);
  return {seed:nextSeed,params,artifact:generate({seed:nextSeed,params})};
}
export function exportArtifact(artifact,format='png'){
  if(!validate(artifact).valid)throw new TypeError('Cannot export invalid Magic VFX artifact');
  const suffix=artifact.deterministicHash.slice(-8),surface=surfaceFromImage(artifact.image);
  if(format==='png')return createExportResult({format,mimeType:'image/png',fileName:`magic-${suffix}-strip.png`,bytes:encodePngRgba(surface)});
  if(format==='atlas'){
    const atlas=createRasterSurface({width:1024,height:1024,transparent:true}),count=artifact.metadata.animation.frameCount;
    for(let frame=0;frame<count;frame++){
      const tx=frame%32,ty=Math.floor(frame/32);
      for(let y=0;y<32;y++){
        const src=(y*surface.width+frame*32)*4,dst=((ty*32+y)*atlas.width+tx*32)*4;
        atlas.pixels.set(surface.pixels.subarray(src,src+128),dst);
      }
    }
    return createExportResult({format,mimeType:'image/png',fileName:`magic-${suffix}-atlas-1024.png`,bytes:encodePngRgba(atlas)});
  }
  if(format==='json')return createExportResult({format,mimeType:'application/json',fileName:`magic-${suffix}.json`,text:JSON.stringify(artifact,null,2)});
  throw new RangeError(`Unsupported magic export: ${format}`);
}
export const kit=Object.freeze({manifest,services:Object.freeze({describe:()=>structuredClone(manifest),generate,randomize,reroll,validate,export:exportArtifact})});
export default kit;
