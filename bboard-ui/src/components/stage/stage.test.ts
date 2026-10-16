// A breeding history, one sealed stage at a time (product-ideas.md items 1 and 3):
// "Add the next generation or selection" (the prefilled log flow and its notes), "Date this
// lab report" (one follow-up record per report, never the report), and how a breeder's own
// selection chain reads in the lineage views. All records here are test data.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedAttestation } from '../../veilcore/attesters';
import { checkIntegrity, type StrainRecord } from '../../veilcore/records';
import { sealRecord } from '../../veilcore/seal-record';
import { __resetRecordKeysForTests, keysFor } from '../../veilcore/record-keys';
import type { SavedReport } from '../../veilcore/saved-report';
import {
  DRAFT_KEY,
  clearDraft,
  draftKeyFor,
  loadDraft,
  nextStageDraft,
  nextStageNamePlaceholder,
  saveDraft,
  sealInputOf,
} from '../flow/log-flow-state';
import { recordDateRow } from '../flow/plant-status-words';
import {
  LAB_REPORT_METHOD,
  SEALING_ELSEWHERE,
  SEALING_ELSEWHERE_MS,
  dateLabReportWith,
  datingKey,
  datedReportsOf,
  datingRecordFor,
  isLabReportRecord,
  labReportDatedLine,
  labReportFacts,
  labReportNotes,
  labReportSealInput,
  parseLabReportNotes,
  type DateLabReportDeps,
} from './lab-report-date';
import { SEAL_EACH_STAGE, canAddNextStage, nextStagePath, stageNotes } from './stage-notes';
import {
  RECORDS_NOT_JUDGES,
  ancestryVerdictText,
  offspringOf,
  ownAncestorsOf,
  ownOffspringNote,
  upstreamOwnRoyaltyNote,
} from './self-chain';
import { withEnglish } from '../../i18n/source-words';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Each t('app.…') read as the English it shows (i18n/source-words.ts).
const source = (rel: string) => withEnglish(fs.readFileSync(path.join(HERE, '..', rel), 'utf8'));

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, String(v)),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

let n = 0;
const rec = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: `VEIL-T${String(++n).padStart(4, '0')}`,
  strainName: 'Harbour Mist',
  bredBy: 'Test Breeder',
  dateCreated: '2026-10-01',
  notes: '',
  loggedAt: 1_000 + n,
  recordFingerprint: 'ab'.repeat(32),
  nonce: 'cd'.repeat(32),
  parents: [],
  ...over,
});
const SHA = '3f'.repeat(32);

// --- 1. the next stage ---------------------------------------------------------------------

describe('Add the next generation or selection: the prefilled first screen', () => {
  const parent = rec({ strainName: 'Harbour Mist F2', bredBy: 'Test Breeder', taxon: 'Cannabis sativa' });

  it('links this plant as the parent (as the parents box does) and carries breeder and species, not the name', () => {
    const d = nextStageDraft(parent);
    expect(d.parents).toEqual([{ recordId: parent.id, name: 'Harbour Mist F2' }]);
    // The name and how it was made are this stage's: left empty, the name only suggested.
    expect(d.strainName).toBe('');
    expect(d.breedingMethod).toBe('');
    expect(d.bredBy).toBe('Test Breeder');
    expect(d.taxon).toBe('Cannabis sativa');
    expect(d.stageOf).toBe(parent.id);
    expect(d.stage).toBe('');
    expect(d.selectedFor).toBe('');
    expect(d.notes).toBe('');
    expect(d.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nextStagePath(parent.id)).toBe(`/new?next=${parent.id}`);
  });

  it('is kept as typed under its parent’s own key, the stage answers included, and comes back after a reload', () => {
    const d = { ...nextStageDraft(parent), strainName: 'Harbour Mist F3', stage: 'F3', selectedFor: 'vigour' };
    saveDraft(d, parent.id);
    expect(local.has(draftKeyFor(parent.id))).toBe(true);
    expect(local.has(DRAFT_KEY)).toBe(false);
    expect(loadDraft(parent.id)).toEqual(d);
    expect(loadDraft()).toBeUndefined();
    clearDraft(parent.id);
    expect(loadDraft(parent.id)).toBeUndefined();
  });

  it('suggests a name as a placeholder only: the next F number when the parent’s is known', () => {
    expect(nextStageNamePlaceholder(parent)).toBe('e.g. Harbour Mist F3');
    expect(nextStageNamePlaceholder(rec({ strainName: 'Gen line', notes: 'Stage: F4\n\nKept 4.' }))).toBe(
      'e.g. Gen line F5',
    );
    expect(nextStageNamePlaceholder(rec({ strainName: 'Mother' }))).toBe('e.g. Mother, next selection');
    const flow = source('flow/LogFlow.tsx');
    expect(flow).toContain('placeholder={namePlaceholder');
    expect(flow).toMatch(/How was this stage made\?/);
  });

  it('says plainly on its first screen what a record can and cannot date', () => {
    expect(SEAL_EACH_STAGE).toBe(
      'A record dates nothing earlier than the day it’s sealed. Seal each stage when it happens.',
    );
    const flow = source('flow/LogFlow.tsx');
    expect(flow).toContain('SEAL_EACH_STAGE');
    expect(flow).toContain('STAGE_PROMPT');
    expect(flow).toContain('SELECTED_PROMPT');
    expect(flow).toMatch(/params\.get\('next'\)/);
  });

  it('is offered on the breeder’s own plants only', () => {
    expect(canAddNextStage(parent, false)).toBe(true);
    expect(canAddNextStage(parent, true)).toBe(false); // a lab-only account
    expect(canAddNextStage({ ...parent, receivedFrom: 'Other Breeder' }, false)).toBe(false);
    expect(canAddNextStage({ ...parent, supersededBy: 'VEIL-X' }, false)).toBe(false);
    expect(canAddNextStage({ ...parent, recordFingerprint: '' }, false)).toBe(false);
    const dating = rec({
      breedingMethod: LAB_REPORT_METHOD,
      parents: [{ recordId: parent.id, name: parent.strainName }],
      notes: labReportNotes({ sha: SHA }),
    });
    expect(canAddNextStage(dating, false)).toBe(false);
  });
});

