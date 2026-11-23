// The lab's tools for lab results v2 (/lab/results; veilcore/lab-result.ts, lab-result-sign.ts):
// sign one result, or a spreadsheet's worth, each bound to the record its sample came from.
// Each is kept as a record the lab holds (dated in the next hourly batch) and handed over as a
// file. Behind the same switch as every lab signature (LAB_SIGNING_ENABLED, on on mainnet too).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { AppHeader } from '../AppHeader';
import { OPEN_SIGNING_KEY_EVENT } from '../AttesterSetup';
import { LAB_SIGNING_ENABLED, viabilityNotRead } from '../../config/network';
import { loadAttester } from '../../veilcore/attester-keys';
import { claimsKeyFor } from '../../veilcore/claims-key';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import {
  RESULT_KINDS,
  resultsFile,
  unboundToName,
  type ProblemCode,
  type MarkOpening,
  type ViabilityResult,
} from '../../veilcore/lab-result';
import { emptyDraft, today, tryDraft, type ResultDraft } from '../../veilcore/lab-result-draft';
import {
  CSV_KINDS,
  CSV_MAX_ROWS,
  alreadySigned,
  csvTemplate,
  readResultsCsv,
  resultsSummaryCsv,
  type CsvDefaults,
  type CsvKind,
  type CsvRow,
  type SignedBefore,
} from '../../veilcore/lab-result-csv';
import type { SignedResult } from '../../veilcore/lab-result-sign';
import { decodeText } from '../../veilcore/bulk-import';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import type { Translator } from '../../i18n/translate';
import { ResultForm, type MyResult } from './ResultForm';
import { download, resultFileNames } from './download';
import { ResultFacts, callWords, kindWords } from './ResultFacts';
import { errorReason } from '../../i18n/error-words';

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

type CsvOk = Extract<CsvRow, { ok: true }>;
type CsvBad = Extract<CsvRow, { ok: false }>;

/**
 * What was signed in the last run, the sequence files a mark result left to keep, the rows not
 * signed, and the rows skipped as already signed in this browser (with the code each has).
 */
type Done = {
  readonly results: readonly SignedResult[];
  readonly openings: ReadonlyMap<string, MarkOpening>;
  readonly unsigned?: readonly CsvBad[];
  readonly skipped?: readonly { readonly row: CsvOk; readonly code: string }[];
};

/** Names in a list, the language's way (column names stay as the file has them). */
const listOf = (tr: Translator, names: readonly string[]) => names.join(tr.lang === 'ja' ? '、' : ', ');

/** Everything wrong with a row, in one line: the empty cells first, then each other problem once. */
export const rowProblems = (tr: Translator, r: CsvBad): string => {
  const missing = [...new Set(r.problems.filter((p) => p.missing).map((p) => p.column))];
  const other = [
    ...new Set(
      r.problems
        .filter((p) => !p.missing)
        .map((p) => tr.t(`app.lr.problem.${p.code === 'result' ? 'csvResult' : p.code}` as AppKey)),
    ),
  ];
  return [...(missing.length ? [tr.t('app.lr.csv.missing', { cols: listOf(tr, missing) })] : []), ...other].join(
    tr.lang === 'ja' ? '' : ' ',
  );
};

/**
 * Leaving the page with a mark's sequence file not yet saved loses it for good. Closing or
 * reloading the tab asks (beforeunload); so does any link in the app, the header's included: the
 * click is caught before the router sees it, and goes ahead only if the person says so.
 */
export const useLeaveGuard = (on: boolean, question: string) => {
  useEffect(() => {
    if (!on) return;
    const stop = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a || a.hasAttribute('download')) return;
      if (!window.confirm(question)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', stop);
    window.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', stop);
      window.removeEventListener('click', click, true);
    };
  }, [on, question]);
};

