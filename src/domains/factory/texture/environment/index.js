import { defineDomain } from "../../../../domain.js";
export const textureEnvironmentDomain=defineDomain({id:"factory-texture-environment-domain",domainPath:"n:factory:texture:environment",parentDomainPath:"n:factory:texture",requires:["factory:texture"],provides:["factory:texture:environment"],owns:["environment raster appearance semantics"],doesNotOwn:["scene placement","subject generation","viewport rendering"],services:["environment-generation"]});
export const ENVIRONMENT_STYLES=Object.freeze({
 tropical:{water:["#071f2d","#0b3546","#105166","#187187"],sand:["#695f46","#91805c","#c0aa74"],rock:["#24393d","#3a5355","#58706d"]},
 deep:{water:["#061424","#0a253b","#103b56","#175974"],sand:["#554c48","#77655c","#9e806b"],rock:["#202f3d","#314554","#4a606a"]},
 emerald:{water:["#071f22","#0b3435","#104b49","#176660"],sand:["#615b48","#887a5b","#b19e70"],rock:["#293b38","#3d5650","#566e64"]}
});
export const environmentStyle=(id)=>ENVIRONMENT_STYLES[id]??ENVIRONMENT_STYLES.tropical;