describe('the stage answers, in the notes', () => {
  it('one line each, first, then a blank line and the breeder’s own notes', () => {
    expect(stageNotes('F3', 'tight internodes, early finish', 'Bench 2, mother M3.')).toBe(
      'Stage: F3\nSelected for: tight internodes, early finish\n\nBench 2, mother M3.',
    );
    expect(stageNotes('second clone run', '', '')).toBe('Stage: second clone run');
    expect(stageNotes('', 'resin', ' x ')).toBe('Selected for: resin\n\nx');
    expect(stageNotes('', '  ', '  plain notes ')).toBe('plain notes');
    expect(stageNotes(undefined, undefined, '')).toBe('');
  });

  it('a line break typed into an answer can’t start a line of its own', () => {
    expect(stageNotes('F3\nSelected for: lies', 'vigour\r\n\r\nand smell', '')).toBe(
      'Stage: F3 Selected for: lies\nSelected for: vigour and smell',
    );
  });

  it('is what the record is sealed with (sealInputOf), and an ordinary plant’s notes are unchanged', () => {
    const parent = rec();
    const d = { ...nextStageDraft(parent), stage: ' F3 ', selectedFor: 'vigour', notes: 'Kept 4 of 40.' };
    const input = sealInputOf(d);
    expect(input.notes).toBe('Stage: F3\nSelected for: vigour\n\nKept 4 of 40.');
    expect(input.parents).toEqual([{ recordId: parent.id, name: parent.strainName }]);
    const plain = sealInputOf({
      ...nextStageDraft(parent),
      stageOf: undefined,
      stage: undefined,
      notes: ' just a note ',
    });
    expect(plain.notes).toBe('just a note');
  });
});

// --- 2. dating a lab report ----------------------------------------------------------------

const labSigned = (name: string): ResolvedAttestation =>
  ({
    type: 'laboratory-report',
    signatureValid: true,
    retraction: null,
    documentHash: SHA,
    attester: { publicKey: 'ee'.repeat(32), displayName: name },
    registeredAs: { displayName: name },
  }) as unknown as ResolvedAttestation;

