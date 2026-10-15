// What the logging flow keeps between visits, and how it words a failed date stamp.
//
// The draft: everything typed on the first screen is kept in this browser as it is typed,
// so "Home. Your progress is saved." is true before sealing too. Photos are kept as their
// fingerprints (only the fingerprints are ever sealed), so nothing large or private is
// stored. The draft goes once the plant is sealed.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../../veilcore/records';
import type { SealInput } from '../../veilcore/seal-record';
import { stageNotes } from '../stage/stage-notes';

export const DRAFT_KEY = 'veilcore.log-draft.v1';

export type DraftPhoto = { readonly name: string; readonly fingerprint: string };

export type Draft = {
  strainName: string;
  bredBy: string;
  dateCreated: string;
  parents: ParentRef[];
  taxon: string;
  breedingMethod: string;
  refId: string;
  notes: string;
  photos: DraftPhoto[];
  /**
   * The next generation or selection of this record (components/stage): its first screen
   * says a record dates nothing earlier than its sealing, and asks the two questions below.
   */
  stageOf?: string;
  /** "What stage is this?": sealed as the notes' "Stage:" line (stage-notes.ts). */
  stage?: string;
  /** "What did you select for?": sealed as the notes' "Selected for:" line. */
  selectedFor?: string;
};

/** Today on the person's own calendar, not UTC: at 9pm in New Jersey it is still today. */
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const emptyDraft = (): Draft => ({
  strainName: '',
  bredBy: '',
  dateCreated: today(),
  parents: [],
  taxon: '',
  breedingMethod: '',
  refId: '',
  notes: '',
  photos: [],
});

/** Anything typed beyond the date that is filled in for them. */
export const draftHasContent = (d: Draft): boolean =>
  Boolean(
    d.strainName.trim() ||
    d.bredBy.trim() ||
    d.parents.length ||
    d.taxon.trim() ||
    d.breedingMethod ||
    d.refId.trim() ||
    d.notes.trim() ||
    d.stage?.trim() ||
    d.selectedFor?.trim() ||
    d.photos.length,
  );

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const HEX64 = /^[0-9a-f]{64}$/;

/** Home's first-visit heading: a draft in this browser is named, so it is finished, not started again. */
export const draftHeading = (draft: Draft | undefined): string => {
  if (!draft) return 'Let’s log your first plant';
  const name = draft.strainName.trim();
  return name ? `Continue your draft: ${name}` : 'Continue your draft';
};

/** Read a stored draft back, keeping only well-formed fields. */
export const parseDraft = (raw: string | null): Draft | undefined => {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== 'object') return undefined;
    const base = emptyDraft();
    const list = (x: unknown): Record<string, unknown>[] =>
      Array.isArray(x)
        ? (x as unknown[]).filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
        : [];
    const parents = list(v.parents)
      .filter((p) => typeof p.name === 'string')
      .map((p) => ({ name: str(p.name, 200), ...(typeof p.recordId === 'string' ? { recordId: p.recordId } : {}) }))
      .slice(0, 20);
    const photos = list(v.photos)
      .map((p) => ({ name: str(p.name, 200), fingerprint: str(p.fingerprint, 64) }))
      .filter((p) => HEX64.test(p.fingerprint))
      .slice(0, 50);
    const d: Draft = {
      strainName: str(v.strainName, 200),
      bredBy: str(v.bredBy, 200),
      dateCreated: /^\d{4}-\d{2}-\d{2}$/.test(str(v.dateCreated)) ? str(v.dateCreated) : base.dateCreated,
      parents,
      taxon: str(v.taxon, 200),
      breedingMethod: str(v.breedingMethod, 100),
      refId: str(v.refId, 200),
      notes: str(v.notes),
      photos,
      ...(typeof v.stageOf === 'string' && v.stageOf ? { stageOf: str(v.stageOf, 100) } : {}),
      ...(typeof v.stage === 'string' ? { stage: str(v.stage, 200) } : {}),
      ...(typeof v.selectedFor === 'string' ? { selectedFor: str(v.selectedFor, 500) } : {}),
    };
    return draftHasContent(d) ? d : undefined;
  } catch {
    return undefined;
  }
};

/**
 * What a draft is sealed as (seal-record.ts): text trimmed, photos as their fingerprints only.
 * A next stage's two answers go first in the notes, one line each (stage-notes.ts).
 */
export const sealInputOf = (draft: Draft): SealInput => ({
  strainName: draft.strainName.trim(),
  bredBy: draft.bredBy.trim(),
  dateCreated: draft.dateCreated,
  notes: stageNotes(draft.stage, draft.selectedFor, draft.notes),
  parents: draft.parents,
  breedingMethod: draft.breedingMethod,
  photoFingerprints: draft.photos.map((p) => p.fingerprint),
  refId: draft.refId.trim(),
  taxon: draft.taxon.trim(),
});

