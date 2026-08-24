import { performance } from 'node:perf_hooks';
import {
  V3,
  clamp,
  saturate,
  lerp,
  srgbToLinear,
  linearToSrgb,
  acesToneMap,
  fract,
} from '../../../src/domains/factory/object/creature/aquatic/fish/math.js';
import { createImage, downsampleBox } from './png.mjs';

const PI = Math.PI;
const EPSILON = 1e-8;

function edge(aX, aY, bX, bY, cX, cY) {
  return (cX - aX) * (bY - aY) - (cY - aY) * (bX - aX);
}

function cameraPreset(view, bounds, aspect) {
  const center = bounds.center;
  const size = bounds.size;
  const span = Math.max(size[0], size[1] * aspect, size[2]);
  const sideDistance = span * 1.58;
  switch (view) {
    case 'side':
      return { eye: [center[0] + 0.12, center[1] + 0.08, sideDistance], target: [center[0] - 0.15, center[1] + 0.02, 0], up: [0, 1, 0], fov: 31 };
    case 'top':
      return { eye: [center[0], center[1] + span * 1.70, 0.01], target: [center[0] - 0.25, center[1], 0], up: [0, 0, -1], fov: 34 };
    case 'head':
      return { eye: [bounds.max[0] + 1.65, center[1] + 0.55, 3.25], target: [bounds.max[0] - 0.78, center[1] + 0.08, 0.31], up: [0, 1, 0], fov: 24 };
    case 'body':
      return { eye: [center[0] + 0.75, center[1] + 0.55, 4.25], target: [center[0] + 0.05, center[1] + 0.02, 0.30], up: [0, 1, 0], fov: 23 };
    case 'tail':
      return { eye: [bounds.min[0] - 0.85, center[1] + 0.55, 3.45], target: [bounds.min[0] + 0.75, center[1] + 0.02, 0.06], up: [0, 1, 0], fov: 25 };
    case 'front':
      return { eye: [bounds.max[0] + span * 1.18, center[1] + 0.25, 0.02], target: [bounds.max[0] - 0.70, center[1], 0], up: [0, 1, 0], fov: 31 };
    case 'in-scene':
      return { eye: [center[0] + span * 0.83, center[1] + span * 0.24, span * 1.18], target: [center[0] - 0.35, center[1] - 0.06, 0], up: [0, 1, 0], fov: 37 };
    case 'three-quarter':
    case 'hero':
    default:
      return { eye: [center[0] + span * 0.44, center[1] + span * 0.20, span * 1.82], target: [center[0] - 0.12, center[1] + 0.02, 0], up: [0, 1, 0], fov: 33 };
  }
}

function createCamera(view, bounds, width, height, override = {}) {
  const aspect = width / height;
  const preset = { ...cameraPreset(view, bounds, aspect), ...override };
  const forward = V3.norm(V3.sub(preset.target, preset.eye));
  const right = V3.norm(V3.cross(forward, preset.up));
  const up = V3.norm(V3.cross(right, forward));
  const tanHalf = Math.tan((preset.fov * PI / 180) * 0.5);
  return { ...preset, forward, right, actualUp: up, tanHalf, aspect, near: 0.05 };
}

function projectPoint(point, camera, width, height) {
  const q = V3.sub(point, camera.eye);
  const cx = V3.dot(q, camera.right);
  const cy = V3.dot(q, camera.actualUp);
  const cz = V3.dot(q, camera.forward);
  if (cz <= camera.near) return null;
  const ndcX = cx / (cz * camera.tanHalf * camera.aspect);
  const ndcY = cy / (cz * camera.tanHalf);
  return [(ndcX * 0.5 + 0.5) * width, (0.5 - ndcY * 0.5) * height, cz, 1 / cz];
}

function cameraRay(camera, x, y, width, height) {
  const ndcX = ((x + 0.5) / width) * 2 - 1;
  const ndcY = 1 - ((y + 0.5) / height) * 2;
  return V3.norm(V3.add(
    camera.forward,
    V3.add(
      V3.mul(camera.right, ndcX * camera.tanHalf * camera.aspect),
      V3.mul(camera.actualUp, ndcY * camera.tanHalf),
    ),
  ));
}

