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
import { DRAFT_KEY, loadDraft, nextStageDraft, saveDraft, sealInputOf } from '../flow/log-flow-state';
import { recordDateRow } from '../flow/plant-status-words';
import {
  LAB_REPORT_METHOD,
  dateLabReportWith,
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
  ancestryVerdictText,
  offspringOf,
  ownAncestorsOf,
  ownOffspringNote,
  upstreamOwnRoyaltyNote,
} from './self-chain';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const source = (rel: string) => fs.readFileSync(path.join(HERE, '..', rel), 'utf8');

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

  it('links this plant as the parent (as the parents box does) and carries name, breeder and species', () => {
    const d = nextStageDraft(parent);
    expect(d.parents).toEqual([{ recordId: parent.id, name: 'Harbour Mist F2' }]);
    expect(d.strainName).toBe('Harbour Mist F2');
    expect(d.bredBy).toBe('Test Breeder');
    expect(d.taxon).toBe('Cannabis sativa');
    expect(d.stageOf).toBe(parent.id);
    expect(d.stage).toBe('');
    expect(d.selectedFor).toBe('');
    expect(d.notes).toBe('');
    expect(d.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nextStagePath(parent.id)).toBe(`/new?next=${parent.id}`);
  });

  it('is kept as typed, the stage answers included, and comes back after a reload', () => {
    const d = { ...nextStageDraft(parent), strainName: 'Harbour Mist F3', stage: 'F3', selectedFor: 'vigour' };
    saveDraft(d);
    expect(local.has(DRAFT_KEY)).toBe(true);
    expect(loadDraft()).toEqual(d);
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

  const harness = () => {
    const held: StrainRecord[] = [plant];
    const seal = vi.fn(async (input: Parameters<DateLabReportDeps['seal']>[0]) => {
      await new Promise((r) => setTimeout(r, 5));
      return {
        ...input,
        id: `VEIL-D${String(++n)}`,
        nonce: '11'.repeat(32),
        keyBinding: '22'.repeat(32),
        loggedAt: n,
        recordFingerprint: '33'.repeat(32),
      };
    });
    const deps: DateLabReportDeps = {
      all: () => held,
      seal,
      create: (s) => {
        const r = { ...s, id: s.id } as StrainRecord;
        held.unshift(r);
        return r;
      },
      forget: vi.fn(),
      today: () => '2026-10-15',
    };
    return { held, seal, deps };
  };

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

  it('a record sealed but refused on saving forgets its key and can be tried again', async () => {
    const h = harness();
    const create = h.deps.create;
    h.deps.create = () => {
      throw new Error('refused');
    };
    await expect(dateLabReportWith(h.deps, plant, facts)).rejects.toThrow('refused');
    expect(h.deps.forget).toHaveBeenCalledTimes(1);
    h.deps.create = create;
    await dateLabReportWith(h.deps, plant, facts);
    expect(h.seal).toHaveBeenCalledTimes(2);
  });

  it('the plant page’s line, in the record date row’s own words', () => {
    expect(labReportDatedLine('VEIL-D1', recordDateRow({ status: 'none' }, undefined))).toBe(
      'Lab report dated: in VEIL-D1 (waiting for a batch)',
    );
    expect(labReportDatedLine('VEIL-D1', recordDateRow({ status: 'pending' } as never, undefined))).toBe(
      'Lab report dated: in VEIL-D1 (in a batch, waiting for its date stamp)',
    );
    expect(labReportDatedLine('VEIL-D1', { mark: 'done', value: '2026-10-11 UTC — checked on Midnight' })).toBe(
      'Lab report dated: in VEIL-D1 (dated 2026-10-11 UTC — checked on Midnight)',
    );
    expect(labReportDatedLine('VEIL-D1', { mark: 'wait', value: 'checking…' })).toBe(
      'Lab report dated: in VEIL-D1 (checking…)',
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
  const royaltyOnF1 = (id: string) => (id === f1.id ? [{ id: 'LIC-1' }] : []);

  it('offspring leave out the records that date a lab report', () => {
    expect(offspringOf(f1.id, all).map((r) => r.strainName)).toEqual(['HM F2', 'From a friend']);
  });

  it('an offspring royalty on F1 names the next generations the breeder sealed and says it is in their favour', () => {
    expect(ownOffspringNote(f1, all)).toBe(
      'Next generations you sealed from it yourself (HM F2): the royalty in your agreement is in your favour, owed by the other party on what they breed, not by you.',
    );
    expect(ownOffspringNote(f3, all)).toBeUndefined();
    expect(ownOffspringNote(received, all)).toBeUndefined();
  });

  it('a later stage says the royalty upstream is in the breeder’s favour, not owed by them', () => {
    expect(ownAncestorsOf(f3, all).map((r) => r.strainName)).toEqual(['HM F2', 'HM F1']);
    expect(upstreamOwnRoyaltyNote(f3, all, royaltyOnF1)).toBe(
      'HM F1 upstream is a record you sealed yourself, with an offspring royalty in your favour. It isn’t owed by you on this plant.',
    );
    expect(upstreamOwnRoyaltyNote(f2, all, () => [])).toBeUndefined();
    // Material that came from someone else: their line, not a self-chain.
    expect(upstreamOwnRoyaltyNote(received, all, royaltyOnF1)).toBeUndefined();
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
      'The registry reports no unpaid obligation on this record. It has no confirmed link to its parents, so nothing upstream was checked.',
    );
    expect(ancestryVerdictText({ ok: true, generationsChecked: 2 }, 1)).toBe(
      'No unpaid obligations found in its declared ancestry (2 generations checked, as the registry reports).',
    );
    expect(ancestryVerdictText({ ok: false, reason: 'an ancestor carries an unmet obligation' }, 1)).toBe(
      'an ancestor carries an unmet obligation',
    );
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
