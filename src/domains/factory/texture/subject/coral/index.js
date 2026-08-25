import { defineDomain } from "../../../../../domain.js";
import { createRasterSurface } from "../../../../../foundation/raster/surface.js";
import {
  createMask,
  maskCircle,
  maskEllipse,
  maskLine,
  maskPixel,
  maskPolyline,
  cleanMask,
} from "../../../../../foundation/raster/primitives.js";
import { shadeMask } from "../../../../../foundation/raster/shading.js";

export const coralDomain = defineDomain({
  id: "factory-texture-subject-coral-domain",
  domainPath: "n:factory:texture:subject:coral",
  parentDomainPath: "n:factory:texture:subject",
  requires: ["factory:texture:subject"],
  provides: ["aquatic:coral"],
  owns: ["coral morphology", "coral species", "coral coloration", "standalone coral rasterization"],
  doesNotOwn: ["fish", "water", "terrain", "reef layout", "scene composition"],
  services: ["coral-morphology"],
});

export const SPECIES = Object.freeze([
  {
    id: "staghorn",
    common: "Staghorn coral",
    scientific: "Acropora cervicornis",
    form: "open antler colony with tapered fingers",
    morphology: "branching",
    designProfile: "antler-colony",
  },
  {
    id: "elkhorn",
    common: "Elkhorn coral",
    scientific: "Acropora palmata",
    form: "broad flattened paddles with lobed crowns",
    morphology: "frond",
    designProfile: "paddle-crown",
  },
  {
    id: "brain",
    common: "Grooved brain coral",
    scientific: "Diploria labyrinthiformis",
    form: "low dome crossed by continuous labyrinth valleys",
    morphology: "mound",
    designProfile: "labyrinth-dome",
  },
  {
    id: "pillar",
    common: "Pillar coral",
    scientific: "Dendrogyra cylindrus",
    form: "clustered organic columns with rounded crowns",
    morphology: "column",
    designProfile: "column-garden",
  },
  {
    id: "lettuce",
    common: "Lettuce coral",
    scientific: "Agaricia agaricites",
    form: "stacked ruffled plates around a central rosette",
    morphology: "plate",
    designProfile: "ruffled-rosette",
  },
  {
    id: "sea-fan",
    common: "Purple sea fan",
    scientific: "Gorgonia ventalina",
    form: "broad reticulate fan with open lattice cells",
    morphology: "fan",
    designProfile: "reticulate-fan",
  },
  {
    id: "sea-rod",
    common: "Bent sea rod",
    scientific: "Eunicea flexuosa",
    form: "soft candelabrum rods with rounded polyp tips",
    morphology: "rod",
    designProfile: "soft-candelabrum",
  },
]);

export const PALETTES = Object.freeze({
  gold: ["#4a3327", "#76503a", "#aa784c", "#d8ad6e", "#f5dfaa"],
  pink: ["#4d2b30", "#81434a", "#bd6670", "#e69791", "#ffd0b8"],
  purple: ["#35283e", "#60466c", "#9670a0", "#d09bc0", "#efd5e8"],
  green: ["#26382f", "#47634b", "#709568", "#a8c68a", "#e0e7b5"],
  orange: ["#513024", "#824733", "#bd7047", "#efa16a", "#ffd29c"],
  bleached: ["#625e55", "#8b8578", "#b8b09e", "#ded6c2", "#fff4da"],
});

export const speciesById = (id) => SPECIES.find((entry) => entry.id === id) ?? SPECIES[0];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const radians = (degrees) => degrees * Math.PI / 180;
const scaled = (value, width, height) => Math.max(1, Math.round(value * Math.min(width, height) / 96));

function maskCount(mask) {
  let count = 0;
  for (const value of mask.data) count += value ? 1 : 0;
  return count;
}

function maskBounds(mask) {
  let minimumX = mask.width;
  let minimumY = mask.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.data[y * mask.width + x]) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  if (maximumX < 0) return null;
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1,
  };
}

function clipMask(body, detail) {
  for (let index = 0; index < detail.data.length; index += 1) {
    if (!body.data[index]) detail.data[index] = 0;
  }
}

