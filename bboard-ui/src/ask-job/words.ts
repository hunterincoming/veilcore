// "Do it for me": the few things Ask's sheet, the job page and Home share, apart so the sheet
// doesn't load the job page to open one.
// SPDX-License-Identifier: Apache-2.0

import type { Translator } from '../i18n/app';
import type { AppKey } from '../i18n/app/en';
import type { StrainRecord } from '../veilcore/records';
import type { Words } from './prepare';
import type { Job } from './store';

/** The router state Ask and Home open a job with: only then can it be approved there. */
export const JOB_STATE_KEY = 'askJob';

/** The names and labels a batch's records are sealed with, in the person's language. */
export const jobWords = (tr: Translator): Words => ({
  cloneName: (name) => tr.t('app.ask.batch.cloneName', { name }),
  // Young named by their kind ("Bella pup", "Daisy calf"), where the species says it.
  youngName: (name, group) =>
    group ? tr.t(`app.job.young.${group}` as AppKey, { name }) : tr.t('app.ask.batch.youngName', { name }),
  scheme: (s) => tr.t(s === 'Microchip' ? 'app.animal.scheme.microchip' : 'app.animal.scheme.earTag'),
});

const nameOf = (records: readonly StrainRecord[], id: string | undefined): string =>
  (id && records.find((r) => r.id === id)?.strainName) || '';

/** What a job is, in a few words: "3 Blue Dream clones", "3 reports to send". */
export const jobTitle = (job: Job, records: readonly StrainRecord[], tr: Translator): string => {
  const s = job.spec;
  if (job.kind === 'batch' && s)
    return s.preset === 'clones'
      ? tr.tp('app.job.what.clones', s.count, {
          name: nameOf(records, job.refs.parentId) || (job.refs.parentName ?? ''),
        })
      : tr.tp('app.job.what.offspring', s.count, {
          name:
            nameOf(records, job.refs.damId) ||
            nameOf(records, job.refs.sireId) ||
            job.refs.parentName ||
            (s.sireCode ?? ''),
        });
  if (job.kind === 'import') return tr.t('app.job.what.import');
  if (job.kind === 'due') return tr.tp('app.job.what.due', job.refs.reports?.length ?? 0);
  return tr.t('app.job.what.ready', { name: nameOf(records, job.refs.recordId) });
};

/** The sentence "get <record> ready to license", in the person's language: one the planner reads. */
export const readySentence = (tr: Translator, name: string): string => tr.t('app.job.suggest.ready', { name });
