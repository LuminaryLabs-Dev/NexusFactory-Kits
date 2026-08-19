import { factoryDomain } from "./domains/factory/index.js";
import { objectDomain } from "./domains/factory/object/index.js";
import { weaponDomain } from "./domains/factory/object/weapon/index.js";
import { foliageDomain } from "./domains/factory/object/foliage/index.js";
import { propDomain } from "./domains/factory/object/prop/index.js";
import { structureDomain } from "./domains/factory/object/structure/index.js";
import { vehicleDomain } from "./domains/factory/object/vehicle/index.js";
import { materialDomain } from "./domains/factory/material/index.js";
import { pbrMaterialDomain } from "./domains/factory/material/pbr/index.js";
import { stylizedMaterialDomain } from "./domains/factory/material/stylized/index.js";
import { proceduralMaterialDomain } from "./domains/factory/material/procedural/index.js";
import { textureDomain } from "./domains/factory/texture/index.js";
import { vfxDomain } from "./domains/factory/vfx/index.js";
import { sceneDomain } from "./domains/factory/scene/index.js";
import { animationDomain } from "./domains/factory/animation/index.js";
import { manifest as ballistaManifest } from "./domains/factory/object/weapon/kits/ballista-kit/index.js";
import { manifest as treeManifest } from "./domains/factory/object/foliage/kits/tree-kit/index.js";

export const domains = Object.freeze([
  factoryDomain, objectDomain, weaponDomain, foliageDomain, propDomain, structureDomain, vehicleDomain,
  materialDomain, pbrMaterialDomain, stylizedMaterialDomain, proceduralMaterialDomain,
  textureDomain, vfxDomain, sceneDomain, animationDomain
]);
export const kits = Object.freeze([ballistaManifest, treeManifest]);
