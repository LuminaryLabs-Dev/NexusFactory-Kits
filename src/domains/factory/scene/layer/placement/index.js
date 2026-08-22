import { defineDomain } from "../../../../../domain.js";
import { poissonSample1D } from "../../../../../foundation/random.js";
export const layerPlacementDomain=defineDomain({id:"factory-scene-layer-placement-domain",domainPath:"n:factory:scene:layer:placement",parentDomainPath:"n:factory:scene:layer",requires:["factory:scene:layer"],provides:["scene:layer:placement"],owns:["deterministic anchors","spacing","bounds","scale variation"],doesNotOwn:["layer ordering","subject rendering"],services:["layer-placement"]});
export function sampleLayerAnchors({rng,width,count,minDistanceScale=0.78}){const minDistance=Math.max(7,Math.floor(width/(count+2)*minDistanceScale));return poissonSample1D({random:rng.float,min:5,max:width-6,count,minDistance});}