/**
 * The first screen of the next generation or selection of a plant: this plant as its linked
 * parent (the way the parents box links a logged plant), its name, breeder and species
 * carried over to edit, today's date, and the stage questions empty.
 */
export const nextStageDraft = (parent: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>): Draft => ({
  ...emptyDraft(),
  strainName: parent.strainName,
  bredBy: parent.bredBy,
  taxon: parent.taxon ?? '',
  parents: [{ recordId: parent.id, name: parent.strainName }],
  stageOf: parent.id,
  stage: '',
  selectedFor: '',
});

export const loadDraft = (): Draft | undefined => {
  try {
    return parseDraft(localStorage.getItem(DRAFT_KEY));
  } catch {
    return undefined;
  }
};

export const saveDraft = (d: Draft): void => {
  try {
    if (draftHasContent(d)) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* a browser that keeps nothing: the draft lives only on this screen */
  }
};

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing kept, nothing to clear */
  }
};

// ---------------------------------------------------------------------------------------

/**
 * What a failed date stamp says. Plain, one sentence each, and never the plumbing (the fee
 * service, error codes): the plant is saved either way and the date stamp can wait.
 * The one thing that is never hidden: a transaction that WAS sent. Trying again then
 * could send it twice, so `retry` is false and the words say to check first.
 */
const UNREACHABLE =
  /reach|not answering|not configured|is configured|Failed to fetch|NetworkError|Load failed|timed? ?out|ECONN|ENOTFOUND|fetch failed/i;

/** "in about 3 minutes" when the error said how long, else "in a few minutes". */
const waitFor = (e: string): string => {
  const minutes = /try again in about (\d+) min/i.exec(e)?.[1];
  return minutes ? `in about ${minutes} minute${minutes === '1' ? '' : 's'}` : 'in a few minutes';
};

/**
 * What any other failed network call says (pairing, proving you hold a record, a
 * verifier's check, a holder answering a request). The same rules as a date stamp: plain
 * words, never the plumbing (the fee service), and a transaction that WAS sent is never
 * hidden. Otherwise the first sentence of what went wrong, cut short if it is long.
 * The raw error is for the element's data-error attribute, not the screen.
 */
export const chainProblem = (error: string): { text: string; retry: boolean } => {
  const e = error.trim().replace(/^(Error|SponsorRefusal):\s*/, '');
  if (/WAS sent/.test(e)) {
    const tx = /WAS sent \(([^)]+)\)/.exec(e)?.[1];
    return {
      text: `It may already have gone out${tx ? ` (transaction ${tx})` : ''}. Don't try again until that transaction has been checked on the network.`,
      retry: false,
    };
  }
  const when = waitFor(e);
  const nothingSent = /nothing was sent/i.test(e) ? ' Nothing was sent.' : '';
  if (UNREACHABLE.test(e)) return { text: `Couldn't reach the network.${nothingSent} Try again ${when}.`, retry: true };
  // The fee service's own reasons name it: say only that it didn't go through.
  if (/sponsor|fee service|ticket|proof of work/i.test(e)) {
    return { text: `That didn't go through.${nothingSent} Try again ${when}.`, retry: true };
  }
  let reason = (/^(.+?[.!?])(\s|$)/.exec(e)?.[1] ?? e).replace(/\s*\(try again in about \d+ min\)/i, '');
  reason = reason.replace(/[.!?]+$/, '');
  if (reason.length > 160) reason = `${reason.slice(0, 157).trimEnd()}…`;
  if (!reason) return { text: `That didn't go through.${nothingSent} Try again ${when}.`, retry: true };
  // "The contract …" reads as "That didn't go through: the contract …"; keep acronyms.
  const lead = /^[A-Z][a-z]/.test(reason) ? `${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : reason;
  return { text: `That didn't go through: ${lead}.${nothingSent}`, retry: true };
};

export const stampProblem = (error: string): { text: string; retry: boolean } => {
  const e = error.trim();
  if (/WAS sent/.test(e)) {
    const tx = /WAS sent \(([^)]+)\)/.exec(e)?.[1];
    return {
      text: `Your date stamp may already have gone out${tx ? ` (transaction ${tx})` : ''}. Your plant is saved. Don't try again until that transaction has been checked on the network.`,
      retry: false,
    };
  }
  const minutes = /try again in about (\d+) min/i.exec(e)?.[1];
  const when = minutes ? `in about ${minutes} minute${minutes === '1' ? '' : 's'}` : 'in a few minutes';
  const unreachable =
    /reach|not answering|not configured|is configured|Failed to fetch|NetworkError|Load failed|timed? ?out|ECONN|ENOTFOUND|fetch failed/i.test(
      e,
    );
  return {
    text: unreachable
      ? `Couldn't reach the network. Your plant is saved. Try again ${when}, or do the date stamp later.`
      : `The date stamp didn't go through. Your plant is saved. Try again ${when}, or do the date stamp later.`,
    retry: true,
  };
};
