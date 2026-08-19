import { defineDomain } from "../../../domain.js";
export const materialDomain = defineDomain({ id:"factory-material-domain", domainPath:"n:factory:material", parentDomainPath:"n:factory", requires:["factory:core"], provides:["factory:material"], owns:["material generation descriptors"], doesNotOwn:["renderer implementation"], services:["material-generation"] });
