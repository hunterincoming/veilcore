// The breeding history (draft): the ancestor walk, the notes it reads, the two pages it
// writes (escaped, text only, every row saying whether it is dated), and the zip with each
// record's evidence bundle.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import type { StrainRecord, ParentRef } from '../records';
import { fingerprintRecord } from '../commitment';
import { reconcile, type Gathered } from '../evidence/bundle';
import { practiceBatch } from '../evidence/test-records';
import { walkHistory, MAX_HISTORY_RECORDS } from './walk';
import { parseStageNotes } from './notes';
import {
  breedingHistoryHtml,
  coverNoteHtml,
  dateStampWords,
  genealogyLine,
  DRAFT_LINE,
  NOTES_SHOWN,
  type RowFacts,
} from './html';
import { breedingHistoryFiles, historyFolder, HistoryRefusal } from './export';

const NOW = new Date('2026-10-15T12:00:00Z');
const hex = (n: number, salt: string): string => {
  let s = '';
  for (let i = 0; s.length < 64; i++)
    s += ((n * 37 + i * 11 + salt.charCodeAt(i % salt.length)) % 256).toString(16).padStart(2, '0');
  return s.slice(0, 64);
};
const idFor = (n: number) => `VEIL-${hex(n, 'hist').slice(0, 32).toUpperCase()}`;

/** A record as the site seals it, unsealed fields left out unless given. */
const rec = async (n: number, over: Partial<StrainRecord> & { parents?: ParentRef[] } = {}): Promise<StrainRecord> => {
  const base = {
    id: idFor(n),
    nonce: hex(n, 'nonce'),
    strainName: `Gen ${n}`,
    bredBy: 'Practice breeder',
    dateCreated: `202${n}-03-01`,
    notes: '',
    loggedAt: 1_760_000_000_000 + n * 1000,
    licenseIds: [],
    parents: [] as ParentRef[],
    breedingMethod: 'Selection',
    ...over,
  };
  return { ...base, recordFingerprint: await fingerprintRecord({ ...base, nonce: base.nonce }) };
};
const lookupIn =
  (all: readonly StrainRecord[]) =>
  (id: string): StrainRecord | undefined =>
    all.find((r) => r.id === id);

/** Three generations: Gen 1 → Gen 2 → Gen 3, Gen 3 also with a free-typed pollen parent. */
const threeGens = async () => {
  const g1 = await rec(1, {
    notes: 'Stage: starting mother\nSelected for: vigour\n\nFrom a seed pack.',
    breedingMethod: 'Landrace / heirloom',
    parents: [{ recordId: 'VEIL-THEIRS0000000000000000000000001', name: 'Their Mother' }],
  });
  const g2 = await rec(2, {
    notes: 'Stage: F2\nSelected for: short internodes',
    breedingMethod: 'Seed — F2',
    parents: [{ recordId: g1.id, name: 'Gen 1' }],
  });
  const g3 = await rec(3, {
    notes: 'Stage: F3\nSelected for: early finish, terpene profile',
    breedingMethod: 'Seed — F1',
    parents: [{ recordId: g2.id, name: 'Gen 2' }, { name: 'Pollen donor' }],
  });
  return { g1, g2, g3, all: [g3, g2, g1] };
};

