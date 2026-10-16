// /partners and its guide (docs/partners/require-a-record.md) say plainly what a partner
// needs before relying on the field: support contact, data terms, cost, what happens when
// the registry is down or VeilCore stops, and that the kit is not on npm. No claim that
// records check without VeilCore unless it is about evidence bundles.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';

const here = path.dirname(fileURLToPath(import.meta.url));
// The page's code and its English words (i18n/app/en/partners.ts), read as one.
const page =
  readFileSync(path.join(here, 'PartnersPage.tsx'), 'utf8') +
  readFileSync(path.join(here, '../../i18n/app/en/partners.ts'), 'utf8');
const guide = readFileSync(path.join(here, '../../../../docs/partners/require-a-record.md'), 'utf8');

/** The contact address the site's privacy page gives. */
const contact = /[a-z]+@veilcore\.org/.exec(en['m.privacy.contact'])?.[0];

describe('partner page and guide', () => {
  it('use the site’s contact address and link the privacy page', () => {
    expect(contact).toBeTruthy();
    expect(page).toContain(`const CONTACT = '${contact}'`);
    expect(page).toContain('mailto:${CONTACT}');
    expect(page).toContain('to="/privacy"');
    expect(guide).toContain(contact);
    expect(guide).toContain('https://veilcore.org/privacy');
    for (const t of [page, guide]) expect(t).toMatch(/data terms are a draft being\s+reviewed/);
  });

  it('say what checking costs, what happens when the registry is down, and if VeilCore stops', () => {
    for (const t of [page, guide]) {
      expect(t).toMatch(/Checking is free/);
      expect(t).toMatch(/when-unreachable="allow"/);
      expect(t).toMatch(/required field\s+(then\s+)?blocks the\s+(whole\s+)?form/);
      expect(t).toMatch(/If VeilCore stops/);
      expect(t).toMatch(/stop working/);
      expect(t).toMatch(/Not on npm yet/i);
      expect(t).toMatch(/allow-test-network/);
    }
  });

  it('never say records check without VeilCore except from evidence bundles', () => {
    expect(page).not.toMatch(/Records still check if VeilCore is gone/);
    for (const t of [page, guide]) {
      for (const m of t.matchAll(/[^.]*\b(still check|still be checked)\b[^.]*\./g))
        expect(m[0], m[0]).toMatch(/evidence bundle/);
    }
  });

  it('keep to the product words', () => {
    for (const t of [page, guide]) {
      expect(t).not.toMatch(/track and trace/i);
      expect(t).not.toMatch(/\bownership\b/i);
      expect(t).not.toMatch(/\bvouches for\b/i);
    }
  });
});
