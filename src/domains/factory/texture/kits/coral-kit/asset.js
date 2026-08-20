import { rasterMetrics, connectedComponentsAlpha } from "../../../../../foundation/raster/metrics.js";
import { renderCoralMorphology } from "./morphology.js";
import { PALETTES, SPECIES } from "./presets.js";
export function generateCoralAsset({rng,seed,params,width=96,height=96}){
  const resolvedSpecies=params.species==="mixed"?rng.fork("species").pick(SPECIES).id:params.species;
  const palette=PALETTES[params.palette]??PALETTES.gold;
  const result=renderCoralMorphology({rng:rng.fork("morphology"),width,height,speciesId:resolvedSpecies,size:params.size,density:params.density,asymmetry:params.asymmetry,palette,highlight:params.highlight,seed,withBase:true});
  const metrics=rasterMetrics(result.surface);
  return {surface:result.surface,resolvedSpecies,metrics:{...metrics,connectedComponents:connectedComponentsAlpha(result.surface)}};
}
