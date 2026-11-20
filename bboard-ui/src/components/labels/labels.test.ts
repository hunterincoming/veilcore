// QR labels (docs/scan-and-labels.md): the sizes fit their paper, labels fall on pages in order,
// and a label's QR code carries only what the holder allows: by default the record ID and proof
// code, never the name, a salt or anything sealed.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { FRAGMENT_PARAMS } from '../../veilcore/verify-link';
import {
  LAYOUTS,
  LABEL_SIZES,
  QR_NAME_MAX,
  defaultSize,
  fitName,
  hasCheckPage,
  labelLink,
  paginate,
  perPage,
  shortId,
  slotAt,
} from './label-layouts';

const FP = 'ab'.repeat(32);
const SALT = 'cd'.repeat(32);
const ID = `VEIL-${'3F9A'}${'0'.repeat(24)}C21B`;
const rec = { id: ID, recordFingerprint: FP, strainName: 'Harbour Mist', nameSalt: SALT };

describe('label sizes', () => {
  it('every label sits inside its paper', () => {
    for (const s of LABEL_SIZES) {
      const l = LAYOUTS[s];
      const last = slotAt(perPage(l) - 1, l);
      expect(slotAt(0, l).x, s).toBeGreaterThanOrEqual(0);
      expect(last.x + l.label.w, s).toBeLessThanOrEqual(l.page.w + 1e-9);
      expect(last.y + l.label.h, s).toBeLessThanOrEqual(l.page.h + 1e-9);
      // Labels never overlap.
      expect(l.pitchX, s).toBeGreaterThanOrEqual(l.label.w);
      expect(l.pitchY, s).toBeGreaterThanOrEqual(l.label.h);
    }
  });

  it('5160: 30 on US Letter, 2⅝ × 1 in, centred; L7160: 21 on A4, 63.5 × 38.1 mm, centred', () => {
    const us = LAYOUTS.letter;
    expect([perPage(us), us.label.w / 25.4, us.label.h / 25.4]).toEqual([30, 2.625, 1]);
    expect(us.left * 2 + 2 * us.pitchX + us.label.w).toBeCloseTo(us.page.w, 6);
    expect(us.top * 2 + 10 * us.pitchY).toBeCloseTo(us.page.h, 6);
    const a4 = LAYOUTS.a4;
    expect([perPage(a4), a4.label.w, a4.label.h]).toEqual([21, 63.5, 38.1]);
    expect(a4.left * 2 + 2 * a4.pitchX + a4.label.w).toBeCloseTo(210, 6);
    expect(a4.top * 2 + 7 * a4.pitchY).toBeCloseTo(297, 6);
    expect(perPage(LAYOUTS.thermal)).toBe(1);
  });
});

describe('labels on pages', () => {
  it('in order, with copies, after the places already used, the last page filled with blanks', () => {
    const pages = paginate(['a', 'b'], 2, 28, LAYOUTS.letter);
    expect(pages).toHaveLength(2);
    expect(pages[0].slice(27)).toEqual([null, 'a', 'a']);
    expect(pages[1].slice(0, 3)).toEqual(['b', 'b', null]);
    expect(pages[1]).toHaveLength(30);
  });
  it('one label a page on thermal stock, where nothing is skipped', () => {
    expect(paginate(['a', 'b'], 1, 5, LAYOUTS.thermal)).toEqual([['a'], ['b']]);
  });
  it('nothing to print, no pages; nonsense numbers are kept in range', () => {
    expect(paginate([], 3, 0, LAYOUTS.a4)).toEqual([]);
    expect(paginate(['a'], 0, -4, LAYOUTS.a4)[0][0]).toBe('a');
    expect(paginate(['a'], 1, 999, LAYOUTS.a4)[0][20]).toBe('a');
  });
});

describe('what a label carries', () => {
  it('by default: the check page with the record ID and proof code, and nothing after a #', () => {
    const link = labelLink(rec, false);
    expect(link).toMatch(new RegExp(`/verify/${ID}\\?fp=${FP}$`));
    expect(link).not.toContain('#');
    expect(link).not.toContain(SALT);
  });

  it('with the name chosen: the name and its salt (so the page can say it matches), and still nothing else', () => {
    const link = labelLink(rec, true);
    const hash = new URLSearchParams(link.split('#')[1]);
    expect([...hash.keys()].sort()).toEqual(['n', 'ns']);
    for (const k of FRAGMENT_PARAMS.filter((k) => k !== 'n' && k !== 'ns')) expect(hash.has(k)).toBe(false);
    expect(hash.get('ns')).toBe(SALT);
  });

  it('a name too long for a small QR code is left out of it', () => {
    expect(labelLink({ ...rec, strainName: 'x'.repeat(QR_NAME_MAX) }, true)).toContain('#n=');
    expect(labelLink({ ...rec, strainName: 'x'.repeat(QR_NAME_MAX + 1) }, true)).not.toContain('#');
  });

  it('starts on the paper used where the browser is', () => {
    expect(defaultSize('en-US')).toBe('letter');
    expect(defaultSize('es-MX')).toBe('letter');
    expect(defaultSize('en-GB')).toBe('a4');
    expect(defaultSize('es-AR')).toBe('a4');
    expect(defaultSize('ja-JP')).toBe('a4');
  });

  it('a record without a proof code has no label', () => {
    expect(hasCheckPage(rec)).toBe(true);
    expect(hasCheckPage({ id: ID })).toBe(false);
    expect(hasCheckPage({ id: ID, recordFingerprint: 'nothex' })).toBe(false);
  });

  it('shows a short ID a person can match to the record page', () => {
    expect(shortId(ID)).toBe('VEIL-3F9A…C21B');
    expect(shortId('VEIL-0001')).toBe('VEIL-0001');
    expect(fitName('Harbour   Mist', 40)).toBe('Harbour Mist');
    expect(fitName('Harbour Mist', 6)).toBe('Harbo…');
  });
});
