// Records that date a lab report are not plants (recheck 6), and starting a next stage
// never replaces a plant half-logged. All records here are test data.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrainRecord } from '../../veilcore/records';
import {
  DRAFT_KEY,
  draftKeyFor,
  emptyDraft,
  loadDraft,
  nextStageDraft,
  nextStageStart,
  saveDraft,
  unsavedPlantLine,
} from '../flow/log-flow-state';
import { LAB_REPORT_METHOD, labReportNotes } from './lab-report-notes';
import { labReportFacts } from './lab-report-date';
import { canAddNextStage } from './stage-notes';
import {
  backupHoldsLine,
  countKinds,
  datingCardLine,
  datingHomeStatus,
  homeList,
  keysOnlyHereSubject,
  labReportPageLines,
  parentOptionsOf,
  restoredKeysLine,
} from './record-kinds';
import { withEnglish } from '../../i18n/source-words';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Each t('app.…') read as the English it shows (i18n/source-words.ts).
const source = (rel: string) => withEnglish(fs.readFileSync(path.join(HERE, '..', rel), 'utf8'));
/** EvidenceBundle.tsx's button label, read from its source (the component needs a browser). */
const DOWNLOAD_EVIDENCE_LABEL =
  /DOWNLOAD_EVIDENCE_LABEL = '([^']+)'/.exec(source('EvidenceBundle.tsx'))?.[1] ?? '(none)';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, String(v)),
    removeItem: (k: string) => void local.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

let n = 0;
const rec = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: `VEIL-K${String(++n).padStart(4, '0')}`,
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
const plant = rec({ strainName: 'F2 line (practice)' });
const other = rec({ strainName: 'P1 mother (practice)' });
const dating = rec({
  strainName: 'F2 line (practice) — lab report LR-AB12',
  breedingMethod: LAB_REPORT_METHOD,
  parents: [{ recordId: plant.id, name: plant.strainName }],
  notes: labReportNotes({ sha: SHA, resultId: 'LR-ab12', lab: 'Test Lab' }),
});
const orphan = rec({
  strainName: 'Gone — lab report',
  breedingMethod: LAB_REPORT_METHOD,
  parents: [{ recordId: 'VEIL-NOT-HERE', name: 'Gone' }],
  notes: labReportNotes({ sha: SHA }),
});
const all = [dating, plant, other, orphan];

