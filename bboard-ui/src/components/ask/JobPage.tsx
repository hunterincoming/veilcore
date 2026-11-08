// "Do it for me": a job's page (/ask/job/:id). One finished result to check, phone first
// (design v2, 3):
//   1. Only you can answer (first: the only part to act on);
//   2. What I made, one line per item;
//   3. When you approve: what can't be undone, and what goes public, folded;
//   4. the backup, when new keys need it (a checked file);
//   5. a bar that stays at the bottom: Approve, Change something, Discard. Approve says what is
//      left ("Answer 2 questions to approve") and stays off until "Can't be undone" has been seen.
// Approve sends the hash of the plan this tab drew (ask-job/store.ts approveJob). Opened from a
// link rather than from Ask or Home, the job is shown read-only. No Ask bubble here
// (AskLauncher.tsx). Any name the other side wrote is plain text marked "named by them".
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControlLabel,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { ScreenHeading } from '../flow/FlowFrame';
import { BackupStep } from '../flow/BackupStep';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';
import { useT, type Translator } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { heldLicense } from '../../veilcore/held-licenses';
import { reportLines } from '../../veilcore/royalty-ledger';
import { currencyOf, ruleOf, offspringOf, unitLabel } from '../../veilcore/royalty-terms';
import { sumAmounts, currencyDigits } from '../../veilcore/money';
import type { LicenseTerms } from '../../veilcore/licenses';
import { localStamp } from '../../veilcore/time';
import { childNames, suggestTags } from '../../ask/batch';
import { HANDOFF_STATE_KEY } from '../../ask/handoff';
import { approveJob, discardJob, getJob, onJobsChange, planHash, type Job, type Step } from '../../ask-job/store';
import {
  attachFile,
  backupDone,
  batchPlanOf,
  changeBatch,
  heldIds,
  questionsOf,
  setFigures,
  stampTomorrow,
  type Prepared,
} from '../../ask-job/prepare';
import { reportIndex, tryAgain } from '../../ask-job/run';
import { runnerTick } from '../../ask-job/start';
import { JOB_STATE_KEY, jobWords } from '../../ask-job/words';

/** A job's page: the result to check while it waits for approval, its progress after. */
export const JobPage: React.FC = () => {
  const { id = '' } = useParams();
  const loc = useLocation();
  const fromApp = (loc.state as Record<string, unknown> | null)?.[JOB_STATE_KEY] === id;
  const [job, setJob] = useState<Job | undefined | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      void getJob(id).then((j) => {
        if (live) setJob(j);
      });
    load();
    const off = onJobsChange(load);
    return () => {
      live = false;
      off();
    };
  }, [id]);
  const { t } = useT();
  return (
    <Box>
      <AppHeader />
      <Box sx={{ maxWidth: 640, mx: 'auto' }} data-job-page={job ? job.state : job === null ? 'loading' : 'gone'}>
        {job === null ? null : !job ? (
          <Alert severity="info" variant="outlined">
            {t('app.job.no.gone')}
          </Alert>
        ) : job.state === 'ready' ? (
          <JobResult job={job} fromApp={fromApp} />
        ) : (
          <JobProgress job={job} />
        )}
      </Box>
    </Box>
  );
};

const Block: React.FC<React.PropsWithChildren<{ title: string; data: string; innerRef?: React.Ref<HTMLElement> }>> = ({
  title,
  data,
  children,
  innerRef,
}) => (
  <Box component="section" ref={innerRef} data-job-block={data} aria-label={title}>
    <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
    <Stack spacing={1}>{children}</Stack>
  </Box>
);

const Line: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Typography component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
    {children}
  </Typography>
);

const nameOf = (records: readonly StrainRecord[], id: string | undefined): string =>
  (id && records.find((r) => r.id === id)?.strainName) || '';