function removeOverlap(primary, secondary) {
  for (let index = 0; index < secondary.data.length; index += 1) {
    if (primary.data[index]) secondary.data[index] = 0;
  }
}

function paintMask(surface, mask, value) {
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (mask.data[y * mask.width + x]) surface.setPixel(x, y, value);
    }
  }
}

function maskPolygon(mask, points, value = 1) {
  if (points.length < 3) return;
  const minimumY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
  const maximumY = Math.min(mask.height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
  for (let y = minimumY; y <= maximumY; y += 1) {
    const scanY = y + 0.5;
    const intersections = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      if ((a[1] <= scanY && b[1] > scanY) || (b[1] <= scanY && a[1] > scanY)) {
        const amount = (scanY - a[1]) / (b[1] - a[1]);
        intersections.push(lerp(a[0], b[0], amount));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index]);
      const end = Math.floor(intersections[index + 1]);
      for (let x = start; x <= end; x += 1) maskPixel(mask, x, y, value);
    }
  }
}

function quadraticPoints(start, control, end, steps = 12) {
  const points = [];
  for (let index = 0; index <= steps; index += 1) {
    const amount = index / steps;
    const inverse = 1 - amount;
    points.push([
      inverse * inverse * start[0] + 2 * inverse * amount * control[0] + amount * amount * end[0],
      inverse * inverse * start[1] + 2 * inverse * amount * control[1] + amount * amount * end[1],
    ]);
  }
  return points;
}

function pointAlong(points, amount) {
  const index = clamp(Math.round(amount * (points.length - 1)), 0, points.length - 1);
  return points[index];
}

function drawOrganicStroke(context, points, radius, { shadow = true, highlight = true } = {}) {
  const bodyRadius = Math.max(0, Math.round(radius));
  maskPolyline(context.body, points, bodyRadius);
  if (shadow && bodyRadius > 0) {
    maskPolyline(context.shadow, points.map(([x, y]) => [x + Math.max(1, bodyRadius * 0.55), y + 1]), Math.max(0, bodyRadius - 1));
  }
  if (highlight) {
    maskPolyline(context.highlight, points.map(([x, y]) => [x - 1, y - 1]), Math.max(0, bodyRadius - 2));
  }
}

function drawIrregularBase(context, rng, { centerX, baseY, width, height, detail = 4 }) {
  const top = [];
  const bottom = [];
  const samples = 12;
  for (let index = 0; index <= samples; index += 1) {
    const amount = index / samples;
    const x = centerX - width / 2 + width * amount;
    const edge = Math.sin(amount * Math.PI);
    top.push([x, baseY - edge * height * 0.48 + rng.range(-0.8, 0.8)]);
    bottom.unshift([x, baseY + height * (0.34 + edge * 0.2) + rng.range(-0.45, 0.45)]);
  }
  maskPolygon(context.body, [...top, ...bottom]);
  maskPolyline(context.highlight, top.slice(2, -2), 0);
  maskPolyline(context.shadow, bottom.slice(2, -2), 0);
  for (let index = 0; index < detail; index += 1) {
    const x = centerX + rng.range(-width * 0.34, width * 0.34);
    const y = baseY + rng.range(-height * 0.08, height * 0.38);
    maskPixel(index % 2 ? context.highlight : context.shadow, x, y);
  }
}