describe('Home: a dated lab report shows under its plant, not as a plant', () => {
  it('plants are cards; the dating record sits under its plant; one whose plant isn’t here keeps a card', () => {
    const { cards, datingsOf } = homeList(all);
    expect(cards.map((r) => r.id)).toEqual([plant.id, other.id, orphan.id]);
    expect(datingsOf.get(plant.id)?.map((r) => r.id)).toEqual([dating.id]);
    expect(datingCardLine(orphan)).toBe('Dates a DNA report for Gone');
  });

  it('the line under the plant: "DNA report dated", and only a missing backup is unfinished', () => {
    expect(datingHomeStatus(dating, { backedUpAt: undefined }, true)).toEqual({
      text: 'DNA report dated · not finished · next: save your backup',
      unfinished: true,
    });
    expect(datingHomeStatus(dating, { backedUpAt: 1 }, true).text).toMatch(/^DNA report dated · sealed /);
    expect(datingHomeStatus(dating, undefined, false).unfinished).toBe(false);
  });

  it('Home uses the list and the words', () => {
    const home = source('flow/AppHome.tsx');
    expect(home).toContain('homeList(records)');
    expect(home).toContain('keysOnlyHereLine(');
    expect(home).toContain('data-home-dated');
    expect(home).not.toMatch(/plants have`/);
  });
});

describe('counts say "records" when they include records that date a lab report', () => {
  it('kinds of record ids, unknown ids counted as plants', () => {
    expect(countKinds([plant.id, dating.id, 'VEIL-UNKNOWN'], all)).toEqual({ plants: 2, datings: 1 });
  });

  it('the backup warning on Home', () => {
    expect(keysOnlyHereSubject([plant.id], all)).toBe('A plant has');
    expect(keysOnlyHereSubject([plant.id, other.id], all)).toBe('2 plants have');
    expect(keysOnlyHereSubject([plant.id, other.id, dating.id], all)).toBe('3 records have');
    expect(keysOnlyHereSubject([dating.id], all)).toBe('A record has');
  });

  it('the backup check', () => {
    expect(backupHoldsLine([], all)).toBe('Your records are in it.');
    expect(backupHoldsLine([plant.id], all)).toBe('Your plant is in it.');
    expect(backupHoldsLine([plant.id, other.id], all)).toBe('All 2 of your plants are in it.');
    expect(backupHoldsLine([plant.id, dating.id], all)).toBe('All 2 of your records are in it.');
    expect(source('flow/BackupStep.tsx')).toContain('backupHoldsLine(checked, records, tr)');
  });

  it('restoring from a backup', () => {
    expect(restoredKeysLine([], all)).toBe('');
    expect(restoredKeysLine([plant.id], all)).toBe('Keys for 1 plant restored.');
    expect(restoredKeysLine([plant.id, other.id], all)).toBe('Keys for 2 plants restored.');
    expect(restoredKeysLine([plant.id, other.id, dating.id], all)).toBe(
      'Keys for 3 records restored (2 plants, 1 dated lab report).',
    );
    const page = source('flow/RestorePage.tsx');
    expect(page).toContain('restoredKeysLine(');
    expect(page).not.toMatch(/Keys for \$\{done\.records\} plant/);
  });
});

describe('logging: a record that dates a lab report is never offered as a parent', () => {
  it('parent options are plants only', () => {
    expect(parentOptionsOf(all).map((p) => p.recordId)).toEqual([plant.id, other.id]);
    const flow = source('flow/LogFlow.tsx');
    expect(flow).toContain('parentOptions={parentOptionsOf(records)}');
    expect(flow).not.toMatch(/allRecords\(\)\.map\(\(r\) => \(\{ recordId/);
  });
});

describe('the page of a record that dates a lab report', () => {
  it('says what it dates, from its sealed notes', () => {
    expect(labReportPageLines(dating)).toEqual([
      `Lab report SHA-256: ${SHA}`,
      'Lab report code: LR-ab12',
      'Lab, as signed: Test Lab',
    ]);
    expect(labReportPageLines(plant)).toEqual([]);
  });

  it('offers none of a plant’s jobs: no next stage, no dating a lab report of its own', () => {
    expect(canAddNextStage(dating, false)).toBe(false);
    expect(labReportFacts({ ...dating, dnaFingerprint: '99'.repeat(32) }, { kind: 'self', sha: SHA })).toBeUndefined();
  });

  it('is its own short page: show someone, evidence bundle, technical details, backup, nothing else', () => {
    const page = source('stage/LabReportOverview.tsx');
    expect(page).toContain('This record dates a DNA report for');
    expect(page).toContain("label={'Show someone'}");
    expect(page).toContain(DOWNLOAD_EVIDENCE_LABEL);
    expect(page).toContain('Technical details');
    expect(page).toContain("label={'Save a fresh backup'}");
    for (const job of [
      'Certificate',
      'Send it to a lab',
      'License it',
      'Save a DNA report',
      'Date this DNA report',
      'StageRows',
    ])
      expect(page).not.toContain(job);
    const detail = source('RecordDetail.tsx');
    expect(detail).toContain("mode === 'overview' && datesReport && (");
    expect(detail).toContain("mode === 'overview' && !datesReport && (");
  });
});

describe('"Add the next generation" never replaces an unsaved plant', () => {
  const parent = rec({ strainName: 'HM F2' });

  it('a different plant half-logged: a fresh next stage, and the question names that plant', () => {
    const half = { ...emptyDraft(), strainName: 'Unsaved Mother', bredBy: 'Me' };
    saveDraft(half);
    const s = nextStageStart(parent, loadDraft(), loadDraft(parent.id));
    expect(s.conflict).toEqual(half);
    expect(s.draft).toEqual(nextStageDraft(parent));
    expect(unsavedPlantLine(half)).toBe('You have an unsaved plant: Unsaved Mother.');
    expect(unsavedPlantLine({ ...half, strainName: ' ' })).toBe('You have an unsaved plant: (no name yet).');
    // The old draft is where it was, untouched; the next stage is kept under its own key.
    saveDraft(s.draft, parent.id);
    expect(loadDraft()).toEqual(half);
    expect(local.has(draftKeyFor(parent.id))).toBe(true);
  });

  it('its own draft comes back; an older next-stage draft under the plain key moves to its own key', () => {
    const own = { ...nextStageDraft(parent), strainName: 'HM F3', stage: 'F3' };
    expect(nextStageStart(parent, undefined, own)).toEqual({ draft: own, resumed: true });
    const old = { ...nextStageDraft(parent), strainName: 'HM F3 (older)' };
    expect(nextStageStart(parent, old, undefined)).toEqual({ draft: old, resumed: true, adopt: true });
    expect(nextStageStart(parent, undefined, undefined)).toEqual({ draft: nextStageDraft(parent), resumed: false });
  });

  it('the flow asks before going on, keeps the old draft, and clears only its own on sealing', () => {
    const flow = source('flow/LogFlow.tsx');
    expect(flow).toContain('Keep it and start the next stage');
    expect(flow).toContain('Continue that plant');
    expect(flow).toContain('clearDraft(nextOf)');
    expect(flow).toContain('saveDraft(d, nextOf)');
    expect(flow).not.toMatch(/navigate\('\/new', \{ replace: true \}\)/);
    expect(DRAFT_KEY).toBe('veilcore.log-draft.v1');
  });
});
