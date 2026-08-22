import { defineDomain } from "../../../../domain.js";
export const sceneTerrainDomain=defineDomain({id:"factory-scene-terrain-domain",domainPath:"n:factory:scene:terrain",parentDomainPath:"n:factory:scene",requires:["factory:scene"],provides:["factory:scene:terrain"],owns:["scene terrain shape semantics"],doesNotOwn:["terrain appearance","subject placement"],services:["scene-terrain"]});
