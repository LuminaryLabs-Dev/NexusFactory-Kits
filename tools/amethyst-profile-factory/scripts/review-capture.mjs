import {capture} from './headless-run.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {profiles} from '../src/catalogue.mjs';
import {sheet} from './sheet.mjs';
const name=process.argv[2]??'baseline',selected=process.argv.slice(3),ids=selected.length?selected:Object.keys(profiles);let frames={};try{frames=JSON.parse(await readFile('evidence/review/frames.json'));}catch{}
const out=`evidence/review/${name}`,requests=ids.map(profile=>({profile,seed:1042,...(frames[profile]?{cameraFrame:frames[profile]}:{})}));const report=await capture({out,requests,views:10,width:850,height:750});for(const r of report.records)frames[r.specimen.profile]??=r.cameraFrame;await mkdir('evidence/review',{recursive:true});await writeFile('evidence/review/frames.json',JSON.stringify(frames,null,2));
await sheet(report.records.map(r=>({file:`${out}/${r.id}/view-00.png`,label:`${name} · ${r.specimen.profile}`})),`${out}/contact-sheet.png`,{cols:2,tileW:550,tileH:510});
for(const r of report.records)await sheet(r.images.map((im,i)=>({file:`${out}/${r.id}/${im.path}`,label:`${i*36}°`})),`${out}/${r.id}/orbit.png`,{cols:5,tileW:300,tileH:290});
