import { mkdir, writeFile } from "node:fs/promises";
import { generate, exportArtifact } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { SPECIES } from "../src/domains/factory/texture/kits/coral-kit/presets.js";
const root=new URL("../validation/",import.meta.url);await mkdir(new URL("asset/",root),{recursive:true});await mkdir(new URL("reef/",root),{recursive:true});
const base={mode:"asset",species:"staghorn",palette:"pink",size:0.58,density:0.62,asymmetry:0.32,highlight:0.62,reefComplexity:0.66,fishDensity:0.5,waterStyle:"tropical"};
const report={assets:[],reefs:[]};
for(const species of SPECIES){for(const seed of ["A","B"]){const params={...base,species:species.id,palette:species.id==="sea-fan"?"purple":species.id==="lettuce"?"orange":"pink"},artifact=generate({seed:`visual:${species.id}:${seed}`,params}),png=exportArtifact(artifact,"png"),name=`${species.id}-${seed}.png`;await writeFile(new URL(`asset/${name}`,root),png);report.assets.push({name,hash:artifact.deterministicHash,stats:artifact.statistics});}}
for(const [name,overrides] of Object.entries({tropical:{},dense:{reefComplexity:0.95,density:0.9,fishDensity:0.72},deep:{waterStyle:"deep",palette:"purple",species:"mixed"},emerald:{waterStyle:"emerald",palette:"orange",species:"mixed",asymmetry:0.65}})){const params={...base,...overrides,mode:"reef",species:overrides.species??"mixed"},artifact=generate({seed:`visual:reef:${name}`,params}),png=exportArtifact(artifact,"png");await writeFile(new URL(`reef/${name}.png`,root),png);report.reefs.push({name,hash:artifact.deterministicHash,stats:artifact.statistics});}
await writeFile(new URL("report.json",root),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
