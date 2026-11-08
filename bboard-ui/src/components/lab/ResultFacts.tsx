// A lab result v2's facts, as the lab signed them (veilcore/lab-result.ts): on the check page, on
// the breeder's opened report, and on the record that holds it. Text the lab typed is shown on
// one line with no invisible characters (DocumentParts seen).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Stack, Typography } from '@mui/material';
import type {
  LabResultStatement,
  LineageResult,
  MarkResult,
  MatchResult,
  NumbersResult,
  PathogenResult,
} from '../../veilcore/lab-result';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import { Fact, seen } from '../document/DocumentParts';
import { schemaWords } from '../document/NumbersFields';

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

/** The result's call in words. */
export const callWords = (s: LabResultStatement, tr: Translator): string => {
  const r = s.result as Record<string, unknown> | undefined;
  switch (s.kind) {
    case 'pathogen':
      return tr.t((r as PathogenResult).detected ? 'app.lr.call.detected' : 'app.lr.call.notDetected');
    case 'match':
      return tr.t((r as MatchResult).matches ? 'app.lr.call.match' : 'app.lr.call.noMatch');
    case 'lineage':
      return tr.t((r as LineageResult).consistent ? 'app.lr.call.consistent' : 'app.lr.call.excluded');
    case 'dna-mark':
      return tr.t((r as MarkResult).found ? 'app.lr.call.found' : 'app.lr.call.notFound');
    case 'retraction':
      return tr.t('app.lr.call.withdrawn');
    case 'numbers':
      return schemaWords((r as NumbersResult).form, tr);
  }
};

export const kindWords = (k: LabResultStatement['kind'], tr: Translator): string => tr.t(`app.lr.kind.${k}` as AppKey);

export const ResultFacts: React.FC<{ statement: LabResultStatement; code?: string }> = ({ statement: s, code }) => {
  const tr = useT();
  const { t } = tr;
  const ver = (r: { id: string; version: string }) =>
    t('app.lr.f.version', { id: seen(r.id), version: seen(r.version) });
  const r = s.result as Record<string, unknown> | undefined;
  return (
    <Stack spacing={1} data-lab-result-facts="" data-kind={s.kind}>
      <Fact label={t('app.lr.f.kind')}>{kindWords(s.kind, tr)}</Fact>
      <Fact label={t('app.lr.f.call')}>
        <b data-lab-result-call="">{callWords(s, tr)}</b>
      </Fact>
      {s.kind === 'pathogen' && (
        <>
          <Fact label={t('app.lr.f.target')}>{seen((r as PathogenResult).target)}</Fact>
          <Fact label={t('app.lr.f.sampleType')}>{seen((r as PathogenResult).sampleType)}</Fact>
          {(r as PathogenResult).ct !== undefined && <Fact label={t('app.lr.f.ct')}>{(r as PathogenResult).ct}</Fact>}
        </>
      )}
      {s.kind === 'match' && (
        <>
          <Fact label={t('app.lr.f.other')} mono>
            {(r as MatchResult).other}
          </Fact>
          {(r as MatchResult).compared !== undefined && (
            <Fact label={t('app.lr.f.compared')}>{String((r as MatchResult).compared)}</Fact>
          )}
          {(r as MatchResult).differing !== undefined && (
            <Fact label={t('app.lr.f.differing')}>{String((r as MatchResult).differing)}</Fact>
          )}
        </>
      )}
      {s.kind === 'lineage' && (
        <>
          <Fact label={t('app.lr.f.parents')} mono>
            {(r as LineageResult).parents.join(' · ')}
          </Fact>
          {(r as LineageResult).compared !== undefined && (
            <Fact label={t('app.lr.f.compared')}>{String((r as LineageResult).compared)}</Fact>
          )}
          {(r as LineageResult).conflicts !== undefined && (
            <Fact label={t('app.lr.f.conflicts')}>{(r as LineageResult).conflicts!.join(' · ')}</Fact>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.note.lineage')}
          </Typography>
        </>
      )}
      {s.kind === 'dna-mark' && (
        <>
          {(r as MarkResult).label !== undefined && (
            <Fact label={t('app.lr.f.label')}>{seen((r as MarkResult).label!)}</Fact>
          )}
          <Fact label={t('app.lr.f.seal')} mono>
            {(r as MarkResult).seal}
          </Fact>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.note.mark')}
          </Typography>
        </>
      )}
      <Fact label={t('app.lr.f.subject')} mono>
        {s.subject}
      </Fact>
      <Fact label={t('app.lr.f.sampleId')}>{seen(s.sampleId)}</Fact>
      <Fact label={t('app.lr.f.accession')}>{seen(s.accession)}</Fact>
      <Fact label={t('app.lr.f.method')}>{ver(s.method)}</Fact>
      {s.panel && <Fact label={t('app.lr.f.panel')}>{ver(s.panel)}</Fact>}
      <Fact label={t('app.lr.f.tested')}>{s.tested}</Fact>
      {s.received && <Fact label={t('app.lr.f.received')}>{s.received}</Fact>}
      {s.qc && <Fact label={t('app.lr.f.qc')}>{s.qc.map((q) => `${seen(q.name)}: ${seen(q.value)}`).join(' · ')}</Fact>}
      {s.replaces && (
        <Typography variant="body2" data-lab-result-replaces="">
          {t('app.lr.replacesLine', {
            code: short(s.replaces.result),
            reason: t(`app.lr.reason.${s.replaces.reason}` as AppKey),
          })}
        </Typography>
      )}
      {code && (
        <Fact label={t('app.lr.f.code')} mono>
          {code}
        </Fact>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('app.lr.note.never')}
      </Typography>
    </Stack>
  );
};