function buildShadowMap(model, options = {}) {
  const size = options.size ?? 384;
  const bounds = model.bounds;
  const center = [bounds.center[0], bounds.center[1] - 0.15, bounds.center[2]];
  const lightDirection = V3.norm(options.lightDirection ?? [0.48, 0.82, 0.44]); // surface -> light
  const eye = V3.add(center, V3.mul(lightDirection, 12));
  const forward = V3.norm(V3.sub(center, eye));
  const right = V3.norm(V3.cross(forward, [0, 1, 0]));
  const up = V3.norm(V3.cross(right, forward));
  const half = Math.max(bounds.size[0], bounds.size[1], bounds.size[2]) * 0.72;
  const depth = new Float64Array(size * size);
  depth.fill(Infinity);

  const project = (point) => {
    const q = V3.sub(point, center);
    const x = V3.dot(q, right) / half;
    const y = V3.dot(q, up) / half;
    const z = V3.dot(V3.sub(point, eye), forward);
    return [(x * 0.5 + 0.5) * size, (0.5 - y * 0.5) * size, z];
  };

  for (const mesh of model.meshes) {
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
      const ia = mesh.indices[triangle] * 3;
      const ib = mesh.indices[triangle + 1] * 3;
      const ic = mesh.indices[triangle + 2] * 3;
      const a = project([mesh.positions[ia], mesh.positions[ia + 1], mesh.positions[ia + 2]]);
      const b = project([mesh.positions[ib], mesh.positions[ib + 1], mesh.positions[ib + 2]]);
      const c = project([mesh.positions[ic], mesh.positions[ic + 1], mesh.positions[ic + 2]]);
      const area = edge(a[0], a[1], b[0], b[1], c[0], c[1]);
      if (Math.abs(area) < 1e-7) continue;
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const maxX = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const maxY = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = edge(b[0], b[1], c[0], c[1], px, py) / area;
          const w1 = edge(c[0], c[1], a[0], a[1], px, py) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
          const z = a[2] * w0 + b[2] * w1 + c[2] * w2;
          const index = y * size + x;
          if (z < depth[index]) depth[index] = z;
        }
      }
    }
  }

  const sample = (point, normal = [0, 1, 0]) => {
    const p = project(V3.add(point, V3.mul(normal, 0.028)));
    const sx = p[0];
    const sy = p[1];
    if (sx < 1 || sy < 1 || sx >= size - 1 || sy >= size - 1) return 1;
    const bias = 0.024 + (1 - Math.max(0, V3.dot(normal, lightDirection))) * 0.030;
    let visibility = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const x = Math.floor(sx) + ox;
        const y = Math.floor(sy) + oy;
        const stored = depth[y * size + x];
        visibility += p[2] <= stored + bias ? 1 : 0.22;
      }
    }
    return visibility / 9;
  };

  return { size, depth, sample, lightDirection };
}

