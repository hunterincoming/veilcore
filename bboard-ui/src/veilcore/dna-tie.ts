// Whether a record is tied to the plant itself, by a DNA report (round 2 of the reviews).
//
// A dated record proves a description existed by a date. It says nothing about which plant
// it describes. A DNA report (a lab's genotype or fingerprint of the plant) is what ties a
// record to the material: with one saved, a lab can compare a new test of a plant with it.
// It never proves on its own that a plant matches, and nothing here says it does.
//
// Every screen that says whether a record is tied reads it from here, in the same words:
// the plant page, Home, Show someone and the check page, the certificate and the evidence
// bundle's README. The states follow the saved report (saved-report.ts):
//   - none       no DNA report saved: not tied yet;
//   - self       saved by the holder, and no lab signature matches the file: tied, said so;
//   - lab        the file is a report a lab signed, and the signature stands: tied, by whom
//                in the signer's own words (attesters.ts signerLabel);
//   - saved      the check page knows one is saved but not which file (an old registry and
//                a link that doesn't name it): tied, by a report the holder saved;
//   - replaced   the lab sent a corrected file in its place: not tied now;
//   - withdrawn  the lab withdrew it: not tied now.
// And separately, whether the DNA report's existence is dated: a small record that dates it
// ("Date this DNA report", components/stage/lab-report-date.ts), and that record's batch.
//
// No UI here: the components, the certificate and the bundle's README all use it.
// SPDX-License-Identifier: Apache-2.0

import type { SavedReport } from './saved-report';
import { signerLabel } from './attesters';
import { enT, type Translator } from '../i18n/translate';

export type DnaTie =
  | { readonly state: 'none' }
  | { readonly state: 'self' }
  | { readonly state: 'saved' }
  /** `lead`: "signed by …", the signer's own words (signerLabel). */
  | { readonly state: 'lab'; readonly lead: string }
  | { readonly state: 'replaced' | 'withdrawn' };

/**
 * Whether the DNA report's existence is dated: no record dates it; one does and its batch
 * isn't dated yet (`status` is that record's own date row, e.g. "waiting for a batch"); its
 * batch is dated (`date`, as that row says it); or a look-up contradicted the registry.
 */
export type DnaDate =
  | { readonly state: 'not-dated' }
  | { readonly state: 'dating'; readonly status: string }
  | { readonly state: 'dated'; readonly date: string }
  | { readonly state: 'unconfirmed'; readonly status: string };

/** A record's date row (components/flow/plant-status-words.ts recordDateRow), as far as this needs it. */
export type DateRowLike = { readonly mark: 'done' | 'reported' | 'wait' | 'failed'; readonly value: string };

/** The tie, from where the saved report stands. */
export const dnaTieOf = (saved: SavedReport, tr: Translator = enT): DnaTie => {
  switch (saved.kind) {
    case 'none':
      return { state: 'none' };
    case 'self':
      return { state: 'self' };
    case 'lab':
      return { state: 'lab', lead: signerLabel(saved.signed, 'signed by', undefined, tr).lead };
    case 'replaced':
    case 'withdrawn':
      return { state: saved.kind };
  }
};

/** Tied: a DNA report is saved, and no lab has replaced or withdrawn it. */
export const isTied = (tie: DnaTie): boolean => tie.state === 'self' || tie.state === 'lab' || tie.state === 'saved';

/**
 * The DNA report's date: none without a record that dates it; else that record's own date
 * row, never made up here (the same words "Date this DNA report" shows beside it).
 */
export const dnaDateOf = (dated: boolean, row?: DateRowLike): DnaDate => {
  if (!dated) return { state: 'not-dated' };
  if (!row) return { state: 'dating', status: '' };
  if (row.mark === 'done' || row.mark === 'reported') return { state: 'dated', date: row.value };
  if (row.mark === 'failed') return { state: 'unconfirmed', status: row.value };
  return { state: 'dating', status: row.value };
};