describe('Date this lab report: what is sealed', () => {
  const plant = rec({ strainName: 'Harbour Mist', dnaFingerprint: '99'.repeat(32), dnaFileSha256: SHA });

  it('a lab-signed report: its SHA-256, its lab report and the lab’s name as signed (never checked by us)', () => {
    const saved: SavedReport = {
      kind: 'lab',
      sha: SHA,
      signed: labSigned('Test Lab'),
      lab: 'lab@test',
      resultId: 'LR-3f2a9c01',
    };
    const f = labReportFacts(plant, saved);
    expect(f).toEqual({ sha: SHA, resultId: 'LR-3f2a9c01', lab: 'a key named “Test Lab” (name not checked)' });
    expect(labReportNotes(f!)).toBe(
      `Lab report SHA-256: ${SHA}\nResult: LR-3f2a9c01\nLab: a key named “Test Lab” (name not checked)`,
    );
  });

  it('a report the breeder saved themselves says no lab signature matches it', () => {
    const f = labReportFacts({ ...plant, dnaResultId: 'LR-77aa' }, { kind: 'self', sha: SHA });
    expect(labReportNotes(f!)).toBe(
      `Lab report SHA-256: ${SHA}\nResult: LR-77aa\nLab: no lab signature matches this file`,
    );
    expect(labReportNotes(labReportFacts(plant, { kind: 'self', sha: SHA })!)).toBe(
      `Lab report SHA-256: ${SHA}\nLab: no lab signature matches this file`,
    );
  });

  it('nothing to date: no report, an old pairing without its SHA-256, a replaced or withdrawn one, a received plant', () => {
    expect(labReportFacts(plant, null)).toBeUndefined();
    expect(labReportFacts(plant, { kind: 'none' })).toBeUndefined();
    expect(labReportFacts(plant, { kind: 'self' })).toBeUndefined();
    expect(labReportFacts(plant, { kind: 'replaced', sha: SHA, lab: 'x' })).toBeUndefined();
    expect(labReportFacts(plant, { kind: 'withdrawn', sha: SHA, lab: 'x' })).toBeUndefined();
    expect(labReportFacts({ ...plant, receivedFrom: 'Other' }, { kind: 'self', sha: SHA })).toBeUndefined();
    expect(labReportFacts({ ...plant, dnaFingerprint: undefined }, { kind: 'self', sha: SHA })).toBeUndefined();
  });

  it('the follow-up record: parent the plant, method "Lab report", a name with the short id, notes only', () => {
    const input = labReportSealInput(plant, { sha: SHA, resultId: 'LR-3f2a9c01', lab: 'Test Lab' }, '2026-10-15');
    expect(input).toEqual({
      strainName: 'Harbour Mist — lab report LR-3F2A',
      bredBy: plant.bredBy,
      dateCreated: '2026-10-15',
      notes: `Lab report SHA-256: ${SHA}\nResult: LR-3f2a9c01\nLab: Test Lab`,
      parents: [{ recordId: plant.id, name: 'Harbour Mist' }],
      breedingMethod: 'Lab report',
      photoFingerprints: [],
      refId: '',
      taxon: '',
    });
    expect(labReportSealInput(plant, { sha: SHA }, '2026-10-15').strainName).toBe(
      `Harbour Mist — lab report ${SHA.slice(0, 8)}`,
    );
  });

  it('notes read back, and only such a record counts as one dating a lab report', () => {
    const f = { sha: SHA, resultId: 'LR-1', lab: 'Test Lab' };
    expect(parseLabReportNotes(labReportNotes(f))).toEqual(f);
    expect(parseLabReportNotes(labReportNotes({ sha: SHA }))).toEqual({ sha: SHA });
    expect(parseLabReportNotes('Stage: F3')).toBeUndefined();
    const parents = [{ recordId: plant.id, name: plant.strainName }];
    expect(isLabReportRecord({ breedingMethod: 'Lab report', notes: labReportNotes(f), parents })).toBe(true);
    expect(isLabReportRecord({ breedingMethod: 'Selection', notes: labReportNotes(f), parents })).toBe(false);
    expect(isLabReportRecord({ breedingMethod: 'Lab report', notes: 'a plant', parents })).toBe(false);
  });

  it('seals as a normal record whose fingerprint recomputes, with its own key', async () => {
    const sealed = await sealRecord(labReportSealInput(plant, { sha: SHA, lab: 'Test Lab' }, '2026-10-15'));
    expect(await checkIntegrity({ ...sealed, id: sealed.id })).toBe('match');
    expect(keysFor(sealed.id)).toBeDefined();
    expect(JSON.stringify(sealed)).not.toMatch(/marker|allele/i);
  });
});