function sampleTexture(texture, u, v, options = {}) {
  if (!texture) return [1, 1, 1, 1];
  const wrap = options.wrap ?? true;
  let uu = wrap ? fract(u) : clamp(u);
  let vv = wrap ? fract(v) : clamp(v);
  if (uu < 0) uu += 1;
  if (vv < 0) vv += 1;
  const x = uu * (texture.width - 1);
  const y = vv * (texture.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(texture.width - 1, x0 + 1);
  const y1 = Math.min(texture.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const samples = [
    (y0 * texture.width + x0) * 4,
    (y0 * texture.width + x1) * 4,
    (y1 * texture.width + x0) * 4,
    (y1 * texture.width + x1) * 4,
  ];
  const output = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel += 1) {
    const top = texture.data[samples[0] + channel] * (1 - fx) + texture.data[samples[1] + channel] * fx;
    const bottom = texture.data[samples[2] + channel] * (1 - fx) + texture.data[samples[3] + channel] * fx;
    output[channel] = (top * (1 - fy) + bottom * fy) / 255;
  }
  return output;
}

function schlickFresnel(cosTheta, f0) {
  const factor = Math.pow(1 - clamp(cosTheta), 5);
  return [
    f0[0] + (1 - f0[0]) * factor,
    f0[1] + (1 - f0[1]) * factor,
    f0[2] + (1 - f0[2]) * factor,
  ];
}

function distributionGgx(nDotH, roughness) {
  const a = roughness * roughness;
  const a2 = a * a;
  const denominator = nDotH * nDotH * (a2 - 1) + 1;
  return a2 / Math.max(PI * denominator * denominator, 1e-6);
}

function geometrySchlickGgx(nDotV, roughness) {
  const r = roughness + 1;
  const k = (r * r) / 8;
  return nDotV / Math.max(nDotV * (1 - k) + k, 1e-6);
}

function geometrySmith(nDotV, nDotL, roughness) {
  return geometrySchlickGgx(nDotV, roughness) * geometrySchlickGgx(nDotL, roughness);
}

function pbrLight(baseColor, metallic, roughness, normal, view, lightDirection, radiance) {
  const nDotL = Math.max(0, V3.dot(normal, lightDirection));
  const nDotV = Math.max(0.001, V3.dot(normal, view));
  if (nDotL <= 0) return [0, 0, 0];
  const halfVector = V3.norm(V3.add(view, lightDirection));
  const nDotH = Math.max(0, V3.dot(normal, halfVector));
  const vDotH = Math.max(0, V3.dot(view, halfVector));
  const f0 = V3.mix([0.04, 0.04, 0.04], baseColor, metallic);
  const F = schlickFresnel(vDotH, f0);
  const D = distributionGgx(nDotH, roughness);
  const G = geometrySmith(nDotV, nDotL, roughness);
  const specularScale = (D * G) / Math.max(4 * nDotV * nDotL, 1e-5);
  const specular = V3.mul(F, specularScale);
  const kD = [(1 - F[0]) * (1 - metallic), (1 - F[1]) * (1 - metallic), (1 - F[2]) * (1 - metallic)];
  const diffuse = V3.mul(V3.had(kD, baseColor), 1 / PI);
  return V3.mul(V3.had(V3.add(diffuse, specular), radiance), nDotL);
}

function environmentColor(reflection) {
  const skyT = clamp(reflection[1] * 0.5 + 0.5);
  const horizon = Math.pow(1 - Math.abs(reflection[1]), 3);
  let color = V3.mix([0.015, 0.095, 0.130], [0.24, 0.58, 0.62], skyT);
  color = V3.add(color, V3.mul([0.55, 0.72, 0.60], horizon * 0.18));
  return color;
}

function applyNormalMap(normal, tangent4, sample) {
  if (!tangent4 || tangent4.length < 4) return normal;
  let tangent = [tangent4[0], tangent4[1], tangent4[2]];
  tangent = V3.norm(V3.sub(tangent, V3.mul(normal, V3.dot(normal, tangent))));
  let bitangent = V3.norm(V3.cross(normal, tangent));
  bitangent = V3.mul(bitangent, tangent4[3] || 1);
  const tangentNormal = V3.norm([sample[0] * 2 - 1, sample[1] * 2 - 1, sample[2] * 2 - 1]);
  return V3.norm(V3.add(
    V3.add(V3.mul(tangent, tangentNormal[0]), V3.mul(bitangent, tangentNormal[1])),
    V3.mul(normal, tangentNormal[2]),
  ));
}

function shadeSurface({
  model,
  material,
  uv,
  normal,
  tangent,
  worldPosition,
  camera,
  shadow,
  mode,
  environment,
  lightDirection,
}) {
  if (mode === 'silhouette') return { color: [0.012, 0.030, 0.035], alpha: material.alphaMode === 'BLEND' ? 0.85 : 1 };
  const baseTexture = material.baseColorTexture ? model.textures[material.baseColorTexture] : null;
  const baseSample = sampleTexture(baseTexture, uv[0], uv[1], { wrap: true });
  const factorSrgb = material.baseColorFactor?.slice(0, 3) ?? [1, 1, 1];
  const factorLinear = srgbToLinear(factorSrgb);
  const sampledLinear = baseTexture?.colorSpace === 'srgb' ? srgbToLinear(baseSample.slice(0, 3)) : baseSample.slice(0, 3);
  const baseColor = V3.had(factorLinear, sampledLinear);
  const alpha = clamp((material.baseColorFactor?.[3] ?? 1) * baseSample[3]);

  const mrTexture = material.metallicRoughnessTexture ? model.textures[material.metallicRoughnessTexture] : null;
  const mrSample = sampleTexture(mrTexture, uv[0], uv[1], { wrap: true });
  const roughness = clamp((material.roughnessFactor ?? 1) * (mrTexture ? mrSample[1] : 1), 0.035, 0.95);
  const metallic = clamp((material.metallicFactor ?? 0) * (mrTexture ? mrSample[2] : 1), 0, 1);
  const aoTexture = material.occlusionTexture ? model.textures[material.occlusionTexture] : null;
  const ao = aoTexture ? lerp(0.35, 1, sampleTexture(aoTexture, uv[0], uv[1], { wrap: true })[0]) : 1;

  const normalTexture = material.normalTexture ? model.textures[material.normalTexture] : null;
  const normalSample = normalTexture ? sampleTexture(normalTexture, uv[0], uv[1], { wrap: true }) : [0.5, 0.5, 1, 1];
  let N = applyNormalMap(normal, tangent, normalSample);
  const V = V3.norm(V3.sub(camera.eye, worldPosition));
  if (material.doubleSided && V3.dot(N, V) < 0) N = V3.mul(N, -1);

  const keyRadiance = environment === 'studio' ? [4.1, 3.9, 3.6] : [3.2, 3.55, 3.45];
  const fillDirection = V3.norm([-0.62, 0.20, 0.70]);
  const rimDirection = V3.norm([-0.20, 0.52, -0.83]);
  let color = V3.mul(pbrLight(baseColor, metallic, roughness, N, V, lightDirection, keyRadiance), shadow);
  color = V3.add(color, pbrLight(baseColor, metallic, clamp(roughness + 0.08, 0.04, 1), N, V, fillDirection, [0.38, 0.62, 0.72]));
  color = V3.add(color, pbrLight(baseColor, metallic, clamp(roughness + 0.14, 0.04, 1), N, V, rimDirection, [0.28, 0.47, 0.62]));

  const reflection = V3.reflect(V3.mul(V, -1), N);
  const env = environmentColor(reflection);
  const f0 = V3.mix([0.04, 0.04, 0.04], baseColor, metallic);
  const fresnel = schlickFresnel(Math.max(0, V3.dot(N, V)), f0);
  const ambientDiffuse = V3.mul(baseColor, (0.13 + Math.max(0, N[1]) * 0.08) * ao);
  const ambientSpecular = V3.mul(V3.had(env, fresnel), (1 - roughness) * 0.48 + 0.08);
  color = V3.add(color, V3.add(ambientDiffuse, ambientSpecular));

  const clearcoat = material.clearcoat ?? 0;
  if (clearcoat > 0) {
    const H = V3.norm(V3.add(V, lightDirection));
    const nDotH = Math.max(0, V3.dot(N, H));
    const vDotH = Math.max(0, V3.dot(V, H));
    const coatRoughness = clamp(material.clearcoatRoughness ?? 0.16, 0.025, 0.7);
    const D = distributionGgx(nDotH, coatRoughness);
    const G = geometrySmith(Math.max(0.001, V3.dot(N, V)), Math.max(0.001, V3.dot(N, lightDirection)), coatRoughness);
    const F = 0.04 + 0.96 * Math.pow(1 - vDotH, 5);
    const coat = clearcoat * D * G * F / Math.max(4 * Math.max(0.001, V3.dot(N, V)) * Math.max(0.001, V3.dot(N, lightDirection)), 1e-5);
    color = V3.add(color, V3.mul([1.0, 1.02, 1.02], coat * shadow * 0.62));
  }

  const iridescence = material.iridescence ?? 0;
  if (iridescence > 0) {
    const angle = 1 - Math.max(0, V3.dot(N, V));
    const phase = angle * 13.5 + uv[0] * 4.5 + uv[1] * 2.2;
    const shift = [
      0.5 + 0.5 * Math.sin(phase),
      0.5 + 0.5 * Math.sin(phase + 2.094),
      0.5 + 0.5 * Math.sin(phase + 4.188),
    ];
    color = V3.add(color, V3.mul(shift, iridescence * angle * 0.075));
  }

  const subsurface = material.subsurface ?? 0;
  if (subsurface > 0) {
    const back = Math.pow(Math.max(0, V3.dot(V3.mul(lightDirection, -1), N)), 1.5);
    color = V3.add(color, V3.mul(V3.had(baseColor, [0.45, 0.95, 0.84]), subsurface * back * 0.55));
  }

  if (environment !== 'studio') {
    const distance = V3.len(V3.sub(worldPosition, camera.eye));
    const fog = 1 - Math.exp(-distance * distance * 0.0023);
    color = V3.mix(color, [0.025, 0.235, 0.285], fog * 0.34);
  }
  return { color, alpha };
}

function writeLinearPixel(image, index, linearColor, alpha = 1, blend = false) {
  const mapped = linearToSrgb(acesToneMap(linearColor));
  const src = [clamp(mapped[0]) * 255, clamp(mapped[1]) * 255, clamp(mapped[2]) * 255];
  if (!blend || alpha >= 0.999) {
    image.data[index] = Math.round(src[0]);
    image.data[index + 1] = Math.round(src[1]);
    image.data[index + 2] = Math.round(src[2]);
    image.data[index + 3] = 255;
  } else {
    const inverse = 1 - alpha;
    image.data[index] = Math.round(src[0] * alpha + image.data[index] * inverse);
    image.data[index + 1] = Math.round(src[1] * alpha + image.data[index + 1] * inverse);
    image.data[index + 2] = Math.round(src[2] * alpha + image.data[index + 2] * inverse);
    image.data[index + 3] = 255;
  }
}

function proceduralBackground(x, y, width, height, environment) {
  const nx = x / Math.max(1, width - 1);
  const ny = y / Math.max(1, height - 1);
  if (environment === 'studio') {
    const radial = Math.hypot(nx - 0.52, ny - 0.46);
    const t = clamp(ny * 0.76 + radial * 0.18);
    return V3.mix([0.50, 0.66, 0.66], [0.055, 0.155, 0.185], t);
  }
  const horizon = clamp((ny - 0.35) / 0.65);
  let color = V3.mix([0.018, 0.125, 0.190], [0.045, 0.345, 0.385], horizon);
  const lightShaft = Math.pow(Math.max(0, Math.cos((nx * 1.7 + ny * 0.24 - 0.34) * PI)), 18) * (1 - ny);
  color = V3.add(color, V3.mul([0.20, 0.55, 0.52], lightShaft * 0.16));
  const vignette = clamp(1 - Math.hypot((nx - 0.5) * 0.92, (ny - 0.5) * 0.82) * 0.42, 0.65, 1);
  return V3.mul(color, vignette);
}

function fillBackgroundAndGround(image, zBuffer, camera, shadowMap, groundY, environment) {
  const width = image.width;
  const height = image.height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const rgbaIndex = pixelIndex * 4;
      const ray = cameraRay(camera, x, y, width, height);
      let color = proceduralBackground(x, y, width, height, environment);
      if (ray[1] < -1e-5) {
        const t = (groundY - camera.eye[1]) / ray[1];
        if (t > 0) {
          const world = V3.add(camera.eye, V3.mul(ray, t));
          const cameraDepth = V3.dot(V3.sub(world, camera.eye), camera.forward);
          if (cameraDepth > camera.near) {
            zBuffer[pixelIndex] = cameraDepth;
            const noise = 0.5 + 0.5 * Math.sin(world[0] * 8.7 + Math.sin(world[2] * 3.2)) * Math.sin(world[2] * 7.9);
            const caustic = Math.pow(Math.max(0, Math.sin(world[0] * 2.4 + world[2] * 1.8) * Math.sin(world[0] * 1.3 - world[2] * 2.8)), 5);
            const shadow = shadowMap.sample(world, [0, 1, 0]);
            const sandBase = environment === 'studio' ? [0.28, 0.36, 0.35] : [0.31, 0.43, 0.34];
            color = V3.mul(V3.add(sandBase, V3.mul([0.19, 0.24, 0.14], noise * 0.10 + caustic * 0.18)), 0.48 + 0.52 * shadow);
            const distanceFog = 1 - Math.exp(-t * 0.035);
            color = V3.mix(color, environment === 'studio' ? [0.10, 0.22, 0.24] : [0.03, 0.26, 0.29], distanceFog * 0.38);
          }
        }
      }
      writeLinearPixel(image, rgbaIndex, color, 1, false);
    }
  }

  // Deterministic suspended particles: sparse, subtle, and depth-neutral.
  if (environment !== 'studio') {
    for (let y = 4; y < height - 4; y += 1) {
      for (let x = 4; x < width - 4; x += 1) {
        const hash = fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
        if (hash > 0.99945) {
          const index = (y * width + x) * 4;
          const brightness = 42 + Math.round((hash - 0.99945) * 180000);
          image.data[index] = Math.min(255, image.data[index] + brightness);
          image.data[index + 1] = Math.min(255, image.data[index + 1] + brightness);
          image.data[index + 2] = Math.min(255, image.data[index + 2] + brightness * 0.9);
        }
      }
    }
  }
}

