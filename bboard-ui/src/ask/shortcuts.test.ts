// Shortcuts (shortcuts.ts), Search (search.ts) and What's due (due.ts): what typed words become,
// in five languages, that only the person's own records are named, that a miss offers the
// three closest things, and that nothing here can reach the network.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  chipResult,
  closestActions,
  countIn,
  interpret,
  nameIn,
  recordsNamed,
  shortcutsEngine,
  topicsCovered,
} from './shortcuts';
import { searchRecords } from './search';
import { dealStateHere, dueCalendar, dueItems, licenseCalendar, type DealState } from './due';
import { ledgerOf, periodRows } from '../veilcore/royalty-ledger';
import type { DealEntry } from '../veilcore/deal-client';
import { ASK_ACTIONS, ASK_MAX_CHARS, TOPICS, type AskContext, type AskResult } from './engine';
import { readAskState, HANDOFF_STATE_KEY } from './handoff';
import type { StrainRecord } from '../veilcore/records';
import type { License } from '../veilcore/licenses';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import { appEn } from '../i18n/app/en';

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('Ask never reaches the network');
  });
});

const ID = (n: number) => `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`;
const rec = (n: number, name: string, extra: Partial<StrainRecord> = {}): StrainRecord =>
  ({
    id: ID(n),
    strainName: name,
    bredBy: 'Harbour Farm',
    dateCreated: '2025-04-01',
    notes: '',
    licenseIds: [],
    ...extra,
  }) as StrainRecord;
const animal = (n: number, name: string, sex: 'male' | 'female') =>
  rec(n, name, {
    profile: ANIMAL_PROFILE,
    animal: { breed: 'Wagyu', idScheme: '', sex, herd: '' },
  });

const records = [
  rec(1, 'Blue Dream'),
  rec(2, 'Blue Dream #12', { notes: 'mother room 2' }),
  rec(3, 'Gelato', { dateCreated: '2024-02-02', parents: [{ name: 'Sunset Sherbet' }] }),
  animal(4, 'Bull #4', 'male'),
  animal(9, 'Cow #9', 'female'),
];
const ctx: AskContext = { records, kinds: ['plant', 'animal', 'strain'] };
const draftOf = (r: AskResult) => {
  if (r.type !== 'draft') throw new Error(`not a draft: ${JSON.stringify(r)}`);
  return r;
};

