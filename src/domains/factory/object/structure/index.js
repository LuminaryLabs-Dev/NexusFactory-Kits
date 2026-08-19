import { defineDomain } from "../../../../domain.js";
export const structureDomain = defineDomain({ id:"factory-object-structure-domain", domainPath:"n:factory:object:structure", parentDomainPath:"n:factory:object", requires:["factory:object"], provides:["factory:object:structure"], owns:["structure generation semantics"], doesNotOwn:["editor rendering"], services:["structure-generation"] });