function prepareMesh(mesh, camera, width, height) {
  const vertexCount = mesh.positions.length / 3;
  const projected = new Float64Array(vertexCount * 4);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const index = vertex * 3;
    const p = [mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]];
    const projection = projectPoint(p, camera, width, height);
    const target = vertex * 4;
    if (!projection) {
      projected[target] = NaN;
      projected[target + 1] = NaN;
      projected[target + 2] = -Infinity;
      projected[target + 3] = 0;
    } else {
      projected[target] = projection[0];
      projected[target + 1] = projection[1];
      projected[target + 2] = projection[2];
      projected[target + 3] = projection[3];
    }
  }
  return projected;
}

function renderTriangle({
  mesh,
  triangleOffset,
  projected,
  material,
  model,
  image,
  zBuffer,
  camera,
  shadowMap,
  mode,
  environment,
  transparentPass,
}) {
  const width = image.width;
  const height = image.height;
  const ids = [mesh.indices[triangleOffset], mesh.indices[triangleOffset + 1], mesh.indices[triangleOffset + 2]];
  const projections = ids.map((id) => projected.subarray(id * 4, id * 4 + 4));
  if (!Number.isFinite(projections[0][0]) || !Number.isFinite(projections[1][0]) || !Number.isFinite(projections[2][0])) return 0;
  const p0 = mesh.positions.slice(ids[0] * 3, ids[0] * 3 + 3);
  const p1 = mesh.positions.slice(ids[1] * 3, ids[1] * 3 + 3);
  const p2 = mesh.positions.slice(ids[2] * 3, ids[2] * 3 + 3);
  const faceNormal = V3.norm(V3.cross(V3.sub(p1, p0), V3.sub(p2, p0)));
  const centroid = V3.mul(V3.add(V3.add(p0, p1), p2), 1 / 3);
  const frontFacing = V3.dot(faceNormal, V3.sub(camera.eye, centroid)) > 0;
  if (!material.doubleSided && !frontFacing) return 0;

  const a = projections[0];
  const b = projections[1];
  const c = projections[2];
  const area = edge(a[0], a[1], b[0], b[1], c[0], c[1]);
  if (Math.abs(area) < 1e-7) return 0;
  const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
  const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  if (minX > maxX || minY > maxY) return 0;

  const n0 = mesh.normals.slice(ids[0] * 3, ids[0] * 3 + 3);
  const n1 = mesh.normals.slice(ids[1] * 3, ids[1] * 3 + 3);
  const n2 = mesh.normals.slice(ids[2] * 3, ids[2] * 3 + 3);
  const uv0 = mesh.uvs.slice(ids[0] * 2, ids[0] * 2 + 2);
  const uv1 = mesh.uvs.slice(ids[1] * 2, ids[1] * 2 + 2);
  const uv2 = mesh.uvs.slice(ids[2] * 2, ids[2] * 2 + 2);
  const t0 = mesh.tangents.slice(ids[0] * 4, ids[0] * 4 + 4);
  const t1 = mesh.tangents.slice(ids[1] * 4, ids[1] * 4 + 4);
  const t2 = mesh.tangents.slice(ids[2] * 4, ids[2] * 4 + 4);
  let pixels = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = edge(b[0], b[1], c[0], c[1], px, py) / area;
      const w1 = edge(c[0], c[1], a[0], a[1], px, py) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
      const denominator = w0 * a[3] + w1 * b[3] + w2 * c[3];
      if (denominator <= EPSILON) continue;
      const l0 = (w0 * a[3]) / denominator;
      const l1 = (w1 * b[3]) / denominator;
      const l2 = 1 - l0 - l1;
      const depth = 1 / denominator;
      const pixelIndex = y * width + x;
      if (depth >= zBuffer[pixelIndex] - (transparentPass ? 0.0005 : 0)) continue;

      const world = [
        p0[0] * l0 + p1[0] * l1 + p2[0] * l2,
        p0[1] * l0 + p1[1] * l1 + p2[1] * l2,
        p0[2] * l0 + p1[2] * l1 + p2[2] * l2,
      ];
      const normal = V3.norm([
        n0[0] * l0 + n1[0] * l1 + n2[0] * l2,
        n0[1] * l0 + n1[1] * l1 + n2[1] * l2,
        n0[2] * l0 + n1[2] * l1 + n2[2] * l2,
      ]);
      const uv = [uv0[0] * l0 + uv1[0] * l1 + uv2[0] * l2, uv0[1] * l0 + uv1[1] * l1 + uv2[1] * l2];
      const tangent = [
        t0[0] * l0 + t1[0] * l1 + t2[0] * l2,
        t0[1] * l0 + t1[1] * l1 + t2[1] * l2,
        t0[2] * l0 + t1[2] * l1 + t2[2] * l2,
        t0[3] * l0 + t1[3] * l1 + t2[3] * l2,
      ];
      const shadow = shadowMap.sample(world, normal);
      const shaded = shadeSurface({
        model,
        material,
        uv,
        normal,
        tangent,
        worldPosition: world,
        camera,
        shadow,
        mode,
        environment,
        lightDirection: shadowMap.lightDirection,
      });
      if (transparentPass && shaded.alpha <= 0.008) continue;
      const rgbaIndex = pixelIndex * 4;
      writeLinearPixel(image, rgbaIndex, shaded.color, transparentPass ? shaded.alpha : 1, transparentPass);
      if (!transparentPass) zBuffer[pixelIndex] = depth;
      pixels += 1;
    }
  }
  return pixels;
}

