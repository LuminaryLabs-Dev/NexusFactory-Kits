import { deepClone } from './runtime-service.mjs';

const addedMasses = [
  ['anatomy.ribcage', [0, 1.55, 0]],
  ['anatomy.pelvis', [1.25, 1.55, 0]],
  ['anatomy.neck', [-1.58, 1.9, 0]],
  ['anatomy.jaw', [-2.62, 1.58, 0]],
  ['anatomy.cheek', [-2.35, 1.9, 0]],
  ['anatomy.pectoral', [-1.08, 1.3, 0]],
  ['anatomy.belly', [0, 1.12, 0]],
  ['anatomy.haunch', [1.22, 1.52, 0]],
  ['anatomy.neck-tension', [-1.35, 1.86, 0]]
];

function nodePath(id, suffix) {
  return `/nodes/${id}/${suffix}`;
}

function p(id, suffix, target) {
  return { path: nodePath(id, suffix), target };
}

function symmetricLegEdits(prefix, targets) {
  const edits = [];
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    const id = `${prefix}-${side}`;
    for (const [segment, values] of Object.entries(targets)) {
      if (values.start) edits.push(p(`${id}-${segment}`, 'params/start', [values.start[0], values.start[1], Math.abs(values.start[2]) * sign]));
      if (values.end) edits.push(p(`${id}-${segment}`, 'params/end', [values.end[0], values.end[1], Math.abs(values.end[2]) * sign]));
      if (values.center) edits.push(p(`${id}-${segment}`, 'params/center', [values.center[0], values.center[1], Math.abs(values.center[2]) * sign]));
      if (values.radii) edits.push(p(`${id}-${segment}`, 'params/radii', values.radii));
    }
  }
  return edits;
}

function symmetricToeEdits(prefix, x, y, zBase, zStep, radii) {
  const edits = [];
  for (const side of ['left', 'right']) {
    const sideSign = side === 'left' ? -1 : 1;
    for (let toe = 1; toe <= 3; toe++) {
      const lateral = zBase + (toe - 2) * zStep;
      edits.push(p(`${prefix}-${side}-toe-${toe}`, 'params/center', [x, y, lateral * sideSign]));
      edits.push(p(`${prefix}-${side}-toe-${toe}`, 'params/radii', radii));
    }
  }
  return edits;
}

export function prepareGuidedDocument(source) {
  const document = deepClone(source);
  document.programId = 'triceratops-guided-review-50';
  document.guidedReview = { schema: 'guided-review-state/v1', sourceIncumbent: 'triceratops-proportions-20260827-927239-q2-a0001-c03', prepared: true };
  for (const [id, center] of addedMasses) {
    document.nodes[id] = { type: 'shape.sdf.ellipsoid', params: { center, radii: [0.05, 0.05, 0.05] } };
    document.nodes['field.body'].inputs.push(id);
    document.nodes['field.body'].params.radii.push(0.001);
  }
  document.nodes['materials.character-v2'] = {
    type: 'material.triceratopsSkinPbrV2',
    params: {
      roughness: 0.68,
      roughnessVariation: 0.08,
      flatShading: false,
      facetScale: 14,
      facetContrast: 0.2,
      noiseStrength: 0.17,
      brushStrength: 0.03,
      normalStrength: 0,
      normalScale: 18,
      boneColor: '#edd296',
      boneRoughness: 0.62,
      irisColor: '#dca22c',
      pupilColor: '#12100d'
    }
  };
  document.nodes['lighting.guided-sun-path'] = {
    type: 'lighting.sunPath',
    params: { states: ['dawn', 'morning', 'late-morning', 'noon', 'afternoon', 'golden-hour', 'sunset', 'overcast'], reflectionSteps: 12, checkpointSteps: 36 }
  };
  document.nodes['scene.guided-environments'] = {
    type: 'scene.environmentPreset',
    params: { canonical: 'studio-reference-v1', robustness: 'day-cycle-8-v1' }
  };
  document.nodes['review.guided-light-sweep'] = {
    type: 'review.lightSweep',
    inputs: ['lighting.guided-sun-path', 'scene.guided-environments'],
    params: { provisionalViews: 4, checkpointViews: 10, maxClippedFraction: 0.2 }
  };
  return document;
}