function drawStaghorn(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, withBase } = settings;
  const totalHeight = height * (0.48 + size * 0.25);
  const colonyWidth = width * (0.38 + size * 0.18);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: colonyWidth * 0.92, height: height * 0.085, detail: 5 });
  }

  let featureCount = 0;
  let tipCount = 0;
  const primaryCount = 3 + Math.round(density * 3);

  function grow(stream, start, angle, length, radius, depth) {
    const directionX = Math.sin(angle);
    const directionY = -Math.cos(angle);
    const end = [
      start[0] + directionX * length + stream.range(-1, 1) * asymmetry * length * 0.11,
      start[1] + directionY * length,
    ];
    const normalX = -directionY;
    const control = [
      lerp(start[0], end[0], 0.52) + normalX * stream.range(-1, 1) * length * (0.04 + asymmetry * 0.07),
      lerp(start[1], end[1], 0.52),
    ];
    const points = quadraticPoints(start, control, end, 9);
    drawOrganicStroke(context, points, radius);
    featureCount += 1;

    if (depth <= 0 || length < height * 0.08) {
      maskCircle(context.tips, end[0], end[1], Math.max(1, Math.round(radius + 0.7)));
      tipCount += 1;
      return;
    }

    const fork = pointAlong(points, stream.range(0.58, 0.75));
    const spread = radians(stream.range(28, 44));
    const continuation = angle + radians(stream.range(-8, 8));
    grow(stream.fork("main"), end, continuation, length * stream.range(0.54, 0.66), Math.max(1, radius * 0.64), depth - 1);
    grow(stream.fork("side"), fork, angle + stream.sign() * spread, length * stream.range(0.48, 0.6), Math.max(1, radius * 0.6), depth - 1);
    if (density > 0.68 && depth > 1 && stream.chance(0.58)) {
      grow(stream.fork("extra"), pointAlong(points, 0.45), angle - stream.sign() * spread * 0.82, length * 0.38, Math.max(1, radius * 0.58), depth - 1);
    }
  }

  for (let index = 0; index < primaryCount; index += 1) {
    const stream = rng.fork(`primary-${index}`);
    const amount = primaryCount === 1 ? 0.5 : index / (primaryCount - 1);
    const lateral = lerp(-colonyWidth * 0.34, colonyWidth * 0.34, amount) + stream.range(-2, 2) * asymmetry;
    const start = [centerX + lateral, baseY];
    const angle = radians(lerp(-18, 18, amount) + stream.range(-8, 8) * asymmetry);
    const length = totalHeight * stream.range(0.31, 0.39);
    const depth = density > 0.48 ? 3 : 2;
    grow(stream, start, angle, length, scaled(2.15 + size * 0.7, width, height), depth);
  }

  return { featureCount, tipCount };
}

function drawPaddle(context, stream, start, angle, length, startRadius, endRadius, { brightTip = true } = {}) {
  const end = [start[0] + Math.sin(angle) * length, start[1] - Math.cos(angle) * length];
  const control = [
    lerp(start[0], end[0], 0.48) + stream.range(-1, 1) * length * 0.08,
    lerp(start[1], end[1], 0.48) + stream.range(-1, 1) * length * 0.04,
  ];
  const points = quadraticPoints(start, control, end, 11);
  for (let index = 0; index < points.length; index += 1) {
    const amount = index / (points.length - 1);
    const radius = lerp(startRadius, endRadius, Math.sin(amount * Math.PI * 0.5));
    maskEllipse(context.body, points[index][0], points[index][1], radius * (0.92 + amount * 0.14), radius);
  }
  maskPolyline(context.shadow, points.map(([x, y]) => [x + 1, y + Math.max(1, endRadius * 0.48)]), Math.max(0, Math.round(endRadius * 0.28)));
  maskPolyline(context.highlight, points.map(([x, y]) => [x - 1, y - Math.max(1, endRadius * 0.45)]), 0);
  if (brightTip) maskCircle(context.tips, end[0] - 1, end[1] - 1, Math.max(1, Math.round(endRadius * 0.38)));
  return { end, points };
}