describe('walkHistory', () => {
  it('walks linked ancestors held here, oldest first; others’ records and free-typed parents stay outside', async () => {
    const { g1, g2, g3, all } = await threeGens();
    const h = walkHistory(g3, lookupIn(all));
    expect(h.nodes.map((n) => n.record.id)).toEqual([g1.id, g2.id, g3.id]);
    expect(h.nodes.map((n) => n.row)).toEqual([1, 2, 3]);
    expect(h.nodes.map((n) => n.depth)).toEqual([2, 1, 0]);
    expect(h.outside).toEqual([
      { kind: 'theirs', name: 'Their Mother', recordId: 'VEIL-THEIRS0000000000000000000000001', namedBy: [1] },
      { kind: 'named', name: 'Pollen donor', namedBy: [3] },
    ]);
    expect(h.loops).toBe(false);
  });

  it('starts from the given record and never walks down to its offspring', async () => {
    const { g2, all } = await threeGens();
    const h = walkHistory(g2, lookupIn(all));
    expect(h.nodes.map((n) => n.record.strainName)).toEqual(['Gen 1', 'Gen 2']);
  });

  it('a record whose links loop ends, each record once, the closing link marked', async () => {
    // A names B as parent, B names A: a loop. C names itself.
    const aId = idFor(10);
    const bId = idFor(11);
    const a = await rec(10, { parents: [{ recordId: bId, name: 'B' }] });
    const b = await rec(11, { parents: [{ recordId: aId, name: 'A' }] });
    const h = walkHistory(a, lookupIn([a, b]));
    expect(h.nodes.map((n) => n.record.id).sort()).toEqual([aId, bId].sort());
    expect(h.loops).toBe(true);
    const closing = h.nodes.find((n) => n.record.id === bId)?.parents[0];
    expect(closing).toMatchObject({ kind: 'held', recordId: aId, loops: true });
    expect(genealogyLine(h)).toContain('the links loop back here');

    const c = await rec(12, { parents: [{ recordId: idFor(12), name: 'itself' }] });
    const hc = walkHistory(c, lookupIn([c]));
    expect(hc.nodes).toHaveLength(1);
    expect(hc.nodes[0].parents[0]).toMatchObject({ kind: 'held', loops: true });
  });

  it('a shared ancestor is one row, at its deepest generation', async () => {
    const top = await rec(20);
    const mid = await rec(21, { parents: [{ recordId: top.id, name: 'Top' }] });
    const child = await rec(22, {
      parents: [
        { recordId: mid.id, name: 'Mid' },
        { recordId: top.id, name: 'Top' },
      ],
    });
    const h = walkHistory(child, lookupIn([top, mid, child]));
    expect(h.nodes.map((n) => [n.record.id, n.depth])).toEqual([
      [top.id, 2],
      [mid.id, 1],
      [child.id, 0],
    ]);
    // Spelled out once in the genealogy, then named by its row.
    expect(genealogyLine(h)).toBe('Gen 22 (#3) from [Gen 21 (#2) from Gen 20 (#1)] × Gen 20 (#1)');
  });

  it('a parent link to a record not in this browser is theirs; one beyond the limit is left out', async () => {
    const recs: StrainRecord[] = [];
    for (let i = 0; i < 5; i++)
      recs.push(await rec(30 + i, i ? { parents: [{ recordId: recs[i - 1].id, name: `Gen ${29 + i}` }] } : {}));
    const h = walkHistory(recs[4], lookupIn(recs), 3);
    expect(h.nodes).toHaveLength(3);
    expect(h.outside).toEqual([{ kind: 'left-out', name: 'Gen 31', recordId: recs[1].id, namedBy: [1] }]);
    expect(MAX_HISTORY_RECORDS).toBeLessThanOrEqual(20); // the registry's evidence downloads a minute
    // A lookup that answers with a different record is not that record.
    const wrong = walkHistory(recs[1], () => recs[3]);
    expect(wrong.outside[0]).toMatchObject({ kind: 'theirs', recordId: recs[0].id });
  });

  it('parents with no name or odd shapes still read', async () => {
    const r = await rec(40, { parents: [{ name: '   ' }, { recordId: '', name: 'Typed' }] });
    const h = walkHistory(r, () => undefined);
    expect(h.outside.map((o) => [o.kind, o.name])).toEqual([
      ['named', '(no name)'],
      ['named', 'Typed'],
    ]);
  });
});

describe('parseStageNotes', () => {
  it('reads the "Stage:" and "Selected for:" lines the next-stage flow writes, and keeps the rest', () => {
    expect(
      parseStageNotes('Stage: F3\nSelected for: tight internodes, early finish\n\nKept the best 4 of 40.'),
    ).toEqual({
      stage: 'F3',
      selectedFor: 'tight internodes, early finish',
      rest: 'Kept the best 4 of 40.',
    });
  });
  it('any case, list marks, Windows line ends, and both on one line', () => {
    expect(parseStageNotes('- STAGE: S1\r\n* selected FOR : resin')).toEqual({
      stage: 'S1',
      selectedFor: 'resin',
      rest: '',
    });
    expect(parseStageNotes('Stage: F4. Selected for: vigour')).toEqual({
      stage: 'F4',
      selectedFor: 'vigour',
      rest: '',
    });
  });
  it('notes without the lines are all "rest"; empty answers are not answers', () => {
    expect(parseStageNotes('Just notes.\nStaged in tent 2.')).toEqual({ rest: 'Just notes.\nStaged in tent 2.' });
    expect(parseStageNotes('Stage:\nSelected for:   ')).toEqual({ rest: '' });
    expect(parseStageNotes(undefined)).toEqual({ rest: '' });
    expect(parseStageNotes('')).toEqual({ rest: '' });
  });
});

