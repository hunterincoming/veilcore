// One lab result v2, as the lab types it (veilcore/lab-result-draft.ts). Used on the lab's tools
// page and inside the delivery flow, where the record tested is the delivery's and isn't typed.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { REPLACE_REASONS, type ProblemCode, type ResultKind } from '../../veilcore/lab-result';
import type { ResultDraft, YesNo } from '../../veilcore/lab-result-draft';
import { LAB_SCHEMAS, numbersOf } from '../../veilcore/field-set';
import { NumbersFields } from '../document/NumbersFields';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { kindWords } from './ResultFacts';

/** An earlier result of this lab's, to name in "replaces". */
export type MyResult = { readonly code: string; readonly label: string };

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
    k: Exclude<keyof ResultDraft, 'qc' | 'typed'>,
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
  const date = (k: 'tested' | 'received', label: AppKey) =>
    field(k, label, { type: 'date', slotProps: { inputLabel: { shrink: true }, htmlInput: { 'data-field': k } } });
  const retraction = d.kind === 'retraction';

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
        {date('tested', 'app.lr.form.tested')}
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
          {field('target', 'app.lr.form.target')}
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
          {d.qc.length < 8 && (
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
