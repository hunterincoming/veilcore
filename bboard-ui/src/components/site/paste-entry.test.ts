// The way in for a lab or anyone sent a code (paste-entry.ts): the landing page's link opens
// Home with the paste box first, and what a pasted lab code does on a first visit.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PASTE_ENTRY, wantsPasteFirst } from './paste-entry';
import { recognise } from '../../veilcore/paste';
import { roleAfterReceiving } from '../../veilcore/role';

describe('the paste entry', () => {
  it('opens Home, asking for the paste box first', () => {
    const u = new URL(PASTE_ENTRY, 'https://veilcore.org');
    expect(u.pathname).toBe('/records');
    expect(wantsPasteFirst(u.search)).toBe(true);
  });
  it('is only for ?paste', () => {
    expect(wantsPasteFirst('')).toBe(false);
    expect(wantsPasteFirst('?q=paste')).toBe(false);
    expect(wantsPasteFirst('?paste=1')).toBe(true);
    expect(wantsPasteFirst('?sort=recent&paste')).toBe(true);
  });
  it('never carries a code: the claim code and the offer key stay out of the address', () => {
    expect(PASTE_ENTRY).not.toMatch(/TR-|code=/i);
  });
  it('the hero and the bottom section both link to it', () => {
    const home = readFileSync(new URL('./Home.tsx', import.meta.url), 'utf8');
    expect(home).toContain('data-paste-entry="hero"');
    expect(home).toContain('data-paste-entry="demo"');
    expect(home.match(/to=\{PASTE_ENTRY\}/g)).toHaveLength(2);
  });
  it('a lab code pasted on a first visit, with no records, is a delivery to receive', () => {
    const code = `TR-1A2B3C4D.${'a'.repeat(32)}.o1${'B'.repeat(43)}`;
    expect(recognise(code, () => false)).toEqual({ kind: 'delivery', code });
  });
});

describe('the view after receiving (roleAfterReceiving)', () => {
  it('a first-time receiver with no records of its own gets the lab view', () =>
    expect(roleAfterReceiving(null, false, true)).toBe('lab'));
  it('someone with records of their own keeps their view', () =>
    expect(roleAfterReceiving(null, true, true)).toBeNull());
  it('a view someone chose is kept', () => {
    expect(roleAfterReceiving('breeder', false, true)).toBeNull();
    expect(roleAfterReceiving('lab', false, true)).toBeNull();
    expect(roleAfterReceiving('both', true, true)).toBeNull();
  });
  it('nothing changes when the records could not be read from the registry', () => {
    expect(roleAfterReceiving(null, false, false)).toBeNull();
    expect(roleAfterReceiving('breeder', false, false)).toBeNull();
  });
});
