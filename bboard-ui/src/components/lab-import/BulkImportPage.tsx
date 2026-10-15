// "Date your whole collection" (/records/import): a CSV or Excel log of what a lab or a
// breeder holds, one record per row. Pick the file → say which column is which → check
// the rows as they will be sealed → seal them → save the backup → the results file.
//
// The file is read in this browser and never uploaded. Each row becomes an ordinary
// record, sealed exactly as the logging flow seals one plant (veilcore/bulk-import.ts),
// so the record fields are all that reach VeilCore's server. Progress is kept in this
// browser: a closed tab comes back to where it was, and no row is ever sealed twice.
// English only for now.
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
import { DATED_ON, OUR_SERVER } from '../../config/copy';
import { IS_MAINNET } from '../../config/network';
import { REAL_CHAIN, chainNotReady } from '../../veilcore/chain/config';
import { useRecords } from '../../veilcore/records';
import { storageKeeps, useRecordKeys } from '../../veilcore/record-keys';
import { localStamp } from '../../veilcore/time';
import {
  FIELDS,
  FIELD_LABELS,
  MAX_ROWS,
  checkRows,
  clearJob,
  dateOrderFor,
  guessMapping,
  jobRecordIds,
  jobSummary,
  loadJob,
  readSheet,
  resultsCsv,
  resultsFileName,
  saveJob,
  sealRows,
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

type Screen = 'file' | 'columns' | 'check' | 'seal' | 'sealed' | 'backup' | 'done';

const STEP: Record<Screen, string | undefined> = {
  file: 'Step 1 of 5',
  columns: 'Step 2 of 5',
  check: 'Step 3 of 5',
  seal: 'Step 4 of 5',
  sealed: 'Step 4 of 5',
  backup: 'Step 5 of 5',
  done: undefined,
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const screenFor = (job: Job | undefined): Screen =>
  !job ? 'file' : job.phase === 'sealing' ? 'seal' : job.phase === 'sealed' ? 'sealed' : 'done';

export const BulkImportPage: React.FC = () => {
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

  const step = STEP[screen];
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
              setScreen('columns');
            }}
          />
        );
      case 'columns':
        return sheet && mapping ? (
          <Columns
            step={step}
            sheet={sheet}
            mapping={mapping}
            onChange={setMapping}
            onBack={() => setScreen('file')}
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
            title="Save your backup"
            stepLabel={step}
            finishLabel="Next"
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
      if (s.headers.length === 0 || s.rows.length === 0) {
        setError('That file has no rows under its header row. The first row should name the columns.');
      } else if (s.rows.length > MAX_ROWS) {
        setError(
          `That file has ${s.rows.length} rows. Import up to ${MAX_ROWS} at a time: split the file and import the rest after.`,
        );
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
        <ScreenHeading step={step}>Date your whole collection</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          Already keep a spreadsheet of your plants or accessions? Seal every row as its own record in one go, each with
          a date stamp, as if you had logged them one by one.
        </Typography>
      </Box>
      <Typography variant="body1">
        A CSV or Excel (.xlsx) file, first sheet only, with the column names in the first row. Up to {MAX_ROWS} rows at
        a time.
      </Typography>
      {!keeps && (
        <Alert severity="warning" variant="outlined">
          This browser won&apos;t keep anything after you close it (a private window, or site data is blocked). Each
          record&apos;s key lives in this browser until you save your backup, so open this page in a normal window.
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
        {busy ? 'Reading your file…' : 'Choose a file'}
      </Button>
      {!keeps && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Open this page in a normal browser window to use it.
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
        Your file is read here, in this browser, and isn&apos;t uploaded. For each row, only the details you pick on the
        next screen are saved on {OUR_SERVER}, the same details as logging one plant. Only a fingerprint is dated on{' '}
        {DATED_ON}.
      </Typography>
      {!IS_MAINNET && (
        <Typography variant="body2" color="text.secondary">
          This is a test site: records made here are test data.
        </Typography>
      )}
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
        <ScreenHeading step={step}>Which column is which?</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          We guessed from the column names. Check each one. Only the plant name is needed; columns you leave out are
          never sent.
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
            label={FIELD_LABELS[f]}
            required={f === 'strainName'}
            value={col === null ? '' : String(col)}
            onChange={(e) => setColumn(f, e.target.value)}
            helperText={
              col !== null && sampleOf(sheet, col)
                ? `For example: ${sampleOf(sheet, col)}`
                : f === 'parents'
                  ? 'Two parents in one cell are fine, like “Mother x Father”.'
                  : undefined
            }
            fullWidth
          >
            <MenuItem value="">{f === 'strainName' ? 'Pick a column' : 'Not in my file'}</MenuItem>
            {sheet.headers.map((h, i) => (
              <MenuItem key={i} value={String(i)}>
                {h}
              </MenuItem>
            ))}
          </TextField>
        );
      })}
      <TextField
        label="Bred by, where a row doesn’t say"
        value={mapping.bredByDefault}
        onChange={(e) => onChange({ ...mapping, bredByDefault: e.target.value })}
        helperText="Your name or business, if you bred them. Leave empty if you don’t know."
        fullWidth
      />
      {mapping.columns.dateCreated !== null && (ambiguous || mapping.dateOrder !== 'auto') && (
        <TextField
          select
          label="How are dates written?"
          value={mapping.dateOrder}
          onChange={(e) => onChange({ ...mapping, dateOrder: e.target.value as DateOrder })}
          helperText={
            detected
              ? undefined
              : 'Some dates, like 03/04/2021, could be either. Pick how your file writes them, or they are kept as written.'
          }
          fullWidth
        >
          <MenuItem value="auto">Keep unclear dates as written</MenuItem>
          <MenuItem value="mdy">Month first (03/14/2021)</MenuItem>
          <MenuItem value="dmy">Day first (14/03/2021)</MenuItem>
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
        Next: check the rows
      </Button>
      {!ready && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Pick the column with the plant or line name.
        </Typography>
      )}
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        Pick a different file
      </Button>
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

/** One row as it will be sealed: every field, empty ones said so. */
const RowCard: React.FC<{ row: Pick<PreparedRow, 'line' | 'fields'> }> = ({ row }) => {
  const f: RowFields = row.fields;
  const lines: [string, string][] = [
    ['Plant or line', f.strainName],
    ['Your ID', f.refId],
    ['Species', f.taxon],
    ['Parents', f.parents.map((p) => p.name).join(' × ')],
    ['Bred by', f.bredBy],
    ['Date (your note)', f.dateCreated],
    ['Notes', f.notes],
  ];
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }} data-preview-row={row.line}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Row {row.line}
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
            {v || 'Not given'}
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
  onSeal: (rows: PreparedRow[]) => void;
}> = ({ step, sheet, mapping, onBack, onSeal }) => {
  const records = useRecords();
  const hintId = useId();
  const checked = useMemo(() => checkRows(sheet, mapping, { existing: records }), [sheet, mapping, records]);
  const preview = checked.rows.filter((r) => r.status === 'ready').slice(0, PREVIEW);
  const problems = checked.rows.filter((r) => r.status === 'problem');
  const can = checked.ready > 0 && !checked.blocked;

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>Is this right?</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {plural(checked.ready, 'row')} ready to seal
          {checked.already ? ` · ${checked.already} sealed before, left as they are` : ''}
          {checked.problems ? ` · ${checked.problems} can’t be sealed` : ''}.
        </Typography>
      </Box>
      {checked.blocked && (
        <Alert severity="error" variant="outlined" role="alert">
          {checked.blocked}
        </Alert>
      )}
      {preview.length > 0 && (
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {preview.length === 1 ? 'The first row' : `The first ${preview.length} rows`}, exactly as they will be
            sealed
          </Typography>
          {preview.map((r) => (
            <RowCard key={r.line} row={r} />
          ))}
        </Stack>
      )}
      {checked.ambiguousDates > 0 && (
        <Alert severity="info" variant="outlined">
          {plural(checked.ambiguousDates, 'date')} could be day-first or month-first, so{' '}
          {checked.ambiguousDates === 1 ? 'it is' : 'they are'} kept as written. To change that, go back and pick how
          your file writes dates.
        </Alert>
      )}
      {problems.length > 0 && (
        <Box>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {plural(problems.length, 'row')} can&apos;t be sealed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {problems.length === 1 ? 'It is' : 'They are'} left out. Fix {problems.length === 1 ? 'it' : 'them'} in your
            file and import it again later: rows already sealed are skipped.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }} data-problem-list="">
            {problems.slice(0, LISTED).map((r) => (
              <li key={r.line}>
                <Typography variant="body2">
                  Row {r.line}: {r.problems.join(' ')}
                </Typography>
              </li>
            ))}
          </Box>
          {problems.length > LISTED && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              And {problems.length - LISTED} more. The results file lists every one.
            </Typography>
          )}
        </Box>
      )}
      <Alert icon={<LockIcon />} severity="info" variant="outlined">
        <b>Once sealed, these can&apos;t change.</b> You can add reports and corrections later; a correction is a new
        record that points back to the old one.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        The details above are saved on {OUR_SERVER}, one record per row. Only a fingerprint of each is dated on{' '}
        {DATED_ON}. A date stamp shows the details existed by that date; it doesn&apos;t confirm they are right.
      </Typography>
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!can, hintId)}
        onClick={() => can && onSeal(checked.rows)}
        sx={{ py: 1.6 }}
      >
        {checked.ready > 0 ? `Seal ${plural(checked.ready, 'plant')}` : 'Nothing to seal'}
      </Button>
      {!can && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {checked.blocked ?? 'Every row is either sealed already or can’t be sealed.'}
        </Typography>
      )}
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        Change the columns
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
          {running ? 'Sealing your plants…' : stopped ? 'Sealing paused' : 'Pick up where you stopped'}
        </ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {job.fileName}: {plural(total, 'row')} to seal.
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label="Sealing your plants"
        sx={{ height: 10, borderRadius: 5 }}
      />
      <Typography variant="body1" role="status">
        Sealed {progress.done} of {progress.total}
      </Typography>
      {stopped && (
        <Alert severity="warning" variant="outlined">
          {stopped}
        </Alert>
      )}
      {running ? (
        <Typography variant="body2" color="text.secondary">
          Keep this page open.{' '}
          {kept
            ? 'If it closes, come back to this page: it carries on where it stopped, and never seals a row twice.'
            : 'This browser couldn’t keep the progress: if the page closes, pick the same file again. Rows already sealed are skipped.'}
        </Typography>
      ) : (
        <>
          <Button variant="contained" size="large" fullWidth onClick={() => void run()} sx={{ py: 1.6 }}>
            {stopped ? 'Try again' : 'Carry on sealing'}
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
            Stop here and finish with what&apos;s sealed
          </Button>
        </>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Summary: React.FC<{ step?: string; job: Job; onNext: () => void }> = ({ step, job, onNext }) => {
  const s = jobSummary(job);
  const notSealed = job.rows.filter((r) => r.status === 'problem' || job.outcomes[r.hash]?.state === 'refused');
  const stampsFromHere = REAL_CHAIN && !chainNotReady();
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DoneIcon color="primary" sx={{ fontSize: 40 }} aria-hidden="true" />
        <ScreenHeading step={step}>
          {s.sealed ? `Sealed ${plural(s.sealed, 'plant')}` : 'Nothing new sealed'}
        </ScreenHeading>
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {s.before > 0 && (
          <li>
            <Typography variant="body1">{plural(s.before, 'row')} sealed before, left as they are.</Typography>
          </li>
        )}
        {notSealed.length > 0 && (
          <li>
            <Typography variant="body1">{plural(notSealed.length, 'row')} not sealed:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {notSealed.slice(0, LISTED).map((r) => {
                const o = job.outcomes[r.hash];
                return (
                  <li key={r.line}>
                    <Typography variant="body2">
                      Row {r.line}: {o?.state === 'refused' ? o.reason : r.problems.join(' ')}
                    </Typography>
                  </li>
                );
              })}
            </Box>
          </li>
        )}
        {s.waiting > 0 && (
          <li>
            <Typography variant="body1">
              {plural(s.waiting, 'row')} not sealed yet. Import the file again to seal them.
            </Typography>
          </li>
        )}
      </Box>
      {s.sealed > 0 && (
        <Typography variant="body1" color="text.secondary">
          {stampsFromHere
            ? `Each record's date comes when its batch is dated on ${DATED_ON}. Each plant's key is also date stamped from this browser, a few a day; that starts after your backup.`
            : `Their public date stamp comes when their batch is dated on ${DATED_ON}. Nothing for you to do.`}
        </Typography>
      )}
      <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
        {jobRecordIds(job).length > 0 ? 'Next: save your backup' : 'Next'}
      </Button>
      {jobRecordIds(job).length > 0 && (
        <Typography variant="body2" color="text.secondary">
          Until it&apos;s saved and checked, the new records&apos; keys are only in this browser.
        </Typography>
      )}
    </Stack>
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

const Finished: React.FC<{ job: Job; onAnother: () => void }> = ({ job, onAnother }) => {
  const ids = useMemo(() => jobRecordIds(job), [job]);
  const stampsFromHere = REAL_CHAIN && !chainNotReady();
  const queue = useKeyStampQueue(ids, stampsFromHere);
  const keys = useRecordKeys();
  const s = jobSummary(job);
  // A key stamp that landed after the backup was checked isn't in that backup.
  const newSinceBackup = ids.filter((id) => {
    const k = keys[id];
    return k?.anchor && k.backedUpAt !== undefined && (k.anchor.anchoredAt ?? Number.MAX_SAFE_INTEGER) > k.backedUpAt;
  }).length;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DoneIcon color="primary" sx={{ fontSize: 40 }} aria-hidden="true" />
        <ScreenHeading>Your collection is sealed</ScreenHeading>
      </Stack>
      <Typography variant="body1">
        {plural(s.sealed, 'new record')}
        {s.before ? `, ${s.before} sealed before` : ''}
        {s.notSealed + s.waiting ? `, ${s.notSealed + s.waiting} not sealed` : ''}.
      </Typography>
      <Box>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => downloadText(resultsCsv(job, window.location.origin), resultsFileName(job.fileName))}
          sx={{ py: 1.6 }}
        >
          Download the results (CSV)
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Your rows as they were, each with its record ID, fingerprint and a link anyone can open to check it. Made
          here; nothing is uploaded.
        </Typography>
      </Box>

      {stampsFromHere && ids.length > 0 ? (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            Key date stamps: {queue.stamped} of {queue.total}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={queue.total ? Math.round((100 * queue.stamped) / queue.total) : 0}
            aria-label="Key date stamps"
            sx={{ height: 8, borderRadius: 4, my: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            Each plant&apos;s key is date stamped from this browser, so you can prove you hold it later. The free fee
            service dates only a few a day from each browser, so these arrive over the coming days while this page is
            open. Each plant&apos;s own page can do its stamp too.
          </Typography>
          <Typography variant="body2" role="status" sx={{ mt: 1 }}>
            {queue.stopped
              ? ''
              : queue.current
                ? `Date stamping ${queue.current.name}…${queue.current.progress ? ` ${queue.current.progress}` : ''}`
                : queue.pauseUntil
                  ? `Waiting for the fee service. Next try: ${localStamp(queue.pauseUntil)}.`
                  : queue.stamped === queue.total
                    ? 'All done.'
                    : ''}
          </Typography>
          {queue.stopped && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ mt: 1 }}
              action={
                <Button color="inherit" onClick={queue.resume} sx={{ minHeight: 44 }}>
                  Go on
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
                  Save it
                </Button>
              }
            >
              {plural(newSinceBackup, 'key date stamp')} landed after your backup. Save a new backup to keep{' '}
              {newSinceBackup === 1 ? 'it' : 'them'}.
            </Alert>
          )}
        </Box>
      ) : (
        ids.length > 0 && (
          <Typography variant="body1" color="text.secondary">
            Their public date stamp comes when their batch is dated on {DATED_ON}. Each plant&apos;s page shows when
            that has happened. Nothing for you to do.
          </Typography>
        )
      )}

      <Typography variant="body2" color="text.secondary">
        A date stamp shows the details existed by that date. It doesn&apos;t confirm they are right.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button component={RouterLink} to="/records" variant="outlined" size="large" sx={{ minHeight: 48, flex: 1 }}>
          Go to your plants
        </Button>
        <Button variant="text" size="large" onClick={onAnother} sx={{ minHeight: 48, flex: 1 }}>
          Import another file
        </Button>
      </Stack>
    </Stack>
  );
};
