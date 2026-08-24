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
import { creatureDomain } from "./domains/factory/object/creature/index.js";
import { aquaticCreatureDomain } from "./domains/factory/object/creature/aquatic/index.js";
import { fishObjectDomain } from "./domains/factory/object/creature/aquatic/fish/index.js";
import { propDomain } from "./domains/factory/object/prop/index.js";
import { structureDomain } from "./domains/factory/object/structure/index.js";
import { vehicleDomain } from "./domains/factory/object/vehicle/index.js";
import { materialDomain } from "./domains/factory/material/index.js";
import { pbrMaterialDomain } from "./domains/factory/material/pbr/index.js";
import { stylizedMaterialDomain } from "./domains/factory/material/stylized/index.js";
import { proceduralMaterialDomain } from "./domains/factory/material/procedural/index.js";
import { textureDomain } from "./domains/factory/texture/index.js";
import { textureSubjectDomain } from "./domains/factory/texture/subject/index.js";
import { coralDomain } from "./domains/factory/texture/subject/coral/index.js";
import { fishDomain } from "./domains/factory/texture/subject/fish/index.js";
import { aquaticFloraDomain } from "./domains/factory/texture/subject/aquatic-flora/index.js";
import { textureEnvironmentDomain } from "./domains/factory/texture/environment/index.js";
import { waterDomain } from "./domains/factory/texture/environment/water/index.js";
import { substrateDomain } from "./domains/factory/texture/environment/substrate/index.js";
import { rockDomain } from "./domains/factory/texture/environment/rock/index.js";
import { vfxDomain } from "./domains/factory/vfx/index.js";
import { aquaticVfxDomain } from "./domains/factory/vfx/aquatic/index.js";
import { bubblesDomain } from "./domains/factory/vfx/aquatic/bubbles/index.js";
import { particlesDomain } from "./domains/factory/vfx/aquatic/particles/index.js";
import { lightShaftsDomain } from "./domains/factory/vfx/aquatic/light-shafts/index.js";
import { sceneDomain } from "./domains/factory/scene/index.js";
import { sceneLayerDomain } from "./domains/factory/scene/layer/index.js";
import { layerStackDomain } from "./domains/factory/scene/layer/stack/index.js";
import { layerPlacementDomain } from "./domains/factory/scene/layer/placement/index.js";
import { sceneTerrainDomain } from "./domains/factory/scene/terrain/index.js";
import { terrainProfileDomain } from "./domains/factory/scene/terrain/profile/index.js";
import { aquaticSceneDomain } from "./domains/factory/scene/aquatic/index.js";
import { aquaticPopulationDomain } from "./domains/factory/scene/aquatic/population/index.js";
import { reefDomain } from "./domains/factory/scene/aquatic/reef/index.js";
import { aquariumDomain } from "./domains/factory/scene/aquatic/aquarium/index.js";
import { animationDomain } from "./domains/factory/animation/index.js";
import { manifest as ballistaManifest } from "./domains/factory/object/weapon/kits/ballista-kit/runtime.js";
import { manifest as treeManifest } from "./domains/factory/object/foliage/kits/tree-kit/index.js";
import { manifest as fishObjectManifest } from "./domains/factory/object/creature/aquatic/kits/fish-kit/index.js";
import { manifest as coralManifest } from "./domains/factory/texture/kits/coral-kit/index.js";
import { manifest as fishManifest } from "./domains/factory/texture/kits/fish-kit/index.js";
import { manifest as aquaticFloraManifest } from "./domains/factory/texture/kits/aquatic-flora-kit/index.js";
import { manifest as reefManifest } from "./domains/factory/scene/kits/reef-kit/index.js";
import { manifest as aquariumManifest } from "./domains/factory/scene/kits/aquarium-kit/index.js";

export const domains = Object.freeze([
  factoryDomain, objectDomain, weaponDomain, foliageDomain,
  treeDomain, treeGrowthDomain, treeCurveDomain, treeBezierDomain, treeWoodDomain, treeCrownDomain,
  creatureDomain, aquaticCreatureDomain, fishObjectDomain,
  propDomain, structureDomain, vehicleDomain,
  materialDomain, pbrMaterialDomain, stylizedMaterialDomain, proceduralMaterialDomain,
  textureDomain, textureSubjectDomain, coralDomain, fishDomain, aquaticFloraDomain,
  textureEnvironmentDomain, waterDomain, substrateDomain, rockDomain,
  vfxDomain, aquaticVfxDomain, bubblesDomain, particlesDomain, lightShaftsDomain,
  sceneDomain, sceneLayerDomain, layerStackDomain, layerPlacementDomain, sceneTerrainDomain, terrainProfileDomain,
  aquaticSceneDomain, aquaticPopulationDomain, reefDomain, aquariumDomain,
  animationDomain
]);
export const kits = Object.freeze([ballistaManifest, treeManifest, fishObjectManifest, coralManifest, fishManifest, aquaticFloraManifest, reefManifest, aquariumManifest]);

// main is the live NexusFactory-Kits registry channel.
