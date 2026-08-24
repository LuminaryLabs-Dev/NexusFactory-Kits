import fs from 'node:fs';
import zlib from 'node:zlib';
import { clamp } from '../../../src/domains/factory/object/creature/aquatic/fish/math.js';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const value of buffer) c = crcTable[(c ^ value) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

export function createImage(width, height, fill = [0, 0, 0, 255]) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid image size ${width}x${height}`);
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const k = i * 4;
    data[k] = fill[0];
    data[k + 1] = fill[1];
    data[k + 2] = fill[2];
    data[k + 3] = fill[3] ?? 255;
  }
  return { width, height, data };
}

export function encodePng(image, compressionLevel = 9) {
  const { width, height, data } = image;
  if (data.length !== width * height * 4) throw new Error('RGBA image data length mismatch');
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(row, 1);
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: compressionLevel });
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writePng(filePath, image, compressionLevel = 9) {
  fs.writeFileSync(filePath, encodePng(image, compressionLevel));
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Invalid PNG signature');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || colorType !== 6 || data[12] !== 0) {
        throw new Error(`PNG decoder supports non-interlaced 8-bit RGBA only; got depth=${bitDepth}, type=${colorType}`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || !idat.length) throw new Error('Incomplete PNG');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const expected = (stride + 1) * height;
  if (raw.length !== expected) throw new Error(`Unexpected PNG data size ${raw.length}; expected ${expected}`);
  const output = new Uint8ClampedArray(width * height * 4);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source++];
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[source++];
      const left = x >= bytesPerPixel ? output[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[rowOffset + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? output[rowOffset + x - stride - bytesPerPixel] : 0;
      let decoded;
      switch (filter) {
        case 0: decoded = value; break;
        case 1: decoded = (value + left) & 255; break;
        case 2: decoded = (value + up) & 255; break;
        case 3: decoded = (value + Math.floor((left + up) / 2)) & 255; break;
        case 4: decoded = (value + paeth(left, up, upLeft)) & 255; break;
        default: throw new Error(`Unsupported PNG filter ${filter}`);
      }
      output[rowOffset + x] = decoded;
    }
  }
  return { width, height, data: output };
}

export function readPng(filePath) {
  return decodePng(fs.readFileSync(filePath));
}

export function resizeBilinear(image, width, height) {
  const output = createImage(width, height, [0, 0, 0, 0]);
  const sx = image.width / width;
  const sy = image.height / height;
  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * sy - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = clamp(sourceY - y0);
    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * sx - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = clamp(sourceX - x0);
      const target = (y * width + x) * 4;
      const a = (y0 * image.width + x0) * 4;
      const b = (y0 * image.width + x1) * 4;
      const c = (y1 * image.width + x0) * 4;
      const d = (y1 * image.width + x1) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = image.data[a + channel] * (1 - fx) + image.data[b + channel] * fx;
        const bottom = image.data[c + channel] * (1 - fx) + image.data[d + channel] * fx;
        output.data[target + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return output;
}

export function downsampleBox(image, factor = 2) {
  if (!Number.isInteger(factor) || factor < 1) throw new Error('Downsample factor must be a positive integer');
  if (factor === 1) return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
  const width = Math.floor(image.width / factor);
  const height = Math.floor(image.height / factor);
  const output = createImage(width, height, [0, 0, 0, 0]);
  const samples = factor * factor;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sums = [0, 0, 0, 0];
      for (let yy = 0; yy < factor; yy += 1) {
        for (let xx = 0; xx < factor; xx += 1) {
          const source = (((y * factor + yy) * image.width) + x * factor + xx) * 4;
          sums[0] += image.data[source];
          sums[1] += image.data[source + 1];
          sums[2] += image.data[source + 2];
          sums[3] += image.data[source + 3];
        }
      }
      const target = (y * width + x) * 4;
      output.data[target] = Math.round(sums[0] / samples);
      output.data[target + 1] = Math.round(sums[1] / samples);
      output.data[target + 2] = Math.round(sums[2] / samples);
      output.data[target + 3] = Math.round(sums[3] / samples);
    }
  }
  return output;
}

export function blit(target, source, xOffset, yOffset, options = {}) {
  const alphaScale = options.alphaScale ?? 1;
  for (let y = 0; y < source.height; y += 1) {
    const ty = y + yOffset;
    if (ty < 0 || ty >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const tx = x + xOffset;
      if (tx < 0 || tx >= target.width) continue;
      const s = (y * source.width + x) * 4;
      const t = (ty * target.width + tx) * 4;
      const alpha = (source.data[s + 3] / 255) * alphaScale;
      const inverse = 1 - alpha;
      target.data[t] = Math.round(source.data[s] * alpha + target.data[t] * inverse);
      target.data[t + 1] = Math.round(source.data[s + 1] * alpha + target.data[t + 1] * inverse);
      target.data[t + 2] = Math.round(source.data[s + 2] * alpha + target.data[t + 2] * inverse);
      target.data[t + 3] = 255;
    }
  }
}

export function makeContactSheet(images, columns, options = {}) {
  if (!images.length) throw new Error('Contact sheet needs at least one image');
  const gap = options.gap ?? 12;
  const border = options.border ?? 16;
  const background = options.background ?? [8, 28, 35, 255];
  const cellWidth = options.cellWidth ?? Math.max(...images.map((image) => image.width));
  const cellHeight = options.cellHeight ?? Math.max(...images.map((image) => image.height));
  const rows = Math.ceil(images.length / columns);
  const width = border * 2 + columns * cellWidth + Math.max(0, columns - 1) * gap;
  const height = border * 2 + rows * cellHeight + Math.max(0, rows - 1) * gap;
  const sheet = createImage(width, height, background);
  const fit = options.fit ?? 'contain';
  images.forEach((image, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    let resized = image;
    let insetX = 0;
    let insetY = 0;
    if (fit === 'stretch') {
      resized = image.width === cellWidth && image.height === cellHeight
        ? image
        : resizeBilinear(image, cellWidth, cellHeight);
    } else {
      const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      resized = image.width === width && image.height === height ? image : resizeBilinear(image, width, height);
      insetX = Math.floor((cellWidth - width) / 2);
      insetY = Math.floor((cellHeight - height) / 2);
    }
    const x = border + column * (cellWidth + gap) + insetX;
    const y = border + row * (cellHeight + gap) + insetY;
    blit(sheet, resized, x, y);
  });
  return sheet;
}

export function imageDifference(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('Image dimensions must match for difference');
  let absolute = 0;
  let squared = 0;
  let max = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const difference = Math.abs(a.data[i + c] - b.data[i + c]);
      absolute += difference;
      squared += difference * difference;
      if (difference > max) max = difference;
    }
  }
  const channels = a.width * a.height * 3;
  return {
    meanAbsolute: absolute / channels,
    rootMeanSquare: Math.sqrt(squared / channels),
    maxAbsolute: max,
  };
}
