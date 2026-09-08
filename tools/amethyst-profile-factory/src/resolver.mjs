import {rocks,profiles,recipeRequirements,sources} from './catalogue.mjs';
import {stream,weighted,sample,stable,hash} from './random.mjs';
const fail=m=>{throw new Error(m);};
export function validateProfile(p,rock=rocks[p?.rock]){
 if(!p||!rock)fail('Unknown profile or rock');
 if(!rock.supportedProfiles.includes(p.id)||!recipeRequirements[p.recipe])fail('Incompatible profile or recipe');
 const req=recipeRequirements[p.recipe];
 for(const key of req.categories)if(!p.categories?.[key])fail(`Missing required category: ${key}`);
 for(const key of req.ranges)if(!p.ranges?.[key])fail(`Missing required range: ${key}`);
 for(const [k,d] of Object.entries(p.categories)){const ws=Object.values(d.choices??{});if(!ws.length||ws.some(w=>!Number.isFinite(w)||w<0)||!ws.some(w=>w>0))fail(`Invalid category weights: ${k}`);}
 for(const [k,d] of Object.entries(p.ranges)){
  if(!Number.isFinite(d.min)||!Number.isFinite(d.max)||d.min>d.max||!d.unit)fail(`Invalid range: ${k}`);
  if(d.integer&&(!Number.isInteger(d.min)||!Number.isInteger(d.max)))fail(`Noninteger count range: ${k}`);
  if(!['uniform','centerWeighted','lowWeighted','highWeighted','clustered'].includes(d.distribution))fail(`Invalid distribution: ${k}`);
  if(d.distribution==='clustered'&&(!d.centers?.length||d.centers.some(x=>x<0||x>1)||!(d.spread>0)))fail(`Invalid cluster distribution: ${k}`);
  const limit=rock.globalLimits[k];if(limit&&(d.min<limit[0]||d.max>limit[1]))fail(`Rock limit violated: ${k}`);
  if(d.dependsOn){if(!p.categories[d.dependsOn.field])fail(`Unknown dependency: ${k}`);for(const [choice,bounds] of Object.entries(d.dependsOn.cases)){if(!(choice in p.categories[d.dependsOn.field].choices)||bounds.length!==2||!bounds.every(Number.isFinite)||bounds[0]>bounds[1]||bounds[0]<0)fail(`Invalid dependent range: ${k}`);if(limit&&(bounds[0]<limit[0]||bounds[1]>limit[1]))fail(`Dependent rock limit violated: ${k}`);}}
 }
 return true;
}
export function resolve(request={}){
 const {rock:rockId='amethyst',profile:profileId='raw-compact-cluster',seed=1042,overrides={},streamSeeds={}}=request;
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)fail('Seed must be a uint32');
 if(!overrides||Array.isArray(overrides)||typeof overrides!=='object')fail('Overrides must be an object');
 const rock=rocks[rockId],p=profiles[profileId];if(!rock||!p||p.rock!==rockId)fail('Unknown or incompatible rock/profile');validateProfile(p,rock);
 if(sources.status!=='ready'||rock.status!=='ready'||p.status!=='ready')fail('Blocked source/profile: generation stopped');
 const named=['profile','parameters','rock','placement','shape','color'];
 for(const [k,v] of Object.entries(streamSeeds))if(!named.includes(k)||!Number.isInteger(v)||v<0||v>0xffffffff)fail(`Invalid stream seed: ${k}`);
 const seeds=Object.fromEntries(named.map(k=>[k,streamSeeds[k]??hash(`${seed}:${k}`)]));
 const categories={},values={},effectiveRanges={};
 for(const k of Object.keys(overrides))if(!(k in p.categories)&&!(k in p.ranges))fail(`Unknown override: ${k}`);
 for(const [k,d] of Object.entries(p.categories)){
  if(k in overrides){if(!d.overrideable||!(overrides[k] in d.choices)||d.choices[overrides[k]]<=0)fail(`Invalid category override: ${k}`);categories[k]=overrides[k];}
  else categories[k]=weighted(d.choices,stream(seeds.profile,k));
 }
 for(const [k,d] of Object.entries(p.ranges)){
  const bounds=d.dependsOn?.cases[categories[d.dependsOn.field]];const e={...d,...(bounds?{min:bounds[0],max:bounds[1]}:{})};effectiveRanges[k]=e;
  if(k in overrides){const v=overrides[k];if(!d.overrideable||!Number.isFinite(v)||v<e.min||v>e.max||(d.integer&&!Number.isInteger(v)))fail(`Out-of-range or locked override: ${k}`);values[k]=v;}
  else values[k]=sample(e,stream(seeds.parameters,k));
 }
 // Overrides are resolved BEFORE derived dimensions, avoiding stale dependencies.
 const v=values,derived={};if(v.depthRatio!==undefined)derived.baseDepth=v.size*v.depthRatio;
 if(v.baseThicknessRatio!==undefined){derived.baseThickness=v.size*v.baseThicknessRatio;derived.paleLayerThickness=derived.baseThickness*v.paleLayerRatio;derived.brownSeamThickness=derived.baseThickness*v.brownSeamRatio;}
 if(v.crystalWidthRatio!==undefined){derived.crystalWidth=v.size*v.crystalWidthRatio;derived.crystalHeight=derived.crystalWidth*v.exposedHeightToWidth;}
 if(v.rootBurialRatio!==undefined){derived.rootBurial=derived.crystalWidth*v.rootBurialRatio;derived.fillerWidth=derived.crystalWidth*v.fillerSizeRatio;derived.secondaryCount=Math.round(v.surfaceCoverage*v.size*derived.baseDepth/(derived.crystalWidth**2)*.7);}
 if(v.cavityDepthRatio!==undefined)derived.cavityDepth=v.size*v.cavityDepthRatio;
 if(v.heightRatio!==undefined)derived.solidHeight=v.size*v.heightRatio;
 if(derived.paleLayerThickness+derived.brownSeamThickness>=derived.baseThickness)fail('Mineral layers consume backing');
 const out={schemaVersion:1,generatorVersion:'1.0.0',rock:rockId,rockVersion:rock.version,profile:profileId,profileVersion:p.version,recipe:p.recipe,seed,streamSeeds:seeds,overrides:{...overrides},categories,values,derived,effectiveRanges,source:{...sources},synthetic:true,rangeBasis:'artistic'};
 out.signature=hash(stable(out)).toString(16).padStart(8,'0');return out;
}
export function validateResolved(x){const y=resolve({rock:x.rock,profile:x.profile,seed:x.seed,overrides:x.overrides,streamSeeds:x.streamSeeds});if(stable(x)!==stable(y))fail('Resolved specimen was modified or is stale; resolve again');return true;}
export function balancedBatch({count=10,seed=1042,profileIds=Object.keys(profiles),overrides={}}={}){
 if(!Number.isInteger(count)||count<1||count>1000||!profileIds.length||new Set(profileIds).size!==profileIds.length||profileIds.some(p=>!profiles[p]))fail('Invalid batch count or profiles');
 const bag=Array.from({length:count},(_,i)=>profileIds[i%profileIds.length]);const r=stream(seed,'batch');for(let i=bag.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
 return bag.map((profile,i)=>resolve({profile,seed:hash(`${seed}:specimen:${i}`),overrides:overrides[profile]??{}}));
}
export function rerollResolved(x,{groups=['parameters'],seed}={}){
 validateResolved(x);if(!groups.length||groups.some(k=>!['profile','parameters','rock','placement','shape','color'].includes(k)))fail('Invalid reroll groups');
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)fail('Reroll seed must be a uint32');
 const streamSeeds={...x.streamSeeds};for(const k of groups)streamSeeds[k]=hash(`${seed}:${k}`);
 return resolve({rock:x.rock,profile:x.profile,seed:x.seed,overrides:x.overrides,streamSeeds});
}
