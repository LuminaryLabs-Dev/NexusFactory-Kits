import { defineDomain } from "../../../../domain.js";
export const creatureDomain = defineDomain({
  id:"factory-object-creature-domain",
  domainPath:"n:factory:object:creature",
  parentDomainPath:"n:factory:object",
  requires:["factory:object"],
  provides:["factory:object:creature"],
  owns:["procedural living-object anatomy","body proportions","anatomical constraints","creature mesh semantics"],
  doesNotOwn:["behavior AI","game genetics","ecosystem simulation","animation runtime","scene placement"],
  services:["creature-definition","creature-mesh-validation"]
});