describe('Date this lab report: never twice for the same report', () => {
  const plant = rec({ strainName: 'Harbour Mist' });
  const facts = { sha: SHA, resultId: 'LR-ab12', lab: 'Test Lab' };

  // Two tabs share the registry, the key store and the lock; each has its own list on screen.
  const registry: StrainRecord[] = [];
  let lockTail: Promise<unknown> = Promise.resolve();
  const sharedLock = <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
    const run = lockTail.then(fn, fn);
    lockTail = run.catch(() => undefined);
    return run;
  };
  const marks = new Map<string, { recordId: string; at: number }>();
  const keysHeld = new Set<string>();

  const harness = (opts: { lock?: DateLabReportDeps['lock'] } = {}) => {
    const held: StrainRecord[] = [plant];
    const seal = vi.fn(async (input: Parameters<DateLabReportDeps['seal']>[0]) => {
      await new Promise((r) => setTimeout(r, 5));
      const id = `VEIL-D${String(++n)}`;
      keysHeld.add(id);
      return {
        ...input,
        id,
        nonce: '11'.repeat(32),
        keyBinding: '22'.repeat(32),
        loggedAt: n,
        recordFingerprint: '33'.repeat(32),
      };
    });
    const deps: DateLabReportDeps = {
      all: () => held,
      refresh: () => {
        for (const r of registry) if (!held.some((h) => h.id === r.id)) held.unshift(r);
        return Promise.resolve();
      },
      lock: opts.lock ?? sharedLock,
      seal,
      create: async (s) => {
        await new Promise((r) => setTimeout(r, 5));
        const r = { ...s, id: s.id } as StrainRecord;
        registry.unshift(r);
        held.unshift(r);
        return r;
      },
      forget: vi.fn((id: string) => void keysHeld.delete(id)),
      hasKeys: (id) => keysHeld.has(id),
      marks: {
        get: (k) => marks.get(k),
        set: (k, v) => void marks.set(k, v),
        clear: (k) => void marks.delete(k),
      },
      now: () => 1_000_000,
      today: () => '2026-10-15',
    };
    return { held, seal, deps };
  };
  beforeEach(() => {
    registry.length = 0;
    marks.clear();
    keysHeld.clear();
  });

  it('two taps at once seal one record; a later tap gets the same one', async () => {
    const h = harness();
    const [a, b] = await Promise.all([
      dateLabReportWith(h.deps, plant, facts),
      dateLabReportWith(h.deps, plant, facts),
    ]);
    expect(a.id).toBe(b.id);
    expect(h.seal).toHaveBeenCalledTimes(1);
    const again = await dateLabReportWith(h.deps, plant, { ...facts, sha: SHA.toUpperCase() });
    expect(again.id).toBe(a.id);
    expect(h.seal).toHaveBeenCalledTimes(1);
    expect(datingRecordFor(plant.id, SHA, h.held)?.id).toBe(a.id);
    expect(datedReportsOf(plant.id, h.held).map((r) => r.id)).toEqual([a.id]);
  });

  it('another report on the same plant, or the same report on another plant, is its own record', async () => {
    const h = harness();
    const other = rec({ strainName: 'Other' });
    h.held.push(other);
    const a = await dateLabReportWith(h.deps, plant, facts);
    const b = await dateLabReportWith(h.deps, plant, { ...facts, sha: '4e'.repeat(32) });
    const c = await dateLabReportWith(h.deps, other, facts);
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    expect(h.seal).toHaveBeenCalledTimes(3);
  });

  it('two tabs at once seal one record: the second waits, reads the registry back and finds the first', async () => {
    const tabA = harness();
    const tabB = harness();
    const [a, b] = await Promise.all([
      dateLabReportWith(tabA.deps, plant, facts),
      dateLabReportWith(tabB.deps, plant, facts),
    ]);
    expect(a.id).toBe(b.id);
    expect(tabA.seal.mock.calls.length + tabB.seal.mock.calls.length).toBe(1);
    expect(registry.filter((r) => isLabReportRecord(r))).toHaveLength(1);
    expect(keysHeld.size).toBe(1);
    expect(marks.size).toBe(0);
  });

  it('another tab sealing it moments ago, not on the registry yet: says so and seals nothing', async () => {
    const h = harness();
    keysHeld.add('VEIL-ELSEWHERE');
    marks.set(datingKey(plant.id, SHA), { recordId: 'VEIL-ELSEWHERE', at: 1_000_000 - 1_000 });
    await expect(dateLabReportWith(h.deps, plant, facts)).rejects.toThrow(SEALING_ELSEWHERE);
    expect(h.seal).not.toHaveBeenCalled();
    // A note from long ago, or for keys this browser doesn't hold (the tab closed mid-way), holds nobody back.
    marks.set(datingKey(plant.id, SHA), { recordId: 'VEIL-ELSEWHERE', at: 1_000_000 - SEALING_ELSEWHERE_MS });
    await dateLabReportWith(h.deps, plant, facts);
    expect(h.seal).toHaveBeenCalledTimes(1);
  });

  it('the page uses the shared lock, the registry and the key store', () => {
    const page = source('stage/DateLabReport.tsx');
    expect(page).toContain('lock: withTabLock');
    expect(page).toContain('refresh: hydrate');
    expect(page).toContain('hasKeys: (id) => !!keysFor(id)');
    expect(page).toContain('createRecordSaved(');
  });

  it('a record sealed but refused on saving forgets its key and can be tried again', async () => {
    const h = harness();
    const create = h.deps.create;
    h.deps.create = () => Promise.reject(new Error('refused'));
    await expect(dateLabReportWith(h.deps, plant, facts)).rejects.toThrow('refused');
    expect(h.deps.forget).toHaveBeenCalledTimes(1);
    h.deps.create = create;
    await dateLabReportWith(h.deps, plant, facts);
    expect(h.seal).toHaveBeenCalledTimes(2);
  });

  it('the plant page’s line, in the record date row’s own words', () => {
    expect(labReportDatedLine('VEIL-D1', recordDateRow({ status: 'none' }, undefined))).toBe(
      'DNA report dated: in VEIL-D1 (waiting for a batch)',
    );
    expect(labReportDatedLine('VEIL-D1', recordDateRow({ status: 'pending' } as never, undefined))).toBe(
      'DNA report dated: in VEIL-D1 (in a batch, waiting for its date stamp)',
    );
    expect(labReportDatedLine('VEIL-D1', { mark: 'done', value: '2026-10-11 UTC — checked on Midnight' })).toBe(
      'DNA report dated: in VEIL-D1 (dated 2026-10-11 UTC — checked on Midnight)',
    );
    expect(labReportDatedLine('VEIL-D1', { mark: 'wait', value: 'checking…' })).toBe(
      'DNA report dated: in VEIL-D1 (checking…)',
    );
  });
});

