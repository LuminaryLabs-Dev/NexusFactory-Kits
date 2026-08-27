import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import * as THREE from '../vendor/three.module.js';
import { sha256, writeJson } from './io-service.mjs';

const require = createRequire(import.meta.url);

function renderer() {
  try {
    return require('@headless-three/renderer');
  } catch (error) {
    throw new Error(`Headless renderer unavailable. Install declared dependencies or configure NODE_PATH. ${error.message}`);
  }
}

function imageLibrary() {
  try {
    return require('sharp');
  } catch (error) {
    throw new Error(`Sharp unavailable. Install declared dependencies or configure NODE_PATH. ${error.message}`);
  }
}

export function renderPng(scene, camera, width, height) {
  return renderer().render(scene, camera, { width, height });
}

export async function analyzePng(buffer) {
  const sharp = imageLibrary();
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0, sum = 0, clipped = 0, crushed = 0;
  for (const value of data) {
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
    if (value >= 250) clipped++;
    if (value <= 5) crushed++;
  }
  return {
    width: info.width,
    height: info.height,
    min,
    max,
    mean: sum / data.length,
    clippedFraction: clipped / data.length,
    crushedFraction: crushed / data.length,
    nonBlank: max - min > 8
  };
}

export function orbitCamera(sceneOutput, azimuth, elevation) {
  const source = sceneOutput.camera;
  const params = sceneOutput.scene.userData.captureParams;
  const camera = source.clone();
  const radius = params.radius;
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  camera.position.set(Math.cos(az) * radius, params.cameraBaseY + Math.sin(el) * radius * 0.42, Math.sin(az) * radius);
  camera.lookAt(...params.lookAt);
  camera.updateMatrixWorld(true);
  return camera;
}

export const DAY_CYCLE_PRESETS = [
  { id: 'dawn', label: 'Dawn', azimuth: -110, elevation: 8, color: '#ffb47a', intensity: 2.0, hemisphereSky: '#9aa8bf', hemisphereGround: '#4c3830', hemisphereIntensity: 1.0, background: '#59616d' },
  { id: 'morning', label: 'Morning', azimuth: -75, elevation: 25, color: '#ffd09b', intensity: 2.8, hemisphereSky: '#c8d9eb', hemisphereGround: '#59473a', hemisphereIntensity: 1.25, background: '#535a63' },
  { id: 'late-morning', label: 'Late morning', azimuth: -35, elevation: 50, color: '#fff0d5', intensity: 3.2, hemisphereSky: '#dce8f4', hemisphereGround: '#5a5148', hemisphereIntensity: 1.35, background: '#4d5258' },
  { id: 'noon', label: 'Noon', azimuth: 0, elevation: 72, color: '#fff8eb', intensity: 3.5, hemisphereSky: '#e5eff8', hemisphereGround: '#625b52', hemisphereIntensity: 1.45, background: '#494e53' },
  { id: 'afternoon', label: 'Afternoon', azimuth: 45, elevation: 42, color: '#ffe2b6', intensity: 3.0, hemisphereSky: '#d5e1ec', hemisphereGround: '#5b4c40', hemisphereIntensity: 1.3, background: '#50565d' },
  { id: 'golden-hour', label: 'Golden hour', azimuth: 75, elevation: 18, color: '#ffad63', intensity: 2.6, hemisphereSky: '#b8bcc8', hemisphereGround: '#50382e', hemisphereIntensity: 1.05, background: '#5b5b61' },
  { id: 'sunset', label: 'Sunset', azimuth: 110, elevation: 6, color: '#ff8751', intensity: 2.1, hemisphereSky: '#8e91aa', hemisphereGround: '#422c29', hemisphereIntensity: 0.9, background: '#5f5862' },
  { id: 'overcast', label: 'Overcast', azimuth: null, elevation: null, color: '#d9e4ee', intensity: 0, hemisphereSky: '#dce5ed', hemisphereGround: '#686b70', hemisphereIntensity: 2.15, background: '#555a60' }
];

function removeLights(scene) {
  const lights = [];
  scene.traverse((object) => { if (object.isLight) lights.push(object); });
  for (const light of lights) light.parent?.remove(light);
}

function applyLightingPreset(scene, preset) {
  removeLights(scene);
  scene.background = new THREE.Color(preset.background ?? '#45484c');
  scene.add(new THREE.HemisphereLight(preset.hemisphereSky, preset.hemisphereGround, preset.hemisphereIntensity));
  if (preset.azimuth !== null && preset.elevation !== null && preset.intensity > 0) {
    const azimuth = THREE.MathUtils.degToRad(preset.azimuth);
    const elevation = THREE.MathUtils.degToRad(preset.elevation);
    const radius = 12;
    const sun = new THREE.DirectionalLight(preset.color, preset.intensity);
    sun.name = `review-sun-${preset.id}`;
    sun.position.set(
      Math.cos(elevation) * Math.cos(azimuth) * radius,
      Math.sin(elevation) * radius,
      Math.cos(elevation) * Math.sin(azimuth) * radius
    );
    scene.add(sun);
  }
  const fill = new THREE.DirectionalLight('#9ebbd1', preset.id === 'overcast' ? 0.3 : 0.42);
  fill.position.set(4, 3, 5);
  scene.add(fill);
  scene.updateMatrixWorld(true);
}