function drawLineDepth(image, zBuffer, a, b, color, alpha = 0.65) {
  const width = image.width;
  const height = image.height;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.round(lerp(a[0], b[0], t));
    const y = Math.round(lerp(a[1], b[1], t));
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const depth = lerp(a[2], b[2], t);
    const pixelIndex = y * width + x;
    if (depth > zBuffer[pixelIndex] + 0.035) continue;
    const index = pixelIndex * 4;
    image.data[index] = Math.round(image.data[index] * (1 - alpha) + color[0] * alpha);
    image.data[index + 1] = Math.round(image.data[index + 1] * (1 - alpha) + color[1] * alpha);
    image.data[index + 2] = Math.round(image.data[index + 2] * (1 - alpha) + color[2] * alpha);
  }
}

function overlayWireframe(model, prepared, image, zBuffer, density = 3) {
  model.meshes.forEach((mesh, meshIndex) => {
    const projected = prepared[meshIndex];
    const step = mesh.name === 'Fish_Body' ? density * 3 : density;
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3 * step) {
      const ids = [mesh.indices[triangle], mesh.indices[triangle + 1], mesh.indices[triangle + 2]];
      const points = ids.map((id) => projected.subarray(id * 4, id * 4 + 4));
      if (points.some((point) => !Number.isFinite(point[0]))) continue;
      drawLineDepth(image, zBuffer, points[0], points[1], [4, 32, 37], 0.55);
      drawLineDepth(image, zBuffer, points[1], points[2], [4, 32, 37], 0.55);
      drawLineDepth(image, zBuffer, points[2], points[0], [4, 32, 37], 0.55);
    }
  });
}