const SignedPanel: React.FC<{ done: Done; onAgain: () => void }> = ({ done, onAgain }) => {
  const tr = useT();
  const { t } = tr;
  const ok = done.results.filter((r): r is Extract<SignedResult, { ok: true }> => r.ok);
  const bad = done.results.filter((r): r is Extract<SignedResult, { ok: false }> => !r.ok);
  const names = resultFileNames(ok.map((r) => r.bundle.statement));
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const unsavedMarks = [...done.openings.keys()].filter((c) => !saved.has(c));
  useLeaveGuard(unsavedMarks.length > 0, t('app.lr.tools.markLeave'));
  const one = (i: number) => download(JSON.stringify(ok[i].bundle, null, 2), names[i]);
  const zipAll = async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const files: Record<string, Uint8Array> = {};
    ok.forEach((r, i) => (files[names[i]] = strToU8(JSON.stringify(r.bundle, null, 2))));
    download(zipSync(files), 'lab-results-one-file-each.zip', 'application/zip');
  };
  const notBound = ok.filter((r) => !r.bound);
  const withdrawFailed = ok.filter((r) => r.withdrew && !r.withdrew.ok);
  return (
    <Stack spacing={2} data-lab-signed-run="">
      <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
        {ok.length === 1 ? t('app.lr.tools.signedOne') : t('app.lr.tools.signedMany', { n: String(ok.length) })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('app.lr.tools.signedText')}
      </Typography>
      {[...done.openings.entries()].map(([code, o]) => (
        <Alert
          key={`m${code}`}
          severity={saved.has(code) ? 'success' : 'warning'}
          variant="outlined"
          data-mark-keep={saved.has(code) ? 'saved' : 'unsaved'}
        >
          {t('app.lr.tools.markKeep')}
          <Box>
            <Button
              size="small"
              variant="contained"
              sx={{ mt: 1, minHeight: 40 }}
              onClick={() => {
                download(JSON.stringify(o, null, 2), `mark-sequence-${code.slice(0, 12)}.json`);
                setSaved(new Set([...saved, code]));
              }}
              data-mark-download=""
            >
              {t('app.lr.tools.markDownload')}
            </Button>
          </Box>
        </Alert>
      ))}
      {ok.length === 1 && <ResultFacts statement={ok[0].bundle.statement} code={ok[0].code} />}
      {ok.length > 1 && (
        <Stack spacing={0.75}>
          {ok.map((r, i) => (
            <Stack key={r.code} direction="row" spacing={1} sx={{ alignItems: 'center' }} data-signed-row="">
              <Typography variant="body2" sx={{ flex: 1, overflowWrap: 'anywhere' }}>
                {r.bundle.statement.accession} · {r.bundle.statement.sampleId}
                {r.bundle.statement.kind === 'pathogen'
                  ? ` · ${(r.bundle.statement.result as { target: string }).target}`
                  : ''}{' '}
                · <b>{callWords(r.bundle.statement, tr)}</b>
              </Typography>
              <Button size="small" onClick={() => one(i)} sx={{ minHeight: 40, flexShrink: 0 }} data-row-download="">
                {t('app.lr.tools.downloadOne')}
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
      {notBound.length > 0 && (
        <Alert severity="warning" variant="outlined" data-not-bound={notBound.length}>
          {t('app.lr.tools.notBound', { n: String(notBound.length), error: notBound[0].bindError ?? '' })}
        </Alert>
      )}
      {ok.length > 0 && notBound.length === 0 && (
        <Alert severity="success" variant="outlined">
          {t('app.lr.tools.bound')}
        </Alert>
      )}
      {withdrawFailed.map((r) => (
        <Alert key={`w${r.code}`} severity="error" variant="outlined" data-withdraw-failed="">
          {t('app.lr.tools.withdrawFailed', {
            code: short(r.withdrew!.code),
            error: r.withdrew!.error ?? '',
          })}
        </Alert>
      ))}
      {bad.map((r, i) => (
        <Alert key={`x${i}`} severity="error" variant="outlined">
          {t('app.lr.tools.rowFailed', { problem: t(`app.lr.problem.${r.code}` as AppKey) })}
          {r.code === 'unreadable' ? ` ${r.message}` : ''}
        </Alert>
      ))}
      {(done.unsigned?.length ?? 0) > 0 && (
        <Alert severity="warning" variant="outlined" data-unsigned={done.unsigned!.length}>
          {t('app.lr.tools.unsigned', { n: String(done.unsigned!.length) })}
        </Alert>
      )}
      {(done.skipped?.length ?? 0) > 0 && (
        <Alert severity="info" variant="outlined" data-skipped={done.skipped!.length}>
          {tr.tp('app.lr.tools.skipped', done.skipped!.length)}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {ok.length === 1 && (
          <Button variant="contained" onClick={() => one(0)} sx={{ minHeight: 44 }} data-result-download="">
            {t('app.lr.tools.download')}
          </Button>
        )}
        {ok.length > 1 && (
          <Button variant="contained" onClick={() => void zipAll()} sx={{ minHeight: 44 }} data-result-download="">
            {t('app.lr.tools.downloadAll')}
          </Button>
        )}
        {ok.length > 1 && (
          <Button
            variant="outlined"
            onClick={() =>
              download(
                JSON.stringify(resultsFile(ok.map((r) => r.bundle)), null, 2),
                'lab-results-archive-not-to-send.json',
              )
            }
            sx={{ minHeight: 44 }}
            data-result-archive=""
          >
            {t('app.lr.tools.archive')}
          </Button>
        )}
        {(ok.length > 0 || (done.unsigned?.length ?? 0) > 0 || (done.skipped?.length ?? 0) > 0) && (
          <Button
            variant="outlined"
            onClick={() =>
              download(
                resultsSummaryCsv([
                  ...ok.map((r) => ({ statement: r.bundle.statement, code: r.code, recordId: r.recordId })),
                  ...(done.unsigned ?? []).map((u) => ({
                    unsigned: {
                      sampleId: u.sampleId,
                      accession: u.accession,
                      target: u.target,
                      why: `row ${u.line}: ${rowProblems(tr, u)}`,
                    },
                  })),
                  ...(done.skipped ?? []).map((k) => ({ already: k.row.statement, code: k.code })),
                ]),
                'lab-results-summary.csv',
                'text/csv',
              )
            }
            sx={{ minHeight: 44 }}
          >
            {t('app.lr.tools.summary')}
          </Button>
        )}
        <Button onClick={onAgain} disabled={unsavedMarks.length > 0} sx={{ minHeight: 44 }} data-sign-another="">
          {t('app.lr.tools.another')}
        </Button>
      </Stack>
      {unsavedMarks.length > 0 && (
        <Typography variant="body2" color="warning.main">
          {t('app.lr.tools.markFirst')}
        </Typography>
      )}
    </Stack>
  );
};

const runSign = async (
  inputs: Parameters<typeof import('../../veilcore/lab-result-sign').signResults>[1],
  mine: Parameters<typeof import('../../veilcore/lab-result-sign').signResults>[2],
  onProgress: (d: number, n: number) => void,
) => {
  const attester = loadAttester();
  if (!attester) throw new Error('no signing key');
  const { signResults } = await import('../../veilcore/lab-result-sign');
  return signResults(attester, inputs, mine, onProgress);
};

const OneResult: React.FC<{
  mine: readonly MyResult[];
  records: ReturnType<typeof useRecords>;
  onDone: (d: Done) => void;
}> = ({ mine, records, onDone }) => {
  const tr = useT();
  const { t } = tr;
  const [draft, setDraft] = useState<ResultDraft>(() => emptyDraft('pathogen'));
  const [problem, setProblem] = useState<{ code: ProblemCode; message: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const sign = async () => {
    setError(undefined);
    const attester = loadAttester();
    const d = tryDraft(draft, attester?.displayName ?? '');
    if (!d.ok) return setProblem({ code: d.code, message: d.message });
    setProblem(undefined);
    setBusy(true);
    try {
      const results = await runSign([d.input], records, () => undefined);
      const first = results[0];
      if (first && !first.ok) setProblem({ code: first.code, message: first.message });
      if (first?.ok) onDone({ results, openings: new Map(d.opening ? [[first.code, d.opening]] : []) });
    } catch (e) {
      setError(t('app.lr.tools.failed', { error: errorReason(e, tr) }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack spacing={2}>
      <ResultForm draft={draft} onDraft={setDraft} kinds={RESULT_KINDS} mine={mine} problem={problem?.code} />
      {problem && (
        <Alert severity="warning" variant="outlined" data-result-problem={problem.code}>
          {t(`app.lr.problem.${problem.code}` as AppKey)}
          {problem.code === 'unreadable' ? ` ${problem.message}` : ''}
        </Alert>
      )}
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      <Button variant="contained" size="large" disabled={busy} onClick={() => void sign()} sx={{ py: 1.4 }}>
        {busy ? t('app.lr.form.signing') : t('app.lr.form.sign')}
      </Button>
    </Stack>
  );
};

/** What the help says each kind's rows need: the column, and what goes in it. */
const neededHelp = (kind: CsvKind): readonly { cols: string; what: AppKey }[] => [
  { cols: 'subject', what: 'app.lr.csv.col.subject' },
  { cols: 'sample id', what: 'app.lr.csv.col.sampleId' },
  { cols: 'accession', what: 'app.lr.csv.col.accession' },
  { cols: 'method, method version', what: 'app.lr.csv.col.typed' },
  { cols: 'result', what: `app.lr.csv.col.result.${kind}` },
  ...(kind === 'pathogen' ? [{ cols: 'target, sample type', what: 'app.lr.csv.col.typed' as AppKey }] : []),
  ...(kind === 'match' ? [{ cols: 'other', what: 'app.lr.csv.col.other' as AppKey }] : []),
  ...(kind === 'lineage' ? [{ cols: 'parent 1', what: 'app.lr.csv.col.parent' as AppKey }] : []),
];

/** At most this many row numbers are listed in the "already signed" warning; the rest as "…". */
const ROWS_LISTED = 12;

const CsvResults: React.FC<{
  records: ReturnType<typeof useRecords>;
  /** Results this lab's key already signed in this browser, to find a row signed twice. */
  signedBefore: readonly SignedBefore[];
  onDone: (d: Done) => void;
}> = ({ records, signedBefore, onDone }) => {
  const tr = useT();
  const { t } = tr;
  const pick = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<CsvKind>('pathogen');
  const [defaults, setDefaults] = useState<CsvDefaults>({
    method: '',
    methodVersion: '',
    panel: '',
    panelVersion: '',
    tested: today(),
    target: 'HLVd',
    sampleType: '',
  });
  const [text, setText] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [error, setError] = useState<string>();
  // Rows already signed in this browser are skipped unless the lab says to sign them again.
  const [signAgain, setSignAgain] = useState(false);
  const read = useMemo(
    () => (text === undefined ? undefined : readResultsCsv(text, kind, defaults)),
    [text, kind, defaults],
  );
  const rows: CsvRow[] = read && !('error' in read) ? read.rows : [];
  const ready = rows.filter((r): r is CsvOk => r.ok);
  const bad = rows.filter((r): r is CsvBad => !r.ok);
  const before = useMemo(() => alreadySigned(rows, signedBefore), [rows, signedBefore]);
  const toSign = signAgain ? ready : ready.filter((r) => !before.has(r.line));
  const skipped = signAgain
    ? []
    : ready.filter((r) => before.has(r.line)).map((row) => ({ row, code: before.get(row.line)! }));
  const def = (k: keyof CsvDefaults, label: AppKey, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField
      label={t(label)}
      value={defaults[k]}
      onChange={(e) => setDefaults({ ...defaults, [k]: e.target.value })}
      fullWidth
      size="small"
      slotProps={{ htmlInput: { maxLength: 200, 'data-default': k } }}
      {...extra}
    />
  );
  const sign = async () => {
    setBusy(true);
    setError(undefined);
    const name = loadAttester()?.displayName ?? '';
    try {
      const results = await runSign(
        toSign.map((r) => ({ labName: name, statement: r.statement })),
        records,
        (done, total) => setProgress({ done, total }),
      );
      onDone({ results, openings: new Map(), unsigned: bad, skipped });
    } catch (e) {
      setError(t('app.lr.tools.failed', { error: errorReason(e, tr) }));
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };
  const dupeLines = [...before.keys()];
  return (
    <Stack spacing={2} data-lab-csv="">
      <Typography variant="body2" color="text.secondary">
        {t('app.lr.csv.intro')}
      </Typography>
      <TextField
        select
        label={t('app.lr.csv.kind')}
        value={kind}
        onChange={(e) => setKind(e.target.value as CsvKind)}
        fullWidth
      >
        {CSV_KINDS.map((k) => (
          <MenuItem key={k} value={k}>
            {kindWords(k, tr)}
          </MenuItem>
        ))}
      </TextField>
      <Box data-csv-help={kind}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('app.lr.csv.needs')}
        </Typography>
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
          {neededHelp(kind).map((c) => (
            <Typography key={c.cols} component="li" variant="body2" data-csv-needs={c.cols}>
              <Box component="code" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {c.cols}
              </Box>
              {tr.lang === 'ja' ? '：' : ': '}
              {t(c.what)}
            </Typography>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {t(`app.lr.csv.also.${kind}`)} {t('app.lr.csv.templateHas')}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('app.lr.csv.defaults')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {def('method', 'app.lr.form.method')}
        {def('methodVersion', 'app.lr.form.methodVersion')}
      </Stack>
      {kind !== 'pathogen' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {def('panel', 'app.lr.form.panel')}
          {def('panelVersion', 'app.lr.form.panelVersion')}
        </Stack>
      )}
      {kind === 'pathogen' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {def('target', 'app.lr.form.target')}
          {def('sampleType', 'app.lr.form.sampleType')}
        </Stack>
      )}
      {def('tested', 'app.lr.form.tested', { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" onClick={() => pick.current?.click()} sx={{ minHeight: 44 }}>
          {t('app.lr.csv.choose')}
        </Button>
        <Button
          onClick={() => download(csvTemplate(kind), `veilcore-${kind}-results-template.csv`, 'text/csv')}
          sx={{ minHeight: 44 }}
          data-csv-template=""
        >
          {t('app.lr.csv.template')}
        </Button>
      </Stack>
      <input
        ref={pick}
        type="file"
        accept=".csv,text/csv,text/plain"
        hidden
        data-csv-input=""
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          setSignAgain(false);
          if (f) void f.arrayBuffer().then((b) => setText(decodeText(new Uint8Array(b))));
        }}
      />
      {read && 'error' in read && (
        <Alert severity="warning" variant="outlined" data-csv-refused={read.error}>
          {read.error === 'tooMany'
            ? t('app.lr.csv.tooMany', {
                rows: String(read.rows),
                n: String(CSV_MAX_ROWS),
                next: String(read.lastLine + 1),
              })
            : read.error === 'columns'
              ? t('app.lr.csv.columns', { cols: listOf(tr, read.missing) })
              : t('app.lr.csv.empty')}
        </Alert>
      )}
      {read && !('error' in read) && (
        <>
          <Typography variant="body1" data-csv-ready={ready.length}>
            {bad.length === 0
              ? t('app.lr.csv.readyAll', { ok: String(ready.length) })
              : t('app.lr.csv.ready', { ok: String(ready.length), bad: String(bad.length) })}
          </Typography>
          {bad.length > 0 && (
            <Stack spacing={0.5} data-csv-problems={bad.length}>
              {bad.map((r) => (
                <Typography key={r.line} variant="body2" color="warning.main" data-csv-bad={r.line}>
                  {t('app.lr.csv.row', { line: String(r.line), problem: rowProblems(tr, r) })}
                </Typography>
              ))}
            </Stack>
          )}
          {dupeLines.length > 0 && (
            <Alert severity="warning" variant="outlined" data-csv-dupes={dupeLines.length}>
              {tr.tp('app.lr.csv.dupes', dupeLines.length, {
                rows:
                  listOf(tr, dupeLines.slice(0, ROWS_LISTED).map(String)) + (dupeLines.length > ROWS_LISTED ? '…' : ''),
              })}
              <RadioGroup
                value={signAgain ? 'again' : 'skip'}
                onChange={(e) => setSignAgain(e.target.value === 'again')}
                sx={{ mt: 1 }}
              >
                <FormControlLabel
                  value="skip"
                  control={<Radio size="small" />}
                  label={t('app.lr.csv.dupesSkip')}
                  data-csv-dupes-skip=""
                />
                <FormControlLabel
                  value="again"
                  control={<Radio size="small" />}
                  label={t('app.lr.csv.dupesAgain')}
                  data-csv-dupes-again=""
                />
              </RadioGroup>
            </Alert>
          )}
          {toSign.length > 0 ? (
            <Button variant="contained" size="large" disabled={busy} onClick={() => void sign()} sx={{ py: 1.4 }}>
              {busy ? t('app.lr.form.signing') : tr.tp('app.lr.csv.sign', toSign.length)}
            </Button>
          ) : (
            ready.length > 0 && (
              <Typography variant="body2" data-csv-nothing-new="">
                {t('app.lr.csv.nothingNew')}
              </Typography>
            )
          )}
        </>
      )}
      {progress && (
        <Box role="status">
          <LinearProgress variant="determinate" value={(100 * progress.done) / Math.max(1, progress.total)} />
          <Typography variant="body2">
            {t('app.lr.csv.progress', { done: String(progress.done), total: String(progress.total) })}
          </Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

/** Results this lab signed and kept whose name couldn't be posted yet (rate limit, offline): post it now. */
const NameUnbound: React.FC<{ records: readonly StrainRecord[] }> = ({ records }) => {
  const { t } = useT();
  const unbound = unboundToName(records);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  if (unbound.length === 0 && !note) return null;
  const go = async () => {
    const attester = loadAttester();
    if (!attester) return;
    setBusy(true);
    try {
      const { nameUnbound } = await import('../../veilcore/lab-result-sign');
      const out = await nameUnbound(attester, unbound);
      setNote(
        out.left
          ? t('app.lr.tools.nameLeft', { named: String(out.named), left: String(out.left), error: out.error ?? '' })
          : t('app.lr.tools.nameDone', { named: String(out.named) }),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ mb: 1.5 }} data-name-unbound={unbound.length}>
      {unbound.length > 0 && (
        <Button variant="outlined" disabled={busy} onClick={() => void go()} sx={{ minHeight: 44 }}>
          {t('app.lr.tools.nameRetry', { n: String(unbound.length) })}
        </Button>
      )}
      {note && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {note}
        </Typography>
      )}
    </Box>
  );
};

export const LabResultsPage: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const records = useRecords();
  const [tab, setTab] = useState<'one' | 'csv'>('one');
  const [done, setDone] = useState<Done>();
  const attester = loadAttester();
  const myKey = useMemo(() => (attester ? claimsKeyFor(attester.keypair.privateKey).keyText : undefined), [attester]);
  const mineRecords = records.filter((r) => r.labResult && r.labSignature && r.labSignature.key === myKey);
  const signedBefore: SignedBefore[] = useMemo(
    () => mineRecords.map((r) => ({ statement: r.labResult!.statement, code: r.labSignature!.record })),
    [records, myKey],
  );
  const mine: MyResult[] = mineRecords.map((r) => {
    const s = r.labResult!.statement;
    const v = s.kind === 'viability' ? (s.result as ViabilityResult) : undefined;
    // Where viability results are not read (mainnet), the lab's own list names one and says no more.
    if (viabilityNotRead({ kind: s.kind }))
      return { code: r.labSignature!.record, label: `${s.accession} · ${s.sampleId} · ${kindWords(s.kind, tr)}` };
    return {
      code: r.labSignature!.record,
      label: `${s.accession} · ${s.sampleId} · ${kindWords(s.kind, tr)}${v ? ` · ${v.batch} · ${t(`app.lr.stage.${v.stage}` as AppKey)}` : ''} · ${callWords(s, tr)}`,
      ...(v?.stage === 'before' ? { beforeSample: { batch: v.batch } } : {}),
    };
  });

  const body = !LAB_SIGNING_ENABLED ? (
    <Alert severity="info" variant="outlined">
      {t('app.lr.tools.testOnly')}
    </Alert>
  ) : !attester ? (
    <Alert severity="info" variant="outlined">
      {t('app.lr.tools.setUp')}{' '}
      <Button size="small" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SIGNING_KEY_EVENT))}>
        {t('app.plant.next.setup.action')}
      </Button>
    </Alert>
  ) : done ? (
    <SignedPanel done={done} onAgain={() => setDone(undefined)} />
  ) : (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v as 'one' | 'csv')} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab value="one" label={t('app.lr.tools.single')} sx={{ minHeight: 48 }} />
        <Tab value="csv" label={t('app.lr.tools.csv')} sx={{ minHeight: 48 }} />
      </Tabs>
      {tab === 'one' ? (
        <OneResult mine={mine} records={records} onDone={setDone} />
      ) : (
        <CsvResults records={records} signedBefore={signedBefore} onDone={setDone} />
      )}
    </>
  );

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }} data-lab-results-page="">
      <AppHeader />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 1, overflowWrap: 'anywhere' }}>
            {t('app.lr.tools.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('app.lr.tools.intro')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <RouterLink to="/check-lab-result">{t('app.lr.tools.check')}</RouterLink>
          </Typography>
        </Box>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>{body}</Paper>
        {LAB_SIGNING_ENABLED && attester && (
          <Paper sx={{ p: { xs: 2, md: 3 } }} data-my-results="">
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t('app.lr.tools.yours')}
            </Typography>
            <NameUnbound records={mineRecords} />
            {mineRecords.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('app.lr.tools.none')}
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {mineRecords.slice(0, 200).map((r, i) => (
                  <Typography key={r.id} variant="body2">
                    <RouterLink to={`/record/${r.id}`}>{mine[i].label}</RouterLink>{' '}
                    <span style={{ opacity: 0.7 }}>{short(r.labSignature!.record)}</span>
                  </Typography>
                ))}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
};
