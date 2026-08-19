import { defineDomain } from "../../../domain.js";
export const animationDomain = defineDomain({ id:"factory-animation-domain", domainPath:"n:factory:animation", parentDomainPath:"n:factory", requires:["factory:core"], provides:["factory:animation"], owns:["animation generation semantics"], doesNotOwn:["playback renderer"], services:["animation-generation"] });
