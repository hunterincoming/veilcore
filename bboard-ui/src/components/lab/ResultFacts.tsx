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
  ViabilityResult,
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
    case 'viability':
      return tr.t((r as ViabilityResult).detected ? 'app.lr.call.recovered' : 'app.lr.call.noneRecovered');
    case 'retraction':
      return tr.t('app.lr.call.withdrawn');
    case 'numbers':
      return schemaWords((r as NumbersResult).form, tr);
  }
};

export const kindWords = (k: LabResultStatement['kind'], tr: Translator): string => tr.t(`app.lr.kind.${k}` as AppKey);

/** "1 CFU per 25 g": a viability result's limit or count, as the lab typed it. */
export const amountWords = (a: { value: string; unit: string }): string => `${a.value} ${seen(a.unit)}`;

/**
 * What a viability result says, in the words every page uses: "none recovered" is always said
 * with the method, the portion and the limit of detection, and never as dead or sterile.
 */
const ViabilityFacts: React.FC<{ s: LabResultStatement }> = ({ s }) => {
  const { t } = useT();
  const r = s.result as ViabilityResult;
  return (
    <>
      <Fact label={t('app.lr.f.stage')}>
        <span data-viability-stage={r.stage}>{t(`app.lr.stage.${r.stage}` as AppKey)}</span>
      </Fact>
      <Fact label={t('app.lr.f.batch')}>{seen(r.batch)}</Fact>
      {r.killStep !== undefined && <Fact label={t('app.lr.f.killStep')}>{seen(r.killStep)}</Fact>}
      <Fact label={t('app.lr.f.recovers')}>{seen(r.target)}</Fact>
      <Fact label={t('app.lr.f.portion')}>{seen(r.portion)}</Fact>
      <Fact label={t('app.lr.f.cultures')}>
        {r.cultures
          .map((c) =>
            t('app.lr.f.culture', { medium: seen(c.medium), time: seen(c.time), temperature: seen(c.temperature) }),
          )
          .join(' · ')}
      </Fact>
      <Fact label={t('app.lr.f.lod')}>{amountWords(r.lod)}</Fact>
      {/* As a report gives it: the count, if the method gives one; "< LOD" when none were (never 0). */}
      <Fact label={t('app.lr.f.count')}>
        <span data-viability-found={!r.detected ? 'below-lod' : r.count ? 'count' : 'no-count'}>
          {!r.detected
            ? t('app.lr.f.belowLod', { lod: amountWords(r.lod) })
            : r.count
              ? amountWords(r.count)
              : t('app.lr.f.noCount')}
        </span>
      </Fact>
      <Fact label={t('app.lr.f.controls')}>
        {t('app.lr.f.positiveGrew', { control: seen(r.controls.positive) })}
        {r.controls.negativeGrew === false ? ` · ${t('app.lr.f.negativeClean')}` : ''}
      </Fact>
      <Fact label={t('app.lr.f.sampled')}>{r.sampled}</Fact>
      <Fact label={t('app.lr.f.strain')} mono>
        {r.strain}
      </Fact>
      {r.before !== undefined && (
        <Fact label={t('app.lr.f.before')} mono>
          {r.before}
        </Fact>
      )}
      <Typography variant="body2" sx={{ fontWeight: 600 }} data-viability-note={r.detected ? 'recovered' : 'none'}>
        {r.detected
          ? t('app.lr.note.recovered', { method: seen(s.method.id), portion: seen(r.portion) })
          : t('app.lr.note.noneRecovered', {
              method: seen(s.method.id),
              version: seen(s.method.version),
              portion: seen(r.portion),
              lod: amountWords(r.lod),
            })}
      </Typography>
      <Typography variant="body2" color="text.secondary" data-viability-limits="">
        {t('app.lr.note.viabilityLimits')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('app.lr.note.strain')}
      </Typography>
    </>
  );
};

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
        {/* A bare "same genotype" is the overread; the counts go right beside it. */}
        {s.kind === 'match' && (r as MatchResult).compared !== undefined && (
          <span data-lab-result-counts="">
            {' '}
            {t('app.lr.f.counts', {
              compared: String((r as MatchResult).compared),
              differing: String((r as MatchResult).differing ?? '?'),
            })}
          </span>
        )}
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
          {(r as MatchResult).otherSampleId !== undefined && (
            <Fact label={t('app.lr.f.otherSampleId')}>{seen((r as MatchResult).otherSampleId!)}</Fact>
          )}
          {(r as MatchResult).compared !== undefined && (
            <Fact label={t('app.lr.f.compared')}>{String((r as MatchResult).compared)}</Fact>
          )}
          {(r as MatchResult).differing !== undefined && (
            <Fact label={t('app.lr.f.differing')}>{String((r as MatchResult).differing)}</Fact>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.note.match')}
          </Typography>
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
      {s.kind === 'viability' && <ViabilityFacts s={s} />}
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
      <Fact label={t(s.kind === 'viability' ? 'app.lr.form.read' : 'app.lr.f.tested')}>{s.tested}</Fact>
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
      <Typography variant="body2" color="text.secondary" data-lab-result-current="">
        {t('app.lr.note.current', { tested: s.tested })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('app.lr.note.never')}
      </Typography>
    </Stack>
  );
};
