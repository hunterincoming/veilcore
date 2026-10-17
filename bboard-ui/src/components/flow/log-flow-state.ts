// What the logging flow keeps between visits, and how it words a failed date stamp.
//
// The draft: everything typed on the first screen is kept in this browser as it is typed,
// so "Home. Your progress is saved." is true before sealing too. Photos are kept as their
// fingerprints (only the fingerprints are ever sealed), so nothing large or private is
// stored. The draft goes once the plant is sealed.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../../veilcore/records';
import type { SealInput } from '../../veilcore/seal-record';
import { parseStageHeader, stageNotes } from '../stage/stage-notes';
import { enT, type Translator } from '../../i18n/translate';
import { animalDraftHasContent, parseAnimalDraft, type AnimalDraft, type LogKind } from './animal-draft';

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
  /** "A plant" or "An animal" on the first screen (animal-draft.ts). Absent: a plant. */
  kind?: LogKind;
  /** What was typed on the animal form, kept apart from the plant's fields above. */
  animal?: AnimalDraft;
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
    (d.animal && animalDraftHasContent(d.animal)) ||
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
export const draftHeading = (draft: Draft | undefined, tr: Translator = enT): string => {
  if (!draft) return tr.t('app.home.firstPlant');
  const name =
    draft.kind === 'animal' && draft.animal
      ? draft.animal.name.trim() || draft.animal.individualId.trim()
      : draft.strainName.trim();
  return name ? tr.t('app.home.continueDraftNamed', { name }) : tr.t('app.home.continueDraft');
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
      ...(v.kind === 'animal' || v.kind === 'plant' ? { kind: v.kind } : {}),
      ...(v.animal !== undefined && parseAnimalDraft(v.animal) ? { animal: parseAnimalDraft(v.animal) } : {}),
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
 * parent (the way the parents box links a logged plant), its breeder and species carried
 * over to edit, today's date. The name, "How it was made" and the stage questions start
 * empty: they are this stage's, not the parent's. The name box suggests one as a
 * placeholder only (nextStageNamePlaceholder), never as text that would be sealed unread.
 */
export const nextStageDraft = (parent: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>): Draft => ({
  ...emptyDraft(),
  bredBy: parent.bredBy,
  taxon: parent.taxon ?? '',
  parents: [{ recordId: parent.id, name: parent.strainName }],
  stageOf: parent.id,
  stage: '',
  selectedFor: '',
});

/**
 * The name box's placeholder for a next stage: "e.g. Harbour Mist F3" when the parent's
 * generation is known (its sealed "Stage: F2", or a name ending in F2), else
 * "e.g. Harbour Mist, next selection".
 */
export const nextStageNamePlaceholder = (
  parent: Pick<StrainRecord, 'strainName' | 'notes'>,
  tr: Translator = enT,
): string => {
  const name = parent.strainName.trim();
  const fromStage = /^F(\d{1,2})$/i.exec(parseStageHeader(parent.notes).stage ?? '');
  const fromName = /^(.*?)\s*\bF(\d{1,2})$/i.exec(name);
  if (fromStage) {
    const base = fromName ? fromName[1] : name;
    return tr.t('app.log.eg', { v: `${base} F${Number(fromStage[1]) + 1}` });
  }
  if (fromName) return tr.t('app.log.eg', { v: `${fromName[1]} F${Number(fromName[2]) + 1}` });
  return tr.t('app.log.egNextSelection', { name });
};

/**
 * Where a draft is kept. A plant logged from scratch (/new) and the next stage of a plant
 * (/new?next=<its id>) are kept apart, each next stage under its parent's id: starting a next
 * stage never replaces a plant half-logged (recheck 6: "Add the next generation" silently
 * replaced an unsaved draft).
 */
export const draftKeyFor = (nextOf?: string): string => (nextOf ? `${DRAFT_KEY}.next.${nextOf}` : DRAFT_KEY);

export const loadDraft = (nextOf?: string): Draft | undefined => {
  try {
    return parseDraft(localStorage.getItem(draftKeyFor(nextOf)));
  } catch {
    return undefined;
  }
};

export const saveDraft = (d: Draft, nextOf?: string): void => {
  try {
    if (draftHasContent(d)) localStorage.setItem(draftKeyFor(nextOf), JSON.stringify(d));
    else localStorage.removeItem(draftKeyFor(nextOf));
  } catch {
    /* a browser that keeps nothing: the draft lives only on this screen */
  }
};

export const clearDraft = (nextOf?: string): void => {
  try {
    localStorage.removeItem(draftKeyFor(nextOf));
  } catch {
    /* nothing kept, nothing to clear */
  }
};

/**
 * How the next stage of `parent` starts:
 *   - its own draft, if one is kept (picking up where they left off);
 *   - the plain draft, if that already is this plant's next stage (kept by an older version
 *     of the site under the plain key): it moves to its own key (`adopt`);
 *   - a fresh one. If a different plant is half-logged, `conflict` names it: the screen asks
 *     before going on, and that draft is never touched.
 */
export const nextStageStart = (
  parent: Pick<StrainRecord, 'id' | 'strainName' | 'bredBy' | 'taxon'>,
  plain: Draft | undefined,
  own: Draft | undefined,
): { draft: Draft; resumed: boolean; adopt?: true; conflict?: Draft } => {
  if (own) return { draft: own, resumed: true };
  if (plain?.stageOf === parent.id) return { draft: plain, resumed: true, adopt: true };
  const fresh = nextStageDraft(parent);
  if (plain && draftHasContent(plain)) return { draft: fresh, resumed: false, conflict: plain };
  return { draft: fresh, resumed: false };
};

/** The question when a different plant is half-logged: its name, or that it has none yet. */
export const unsavedPlantLine = (d: Draft, tr: Translator = enT): string =>
  d.kind === 'animal' && d.animal
    ? tr.t('app.animal.unsaved', {
        name: d.animal.name.trim() || d.animal.individualId.trim() || tr.t('app.log.noNameYet'),
      })
    : tr.t('app.log.unsavedPlant', { name: d.strainName.trim() || tr.t('app.log.noNameYet') });

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
const waitFor = (e: string, tr: Translator): string => {
  const minutes = /try again in about (\d+) min/i.exec(e)?.[1];
  return minutes ? tr.tp('app.chain.inAboutMinutes', Number(minutes)) : tr.t('app.chain.inAFewMinutes');
};

/** " (transaction abc…)" after "may already have gone out", when the error named it. */
const txWords = (tx: string | undefined, tr: Translator): string => (tx ? tr.t('app.chain.txParen', { tx }) : '');

/**
 * What any other failed network call says (pairing, proving you hold a record, a
 * verifier's check, a holder answering a request). The same rules as a date stamp: plain
 * words, never the plumbing (the fee service), and a transaction that WAS sent is never
 * hidden. Otherwise the first sentence of what went wrong, cut short if it is long.
 * The raw error is for the element's data-error attribute, not the screen.
 */
export const chainProblem = (error: string, tr: Translator = enT): { text: string; retry: boolean } => {
  const e = error.trim().replace(/^(Error|SponsorRefusal):\s*/, '');
  if (/WAS sent/.test(e)) {
    const tx = /WAS sent \(([^)]+)\)/.exec(e)?.[1];
    return { text: tr.t('app.chain.mayHaveGoneOut', { tx: txWords(tx, tr) }), retry: false };
  }
  const when = waitFor(e, tr);
  const nothingSent = /nothing was sent/i.test(e) ? tr.t('app.chain.nothingSent') : '';
  if (UNREACHABLE.test(e)) return { text: tr.t('app.chain.unreachable', { nothingSent, when }), retry: true };
  // The fee service's own reasons name it: say only that it didn't go through.
  if (/sponsor|fee service|ticket|proof of work/i.test(e)) {
    return { text: tr.t('app.chain.didntGoThrough', { nothingSent, when }), retry: true };
  }
  let reason = (/^(.+?[.!?])(\s|$)/.exec(e)?.[1] ?? e).replace(/\s*\(try again in about \d+ min\)/i, '');
  reason = reason.replace(/[.!?]+$/, '');
  if (reason.length > 160) reason = `${reason.slice(0, 157).trimEnd()}…`;
  if (!reason) return { text: tr.t('app.chain.didntGoThrough', { nothingSent, when }), retry: true };
  // "The contract …" reads as "That didn't go through: the contract …"; keep acronyms.
  // (The reason is the error's own words, in English: only the sentence around it is translated.)
  const lead = /^[A-Z][a-z]/.test(reason) ? `${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : reason;
  return { text: tr.t('app.chain.didntGoThroughBecause', { reason: lead, nothingSent }), retry: true };
};

/**
 * The first sentence of an error, safe to show under "Details" so a person can report it.
 * Long hex (a key, a secret, a contract address, a transaction) never shows: anything over
 * 16 hex characters becomes "…". Cut short if it is long.
 */
export const errorDetail = (error: string): string => {
  const e = error.trim().replace(/^(Error|SponsorRefusal|TypeError):\s*/, '');
  let first = (/^(.+?[.!?])(\s|$)/s.exec(e)?.[1] ?? e).replace(/\s+/g, ' ').trim();
  first = first.replace(/(0x)?[0-9a-fA-F]{17,}/g, '…');
  if (first.length > 200) first = `${first.slice(0, 197).trimEnd()}…`;
  return first;
};

export const stampProblem = (
  error: string,
  tr: Translator = enT,
): { text: string; retry: boolean; detail?: string } => {
  const e = error.trim();
  if (/WAS sent/.test(e)) {
    const tx = /WAS sent \(([^)]+)\)/.exec(e)?.[1];
    return { text: tr.t('app.chain.stampMayHaveGoneOut', { tx: txWords(tx, tr) }), retry: false };
  }
  const when = waitFor(e, tr);
  if (UNREACHABLE.test(e)) return { text: tr.t('app.chain.stampUnreachable', { when }), retry: true };
  // The friendly sentence, and under "Details" what actually went wrong, for reporting it.
  const detail = errorDetail(e);
  return {
    text: tr.t('app.chain.stampDidntGoThrough', { when }),
    retry: true,
    ...(detail ? { detail } : {}),
  };
};
