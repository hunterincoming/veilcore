// "What each fact rests on" never says more than the check page has: Midnight only once the page
// found the anchor itself against the link's own proof code; the page's own match only with that
// code; a matched lab name never as VeilCore vouching; a file only once it matched.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { whoVouches, type WhoInput } from './who-vouches';
import { enT, makeTranslator } from '../../i18n/translate';
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
      fact: 'The Midnight date',
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
    expect(rows({ proof: 'pending' })[0]).toMatchObject({ fact: 'The Midnight date', basis: 'none' });
    expect(rows({ proof: 'none' })[0]).toMatchObject({ fact: 'The Midnight date', basis: 'none' });
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

  it('an unbound link with a checked batch, and a failed check on an unbound link', () => {
    expect(rows({ bound: false })[0]).toMatchObject({ basis: 'registry' });
    expect(rows({ bound: false, anchorConfirmed: false })[0].who).toMatch(/^VeilCore’s registry says so/);
    expect(rows({ bound: false, anchorConfirmed: false, anchorFailed: true })[0].who).toMatch(/failed/);
  });

  it('a failed check on Midnight is said as failed, not as unchecked', () => {
    expect(rows({ anchorFailed: true, anchorConfirmed: false })[0]).toMatchObject({
      fact: 'The Midnight date',
      basis: 'none',
    });
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
        {
          kind: 'Lab’s receipt for a sample',
          who: 'a key calling itself “Acme Labs” (not verified)',
          nameChecked: false,
        },
        { kind: 'Lab report', who: 'Acme Labs', nameChecked: true },
      ],
    });
    expect(r.at(-2)).toEqual({
      fact: 'Lab’s receipt for a sample',
      who: 'A key calling itself “Acme Labs” (not verified). This page checked the signature.',
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
      ['The Midnight date', 'checked'],
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
    // Every typed field goes into the recomputed code, so the typed row speaks of all of them.
    expect(r[3].who).toMatch(/they match the proof code/);
  });

  it('a key its website stopped listing says so on its own row, with the same mark; a listing adds nothing', () => {
    const lab = { kind: 'Lab report', who: 'a key calling itself “Acme” (not verified)', nameChecked: false };
    const [plain] = rows({ signers: [lab] }).filter((r) => r.fact === 'Lab report');
    const [gone] = rows({ signers: [{ ...lab, withdrawn: true }] }).filter((r) => r.fact === 'Lab report');
    expect(gone.basis).toBe(plain.basis);
    expect(gone.who).toBe(`${plain.who} Its website has since stopped listing this key (below).`);
    expect(rows({ signers: [lab] }).length).toBe(rows({ signers: [{ ...lab, withdrawn: true }] }).length);
    const [unbound] = rows({ bound: false, signers: [{ ...lab, withdrawn: true }] }).filter(
      (r) => r.fact === 'Lab report',
    );
    expect(unbound.basis).toBe('registry');
    expect(unbound.who).toMatch(/stopped listing this key/);
  });

  it('every row is in every language', () => {
    for (const tr of [
      makeTranslator('de', appDe),
      makeTranslator('es', appEs),
      makeTranslator('fr', appFr),
      makeTranslator('ja', appJa),
    ]) {
      const out = [
        ...whoVouches({ ...base, signers: [{ kind: 'K', who: 'W', nameChecked: true, withdrawn: true }] }, tr),
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

describe('the Bitcoin stamp row', () => {
  const btc = (bitcoin: NonNullable<WhoInput['bitcoin']>, tr = enT) =>
    whoVouches({ ...base, bitcoin }, tr).find((r) => r.id === 'bitcoin');

  it('says “checked” only when the block linked to a pinned checkpoint here', () => {
    const linked = btc({ state: 'linked', height: 971004, checkpoint: 971005, time: 1791762944, direction: 'down' });
    expect(linked).toMatchObject({ fact: 'The Bitcoin stamp', basis: 'checked' });
    expect(linked?.who).toMatch(
      /^Checked in this browser: block 971004’s proof of work and its link to checkpoint 971005, a block this website pins\. The block holds this batch’s stamp\. Block time: .*2026.* UTC\.$/,
    );
    expect(btc({ state: 'explorers', height: 971004, explorers: ['mempool.space', 'blockstream.info'] })).toMatchObject(
      {
        basis: 'explorer',
        who: expect.stringMatching(/^The block explorers’ word \(mempool\.space, blockstream\.info\)/) as string,
      },
    );
    for (const s of ['reported', 'checking', 'unreachable'] as const)
      expect(btc({ state: s, height: 971004 })?.basis, s).toBe('registry');
    expect(btc({ state: 'reported', height: 971004 })?.who).toBe(
      'VeilCore’s registry says it is in Bitcoin block 971004. This page hasn’t checked it on Bitcoin.',
    );
    expect(btc({ state: 'reported' })?.who).toMatch(/in a Bitcoin block\. This page hasn’t checked/);
    for (const kind of ['stamp', 'mismatch', 'headers'] as const)
      expect(btc({ state: 'failed', kind })).toMatchObject({
        basis: 'none',
        who: expect.stringMatching(/^Nothing: /) as string,
      });
    expect(btc({ state: 'pending' })).toMatchObject({ basis: 'none' });
    // Up from an earlier checkpoint: still this browser's check, but said to rest on mined work.
    const up = btc({ state: 'linked', height: 971100, checkpoint: 971005, time: 1791762944, direction: 'up' });
    expect(up).toMatchObject({
      basis: 'checked',
      who: expect.stringMatching(/link up from checkpoint 971005.*real difficulty.*more strongly\.$/) as string,
    });
    // A link without its proof code: the batch is checked, only the registry puts the record in it.
    const unbound = whoVouches(
      {
        ...base,
        bound: false,
        bitcoin: { state: 'linked', height: 971004, checkpoint: 971005, time: 0, direction: 'down' },
      },
      enT,
    ).find((r) => r.id === 'bitcoin');
    expect(unbound).toMatchObject({
      basis: 'registry',
      who: expect.stringMatching(/Only VeilCore’s registry says this record is in that batch/) as string,
    });
    // No stamp reported: no row.
    expect(whoVouches(base).some((r) => r.id === 'bitcoin')).toBe(false);
    // First, before any timestamp and before Midnight (summit 5b item 13).
    const order = whoVouches({
      ...base,
      bitcoin: { state: 'pending' },
      instant: [{ tsa: 'Test TSA', at: '2026-10-15T11:00:00.000Z' }],
    }).map((r) => r.fact);
    expect(order.slice(0, 3)).toEqual(['The Bitcoin stamp', 'A timestamp (Test TSA)', 'The Midnight date']);
  });

  it('says when the Midnight date was read through VeilCore’s relay, and only then', () => {
    const date = (i: Partial<WhoInput>) => whoVouches({ ...base, ...i }).find((r) => r.fact === 'The Midnight date');
    expect(date({ relay: true })?.who).toMatch(/This page checked it there itself\. Read through VeilCore’s relay\.$/);
    expect(date({})?.who).not.toMatch(/relay/);
    expect(date({ relay: true, bound: false })?.who).toMatch(/Read through VeilCore’s relay\.$/);
    // A date the page didn't read on Midnight says nothing about the relay.
    expect(date({ relay: true, anchorConfirmed: false })?.who).not.toMatch(/relay/);
    expect(date({ relay: true, anchorConfirmed: false, anchorFailed: true })?.who).not.toMatch(/relay/);
  });

  it('every state in every language, with nothing left as a key', () => {
    const states: NonNullable<WhoInput['bitcoin']>[] = [
      { state: 'pending' },
      { state: 'reported', height: 1 },
      { state: 'reported' },
      { state: 'checking' },
      { state: 'unreachable' },
      { state: 'linked', height: 2, checkpoint: 3, time: 0, direction: 'down' },
      { state: 'linked', height: 4, checkpoint: 3, time: 0, direction: 'up' },
      { state: 'explorers', height: 2, explorers: ['a', 'b'] },
      { state: 'failed', kind: 'stamp' },
      { state: 'failed', kind: 'mismatch' },
      { state: 'failed', kind: 'headers' },
    ];
    for (const tr of [
      makeTranslator('de', appDe),
      makeTranslator('es', appEs),
      makeTranslator('fr', appFr),
      makeTranslator('ja', appJa),
    ])
      for (const s of states) {
        const row = btc(s, tr);
        expect(row?.fact, `${tr.lang} ${s.state}`).not.toMatch(/app\.verify/);
        expect(row?.who, `${tr.lang} ${s.state}`).not.toMatch(/app\.verify|\{\w+\}/);
      }
  });
});
