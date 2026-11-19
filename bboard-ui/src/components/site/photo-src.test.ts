// Phones get a photo the size it is drawn at (live walk and review, 18 Nov), and every file named exists.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GALLERY_SIZES, photoSrcSet, type PhotoName } from './photo-src';

const PUBLIC = path.join(__dirname, '..', '..', '..', 'public');
const NAMES: PhotoName[] = ['cutting', 'greenhouse', 'lab', 'hand', 'cattle'];
const pick = (set: string, need: number) =>
  set
    .split(', ')
    .map((c) => c.split(' '))
    .map(([url, w]) => [url, Number(w.slice(0, -1))] as const)
    .sort((a, b) => a[1] - b[1])
    .find(([, w]) => w >= need)?.[0];

describe('home page photos', () => {
  // What a phone needs for the gallery (GALLERY_SIZES): the photo covers a frame about 46svh
  // tall, so it is drawn about 69svh wide, not 84vw.
  const phoneNeeds = (w: number, h: number, dpr: number) => Math.ceil(Math.max(0.84 * w, 0.69 * h) * dpr);
  it('the gallery is sized by what the photo is drawn at, not the frame’s width', () => {
    expect(GALLERY_SIZES).toBe('(max-width: 1080px) max(84vw, 69svh), 680px');
  });
  it('a 390 x 844 phone at 3x gets the largest copy; at 2x the 1200 one; at 1x the 800 one', () => {
    for (const n of NAMES) {
      const big = n === 'greenhouse' ? '/media/home/greenhouse.webp' : `/media/home/${n}.webp`;
      expect(pick(photoSrcSet(n), phoneNeeds(390, 844, 3)) ?? big, n).toBe(big);
      expect(pick(photoSrcSet(n), phoneNeeds(390, 844, 2)), n).toBe(
        n === 'greenhouse' ? '/media/home/greenhouse.webp' : `/media/home/${n}-1200.webp`,
      );
      expect(pick(photoSrcSet(n), phoneNeeds(390, 844, 1)), n).toBe(`/media/home/${n}-800.webp`);
    }
  });
  it('every file in a srcset is in public/', () => {
    for (const n of NAMES)
      for (const c of photoSrcSet(n).split(', '))
        expect(fs.existsSync(path.join(PUBLIC, c.split(' ')[0])), c).toBe(true);
  });
});
