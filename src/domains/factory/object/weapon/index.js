import { defineDomain } from "../../../../domain.js";
export const weaponDomain = defineDomain({
  id: "factory-object-weapon-domain",
  domainPath: "n:factory:object:weapon",
  parentDomainPath: "n:factory:object",
  requires: ["factory:object"],
  provides: ["factory:object:weapon"],
  owns: ["weapon identity", "weapon structural semantics", "weapon generation constraints", "weapon animation intent"],
  doesNotOwn: ["viewport rendering", "editor panels", "cloud execution UI", "filesystem browsing"],
  services: ["weapon-descriptor", "weapon-validation", "weapon-generation"]
});
