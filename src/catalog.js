import { factoryDomain } from "./domains/factory/index.js";
import { objectDomain } from "./domains/factory/object/index.js";
import { weaponDomain } from "./domains/factory/object/weapon/index.js";
import { foliageDomain } from "./domains/factory/object/foliage/index.js";
import { treeDomain } from "./domains/factory/object/foliage/tree/index.js";
import { treeGrowthDomain } from "./domains/factory/object/foliage/tree/growth/index.js";
import { treeCurveDomain } from "./domains/factory/object/foliage/tree/curve/index.js";
import { treeBezierDomain } from "./domains/factory/object/foliage/tree/curve/bezier/index.js";
import { treeWoodDomain } from "./domains/factory/object/foliage/tree/wood/index.js";
import { treeCrownDomain } from "./domains/factory/object/foliage/tree/crown/index.js";
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
import { manifest as coralManifest } from "./domains/factory/texture/kits/coral-kit/index.js";

export const domains = Object.freeze([
  factoryDomain, objectDomain, weaponDomain, foliageDomain,
  treeDomain, treeGrowthDomain, treeCurveDomain, treeBezierDomain, treeWoodDomain, treeCrownDomain,
  propDomain, structureDomain, vehicleDomain,
  materialDomain, pbrMaterialDomain, stylizedMaterialDomain, proceduralMaterialDomain,
  textureDomain, vfxDomain, sceneDomain, animationDomain
]);
export const kits = Object.freeze([ballistaManifest, treeManifest, coralManifest]);