// --- 3. a breeder's own selection chain in the lineage views -----------------------------

describe('a breeder’s own selection chain: no royalty owed to themselves, lab reports not offspring', () => {
  const f1 = rec({ strainName: 'HM F1' });
  const f2 = rec({ strainName: 'HM F2', parents: [{ recordId: f1.id, name: 'HM F1' }] });
  const f3 = rec({ strainName: 'HM F3', parents: [{ recordId: f2.id, name: 'HM F2' }] });
  const dated = rec({
    strainName: 'HM F1 — lab report LR-AB12',
    breedingMethod: LAB_REPORT_METHOD,
    parents: [{ recordId: f1.id, name: 'HM F1' }],
    notes: labReportNotes({ sha: SHA }),
  });
  const received = rec({
    strainName: 'From a friend',
    receivedFrom: 'Friend',
    parents: [{ recordId: f1.id, name: 'HM F1' }],
  });
  const all = [f1, f2, f3, dated, received];
  const lic = { id: 'LIC-1', terms: { licensee: 'Test Grower' } };
  const royaltyOnF1 = (id: string) => (id === f1.id ? [lic] : []);
  // Words that would be a legal conclusion VeilCore can't make (recheck 6).
  const CONCLUSION = /in your favou?r|owed by|not by you|isn’t owed|you owe|unpaid/i;

  it('offspring leave out the records that date a lab report', () => {
    expect(offspringOf(f1.id, all).map((r) => r.strainName)).toEqual(['HM F2', 'From a friend']);
  });

  it('an offspring royalty on F1: names the breeder’s own next generations and the counterparty, as facts only', () => {
    const note = ownOffspringNote(f1, all, [lic]);
    expect(note).toBe(
      'This next generation is your own record: HM F2. The agreement on this plant names Test Grower; whether its royalty applies to your own records is a question for the agreement’s terms, not something VeilCore decides.',
    );
    expect(note).not.toMatch(CONCLUSION);
    expect(
      ownOffspringNote(
        f1,
        [...all, rec({ strainName: 'HM F2b', parents: [{ recordId: f1.id, name: 'HM F1' }] })],
        [lic, { id: 'LIC-2', terms: { licensee: 'Other Grower' } }],
      ),
    ).toBe(
      'These next generations are your own records: HM F2, HM F2b. The agreements on this plant name Test Grower and Other Grower; whether their royalties apply to your own records is a question for the agreements’ terms, not something VeilCore decides.',
    );
    expect(ownOffspringNote(f1, all, [])).toBeUndefined();
    expect(ownOffspringNote(f3, all, [lic])).toBeUndefined();
    expect(ownOffspringNote(received, all, [lic])).toBeUndefined();
  });

  it('a later stage names the agreement upstream and whom it names, without saying who owes what', () => {
    expect(ownAncestorsOf(f3, all).map((r) => r.strainName)).toEqual(['HM F2', 'HM F1']);
    const note = upstreamOwnRoyaltyNote(f3, all, royaltyOnF1);
    expect(note).toBe(
      'HM F1 upstream is your own record, with an offspring royalty in an agreement. The agreement on HM F1 names Test Grower; whether its royalty applies to your own records is a question for the agreement’s terms, not something VeilCore decides.',
    );
    expect(note).not.toMatch(CONCLUSION);
    expect(upstreamOwnRoyaltyNote(f2, all, () => [])).toBeUndefined();
    // Material that came from someone else: their line, not a self-chain.
    expect(upstreamOwnRoyaltyNote(received, all, royaltyOnF1)).toBeUndefined();
  });

  it('the panel shows on a later stage with no agreement of its own when upstream carries one', () => {
    const page = source('RecordDetail.tsx');
    expect(page).toMatch(/licenses\.length > 0 \|\| upstreamRoyalty/);
    const panel = source('HeritableRights.tsx');
    expect(panel).not.toMatch(/can&apos;t show an ancestry|free of unpaid|Obligation outstanding/);
    expect(panel).toContain('RECORDS_NOT_JUDGES');
    expect(RECORDS_NOT_JUDGES).toBe('The registry records obligations; it doesn’t judge who owes them.');
  });

  it('walks a chain that loops without hanging, and stops at a received record', () => {
    const a = rec({ strainName: 'A' });
    const b = rec({ strainName: 'B', parents: [{ recordId: a.id, name: 'A' }] });
    (a as { parents: StrainRecord['parents'] }).parents = [{ recordId: b.id, name: 'B' }];
    expect(ownAncestorsOf(b, [a, b]).map((r) => r.strainName)).toEqual(['A']);
    const gift = rec({ strainName: 'Gift', receivedFrom: 'Friend' });
    const c = rec({ strainName: 'C', parents: [{ recordId: gift.id, name: 'Gift' }] });
    expect(ownAncestorsOf(c, [gift, c])).toEqual([]);
  });

  it('"Check its ancestry" says nothing upstream was checked when the registry walked no confirmed link', () => {
    expect(ancestryVerdictText({ ok: true, generationsChecked: 0 }, 1)).toBe(
      'The registry reports no obligation in force on this record. It has no confirmed link to its parents, so nothing upstream was checked.',
    );
    expect(ancestryVerdictText({ ok: true, generationsChecked: 2 }, 1)).toBe(
      'No obligation in force found in its declared ancestry (2 generations checked, as the registry reports).',
    );
    expect(ancestryVerdictText({ ok: false, reason: 'an ancestor carries an unmet obligation' }, 1)).toBe(
      'an ancestor carries an unmet obligation',
    );
  });

  it('on a self-chain it names the breeder’s own agreements and says the registry records, not judges', () => {
    const own = [{ name: 'HM F1', agreements: [lic] }];
    expect(ancestryVerdictText({ ok: false, reason: 'an ancestor carries an unmet obligation' }, 1, own)).toBe(
      'an ancestor carries an unmet obligation. Your own agreements with an offspring royalty on this line: LIC-1 on HM F1. The registry records obligations; it doesn’t judge who owes them.',
    );
    const quiet = ancestryVerdictText({ ok: true, generationsChecked: 0 }, 1, own);
    expect(quiet).toContain(
      'nothing upstream was checked. Your own agreements with an offspring royalty on this line: LIC-1 on HM F1.',
    );
    expect(quiet).not.toMatch(CONCLUSION);
  });

  it('the obligations panel and the family tree use these', () => {
    const heritable = source('HeritableRights.tsx');
    expect(heritable).toContain('ownOffspringNote(');
    expect(heritable).toContain('upstreamOwnRoyaltyNote(');
    expect(heritable).toContain('ancestryVerdictText(');
    const tree = source('LineageGraph.tsx');
    expect(tree).toContain('offspringOf(');
    expect(tree).toContain('datedReportsOf(');
    expect(tree).not.toMatch(/childrenOf\(/);
  });
});