describe('Shortcuts reads what was typed', () => {
  it('cut 12 clones from the longest matching name, not the number in it', () => {
    const r = draftOf(interpret('Cut 12 clones from Blue Dream #12', ctx));
    expect(r.draft).toEqual({ v: 1, source: 'ask', kind: 'plant', preset: 'clones', count: 12, parents: [ID(2)] });
    expect(r.unmatched).toEqual([]);
  });

  it('3 calves from Bull #4 x Cow #9', () => {
    const r = draftOf(interpret('3 calves from Bull #4 x Cow #9', ctx));
    expect(r.draft).toMatchObject({ kind: 'animal', preset: 'offspring', count: 3, parents: [ID(4), ID(9)] });
  });

  it('a cross of two of their records, and a name it doesn’t know said back', () => {
    expect(draftOf(interpret('cross Blue Dream x Gelato', ctx)).draft).toMatchObject({
      kind: 'plant',
      preset: 'cross',
      parents: [ID(1), ID(3)],
    });
    const r = draftOf(interpret('cross Gelato x Zkittlez', ctx));
    expect(r.draft.parents).toEqual([ID(3)]);
    expect(r.unmatched).toEqual(['zkittlez']);
  });

  it('a new record with its name', () => {
    expect(draftOf(interpret('new plant Harbour Mist', ctx)).draft).toEqual({
      v: 1,
      source: 'ask',
      kind: 'plant',
      preset: 'record',
      name: 'Harbour Mist',
    });
    expect(draftOf(interpret('log a cow called Daisy', ctx)).draft).toMatchObject({ kind: 'animal', name: 'Daisy' });
  });

  it('German, Spanish, French and Japanese', () => {
    expect(draftOf(interpret('12 Stecklinge von Blue Dream #12 schneiden', ctx)).draft).toMatchObject({
      preset: 'clones',
      count: 12,
      parents: [ID(2)],
    });
    expect(draftOf(interpret('cortar 5 esquejes de Gelato', ctx)).draft).toMatchObject({ preset: 'clones', count: 5 });
    expect(draftOf(interpret('2 veaux de Bull #4 et Cow #9', ctx)).draft).toMatchObject({
      preset: 'offspring',
      count: 2,
    });
    expect(draftOf(interpret('Blue Dream #12からクローンを１２本', ctx)).draft).toMatchObject({
      preset: 'clones',
      count: 12,
      parents: [ID(2)],
    });
    expect(draftOf(interpret('Blue DreamとGelatoを交配', ctx)).draft).toMatchObject({ preset: 'cross' });
    expect(draftOf(interpret('「春霞」という植物を登録', ctx)).draft).toMatchObject({ preset: 'record', name: '春霞' });
    expect(interpret('Was ist ein Prüfcode?', ctx)).toEqual({ type: 'explain', topic: 'proofCode' });
    expect(interpret('期限は？', ctx)).toEqual({ type: 'due' });
  });

  it('what’s due, explain, search and the pages it opens', () => {
    expect(interpret("what's due?", ctx)).toEqual({ type: 'due' });
    expect(interpret('explain prior possession', ctx)).toEqual({ type: 'explain', topic: 'priorPossession' });
    expect(interpret('what is a proof code', ctx)).toEqual({ type: 'explain', topic: 'proofCode' });
    expect(interpret('explain', ctx)).toEqual({ type: 'explain' });
    expect(interpret('find my gelato crosses from 2024', ctx)).toEqual({
      type: 'search',
      query: 'gelato crosses from 2024',
    });
    expect(interpret('save my backup', ctx)).toEqual({ type: 'go', action: 'backup' });
    expect(interpret('my licenses', ctx)).toEqual({ type: 'go', action: 'agreements' });
  });

  it('a miss offers the three closest things, never nothing', () => {
    const r = interpret('qwertyuiop', ctx);
    expect(r.type).toBe('miss');
    if (r.type === 'miss') expect(r.closest).toHaveLength(3);
    expect(closestActions('clonez')[0]).toBe('clones');
    expect(closestActions('serch')[0]).toBe('search');
  });

  it('names only the person’s own records, and the handoff keeps only those', () => {
    const r = draftOf(interpret('cross Blue Dream x Gelato', ctx));
    const state = { [HANDOFF_STATE_KEY]: r.draft };
    expect(readAskState(state, new Set([ID(1)]))?.parents).toEqual([ID(1)]);
    expect(recordsNamed('blue dreamer', records).found).toEqual([]);
  });

  it('reads at most ASK_MAX_CHARS, with no pattern slower than the text', () => {
    const long = `cut ${'a'.repeat(50_000)} 7 clones`;
    const t0 = performance.now();
    interpret(long, ctx);
    nameIn(`${'called '.repeat(10_000)}x`);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(countIn('cut #12 clones')).toBeUndefined();
    expect(countIn('cut 12.5 clones')).toBeUndefined();
    expect(ASK_MAX_CHARS).toBe(300);
  });

  it('chips give the same kinds of answers, and every one has words', () => {
    for (const a of ASK_ACTIONS) {
      expect(chipResult(a, ctx).type).not.toBe('miss');
      expect((appEn as Record<string, string>)[`app.ask.chip.${a}`], a).toBeTruthy();
    }
    for (const k of TOPICS) {
      expect((appEn as Record<string, string>)[`app.ask.term.${k}`], k).toBeTruthy();
      expect((appEn as Record<string, string>)[`app.ask.def.${k}`], k).toBeTruthy();
    }
    expect(topicsCovered()).toBe(true);
    // A site without animal records offers no offspring.
    expect(chipResult('offspring', { records, kinds: ['plant'] }).type).toBe('miss');
  });

  it('the engine interface answers the same, and never fetches', async () => {
    expect(shortcutsEngine.id).toBe('shortcuts');
    expect(await shortcutsEngine.interpret('cut 2 clones from Gelato', ctx)).toEqual(
      interpret('cut 2 clones from Gelato', ctx),
    );
  });
});

