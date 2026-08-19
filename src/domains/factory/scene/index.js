import { defineDomain } from "../../../domain.js";
export const sceneDomain = defineDomain({ id:"factory-scene-domain", domainPath:"n:factory:scene", parentDomainPath:"n:factory", requires:["factory:core"], provides:["factory:scene"], owns:["scene generation semantics"], doesNotOwn:["editor rendering"], services:["scene-generation"] });
