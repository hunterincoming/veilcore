// "Date this lab report" (product-ideas.md item 3): a small follow-up record that dates a
// saved lab report's existence without showing the report.
//
// A lab report saved to a plant is a note beside the sealed record, not part of it, so the
// batch that dates the plant does not date the report. This seals one more record, with the
// plant as its parent and method "Lab report", whose notes hold only the report file's
// SHA-256, the lab report's code and the lab's name as signed:
//
//   Lab report SHA-256: <64 hex>
//   Result: LR-…
//   Lab: <the name as signed>
//
// That record is batch-dated like any other, which dates the report's existence. The report
// itself never leaves the breeder: anyone later shown the file can hash it and match.
// One record per report: asking again for the same plant and file gives the same record.
//
// Kept apart from the components so the tests load it without the UI library. The notes
// themselves are written and read in lab-report-notes.ts.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../../veilcore/records';
import {
  LAB_REPORT_METHOD,
  datingRecordFor,
  isLabReportRecord,
  labReportNotes,
  type LabReportFacts,
} from './lab-report-notes';
import type { SealInput, SealedRecord } from '../../veilcore/seal-record';
import type { SavedReport } from '../../veilcore/saved-report';
import { signerLabel } from '../../veilcore/attesters';
import { shortResultId } from '../../veilcore/lab-results';
import type { RowMark } from '../flow/plant-status-words';

const HEX64 = /^[0-9a-f]{64}$/;

/** Why, in one line, beside the button and the status. */
export const DATE_REPORT_WHY = 'So you can show this report existed by that date without showing anyone the markers.';

/**
 * What would be dated for the report saved to this plant, or nothing. Only a report that
 * stands: one the lab signed, or one the breeder saved themselves (said so in the "Lab:"
 * line). A report the lab replaced or withdrew is not offered, and an old pairing saved
 * before its SHA-256 was kept can't be dated: there is no SHA-256 to seal.
 */
export const labReportFacts = (
  record: Pick<StrainRecord, 'dnaFingerprint' | 'dnaResultId' | 'receivedFrom'> &
    Partial<Pick<StrainRecord, 'breedingMethod' | 'notes' | 'parents'>>,
  saved: SavedReport | null | undefined,
): LabReportFacts | undefined => {
  if (!saved || record.receivedFrom || !record.dnaFingerprint) return undefined;
  // A record that dates a lab report is not a plant: it has no lab report of its own to date.
  if (isLabReportRecord(record)) return undefined;
  if (saved.kind === 'lab') {
    const resultId = saved.resultId ?? record.dnaResultId;
    return {
      sha: saved.sha.toLowerCase(),
      ...(resultId ? { resultId } : {}),
      lab: signerLabel(saved.signed, '').who,
    };
  }
  if (saved.kind === 'self' && saved.sha && HEX64.test(saved.sha.toLowerCase())) {
    return { sha: saved.sha.toLowerCase(), ...(record.dnaResultId ? { resultId: record.dnaResultId } : {}) };
  }
  return undefined;
};

/** "Harbour Mist — lab report LR-3F2A" (or the SHA-256's first 8 when it came from no lab report). */
export const labReportRecordName = (plantName: string, f: LabReportFacts): string =>
  `${plantName} — lab report ${f.resultId ? shortResultId(f.resultId) : f.sha.slice(0, 8)}`;

/** What the follow-up record is sealed as (seal-record.ts sealRecord). */
export const labReportSealInput = (
  plant: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>,
  f: LabReportFacts,
  today: string,
): SealInput => {
  const parent: ParentRef = { recordId: plant.id, name: plant.strainName };
  return {
    strainName: labReportRecordName(plant.strainName, f),
    bredBy: plant.bredBy,
    dateCreated: today,
    notes: labReportNotes(f),
    parents: [parent],
    breedingMethod: LAB_REPORT_METHOD,
    photoFingerprints: [],
    refId: '',
    taxon: plant.taxon ?? '',
  };
};

/**
 * The plant page's line: "Lab report dated: in VEIL-… (waiting for a batch)", or "(dated
 * 2026-10-11 UTC — checked on Midnight)" once its batch is dated. The words in brackets are
 * the record's own date row (plant-status-words.ts recordDateRow), never made up here.
 */
export const labReportDatedLine = (recordId: string, row: { mark: RowMark; value: string }): string =>
  `Lab report dated: in ${recordId} (${row.mark === 'done' || row.mark === 'reported' ? `dated ${row.value}` : row.value})`;

// --- sealing it once ---------------------------------------------------------------------

