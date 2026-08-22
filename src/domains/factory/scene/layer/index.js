import { defineDomain } from "../../../../domain.js";
export const sceneLayerDomain=defineDomain({id:"factory-scene-layer-domain",domainPath:"n:factory:scene:layer",parentDomainPath:"n:factory:scene",requires:["factory:scene"],provides:["factory:scene:layer"],owns:["generic scene layer semantics"],doesNotOwn:["subject rendering","genre composition"],services:["scene-layering"]});
