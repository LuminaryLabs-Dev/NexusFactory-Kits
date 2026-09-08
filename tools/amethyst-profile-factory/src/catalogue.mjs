// All ranges below are authored artistic controls, NOT measured populations.
const range=(min,max,unit='ratio',distribution='centerWeighted',extra={})=>({min,max,unit,distribution,overrideable:true,source:'artistic-v1',...extra});
const choices=values=>({choices:values,overrideable:true,source:'artistic-v1'});
const common={
 size:range(3.2,5.2,'cm'),depthRatio:range(.65,.95),outlineIrregularity:range(.07,.22),
 crystalRoughness:range(.13,.28),transmission:range(.22,.48),colorDepth:range(.38,.8),
 colorPocketScale:range(.7,1.8,'inverse-cm'),colorContrast:range(.28,.68),cloudiness:range(.1,.38)
};
const growth={crystalWidthRatio:range(.085,.16),exposedHeightToWidth:range(.8,1.5),
 surfaceCoverage:range(.7,.95,'ratio','highWeighted'),primaryCrystalCount:range(4,10,'count','uniform',{integer:true}),
 fillerSizeRatio:range(.2,.42),leanAmount:range(.02,.18,'radians'),rootBurialRatio:range(.12,.22),
 terminationHeightRatio:range(.44,.62),facetVariation:range(.015,.09),tipOffset:range(.01,.06),
 chipProbability:range(0,.12),chipDepth:range(.06,.2)};
const host={baseThicknessRatio:range(.18,.36),surfaceRelief:range(.04,.12),fractureDepth:range(.025,.075),
 paleLayerRatio:range(.06,.16),brownSeamRatio:range(.012,.045),layerVariation:range(.18,.55),
 rockRoughness:range(.8,.98),rockGrain:range(.035,.085)};