export type DateLabReportDeps = {
  /** The records shown in this tab now. */
  all: () => readonly StrainRecord[];
  /** Read the set back from the registry (records.ts hydrate): what another tab saved included. */
  refresh: () => Promise<void>;
  /** Run the work while no other tab of this browser runs the same (veilcore/tab-lock.ts). */
  lock: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  seal: (input: SealInput) => Promise<SealedRecord>;
  /**
   * Save the sealed record and wait for the registry's answer (records.ts createRecordSaved).
   * Throws when the registry refused it: nothing was saved.
   */
  create: (sealed: SealedRecord) => Promise<StrainRecord>;
  /** Forget the keys made for a record that was sealed but never saved (as LogFlow.tsx does). */
  forget: (id: string) => void;
  /** Whether this browser holds keys for a record (record-keys.ts keysFor). */
  hasKeys: (id: string) => boolean;
  /** A note shared by every tab: which record is being sealed for which report, and since when. */
  marks: {
    get: (key: string) => { recordId: string; at: number } | undefined;
    set: (key: string, v: { recordId: string; at: number }) => void;
    clear: (key: string) => void;
  };
  now: () => number;
  today: () => string;
};

/** How long a note that another tab is sealing this report holds others back. */
export const SEALING_ELSEWHERE_MS = 2 * 60_000;

export const SEALING_ELSEWHERE =
  'This lab report is being dated in another tab or window. Wait a minute, then look again: it will show here.';

/** The one name the lock and the shared note go by: this plant and this report. */
export const datingKey = (plantId: string, sha: string): string => `date-lab-report:${plantId}:${sha.toLowerCase()}`;

/** Shared notes in localStorage; nothing kept where the browser keeps nothing. */
const MARKS_KEY = 'veilcore.lab-report-dating.v1';
const readMarks = (): Record<string, { recordId: string; at: number }> => {
  try {
    const v = JSON.parse(localStorage.getItem(MARKS_KEY) ?? '{}') as unknown;
    return v && typeof v === 'object' ? (v as Record<string, { recordId: string; at: number }>) : {};
  } catch {
    return {};
  }
};
const writeMarks = (m: Record<string, { recordId: string; at: number }>): void => {
  try {
    if (Object.keys(m).length) localStorage.setItem(MARKS_KEY, JSON.stringify(m));
    else localStorage.removeItem(MARKS_KEY);
  } catch {
    /* a browser that keeps nothing */
  }
};
export const localMarks: DateLabReportDeps['marks'] = {
  get: (key) => {
    const v = readMarks()[key];
    return v && typeof v.recordId === 'string' && typeof v.at === 'number' ? v : undefined;
  },
  set: (key, v) => writeMarks({ ...readMarks(), [key]: v }),
  clear: (key) => {
    const { [key]: _gone, ...rest } = readMarks();
    void _gone;
    writeMarks(rest);
  },
};

/** Work under way in this tab, per set of deps (one set per tab in the app; the tests make two "tabs"). */
const inFlightFor = new WeakMap<DateLabReportDeps, Map<string, Promise<StrainRecord>>>();

/**
 * Seal the follow-up record for this plant's report, once, across every tab of this browser.
 *
 * A record already dating the same report on the same plant is returned instead of a second
 * one. A second tap (or the other button, on the lab reports screen) while the first is
 * sealing waits for the same one. Another tab waits for the lock, then reads the set back
 * from the registry and the key store before sealing anything, so it finds the record the
 * first tab made (recheck 6: two tabs sealed two records for one file). If another tab
 * sealed one moments ago that the registry doesn't show yet, it says so and seals nothing.
 */
export const dateLabReportWith = async (
  deps: DateLabReportDeps,
  plant: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>,
  f: LabReportFacts,
): Promise<StrainRecord> => {
  const existing = datingRecordFor(plant.id, f.sha, deps.all());
  if (existing) return existing;
  const key = datingKey(plant.id, f.sha);
  const inFlight = inFlightFor.get(deps) ?? new Map<string, Promise<StrainRecord>>();
  inFlightFor.set(deps, inFlight);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const run = deps.lock(key, async () => {
    await deps.refresh();
    const found = datingRecordFor(plant.id, f.sha, deps.all());
    if (found) return found;
    const mark = deps.marks.get(key);
    if (mark && deps.now() - mark.at < SEALING_ELSEWHERE_MS && deps.hasKeys(mark.recordId)) {
      throw new Error(SEALING_ELSEWHERE);
    }
    const sealed = await deps.seal(labReportSealInput(plant, f, deps.today()));
    deps.marks.set(key, { recordId: sealed.id, at: deps.now() });
    try {
      const made = await deps.create(sealed);
      deps.marks.clear(key);
      return made;
    } catch (e) {
      deps.forget(sealed.id);
      deps.marks.clear(key);
      throw e;
    }
  });
  inFlight.set(key, run);
  try {
    return await run;
  } finally {
    inFlight.delete(key);
  }
};

export {
  LAB_REPORT_METHOD,
  NO_LAB_SIGNATURE,
  datedReportsOf,
  datingRecordFor,
  isLabReportRecord,
  labReportNotes,
  parseLabReportNotes,
  type LabReportFacts,
} from './lab-report-notes';