describe('a new record: the verb or "new" after the noun is not a name (review, side finding)', () => {
  const name = (t: string) => {
    const r = interpret(t, ctx);
    return r.type === 'draft' ? r.draft.name : 'not a draft';
  };
  it('no name where none was typed, in all five languages', () => {
    for (const t of [
      'record a new plant',
      'new plant please',
      'neue Pflanze erfassen',
      'Pflanze erfassen',
      'eine neue Pflanze anlegen',
      'registrar una planta nueva',
      'planta nueva',
      'enregistrer une nouvelle plante',
      'nouvelle plante',
      '新しい植物を記録する',
    ])
      expect(name(t), t).toBeUndefined();
  });
  it('a typed name is kept, in all five languages, even one that starts like "new"', () => {
    expect(name('new plant New Dawn')).toBe('New Dawn');
    expect(name('neue Pflanze namens Sunset Sherbet')).toBe('Sunset Sherbet');
    expect(name('nueva planta Harbour Mist')).toBe('Harbour Mist');
    expect(name('nouvelle plante appelée Harbour Mist')).toBe('Harbour Mist');
    expect(name('Harbour Mistという植物を登録')).toBe('Harbour Mist');
  });
  it('a real name that looks like one of those words is kept, in all five languages', () => {
    expect(name('new plant One')).toBe('One');
    expect(name('new plant La')).toBe('La');
    expect(name('new plant Please')).toBe('Please');
    expect(name('new plant Record')).toBe('Record');
    expect(name('neue Pflanze Neuland')).toBe('Neuland');
    expect(name('neue Pflanze Neumann')).toBe('Neumann');
    expect(name('nueva planta Nuevo')).toBe('Nuevo');
    expect(name('nueva planta Uno')).toBe('Uno');
    expect(name('nouvelle plante Nouveau')).toBe('Nouveau');
    expect(name('新しい植物「新」')).toBe('新');
  });
});

describe('how breeders say it (the breeders’ review): litters, foals, calving, in all five languages', () => {
  const bella = animal(21, 'Bella', 'female');
  const daisy = animal(22, 'Daisy', 'female');
  const c: AskContext = { records: [...records, bella, daisy], kinds: ['plant', 'animal', 'strain'] };
  const off = (t: string) => {
    const r = interpret(t, c);
    return r.type === 'draft' ? { preset: r.draft.preset, count: r.draft.count, parents: r.draft.parents } : r.type;
  };
  const cases: [string, number, string][] = [
    ['3 pups from Bella', 3, bella.id],
    ['Bella whelped 6 pups', 6, bella.id],
    ['Daisy calved today', 1, daisy.id],
    ['2 foals from Daisy', 2, daisy.id],
    ['Daisy kidded 2 kids', 2, daisy.id],
    ['4 lambs from Daisy', 4, daisy.id],
    ['Bella had 5 kittens', 5, bella.id],
    ['9 piglets from Daisy', 9, daisy.id],
    ['3 Welpen von Bella', 3, bella.id],
    ['Wurf von Bella: 7', 7, bella.id],
    ['2 Fohlen von Daisy', 2, daisy.id],
    ['Daisy hat gekalbt', 1, daisy.id],
    ['6 chiots de Bella', 6, bella.id],
    ['portée de Bella', 1, bella.id],
    ['2 poulains de Daisy', 2, daisy.id],
    ['Daisy a vêlé ce matin', 1, daisy.id],
    ['6 cachorros de Bella', 6, bella.id],
    ['camada de Bella', 1, bella.id],
    ['2 potros de Daisy', 2, daisy.id],
    ['Bellaの子犬を6頭', 6, bella.id],
    ['Daisyの仔馬', 1, daisy.id],
    ['Daisyが子牛を出産', 1, daisy.id],
  ];
  it.each(cases)('%s', (text, count, parent) => {
    expect(off(text)).toEqual({ preset: 'offspring', count, parents: [parent] });
  });
  it('plants: "take 12 cuts off" is a batch of clones', () => {
    expect(off('take 12 cuts off Gelato')).toEqual({ preset: 'clones', count: 12, parents: [ID(3)] });
  });
  it('the bulk-import cap still holds', () => {
    expect(off('900 pups from Bella')).toMatchObject({ preset: 'offspring', count: 500 });
  });
});