/** "not dated yet", "being dated: waiting for a batch", "dated 2026-10-11 UTC — checked on Midnight". */
export const dnaDateWords = (d: DnaDate, tr: Translator = enT): string => {
  switch (d.state) {
    case 'not-dated':
      return tr.t('app.plant.tie.notDated');
    case 'dating':
      return d.status ? tr.t('app.plant.tie.dating', { status: d.status }) : tr.t('app.plant.tie.datingPlain');
    case 'dated':
      return tr.t('app.plant.tie.dated', { date: d.date });
    case 'unconfirmed':
      return tr.t('app.plant.tie.unconfirmed', { status: d.status });
  }
};

/** Who reads it: the holder ("you saved"), or anyone on the check page ("the holder saved"), neutrally. */
export type TieView = 'holder' | 'public';

/** What ties it, or what undid the tie: "DNA report signed by …", "DNA report you saved (…)". */
export const dnaTieWhat = (tie: DnaTie, view: TieView = 'holder', tr: Translator = enT): string => {
  switch (tie.state) {
    case 'lab':
      return tr.t('app.plant.tie.lab', { lead: tie.lead });
    case 'self':
      return tr.t(view === 'holder' ? 'app.plant.tie.self' : 'app.plant.tie.selfPublic');
    case 'saved':
      return tr.t(view === 'holder' ? 'app.plant.tie.savedHolder' : 'app.plant.tie.savedPublic');
    case 'replaced':
      return tr.t('app.plant.tie.replaced');
    case 'withdrawn':
      return tr.t('app.plant.tie.withdrawn');
    case 'none':
      return tr.t(view === 'holder' ? 'app.plant.tie.add' : 'app.plant.tie.noneSaved');
  }
};

/**
 * One sentence: "Tied to the plant: DNA report signed by …, not dated yet." or "Not tied
 * to the plant yet: add a DNA report." On the check page (`public`) the "not yet" sentence
 * says only that none is saved: no blame, and no task for a stranger. Without a date (the
 * check page can't see the record that dates it) the sentence leaves the date out.
 */
export const dnaTieSentence = (
  tie: DnaTie,
  date: DnaDate | undefined,
  view: TieView = 'holder',
  tr: Translator = enT,
): string => {
  const what = dnaTieWhat(tie, view, tr);
  if (isTied(tie))
    return date
      ? tr.t('app.plant.tie.sentence', { what, date: dnaDateWords(date, tr) })
      : tr.t('app.plant.tie.sentenceNoDate', { what });
  if (tie.state === 'none') return tr.t('app.plant.tie.sentenceNone', { what });
  return tr.t('app.plant.tie.sentenceNot', { what });
};

/** What a DNA report shows and doesn't, in one line, said wherever the tie is. */
export const dnaTieMeaning = (tr: Translator = enT): string => tr.t('app.plant.tie.means');

/**
 * The plant page's row, in the status card: `label` the tie, `value` what ties it (or what
 * to do), `sub` its date and what it is for. `id` is the row's English name in every
 * language (data-status-row). A lab report that came back and isn't saved yet is said:
 * it isn't the plant's DNA report until it is saved to the plant.
 */
export const dnaTieRow = (
  tie: DnaTie,
  date: DnaDate,
  opts: { waiting?: number; openedNotSaved?: boolean } = {},
  tr: Translator = enT,
): { id: string; mark: DateRowLike['mark']; done: boolean; label: string; value: string; sub?: string } => {
  const id = 'DNA report';
  if (isTied(tie))
    return {
      id,
      mark: 'done',
      done: true,
      label: tr.t('app.plant.tie.tied'),
      value: dnaTieWhat(tie, 'holder', tr),
      sub: tr.t('app.plant.tie.sub', { date: dnaDateWords(date, tr) }),
    };
  if (tie.state === 'none')
    return {
      id,
      mark: 'wait',
      done: false,
      label: tr.t('app.plant.tie.notYet'),
      value:
        (opts.waiting ?? 0) > 0
          ? tr.t('app.plant.tie.cameBack')
          : opts.openedNotSaved
            ? tr.t('app.plant.tie.openedNotSaved')
            : tr.t('app.plant.tie.add'),
      sub: tr.t('app.plant.tie.why'),
    };
  return { id, mark: 'failed', done: false, label: tr.t('app.plant.tie.notNow'), value: dnaTieWhat(tie, 'holder', tr) };
};
