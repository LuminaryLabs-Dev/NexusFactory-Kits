import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

export function geometrySha256(geometry) {
  const hash = crypto.createHash('sha256');
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  hash.update(Buffer.from(position.array.buffer, position.array.byteOffset, position.array.byteLength));
  if (index) hash.update(Buffer.from(index.array.buffer, index.array.byteOffset, index.array.byteLength));
  return hash.digest('hex');
}

export function ensureInside(root, target) {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)) throw new Error(`Output escapes allowed root: ${target}`);
  return normalizedTarget;
}
