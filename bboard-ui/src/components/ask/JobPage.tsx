// "Do it for me": a job's page (/ask/job/:id). One finished result to check, phone first
// (design v2, 3; both reviews of 8 Nov 2026):
//   1. Only you can answer (first: the only part to act on), the backup among it, opened here;
//   2. What I made, one line per item, each young or clone folded under "Each one";
//   3. When you approve: what can't be undone, and what goes public, folded;
//   4. a bar that stays at the bottom: Approve, Change something, Discard. Approve says what is
//      left ("Save your backup to approve") and stays off until "Can't be undone" has been on
//      screen in full, above the bar. The bar steps aside while the backup is being saved.
// Approve sends the hash of the plan this tab drew (ask-job/store.ts approveJob). What this tab
// drew stays on screen: a change made in another tab is said, never swapped in unseen. Report
// figures are drawn from the plan itself, saved one after another, and Approve waits for them.
// Opened from a link rather than from Ask or Home, the job is read-only. No Ask bubble here
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
import { sexWords } from '../flow/AnimalForm';
import { DisclosureReceipt } from '../chain/DisclosureReceipt';
import { useT, type Translator } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { loadLedger } from '../../veilcore/bulk-import';
import { heldLicense } from '../../veilcore/held-licenses';
import { currencyOf, ruleOf, offspringOf, unitLabel, localDay } from '../../veilcore/royalty-terms';
import { sumAmounts, currencyDigits } from '../../veilcore/money';
import { localStamp } from '../../veilcore/time';
import { childNames, suggestTags } from '../../ask/batch';
import { HANDOFF_STATE_KEY } from '../../ask/handoff';
import {
  approveJob,
  discardJob,
  getJob,
  onJobsChange,
  anyStarted,
  deadlineOf,
  type Figures,
  type Job,
  type Step,
} from '../../ask-job/store';
import {
  attachFile,
  backupDone,
  batchPlanOf,
  changeBatch,
  dealTerms,
  heldIds,
  questionsOf,
  reportAmounts,
  setFigures,
  stampTomorrow,
  type Prepared,
} from '../../ask-job/prepare';
import { reportIndex, tryAgain } from '../../ask-job/run';
import { CANT_CHECK, NOT_NOTED } from '../../ask-job/whys';
import { runnerTick } from '../../ask-job/start';
import { JOB_STATE_KEY, jobTitle, jobWords } from '../../ask-job/words';

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
          <JobProgress job={job} fromApp={fromApp} />
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

/** A report's figures as the sheet holds them while they are typed. */
type Draft = { quantity: string; offspring: string; nothing: boolean };
const draftOf = (f: Figures | undefined): Draft => ({
  quantity: f?.quantity ?? '',
  offspring: f?.offspring ?? '',
  nothing: !!f?.nothing,
});
const figuresOf = (d: Draft): Figures =>
  d.nothing
    ? { nothing: true }
    : { quantity: d.quantity.trim(), ...(d.offspring.trim() ? { offspring: d.offspring.trim() } : {}) };
const sameDraft = (a: Draft, f: Figures | undefined): boolean => {
  const b = draftOf(f);
  return (
    a.nothing === b.nothing && (a.nothing || (a.quantity.trim() === b.quantity && a.offspring.trim() === b.offspring))
  );
};

/** A total per currency: "USD 350.05", or "USD 10.00 + EUR 5.00". */
const totalOf = (list: readonly { amount?: string; currency?: string }[]): string => {
  const by = new Map<string, string[]>();
  for (const x of list) if (x.amount && x.currency) by.set(x.currency, [...(by.get(x.currency) ?? []), x.amount]);
  return [...by.entries()].map(([c, l]) => `${c} ${sumAmounts(l, currencyDigits(c)) ?? ''}`).join(' + ');
};

