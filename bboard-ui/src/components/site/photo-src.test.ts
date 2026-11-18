// Phones get a photo the size they show it at (live walk, 18 Nov), and every file named exists.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { photoSrcSet, type PhotoName } from './photo-src';

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
  it('a 390-wide phone at 3x (84vw, about 983 pixels) gets the 1200 wide copy, not the 1600', () => {
    const need = Math.ceil(390 * 0.84 * 3);
    for (const n of NAMES)
      expect(pick(photoSrcSet(n), need), n).toBe(
        n === 'greenhouse' ? '/media/home/greenhouse.webp' : `/media/home/${n}-1200.webp`,
      );
  });
  it('every file in a srcset is in public/', () => {
    for (const n of NAMES)
      for (const c of photoSrcSet(n).split(', '))
        expect(fs.existsSync(path.join(PUBLIC, c.split(' ')[0])), c).toBe(true);
  });
});