/** The title a job is shown under. */
const titleOf = (job: Job, records: readonly StrainRecord[], tr: Translator): string => {
  const s = job.spec;
  if (job.kind === 'batch' && s)
    return s.preset === 'clones'
      ? tr.tp('app.job.title.clones', s.count, { name: nameOf(records, job.refs.parentId) })
      : tr.tp('app.job.title.offspring', s.count, {
          name: nameOf(records, job.refs.damId) || nameOf(records, job.refs.sireId) || (s.sireCode ?? ''),
        });
  if (job.kind === 'import') return tr.t('app.job.title.import');
  if (job.kind === 'due') return tr.tp('app.job.title.due', job.refs.reports?.length ?? 0);
  return tr.t('app.job.title.ready', { name: nameOf(records, job.refs.recordId) });
};

/** A report's figures as the sheet holds them while they are typed. */
type Draft = { quantity: string; offspring: string; nothing: boolean };

/** What a report comes to from its figures (before any top-up to a yearly minimum). */
const owedOf = (terms: LicenseTerms, type: string, from: string, d: Draft | undefined): string | undefined =>
  d
    ? reportLines(
        terms,
        d.nothing ? { quantity: '0', offspring: '0' } : { quantity: d.quantity || '0', offspring: d.offspring || '0' },
        {
          type,
          periodFrom: from,
        },
      )?.total
    : undefined;

