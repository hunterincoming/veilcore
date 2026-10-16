// "Date your whole collection" (/records/import): a CSV or Excel log of what a lab or a
// breeder holds, one record per row. Pick the file → say which row has the column names →
// say which column is which → check the rows as they will be sealed → seal them → save the
// backup → the results file.
//
// The file is read in this browser and never uploaded. Each row becomes an ordinary
// record, sealed exactly as the logging flow seals one plant (veilcore/bulk-import.ts),
// so the record fields are all that reach VeilCore's server. Progress is kept in this
// browser: a closed tab comes back to where it was, and no row is ever sealed twice.
// The page is in the visitor's language (app.import.*); what bulk-import.ts says about a row
// (a problem, a refusal, a pause) and the results file stay in English.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircleOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { BackupStep } from '../flow/BackupStep';
import { FlowFrame, ScreenHeading, focusScreenHeading, softDisabled } from '../flow/FlowFrame';
import { IS_MAINNET } from '../../config/network';
import { REAL_CHAIN, chainNotReady } from '../../veilcore/chain/config';
import { getRecord, useRecords } from '../../veilcore/records';
import { storageKeeps, useRecordKeys } from '../../veilcore/record-keys';
import { localStamp } from '../../veilcore/time';
import {
  FIELDS,
  HEADER_SCAN,
  KEY_STAMPS_PER_DAY,
  MAX_ROWS,
  checkRows,
  clearJob,
  dateOrderFor,
  guessMapping,
  importedRecordIds,
  jobRecordIds,
  keyStampDays,
  jobSummary,
  loadJob,
  noDnaReportCount,
  readSheet,
  resultsCsv,
  resultsFileName,
  saveJob,
  sealRows,
  stampPauseWords,
  tooManyRows,
  withHeaderRow,
  type DateOrder,
  type FieldKey,
  type Job,
  type Mapping,
  type PreparedRow,
  type RowFields,
  type SealProgress,
  type Sheet,
} from '../../veilcore/bulk-import';
import { useKeyStampQueue } from './useKeyStampQueue';
import { InEnglishNote, rich, useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';

type Screen = 'file' | 'header' | 'columns' | 'check' | 'seal' | 'sealed' | 'backup' | 'done';

const STEP: Record<Screen, number | undefined> = {
  file: 1,
  header: 2,
  columns: 3,
  check: 4,
  seal: 5,
  sealed: 5,
  backup: 6,
  done: undefined,
};

/** bulk-import.ts's column names (FIELD_LABELS), in the page's language. */
const FIELD_KEY: Record<FieldKey, AppKey> = {
  strainName: 'app.import.field.strainName',
  refId: 'app.import.field.refId',
  taxon: 'app.import.field.taxon',
  parents: 'app.import.field.parents',
  parents2: 'app.import.field.parents2',
  bredBy: 'app.import.field.bredBy',
  dateCreated: 'app.import.field.dateCreated',
  notes: 'app.import.field.notes',
};

const screenFor = (job: Job | undefined): Screen =>
  !job ? 'file' : job.phase === 'sealing' ? 'seal' : job.phase === 'sealed' ? 'sealed' : 'done';

export const BulkImportPage: React.FC = () => {
  const { t } = useT();
  const [job, setJobState] = useState<Job | undefined>(loadJob);
  const [screen, setScreen] = useState<Screen>(() => screenFor(job));
  const [sheet, setSheet] = useState<Sheet>();
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Mapping>();
  const [kept, setKept] = useState(true);
  const first = useRef(true);

  const setJob = (j: Job | undefined) => {
    setJobState(j);
    if (j) setKept(saveJob(j));
    else clearJob();
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    return focusScreenHeading();
  }, [screen]);

  const stepN = STEP[screen];
  const step = stepN ? t('app.log.stepOf', { n: stepN, total: 6 }) : undefined;
  const body = (() => {
    switch (screen) {
      case 'file':
        return (
          <PickFile
            step={step}
            onRead={(s, name) => {
              setSheet(s);
              setFileName(name);
              setMapping(guessMapping(s.headers));
              setScreen('header');
            }}
          />
        );
      case 'header':
        return sheet ? (
          <HeaderRow
            step={step}
            sheet={sheet}
            onPick={(line) => {
              const s = withHeaderRow(sheet, line);
              setSheet(s);
              setMapping(guessMapping(s.headers));
            }}
            onBack={() => setScreen('file')}
            onNext={() => setScreen('columns')}
          />
        ) : null;
      case 'columns':
        return sheet && mapping ? (
          <Columns
            step={step}
            sheet={sheet}
            mapping={mapping}
            onChange={setMapping}
            onBack={() => setScreen('header')}
            onNext={() => setScreen('check')}
          />
        ) : null;
      case 'check':
        return sheet && mapping ? (
          <Check
            step={step}
            sheet={sheet}
            mapping={mapping}
            onBack={() => setScreen('columns')}
            onHeaderRow={() => setScreen('header')}
            onSeal={(rows) => {
              setJob({
                version: 1,
                fileName,
                startedAt: Date.now(),
                headers: sheet.headers,
                delimiter: sheet.delimiter,
                rows,
                phase: 'sealing',
                outcomes: {},
              });
              setScreen('seal');
            }}
          />
        ) : null;
      case 'seal':
        return job ? (
          <Seal
            step={step}
            job={job}
            kept={kept}
            autoStart={!!sheet}
            onUpdate={setJob}
            onDone={() => setScreen('sealed')}
          />
        ) : null;
      case 'sealed':
        return job ? (
          <Summary
            step={step}
            job={job}
            onNext={() => {
              if (jobRecordIds(job).length > 0) setScreen('backup');
              else {
                setJob({ ...job, phase: 'backed-up' });
                setScreen('done');
              }
            }}
          />
        ) : null;
      case 'backup':
        return (
          <BackupStep
            title={t('app.backup.title')}
            stepLabel={step}
            finishLabel={t('app.common.next')}
            onDone={() => {
              if (job) setJob({ ...job, phase: 'backed-up' });
              setScreen('done');
            }}
          />
        );
      case 'done':
        return job ? (
          <Finished
            job={job}
            onAnother={() => {
              setJob(undefined);
              setSheet(undefined);
              setMapping(undefined);
              setScreen('file');
            }}
          />
        ) : null;
    }
  })();

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log" step={step}>
        {body}
      </FlowFrame>
    </Box>
  );
};

