import { defineDomain } from "../../domain.js";
export const factoryDomain = defineDomain({
  id: "factory-domain",
  domainPath: "n:factory",
  apiName: "factory",
  provides: ["factory:core", "factory:seed", "factory:artifact", "factory:validation", "factory:provenance"],
  owns: ["generator identity", "generation requests", "deterministic seed contract", "artifact descriptors", "generation receipts", "validation results", "output provenance"],
  doesNotOwn: ["object semantics", "material semantics", "editor rendering", "cloud UI"],
  services: ["describe", "generate", "reroll", "validate", "export"]
});
