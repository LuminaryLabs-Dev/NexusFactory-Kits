export const SPECIES = Object.freeze([
  {id:"staghorn",common:"Staghorn coral",scientific:"Acropora cervicornis",form:"cylindrical antler branches",morphology:"branching"},
  {id:"elkhorn",common:"Elkhorn coral",scientific:"Acropora palmata",form:"broad flattened fronds",morphology:"frond"},
  {id:"brain",common:"Grooved brain coral",scientific:"Diploria labyrinthiformis",form:"labyrinth ridges",morphology:"mound"},
  {id:"pillar",common:"Pillar coral",scientific:"Dendrogyra cylindrus",form:"upright columns",morphology:"column"},
  {id:"lettuce",common:"Lettuce coral",scientific:"Agaricia agaricites",form:"layered plates",morphology:"plate"},
  {id:"sea-fan",common:"Purple sea fan",scientific:"Gorgonia ventalina",form:"reticulate fan",morphology:"fan"},
  {id:"sea-rod",common:"Bent sea rod",scientific:"Eunicea flexuosa",form:"bushy candelabrum rods",morphology:"rod"}
]);
export const PALETTES = Object.freeze({
  gold:["#4a3327","#76503a","#aa784c","#d8ad6e","#f5dfaa"],
  pink:["#4d2b30","#81434a","#bd6670","#e69791","#ffd0b8"],
  purple:["#35283e","#60466c","#9670a0","#d09bc0","#efd5e8"],
  green:["#26382f","#47634b","#709568","#a8c68a","#e0e7b5"],
  orange:["#513024","#824733","#bd7047","#efa16a","#ffd29c"],
  bleached:["#625e55","#8b8578","#b8b09e","#ded6c2","#fff4da"]
});
export const WATER_STYLES = Object.freeze({
  tropical:{water:["#071f2d","#0b3546","#105166","#187187"],sand:["#695f46","#91805c","#c0aa74"],rock:["#24393d","#3a5355","#58706d"]},
  deep:{water:["#061424","#0a253b","#103b56","#175974"],sand:["#554c48","#77655c","#9e806b"],rock:["#202f3d","#314554","#4a606a"]},
  emerald:{water:["#071f22","#0b3435","#104b49","#176660"],sand:["#615b48","#887a5b","#b19e70"],rock:["#293b38","#3d5650","#566e64"]}
});
export const speciesById=(id)=>SPECIES.find((entry)=>entry.id===id)??SPECIES[0];
