import { defineDomain } from "../../../domain.js";
export const objectDomain = defineDomain({
  id: "factory-object-domain",
  domainPath: "n:factory:object",
  parentDomainPath: "n:factory",
  requires: ["factory:core"],
  provides: ["factory:object"],
  owns: ["object output contracts", "object bounds", "object hierarchy semantics", "object validation conventions"],
  doesNotOwn: ["weapon identity", "foliage identity", "viewport rendering"],
  services: ["object-descriptor", "object-validation"]
});