async function writeLightingRecord({ result, profile, outputDirectory, preset, cameraAzimuth, cameraElevation, id, label, detail }) {
  const scene = result.outputs.scene.scene.clone(true);
  applyLightingPreset(scene, preset);
  const sceneOutput = { ...result.outputs.scene, scene };
  sceneOutput.scene.userData.captureParams = result.document.nodes[result.document.outputs.scene].params;
  const camera = orbitCamera(sceneOutput, cameraAzimuth, cameraElevation);
  const png = renderPng(scene, camera, profile.capture.width, profile.capture.height);
  const file = path.join(outputDirectory, `${id}.png`);
  fs.writeFileSync(file, png);
  const image = await analyzePng(png);
  return { id, label, detail, file, presetId: preset.id, cameraAzimuth, sha256: sha256(png), bytes: png.length, image, selected: false };
}

export async function renderDayCycle(result, outputDirectory, profile, options = {}) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const azimuths = options.azimuths ?? [140, 230, 320, 50];
  const presets = options.presets ?? DAY_CYCLE_PRESETS;
  const records = [];
  for (const preset of presets) for (const azimuth of azimuths) {
    records.push(await writeLightingRecord({
      result,
      profile,
      outputDirectory,
      preset,
      cameraAzimuth: azimuth,
      cameraElevation: profile.capture.elevation,
      id: `${preset.id}-${String(Math.round(azimuth)).padStart(3, '0')}deg`,
      label: `${preset.label} · ${Math.round(azimuth)}°`,
      detail: `clip ${(records.at(-1)?.image?.clippedFraction ?? 0).toFixed(3)}`
    }));
  }
  for (const record of records) record.detail = `clip ${record.image.clippedFraction.toFixed(3)} · crush ${record.image.crushedFraction.toFixed(3)}`;
  const contactSheet = path.join(outputDirectory, 'day-cycle-contact-sheet.png');
  await createContactSheet(records, contactSheet, 4);
  const verdict = records.every((record) => record.image.nonBlank && record.image.clippedFraction < (options.maxClippedFraction ?? 0.2));
  const manifest = { schema: 'mesh-day-cycle/v1', profileId: profile.profileId, presets: presets.map((preset) => preset.id), views: azimuths, verdict: verdict ? 'pass' : 'fail', records, contactSheet };
  writeJson(path.join(outputDirectory, 'day-cycle-manifest.json'), manifest);
  return manifest;
}

export async function renderReflectionRing(result, outputDirectory, profile, options = {}) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const steps = options.steps ?? 12;
  const records = [];
  for (let index = 0; index < steps; index++) {
    const azimuth = index * (360 / steps);
    const preset = {
      id: `ring-${String(index + 1).padStart(2, '0')}`,
      label: `Sun ${Math.round(azimuth)}°`,
      azimuth,
      elevation: options.sunElevation ?? 25,
      color: '#ffe1b5',
      intensity: 2.9,
      hemisphereSky: '#cbd9e5',
      hemisphereGround: '#58493e',
      hemisphereIntensity: 1.15,
      background: '#4f545a'
    };
    records.push(await writeLightingRecord({
      result,
      profile,
      outputDirectory,
      preset,
      cameraAzimuth: options.cameraAzimuth ?? profile.capture.startAzimuth,
      cameraElevation: profile.capture.elevation,
      id: `sun-${String(index + 1).padStart(2, '0')}-${String(Math.round(azimuth)).padStart(3, '0')}deg`,
      label: preset.label,
      detail: 'moving-sun reflection check'
    }));
  }
  for (const record of records) record.detail = `clip ${record.image.clippedFraction.toFixed(3)} · mean ${record.image.mean.toFixed(1)}`;
  const contactSheet = path.join(outputDirectory, 'reflection-ring-contact-sheet.png');
  await createContactSheet(records, contactSheet, 4);
  const verdict = records.every((record) => record.image.nonBlank && record.image.clippedFraction < (options.maxClippedFraction ?? 0.2));
  const manifest = { schema: 'mesh-reflection-ring/v1', profileId: profile.profileId, steps, verdict: verdict ? 'pass' : 'fail', records, contactSheet };
  writeJson(path.join(outputDirectory, 'reflection-ring-manifest.json'), manifest);
  return manifest;
}

