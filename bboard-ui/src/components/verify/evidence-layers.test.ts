// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it } from 'vitest';
import { evidenceLayers, type LayersInput } from './evidence-layers';
import { enT, makeTranslator } from '../../i18n/translate';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';

const none: LayersInput = {
  bitcoin: false,
  timestamp: false,
  midnight: false,
  path: false,
  signatures: false,
  keyBound: false,
};

let restore = () => {};
afterEach(() => {
  restore();
  restore = () => {};
});

describe('how someone who disagrees can check this', () => {
  it('lists only what the record has', () => {
    const r = evidenceLayers({ ...none, midnight: true, path: true });
    expect(r.standard).toBe(
      'Checkable with tools VeilCore didn’t write: that the Midnight transaction exists, succeeded and when (any Midnight explorer) and the path from the proof code to the batch root (any SHA-256 tool). The holder’s evidence bundle has the files.',
    );
    expect(r.standard).not.toMatch(/Bitcoin|timestamp authority|Ed25519/);
    expect(r.veilcore).toMatch(
      /^VeilCore-specific, not yet audited: the checks this page runs and reading the batch root from Midnight, which needs VeilCore’s compiled contract\.$/,
    );
  });

  it('English joins its list in English, whatever the browser’s own language', () => {
    const Real = Intl.ListFormat;
    const intl = Intl as { ListFormat: typeof Intl.ListFormat };
    // A browser set to German: a list format with no locale named comes out in German.
    intl.ListFormat = class extends Real {
      constructor(locales?: Intl.LocalesArgument, options?: Intl.ListFormatOptions) {
        super(locales ?? 'de', options);
      }
    };
    restore = () => {
      intl.ListFormat = Real;
    };
    expect(new Intl.ListFormat(undefined, { type: 'conjunction' }).format(['a', 'b'])).toBe('a und b');
    const r = evidenceLayers({ ...none, bitcoin: true, midnight: true, keyBound: true });
    expect(r.standard).toContain('(the OpenTimestamps client) and that the Midnight transaction');
    expect(r.veilcore).toContain(', and how the record’s key is bound to it.');
    expect(`${r.standard} ${r.veilcore}`).not.toMatch(/\bund\b/);
  });

  it('nothing to check yet: no first line', () => {
    const r = evidenceLayers(none);
    expect(r.standard).toBeNull();
    expect(r.veilcore).toBe('VeilCore-specific, not yet audited: the checks this page runs.');
  });

  it('everything, in every language, with nothing left as a key', () => {
    const all = { bitcoin: true, timestamp: true, midnight: true, path: true, signatures: true, keyBound: true };
    for (const tr of [
      enT,
      makeTranslator('de', appDe),
      makeTranslator('es', appEs),
      makeTranslator('fr', appFr),
      makeTranslator('ja', appJa),
    ]) {
      const r = evidenceLayers(all, tr);
      expect(`${r.standard} ${r.veilcore}`).not.toMatch(/app\.verify|\{/);
      expect(r.standard).toMatch(/OpenTimestamps.*OpenSSL.*Ed25519/);
    }
  });
});