const omit=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
const cavityHost=omit(host,['surfaceRelief','layerVariation']);
const cavityGrowth=omit(growth,['leanAmount']);
const singleCommon=omit(common,['depthRatio','outlineIrregularity']);
const make=(id,label,recipe,categories,ranges,derived)=>({id,label,version:1,rock:'amethyst',recipe,status:'ready',categories,ranges,derived,source:'amethyst-qualitative-reference'});
export const profiles={
 'raw-compact-cluster':make('raw-compact-cluster','Raw compact cluster','attached-cluster',{
  baseShape:choices({block:3,wedge:3,shard:1}),growthPattern:choices({crowdedMixedScale:5,compactBroad:3,patchy:2}),
  geology:choices({volcanicCavity:1}),preparation:choices({raw:1})
 },{...common,...host,...growth,
  depthRatio:{...common.depthRatio,dependsOn:{field:'baseShape',cases:{shard:[.38,.62],wedge:[.58,.82]}}},
  surfaceCoverage:{...growth.surfaceCoverage,dependsOn:{field:'growthPattern',cases:{patchy:[.5,.72],compactBroad:[.76,.95]}}}
 },['baseThickness','paleLayerThickness','brownSeamThickness','crystalWidth','crystalHeight','rootBurial','fillerWidth','secondaryCount']),
 'geode-fragment':make('geode-fragment','Curved geode fragment','cavity-fragment',{
  baseShape:choices({curvedWall:3,deepCup:2}),growthPattern:choices({inwardMixed:1}),geology:choices({volcanicCavity:1}),preparation:choices({broken:1})
 },{...common,...cavityHost,...cavityGrowth,crystalWidthRatio:range(.048,.075),primaryCrystalCount:range(5,12,'count','uniform',{integer:true}),
  cavityDepthRatio:range(.35,.7),openingAngle:range(.85,1.38,'radians'),rimBreakage:range(.04,.15),surfaceCoverage:range(.78,.97),
  fragmentArc:range(2.8,4.4,'radians','centerWeighted',{dependsOn:{field:'baseShape',cases:{deepCup:[4.4,5.2]}}}),fragmentStart:range(.18,.36,'radians'),
  baseThicknessRatio:range(.075,.12)
 },['baseThickness','paleLayerThickness','brownSeamThickness','crystalWidth','crystalHeight','rootBurial','fillerWidth','secondaryCount','cavityDepth']),
 'sawn-geode':make('sawn-geode','Sawn geode half','cut-cavity',{
  baseShape:choices({rounded:3,elongated:2}),growthPattern:choices({inwardFine:1}),geology:choices({volcanicCavity:1}),preparation:choices({sawn:2,polishedRim:1})
 },{...common,...cavityHost,...cavityGrowth,depthRatio:range(.75,1,'ratio','centerWeighted',{dependsOn:{field:'baseShape',cases:{rounded:[.9,1],elongated:[.58,.76]}}}),crystalWidthRatio:range(.036,.065),primaryCrystalCount:range(3,7,'count','uniform',{integer:true}),
  cavityDepthRatio:range(.4,.57),openingAngle:range(1.570796,1.570796,'radians','uniform',{overrideable:false}),rimBreakage:range(0,0,'ratio','uniform',{overrideable:false}),
  surfaceCoverage:range(.85,.97),baseThicknessRatio:range(.06,.105),paleLayerRatio:range(.18,.35),cutRoughness:range(.15,.32)
 },['baseThickness','paleLayerThickness','brownSeamThickness','crystalWidth','crystalHeight','rootBurial','fillerWidth','secondaryCount','cavityDepth']),
 'loose-crystal':make('loose-crystal','Loose crystal','single-crystal',{
  baseShape:choices({broadPoint:3,doubleTerminated:2}),growthPattern:choices({single:1}),geology:choices({veinPocket:1}),preparation:choices({natural:1})
 },{...singleCommon,crystalWidthRatio:range(.24,.38),exposedHeightToWidth:range(1.55,2.5),terminationHeightRatio:range(.28,.42),
  facetVariation:range(.01,.055),tipOffset:range(.005,.04),chipProbability:range(0,.18),chipDepth:range(.06,.15),leanAmount:range(.3,.55,'radians')
 },['crystalWidth','crystalHeight']),
 'tumbled-piece':make('tumbled-piece','Tumbled amethyst','rounded-solid',{
  baseShape:choices({pebble:3,roundedFreeform:2}),growthPattern:choices({none:1}),geology:choices({massiveQuartz:1}),preparation:choices({tumbled:1})
 },{...common,size:range(2.6,4,'cm'),heightRatio:range(.52,.8),roundness:range(.8,1.15),
  crystalRoughness:range(.07,.15),transmission:range(.35,.6),outlineIrregularity:range(.025,.09),cloudiness:range(.16,.42)
 },['solidHeight'])
};
export const rocks={amethyst:{id:'amethyst',version:1,mineral:'quartz',crystalSystem:'trigonal',status:'ready',
 supportedProfiles:Object.keys(profiles),hostRecipes:['volcanicCavity','veinPocket','massiveQuartz'],
 material:{ior:1.545,outerRockColor:'#383b32',brownSeamColor:'#815839',paleLayerColor:'#d3ccc0'},
 globalLimits:{transmission:[0,1],crystalRoughness:[.02,1],surfaceCoverage:[0,1],crystalWidthRatio:[.01,.5],size:[.5,20],depthRatio:[.2,1.5]},
 source:'amethyst-qualitative-reference',rangeBasis:'Artistic; centimeters for linear measurements. IOR is a scalar approximation.'}};
export const recipeRequirements={
 'attached-cluster':{categories:['baseShape','growthPattern','geology','preparation'],ranges:[...Object.keys(common),...Object.keys(host),...Object.keys(growth)]},
 'cavity-fragment':{categories:['baseShape','growthPattern','geology','preparation'],ranges:[...Object.keys(common),...Object.keys(cavityHost),...Object.keys(cavityGrowth),'cavityDepthRatio','openingAngle','rimBreakage','fragmentArc','fragmentStart']},
 'cut-cavity':{categories:['baseShape','growthPattern','geology','preparation'],ranges:[...Object.keys(common),...Object.keys(cavityHost),...Object.keys(cavityGrowth),'cavityDepthRatio','openingAngle','rimBreakage','cutRoughness']},
 'single-crystal':{categories:['baseShape','growthPattern','geology','preparation'],ranges:[...Object.keys(singleCommon),'crystalWidthRatio','exposedHeightToWidth','terminationHeightRatio','facetVariation','tipOffset','chipProbability','chipDepth','leanAmount']},
 'rounded-solid':{categories:['baseShape','growthPattern','geology','preparation'],ranges:[...Object.keys(common),'heightRatio','roundness']}
};
export const sources={id:'amethyst-qualitative-reference',version:1,status:'ready',synthetic:false,scientificReconstruction:false};