export async function renderMovingSunVideo(result, outputDirectory, profile, options = {}) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const frames = options.frames ?? 36;
  const ring = await renderReflectionRing(result, outputDirectory, profile, { ...options, steps: frames });
  for (let index = 0; index < ring.records.length; index++) {
    const source = ring.records[index].file;
    const target = path.join(outputDirectory, `frame-${String(index + 1).padStart(3, '0')}.png`);
    fs.copyFileSync(source, target);
  }
  const video = path.join(outputDirectory, 'moving-sun.mp4');
  const command = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(options.fps ?? 12), '-i', path.join(outputDirectory, 'frame-%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video], { encoding: 'utf8' });
  if (command.status !== 0) throw new Error(`Moving-sun video failed: ${command.stderr}`);
  writeJson(path.join(outputDirectory, 'moving-sun-video.json'), { schema: 'mesh-moving-sun-video/v1', frames, fps: options.fps ?? 12, video, reflectionManifest: path.join(outputDirectory, 'reflection-ring-manifest.json') });
  return { video, frames, fps: options.fps ?? 12, ring };
}

export async function createContactSheet(records, outputFile, columns = 5) {
  const sharp = imageLibrary();
  const tileWidth = 300, tileHeight = 300, imageHeight = 252;
  const composites = [];
  for (let i = 0; i < records.length; i++) {
    const label = records[i].label.replace(/[<&>]/g, '');
    const detail = records[i].detail.replace(/[<&>]/g, '');
    const labelSvg = Buffer.from(`<svg width="${tileWidth}" height="48"><rect width="100%" height="100%" fill="#292c30"/><rect width="100%" height="3" fill="${records[i].selected ? '#f2c45b' : '#454a50'}"/><text x="10" y="22" fill="#f5f0e7" font-family="DejaVu Sans" font-size="15" font-weight="700">${label}</text><text x="10" y="40" fill="#cbd0d5" font-family="DejaVu Sans" font-size="11">${detail}</text></svg>`);
    const tile = await sharp(records[i].file).resize(tileWidth, imageHeight, { fit: 'contain', background: '#45484c' }).extend({ bottom: 48, background: '#292c30' }).composite([{ input: labelSvg, left: 0, top: imageHeight }]).png().toBuffer();
    composites.push({ input: tile, left: (i % columns) * tileWidth, top: Math.floor(i / columns) * tileHeight });
  }
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  await sharp({ create: { width: columns * tileWidth, height: Math.ceil(records.length / columns) * tileHeight, channels: 4, background: '#202225' } }).composite(composites).png().toFile(outputFile);
  return outputFile;
}

export async function createStatusImage(outputFile, title, detail, tone = 'fail', width = 720, height = 720) {
  const sharp = imageLibrary();
  const color = tone === 'fail' ? '#d65f5f' : '#d6a54f';
  const safeTitle = String(title).replace(/[<&>]/g, '');
  const safeDetail = String(detail).replace(/[<&>]/g, '');
  const svg = Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="#303438"/><path d="M80 80h560v560H80z" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="12 10"/><text x="360" y="330" text-anchor="middle" fill="${color}" font-family="DejaVu Sans" font-size="28" font-weight="700">${safeTitle}</text><text x="360" y="375" text-anchor="middle" fill="#cbd0d5" font-family="DejaVu Sans" font-size="17">${safeDetail}</text></svg>`);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  await sharp(svg).png().toFile(outputFile);
  return outputFile;
}

export async function renderOrbit(result, outputDirectory, profile, options = {}) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const sceneOutput = result.outputs.scene;
  sceneOutput.scene.userData.captureParams = result.document.nodes[result.document.outputs.scene].params;
  const records = [];
  const count = options.views ?? profile.orbitViews;
  for (let index = 0; index < count; index++) {
    const azimuth = profile.capture.startAzimuth + index * (360 / count);
    const degrees = ((azimuth % 360) + 360) % 360;
    const camera = orbitCamera(sceneOutput, azimuth, profile.capture.elevation);
    const png = renderPng(sceneOutput.scene, camera, profile.capture.width, profile.capture.height);
    const file = path.join(outputDirectory, `angle-${String(index + 1).padStart(2, '0')}-${String(Math.round(degrees)).padStart(3, '0')}deg.png`);
    fs.writeFileSync(file, png);
    const image = await analyzePng(png);
    records.push({ id: `orbit-${String(index + 1).padStart(2, '0')}`, label: `${Math.round(degrees)}°`, detail: `${image.nonBlank ? 'VISIBLE' : 'BLANK'} · ${result.outputs.body.geometry.index.count / 3} tris`, file, azimuth: degrees, sha256: sha256(png), bytes: png.length, dimensions: [image.width, image.height], image, selected: index === 0 });
  }
  const contactSheet = path.join(outputDirectory, 'contact-sheet.png');
  await createContactSheet(records, contactSheet, 5);
  const manifest = { schema: 'mesh-orbit/v1', captureProfile: profile.profileId, semanticSignature: result.semanticSignature, views: records.length, allVisible: records.every((record) => record.image.nonBlank), records, contactSheet };
  writeJson(path.join(outputDirectory, 'manifest.json'), manifest);
  return manifest;
}
