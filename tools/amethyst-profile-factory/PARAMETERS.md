# Parameter catalogue

All numerical ranges are artistic. Units: centimeters for sizes, radians for angles, ratios otherwise. Bounds are resolved after categorical overrides. Density is a placement target, not a measured surface percentage.

## Raw compact cluster

Recipe: attached-cluster

| Category | Allowed weights |
|---|---|
| baseShape | block: 3, wedge: 3, shard: 1 |
| growthPattern | crowdedMixedScale: 5, compactBroad: 3, patchy: 2 |
| geology | volcanicCavity: 1 |
| preparation | raw: 1 |

| Property | Bounds | Unit | Distribution | Conditional bounds |
|---|---|---|---|---|
| size | 3.2–5.2 | cm | centerWeighted | — |
| depthRatio | 0.65–0.95 | ratio | centerWeighted | {"field":"baseShape","cases":{"shard":[0.38,0.62],"wedge":[0.58,0.82]}} |
| outlineIrregularity | 0.07–0.22 | ratio | centerWeighted | — |
| crystalRoughness | 0.13–0.28 | ratio | centerWeighted | — |
| transmission | 0.22–0.48 | ratio | centerWeighted | — |
| colorDepth | 0.38–0.8 | ratio | centerWeighted | — |
| colorPocketScale | 0.7–1.8 | inverse-cm | centerWeighted | — |
| colorContrast | 0.28–0.68 | ratio | centerWeighted | — |
| cloudiness | 0.1–0.38 | ratio | centerWeighted | — |
| baseThicknessRatio | 0.18–0.36 | ratio | centerWeighted | — |
| surfaceRelief | 0.04–0.12 | ratio | centerWeighted | — |
| fractureDepth | 0.025–0.075 | ratio | centerWeighted | — |
| paleLayerRatio | 0.06–0.16 | ratio | centerWeighted | — |
| brownSeamRatio | 0.012–0.045 | ratio | centerWeighted | — |
| layerVariation | 0.18–0.55 | ratio | centerWeighted | — |
| rockRoughness | 0.8–0.98 | ratio | centerWeighted | — |
| rockGrain | 0.035–0.085 | ratio | centerWeighted | — |
| crystalWidthRatio | 0.085–0.16 | ratio | centerWeighted | — |
| exposedHeightToWidth | 0.8–1.5 | ratio | centerWeighted | — |
| surfaceCoverage | 0.7–0.95 | ratio | highWeighted | {"field":"growthPattern","cases":{"patchy":[0.5,0.72],"compactBroad":[0.76,0.95]}} |
| primaryCrystalCount | 4–10 | count | uniform | — |
| fillerSizeRatio | 0.2–0.42 | ratio | centerWeighted | — |
| leanAmount | 0.02–0.18 | radians | centerWeighted | — |
| rootBurialRatio | 0.12–0.22 | ratio | centerWeighted | — |
| terminationHeightRatio | 0.44–0.62 | ratio | centerWeighted | — |
| facetVariation | 0.015–0.09 | ratio | centerWeighted | — |
| tipOffset | 0.01–0.06 | ratio | centerWeighted | — |
| chipProbability | 0–0.12 | ratio | centerWeighted | — |
| chipDepth | 0.06–0.2 | ratio | centerWeighted | — |

Derived: baseThickness, paleLayerThickness, brownSeamThickness, crystalWidth, crystalHeight, rootBurial, fillerWidth, secondaryCount.

## Curved geode fragment

Recipe: cavity-fragment

| Category | Allowed weights |
|---|---|
| baseShape | curvedWall: 3, deepCup: 2 |
| growthPattern | inwardMixed: 1 |
| geology | volcanicCavity: 1 |
| preparation | broken: 1 |