describe('Search my records', () => {
  it('by words, year and kind', () => {
    expect(searchRecords(records, 'blue').map((r) => r.strainName)).toEqual(['Blue Dream', 'Blue Dream #12']);
    expect(searchRecords(records, 'sherbet 2024').map((r) => r.strainName)).toEqual(['Gelato']);
    expect(searchRecords(records, 'animal').map((r) => r.strainName)).toEqual(['Bull #4', 'Cow #9']);
    expect(searchRecords(records, 'mother room')).toHaveLength(1);
    expect(searchRecords(records, 'Tier 2025')).toHaveLength(2);
    expect(searchRecords(records, 'nothing like this')).toEqual([]);
  });
});

describe('What’s due', () => {
  const license = (over: Partial<License> = {}): License =>
    ({
      id: 'LIC-1',
      type: 'license',
      recordId: ID(1),
      state: 'active',
      terms: {
        licensee: 'Someone',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 15 },
      },
      ...over,
    }) as unknown as License;

  it('reports, payments and the end date from signed terms, soonest first', () => {
    const items = dueItems([license()], records, '2026-11-06');
    // A practice agreement: the dates still to come (Q3's payment, 14 Nov), labelled practice.
    expect(items[0]).toMatchObject({
      kind: 'payment',
      date: '2026-11-14',
      overdue: false,
      practice: true,
      name: 'Blue Dream',
    });
    expect(items.map((i) => i.kind)).toContain('ends');
    expect(items.every((i, k) => k === 0 || items[k - 1].date <= i.date)).toBe(true);
    // Never the other side's words: the record's name, or the agreement's id.
    expect(JSON.stringify(items)).not.toContain('Someone');
    expect(dueItems([license({ recordId: ID(99) })], records, '2026-11-06')[0].name).toBe('LIC-1');
  });

  it('nothing from drafts or revoked agreements', () => {
    expect(dueItems([license({ state: 'draft' }), license({ state: 'revoked' })], records, '2026-11-06')).toEqual([]);
  });

  it('a calendar file with one all-day event per item', () => {
    const items = dueItems([license()], records, '2026-11-06').slice(0, 2);
    const ics = dueCalendar(items, (i) => `VeilCore: ${i.kind}`, new Date(Date.UTC(2026, 10, 6)));
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261114');
    expect(ics).toContain('DTEND;VALUE=DATE:20261115');
  });

  it('a practice agreement never shows anything overdue: only dates still to come, each labelled practice', () => {
    for (const day of [
      '2026-01-15',
      '2026-05-01',
      '2026-11-06',
      '2026-11-15',
      '2027-01-20',
      '2027-06-01',
      '2027-12-30',
    ]) {
      const items = dueItems([license()], records, day, 99);
      expect(
        items.some((i) => i.overdue),
        day,
      ).toBe(false);
      for (const i of items.filter((x) => x.kind === 'report' || x.kind === 'payment')) {
        expect(i.date >= day, `${day} ${i.kind} ${i.date}`).toBe(true);
        expect(i.practice, day).toBe(true);
      }
    }
    // A real license is never labelled practice.
    const real = dueItems([license()], records, '2026-11-15', 99, () => ({ kind: 'ledger', ledger: ledgerOf([]) }));
    expect(real.some((i) => i.practice)).toBe(false);
  });

  // Final review, S2: the list is built from the deal's actual state (royalty-ledger.ts
  // periodRows, the license page's own steps), never from the dates alone.
  describe('from the deal’s messages, as the license page works them out', () => {
    // Quarterly from 1 Jan 2026: Q3 (Jul to Sep) has its report due 30 Oct, its payment 14 Nov.
    const Q = [
      ['2026-01-01', '2026-03-31'],
      ['2026-04-01', '2026-06-30'],
      ['2026-07-01', '2026-09-30'],
    ] as const;
    let n = 0;
    const sig = () => `sig-${++n}`.padEnd(16, '0');
    const at = (day: string) => Date.parse(`${day}T12:00:00Z`);
    /** One report for a period, taken as far as `upTo`: sent, accepted (or sent back), paid, received. */
    const cycle = (
      q: readonly [string, string],
      upTo: 'sent' | 'fix' | 'accepted' | 'paid' | 'received',
      day = q[1],
    ): DealEntry[] => {
      const s = sig();
      const e = (m: Record<string, unknown>) =>
        ({ seq: 0, fingerprint: '', receivedAt: 0, mine: false, signature: sig(), ...m }) as unknown as DealEntry;
      const out = [
        e({
          type: 'statement',
          statementId: `S-${q[0]}`,
          periodFrom: q[0],
          periodTo: q[1],
          basis: 'per-unit',
          quantity: '40',
          currency: 'USD',
          amountOwed: '100.00',
          from: 'licensee',
          at: at(day) + 1,
          signature: s,
        }),
      ];
      if (upTo === 'sent') return out;
      out.push(
        e({
          type: 'reply',
          statementSig: s,
          decision: upTo === 'fix' ? 'disputed' : 'accepted',
          from: 'issuer',
          at: at(day) + 2,
        }),
      );
      if (upTo === 'fix' || upTo === 'accepted') return out;
      out.push(
        e({ type: 'paid', statementSig: s, amount: '100.00', currency: 'USD', from: 'licensee', at: at(day) + 3 }),
      );
      if (upTo === 'paid') return out;
      out.push(
        e({ type: 'received', statementSig: s, amount: '100.00', currency: 'USD', from: 'issuer', at: at(day) + 4 }),
      );
      return out;
    };
    const withLedger =
      (...entries: DealEntry[][]) =>
      (): DealState => ({ kind: 'ledger', ledger: ledgerOf(entries.flat()) });
    const royalties = (items: ReturnType<typeof dueItems>) =>
      items.filter((i) => i.kind === 'report' || i.kind === 'payment');
    const q3done = () => [cycle(Q[0], 'received'), cycle(Q[1], 'received')];

    it('an accepted, unpaid payment stays, overdue, the day after it falls due and long after', () => {
      const state = withLedger(...q3done(), cycle(Q[2], 'accepted'));
      const on14 = royalties(dueItems([license()], records, '2026-11-14', 20, state));
      expect(on14[0]).toMatchObject({ kind: 'payment', date: '2026-11-14', from: Q[2][0], overdue: false });
      for (const day of ['2026-11-15', '2027-03-01']) {
        const items = royalties(dueItems([license()], records, day, 20, state));
        expect(items[0], day).toMatchObject({ kind: 'payment', date: '2026-11-14', from: Q[2][0], overdue: true });
      }
    });

    it('a report not sent, or sent back to fix, stays overdue until a report goes in', () => {
      for (const q3 of [[], cycle(Q[2], 'fix')]) {
        const state = withLedger(...q3done(), q3);
        for (const day of ['2026-10-31', '2026-11-15', '2027-02-10']) {
          const items = royalties(dueItems([license()], records, day, 20, state));
          expect(items[0], day).toMatchObject({ kind: 'report', date: '2026-10-30', from: Q[2][0], overdue: true });
          // No payment for it before a report is accepted ("I paid" opens only after Accept).
          expect(
            items.some((i) => i.kind === 'payment' && i.from === Q[2][0]),
            day,
          ).toBe(false);
        }
      }
    });

    it('nothing for a period whose report went in and was accepted and paid; nothing waits on a date while it is answered or confirmed', () => {
      for (const last of ['received', 'paid', 'sent'] as const) {
        const items = royalties(
          dueItems([license()], records, '2026-11-20', 20, withLedger(...q3done(), cycle(Q[2], last))),
        );
        // Only the period running now (Oct to Dec), not overdue.
        expect(
          items.map((i) => [i.kind, i.from, i.overdue]),
          last,
        ).toEqual([
          ['report', '2026-10-01', false],
          ['payment', '2026-10-01', false],
        ]);
      }
    });

    it('agrees with the license page (periodRows) on every day, every state', () => {
      const states = [
        [],
        [cycle(Q[0], 'sent')],
        [cycle(Q[0], 'fix'), cycle(Q[1], 'accepted')],
        [cycle(Q[0], 'received'), cycle(Q[1], 'paid'), cycle(Q[2], 'accepted')],
        [...q3done(), cycle(Q[2], 'received')],
      ];
      const days = ['2026-02-01', '2026-04-30', '2026-05-01', '2026-07-31', '2026-10-30', '2026-11-14', '2026-11-15'];
      for (const entries of states)
        for (const day of days) {
          const ledger = ledgerOf(entries.flat());
          const page = periodRows(license().terms, ledger, day)
            .filter((r) => r.step === 'report' || r.step === 'fix' || r.step === 'pay')
            .map((r) => [r.step === 'pay' ? 'payment' : 'report', r.due, r.period.from, r.overdue > 0]);
          const ask = royalties(dueItems([license()], records, day, 99, () => ({ kind: 'ledger', ledger }))).map(
            (i) => [i.kind, i.date, i.from, i.overdue],
          );
          const at = `${entries.length} ${day}`;
          // Everything the page shows as waiting on a date is in the list, overdue alike...
          for (const row of page) expect(ask, at).toContainEqual(row);
          // ...and the rest is only the period running now (or the first one, before it starts),
          // not overdue: never a period the page shows as done, answered or confirmed.
          const rows = periodRows(license().terms, ledger, day);
          for (const a of ask.filter((x) => !page.some((r) => JSON.stringify(r) === JSON.stringify(x)))) {
            const row = rows.find((r) => r.period.from === a[2]);
            expect(a[3], at).toBe(false);
            expect(row === undefined || row.step === 'running', `${at} ${JSON.stringify(a)}`).toBe(true);
          }
        }
    });

    it('the calendar file follows: the overdue payment is in it, done periods are not', () => {
      const items = dueItems([license()], records, '2026-11-15', 20, withLedger(...q3done(), cycle(Q[2], 'accepted')));
      const ics = dueCalendar(items, (i) => i.kind, new Date(Date.UTC(2026, 10, 15)));
      expect(ics).toContain('DTSTART;VALUE=DATE:20261114');
      expect(ics).not.toContain('DTSTART;VALUE=DATE:20260430');
      expect(ics).not.toContain('DTSTART;VALUE=DATE:20260730');
    });

    it('the license page’s calendar file has the same dates as Ask’s, overdue kept, done gone', () => {
      const events = (ics: string) =>
        [...ics.matchAll(/DTSTART;VALUE=DATE:(\d+)\r\nDTEND[^\r]*\r\nSUMMARY:(report|payment)/g)]
          .map((m) => `${m[2]} ${m[1]}`)
          .sort();
      const now = new Date(Date.UTC(2026, 10, 15));
      const states = [
        [],
        [cycle(Q[0], 'fix'), cycle(Q[1], 'accepted')],
        [...q3done(), cycle(Q[2], 'accepted')],
        [...q3done(), cycle(Q[2], 'received')],
      ];
      for (const entries of states)
        for (const day of ['2026-02-01', '2026-07-31', '2026-11-14', '2026-11-15', '2027-03-01']) {
          const ledger = ledgerOf(entries.flat());
          const page = licenseCalendar(license().terms, ledger, day, (kind) => kind, now);
          const ask = dueCalendar(
            dueItems([license()], records, day, 99, () => ({ kind: 'ledger', ledger })),
            (i) => i.kind,
            now,
          );
          expect(events(page), `${entries.length} ${day}`).toEqual(events(ask));
        }
      const page = licenseCalendar(
        license().terms,
        ledgerOf([...q3done(), cycle(Q[2], 'accepted')].flat()),
        '2026-11-15',
        (kind) => kind,
        now,
      );
      expect(events(page)).toContain('payment 20261114');
      expect(events(page).some((e) => /20260430|20260515|20260730|20260814/.test(e))).toBe(false);
    });

    it('a deal this page hasn’t read: a link to the agreement, never a guess; not in the calendar', () => {
      const items = dueItems([license()], records, '2026-11-15', 20, () => ({ kind: 'unread' }));
      expect(items[0]).toMatchObject({ kind: 'check', licenseId: 'LIC-1', name: 'Blue Dream' });
      expect(royalties(items)).toEqual([]);
      expect(dueCalendar(items, (i) => i.kind).match(/BEGIN:VEVENT/g)).toHaveLength(1); // the end date only
      expect((appEn as Record<string, string>)['app.ask.due.check']).toBe(
        '{name}: open the agreement to see what’s due',
      );
    });

    it('which state a license is in, from what this page holds', () => {
      expect(dealStateHere(license())).toEqual({ kind: 'schedule' });
      const oc = {
        inviteId: 'i',
        issuerToken: 't',
        partySecret: 'a'.repeat(64),
        licenseeNonce: 'b'.repeat(64),
        commitment: 'c'.repeat(64),
        issuerRecord: 'd'.repeat(64),
      };
      // No channel yet: nothing can have been reported or paid.
      expect(dealStateHere(license({ onChain: oc } as never))).toMatchObject({
        kind: 'ledger',
        ledger: { reports: [] },
      });
      expect(dealStateHere(license({ onChain: { ...oc, termsSentAt: 1 } } as never))).toEqual({ kind: 'unread' });
    });
  });

  it('the reminder says only how many', () => {
    expect((appEn as Record<string, string>)['app.ask.due.shareText.other']).toBe('{count} items due on VeilCore');
  });
});