function drawElkhorn(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, withBase } = settings;
  const totalHeight = height * (0.43 + size * 0.22);
  const crownWidth = width * (0.53 + size * 0.19);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: crownWidth * 0.72, height: height * 0.09, detail: 4 });
  }

  const trunkTop = [centerX + rng.range(-2, 2) * asymmetry, baseY - totalHeight * 0.34];
  drawPaddle(
    context,
    rng.fork("trunk"),
    [centerX, baseY + 1],
    0,
    totalHeight * 0.38,
    scaled(4.8 + size * 1.5, width, height),
    scaled(5.5 + size * 1.8, width, height),
    { brightTip: false },
  );

  const paddleCount = 5 + Math.round(density * 2);
  for (let index = 0; index < paddleCount; index += 1) {
    const stream = rng.fork(`paddle-${index}`);
    const baseAngle = lerp(-70, 70, index / Math.max(1, paddleCount - 1));
    const angle = radians(baseAngle + stream.range(-5, 5) * (0.45 + asymmetry));
    const direction = Math.sign(baseAngle) || (index % 2 ? 1 : -1);
    const start = [
      trunkTop[0] + direction * stream.range(0, crownWidth * 0.055),
      trunkTop[1] + totalHeight * lerp(0.22, -0.08, index / Math.max(1, paddleCount - 1)) + stream.range(-2, 2),
    ];
    const length = crownWidth * stream.range(0.35, 0.49) * (Math.abs(baseAngle) > 45 ? 1.09 : 0.94);
    const result = drawPaddle(
      context,
      stream,
      start,
      angle,
      length,
      scaled(3.8 + size, width, height),
      scaled(5.2 + size * 2.1, width, height),
    );
    if (density > 0.48 && index % 2 === 0) {
      drawPaddle(
        context,
        stream.fork("lobe"),
        pointAlong(result.points, 0.58),
        angle + radians(direction * -1 * stream.range(18, 28)),
        length * 0.43,
        scaled(2.6, width, height),
        scaled(3.7 + size, width, height),
      );
    }
  }

  return { featureCount: paddleCount + 1 + Math.ceil(paddleCount / 2), tipCount: paddleCount + Math.ceil(paddleCount / 2) + 1 };
}

function ellipseOutline(mask, centerX, centerY, radiusX, radiusY, phase = 0) {
  const points = [];
  const steps = 28;
  for (let index = 0; index <= steps; index += 1) {
    const angle = phase + index / steps * Math.PI * 2;
    points.push([centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY]);
  }
  maskPolyline(mask, points, 0);
}

function drawBrain(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, withBase } = settings;
  const stream = rng.fork("dome");
  const radiusX = width * (0.245 + size * 0.085);
  const radiusY = height * (0.155 + size * 0.065);
  const domeX = centerX + stream.range(-1, 1) * asymmetry * width * 0.045;
  const domeY = baseY - radiusY * 0.92;

  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX: domeX, baseY: baseY + radiusY * 0.03, width: radiusX * 2.12, height: height * 0.075, detail: 6 });
  }

  maskEllipse(context.body, domeX, domeY, radiusX, radiusY);
  maskEllipse(context.body, domeX - radiusX * 0.42, domeY + radiusY * 0.22, radiusX * 0.61, radiusY * 0.77);
  maskEllipse(context.body, domeX + radiusX * 0.43, domeY + radiusY * 0.2, radiusX * 0.58, radiusY * 0.74);

  const rows = 4 + Math.round(density * 3);
  const top = domeY - radiusY + scaled(4, width, height);
  const bottom = domeY + radiusY - scaled(4, width, height);
  const maze = [];
  for (let row = 0; row < rows; row += 1) {
    const amountY = rows === 1 ? 0.5 : row / (rows - 1);
    const y = lerp(top, bottom, amountY);
    const normalized = clamp((y - domeY) / radiusY, -0.95, 0.95);
    const half = radiusX * Math.sqrt(Math.max(0.08, 1 - normalized * normalized)) - scaled(3, width, height);
    const left = domeX - half;
    const right = domeX + half;
    const rowPoints = [];
    const samples = 18;
    for (let sample = 0; sample <= samples; sample += 1) {
      const amountX = sample / samples;
      const x = lerp(left, right, amountX);
      const wobble = Math.sin(amountX * Math.PI * (2.4 + row % 2 * 0.65) + row * 1.7) * scaled(1.7, width, height)
        + Math.sin(amountX * Math.PI * 5.2 + stream.range(-0.2, 0.2)) * scaled(0.65, width, height);
      rowPoints.push([x, y + wobble]);
    }
    if (row % 2) rowPoints.reverse();
    if (maze.length) maze.push([maze.at(-1)[0], rowPoints[0][1]]);
    maze.push(...rowPoints);
  }
  maskPolyline(context.shadow, maze, scaled(0.8, width, height));
  maskPolyline(context.highlight, maze.map(([x, y]) => [x - 1, y - scaled(1.6, width, height)]), 0);

  const loopCount = 1 + Math.round(density * 2);
  for (let index = 0; index < loopCount; index += 1) {
    const loop = rng.fork(`loop-${index}`);
    ellipseOutline(
      context.shadow,
      domeX + loop.range(-radiusX * 0.38, radiusX * 0.38),
      domeY + loop.range(-radiusY * 0.32, radiusY * 0.3),
      loop.range(radiusX * 0.09, radiusX * 0.18),
      loop.range(radiusY * 0.12, radiusY * 0.24),
      loop.range(0, Math.PI),
    );
  }

  return { featureCount: rows + loopCount, tipCount: 0 };
}