// ---------------------------------------------------------------------------------------

const PickFile: React.FC<{ step?: string; onRead: (s: Sheet, name: string) => void }> = ({ step, onRead }) => {
  const { t } = useT();
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const keeps = storageKeeps();
  const hintId = useId();

  const read = async (f: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const s = await readSheet(f);
      if (s.raw.length < 2) {
        setError(t('app.import.noRows'));
      } else if (s.rows.length > MAX_ROWS || s.moreRows) {
        setError(tooManyRows(s));
      } else onRead(s, f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{t('app.import.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.import.intro')}
        </Typography>
      </Box>
      <Typography variant="body1">{t('app.import.fileKind', { max: MAX_ROWS })}</Typography>
      {!keeps && (
        <Alert severity="warning" variant="outlined">
          {t('app.import.notKept')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" variant="outlined" role="alert">
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
        {...softDisabled(!keeps || busy, hintId)}
        onClick={() => keeps && !busy && pick.current?.click()}
        sx={{ py: 1.6 }}
      >
        {busy ? t('app.import.reading') : t('app.import.choose')}
      </Button>
      {!keeps && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('app.import.normalWindow')}
        </Typography>
      )}
      <input
        ref={pick}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void read(f);
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {t('app.import.readHere', { server: t('app.copy.ourServer'), dated: t('app.copy.datedOn') })}
      </Typography>
      {!IS_MAINNET && (
        <Typography variant="body2" color="text.secondary">
          {t('app.import.testSite')}
        </Typography>
      )}
      <EarlierKeyStamps />
    </Stack>
  );
};

/** Key stamps still queued from earlier imports: they carry on while this page is open. */
const EarlierKeyStamps: React.FC = () => {
  const keys = useRecordKeys();
  const ids = useMemo(() => importedRecordIds(), []);
  const waiting = ids.some((id) => keys[id] && !keys[id].anchor);
  const { t } = useT();
  if (!REAL_CHAIN || chainNotReady() || !waiting) return null;
  return <KeyStamps ids={ids} heading={t('app.import.earlierStamps')} />;
};

// ---------------------------------------------------------------------------------------

/** One row as a line of text: its first filled cells. */
const rowText = (cells: readonly string[], max = 90): string => {
  const t = cells
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const HeaderRow: React.FC<{
  step?: string;
  sheet: Sheet;
  onPick: (line: number) => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ step, sheet, onPick, onBack, onNext }) => {
  const { t, tp } = useT();
  const hintId = useId();
  const choices = sheet.raw.slice(0, HEADER_SCAN);
  const first = sheet.rows[0];
  const above = sheet.raw.filter((r) => r.line < sheet.headerLine).length;
  const ready = sheet.rows.length > 0;
  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{t('app.import.header.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.import.header.intro')}
        </Typography>
      </Box>
      <TextField
        select
        label={t('app.import.header.label')}
        value={String(sheet.headerLine)}
        onChange={(e) => onPick(Number(e.target.value))}
        fullWidth
      >
        {choices.map((r) => (
          <MenuItem key={r.line} value={String(r.line)} sx={{ whiteSpace: 'normal' }}>
            {t('app.import.rowLine', { line: r.line, text: rowText(r.cells, 70) })}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }} data-header-preview="">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {t('app.import.header.names', { line: sheet.headerLine })}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word', mb: 1 }}>
          {rowText(sheet.headers, 300)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {first ? t('app.import.header.firstAt', { line: first.line }) : t('app.import.header.first')}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', color: first ? undefined : 'text.secondary' }}>
          {first ? rowText(first.cells, 300) : t('app.import.header.noRows')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {tp('app.import.header.under', sheet.rows.length)}
        {above ? tp('app.import.header.above', above) : ''}
        {t('app.import.end')}
      </Typography>
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!ready, hintId)}
        onClick={() => ready && onNext()}
        sx={{ py: 1.6 }}
      >
        {t('app.import.header.next')}
      </Button>
      {!ready && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('app.import.header.pickHint')}
        </Typography>
      )}
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        {t('app.import.header.back')}
      </Button>
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const sampleOf = (sheet: Sheet, col: number): string => {
  const v = sheet.rows.find((r) => (r.cells[col] ?? '').trim())?.cells[col]?.trim() ?? '';
  return v.length > 40 ? `${v.slice(0, 39)}…` : v;
};

const Columns: React.FC<{
  step?: string;
  sheet: Sheet;
  mapping: Mapping;
  onChange: (m: Mapping) => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ step, sheet, mapping, onChange, onBack, onNext }) => {
  const { t } = useT();
  const hintId = useId();
  const ready = mapping.columns.strainName !== null;
  const setColumn = (f: FieldKey, v: string) =>
    onChange({ ...mapping, columns: { ...mapping.columns, [f]: v === '' ? null : Number(v) } });
  const ambiguous = useMemo(() => {
    if (mapping.columns.dateCreated === null) return false;
    return checkRows(sheet, { ...mapping, dateOrder: 'auto' }, { existing: [] }).ambiguousDates > 0;
  }, [sheet, mapping.columns.dateCreated]);
  const detected = dateOrderFor(sheet, { ...mapping, dateOrder: 'auto' });

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{t('app.import.cols.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.import.cols.intro')}
        </Typography>
      </Box>
      {sheet.warnings.map((w) => (
        <Alert key={w} severity="warning" variant="outlined">
          {w}
        </Alert>
      ))}
      {FIELDS.map((f) => {
        const col = mapping.columns[f];
        return (
          <TextField
            key={f}
            select
            label={t(FIELD_KEY[f])}
            required={f === 'strainName'}
            value={col === null ? '' : String(col)}
            onChange={(e) => setColumn(f, e.target.value)}
            helperText={
              col !== null && sampleOf(sheet, col)
                ? t('app.import.cols.example', { v: sampleOf(sheet, col) })
                : f === 'parents'
                  ? t('app.import.cols.twoParents')
                  : undefined
            }
            fullWidth
          >
            <MenuItem value="">
              {f === 'strainName' ? t('app.import.cols.pick') : t('app.import.cols.notInFile')}
            </MenuItem>
            {sheet.headers.map((h, i) => (
              <MenuItem key={i} value={String(i)}>
                {h}
              </MenuItem>
            ))}
          </TextField>
        );
      })}
      <TextField
        label={t('app.import.cols.bredBy')}
        value={mapping.bredByDefault}
        onChange={(e) => onChange({ ...mapping, bredByDefault: e.target.value })}
        helperText={t('app.import.cols.bredByHelp')}
        fullWidth
      />
      {mapping.columns.dateCreated !== null && (ambiguous || mapping.dateOrder !== 'auto') && (
        <TextField
          select
          label={t('app.import.cols.dates')}
          value={mapping.dateOrder}
          onChange={(e) => onChange({ ...mapping, dateOrder: e.target.value as DateOrder })}
          helperText={detected ? undefined : t('app.import.cols.datesHelp')}
          fullWidth
        >
          <MenuItem value="auto">{t('app.import.cols.auto')}</MenuItem>
          <MenuItem value="mdy">{t('app.import.cols.mdy')}</MenuItem>
          <MenuItem value="dmy">{t('app.import.cols.dmy')}</MenuItem>
        </TextField>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!ready, hintId)}
        onClick={() => ready && onNext()}
        sx={{ py: 1.6 }}
      >
        {t('app.import.cols.next')}
      </Button>
      {!ready && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('app.import.cols.pickHint')}
        </Typography>
      )}
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        {t('app.import.cols.back')}
      </Button>
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

