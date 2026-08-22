import { mkdir, writeFile } from "node:fs/promises";
import { generate as generateCoral, exportArtifact as exportCoral } from "../src/domains/factory/texture/kits/coral-kit/index.js";
import { generate as generateReef, exportArtifact as exportReef } from "../src/domains/factory/scene/kits/reef-kit/index.js";
import { SPECIES } from "../src/domains/factory/texture/subject/coral/index.js";
const root=new URL("../validation/",import.meta.url);await mkdir(new URL("asset/",root),{recursive:true});await mkdir(new URL("reef/",root),{recursive:true});
const coralBase={species:"staghorn",palette:"pink",size:0.58,density:0.62,asymmetry:0.32,highlight:0.62};
const reefBase={...coralBase,species:"mixed",reefComplexity:0.66,fishDensity:0.5,waterStyle:"tropical"};
const report={assets:[],reefs:[]};
for(const species of SPECIES){for(const seed of ["A","B"]){const params={...coralBase,species:species.id,palette:species.id==="sea-fan"?"purple":species.id==="lettuce"?"orange":"pink"},artifact=generateCoral({seed:`visual:${species.id}:${seed}`,params}),output=exportCoral(artifact,"png"),name=`${species.id}-${seed}.png`;await writeFile(new URL(`asset/${name}`,root),output.bytes);report.assets.push({name,hash:artifact.deterministicHash,stats:artifact.statistics});}}
for(const [name,overrides] of Object.entries({tropical:{},dense:{reefComplexity:0.95,density:0.9,fishDensity:0.72},deep:{waterStyle:"deep",palette:"purple"},emerald:{waterStyle:"emerald",palette:"orange",asymmetry:0.65}})){const params={...reefBase,...overrides},artifact=generateReef({seed:`visual:reef:${name}`,params}),output=exportReef(artifact,"png");await writeFile(new URL(`reef/${name}.png`,root),output.bytes);report.reefs.push({name,hash:artifact.deterministicHash,stats:artifact.statistics});}
await writeFile(new URL("report.json",root),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