function drawPillar(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, highlight, withBase } = settings;
  const totalHeight = height * (0.44 + size * 0.25);
  const clusterWidth = width * (0.47 + size * 0.17);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: clusterWidth * 1.03, height: height * 0.1, detail: 6 });
  }

  const columnCount = 5 + Math.round(density * 2);
  for (let index = 0; index < columnCount; index += 1) {
    const stream = rng.fork(`column-${index}`);
    const amount = columnCount === 1 ? 0.5 : index / (columnCount - 1);
    const startX = centerX + lerp(-clusterWidth * 0.42, clusterWidth * 0.42, amount) + stream.range(-2.4, 2.4) * asymmetry;
    const columnHeight = totalHeight * stream.range(index % 3 === 1 ? 0.82 : 0.49, 1.02);
    const radius = scaled(3 + size * 1.65 + stream.range(-0.45, 0.55), width, height);
    const bend = stream.range(-1, 1) * (1.2 + asymmetry * width * 0.055);
    const steps = Math.max(8, Math.round(columnHeight / 3));
    const centerLine = [];
    for (let step = 0; step <= steps; step += 1) {
      const amountY = step / steps;
      const x = startX + bend * amountY * amountY + Math.sin(amountY * Math.PI) * stream.range(-0.8, 0.8);
      const y = baseY - columnHeight * amountY;
      const localRadius = radius * (1 - amountY * 0.12) * (0.96 + Math.sin(amountY * Math.PI * 3 + index) * 0.04);
      maskCircle(context.body, x, y, localRadius);
      centerLine.push([x, y]);
    }
    maskPolyline(context.shadow, centerLine.map(([x, y]) => [x + radius * 0.58, y + 1]), 0);
    maskPolyline(context.highlight, centerLine.map(([x, y]) => [x - radius * 0.55, y - 1]), 0);
    const crown = centerLine.at(-1);
    maskEllipse(context.highlight, crown[0] - 1, crown[1] - 1, Math.max(1, radius * 0.58), Math.max(1, radius * 0.28));
    maskCircle(context.tips, crown[0] - radius * 0.35, crown[1] - 1, scaled(0.75, width, height));
    const polypStep = scaled(6 - highlight * 1.5, width, height);
    for (let y = crown[1] + polypStep * 1.5, mark = 0; y < baseY - polypStep; y += polypStep, mark += 1) {
      const amountY = (baseY - y) / columnHeight;
      const x = startX + bend * amountY * amountY + (mark % 2 ? radius * 0.24 : -radius * 0.14);
      maskPixel(mark % 3 === 0 ? context.highlight : context.shadow, x, y);
    }
  }

  return { featureCount: columnCount, tipCount: columnCount };
}

function ruffledPlate(context, stream, centerX, centerY, plateWidth, depth, wave, tilt, rotation = 0) {
  const upper = [];
  const lower = [];
  const samples = 18;
  const transform = (x, y) => [
    centerX + x * Math.cos(rotation) - y * Math.sin(rotation),
    centerY + x * Math.sin(rotation) + y * Math.cos(rotation),
  ];
  for (let index = 0; index <= samples; index += 1) {
    const amount = index / samples;
    const x = -plateWidth / 2 + plateWidth * amount;
    const envelope = Math.sin(amount * Math.PI);
    const ripple = Math.sin(amount * Math.PI * 4 + wave) * depth * 0.27 * envelope;
    const slope = (amount - 0.5) * tilt;
    upper.push(transform(x, -envelope * depth * 0.45 + ripple + slope));
    lower.unshift(transform(x, depth * (0.32 + envelope * 0.34) + ripple * 0.35 + slope));
  }
  maskPolygon(context.body, [...upper, ...lower]);
  maskPolyline(context.highlight, upper.slice(1, -1), 0);
  maskPolyline(context.shadow, lower.slice(1, -1), Math.max(0, Math.round(depth * 0.18)));
}