// Ask's own code: src/ask/ and components/ask/. Two things are kept apart in src/ask-local/ and
// checked there (ask-local.test.ts): the optional model's download worker, the only code that
// fetches, and only when the person starts it; and the flag that the hint was seen, the only
// thing stored.
describe('Ask stays off the network and out of storage', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const files = [
    ...fs
      .readdirSync(here)
      .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
      .map((f) => path.join(here, f)),
    ...fs.readdirSync(path.join(here, '../components/ask')).map((f) => path.join(here, '../components/ask', f)),
  ];
  it('no fetch, WebSocket, XMLHttpRequest, sendBeacon or browser storage in Ask’s own code', () => {
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
      expect(src, f).not.toMatch(/\bfetch\(|WebSocket|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
    }
  });
});

describe('docs/ask-veilcore.md says what the app says', () => {
  it('quotes the privacy line and the receipt’s private lines word for word', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const doc = fs.readFileSync(path.resolve(here, '../../../docs/ask-veilcore.md'), 'utf8');
    const en = appEn as Record<string, string>;
    for (const k of [
      'app.ask.privacy',
      'app.ask.privacyModel',
      'app.receipt.stay.genetics',
      'app.receipt.stay.locked',
      'app.receipt.stay.kind',
    ])
      expect(doc, k).toContain(`> ${en[k]}`);
    expect(doc).toContain(en['app.ask.banner.ask']);
  });
});

