import { defineDomain } from "../../../../../../domain.js";
export const fishObjectDomain = defineDomain({
  id:"factory-object-creature-aquatic-fish-domain",
  domainPath:"n:factory:object:creature:aquatic:fish",
  parentDomainPath:"n:factory:object:creature:aquatic",
  requires:["factory:object:creature:aquatic","factory:material:pbr"],
  provides:["aquatic:fish:mesh"],
  owns:["fish anatomy","body families","tail and fin profiles","eyes mouths and gills","fish surface pattern interpretation"],
  doesNotOwn:["fish behavior","breeding genetics","aquarium population policy","raster fish subjects"],
  services:["fish-mesh-generation","fish-surface-generation","fish-mesh-validation"]
});
export { FISH_PALETTES, FISH_SPECIES, createFishDefinition, buildFishModel } from './generator.js';
