import { defineDomain } from "../../../../domain.js";
export const aquaticVfxDomain=defineDomain({id:"factory-vfx-aquatic-domain",domainPath:"n:factory:vfx:aquatic",parentDomainPath:"n:factory:vfx",requires:["factory:vfx"],provides:["factory:vfx:aquatic"],owns:["aquatic raster effect semantics"],doesNotOwn:["water background","subject generation","scene composition"],services:["aquatic-vfx"]});
