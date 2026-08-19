import { defineDomain } from "../../../../domain.js";
export const foliageDomain = defineDomain({
  id: "factory-object-foliage-domain",
  domainPath: "n:factory:object:foliage",
  parentDomainPath: "n:factory:object",
  requires: ["factory:object"],
  provides: ["factory:object:foliage"],
  owns: ["procedural foliage identity", "branching structure", "canopy distribution", "rooted object semantics"],
  doesNotOwn: ["terrain placement", "ecosystem simulation", "viewport rendering"],
  services: ["foliage-descriptor", "foliage-validation", "foliage-generation"]
});