const JobResult: React.FC<{ job: Job; fromApp: boolean }> = ({ job: latest, fromApp }) => {
  // What this tab drew stays on screen: a change made in another tab is said, never swapped in
  // under the person's thumb. Approve sends the hash of what is shown.
  const [job, setShown] = useState(latest);
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const ownHashes = useRef(new Set<string>([latest.hash]));
  useEffect(() => {
    if (latest.hash === job.hash) return;
    if (ownHashes.current.has(latest.hash)) setShown(latest);
    else setChangedElsewhere(true);
  }, [latest.hash]);
  const tr = useT();
  const { t, tp } = tr;
  const navigate = useNavigate();
  const records = useRecords();
  useRecordKeys();
  const words = useMemo(() => jobWords(tr), [tr]);
  const [error, setError] = useState<string>();
  const [detail, setDetail] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [backupTick, setBackupTick] = useState(0);
  // The backup step stays on screen until its own finish button, so its check is seen.
  const [inBackup, setInBackup] = useState(() => job.backupNeeded && !backupDone(job));
  const permanent = useRef<HTMLElement>(null);
  // The hash of exactly what this tab draws: what Approve sends.
  const rendered = planHash(job);
  void backupTick;
  const questions = questionsOf(job, words);
  const readOnly = !fromApp;

  useEffect(() => {
    const el = permanent.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setSeen(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const refusal = (r: Prepared) => {
    if ('job' in r) {
      ownHashes.current.add(r.job.hash);
      setShown(r.job);
    }
    if ('refused' in r) {
      setError(t(`app.job.no.${r.refused}` as AppKey, { n: r.words ?? '' }));
      setDetail(r.words && r.refused !== 'tooManyReports' ? r.words : undefined);
    } else {
      setError(undefined);
      setDetail(undefined);
    }
  };
  const act = async (f: () => Promise<Prepared | void>) => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      const r = await f();
      if (r) refusal(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ---- what each kind of job shows ----
  const plan = job.kind === 'batch' ? batchPlanOf(job, words) : undefined;
  const ids = heldIds(job);
  const count = job.kind === 'batch' ? (job.spec?.count ?? 0) : job.kind === 'import' ? (job.sheet?.ready ?? 0) : 0;
  const recordName = nameOf(records, job.refs.recordId);
  const reports = job.refs.reports ?? [];
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      reports.map((_, i) => {
        const f = job.figures?.[`report${i}`];
        return [`report${i}`, { quantity: f?.quantity ?? '', offspring: f?.offspring ?? '', nothing: !!f?.nothing }];
      }),
    ),
  );
  const totals = useMemo(() => {
    const by = new Map<string, string[]>();
    reports.forEach((ref, i) => {
      const h = heldLicense(ref.inviteId);
      if (!h?.agreement) return;
      const terms = h.agreement.terms as unknown as LicenseTerms;
      const owed = owedOf(terms, h.agreement.type, ref.periodFrom, job.figures?.[`report${i}`] as Draft | undefined);
      const c = currencyOf(terms);
      if (owed) by.set(c, [...(by.get(c) ?? []), owed]);
    });
    return [...by.entries()].map(([c, list]) => `${c} ${sumAmounts(list, currencyDigits(c)) ?? ''}`).join(' + ');
  }, [job]);

  const approveLabel =
    job.kind === 'batch' || job.kind === 'import'
      ? tp('app.job.btn.records', count)
      : job.kind === 'due'
        ? tp('app.job.btn.reports', reports.length, { total: totals || '0' })
        : job.steps.length
          ? t('app.job.btn.stamp', { name: recordName })
          : t('app.job.btn.ready');
  const empty = (job.kind === 'batch' || job.kind === 'import') && ids.length === 0 && !questions.includes('file');
  const canApprove = !readOnly && questions.length === 0 && seen && !busy && !empty;
  const left = questions.length
    ? tp('app.job.left.questions', questions.length)
    : !seen
      ? t('app.job.left.scroll')
      : t('app.job.left.ready');

  const approve = () =>
    act(async () => {
      const r = await approveJob(job.id, rendered);
      if ('refused' in r) return { refused: r.refused };
      void runnerTick();
    });
  const discard = () => act(() => discardJob(job.id));
  const change = () =>
    act(async () => {
      await discardJob(job.id);
      if (job.kind === 'batch' && job.spec) {
        const parents = [job.refs.parentId, job.refs.sireId, job.refs.damId].filter((x): x is string => !!x);
        void navigate('/new', {
          state: {
            [HANDOFF_STATE_KEY]: {
              v: 1,
              source: 'ask',
              kind: job.spec.preset === 'clones' ? 'plant' : 'animal',
              preset: job.spec.preset,
              count: job.spec.count,
              parents,
            },
          },
        });
      } else if (job.kind === 'import') void navigate('/records/import');
      else if (job.kind === 'ready' && job.refs.recordId) void navigate(`/record/${job.refs.recordId}`);
      else void navigate('/licenses');
    });

  const names = plan ? childNames(plan.baseName, plan.count, 1) : [];
  const ledgerNames = useMemo(
    () => ids.map((rid) => records.find((r) => r.id === rid)?.strainName).filter(Boolean),
    [ids.join(','), records],
  );
  const shownNames = ledgerNames.length ? (ledgerNames as string[]) : names;

  return (
    <Stack spacing={3} sx={{ pb: 2 }} data-job-kind={job.kind}>
      <ScreenHeading>{titleOf(job, records, tr)}</ScreenHeading>
      {changedElsewhere && (
        <Alert
          severity="warning"
          variant="outlined"
          data-job-changed=""
          action={
            <Button
              color="inherit"
              onClick={() => {
                setShown(latest);
                setChangedElsewhere(false);
                setError(undefined);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('app.job.open')}
            </Button>
          }
        >
          {t('app.job.no.changed')}
        </Alert>
      )}
      {readOnly && (
        <Alert severity="info" variant="outlined" data-job-readonly="">
          {t('app.job.readOnly')}
        </Alert>
      )}

      {/* 1. Only you can answer */}
      {questions.length > 0 && (
        <Block title={t('app.job.answer.title')} data="answer">
          {questions.includes('bredBy') && (
            <Answer
              label={t('app.job.answer.bredBy')}
              disabled={readOnly || busy}
              onUse={(v) => act(() => changeBatch(job, { bredBy: v }, words))}
              data="bredBy"
            />
          )}
          {questions.includes('taxon') && (
            <Answer
              label={t('app.job.answer.taxon')}
              disabled={readOnly || busy}
              onUse={(v) => act(() => changeBatch(job, { taxon: v }, words))}
              data="taxon"
            />
          )}
          {questions.includes('scheme') && (
            <Answer
              label={t('app.job.answer.scheme')}
              disabled={readOnly || busy}
              onUse={(v) => act(() => changeBatch(job, { idScheme: v }, words))}
              data="scheme"
            />
          )}
          {questions.includes('file') && (
            <FilePick disabled={readOnly || busy} onFile={(f) => act(() => attachFile(job, f))} />
          )}
          {questions.includes('figures') && <Typography variant="body2">{t('app.job.made.title')}</Typography>}
          {questions.includes('backup') && <Typography variant="body2">{t('app.job.answer.backup')}</Typography>}
        </Block>
      )}
      {job.kind === 'batch' &&
        job.spec?.preset === 'offspring' &&
        !job.spec.individualId &&
        (job.spec.count ?? 0) > 1 && (
          <IdsPaste
            count={job.spec.count}
            value={job.spec.ids ?? []}
            disabled={readOnly || busy}
            onUse={(list) => act(() => changeBatch(job, { ids: list }, words))}
          />
        )}
      {job.kind === 'due' && (
        <Block title={t('app.job.answer.title')} data="reports">
          {reports.map((ref, i) => {
            const key = `report${i}`;
            const h = heldLicense(ref.inviteId);
            if (!h?.agreement) return null;
            const terms = h.agreement.terms as unknown as LicenseTerms;
            const rule = ruleOf(terms);
            const off = offspringOf(terms);
            const d = drafts[key] ?? { quantity: '', offspring: '', nothing: false };
            const from = tr.date(`${ref.periodFrom}T12:00:00`);
            const to = tr.date(`${ref.periodTo}T12:00:00`);
            const owed = owedOf(terms, h.agreement.type, ref.periodFrom, d);
            const commit = (next: Draft) => {
              setDrafts({ ...drafts, [key]: next });
              void act(() =>
                setFigures(
                  job,
                  key,
                  next.nothing
                    ? { nothing: true }
                    : {
                        quantity: next.quantity.trim(),
                        ...(next.offspring.trim() ? { offspring: next.offspring.trim() } : {}),
                      },
                ),
              );
            };
            return (
              <Paper key={key} variant="outlined" sx={{ p: 1.5 }} data-job-report={i}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{t('app.job.made.report', { from, to })}</Typography>
                  {/* The licensor's words for the agreement: theirs, never next to the button. */}
                  <Typography variant="caption" color="text.secondary" data-named-by="">
                    {t('app.job.made.namedBy', { label: h.label })}
                  </Typography>
                  {rule && (
                    <TextField
                      size="small"
                      label={
                        rule.kind === 'percent'
                          ? t('app.job.report.sales', { from, to, currency: currencyOf(terms) })
                          : t('app.job.report.units', { from, to }) + ` (${unitLabel(rule.unit, tr)})`
                      }
                      value={d.quantity}
                      disabled={readOnly || d.nothing}
                      inputMode="decimal"
                      onChange={(e) => setDrafts({ ...drafts, [key]: { ...d, quantity: e.target.value.slice(0, 20) } })}
                      onBlur={() => commit(d)}
                      slotProps={{ htmlInput: { 'data-job-figure': i, inputMode: 'decimal' } }}
                    />
                  )}
                  {off && (
                    <TextField
                      size="small"
                      label={t('app.job.report.offspring')}
                      value={d.offspring}
                      disabled={readOnly || d.nothing}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [key]: { ...d, offspring: e.target.value.slice(0, 20) } })
                      }
                      onBlur={() => commit(d)}
                    />
                  )}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={d.nothing}
                        disabled={readOnly}
                        onChange={(e) => commit({ ...d, nothing: e.target.checked })}
                        data-job-nothing={i}
                      />
                    }
                    label={t('app.job.report.nothing')}
                  />
                  {owed && (
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('app.job.report.owed', { amount: `${currencyOf(terms)} ${owed}` })}
                    </Typography>
                  )}
                  {terms.yearlyMinimum && (
                    <Typography variant="caption" color="text.secondary">
                      {t('app.job.report.topUp')}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Block>
      )}

      {/* 2. What I made */}
      <Block title={t('app.job.made.title')} data="made">
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {job.kind === 'batch' && job.spec && plan && (
            <>
              {shownNames.length > 0 && (
                <Line>
                  {tp('app.job.made.records', job.spec.count, {
                    first: shownNames[0],
                    last: shownNames[shownNames.length - 1],
                  })}
                </Line>
              )}
              {job.spec.preset === 'clones' ? (
                <Line>
                  {t('app.job.made.cutFrom', {
                    name: plan.parent?.strainName ?? '',
                    date: tr.date(`${job.frozen.today}T12:00:00`),
                  })}
                </Line>
              ) : (
                <>
                  <Line>{t('app.job.made.born', { date: tr.date(`${job.frozen.today}T12:00:00`) })}</Line>
                  {plan.dam && <Line>{t('app.job.made.dam', { name: plan.dam.strainName })}</Line>}
                  {plan.sire && <Line>{t('app.job.made.sire', { name: plan.sire.strainName })}</Line>}
                  {job.spec.sireCode && !plan.sire && (
                    <Line>{t('app.job.made.sireTyped', { code: job.spec.sireCode })}</Line>
                  )}
                  <Line>
                    {t('app.job.made.sexes', {
                      m: String(job.spec.males ?? 0),
                      f: String(job.spec.females ?? 0),
                      u: String(job.spec.count - (job.spec.males ?? 0) - (job.spec.females ?? 0)),
                    })}
                  </Line>
                  {(() => {
                    const list = job.spec.ids?.length
                      ? job.spec.ids
                      : job.spec.individualId
                        ? [job.spec.individualId]
                        : [];
                    const missing = job.spec.count - list.filter(Boolean).length;
                    return (
                      <>
                        {list.length > 0 && (
                          <Line>{t('app.job.made.ids', { first: list[0], last: list[list.length - 1] })}</Line>
                        )}
                        {missing > 0 && <Line>{tp('app.job.made.noIds', missing)}</Line>}
                      </>
                    );
                  })()}
                </>
              )}
              {job.spec.firstTag && (
                <Line>
                  {t('app.job.made.tags', {
                    first: job.spec.firstTag,
                    last: suggestTags(job.spec.firstTag, job.spec.count).at(-1) ?? job.spec.firstTag,
                  })}
                </Line>
              )}
            </>
          )}
          {job.kind === 'import' && job.sheet && (
            <>
              <Line>{t('app.job.made.file', { file: job.sheet.fileName })}</Line>
              <Line>{tp('app.job.made.importReady', job.sheet.ready)}</Line>
              {job.sheet.fix.length > 0 && (
                <Line>
                  {tp('app.job.made.importFix', job.sheet.fix.length, { rows: job.sheet.fix.slice(0, 12).join(', ') })}
                </Line>
              )}
              {job.sheet.expect !== undefined && job.sheet.expect !== job.sheet.ready && (
                <Line>{t('app.job.made.expect', { n: String(job.sheet.expect), m: String(job.sheet.ready) })}</Line>
              )}
            </>
          )}
          {job.kind === 'due' &&
            reports.map((ref, i) => (
              <Line key={i}>
                {t('app.job.made.report', {
                  from: tr.date(`${ref.periodFrom}T12:00:00`),
                  to: tr.date(`${ref.periodTo}T12:00:00`),
                })}
              </Line>
            ))}
          {job.kind === 'ready' && (
            <Line>
              {job.steps.length
                ? t('app.job.made.stamp', { name: recordName })
                : t('app.job.made.stamped', { name: recordName })}
            </Line>
          )}
        </Box>
      </Block>

      {/* 3. When you approve */}
      <Block title={t('app.job.approve.title')} data="approve">
        <Typography variant="body2">{t('app.job.approve.before')}</Typography>
        <Box
          ref={permanent}
          data-job-permanent=""
          sx={{ borderLeft: '4px solid', borderColor: 'warning.main', pl: 1.5 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('app.job.approve.permanent')}
          </Typography>
          <Typography variant="body2">
            {job.kind === 'batch' || job.kind === 'import'
              ? tp('app.job.approve.records', count)
              : job.kind === 'due'
                ? t('app.job.approve.reports')
                : job.steps.length
                  ? stampTomorrow()
                    ? t('app.job.approve.stampTomorrow', { name: recordName })
                    : t('app.job.approve.stampToday', { name: recordName })
                  : t('app.job.backup.ready')}
          </Typography>
        </Box>
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={() => setPublicOpen(!publicOpen)}
          sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        >
          {t('app.job.approve.public')}
        </Link>
        <Collapse in={publicOpen} unmountOnExit>
          {job.kind === 'ready' && job.steps.length ? (
            <DisclosureReceipt circuits={['anchor']} dense />
          ) : (
            <Typography variant="body2">
              {job.kind === 'due' ? t('app.job.approve.publicReports') : t('app.job.approve.publicRecords')}
            </Typography>
          )}
        </Collapse>
        <Typography variant="body2" color="text.secondary">
          {t('app.job.approve.offline')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('app.job.privacy')}
        </Typography>
      </Block>

      {/* 4. The backup, when new keys need it */}
      {job.backupNeeded && !readOnly && (
        <Box data-job-block="backup">
          {backupDone(job) && !inBackup ? (
            <Alert severity="success" variant="outlined">
              {t('app.job.backup.done')}
            </Alert>
          ) : (
            <>
              <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                {job.kind === 'ready' ? t('app.job.backup.ready') : tp('app.job.backup.records', count || 1)}
              </Alert>
              <BackupStep
                title={t('app.ask.batch.backupTitle')}
                finishLabel={t('app.job.backup.finish')}
                headingComponent="h2"
                onDone={() => {
                  setInBackup(false);
                  setBackupTick((n) => n + 1);
                }}
              />
            </>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" variant="outlined" role="alert" data-job-error="">
          {error}
          {detail && <Box sx={{ mt: 0.5 }}>{detail}</Box>}
        </Alert>
      )}

      {/* 5. The bar: always in reach at the bottom of the screen */}
      {!readOnly && (
        <Paper
          elevation={6}
          data-approve-bar=""
          sx={{ position: 'sticky', bottom: 0, zIndex: 2, p: 1.5, borderRadius: 0, mx: { xs: -2, sm: 0 } }}
        >
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} data-approve-left="">
              {left}
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!canApprove}
              onClick={() => void approve()}
              data-job-approve=""
            >
              {approveLabel}
            </Button>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Button color="inherit" disabled={busy} onClick={() => void change()} sx={{ minHeight: 44 }}>
                {t('app.job.btn.change')}
              </Button>
              <Button
                color="inherit"
                disabled={busy}
                onClick={() => void discard()}
                sx={{ minHeight: 44 }}
                data-job-discard=""
              >
                {t('app.job.btn.discard')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

const Answer: React.FC<{ label: string; disabled: boolean; onUse: (v: string) => void; data: string }> = ({
  label,
  disabled,
  onUse,
  data,
}) => {
  const { t } = useT();
  const [v, setV] = useState('');
  return (
    <Stack spacing={1} data-job-question={data}>
      <TextField
        size="small"
        label={label}
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value.slice(0, 200))}
        fullWidth
      />
      <Button
        variant="outlined"
        disabled={disabled || !v.trim()}
        onClick={() => onUse(v.trim())}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('app.job.answer.use')}
      </Button>
    </Stack>
  );
};

const IdsPaste: React.FC<{
  count: number;
  value: readonly string[];
  disabled: boolean;
  onUse: (l: string[]) => void;
}> = ({ count, value, disabled, onUse }) => {
  const { t } = useT();
  const [text, setText] = useState(value.join('\n'));
  const list = text
    .split(/\r?\n|\t/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, count);
  return (
    <Stack spacing={1} data-job-ids="">
      <TextField
        label={t('app.job.answer.ids')}
        multiline
        minRows={3}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value.slice(0, 20_000))}
        helperText={
          list.length
            ? t('app.job.answer.idsCount', { n: String(list.length), count: String(count) })
            : t('app.job.answer.idsLater')
        }
      />
      <Button
        variant="outlined"
        disabled={disabled || list.join('\n') === value.join('\n')}
        onClick={() => onUse(list)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('app.job.answer.use')}
      </Button>
    </Stack>
  );
};

const FilePick: React.FC<{ disabled: boolean; onFile: (f: File) => void }> = ({ disabled, onFile }) => {
  const { t } = useT();
  const pick = useRef<HTMLInputElement>(null);
  return (
    <Stack spacing={1} data-job-question="file">
      <Typography variant="body2">{t('app.job.answer.file')}</Typography>
      <Button
        variant="outlined"
        disabled={disabled}
        onClick={() => pick.current?.click()}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('app.job.answer.filePick')}
      </Button>
      <input
        ref={pick}
        type="file"
        hidden
        accept=".csv,.tsv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        data-job-file=""
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </Stack>
  );
};

// ---- after approval ----------------------------------------------------------------------------

const JobProgress: React.FC<{ job: Job }> = ({ job }) => {
  const tr = useT();
  const { t, tp } = tr;
  const records = useRecords();
  const recordName = nameOf(records, job.refs.recordId);
  const count = job.kind === 'batch' ? (job.spec?.count ?? 0) : (job.sheet?.ready ?? 0);
  const stepText = (s: Step) =>
    s.kind === 'records'
      ? tp('app.job.step.records', count)
      : s.kind === 'stamp'
        ? t('app.job.step.stamp', { name: recordName })
        : (() => {
            const ref = job.refs.reports?.[reportIndex(s.id)];
            return t('app.job.step.report', {
              from: ref ? tr.date(`${ref.periodFrom}T12:00:00`) : '',
              to: ref ? tr.date(`${ref.periodTo}T12:00:00`) : '',
            });
          })();
  const stateText = (s: Step) =>
    s.state === 'waiting' || (s.state === 'todo' && s.nextTryAt)
      ? t('app.job.state.waiting', { when: localStamp(s.nextTryAt ?? Date.now(), tr.locale) })
      : t(`app.job.state.${s.state}` as AppKey);
  const heading = t(`app.job.progress.${job.state}` as AppKey);
  return (
    <Stack spacing={2.5} data-job-progress={job.state}>
      <ScreenHeading>{heading}</ScreenHeading>
      <Typography variant="body1">{titleOf(job, records, tr).replace(/^[^:：]*[:：]\s*/, '')}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {job.steps.map((s) => (
          <Typography component="li" variant="body2" key={s.id} data-job-step={s.kind} data-job-step-state={s.state}>
            {stepText(s)} · {stateText(s)}
          </Typography>
        ))}
      </Box>
      {job.steps.map((s) =>
        s.state === 'needsYou' ? (
          <Alert key={s.id} severity="warning" variant="outlined" data-job-needs={s.kind}>
            {s.kind === 'report' ? t('app.job.needs.report') : t('app.job.needs.stamp')}
            {s.why && s.why !== 'may-have-gone' && <Box sx={{ mt: 0.5 }}>{t('app.job.why', { why: s.why })}</Box>}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => void tryAgain(job.id, s.id).then(() => runnerTick())}
                data-job-try-again=""
              >
                {t('app.job.tryAgain')}
              </Button>
              {s.kind === 'report' ? (
                <Button
                  size="small"
                  component={RouterLink}
                  to={`/license-invite/${job.refs.reports?.[reportIndex(s.id)]?.inviteId ?? ''}`}
                >
                  {t('app.job.openAgreement')}
                </Button>
              ) : (
                <Button size="small" component={RouterLink} to={`/record/${job.refs.recordId ?? ''}`}>
                  {t('app.job.openRecord')}
                </Button>
              )}
            </Stack>
          </Alert>
        ) : s.state === 'failed' && s.why ? (
          <Alert key={s.id} severity="error" variant="outlined" data-job-failed={s.kind}>
            {t('app.job.why', { why: s.why })}
          </Alert>
        ) : s.state === 'todo' && s.why ? (
          <Alert key={s.id} severity="info" variant="outlined" data-job-retry={s.kind}>
            {t('app.job.approve.offline')}
            <Box sx={{ mt: 0.5 }}>{t('app.job.why', { why: s.why })}</Box>
          </Alert>
        ) : null,
      )}
      {job.state === 'done' && (
        <Alert severity="success" variant="outlined" data-job-done="">
          {job.kind === 'batch' || job.kind === 'import'
            ? tp('app.job.done.records', count)
            : job.kind === 'due'
              ? job.steps.every((s) => s.note === 'already')
                ? t('app.job.done.already')
                : t('app.job.done.reports')
              : t('app.job.done.ready', { name: recordName })}
        </Alert>
      )}
      {job.state === 'discarded' && <Typography variant="body2">{t('app.job.discarded')}</Typography>}
      <Button component={RouterLink} to="/records" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
        {t('app.job.toRecords')}
      </Button>
    </Stack>
  );
};