| Property | Bounds | Unit | Distribution | Conditional bounds |
|---|---|---|---|---|
| size | 3.2–5.2 | cm | centerWeighted | — |
| depthRatio | 0.65–0.95 | ratio | centerWeighted | — |
| outlineIrregularity | 0.07–0.22 | ratio | centerWeighted | — |
| crystalRoughness | 0.13–0.28 | ratio | centerWeighted | — |
| transmission | 0.22–0.48 | ratio | centerWeighted | — |
| colorDepth | 0.38–0.8 | ratio | centerWeighted | — |
| colorPocketScale | 0.7–1.8 | inverse-cm | centerWeighted | — |
| colorContrast | 0.28–0.68 | ratio | centerWeighted | — |
| cloudiness | 0.1–0.38 | ratio | centerWeighted | — |
| baseThicknessRatio | 0.075–0.12 | ratio | centerWeighted | — |
| fractureDepth | 0.025–0.075 | ratio | centerWeighted | — |
| paleLayerRatio | 0.06–0.16 | ratio | centerWeighted | — |
| brownSeamRatio | 0.012–0.045 | ratio | centerWeighted | — |
| rockRoughness | 0.8–0.98 | ratio | centerWeighted | — |
| rockGrain | 0.035–0.085 | ratio | centerWeighted | — |
| crystalWidthRatio | 0.048–0.075 | ratio | centerWeighted | — |
| exposedHeightToWidth | 0.8–1.5 | ratio | centerWeighted | — |
| surfaceCoverage | 0.78–0.97 | ratio | centerWeighted | — |
| primaryCrystalCount | 5–12 | count | uniform | — |
| fillerSizeRatio | 0.2–0.42 | ratio | centerWeighted | — |
| rootBurialRatio | 0.12–0.22 | ratio | centerWeighted | — |
| terminationHeightRatio | 0.44–0.62 | ratio | centerWeighted | — |
| facetVariation | 0.015–0.09 | ratio | centerWeighted | — |
| tipOffset | 0.01–0.06 | ratio | centerWeighted | — |
| chipProbability | 0–0.12 | ratio | centerWeighted | — |
| chipDepth | 0.06–0.2 | ratio | centerWeighted | — |
| cavityDepthRatio | 0.35–0.7 | ratio | centerWeighted | — |
| openingAngle | 0.85–1.38 | radians | centerWeighted | — |
| rimBreakage | 0.04–0.15 | ratio | centerWeighted | — |
| fragmentArc | 2.8–4.4 | radians | centerWeighted | {"field":"baseShape","cases":{"deepCup":[4.4,5.2]}} |
| fragmentStart | 0.18–0.36 | radians | centerWeighted | — |

Derived: baseThickness, paleLayerThickness, brownSeamThickness, crystalWidth, crystalHeight, rootBurial, fillerWidth, secondaryCount, cavityDepth.

## Sawn geode half

Recipe: cut-cavity

| Category | Allowed weights |
|---|---|
| baseShape | rounded: 3, elongated: 2 |
| growthPattern | inwardFine: 1 |
| geology | volcanicCavity: 1 |
| preparation | sawn: 2, polishedRim: 1 |

| Property | Bounds | Unit | Distribution | Conditional bounds |
|---|---|---|---|---|
| size | 3.2–5.2 | cm | centerWeighted | — |
| depthRatio | 0.75–1 | ratio | centerWeighted | {"field":"baseShape","cases":{"rounded":[0.9,1],"elongated":[0.58,0.76]}} |
| outlineIrregularity | 0.07–0.22 | ratio | centerWeighted | — |
| crystalRoughness | 0.13–0.28 | ratio | centerWeighted | — |
| transmission | 0.22–0.48 | ratio | centerWeighted | — |
| colorDepth | 0.38–0.8 | ratio | centerWeighted | — |
| colorPocketScale | 0.7–1.8 | inverse-cm | centerWeighted | — |
| colorContrast | 0.28–0.68 | ratio | centerWeighted | — |
| cloudiness | 0.1–0.38 | ratio | centerWeighted | — |
| baseThicknessRatio | 0.06–0.105 | ratio | centerWeighted | — |
| fractureDepth | 0.025–0.075 | ratio | centerWeighted | — |
| paleLayerRatio | 0.18–0.35 | ratio | centerWeighted | — |
| brownSeamRatio | 0.012–0.045 | ratio | centerWeighted | — |
| rockRoughness | 0.8–0.98 | ratio | centerWeighted | — |
| rockGrain | 0.035–0.085 | ratio | centerWeighted | — |
| crystalWidthRatio | 0.036–0.065 | ratio | centerWeighted | — |
| exposedHeightToWidth | 0.8–1.5 | ratio | centerWeighted | — |
| surfaceCoverage | 0.85–0.97 | ratio | centerWeighted | — |
| primaryCrystalCount | 3–7 | count | uniform | — |
| fillerSizeRatio | 0.2–0.42 | ratio | centerWeighted | — |
| rootBurialRatio | 0.12–0.22 | ratio | centerWeighted | — |
| terminationHeightRatio | 0.44–0.62 | ratio | centerWeighted | — |
| facetVariation | 0.015–0.09 | ratio | centerWeighted | — |
| tipOffset | 0.01–0.06 | ratio | centerWeighted | — |
| chipProbability | 0–0.12 | ratio | centerWeighted | — |
| chipDepth | 0.06–0.2 | ratio | centerWeighted | — |
| cavityDepthRatio | 0.4–0.57 | ratio | centerWeighted | — |
| openingAngle | 1.570796–1.570796 | radians | uniform | — |
| rimBreakage | 0–0 | ratio | uniform | — |
| cutRoughness | 0.15–0.32 | ratio | centerWeighted | — |