// Review round 1, item 4: nothing a name holds can start a new line or property in the calendar.
describe('the calendar file can’t be injected into', () => {
  it('escapes line breaks of every kind and drops other control characters; UIDs are plain', () => {
    const items = [
      {
        kind: 'report' as const,
        date: '2026-12-01',
        licenseId: 'LIC-1\r\nATTENDEE:evil@x',
        name: 'x',
        overdue: false,
      },
    ];
    const ics = dueCalendar(items, () => 'A;B,C\rEND:VEVENT\nBEGIN:VALARM\r\nX\u0007', new Date(Date.UTC(2026, 10, 6)));
    const lines = ics.split('\r\n');
    expect(lines.filter((l) => l.startsWith('END:VEVENT'))).toHaveLength(1);
    expect(lines.some((l) => l.startsWith('BEGIN:VALARM') || l.startsWith('ATTENDEE'))).toBe(false);
    expect(ics).toContain(`${String.raw`SUMMARY:A\;B\,C\nEND:VEVENT\nBEGIN:VALARM\nX`}\r\n`);
    expect(ics).toContain('UID:LIC-1ATTENDEEevilx-report-2026-12-01@veilcore.org');
    // eslint-disable-next-line no-control-regex
    expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(ics)).toBe(false);
  });
});
