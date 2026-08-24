import { defineDomain } from "../../../../../domain.js";
export const aquaticCreatureDomain = defineDomain({
  id:"factory-object-creature-aquatic-domain",
  domainPath:"n:factory:object:creature:aquatic",
  parentDomainPath:"n:factory:object:creature",
  requires:["factory:object:creature"],
  provides:["factory:object:creature:aquatic"],
  owns:["aquatic body constraints","hydrodynamic silhouettes","aquatic appendage conventions"],
  doesNotOwn:["water simulation","population behavior","scene composition"],
  services:["aquatic-creature-definition"]
});
