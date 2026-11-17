// "What each fact rests on" never says more than the check page has: Midnight only once the page
// found the anchor itself against the link's own proof code; the page's own match only with that
// code; a matched lab name never as VeilCore vouching; a file only once it matched.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { whoVouches, type WhoInput } from './who-vouches';
import { makeTranslator } from '../../i18n/translate';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';

const base: WhoInput = {
  bound: true,
  proof: 'anchor-reported',
  anchorConfirmed: true,
  testNetwork: false,
  signers: [],
};
const rows = (i: Partial<WhoInput>) => whoVouches({ ...base, ...i });

describe('what each fact rests on', () => {
  it('the date is Midnight only when this page found the anchor itself, for the link’s own code', () => {
    expect(rows({})[0]).toEqual({
      fact: 'The date',
      who: 'Midnight. This page checked it there itself.',
      basis: 'checked',
    });
    expect(rows({ anchorConfirmed: false })[0].basis).toBe('registry');
    expect(rows({ anchorConfirmed: false })[0].who).toMatch(/^VeilCore’s registry says so\./);
    // Found on Midnight, but the link carried no code: still only the registry's word.
    expect(rows({ bound: false })[0].basis).toBe('registry');
    // The batch's date was checked, but only the registry puts this record in it.
    expect(rows({ bound: false })[0].who).toMatch(/^Midnight dated the batch.*Only VeilCore’s registry/);
    expect(rows({ testNetwork: true })[0].who).toMatch(/practice, not a date to rely on/);
    expect(rows({ proof: 'pending' })[0]).toMatchObject({ fact: 'The date', basis: 'none' });
    expect(rows({ proof: 'none' })[0]).toMatchObject({ fact: 'The date', basis: 'none' });
    expect(rows({ proof: 'none' })[0].who).toMatch(/isn’t in a dated batch/);
  });

  it('the proof code is the page’s match only when the link carried it', () => {
    expect(rows({}).find((r) => r.fact === 'The proof code')?.basis).toBe('checked');
    expect(rows({ bound: false }).find((r) => r.fact === 'The proof code')?.basis).toBe('registry');
  });

  it('the name and details are the holder’s own words, said to match the proof code only when they do', () => {
    const words = (w: WhoInput['words']) => rows({ words: w }).find((r) => r.fact === 'The name and details');
    expect(words('matches')).toEqual({
      fact: 'The name and details',
      who: 'The holder, in their own words. This page checks only that the name matches the proof code, not that anything is true.',
      basis: 'holder',
    });
    expect(words(undefined)).toMatchObject({
      who: 'The holder, in their own words. Nothing checks them.',
      basis: 'holder',
    });
    expect(words('differs')).toMatchObject({ basis: 'none' });
    expect(words('differs')?.who).toMatch(/doesn’t match the proof code/);
  });

  it('a failed check on Midnight is said as failed, not as unchecked', () => {
    expect(rows({ anchorFailed: true, anchorConfirmed: false })[0]).toMatchObject({ fact: 'The date', basis: 'none' });
    expect(rows({ anchorFailed: true, anchorConfirmed: false })[0].who).toMatch(/failed/);
  });

  it('a lab is named as the page names it, and a matched name never reads as VeilCore vouching', () => {
    expect(rows({}).at(-1)).toEqual({
      fact: 'A laboratory',
      who: 'This page hasn’t checked any laboratory’s signature.',
      basis: 'none',
    });
    const r = rows({
      signers: [
        { kind: 'Lab’s receipt for a sample', who: 'a key named “Acme Labs” (name not checked)', nameChecked: false },
        { kind: 'Lab report', who: 'Acme Labs', nameChecked: true },
      ],
    });
    expect(r.at(-2)).toEqual({
      fact: 'Lab’s receipt for a sample',
      who: 'A key named “Acme Labs” (name not checked). This page checked the signature.',
      basis: 'signed',
    });
    expect(r.at(-1)?.who).toBe(
      'A key registered as Acme Labs. This page checked the signature. VeilCore’s operator matched the name to a public listing (below); that isn’t VeilCore vouching for the lab.',
    );
    const unbound = rows({ bound: false, signers: [{ kind: 'Lab report', who: 'Acme Labs', nameChecked: true }] });
    expect(unbound.at(-1)).toMatchObject({ basis: 'registry' });
    expect(unbound.at(-1)?.who).toMatch(/as VeilCore’s registry reports it/);
    expect(unbound.at(-1)?.who).toMatch(/operator matched the name/);
  });

  it('lists a few signatures, then says how many more', () => {
    const signers = Array.from({ length: 7 }, (_, n) => ({
      kind: `Statement ${String(n)}`,
      who: 'X',
      nameChecked: true,
    }));
    const r = rows({ signers, max: 5 });
    expect(r.filter((x) => x.fact.startsWith('Statement'))).toHaveLength(5);
    expect(r.at(-1)).toMatchObject({ fact: 'More signatures', who: '2 more, listed below.' });
  });

  it('a document: the code worked out from the link, no lab row, and the file checked only once it matched', () => {
    const r = rows({ document: true, signers: [{ kind: 'Lab report', who: 'X', nameChecked: true }] });
    expect(r.map((x) => [x.fact, x.basis])).toEqual([
      ['The date', 'checked'],
      ['The proof code', 'checked'],
      ['The file', 'none'],
      ['What’s typed (title, holder, issuer, notes)', 'holder'],
    ]);
    expect(r[2].who).toMatch(/once you pick the file/);
    const file = (f: WhoInput['file']) => rows({ document: true, file: f }).find((x) => x.fact === 'The file');
    expect(file('match')).toMatchObject({ basis: 'checked' });
    expect(file('match')?.who).toMatch(/is the one sealed/);
    expect(file('no-match')).toMatchObject({ basis: 'none' });
    expect(file('no-match')?.who).toMatch(/is not the one sealed/);
    expect(file('none')).toMatchObject({ basis: 'none', who: 'No file was sealed with this document.' });
  });

  it('every row is in every language', () => {
    for (const tr of [
      makeTranslator('de', appDe),
      makeTranslator('es', appEs),
      makeTranslator('fr', appFr),
      makeTranslator('ja', appJa),
    ]) {
      const out = [
        ...whoVouches({ ...base, signers: [{ kind: 'K', who: 'W', nameChecked: true }] }, tr),
        ...whoVouches({ ...base, bound: false, signers: [{ kind: 'K', who: 'W', nameChecked: true }] }, tr),
        ...whoVouches({ ...base, anchorFailed: true, words: 'differs' }, tr),
        ...whoVouches({ ...base, words: 'matches' }, tr),
        ...(['none', 'waiting', 'match', 'no-match'] as const).flatMap((file) =>
          whoVouches({ ...base, document: true, file }, tr),
        ),
      ];
      for (const row of out) {
        expect(row.fact).not.toMatch(/^app\.verify/);
        expect(row.who).not.toMatch(/app\.verify/);
      }
    }
  });
});