function drawLettuce(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, withBase } = settings;
  const totalHeight = height * (0.38 + size * 0.2);
  const maximumWidth = width * (0.52 + size * 0.2);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: maximumWidth * 0.68, height: height * 0.08, detail: 4 });
  }
  maskLine(context.body, centerX, baseY, centerX, baseY - totalHeight * 0.67, scaled(2.4, width, height));

  const layerCount = 5 + Math.round(density * 3);
  for (let index = layerCount - 1; index >= 0; index -= 1) {
    const stream = rng.fork(`plate-${index}`);
    const amount = index / Math.max(1, layerCount - 1);
    const arch = Math.sin((amount * 0.72 + 0.16) * Math.PI);
    const plateWidth = maximumWidth * (0.48 + arch * 0.44) * stream.range(0.9, 1.04);
    const centerY = baseY - totalHeight * (0.15 + amount * 0.7);
    const direction = index % 2 ? 1 : -1;
    const offset = direction * maximumWidth * (0.025 + amount * 0.055) + Math.sin(index * 2.2) * asymmetry * maximumWidth * 0.08 + stream.range(-1.4, 1.4);
    ruffledPlate(
      context,
      stream,
      centerX + offset,
      centerY,
      plateWidth,
      scaled(5.2 + size * 2.2, width, height),
      stream.range(0, Math.PI * 2),
      stream.range(-2.5, 2.5) * asymmetry,
      radians(direction * (9 + amount * 19) + stream.range(-4, 4) * asymmetry),
    );
  }

  const crownY = baseY - totalHeight * 0.82;
  for (let index = 0; index < 3; index += 1) {
    const stream = rng.fork(`crown-${index}`);
    const direction = index - 1;
    ruffledPlate(
      context,
      stream,
      centerX + direction * maximumWidth * 0.08,
      crownY - Math.abs(direction) * scaled(1.5, width, height),
      maximumWidth * (0.24 + (index === 1 ? 0.07 : 0)),
      scaled(4.8, width, height),
      stream.range(0, Math.PI * 2),
      direction * asymmetry * 2,
      radians(direction * (index === 1 ? 0 : 25)),
    );
  }

  return { featureCount: layerCount + 3, tipCount: 0 };
}

function interpolatePolyline(points, amount) {
  const scaledAmount = clamp(amount, 0, 1) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaledAmount));
  const local = scaledAmount - index;
  return [lerp(points[index][0], points[index + 1][0], local), lerp(points[index][1], points[index + 1][1], local)];
}

