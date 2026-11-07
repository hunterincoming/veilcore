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
import { dueCalendar, dueItems } from './due';
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
    expect(items[0]).toMatchObject({ kind: 'report', date: '2026-10-30', overdue: true, name: 'Blue Dream' });
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
    expect(ics).toContain('DTSTART;VALUE=DATE:20261030');
    expect(ics).toContain('DTEND;VALUE=DATE:20261031');
  });

  it('the reminder says only how many', () => {
    expect((appEn as Record<string, string>)['app.ask.due.shareText.other']).toBe('{count} items due on VeilCore');
  });
});

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