/** One row as it will be sealed: every field, empty ones said so. */
const RowCard: React.FC<{ row: Pick<PreparedRow, 'line' | 'fields'> }> = ({ row }) => {
  const { t } = useT();
  const f: RowFields = row.fields;
  const lines: [string, string][] = [
    [t('app.import.card.name'), f.strainName],
    [t('app.import.card.id'), f.refId],
    [t('app.import.field.taxon'), f.taxon],
    [t('app.import.field.parents'), f.parents.map((p) => p.name).join(' × ')],
    [t('app.import.field.bredBy'), f.bredBy],
    [t('app.import.card.date'), f.dateCreated],
    [t('app.import.field.notes'), f.notes],
  ];
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }} data-preview-row={row.line}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {t('app.import.row', { line: row.line })}
      </Typography>
      {lines.map(([k, v]) => (
        <Stack key={k} direction="row" spacing={1.5} sx={{ py: 0.25 }}>
          <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>
            {k}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: v ? 700 : 400,
              color: v ? undefined : 'text.secondary',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              minWidth: 0,
            }}
          >
            {v || t('app.import.notGiven')}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
};

const PREVIEW = 3;
const LISTED = 50;

const Check: React.FC<{
  step?: string;
  sheet: Sheet;
  mapping: Mapping;
  onBack: () => void;
  onHeaderRow: () => void;
  onSeal: (rows: PreparedRow[]) => void;
}> = ({ step, sheet, mapping, onBack, onHeaderRow, onSeal }) => {
  const { t, tp } = useT();
  const records = useRecords();
  const hintId = useId();
  const checked = useMemo(() => checkRows(sheet, mapping, { existing: records }), [sheet, mapping, records]);
  const preview = checked.rows.filter((r) => r.status === 'ready').slice(0, PREVIEW);
  const problems = checked.rows.filter((r) => r.status === 'problem');
  const can = checked.ready > 0 && !checked.blocked;

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{t('app.import.check.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {tp('app.import.check.ready', checked.ready)}
          {checked.already ? t('app.import.check.already', { n: checked.already }) : ''}
          {checked.problems ? t('app.import.check.problems', { n: checked.problems }) : ''}
          {t('app.import.end')}
        </Typography>
      </Box>
      {checked.blocked && (
        <Alert severity="error" variant="outlined" role="alert">
          {checked.blocked}
        </Alert>
      )}
      {checked.headerRows.length > 0 && (
        <Alert
          severity="warning"
          variant="outlined"
          action={
            <Button color="inherit" onClick={onHeaderRow} sx={{ minHeight: 44 }}>
              {t('app.import.check.pickRow')}
            </Button>
          }
        >
          {tp('app.import.check.headerRows', checked.headerRows.length, {
            rows: checked.headerRows.join(t('app.verify.sum.comma')),
          })}
        </Alert>
      )}
      {preview.length > 0 && (
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {tp('app.import.check.firstRows', preview.length)}
          </Typography>
          {preview.map((r) => (
            <RowCard key={r.line} row={r} />
          ))}
        </Stack>
      )}
      {checked.ambiguousDates > 0 && (
        <Alert severity="info" variant="outlined">
          {tp('app.import.check.ambiguous', checked.ambiguousDates)}
        </Alert>
      )}
      {problems.length > 0 && (
        <Box>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {tp('app.import.check.cantSeal', problems.length)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {tp('app.import.check.fixThem', problems.length)}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }} data-problem-list="">
            {problems.slice(0, LISTED).map((r) => (
              <li key={r.line}>
                <Typography variant="body2">
                  {t('app.import.rowLine', { line: r.line, text: r.problems.join(' ') })}
                </Typography>
              </li>
            ))}
          </Box>
          {problems.length > LISTED && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('app.import.check.more', { n: problems.length - LISTED })}
            </Typography>
          )}
        </Box>
      )}
      <Alert icon={<LockIcon />} severity="info" variant="outlined">
        {rich(t('app.import.check.onceSealed'), { b: (c) => <b>{c}</b> })}
      </Alert>
      <Typography variant="body2" color="text.secondary">
        {t('app.import.check.savedOn', { server: t('app.copy.ourServer'), dated: t('app.copy.datedOn') })}
      </Typography>
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!can, hintId)}
        onClick={() => can && onSeal(checked.rows)}
        sx={{ py: 1.6 }}
      >
        {checked.ready > 0 ? tp('app.import.check.sealN', checked.ready) : t('app.import.check.nothing')}
      </Button>
      {!can && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {checked.blocked ?? t('app.import.check.everyRow')}
        </Typography>
      )}
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        {t('app.import.check.back')}
      </Button>
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Seal: React.FC<{
  step?: string;
  job: Job;
  /** False when this browser couldn't keep the job: a closed tab means picking the file again. */
  kept: boolean;
  /** Start at once (just confirmed on the previous screen); a reopened page asks first. */
  autoStart: boolean;
  onUpdate: (j: Job) => void;
  onDone: () => void;
}> = ({ step, job, kept, autoStart, onUpdate, onDone }) => {
  const { t, tp } = useT();
  const total = job.rows.filter((r) => r.status === 'ready').length;
  const [progress, setProgress] = useState<SealProgress>({
    done: jobSummary(job).sealed + job.rows.filter((r) => job.outcomes[r.hash]?.state === 'refused').length,
    total,
  });
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState<string>();
  const alive = useRef(true);
  const started = useRef(false);
  // Set again on (re)mount: React's development mode mounts twice.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setStopped(undefined);
    const result = await sealRows(job.rows, {
      onProgress: (p) => alive.current && setProgress(p),
      shouldStop: () => !alive.current,
    });
    const next: Job = {
      ...job,
      outcomes: { ...job.outcomes, ...result.outcomes },
      phase: result.stopped ? 'sealing' : 'sealed',
    };
    onUpdate(next);
    if (!alive.current) return;
    setRunning(false);
    if (result.stopped) setStopped(result.stopped);
    else onDone();
  };

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void run();
  }, [autoStart]);

  const pct = progress.total ? Math.round((100 * progress.done) / progress.total) : 0;
  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>
          {running ? t('app.import.seal.sealing') : stopped ? t('app.import.seal.paused') : t('app.import.seal.pickUp')}
        </ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {tp('app.import.seal.toSeal', total, { file: job.fileName })}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={t('app.import.seal.aria')}
        sx={{ height: 10, borderRadius: 5 }}
      />
      <Typography variant="body1" role="status">
        {t('app.import.seal.of', { done: progress.done, total: progress.total })}
      </Typography>
      {stopped && (
        <Alert severity="warning" variant="outlined">
          {stopped}
        </Alert>
      )}
      {running ? (
        <Typography variant="body2" color="text.secondary">
          {t('app.import.seal.keepOpen')}
          {t('app.common.sentenceSep')}
          {kept ? t('app.import.seal.kept') : t('app.import.seal.notKept')}
        </Typography>
      ) : (
        <>
          <Button variant="contained" size="large" fullWidth onClick={() => void run()} sx={{ py: 1.6 }}>
            {stopped ? t('app.common.tryAgain') : t('app.import.seal.carryOn')}
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={() => {
              onUpdate({ ...job, phase: 'sealed' });
              onDone();
            }}
            sx={{ minHeight: 48 }}
          >
            {t('app.import.seal.stop')}
          </Button>
        </>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Summary: React.FC<{ step?: string; job: Job; onNext: () => void }> = ({ step, job, onNext }) => {
  const { t, tp } = useT();
  const s = jobSummary(job);
  const notSealed = job.rows.filter((r) => r.status === 'problem' || job.outcomes[r.hash]?.state === 'refused');
  const stampsFromHere = REAL_CHAIN && !chainNotReady();
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DoneIcon color="success" sx={{ fontSize: 40 }} aria-hidden="true" />
        <ScreenHeading step={step}>
          {s.sealed ? tp('app.import.sum.sealed', s.sealed) : t('app.import.sum.nothingNew')}
        </ScreenHeading>
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {s.before > 0 && (
          <li>
            <Typography variant="body1">{tp('app.import.sum.before', s.before)}</Typography>
          </li>
        )}
        {notSealed.length > 0 && (
          <li>
            <Typography variant="body1">{tp('app.import.sum.notSealed', notSealed.length)}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {notSealed.slice(0, LISTED).map((r) => {
                const o = job.outcomes[r.hash];
                return (
                  <li key={r.line}>
                    <Typography variant="body2">
                      {t('app.import.rowLine', {
                        line: r.line,
                        text: o?.state === 'refused' ? o.reason : r.problems.join(' '),
                      })}
                    </Typography>
                  </li>
                );
              })}
            </Box>
          </li>
        )}
        {s.waiting > 0 && (
          <li>
            <Typography variant="body1">{tp('app.import.sum.waiting', s.waiting)}</Typography>
          </li>
        )}
      </Box>
      {s.sealed > 0 && (
        <Typography variant="body1" color="text.secondary">
          {stampsFromHere
            ? t('app.import.sum.stampsHere', {
                dated: t('app.copy.datedOn'),
                perDay: KEY_STAMPS_PER_DAY,
                n: s.sealed,
                days: tp('app.import.days', keyStampDays(s.sealed)),
              })
            : t('app.import.sum.byBatch', { dated: t('app.copy.datedOn') })}
        </Typography>
      )}
      <NoDnaReports job={job} />
      <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
        {jobRecordIds(job).length > 0 ? t('app.log.nextSaveBackup') : t('app.common.next')}
      </Button>
      {jobRecordIds(job).length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('app.import.sum.untilSaved')}
        </Typography>
      )}
    </Stack>
  );
};