Derived: baseThickness, paleLayerThickness, brownSeamThickness, crystalWidth, crystalHeight, rootBurial, fillerWidth, secondaryCount, cavityDepth.

## Loose crystal

Recipe: single-crystal

| Category | Allowed weights |
|---|---|
| baseShape | broadPoint: 3, doubleTerminated: 2 |
| growthPattern | single: 1 |
| geology | veinPocket: 1 |
| preparation | natural: 1 |

| Property | Bounds | Unit | Distribution | Conditional bounds |
|---|---|---|---|---|
| size | 3.2–5.2 | cm | centerWeighted | — |
| crystalRoughness | 0.13–0.28 | ratio | centerWeighted | — |
| transmission | 0.22–0.48 | ratio | centerWeighted | — |
| colorDepth | 0.38–0.8 | ratio | centerWeighted | — |
| colorPocketScale | 0.7–1.8 | inverse-cm | centerWeighted | — |
| colorContrast | 0.28–0.68 | ratio | centerWeighted | — |
| cloudiness | 0.1–0.38 | ratio | centerWeighted | — |
| crystalWidthRatio | 0.24–0.38 | ratio | centerWeighted | — |
| exposedHeightToWidth | 1.55–2.5 | ratio | centerWeighted | — |
| terminationHeightRatio | 0.28–0.42 | ratio | centerWeighted | — |
| facetVariation | 0.01–0.055 | ratio | centerWeighted | — |
| tipOffset | 0.005–0.04 | ratio | centerWeighted | — |
| chipProbability | 0–0.18 | ratio | centerWeighted | — |
| chipDepth | 0.06–0.15 | ratio | centerWeighted | — |
| leanAmount | 0.3–0.55 | radians | centerWeighted | — |

Derived: crystalWidth, crystalHeight.

## Tumbled amethyst

Recipe: rounded-solid

| Category | Allowed weights |
|---|---|
| baseShape | pebble: 3, roundedFreeform: 2 |
| growthPattern | none: 1 |
| geology | massiveQuartz: 1 |
| preparation | tumbled: 1 |

| Property | Bounds | Unit | Distribution | Conditional bounds |
|---|---|---|---|---|
| size | 2.6–4 | cm | centerWeighted | — |
| depthRatio | 0.65–0.95 | ratio | centerWeighted | — |
| outlineIrregularity | 0.025–0.09 | ratio | centerWeighted | — |
| crystalRoughness | 0.07–0.15 | ratio | centerWeighted | — |
| transmission | 0.35–0.6 | ratio | centerWeighted | — |
| colorDepth | 0.38–0.8 | ratio | centerWeighted | — |
| colorPocketScale | 0.7–1.8 | inverse-cm | centerWeighted | — |
| colorContrast | 0.28–0.68 | ratio | centerWeighted | — |
| cloudiness | 0.16–0.42 | ratio | centerWeighted | — |
| heightRatio | 0.52–0.8 | ratio | centerWeighted | — |
| roundness | 0.8–1.15 | ratio | centerWeighted | — |

Derived: solidHeight.