const JobResult: React.FC<{ job: Job; fromApp: boolean }> = ({ job: latest, fromApp }) => {
  // What this tab drew stays on screen: a change made in another tab is said, never swapped in
  // under the person's thumb. Approve sends the hash of what is shown.
  const [job, setShown] = useState(latest);
  const shownRef = useRef(job);
  shownRef.current = job;
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
  const [eachOpen, setEachOpen] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  const [backupTick, setBackupTick] = useState(0);
  // The file picked just now: its name is shown here, never kept in the job.
  const [fileName, setFileName] = useState<string>();
  // The backup step, opened from "Only you can answer" or the bar; the bar steps aside meanwhile.
  const [inBackup, setInBackup] = useState(false);
  const permanent = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);
  void backupTick;
  const readOnly = !fromApp;
  const questions = questionsOf(job, words);
  const asks = questions.filter((q) => q !== 'backup');

  // The bar's height, so "Can't be undone" counts as seen only when it is all above the bar.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inBackup, readOnly]);
  useEffect(() => {
    const el = permanent.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting && e.intersectionRatio >= 0.99)) setSeen(true);
      },
      { threshold: [0.99, 1], rootMargin: `0px 0px -${Math.ceil(barHeight)}px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [barHeight, seen, inBackup]);

  const refusal = (r: Prepared | void) => {
    if (!r) return;
    if ('job' in r) {
      ownHashes.current.add(r.job.hash);
      shownRef.current = r.job;
      setShown(r.job);
      setError(undefined);
      setDetail(undefined);
      return;
    }
    // Changed in another tab: the banner above says so, once (V6).
    if (r.refused === 'changed') {
      setChangedElsewhere(true);
      setError(undefined);
      setDetail(undefined);
      return;
    }
    setError(t(`app.job.no.${r.refused}` as AppKey, { n: r.words ?? '' }));
    setDetail(r.words && r.refused !== 'tooManyReports' ? r.words : undefined);
  };
  const act = async (f: () => Promise<Prepared | void>) => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      refusal(await f());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ---- reports: drawn from the plan, saved one after another, never dropped ----
  const reports = job.refs.reports ?? [];
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(reports.map((_, i) => [`report${i}`, draftOf(job.figures?.[`report${i}`])])),
  );
  // A different plan on screen (shown from another tab): its own figures, not this tab's.
  const shownHash = useRef(job.hash);
  useEffect(() => {
    if (shownHash.current === job.hash) return;
    shownHash.current = job.hash;
    setDrafts((d) =>
      Object.fromEntries(
        reports.map((_, i) => {
          const k = `report${i}`;
          // A draft this tab is still saving stays; anything else is the plan's.
          return [k, saving.current > 0 && d[k] ? d[k] : draftOf(job.figures?.[k])];
        }),
      ),
    );
  }, [job.hash]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saving = useRef(0);
  const [savingCount, setSavingCount] = useState(0);
  const commit = (key: string, d: Draft) => {
    if (readOnly) return;
    setDrafts((x) => ({ ...x, [key]: d }));
    saving.current += 1;
    setSavingCount(saving.current);
    queue.current = queue.current.then(async () => {
      try {
        refusal(await setFigures(shownRef.current, key, figuresOf(d)));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        saving.current -= 1;
        setSavingCount(saving.current);
      }
    });
  };
  const draftFigures = Object.fromEntries(Object.entries(drafts).map(([k, d]) => [k, figuresOf(d)]));
  const shownAmounts = reportAmounts(job, draftFigures);
  const unsaved = reports.some(
    (_, i) => !sameDraft(drafts[`report${i}`] ?? draftOf(undefined), job.figures?.[`report${i}`]),
  );
  // What Approve sends: the amounts in the plan itself.
  const approvedTotal = totalOf(reports.map((_, i) => job.figures?.[`report${i}`] ?? {}));

  // ---- what each kind of job shows ----
  const plan = job.kind === 'batch' ? batchPlanOf(job, words) : undefined;
  const ids = heldIds(job);
  const count = job.kind === 'batch' ? (job.spec?.count ?? 0) : job.kind === 'import' ? (job.sheet?.ready ?? 0) : 0;
  const recordName = nameOf(records, job.refs.recordId);
  const approveLabel =
    job.kind === 'batch' || job.kind === 'import'
      ? tp('app.job.btn.records', count)
      : job.kind === 'due'
        ? tp('app.job.btn.reports', reports.length, { total: approvedTotal || '0' })
        : job.steps.length
          ? t('app.job.btn.stamp', { name: recordName })
          : t('app.job.btn.ready');
  const empty = (job.kind === 'batch' || job.kind === 'import') && ids.length === 0 && !questions.includes('file');
  const canApprove =
    !readOnly &&
    questions.length === 0 &&
    seen &&
    !busy &&
    !empty &&
    !unsaved &&
    // A change from another tab is said at the top; Approve still sends only the plan shown here,
    // and the store refuses it if that isn't the plan any more (compare-and-set).
    savingCount === 0;
  const left = asks.length
    ? tp('app.job.left.questions', asks.length)
    : questions.includes('backup')
      ? t('app.job.left.backup')
      : unsaved || savingCount
        ? t('app.job.left.saving')
        : !seen
          ? t('app.job.left.scroll')
          : t('app.job.left.ready');

  const approve = () =>
    act(async () => {
      const r = await approveJob(job.id, job.hash);
      if ('refused' in r) return { refused: r.refused };
      void runnerTick();
    });
  const discard = () => act(() => discardJob(job.id));
  // Batches only: the full form, with everything here carried over (sexes, IDs, the sire's code,
  // tags, the lot, the date). Other jobs are changed right here.
  const change = () =>
    act(async () => {
      const s = job.spec;
      if (job.kind !== 'batch' || !s) return;
      await discardJob(job.id);
      const parents = [job.refs.parentId, job.refs.sireId, job.refs.damId].filter((x): x is string => !!x);
      const sexes = Array.from({ length: s.count }, (_, i) =>
        i < (s.males ?? 0) ? 'male' : i < (s.males ?? 0) + (s.females ?? 0) ? 'female' : '',
      );
      void navigate('/new', {
        state: {
          [HANDOFF_STATE_KEY]: {
            v: 1,
            source: 'ask',
            kind: s.preset === 'clones' ? 'plant' : 'animal',
            preset: s.preset,
            count: s.count,
            parents,
            details: {
              sexes,
              ...(s.ids?.length ? { ids: s.ids } : s.individualId ? { ids: [s.individualId] } : {}),
              ...(s.idScheme ? { idScheme: s.idScheme } : {}),
              ...(s.firstTag ? { firstTag: s.firstTag } : {}),
              ...(s.lotName ? { lotName: s.lotName } : {}),
              ...(s.sireCode ? { sireCode: s.sireCode, semen: !!s.ai } : {}),
              ...(plan?.date ? { date: plan.date } : {}),
            },
          },
        },
      });
    });

  const shownNames = useMemo(() => {
    const fromLedger = ids.map((rid) => loadLedger().rows && records.find((r) => r.id === rid)?.strainName);
    const ledgerRows = loadLedger().rows;
    const held = (job.refs.rowHashes ?? []).map((h) => ledgerRows[h]?.record?.strainName).filter(Boolean) as string[];
    return held.length
      ? held
      : fromLedger.filter(Boolean).length
        ? (fromLedger as string[])
        : plan
          ? childNames(plan.baseName, plan.count, 1)
          : [];
  }, [ids.join(','), records, job.hash]);

  const backupBlock = job.backupNeeded && !readOnly && (inBackup || !backupDone(job));
  const openBackup = () => {
    setInBackup(true);
    setTimeout(() => document.querySelector('[data-job-block="backup"]')?.scrollIntoView({ block: 'start' }), 50);
  };

  return (
    <Stack spacing={3} sx={{ pb: 2 }} data-job-kind={job.kind}>
      <ScreenHeading>{t('app.job.title', { what: jobTitle(job, records, tr) })}</ScreenHeading>
      {changedElsewhere && (
        <Alert
          severity="warning"
          variant="outlined"
          role="alert"
          data-job-changed=""
          action={
            <Button
              color="inherit"
              onClick={() => {
                shownRef.current = latest;
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
      {error && (
        <Alert severity="error" variant="outlined" role="alert" data-job-error="">
          {error}
          {detail && <Box sx={{ mt: 0.5 }}>{detail}</Box>}
        </Alert>
      )}

      {/* 1. Only you can answer, the backup among it */}
      {(questions.length > 0 || job.kind === 'due' || (job.backupNeeded && !readOnly)) && (
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
            <FilePick
              disabled={readOnly || busy}
              onFile={(f) =>
                act(async () => {
                  const r = await attachFile(job, f);
                  if ('job' in r) setFileName(f.name);
                  return r;
                })
              }
            />
          )}
          {job.kind === 'batch' && job.spec?.preset === 'offspring' && !job.spec.individualId && job.spec.count > 1 && (
            <IdsPaste
              count={job.spec.count}
              value={job.spec.ids ?? []}
              disabled={readOnly || busy}
              onUse={(list) => act(() => changeBatch(job, { ids: list }, words))}
            />
          )}
          {job.kind === 'due' &&
            reports.map((ref, i) => {
              const key = `report${i}`;
              const h = heldLicense(ref.inviteId);
              const terms = dealTerms(ref.inviteId, ref.currency);
              if (!h?.agreement || !terms) return null;
              const rule = ruleOf(terms);
              const off = offspringOf(terms);
              const d = drafts[key] ?? draftOf(undefined);
              const from = tr.date(`${ref.periodFrom}T12:00:00`);
              const to = tr.date(`${ref.periodTo}T12:00:00`);
              const a = shownAmounts[i];
              const cur = currencyOf(terms);
              return (
                <Paper key={key} variant="outlined" sx={{ p: 1.5 }} data-job-report={i}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">{t('app.job.made.report', { from, to })}</Typography>
                    {ref.dueOn && (
                      <Typography variant="caption" color={ref.dueOn < localDay() ? 'error' : 'text.secondary'}>
                        {t(ref.dueOn < localDay() ? 'app.job.report.overdue' : 'app.job.report.due', {
                          date: tr.date(`${ref.dueOn}T12:00:00`),
                        })}
                      </Typography>
                    )}
                    {/* The licensor's words for the agreement: theirs, never next to the button. */}
                    <Typography variant="caption" color="text.secondary" data-named-by="">
                      {t('app.job.made.namedBy', { label: h.label })}
                    </Typography>
                    {rule && (
                      <TextField
                        size="small"
                        label={
                          rule.kind === 'percent'
                            ? t('app.job.report.sales', { from, to, currency: cur })
                            : `${t('app.job.report.units', { from, to })} (${unitLabel(rule.unit, tr)})`
                        }
                        value={d.quantity}
                        disabled={readOnly || d.nothing}
                        onChange={(e) =>
                          setDrafts({ ...drafts, [key]: { ...d, quantity: e.target.value.slice(0, 20) } })
                        }
                        onBlur={() => commit(key, d)}
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
                        onBlur={() => commit(key, d)}
                      />
                    )}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={d.nothing}
                          disabled={readOnly}
                          onChange={(e) => commit(key, { ...d, nothing: e.target.checked })}
                          data-job-nothing={i}
                        />
                      }
                      label={t('app.job.report.nothing')}
                    />
                    {a && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} data-job-owed={i}>
                          {t('app.job.report.owed', { amount: `${a.currency} ${a.amount}` })}
                        </Typography>
                        {rule?.kind === 'percent' && !d.nothing && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t('app.job.report.rate', {
                              rate: rule.rate,
                              currency: a.currency,
                              base: d.quantity || '0',
                            })}
                          </Typography>
                        )}
                        {(Number(a.topUp) || 0) > 0 && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t('app.job.report.topUp', { amount: `${a.currency} ${a.topUp}` })}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          {backupBlock && !inBackup && (
            <Stack spacing={1} data-job-question="backup">
              <Typography variant="body2">
                {job.kind === 'ready' ? t('app.job.backup.ready') : tp('app.job.backup.records', count || 1)}
              </Typography>
              <Button variant="contained" onClick={openBackup} sx={{ alignSelf: 'flex-start' }} data-job-backup-open="">
                {t('app.job.btn.backup')}
              </Button>
            </Stack>
          )}
          {backupBlock && inBackup && (
            <Box data-job-block="backup">
              <BackupStep
                title={t('app.ask.batch.backupTitle')}
                finishLabel={t('app.job.backup.finish')}
                headingComponent="h2"
                onDone={() => {
                  setInBackup(false);
                  setBackupTick((n) => n + 1);
                }}
              />
            </Box>
          )}
          {job.backupNeeded && !backupBlock && !readOnly && (
            <Alert severity="success" variant="outlined">
              {t('app.job.backup.done')}
            </Alert>
          )}
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
                <>
                  <Line>
                    {t('app.job.made.cutFrom', {
                      name: plan.parent?.strainName ?? '',
                      date: tr.date(`${plan.date}T12:00:00`),
                    })}
                  </Line>
                  {job.spec.lotName && <Line>{t('app.job.made.lot', { lot: job.spec.lotName })}</Line>}
                  {job.spec.firstTag && (
                    <Line>
                      {t('app.job.made.tags', {
                        first: job.spec.firstTag,
                        last: suggestTags(job.spec.firstTag, job.spec.count).at(-1) ?? job.spec.firstTag,
                      })}
                    </Line>
                  )}
                </>
              ) : (
                <>
                  <Line>{t('app.job.made.born', { date: tr.date(`${plan.date}T12:00:00`) })}</Line>
                  {plan.dam && <Line>{t('app.job.made.dam', { name: plan.dam.strainName })}</Line>}
                  {plan.sire ? (
                    <Line>{t('app.job.made.sire', { name: plan.sire.strainName })}</Line>
                  ) : job.spec.sireCode ? (
                    <Line>{t('app.job.made.sireTyped', { code: job.spec.sireCode })}</Line>
                  ) : (
                    <Line>{t('app.job.made.noSire')}</Line>
                  )}
                  {plan.sire && plan.semenCode && <Line>{t('app.job.made.semen', { code: plan.semenCode })}</Line>}
                  <Line>
                    {t('app.job.made.sexes', {
                      m: String(job.spec.males ?? 0),
                      f: String(job.spec.females ?? 0),
                    })}
                    {job.spec.count - (job.spec.males ?? 0) - (job.spec.females ?? 0) > 0 &&
                      ` · ${t('app.job.made.unstated', {
                        u: String(job.spec.count - (job.spec.males ?? 0) - (job.spec.females ?? 0)),
                      })}`}
                  </Line>
                  {(() => {
                    const list = plan.children?.map((c) => c?.individualId ?? '') ?? [];
                    const given = list.filter(Boolean);
                    const missing = job.spec.count - given.length;
                    return (
                      <>
                        {given.length > 0 && (
                          <Line>{t('app.job.made.ids', { first: given[0], last: given[given.length - 1] })}</Line>
                        )}
                        {missing > 0 && <Line>{tp('app.job.made.noIds', missing)}</Line>}
                      </>
                    );
                  })()}
                </>
              )}
            </>
          )}
          {job.kind === 'import' && job.sheet && (
            <>
              {fileName && <Line>{t('app.job.made.file', { file: fileName })}</Line>}
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
        {job.kind === 'batch' && plan && shownNames.length > 1 && (
          <>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setEachOpen(!eachOpen)}
              sx={{ alignSelf: 'flex-start', minHeight: 44 }}
              data-job-each=""
            >
              {t('app.job.made.each')}
            </Link>
            <Collapse in={eachOpen} unmountOnExit>
              <Box component="ol" sx={{ m: 0, pl: 3 }}>
                {shownNames.map((n, i) => {
                  const c = plan.children?.[i];
                  return (
                    <Typography component="li" variant="body2" key={n}>
                      {plan.preset === 'clones'
                        ? `${n}${c?.tag ? ` · ${c.tag}` : ''}`
                        : `${n} · ${sexWords(c?.sex, tr)} · ${c?.individualId || t('app.job.made.noId')}`}
                    </Typography>
                  );
                })}
              </Box>
            </Collapse>
          </>
        )}
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
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('app.job.approve.publicStamp')}
              </Typography>
              <DisclosureReceipt circuits={['anchor']} dense />
            </Stack>
          ) : (
            <Typography variant="body2">
              {job.kind === 'due' ? t('app.job.approve.publicReports') : t('app.job.approve.publicRecords')}
            </Typography>
          )}
        </Collapse>
        <Typography variant="body2" color="text.secondary" data-job-offline="">
          {t(
            job.kind === 'batch' || job.kind === 'import'
              ? 'app.job.approve.offlineRecords'
              : 'app.job.approve.offlineLater',
            { when: localStamp(deadlineOf(job), tr.locale) },
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('app.job.privacy')}
        </Typography>
      </Block>

      {/* 4. The bar: always in reach at the bottom of the screen, aside while the backup is saved */}
      {!readOnly && !inBackup && (
        <Paper
          ref={bar}
          elevation={6}
          data-approve-bar=""
          sx={{ position: 'sticky', bottom: 0, zIndex: 2, p: 1.5, borderRadius: 0, mx: { xs: -2, sm: 0 } }}
        >
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} data-approve-left="">
              {left}
            </Typography>
            {!asks.length && questions.includes('backup') ? (
              <Button variant="contained" size="large" fullWidth onClick={openBackup} data-job-backup-bar="">
                {t('app.job.btn.backup')}
              </Button>
            ) : (
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
            )}
            {confirmChange && (
              <Alert
                severity="info"
                variant="outlined"
                action={
                  <Button color="inherit" onClick={() => void change()} sx={{ minHeight: 44 }} data-job-change-go="">
                    {t('app.job.btn.change')}
                  </Button>
                }
              >
                {t('app.job.changeConfirm')}
              </Alert>
            )}
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: job.kind === 'batch' ? 'space-between' : 'flex-end' }}
            >
              {job.kind === 'batch' && (
                <Button
                  color="inherit"
                  disabled={busy}
                  onClick={() => setConfirmChange(!confirmChange)}
                  sx={{ minHeight: 44 }}
                  data-job-change=""
                >
                  {t('app.job.btn.change')}
                </Button>
              )}
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

/** "in 2 min (12:47 AM)" within the hour, "at 3:15 PM" later today, else "on 11/9/2026". */
const whenText = (ms: number, tr: Translator): string => {
  const min = Math.max(1, Math.round((ms - Date.now()) / 60_000));
  const time = new Date(ms).toLocaleTimeString(tr.locale, { hour: 'numeric', minute: '2-digit' });
  if (min <= 60) return tr.t('app.job.when.soon', { n: String(min), time });
  return new Date(ms).toDateString() === new Date().toDateString()
    ? tr.t('app.job.when.at', { time })
    : tr.t('app.job.when.on', { date: tr.date(ms) });
};

const JobProgress: React.FC<{ job: Job; fromApp: boolean }> = ({ job, fromApp }) => {
  const tr = useT();
  const { t, tp } = tr;
  const records = useRecords();
  const recordName = nameOf(records, job.refs.recordId);
  const count = job.kind === 'batch' ? (job.spec?.count ?? 0) : (job.sheet?.ready ?? 0);
  const newIds = heldIds(job);
  const reportOf = (s: Step) => job.refs.reports?.[reportIndex(s.id)];
  const stepText = (s: Step) =>
    s.kind === 'records'
      ? tp('app.job.step.records', count)
      : s.kind === 'stamp'
        ? t('app.job.step.stamp', { name: recordName })
        : t('app.job.step.report', {
            from: reportOf(s) ? tr.date(`${reportOf(s)!.periodFrom}T12:00:00`) : '',
            to: reportOf(s) ? tr.date(`${reportOf(s)!.periodTo}T12:00:00`) : '',
          });
  const waitingStep = (s: Step) => s.state === 'waiting' || (s.state === 'todo' && !!s.nextTryAt);
  const stateText = (s: Step) =>
    waitingStep(s)
      ? t('app.job.state.waiting', { when: whenText(s.nextTryAt ?? Date.now(), tr) })
      : t(`app.job.state.${s.state}` as AppKey);
  const waiting = (job.state === 'running' || job.state === 'approved') && job.steps.some(waitingStep);
  const heading = t(waiting ? 'app.job.progress.waiting' : (`app.job.progress.${job.state}` as AppKey));
  // Young saved without their IDs: Home will remind the person (AddIds.tsx).
  const missingIds =
    job.kind === 'batch' && job.spec?.preset === 'offspring'
      ? newIds.filter((id) => {
          const r = records.find((x) => x.id === id);
          return r && !r.refId;
        }).length
      : 0;
  const amountWhy = (why?: string) => (why?.startsWith('amount:') ? why.slice('amount:'.length) : undefined);
  return (
    <Stack spacing={2.5} data-job-progress={job.state}>
      <ScreenHeading>{heading}</ScreenHeading>
      <Typography variant="body1">{jobTitle(job, records, tr)}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {job.steps.map((s) => (
          <Typography component="li" variant="body2" key={s.id} data-job-step={s.kind} data-job-step-state={s.state}>
            {stepText(s)} · {stateText(s)}
          </Typography>
        ))}
      </Box>
      {job.steps.map((s) =>
        s.state === 'needsYou' && s.why === 'lapsed' ? (
          <Alert key={s.id} severity="warning" variant="outlined" data-job-needs="lapsed">
            {t('app.job.needs.lapsed')}
            {fromApp && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void tryAgain(job.id, s.id).then(() => runnerTick())}
                >
                  {t('app.job.sendNow')}
                </Button>
                {!anyStarted(job) && (
                  <Button size="small" onClick={() => void discardJob(job.id)}>
                    {t('app.job.btn.discard')}
                  </Button>
                )}
              </Stack>
            )}
          </Alert>
        ) : s.state === 'needsYou' && s.why === 'stuck' && s.kind === 'records' ? (
          // Records sent but never confirmed: still kept here; Send now asks the server first (V1).
          <Alert key={s.id} severity="warning" variant="outlined" data-job-needs="stuck">
            {t('app.job.needs.stuckRecords')}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {fromApp && (job.state === 'running' || job.state === 'approved') && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void tryAgain(job.id, s.id).then(() => runnerTick())}
                  data-job-send-now=""
                >
                  {t('app.job.sendNow')}
                </Button>
              )}
              <Button size="small" component={RouterLink} to="/records">
                {t('app.job.toRecords')}
              </Button>
            </Stack>
          </Alert>
        ) : s.state === 'needsYou' && s.why === 'stuck' ? (
          <Alert key={s.id} severity="warning" variant="outlined" data-job-needs="stuck">
            {t(anyStarted(job) ? 'app.job.needs.stuck' : 'app.job.needs.stuckNone')}
          </Alert>
        ) : s.state === 'needsYou' ? (
          <Alert key={s.id} severity="warning" variant="outlined" data-job-needs={s.kind}>
            {s.kind === 'report' ? t('app.job.needs.report') : t('app.job.needs.stamp')}
            {s.why && s.why !== 'may-have-gone' && <Box sx={{ mt: 0.5 }}>{t('app.job.why', { why: s.why })}</Box>}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {s.kind === 'report' && fromApp && (job.state === 'running' || job.state === 'approved') && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void tryAgain(job.id, s.id).then(() => runnerTick())}
                  data-job-try-again=""
                >
                  {t('app.job.tryAgain')}
                </Button>
              )}
              {s.kind === 'report' ? (
                <Button size="small" component={RouterLink} to={`/license-invite/${reportOf(s)?.inviteId ?? ''}`}>
                  {t('app.job.openAgreement')}
                </Button>
              ) : (
                <Button size="small" component={RouterLink} to={`/record/${job.refs.recordId ?? ''}`}>
                  {t('app.job.openRecord')}
                </Button>
              )}
            </Stack>
          </Alert>
        ) : s.state === 'failed' && amountWhy(s.why) ? (
          <Alert key={s.id} severity="error" variant="outlined" data-job-failed="amount">
            {t('app.job.failed.amount', { amount: amountWhy(s.why)! })}
          </Alert>
        ) : s.state === 'failed' && s.why ? (
          <Alert key={s.id} severity="error" variant="outlined" data-job-failed={s.kind}>
            {t('app.job.why', { why: s.why })}
          </Alert>
        ) : s.state === 'todo' && s.why && s.kind === 'records' ? (
          // The real reason it waits (W6): the server couldn't be checked, or this browser couldn't
          // note what it has; otherwise no connection.
          <Alert key={s.id} severity="info" variant="outlined" data-job-retry={s.kind}>
            {s.why === CANT_CHECK
              ? t('app.job.wait.cantCheck')
              : s.why === NOT_NOTED
                ? t('app.job.wait.notNoted')
                : tp('app.job.wait.records', count)}
          </Alert>
        ) : s.state === 'todo' && s.why ? (
          <Alert key={s.id} severity="info" variant="outlined" data-job-retry={s.kind}>
            {t('app.job.approve.offline')}
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
          {missingIds > 0 && <Box sx={{ mt: 0.5 }}>{tp('app.job.done.ids', missingIds)}</Box>}
        </Alert>
      )}
      {job.state === 'discarded' && <Typography variant="body2">{t('app.job.discarded')}</Typography>}
      {job.state === 'done' && (job.kind === 'batch' || job.kind === 'import') && newIds[0] ? (
        <Button component={RouterLink} to={`/record/${newIds[0]}`} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          {t('app.job.openNew')}
        </Button>
      ) : (
        <Button component={RouterLink} to="/records" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          {t('app.job.toRecords')}
        </Button>
      )}
    </Stack>
  );
};