export function renderModel(model, options = {}) {
  const start = performance.now();
  const outputWidth = options.width ?? 900;
  const outputHeight = options.height ?? 900;
  const supersample = Math.max(1, Math.floor(options.supersample ?? 1));
  const width = outputWidth * supersample;
  const height = outputHeight * supersample;
  const view = options.view ?? 'hero';
  const mode = options.mode ?? 'pbr';
  const environment = options.environment ?? (view === 'in-scene' ? 'underwater' : 'studio');
  const image = createImage(width, height, [0, 0, 0, 255]);
  const zBuffer = new Float64Array(width * height);
  zBuffer.fill(Infinity);
  const camera = createCamera(view, model.bounds, width, height, options.camera ?? {});
  const shadowMap = buildShadowMap(model, { size: options.shadowSize ?? 384, lightDirection: options.lightDirection });
  const groundY = options.groundY ?? model.bounds.min[1] - (view === 'in-scene' ? 0.20 : 0.32);
  fillBackgroundAndGround(image, zBuffer, camera, shadowMap, groundY, environment);

  const prepared = model.meshes.map((mesh) => prepareMesh(mesh, camera, width, height));
  const transparentTriangles = [];
  let opaquePixels = 0;
  let trianglesRendered = 0;
  model.meshes.forEach((mesh, meshIndex) => {
    const material = model.materials[mesh.material];
    if (!material) throw new Error(`Mesh ${mesh.name} references missing material ${mesh.material}`);
    if ((material.alphaMode ?? 'OPAQUE') === 'BLEND' || mesh.transparent) {
      for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
        const ids = [mesh.indices[triangle], mesh.indices[triangle + 1], mesh.indices[triangle + 2]];
        const depth = ids.reduce((sum, id) => sum + prepared[meshIndex][id * 4 + 2], 0) / 3;
        if (Number.isFinite(depth)) transparentTriangles.push({ meshIndex, triangle, depth });
      }
      return;
    }
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
      opaquePixels += renderTriangle({
        mesh,
        triangleOffset: triangle,
        projected: prepared[meshIndex],
        material,
        model,
        image,
        zBuffer,
        camera,
        shadowMap,
        mode,
        environment,
        transparentPass: false,
      });
      trianglesRendered += 1;
    }
  });

  transparentTriangles.sort((a, b) => b.depth - a.depth);
  let transparentPixels = 0;
  for (const triangle of transparentTriangles) {
    const mesh = model.meshes[triangle.meshIndex];
    transparentPixels += renderTriangle({
      mesh,
      triangleOffset: triangle.triangle,
      projected: prepared[triangle.meshIndex],
      material: model.materials[mesh.material],
      model,
      image,
      zBuffer,
      camera,
      shadowMap,
      mode,
      environment,
      transparentPass: true,
    });
    trianglesRendered += 1;
  }

  if (mode === 'wireframe' || options.wireframe) overlayWireframe(model, prepared, image, zBuffer, options.wireframeDensity ?? 3);
  const resultImage = supersample > 1 ? downsampleBox(image, supersample) : image;
  return {
    image: resultImage,
    stats: {
      width: outputWidth,
      height: outputHeight,
      internalWidth: width,
      internalHeight: height,
      view,
      mode,
      environment,
      trianglesRendered,
      opaquePixels,
      transparentPixels,
      durationMs: Math.round((performance.now() - start) * 10) / 10,
    },
  };
}
