// One lab result v2, as the lab types it (veilcore/lab-result-draft.ts). Used on the lab's tools
// page and inside the delivery flow, where the record tested is the delivery's and isn't typed.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Autocomplete, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { CULTURES_MAX, QC_MAX, REPLACE_REASONS, type ProblemCode, type ResultKind } from '../../veilcore/lab-result';
import type { ResultDraft, YesNo } from '../../veilcore/lab-result-draft';
import { LAB_SCHEMAS, numbersOf } from '../../veilcore/field-set';
import { NumbersFields } from '../document/NumbersFields';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { kindWords } from './ResultFacts';

/**
 * Targets a cannabis or hop TC lab tests for most, by the name most labs report. Free text stays
 * allowed; the list only keeps "HLVd", "HpLVd" and "Hop latent viroid" from becoming three targets.
 */
export const COMMON_TARGETS = ['HLVd', 'CBCVd', 'TMV', 'ToMV', 'ToBRFV', 'LChV', 'BCTV', 'AMV', 'ArMV'] as const;

/** The run and QC details a pathogen lab reports first (ISO/IEC 17025 traceability). */
const QPCR_DETAILS = [
  'Ct cut-off',
  'Limit of detection',
  'Internal control Ct',
  'Positive control',
  'Negative control',
  'Run ID',
];

/**
 * Run details a viability report usually carries besides the controls (a bioburden count, ISO
 * 11737-1, before the kill step; a sterility test, USP <71> and ISO 11737-2, after it).
 */
const VIABILITY_DETAILS = ['Medium lot', 'Growth promotion', 'Neutraliser', 'Method suitability', 'Run ID'];

/** An earlier result of this lab's, to name in "replaces" (or, for a before-sample, in "before"). */
export type MyResult = {
  readonly code: string;
  readonly label: string;
  /** A viability result's before-sample: its batch, so an after-sample can name it. */
  readonly beforeSample?: { readonly batch: string };
};

