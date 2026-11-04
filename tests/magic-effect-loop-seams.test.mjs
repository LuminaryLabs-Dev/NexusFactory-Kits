import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES, SUSTAINED, buildAnimationSurface} from '../src/domains/factory/vfx/kits/magic-effect-kit/formation.js';

const FRAME_SIZE = 32;
const FRAME_COUNT = 16;
const PIXELS = FRAME_SIZE * FRAME_SIZE;

function changedPixels(sheet, a, b) {
  let different=0;
  for(let y=0;y<FRAME_SIZE;y++)for(let x=0;x<FRAME_SIZE;x++){
    const ia=(y*sheet.width+a*FRAME_SIZE+x)*4;
    const ib=(y*sheet.width+b*FRAME_SIZE+x)*4;
    if(sheet.pixels[ia]!==sheet.pixels[ib]||sheet.pixels[ia+1]!==sheet.pixels[ib+1]||sheet.pixels[ia+2]!==sheet.pixels[ib+2]||sheet.pixels[ia+3]!==sheet.pixels[ib+3])different++;
  }
  return different;
}

test('all sustained profiles have a continuous 16-to-1 animation seam',()=>{
  for(const element of Object.keys(THEMES))for(const formation of SUSTAINED){
    const image=buildAnimationSurface({element,formation,seed:'seam-regression-v1',frameCount:FRAME_COUNT,loop:true});
    const interior=Array.from({length:FRAME_COUNT-1},(_,i)=>changedPixels(image,i,i+1)).sort((a,b)=>a-b);
    const typical=interior[Math.floor(interior.length/2)];
    const seam=changedPixels(image,FRAME_COUNT-1,0);
    assert.ok(seam<=Math.max(12,typical*2.5),`${element}/${formation} seam ${seam} px exceeds 2.5× interior median ${typical}`);
    assert.ok(seam<PIXELS*0.55,`${element}/${formation} changed more than half the frame at wrap`);
  }
});
