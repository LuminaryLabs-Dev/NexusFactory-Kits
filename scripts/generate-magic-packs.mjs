// Offline release candidate builder; does not run in the browser or alter the Kit registry.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generate, validate, manifest } from '../src/domains/factory/vfx/kits/magic-effect-kit/index.js';
import { THEMES, EFFECTS, SUSTAINED } from '../src/domains/factory/vfx/kits/magic-effect-kit/formation.js';
import { createRasterSurface, surfaceFromImage } from '../src/foundation/raster/surface.js';
import { encodePngRgba } from '../src/foundation/raster/png.js';
const out = resolve(process.argv[2] ?? './validation/magic-vfx-packs');
const seed = process.argv[3] ?? 'magic-vfx-release-candidate-2026';
function frameFromStrip(strip,index){
  const image=createRasterSurface({width:32,height:32,transparent:true});
  for(let y=0;y<32;y++)image.pixels.set(strip.pixels.subarray((y*strip.width+index*32)*4,(y*strip.width+(index+1)*32)*4),y*128);
  return image;
}
function place(atlas,frame,slot){
  const col=slot%32,row=Math.floor(slot/32);
  for(let y=0;y<32;y++)atlas.pixels.set(frame.pixels.subarray(y*128,(y+1)*128),((row*32+y)*1024+col*32)*4);
}
const collection={schemaVersion:'nexusfactory.magic-pack/2',kitId:manifest.id,kitVersion:manifest.version,seed,profiles:[],totalSequences:0,totalFrames:0};
for(const element of Object.keys(THEMES)){
  const folder=resolve(out,element),framesDir=resolve(folder,'frames');
  await mkdir(framesDir,{recursive:true});
  const oneShotAtlas=createRasterSurface({width:1024,height:1024,transparent:true});
  const loopAtlas=createRasterSurface({width:1024,height:1024,transparent:true});
  const record={element,kitId:manifest.id,kitVersion:manifest.version,seed,sourceFrameSize:32,atlasSize:1024,sequences:[]};
  let shotSlot=0,loopSlot=0;
  for(const formation of EFFECTS){
    for(const mode of ['one-shot',...(SUSTAINED.includes(formation)?['sustain']:[])]){
      const count=mode==='sustain'?16:24;
      const artifact=generate({seed,params:{element,formation,mode,frameCount:count}});
      const v=validate(artifact);if(!v.valid)throw new Error(`${element}/${formation}/${mode}: ${v.checks.filter(x=>!x.pass).map(x=>x.id).join(',')}`);
      const strip=surfaceFromImage(artifact.image),kind=mode==='sustain'?'loop':'one-shot',key=`${formation}-${kind}`;
      const sequence={formation,mode,frameCount:count,fps:artifact.metadata.animation.fps,loop:mode==='sustain',hash:artifact.deterministicHash,atlas:mode==='sustain'?'loops-atlas-1024.png':'one-shots-atlas-1024.png',startSlot:mode==='sustain'?loopSlot:shotSlot,frames:[]};
      await writeFile(resolve(folder,`${key}-strip.png`),encodePngRgba(strip));
      for(let frame=0;frame<count;frame++){
        const sprite=frameFromStrip(strip,frame),name=`${key}-${String(frame).padStart(2,'0')}.png`;
        await writeFile(resolve(framesDir,name),encodePngRgba(sprite));sequence.frames.push(`frames/${name}`);
        if(mode==='sustain')place(loopAtlas,sprite,loopSlot++);else place(oneShotAtlas,sprite,shotSlot++);
      }
      record.sequences.push(sequence);
      collection.totalSequences++;collection.totalFrames+=count;
    }
  }
  await writeFile(resolve(folder,'one-shots-atlas-1024.png'),encodePngRgba(oneShotAtlas));
  await writeFile(resolve(folder,'loops-atlas-1024.png'),encodePngRgba(loopAtlas));
  await writeFile(resolve(folder,'manifest.json'),`${JSON.stringify(record,null,2)}\n`);
  collection.profiles.push({element,sequences:record.sequences.length,frames:record.sequences.reduce((n,s)=>n+s.frameCount,0)});
  console.log(`${element}: ${record.sequences.length} animations / ${record.sequences.reduce((n,s)=>n+s.frameCount,0)} frames`);
}
await writeFile(resolve(out,'collection.json'),`${JSON.stringify(collection,null,2)}\n`);
console.log(`Complete: ${collection.totalSequences} animations, ${collection.totalFrames} frames. ${out}`);