export const ResultForm: React.FC<{
  draft: ResultDraft;
  onDraft: (d: ResultDraft) => void;
  kinds: readonly ResultKind[];
  /** The record tested is fixed (a delivery's): its proof code isn't typed. */
  fixedSubject?: boolean;
  mine?: readonly MyResult[];
  /** The field the last attempt was refused for. */
  problem?: ProblemCode;
}> = ({ draft: d, onDraft, kinds, fixedSubject, mine = [], problem }) => {
  const tr = useT();
  const { t } = tr;
  const set = <K extends keyof ResultDraft>(k: K, v: ResultDraft[K]) => onDraft({ ...d, [k]: v });
  const field = (
    k: Exclude<keyof ResultDraft, 'qc' | 'typed' | 'cultures'>,
    label: AppKey,
    extra: Partial<React.ComponentProps<typeof TextField>> = {},
  ) => (
    <TextField
      label={t(label)}
      value={d[k]}
      onChange={(e) => set(k, e.target.value as never)}
      error={
        problem === k ||
        (problem === 'method' && k.startsWith('method')) ||
        (problem === 'panel' && k.startsWith('panel'))
      }
      fullWidth
      slotProps={{ htmlInput: { maxLength: 200, 'data-field': k } }}
      {...extra}
    />
  );
  const yesNo = (k: 'detected' | 'matches' | 'consistent' | 'found', yes: AppKey, no: AppKey) => (
    <TextField
      select
      label={t('app.lr.form.call')}
      value={d[k]}
      onChange={(e) => set(k, e.target.value as YesNo)}
      error={problem === 'result'}
      fullWidth
      slotProps={{ htmlInput: { 'data-field': k } }}
    >
      <MenuItem value="yes">{t(yes)}</MenuItem>
      <MenuItem value="no">{t(no)}</MenuItem>
    </TextField>
  );
  const date = (k: 'tested' | 'received' | 'sampled', label: AppKey) =>
    field(k, label, { type: 'date', slotProps: { inputLabel: { shrink: true }, htmlInput: { 'data-field': k } } });
  const retraction = d.kind === 'retraction';
  const viable = d.kind === 'viability';
  const befores = mine.filter((m) => m.beforeSample);
  const pick = (
    k: 'stage' | 'positiveGrew' | 'negativeGrew',
    label: AppKey,
    options: readonly (readonly [string, AppKey])[],
  ) => (
    <TextField
      select
      label={t(label)}
      value={d[k]}
      onChange={(e) => set(k, e.target.value as never)}
      error={problem === k || (problem === 'controls' && k !== 'stage')}
      fullWidth
      slotProps={{ htmlInput: { 'data-field': k } }}
    >
      {options.map(([v, words]) => (
        <MenuItem key={v} value={v}>
          {t(words)}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Stack spacing={2} data-result-form="">
      {kinds.length > 1 && (
        <TextField
          select
          label={t('app.lr.form.kind')}
          value={d.kind}
          onChange={(e) => onDraft({ ...d, kind: e.target.value as ResultKind })}
          fullWidth
          slotProps={{ htmlInput: { 'data-field': 'kind' } }}
        >
          {kinds.map((k) => (
            <MenuItem key={k} value={k}>
              {kindWords(k, tr)}
            </MenuItem>
          ))}
        </TextField>
      )}
      {!fixedSubject &&
        field('subject', 'app.lr.form.subject', {
          helperText: t('app.lr.form.subjectHelp'),
          error: problem === 'subject',
        })}
      {field('sampleId', 'app.lr.form.sampleId')}
      {field('accession', 'app.lr.form.accession')}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {field('method', 'app.lr.form.method')}
        {field('methodVersion', 'app.lr.form.methodVersion')}
      </Stack>
      {(d.kind === 'numbers' || d.kind === 'match' || d.kind === 'lineage') && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {field('panel', 'app.lr.form.panel')}
          {field('panelVersion', 'app.lr.form.panelVersion')}
        </Stack>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {date('tested', viable ? 'app.lr.form.read' : 'app.lr.form.tested')}
        {date('received', 'app.lr.form.received')}
      </Stack>

      {d.kind === 'numbers' && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('app.lr.form.numbersIntro')}
          </Typography>
          <NumbersFields
            schema={d.form}
            onSchema={(id) => onDraft({ ...d, form: id, typed: {} })}
            typed={d.typed}
            onTyped={(typed) => set('typed', typed)}
            bad={d.form ? numbersOf(d.form, d.typed).bad : []}
            forms={LAB_SCHEMAS}
            bare
          />
        </Box>
      )}
      {d.kind === 'pathogen' && (
        <>
          <Autocomplete
            freeSolo
            options={COMMON_TARGETS}
            value={d.target}
            onInputChange={(_, v) => set('target', v)}
            renderInput={(params) => (
              <TextField {...params} label={t('app.lr.form.target')} error={problem === 'target'} />
            )}
          />
          {field('sampleType', 'app.lr.form.sampleType')}
          {yesNo('detected', 'app.lr.call.detected', 'app.lr.call.notDetected')}
          {field('ct', 'app.lr.form.ct', { slotProps: { htmlInput: { inputMode: 'decimal', 'data-field': 'ct' } } })}
        </>
      )}
      {d.kind === 'match' && (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.form.compareIntro')}
          </Typography>
          {field('other', 'app.lr.form.other')}
          {field('otherSampleId', 'app.lr.form.otherSampleId')}
          {yesNo('matches', 'app.lr.call.match', 'app.lr.call.noMatch')}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('compared', 'app.lr.form.compared', { error: problem === 'counts' })}
            {field('differing', 'app.lr.form.differing', { error: problem === 'counts' })}
          </Stack>
        </>
      )}
      {d.kind === 'lineage' && (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.form.compareIntro')}
          </Typography>
          {field('parent1', 'app.lr.form.parent1', { error: problem === 'parents' })}
          {field('parent2', 'app.lr.form.parent2', { error: problem === 'parents' })}
          {yesNo('consistent', 'app.lr.call.consistent', 'app.lr.call.excluded')}
          {field('compared', 'app.lr.form.compared', { error: problem === 'counts' })}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('conflicts1', 'app.lr.form.conflicts1', { error: problem === 'counts' })}
            {field('conflicts2', 'app.lr.form.conflicts2', { error: problem === 'counts' })}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.note.lineage')}
          </Typography>
        </>
      )}
      {viable && (
        <>
          <Typography variant="body2" color="text.secondary" data-viability-intro="">
            {t('app.lr.form.viabilityIntro')}
          </Typography>
          {field('batch', 'app.lr.form.batch')}
          {pick('stage', 'app.lr.form.stage', [
            ['before', 'app.lr.stage.before'],
            ['after', 'app.lr.stage.after'],
          ])}
          {d.stage === 'after' &&
            field('killStep', 'app.lr.form.killStep', { helperText: t('app.lr.form.killStepHelp') })}
          {d.stage === 'after' && befores.length > 0 && (
            <TextField
              select
              label={t('app.lr.form.beforePick')}
              value={befores.some((m) => m.code === d.before) ? d.before : ''}
              onChange={(e) => set('before', e.target.value)}
              error={problem === 'before'}
              fullWidth
              slotProps={{ htmlInput: { 'data-field': 'beforePick' } }}
            >
              <MenuItem value="">{t('app.lr.form.replacesNone')}</MenuItem>
              {befores.map((m) => (
                <MenuItem key={m.code} value={m.code}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {d.stage === 'after' &&
            field('before', befores.length ? 'app.lr.form.beforeCode' : 'app.lr.form.before', {
              helperText: t('app.lr.form.beforeHelp'),
            })}
          {field('strain', 'app.lr.form.strain', { helperText: t('app.lr.form.strainHelp') })}
          {date('sampled', 'app.lr.form.sampled')}
          {field('recovers', 'app.lr.form.recovers', { error: problem === 'target' })}
          {field('portion', 'app.lr.form.portion')}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              {t('app.lr.form.cultures')}
            </Typography>
            <Stack spacing={1.5}>
              {d.cultures.map((c, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} data-culture={i}>
                  {(['medium', 'time', 'temperature'] as const).map((k) => (
                    <TextField
                      key={k}
                      label={t(`app.lr.form.culture.${k}` as AppKey)}
                      value={c[k]}
                      onChange={(e) =>
                        set(
                          'cultures',
                          d.cultures.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)),
                        )
                      }
                      error={problem === 'cultures'}
                      size="small"
                      sx={{ flex: { sm: k === 'medium' ? 2 : 1 } }}
                      slotProps={{ htmlInput: { maxLength: k === 'medium' ? 200 : 60 } }}
                    />
                  ))}
                  {d.cultures.length > 1 && (
                    <Button
                      size="small"
                      onClick={() =>
                        set(
                          'cultures',
                          d.cultures.filter((_, j) => j !== i),
                        )
                      }
                      sx={{ minHeight: 40, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                    >
                      {t('app.lr.form.qcRemove')}
                    </Button>
                  )}
                </Stack>
              ))}
              {d.cultures.length < CULTURES_MAX && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => set('cultures', [...d.cultures, { medium: '', time: '', temperature: '' }])}
                  sx={{ alignSelf: 'flex-start', minHeight: 40 }}
                >
                  {t('app.lr.form.cultureAdd')}
                </Button>
              )}
            </Stack>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('lodValue', 'app.lr.form.lodValue', {
              error: problem === 'lod' || problem === 'lodNumber',
              helperText: t('app.lr.form.numberHelp'),
              slotProps: { htmlInput: { inputMode: 'decimal', 'data-field': 'lodValue' } },
            })}
            {field('lodUnit', 'app.lr.form.unit', { error: problem === 'lod' })}
          </Stack>
          {yesNo('detected', 'app.lr.call.recovered', 'app.lr.call.noneRecovered')}
          {/* A count only when some were recovered: none recovered is below the limit, not 0. */}
          {d.detected === 'yes' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {field('countValue', 'app.lr.form.countValue', {
                error: problem === 'count' || problem === 'countNumber',
                slotProps: { htmlInput: { inputMode: 'decimal', 'data-field': 'countValue' } },
              })}
              {field('countUnit', 'app.lr.form.unit', { error: problem === 'count' })}
            </Stack>
          )}
          {d.detected === 'no' && (
            <Typography variant="body2" color="text.secondary" data-viability-below="">
              {t('app.lr.form.belowLod')}
            </Typography>
          )}
          {field('positive', 'app.lr.form.positive', { error: problem === 'controls' })}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {pick('positiveGrew', 'app.lr.form.positiveGrew', [
              ['yes', 'app.lr.control.grew'],
              ['no', 'app.lr.control.noGrowth'],
            ])}
            {pick('negativeGrew', 'app.lr.form.negativeGrew', [
              ['no', 'app.lr.control.noGrowth'],
              ['yes', 'app.lr.control.grew'],
              ['not-run', 'app.lr.control.notRun'],
            ])}
          </Stack>
        </>
      )}
      {d.kind === 'dna-mark' && (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('app.lr.form.markIntro')}
          </Typography>
          <TextField
            label={t('app.lr.form.sequence')}
            value={d.sequence}
            onChange={(e) => set('sequence', e.target.value)}
            helperText={t('app.lr.form.sequenceHelp')}
            error={problem === 'seal'}
            multiline
            minRows={3}
            fullWidth
            autoComplete="off"
            slotProps={{
              htmlInput: { spellCheck: false, 'data-field': 'sequence', style: { fontFamily: 'monospace' } },
            }}
          />
          {field('markLabel', 'app.lr.form.markLabel', { error: problem === 'label' })}
          {yesNo('found', 'app.lr.call.found', 'app.lr.call.notFound')}
        </>
      )}

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {t('app.lr.form.qc')}
        </Typography>
        <Stack spacing={1.5}>
          {d.qc.map((q, i) => (
            <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                label={t('app.lr.form.qcName')}
                value={q.name}
                onChange={(e) =>
                  set(
                    'qc',
                    d.qc.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                  )
                }
                error={problem === 'qc'}
                size="small"
                sx={{ flex: { sm: 2 } }}
                slotProps={{ htmlInput: { maxLength: 60 } }}
              />
              <TextField
                label={t('app.lr.form.qcValue')}
                value={q.value}
                onChange={(e) =>
                  set(
                    'qc',
                    d.qc.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                  )
                }
                error={problem === 'qc'}
                size="small"
                sx={{ flex: { sm: 1 } }}
                slotProps={{ htmlInput: { maxLength: 60 } }}
              />
              <Button
                size="small"
                onClick={() =>
                  set(
                    'qc',
                    d.qc.filter((_, j) => j !== i),
                  )
                }
                sx={{ minHeight: 40, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
              >
                {t('app.lr.form.qcRemove')}
              </Button>
            </Stack>
          ))}
          {(d.kind === 'pathogen' || viable) && d.qc.length === 0 && (
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                set(
                  'qc',
                  (viable ? VIABILITY_DETAILS : QPCR_DETAILS).map((name) => ({ name, value: '' })),
                )
              }
              sx={{ alignSelf: 'flex-start', minHeight: 40 }}
              data-qc-usual=""
            >
              {t(viable ? 'app.lr.form.qcUsualViability' : 'app.lr.form.qcUsual')}
            </Button>
          )}
          {d.qc.length < QC_MAX && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => set('qc', [...d.qc, { name: '', value: '' }])}
              sx={{ alignSelf: 'flex-start', minHeight: 40 }}
            >
              {t('app.lr.form.qcAdd')}
            </Button>
          )}
        </Stack>
      </Box>

      <Box>
        {mine.length > 0 && (
          <TextField
            select
            label={t(retraction ? 'app.lr.form.withdraws' : 'app.lr.form.replaces')}
            value={mine.some((m) => m.code === d.replaces) ? d.replaces : ''}
            onChange={(e) => set('replaces', e.target.value)}
            error={problem === 'replaces'}
            fullWidth
            sx={{ mb: 1.5 }}
            slotProps={{ htmlInput: { 'data-field': 'replacesPick' } }}
          >
            <MenuItem value="">{t('app.lr.form.replacesNone')}</MenuItem>
            {mine.map((m) => (
              <MenuItem key={m.code} value={m.code}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {field(
          'replaces',
          mine.length ? 'app.lr.form.replacesCode' : retraction ? 'app.lr.form.withdraws' : 'app.lr.form.replaces',
          {
            error: problem === 'replaces',
          },
        )}
        {!retraction && d.replaces.trim() !== '' && (
          <TextField
            select
            label={t('app.lr.form.reason')}
            value={d.reason || 're-test'}
            onChange={(e) => set('reason', e.target.value as ResultDraft['reason'])}
            fullWidth
            sx={{ mt: 1.5 }}
          >
            {REPLACE_REASONS.filter((r) => r !== 'retraction').map((r) => (
              <MenuItem key={r} value={r}>
                {t(`app.lr.reason.${r}` as AppKey)}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      {field('title', 'app.lr.form.title')}
    </Stack>
  );
};
