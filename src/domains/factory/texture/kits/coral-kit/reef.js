import { generate } from "../../../scene/kits/reef-kit/index.js";
import { surfaceFromImage } from "../../../../../foundation/raster/surface.js";
export function generateReefScene({seed,params}){const artifact=generate({seed,params});return{surface:surfaceFromImage(artifact.image),metrics:artifact.statistics};}