function drawSeaFan(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, withBase } = settings;
  const fanHeight = height * (0.49 + size * 0.22);
  const fanWidth = width * (0.56 + size * 0.18);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: fanWidth * 0.34, height: height * 0.075, detail: 3 });
  }

  const trunkTop = [centerX + rng.range(-1, 1) * asymmetry * 3, baseY - fanHeight * 0.2];
  drawOrganicStroke(context, [[centerX, baseY], [centerX - 1, baseY - fanHeight * 0.11], trunkTop], scaled(2.1, width, height));

  const ribCount = 9 + Math.round(density * 5);
  const ribs = [];
  const endpoints = [];
  for (let index = 0; index < ribCount; index += 1) {
    const stream = rng.fork(`rib-${index}`);
    const amount = ribCount === 1 ? 0.5 : index / (ribCount - 1);
    const centered = amount * 2 - 1;
    const envelope = Math.sqrt(Math.max(0, 1 - centered * centered));
    const lean = asymmetry * fanWidth * 0.08;
    const sideScale = centered < 0 ? 1 + asymmetry * 0.14 : 1 - asymmetry * 0.06;
    const end = [
      centerX + centered * fanWidth * 0.5 * sideScale + lean * amount + stream.range(-2.2, 2.2),
      baseY - fanHeight * (0.7 + envelope * 0.29) + stream.range(-2.5, 2.5) + centered * asymmetry * fanHeight * 0.045,
    ];
    const root = [trunkTop[0] + centered * fanWidth * 0.055, trunkTop[1] + Math.abs(centered) * fanHeight * 0.05];
    const points = [
      root,
      [centerX + centered * fanWidth * 0.13 + stream.range(-1.5, 1.5), baseY - fanHeight * 0.38 + stream.range(-1.5, 1.5)],
      [centerX + centered * fanWidth * 0.31 + lean * 0.55 + stream.range(-1.7, 1.7), baseY - fanHeight * 0.65 + envelope * fanHeight * 0.025 + stream.range(-1.5, 1.5)],
      end,
    ];
    const radius = index === 0 || index === ribCount - 1 || index === Math.floor(ribCount / 2) ? scaled(1.15, width, height) : 0;
    drawOrganicStroke(context, points, radius, { shadow: radius > 0, highlight: radius > 0 });
    ribs.push(points);
    endpoints.push(end);
    maskCircle(context.tips, end[0], end[1], scaled(0.75, width, height));
  }

  let connectorCount = 0;
  const levels = [0.39, 0.52, 0.65, 0.77, 0.88];
  for (let index = 0; index < ribs.length - 1; index += 1) {
    const stream = rng.fork(`cell-${index}`);
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
      if (!stream.chance(0.5 + density * 0.43)) continue;
      const amount = levels[levelIndex];
      const offset = (levelIndex + index) % 2 ? 0.035 : -0.025;
      const start = interpolatePolyline(ribs[index], amount);
      const end = interpolatePolyline(ribs[index + 1], clamp(amount + offset, 0, 1));
      maskLine(context.body, ...start, ...end, 0);
      if ((levelIndex + index) % 3 === 0) maskLine(context.highlight, start[0], start[1] - 1, end[0], end[1] - 1, 0);
      connectorCount += 1;
    }
  }
  for (let index = 0; index < endpoints.length - 1; index += 1) {
    const stream = rng.fork(`rim-${index}`);
    if (!stream.chance(0.72 + density * 0.18)) continue;
    const start = endpoints[index];
    const end = endpoints[index + 1];
    const middle = [
      (start[0] + end[0]) / 2 + stream.range(-1.5, 1.5),
      Math.min(start[1], end[1]) - stream.range(0, 2.2),
    ];
    const rim = quadraticPoints(start, middle, end, 5);
    maskPolyline(context.body, rim, 0);
    if (index % 3 === 0) maskPolyline(context.highlight, rim.map(([x, y]) => [x - 1, y - 1]), 0);
  }

  return { featureCount: ribCount + connectorCount, tipCount: ribCount };
}

