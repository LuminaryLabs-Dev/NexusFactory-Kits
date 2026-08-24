import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const toolsDirectory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const variantsWorker=path.join(toolsDirectory,'render-variants-worker.mjs');
const loopWorker=path.join(toolsDirectory,'render-loop-worker.mjs');
function run(args,label){const child=spawnSync(process.execPath,['--expose-gc',...args],{encoding:'utf8',maxBuffer:1024*1024*8});if(child.status!==0)throw new Error(`${label} failed: ${child.stderr||child.stdout}`);}
export async function runReviewPipeline({artifactPath,glbPath,outputDirectory}){
  const variantsDir=path.join(outputDirectory,'variants'),reviewsDir=path.join(outputDirectory,'reviews'),varietyFile=path.join(reviewsDir,'loop-06-procedural-variety.png'),variantsReport=path.join(variantsDir,'variants-report.json');fs.mkdirSync(variantsDir,{recursive:true});fs.mkdirSync(reviewsDir,{recursive:true});
  run([variantsWorker,'--output',variantsDir,'--sheet',varietyFile,'--report',variantsReport],'Procedural variety review');
  for(const id of [1,2,3,4,5,7])run([loopWorker,'--artifact',artifactPath,'--glb',glbPath,'--output',outputDirectory,'--loop',String(id)],`Review loop ${id}`);
  const loops=[1,2,3,4,5].map((id)=>JSON.parse(fs.readFileSync(path.join(reviewsDir,`loop-${String(id).padStart(2,'0')}.json`),'utf8')));
  const variants=JSON.parse(fs.readFileSync(variantsReport,'utf8'));
  loops.push({id:6,title:'Procedural variety stress test',image:path.relative(outputDirectory,varietyFile),checks:['20 representative fish','all body/tail/palette/pattern/eye families'],automatedPass:variants.valid,imageReview:'pending',variants:variants.variants});
  loops.push(JSON.parse(fs.readFileSync(path.join(reviewsDir,'loop-07.json'),'utf8')));
  loops.sort((a,b)=>a.id-b.id);
  const manifest={generatedAt:new Date().toISOString(),reviewLoops:loops,valid:loops.every((loop)=>loop.automatedPass),structuralComparison:loops.find((loop)=>loop.id===5)?.structuralComparison,renderComparison:loops.find((loop)=>loop.id===5)?.renderComparison};fs.writeFileSync(path.join(reviewsDir,'review-manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);return manifest;
}
