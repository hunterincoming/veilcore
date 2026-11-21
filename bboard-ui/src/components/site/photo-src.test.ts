// Phones get a photo near the size it is drawn at (live walk and review, 18 Nov), every file named
// exists, and every size written in the code is the file's real size (so nothing shifts as it
// loads). The photos are Mako's re-exports (21 Nov 2026), each under 200 KB.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GALLERY_SIZES, PHOTO_SIZE, photoSrc, photoSrcSet, type PhotoName } from './photo-src';

const PUBLIC = path.join(__dirname, '..', '..', '..', 'public');
const NAMES = Object.keys(PHOTO_SIZE) as PhotoName[];
const pick = (set: string, need: number) =>
  set
    .split(', ')
    .map((c) => c.split(' '))
    .map(([url, w]) => [url, Number(w.slice(0, -1))] as const)
    .sort((a, b) => a[1] - b[1])
    .find(([, w]) => w >= need)?.[0];

/** A WebP file's width and height, from its header (VP8, VP8L or VP8X). */
const webpSize = (file: string): [number, number] => {
  const b = fs.readFileSync(file);
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const v = b.readUInt32LE(21);
  return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
};

describe('the public pages’ photos', () => {
  // What a phone needs for the gallery (GALLERY_SIZES): the photo covers a frame about 46svh
  // tall, so a landscape one is drawn about 69svh wide, not 84vw.
  const phoneNeeds = (w: number, h: number, dpr: number) => Math.ceil(Math.max(0.84 * w, 0.69 * h) * dpr);
  it('the gallery is sized by what the photo is drawn at, not the frame’s width', () => {
    expect(GALLERY_SIZES).toBe('(max-width: 1080px) max(84vw, 69svh), 680px');
  });
  it('a 390 x 844 phone at 1x gets the 800 copy; at 2x or 3x the large one', () => {
    for (const n of NAMES) {
      expect(pick(photoSrcSet(n), phoneNeeds(390, 844, 1)), n).toBe(`/media/home/${n}-800.webp`);
      expect(pick(photoSrcSet(n), phoneNeeds(390, 844, 2)) ?? photoSrc(n), n).toBe(photoSrc(n));
    }
  });
  it('every file in a srcset is in public/, at the size the code says, and under 200 KB', () => {
    for (const n of NAMES) {
      for (const c of photoSrcSet(n).split(', ')) {
        const [url, w] = c.split(' ');
        const file = path.join(PUBLIC, url);
        expect(fs.existsSync(file), c).toBe(true);
        expect(webpSize(file)[0], c).toBe(Number(w.slice(0, -1)));
        expect(fs.statSync(file).size, c).toBeLessThan(200 * 1024);
      }
      expect(webpSize(path.join(PUBLIC, photoSrc(n))), n).toEqual([...PHOTO_SIZE[n]]);
    }
  });
  it('each photo is credited', () => {
    const credits = fs.readFileSync(path.join(PUBLIC, 'media/home/CREDITS.md'), 'utf8');
    for (const n of NAMES) expect(credits, n).toContain(`${n}.webp`);
  });
});