function drawSeaRod(context, settings) {
  const { rng, width, height, centerX, baseY, size, density, asymmetry, highlight, withBase } = settings;
  const totalHeight = height * (0.47 + size * 0.24);
  const clusterWidth = width * (0.34 + size * 0.16);
  if (withBase) {
    drawIrregularBase(context, rng.fork("base"), { centerX, baseY, width: clusterWidth * 0.82, height: height * 0.085, detail: 5 });
  }

  let featureCount = 0;
  let tipCount = 0;
  const rodCount = 4 + Math.round(density * 3);

  function rod(stream, start, angle, length, radius, branches) {
    const end = [start[0] + Math.sin(angle) * length, start[1] - Math.cos(angle) * length];
    const control = [
      lerp(start[0], end[0], 0.5) + stream.range(-1, 1) * length * (0.08 + asymmetry * 0.08),
      lerp(start[1], end[1], 0.5),
    ];
    const points = quadraticPoints(start, control, end, 12);
    drawOrganicStroke(context, points, radius);
    featureCount += 1;
    maskCircle(context.tips, end[0], end[1], Math.max(1, radius));
    tipCount += 1;

    const polypSpacing = clamp(scaled(7 - highlight * 2, width, height), 3, 7);
    for (let index = 2; index < points.length - 1; index += polypSpacing > 5 ? 3 : 2) {
      const point = points[index];
      const side = index % 2 ? 1 : -1;
      maskCircle(context.body, point[0] + side * (radius + 1), point[1], scaled(0.8, width, height));
      maskPixel(context.tips, point[0] + side * (radius + 1), point[1] - 1);
    }

    if (branches <= 0) return;
    const branchCount = density > 0.7 ? 2 : 1;
    for (let index = 0; index < branchCount; index += 1) {
      const forkAmount = 0.44 + index * 0.2 + stream.range(-0.04, 0.04);
      const fork = pointAlong(points, forkAmount);
      const direction = (index + Math.round(start[0])) % 2 ? 1 : -1;
      rod(
        stream.fork(`branch-${index}`),
        fork,
        angle + direction * radians(stream.range(24, 39)),
        length * stream.range(0.28, 0.4),
        Math.max(1, radius * 0.68),
        branches - 1,
      );
    }
  }

  for (let index = 0; index < rodCount; index += 1) {
    const stream = rng.fork(`rod-${index}`);
    const amount = rodCount === 1 ? 0.5 : index / (rodCount - 1);
    const start = [centerX + lerp(-clusterWidth * 0.31, clusterWidth * 0.31, amount), baseY];
    const angle = radians(lerp(-15, 15, amount) + stream.range(-10, 10) * asymmetry);
    rod(
      stream,
      start,
      angle,
      totalHeight * stream.range(0.54, 0.93),
      scaled(2.15 + size * 0.85, width, height),
      density > 0.52 ? 1 : 0,
    );
  }

  return { featureCount, tipCount };
}

const RENDERERS = Object.freeze({
  branching: drawStaghorn,
  frond: drawElkhorn,
  mound: drawBrain,
  column: drawPillar,
  plate: drawLettuce,
  fan: drawSeaFan,
  rod: drawSeaRod,
});

export function renderCoralMorphology({
  rng,
  width = 96,
  height = 96,
  speciesId = "staghorn",
  size = 0.5,
  density = 0.5,
  asymmetry = 0.3,
  palette,
  highlight = 0.5,
  seed = "coral",
  withBase = true,
}) {
  const species = speciesById(speciesId);
  const surface = createRasterSurface({ width, height, transparent: true });
  const context = {
    body: createMask(width, height),
    shadow: createMask(width, height),
    highlight: createMask(width, height),
    tips: createMask(width, height),
  };
  const baseY = Math.round(height * 0.81);
  const centerX = Math.round(width / 2 + rng.fork("center").range(-1, 1) * asymmetry * width * 0.035);
  const renderer = RENDERERS[species.morphology] ?? drawStaghorn;
  const morphology = renderer(context, {
    rng: rng.fork(species.designProfile),
    width,
    height,
    centerX,
    baseY,
    size,
    density,
    asymmetry,
    highlight,
    withBase,
  });

  cleanMask(context.body, { minNeighbors: 1, passes: 1 });
  clipMask(context.body, context.shadow);
  clipMask(context.body, context.highlight);
  clipMask(context.body, context.tips);
  removeOverlap(context.tips, context.highlight);
  removeOverlap(context.tips, context.shadow);
  removeOverlap(context.shadow, context.highlight);

  shadeMask(surface, context.body, palette, {
    seed,
    accentMask: context.shadow,
    tipMask: context.tips,
    texture: 0.025 + highlight * 0.07,
  });
  paintMask(surface, context.highlight, palette[3]);
  paintMask(surface, context.tips, palette[4]);

  const bounds = maskBounds(context.body);
  const occupied = maskCount(context.body);
  const boundsArea = bounds ? bounds.width * bounds.height : 1;
  return {
    surface,
    species,
    mask: context.body,
    accent: context.shadow,
    highlights: context.highlight,
    tips: context.tips,
    morphologyMetrics: {
      featureCount: morphology.featureCount,
      tipCount: morphology.tipCount,
      shadowPixels: maskCount(context.shadow),
      highlightPixels: maskCount(context.highlight),
      tipPixels: maskCount(context.tips),
      silhouetteFill: occupied / boundsArea,
      silhouetteAspect: bounds ? bounds.width / bounds.height : 0,
    },
  };
}