/** A record from this import, sealed now or before, with a DNA report saved to it. */
const hasDnaReport = (id: string): boolean => !!getRecord(id)?.dnaFingerprint;

/**
 * How many of the import's plants aren't tied to the plant by a DNA report yet, and how
 * to add one (veilcore/dna-tie.ts). Nothing when every one has a report.
 */
const NoDnaReports: React.FC<{ job: Job }> = ({ job }) => {
  const { tp } = useT();
  useRecords(); // a report saved in another tab shows here
  const n = noDnaReportCount(job, hasDnaReport);
  if (n === 0) return null;
  return (
    <Alert severity="info" variant="outlined" data-no-dna-report={n}>
      {tp('app.import.sum.noDna', n)}
    </Alert>
  );
};

// ---------------------------------------------------------------------------------------

const downloadText = (text: string, name: string) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Key date stamps for imported records, from this browser, while this page is open. The
 * rate is said as it is: about KEY_STAMPS_PER_DAY a day, so a big import takes weeks. The
 * records themselves don't wait for these: each is dated by its batch (round 2).
 */
const KeyStamps: React.FC<{ ids: readonly string[]; heading: string }> = ({ ids, heading }) => {
  const { t, tp } = useT();
  const queue = useKeyStampQueue(ids, true);
  const keys = useRecordKeys();
  const waiting = queue.total - queue.stamped;
  // A key stamp that landed after the backup was checked isn't in that backup.
  const newSinceBackup = ids.filter((id) => {
    const k = keys[id];
    return k?.anchor && k.backedUpAt !== undefined && (k.anchor.anchoredAt ?? Number.MAX_SAFE_INTEGER) > k.backedUpAt;
  }).length;
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }} data-key-stamps="">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        {t('app.import.stamps.of', { heading, stamped: queue.stamped, total: queue.total })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={queue.total ? Math.round((100 * queue.stamped) / queue.total) : 0}
        aria-label={heading}
        sx={{ height: 8, borderRadius: 4, my: 1 }}
      />
      <Typography variant="body2" color="text.secondary">
        {t('app.import.stamps.already', { dated: t('app.copy.datedOn') })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('app.import.stamps.each', {
          perDay: KEY_STAMPS_PER_DAY,
          queued:
            waiting > 0
              ? t('app.import.stamps.queued', { n: waiting, days: tp('app.import.days', keyStampDays(waiting)) })
              : '',
        })}
      </Typography>
      <Typography variant="body2" role="status" sx={{ mt: 1 }}>
        {queue.stopped
          ? ''
          : queue.current
            ? `${t('app.import.stamps.stamping', { name: queue.current.name })}${queue.current.progress ? ` ${queue.current.progress}` : ''}`
            : queue.pauseUntil
              ? stampPauseWords(queue.why, localStamp(queue.pauseUntil))
              : queue.stamped === queue.total
                ? t('app.import.stamps.allDone')
                : ''}
      </Typography>
      {queue.stopped && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" onClick={queue.resume} sx={{ minHeight: 44 }}>
              {t('app.import.stamps.goOn')}
            </Button>
          }
        >
          {queue.stopped}
        </Alert>
      )}
      {newSinceBackup > 0 && (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" component={RouterLink} to="/backup" sx={{ minHeight: 44 }}>
              {t('app.import.stamps.saveIt')}
            </Button>
          }
        >
          {tp('app.import.stamps.newSince', newSinceBackup)}
        </Alert>
      )}
    </Box>
  );
};

