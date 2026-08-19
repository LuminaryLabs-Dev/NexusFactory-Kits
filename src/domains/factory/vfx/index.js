import { defineDomain } from "../../../domain.js";
export const vfxDomain = defineDomain({ id:"factory-vfx-domain", domainPath:"n:factory:vfx", parentDomainPath:"n:factory", requires:["factory:core"], provides:["factory:vfx"], owns:["VFX generation semantics"], doesNotOwn:["runtime renderer"], services:["vfx-generation"] });
