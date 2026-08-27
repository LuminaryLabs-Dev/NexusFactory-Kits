import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildCoralCandidate } from './coral-generator.mjs';
import { CORAL_PRESETS } from './coral-presets.mjs';

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer();
      this.onloadend?.({ target: this });
    } catch (error) {
      this.onerror?.(error);
    }
  }

  async readAsDataURL(blob) {
    try {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
      this.onloadend?.({ target: this });
    } catch (error) {
      this.onerror?.(error);
    }
  }
}

globalThis.FileReader ??= NodeFileReader;

const FILENAMES = Object.freeze({
  '01': '01-staghorn-crown.glb',
  '02': '02-elkhorn-grove.glb',
  '03': '03-brain-coral.glb',
  '04': '04-pillar-colony.glb',
  '05': '05-lettuce-coral.glb',
  '06': '06-sea-fan.glb',
  '07': '07-sea-rod-garden.glb',
  '08': '08-table-coral.glb',
  '09': '09-tube-colony.glb',
  '10': '10-mixed-reef-cluster.glb',
});

const outputRoot = path.resolve(process.argv[2] ?? 'artifacts/coral-3d/generated');
await fs.mkdir(outputRoot, { recursive: true });

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

async function exportGlb(object) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, {
    binary: true,
    onlyVisible: true,
    trs: false,
    maxTextureSize: 1024,
  });
  return Buffer.from(result);
}

const records = [];
for (const preset of CORAL_PRESETS) {
  const first = buildCoralCandidate(preset);
  const repeated = buildCoralCandidate(preset);
  if (first.signature !== repeated.signature) {
    throw new Error(`${preset.id} is not deterministic`);
  }
  if (!first.metrics.finitePositions || first.metrics.bounds.minimum[1] !== 0) {
    throw new Error(`${preset.id} failed geometry or floor-contact validation`);
  }
  if (first.metrics.triangles > 12000) {
    throw new Error(`${preset.id} exceeds the 12,000-triangle export ceiling`);
  }

  const glb = await exportGlb(first.root);
  const file = FILENAMES[preset.id];
  await fs.writeFile(path.join(outputRoot, file), glb);
  records.push({
    id: preset.id,
    name: preset.name,
    file,
    type: preset.type,
    seed: preset.seed,
    signature: first.signature,
    triangles: first.metrics.triangles,
    bounds: first.metrics.bounds,
    bytes: glb.byteLength,
    sha256: sha256(glb),
    encoding: first.encoding,
  });
  console.log(`${preset.id} ${preset.name}: ${first.metrics.triangles} triangles`);
}

await fs.writeFile(path.join(outputRoot, 'export-records.json'), `${JSON.stringify({
  schema: 'nexus-factory/coral-3d-exports/v1',
  generator: 'tools/coral-3d/coral-generator.mjs',
  presetSource: 'tools/coral-3d/coral-presets.mjs',
  candidateCount: records.length,
  records,
}, null, 2)}\n`);

console.log(`Wrote ${records.length} GLBs and export records to ${outputRoot}`);