const Finished: React.FC<{ job: Job; onAnother: () => void }> = ({ job, onAnother }) => {
  const ids = useMemo(() => jobRecordIds(job), [job]);
  // This import's records first, then any earlier import's still waiting: Home says they are queued.
  const queued = useMemo(() => [...new Set([...ids, ...importedRecordIds()])], [ids]);
  const stampsFromHere = REAL_CHAIN && !chainNotReady();
  const s = jobSummary(job);
  const { t, tp } = useT();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DoneIcon color="success" sx={{ fontSize: 40 }} aria-hidden="true" />
        <ScreenHeading>{t('app.import.done.title')}</ScreenHeading>
      </Stack>
      <Typography variant="body1">
        {tp('app.import.done.new', s.sealed)}
        {s.before ? t('app.import.done.before', { n: s.before }) : ''}
        {s.notSealed + s.waiting ? t('app.import.done.notSealed', { n: s.notSealed + s.waiting }) : ''}
        {t('app.import.end')}
      </Typography>
      <Box>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() =>
            downloadText(resultsCsv(job, window.location.origin, hasDnaReport), resultsFileName(job.fileName))
          }
          sx={{ py: 1.6 }}
        >
          {t('app.import.done.download')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {t('app.import.done.downloadText')}
          {t('app.import.done.csvDna')}
          <InEnglishNote />
        </Typography>
      </Box>
      <NoDnaReports job={job} />

      {stampsFromHere && queued.length > 0 ? (
        <KeyStamps ids={queued} heading={t('app.import.stamps.heading')} />
      ) : (
        ids.length > 0 && (
          <Typography variant="body1" color="text.secondary">
            {t('app.import.done.byBatch', { dated: t('app.copy.datedOn') })}
          </Typography>
        )
      )}

      <Typography variant="body2" color="text.secondary">
        {t('app.import.done.dateStamp')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button component={RouterLink} to="/records" variant="outlined" size="large" sx={{ minHeight: 48, flex: 1 }}>
          {t('app.import.done.toPlants')}
        </Button>
        <Button variant="text" size="large" onClick={onAnother} sx={{ minHeight: 48, flex: 1 }}>
          {t('app.import.done.another')}
        </Button>
      </Stack>
    </Stack>
  );
};