const stamped = (folder: string, test = true): RowFacts => ({
  stamp: { kind: 'stamped', network: test ? 'preprod' : 'mainnet', at: '2026-10-15T11:00:00.000Z', test },
  bundle: { folder },
});

describe('the pages', () => {
  it('every value is escaped; no script, no requests; three plain headings; draft on every section', async () => {
    const evil = await rec(50, {
      strainName: 'Bad <script>alert(1)</script> "q" \'s\' `b` ‮evil',
      bredBy: '<img src=x onerror=alert(1)>',
      dateCreated: '<b>2020</b>',
      notes: 'Stage: <i>F1</i>\nSelected for: "a" & \'b\'\n<iframe src=//x>',
      breedingMethod: '</td><script>',
      parents: [{ name: '<svg onload=alert(1)>' }, { recordId: 'VEIL-<x>', name: 'Their <b>' }],
    });
    const h = walkHistory(evil, () => undefined);
    const facts = new Map([[evil.id, stamped('x-evidence')]]);
    for (const html of [
      breedingHistoryHtml({ history: h, facts, madeAt: NOW }),
      coverNoteHtml({ history: h, facts, madeAt: NOW }),
    ]) {
      // Typed text is shown as text: no tag from it survives (its words, escaped, are fine).
      expect(html).not.toMatch(/<(script|img|iframe|svg|b|i)\b/i);
      expect(html).not.toContain('‮');
      expect(html).toContain('Content-Security-Policy" content="default-src \'none\'');
      expect(html).not.toMatch(/<a\s|<link|<meta http-equiv="refresh"/i);
      expect(html).toContain(DRAFT_LINE);
    }
    const page = breedingHistoryHtml({ history: h, facts, madeAt: NOW });
    expect(page).toContain('&#60;img src=x onerror=alert(1)&#62;');
    expect(page).toContain('Bad &#60;script&#62;alert(1)&#60;/script&#62; &#34;q&#34; &#39;s&#39; &#96;b&#96;');
    // The three headings, as plain headings.
    const headings = [...page.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    expect(headings).toEqual([
      'For a US PVP application (Exhibit A)',
      'For a UPOV-style technical questionnaire (section 4.1)',
      'For a Japanese application (説明書 §4)',
    ]);
    expect(page).toContain('<span lang="ja">説明書</span>');
    // "Draft. Not legal advice." in the repeating page header and at the top of every section.
    expect(page.split(DRAFT_LINE).length - 1).toBeGreaterThanOrEqual(5);
    // The blank boxes, in each section.
    expect(page.match(/data-blank="yes"/g)?.length).toBeGreaterThanOrEqual(9);
    for (const s of ['How you tested for uniformity', 'Over how many generations', 'Variants or off-types'])
      expect(page.split(s).length - 1).toBe(3);
  });

  it('an undated row says so in the row itself; a dated one names its date, network and bundle', async () => {
    const { g1, g2, g3, all } = await threeGens();
    const h = walkHistory(g3, lookupIn(all));
    const facts = new Map<string, RowFacts>([
      [g1.id, stamped(`${g1.id}-evidence`, false)],
      [g2.id, { stamp: { kind: 'batch-only' }, bundle: { folder: `${g2.id}-evidence` } }],
      [g3.id, { stamp: { kind: 'none' }, bundle: { folder: `${g3.id}-evidence` } }],
    ]);
    const page = breedingHistoryHtml({ history: h, facts, madeAt: NOW });
    const row = (id: string) => {
      const start = page.indexOf(`<tr data-record="${id}"`);
      return page.slice(start, page.indexOf('</tr>', start));
    };
    expect(row(g1.id)).toContain('data-dated="yes"');
    expect(row(g1.id)).toContain('2026-10-15 11:00 UTC, on Midnight&#39;s main network');
    expect(row(g1.id)).toContain(`Check it with verify.html in evidence/${g1.id}-evidence/.`);
    expect(row(g2.id)).toContain('data-dated="no"');
    expect(row(g2.id)).toContain('In a batch, not dated on any network yet.');
    expect(row(g3.id)).toContain('Not dated on any network yet.');
    // Stage and selection read from the notes; the breeder's date labelled as theirs.
    expect(row(g3.id)).toContain('F3');
    expect(row(g3.id)).toContain('early finish, terpene profile');
    expect(row(g3.id)).toContain('2023-03-01 <span class="muted">(the breeder’s statement)</span>');
    expect(row(g1.id)).toContain('Record ID ' + g1.id);
    // Parents held by others shown as theirs; free-typed as named with no record.
    expect(page).toContain('Their Mother (linked record VEIL-THEIRS0000000000000000000000001, held by someone else');
    expect(page).toContain('Pollen donor (named by the breeder, no record)');
    expect(genealogyLine(h)).toBe(
      'Gen 3 (#3) from [Gen 2 (#2) from [Gen 1 (#1) from Their Mother (linked record VEIL-THEIRS0000000000000000000000001, held by someone else: their record, not in this history)]] × Pollen donor (named by the breeder, no record)',
    );
    // Two of three undated: the page and the cover say so up front.
    expect(page).toContain('2 of the 3 records are not dated on any network yet.');
    expect(coverNoteHtml({ history: h, facts, madeAt: NOW })).toContain('2 of the 3 records are not dated');
  });

  it('date stamp words for each case, test networks called practice data', () => {
    expect(dateStampWords(undefined)).toBe('Not dated on any network yet.');
    expect(dateStampWords({ stamp: { kind: 'unsealed' }, bundle: { refused: 'x' } })).toBe(
      'Not sealed, so nothing dates it.',
    );
    expect(dateStampWords({ stamp: { kind: 'none', proofRefused: true }, bundle: { folder: 'f' } })).toContain(
      'proof didn’t check',
    );
    expect(dateStampWords(stamped('f'))).toContain('A test network: practice data, not a real date.');
    expect(
      dateStampWords({
        stamp: { kind: 'stamped', network: 'mainnet', at: null, test: false },
        bundle: { refused: 'r' },
      }),
    ).toBe(
      "Time not given, on Midnight's main network, as VeilCore’s registry reported it. No evidence bundle could be made for this record, so this export can’t check it.",
    );
  });

  it('the cover note: hemp-only PVP, plant patent for high-THC, never vouches, no ownership words', async () => {
    const { g3, all } = await threeGens();
    const h = walkHistory(g3, lookupIn(all));
    const cover = coverNoteHtml({ history: h, facts: new Map(), madeAt: NOW });
    expect(cover).toContain('covers hemp only: 0.3% or less delta-9 THC');
    expect(cover).toContain('USPTO plant patent');
    expect(cover).toContain('VeilCore doesn’t vouch');
    expect(cover).toContain('Records held by someone else (1), parents named without a record (1)');
    for (const html of [cover, breedingHistoryHtml({ history: h, facts: new Map(), madeAt: NOW })]) {
      expect(html).not.toMatch(/\b(owns|owned|owners?|ownership)\b/i);
      expect(html).not.toMatch(/track and trace|PVP-ready|accepted by/i);
    }
  });

  it('long other notes are cut short, pointing at the bundle', async () => {
    const r = await rec(60, { notes: `Stage: F1\n${'x'.repeat(NOTES_SHOWN + 50)}` });
    const page = breedingHistoryHtml({ history: walkHistory(r, () => undefined), facts: new Map(), madeAt: NOW });
    expect(page).toContain('cut short here; the whole notes are in this record’s evidence bundle');
    expect(page).not.toContain('x'.repeat(NOTES_SHOWN + 1));
  });
});

describe('breedingHistoryFiles: the zip', () => {
  const ANCHOR = {
    chain: 'midnight',
    network: 'preprod',
    contractAddress: '7a'.repeat(32),
    txHash: 'c3'.repeat(32),
    blockHeight: 77,
    anchoredAt: '2026-10-15T11:00:00.000Z',
  };

  /** The registry: g1 and g2 in an anchored batch, g3 not in one yet. */
  const registry = async (records: StrainRecord[], dated: StrainRecord[]) => {
    const batch = await practiceBatch(dated);
    const asked: string[] = [];
    const gather = async (r: StrainRecord): Promise<Gathered> => {
      asked.push(r.id);
      const p = batch.proofs[r.recordFingerprint];
      return reconcile(r.recordFingerprint, {
        source: 'evidence-route',
        registryFirstSeen: '2026-10-15T10:00:00Z',
        proof: p ? { ...p, anchor: ANCHOR } : null,
        batch: p
          ? { batchId: batch.batchId, root: batch.root, anchor: ANCHOR, opentimestamps: { available: false } }
          : null,
        attestations: [],
      });
    };
    void records;
    return { gather, asked };
  };

  it('three generations: both pages, and every record’s evidence bundle under evidence/', async () => {
    const { g1, g2, g3, all } = await threeGens();
    const reg = await registry(all, [g1, g2]);
    let deliveriesAsked = 0;
    const out = await breedingHistoryFiles(g3, {
      lookup: lookupIn(all),
      gather: reg.gather,
      deliveries: () => {
        deliveriesAsked++;
        return Promise.resolve([]);
      },
      now: NOW,
    });
    const top = historyFolder(g3.id);
    const paths = Object.keys(out.files);
    expect(paths).toContain(`${top}/breeding-history.html`);
    expect(paths).toContain(`${top}/COVER-NOTE.html`);
    for (const r of [g1, g2, g3]) {
      for (const f of [
        'verify.html',
        'README.txt',
        'EXAMINER-SUMMARY.html',
        'DECLARATION-TEMPLATE.txt',
        'evidence.json',
      ])
        expect(paths).toContain(`${top}/evidence/${r.id}-evidence/${f}`);
    }
    expect(paths.filter((p) => !p.startsWith(`${top}/`))).toEqual([]);
    // One look-up per record, one deliveries look-up for all.
    expect(reg.asked).toEqual([g1.id, g2.id, g3.id]);
    expect(deliveriesAsked).toBe(1);
    // No key and no lab report in any bundle.
    expect(paths.some((p) => /\/key\/|\/lab\/report\//.test(p))).toBe(false);

    const page = strFromU8(out.files[`${top}/breeding-history.html`]);
    expect(page).toMatch(new RegExp(`<tr data-record="${g1.id}" data-dated="yes"`));
    expect(page).toMatch(new RegExp(`<tr data-record="${g3.id}" data-dated="no"`));
    expect(page).toContain('2026-10-15 11:00 UTC, on Midnight preprod (a test network)');
    expect(page).toContain('1 of the 3 records is not dated on any network yet.');
    // The bundle's own facts agree with the row.
    const ev = JSON.parse(strFromU8(out.files[`${top}/evidence/${g1.id}-evidence/evidence.json`])) as {
      record: { id: string };
      batch: { anchor: { txHash: string } };
    };
    expect(ev.record.id).toBe(g1.id);
    expect(ev.batch.anchor.txHash).toBe(ANCHOR.txHash);
  });

  it('a registry that can’t be reached: nothing is made, the holder is told why', async () => {
    const { g3, all } = await threeGens();
    await expect(
      breedingHistoryFiles(g3, {
        lookup: lookupIn(all),
        gather: () => Promise.resolve({ error: 'Couldn’t reach VeilCore. Check your connection and try again.' }),
        deliveries: () => Promise.resolve([]),
        now: NOW,
      }),
    ).rejects.toThrow(HistoryRefusal);
  });

  it('a record no bundle can be made for keeps its row and says why; an unsealed one is not asked about', async () => {
    const { g1, g2, all } = await threeGens();
    const tampered: StrainRecord = { ...g1, strainName: 'Changed after sealing' };
    const unsealed: StrainRecord = { ...(await rec(70)), recordFingerprint: '', parents: [] };
    const child = await rec(71, {
      parents: [
        { recordId: g2.id, name: 'Gen 2' },
        { recordId: unsealed.id, name: 'Unsealed' },
      ],
    });
    const records = [child, g2, tampered, unsealed, ...all.filter((r) => r.id !== g1.id)];
    const reg = await registry(records, [g2, child]);
    const out = await breedingHistoryFiles(child, {
      lookup: lookupIn(records),
      gather: reg.gather,
      deliveries: () => Promise.resolve([]),
      now: NOW,
    });
    expect(reg.asked).not.toContain(unsealed.id);
    const top = historyFolder(child.id);
    expect(Object.keys(out.files).some((p) => p.includes(`${tampered.id}-evidence`))).toBe(false);
    const page = strFromU8(out.files[`${top}/breeding-history.html`]);
    expect(page).toContain('No evidence bundle: This record’s fingerprint doesn’t match its details');
    expect(page).not.toContain('Nothing was downloaded');
    expect(page).toContain('Not sealed, so nothing dates it.');
    expect(out.facts.get(unsealed.id)?.stamp.kind).toBe('unsealed');
  });
});