const loops = [
  { focus: 'world-scale-and-stance', question: 'Does the adult fill the reference frame while remaining fully grounded?', edits: [p('scene.preview', 'params/radius', 10.25), p('scene.preview', 'params/cameraBaseY', 2.14), p('edit.ring.stature', 'params/scale', [1, 1.28, 1]), p('edit.ring.stature', 'params/translate', [0, 0.36, 0])] },
  { focus: 'length-to-height-ratio', question: 'Is the body longer and lower without becoming stretched?', edits: [p('anatomy.torso', 'params/center', [0.18, 1.58, 0]), p('anatomy.torso', 'params/radii', [2.5, 1.05, 1]), p('edit.ring.chest', 'params/scale', [1.02, 1.04, 1.02])] },
  { focus: 'rib-cage-length', question: 'Does the chest extend between shoulder and pelvis?', edits: [p('anatomy.ribcage', 'params/center', [-0.1, 1.62, 0]), p('anatomy.ribcage', 'params/radii', [1.9, 0.98, 0.96]), p('field.body', 'params/radii/33', 0.18)] },
  { focus: 'rib-cage-depth', question: 'Is the thorax deep and barrel-shaped?', edits: [p('anatomy.ribcage', 'params/radii', [1.9, 1.05, 1])] },
  { focus: 'dorsal-arch', question: 'Does the back rise over the shoulder and flow into the pelvis?', edits: [p('anatomy.torso', 'params/center', [0.18, 1.6, 0]), p('anatomy.ribcage', 'params/center', [-0.12, 1.66, 0]), p('anatomy.shoulder', 'params/center', [-1.42, 2.0, 0])] },
  { focus: 'shoulder-girdle', question: 'Does the forequarter carry distinct adult mass?', edits: [p('anatomy.shoulder', 'params/center', [-1.4, 2.0, 0]), p('anatomy.shoulder', 'params/radii', [1.2, 1.16, 0.98])] },
  { focus: 'pelvis-mass', question: 'Does the hip block support the hind legs?', edits: [p('anatomy.pelvis', 'params/center', [1.3, 1.63, 0]), p('anatomy.pelvis', 'params/radii', [1.22, 0.98, 1]), p('field.body', 'params/radii/34', 0.2), p('edit.ring.hip', 'params/scale', [1.02, 1.05, 1.03])] },
  { focus: 'neck-base', question: 'Does the skull connect through a short powerful neck?', edits: [p('anatomy.neck', 'params/center', [-1.62, 1.96, 0]), p('anatomy.neck', 'params/radii', [0.72, 0.7, 0.76]), p('field.body', 'params/radii/35', 0.18)] },
  { focus: 'tail-base', question: 'Does the tail emerge heavily from the pelvis?', edits: [p('anatomy.tail-base', 'params/start', [1.86, 1.62, 0]), p('anatomy.tail-base', 'params/end', [2.98, 1.46, 0]), p('anatomy.tail-base', 'params/radii', [0.76, 0.48]), p('anatomy.tail-mid', 'params/radii', [0.5, 0.29]), p('anatomy.tail-tip', 'params/end', [4.72, 1.02, -0.04])] },
  { focus: 'scaffold-gate', question: 'Does the complete silhouette read as an adult Triceratops?', gate: true, edits: [] },

  { focus: 'skull-scale', question: 'Is the skull proportional to the adult torso?', edits: [p('anatomy.head', 'params/center', [-2.3, 2.02, 0]), p('anatomy.head', 'params/radii', [0.92, 0.78, 0.7]), p('edit.ring.head', 'params/scale', [0.96, 0.95, 0.95]), p('edit.ring.head', 'params/translate', [0, -0.02, 0]), p('edit.ring.head', 'params/rotate', [0, 0, 0])] },
  { focus: 'skull-depth', question: 'Does the skull read as a deep wedge instead of a tube?', edits: [p('anatomy.head', 'params/radii', [0.9, 0.82, 0.7]), p('anatomy.head', 'params/center', [-2.31, 2.04, 0])] },
  { focus: 'muzzle-length', question: 'Is the snout compact and deep?', edits: [p('anatomy.muzzle-upper', 'params/center', [-2.82, 1.82, 0]), p('anatomy.muzzle-upper', 'params/radii', [0.56, 0.48, 0.51]), p('anatomy.muzzle-lower', 'params/center', [-2.68, 1.59, 0]), p('anatomy.muzzle-lower', 'params/radii', [0.52, 0.31, 0.47])] },
  { focus: 'beak-downturn', question: 'Does the beak hook downward and separate from the mouth?', edits: [p('attachments.detail', 'params/items/10/start', [-3.25, 1.69, 0]), p('attachments.detail', 'params/items/10/end', [-3.58, 1.35, 0]), p('attachments.detail', 'params/items/10/radius', 0.18)] },
  { focus: 'cheek-and-jaw', question: 'Does the jaw carry weight behind the beak?', edits: [p('anatomy.jaw', 'params/center', [-2.66, 1.58, 0]), p('anatomy.jaw', 'params/radii', [0.7, 0.38, 0.5]), p('field.body', 'params/radii/36', 0.14), p('anatomy.cheek', 'params/center', [-2.36, 1.91, 0]), p('anatomy.cheek', 'params/radii', [0.66, 0.58, 0.66]), p('field.body', 'params/radii/37', 0.16)] },
  { focus: 'eye-orbit-and-brow', question: 'Are the eyes smaller and seated inside the skull?', edits: [p('attachments.detail', 'params/items/23/position', [-2.56, 2.14, -0.61]), p('attachments.detail', 'params/items/23/radius', 0.105), p('attachments.detail', 'params/items/24/position', [-2.59, 2.14, -0.66]), p('attachments.detail', 'params/items/24/radius', 0.05), p('attachments.detail', 'params/items/25/position', [-2.56, 2.14, 0.61]), p('attachments.detail', 'params/items/25/radius', 0.105), p('attachments.detail', 'params/items/26/position', [-2.59, 2.14, 0.66]), p('attachments.detail', 'params/items/26/radius', 0.05)] },
  { focus: 'frill-width', question: 'Is the frill broad without overpowering the torso?', edits: [p('anatomy.frill-crown', 'params/radii', [0.32, 1.16, 1.28]), p('anatomy.frill-base', 'params/radii', [0.5, 0.76, 0.94]), p('attachments.detail', 'params/frillWidth', 1.1)] },
  { focus: 'frill-height-and-angle', question: 'Does the frill lean back with a readable plate silhouette?', edits: [p('anatomy.frill-crown', 'params/center', [-1.65, 2.5, 0]), p('anatomy.frill-crown', 'params/radii', [0.31, 1.18, 1.28]), p('anatomy.frill-base', 'params/center', [-1.84, 2.12, 0])] },
  { focus: 'brow-horns', question: 'Are the brow horns thick-rooted and aimed upward-forward?', edits: [p('attachments.detail', 'params/hornLength', 1.14), p('attachments.detail', 'params/items/0/start', [-2.36, 2.43, 0.42]), p('attachments.detail', 'params/items/0/end', [-3.59, 3.2, 0.54]), p('attachments.detail', 'params/items/0/radius', 0.21), p('attachments.detail', 'params/items/1/start', [-2.36, 2.43, -0.42]), p('attachments.detail', 'params/items/1/end', [-3.59, 3.2, -0.54]), p('attachments.detail', 'params/items/1/radius', 0.21), p('attachments.detail', 'params/items/2/start', [-3.05, 2.02, 0]), p('attachments.detail', 'params/items/2/end', [-3.48, 2.58, 0]), p('attachments.detail', 'params/items/2/radius', 0.15)] },
  { focus: 'face-gate', question: 'Does the head read in the same adult design language as the reference?', gate: true, edits: [] },

  { focus: 'foreleg-spacing', question: 'Are the forelegs positioned under the shoulder load?', edits: symmetricLegEdits('anatomy.leg-front', { upper: { start: [-1.34, 1.62, 0.7], end: [-1.31, 0.88, 0.7] }, lower: { start: [-1.31, 0.91, 0.7], end: [-1.29, 0.31, 0.7] }, foot: { center: [-1.4, 0.21, 0.7] } }) },
  { focus: 'upper-foreleg', question: 'Does the upper arm merge cleanly into the shoulder?', edits: symmetricLegEdits('anatomy.leg-front', { upper: { radii: [0.6, 0.46] } }) },
  { focus: 'elbow', question: 'Is the elbow break subtle and load-bearing?', edits: symmetricLegEdits('anatomy.leg-front', { upper: { end: [-1.3, 0.88, 0.7] }, lower: { start: [-1.3, 0.92, 0.7] } }) },
  { focus: 'lower-foreleg', question: 'Is the forearm vertical and columnar?', edits: symmetricLegEdits('anatomy.leg-front', { lower: { end: [-1.28, 0.31, 0.7], radii: [0.44, 0.33] } }) },
  { focus: 'forefoot', question: 'Is the forefoot compact and planted?', edits: symmetricLegEdits('anatomy.leg-front', { foot: { center: [-1.39, 0.2, 0.7], radii: [0.42, 0.22, 0.36] } }) },
  { focus: 'front-toes', question: 'Are three front toes separated and forward-facing?', edits: symmetricToeEdits('anatomy.leg-front', -1.66, 0.16, 0.7, 0.16, [0.24, 0.105, 0.105]) },
  { focus: 'hind-leg-spacing', question: 'Are the hind legs seated beneath the pelvis?', edits: symmetricLegEdits('anatomy.leg-rear', { upper: { start: [1.27, 1.58, 0.72], end: [1.48, 0.91, 0.72] }, lower: { start: [1.47, 0.92, 0.72], end: [1.31, 0.3, 0.72] }, foot: { center: [1.16, 0.2, 0.72] } }) },
  { focus: 'thigh-and-hip', question: 'Does the thigh emerge from a strong hip mass?', edits: symmetricLegEdits('anatomy.leg-rear', { upper: { radii: [0.62, 0.46] } }), extra: [p('anatomy.haunch', 'params/center', [1.22, 1.52, 0]), p('anatomy.haunch', 'params/radii', [1.2, 0.92, 1.02]), p('field.body', 'params/radii/40', 0.18)] },
  { focus: 'knee-and-hock', question: 'Are the knee and hock bends readable without shortening the leg?', edits: [...symmetricLegEdits('anatomy.leg-rear', { lower: { start: [1.47, 0.92, 0.72], end: [1.3, 0.3, 0.72], radii: [0.44, 0.33] }, foot: { center: [1.13, 0.2, 0.72], radii: [0.43, 0.22, 0.36] } }), ...symmetricToeEdits('anatomy.leg-rear', 0.88, 0.16, 0.72, 0.16, [0.24, 0.105, 0.105])] },
  { focus: 'limb-gate', question: 'Does the animal look stable, heavy, and capable of walking?', gate: true, edits: [] },

  { focus: 'pectoral-mass', question: 'Is there enough chest muscle between the forelegs?', edits: [p('anatomy.pectoral', 'params/center', [-1.05, 1.31, 0]), p('anatomy.pectoral', 'params/radii', [0.84, 0.55, 0.86]), p('field.body', 'params/radii/38', 0.16)] },
  { focus: 'shoulder-neck-tension', question: 'Does skin pull cleanly from shoulder into neck and frill?', edits: [p('anatomy.neck-tension', 'params/center', [-1.36, 1.88, 0]), p('anatomy.neck-tension', 'params/radii', [0.76, 0.6, 0.8]), p('field.body', 'params/radii/41', 0.14)] },
  { focus: 'armpit-fold', question: 'Does the foreleg-body junction avoid a pinched seam?', edits: [p('anatomy.pectoral', 'params/center', [-1.08, 1.25, 0]), p('field.body', 'params/radii/38', 0.22)] },
  { focus: 'belly-weight', question: 'Does the abdomen hang with controlled adult weight?', edits: [p('anatomy.belly', 'params/center', [0.02, 1.1, 0]), p('anatomy.belly', 'params/radii', [1.65, 0.5, 0.78]), p('field.body', 'params/radii/39', 0.16)] },
  { focus: 'flank-transition', question: 'Does the rib cage narrow naturally into the pelvis?', edits: [p('anatomy.ribcage', 'params/center', [-0.18, 1.68, 0]), p('anatomy.pelvis', 'params/center', [1.28, 1.58, 0]), p('field.body', 'params/radii/34', 0.26)] },
  { focus: 'hip-thigh-muscle', question: 'Does the hindquarter read as powerful rather than cylindrical?', edits: [p('anatomy.haunch', 'params/center', [1.24, 1.5, 0]), p('anatomy.haunch', 'params/radii', [1.16, 0.92, 1.02]), p('field.body', 'params/radii/40', 0.2)] },
  { focus: 'groin-and-knee-folds', question: 'Are compressed joint transitions controlled rather than black or pinched?', edits: [p('field.body', 'params/radii/39', 0.2), p('field.body', 'params/radii/40', 0.24)] },
  { focus: 'tail-root-tension', question: 'Does muscle flow continuously from pelvis into the tail?', edits: [p('anatomy.tail-base', 'params/start', [1.82, 1.62, 0]), p('anatomy.tail-base', 'params/radii', [0.8, 0.5]), p('field.body', 'params/radii/6', 0.24)] },
  { focus: 'bone-landmarks', question: 'Are major landmarks present without looking skeletal?', edits: [p('anatomy.shoulder', 'params/center', [-1.42, 1.8, 0]), p('anatomy.pelvis', 'params/center', [1.3, 1.6, 0]), p('anatomy.haunch', 'params/radii', [1.16, 0.94, 1.02])] },
  { focus: 'soft-tissue-gate', question: 'Does skin look heavy over muscle and tight over bone?', gate: true, edits: [] },

  { focus: 'surface-zones', question: 'Are surface regions complete and stable?', edits: [p('mesh.body', 'params/surface/cavityStrength', 0.04), p('mesh.body', 'params/surface/cavityColor', '#4a2417')] },
  { focus: 'macro-palette', question: 'Does the orange back and lighter underside match the reference?', edits: [p('asset.character', 'inputs/1', 'materials.character-v2'), p('mesh.body', 'params/surface/baseColor', '#d77a1d'), p('mesh.body', 'params/surface/undersideColor', '#d8a34d'), p('mesh.body', 'params/surface/dorsalColor', '#934014')] },
  { focus: 'triangular-facet-scale', question: 'Are facets crisp and readable rather than blurry?', edits: [p('materials.character-v2', 'params/facetScale', 22), p('materials.character-v2', 'params/facetContrast', 0.28), p('materials.character-v2', 'params/noiseStrength', 0.12), p('materials.character-v2', 'params/brushStrength', 0.015)] },
  { focus: 'cavity-darkening', question: 'Do joints gain depth without dirty black patches?', edits: [p('mesh.body', 'params/surface/cavityStrength', 0.13), p('mesh.body', 'params/surface/cavityColor', '#552616')] },
  { focus: 'roughness', question: 'Does the hide read as dry painted skin rather than plastic?', edits: [p('materials.character-v2', 'params/roughness', 0.66), p('materials.character-v2', 'params/roughnessVariation', 0.11)] },
  { focus: 'fine-normal-detail', question: 'Does fine breakup preserve the broad low-poly planes?', edits: [p('materials.character-v2', 'params/normalStrength', 0.16), p('materials.character-v2', 'params/normalScale', 21)] },
  { focus: 'keratin-material', question: 'Do horns, beak, and claws separate without looking detached?', edits: [p('materials.character-v2', 'params/boneColor', '#e7c47e'), p('materials.character-v2', 'params/boneRoughness', 0.7)] },
  { focus: 'lighting-response', question: 'Does the shader remain stable across the full light sweep?', edits: [p('materials.character-v2', 'params/roughness', 0.69), p('materials.character-v2', 'params/roughnessVariation', 0.085), p('materials.character-v2', 'params/normalStrength', 0.13)] },
  { focus: 'asymmetry-and-cleanup', question: 'Does subtle asymmetry add life without breaking the silhouette?', edits: [p('anatomy.tail-mid', 'params/end', [3.67, 1.18, -0.07]), p('attachments.detail', 'params/items/0/end', [-3.72, 3.2, 0.55]), p('attachments.detail', 'params/items/1/end', [-3.72, 3.15, -0.53])] },
  { focus: 'final-blind-review-and-export', question: 'Is the final winner clearly closer to the reference than the original incumbent?', gate: true, edits: [] }
];

for (const loop of loops) {
  if (loop.extra) loop.edits.push(...loop.extra);
  delete loop.extra;
}

export const GUIDED_LOOPS = loops.map((loop, index) => ({ loop: index + 1, ...loop }));

export function targetDocument(source) {
  const document = prepareGuidedDocument(source);
  for (const loop of GUIDED_LOOPS) for (const edit of loop.edits) {
    const segments = edit.path.slice(1).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
    let cursor = document;
    for (let index = 0; index < segments.length - 1; index++) cursor = cursor[segments[index]];
    cursor[segments.at(-1)] = deepClone(edit.target);
  }
  return document;
}
