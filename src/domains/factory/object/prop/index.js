import { defineDomain } from "../../../../domain.js";
export const propDomain = defineDomain({ id:"factory-object-prop-domain", domainPath:"n:factory:object:prop", parentDomainPath:"n:factory:object", requires:["factory:object"], provides:["factory:object:prop"], owns:["prop generation semantics"], doesNotOwn:["editor rendering"], services:["prop-generation"] });
