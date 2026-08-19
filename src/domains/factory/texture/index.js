import { defineDomain } from "../../../domain.js";
export const textureDomain = defineDomain({ id:"factory-texture-domain", domainPath:"n:factory:texture", parentDomainPath:"n:factory", requires:["factory:core"], provides:["factory:texture"], owns:["texture generation semantics"], doesNotOwn:["editor rendering"], services:["texture-generation"] });
