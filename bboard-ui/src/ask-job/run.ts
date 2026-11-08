// "Do it for me": the runner (design v2, 4). It carries out approved jobs, step by step, and
// nothing else: a job that isn't approved is never touched.
//
//   - It runs only when this page may send the holder's requests (!holderRequestsPaused: never
//     on a check or prove page) and the tab is visible: the same rule as stamp-background.ts.
//   - One runner at a time across tabs (tab-lock.ts withTabLock, which works without Web Locks).
//   - Before each sending step its preconditions are checked again, fresh (the senders do it).
//   - Steps run reversible first, permanent last (a license draft, an invite, then records,
//     reports and stamps). Part A's jobs have one kind of permanent step each.
//   - A retry sends the same bytes or nothing: records are resent as themselves from the ledger,
//     a report is signed once and read for fresh before it is sent again (deal-client sayOnce),
//     a stamp is handed to the existing stamp queue with its "may have gone out" stop.
//   - When a step's outcome is unknown it stops and asks ("needsYou"); there is no automatic
//     rollback. "Try again" waits for the step's nextTryAt, which survives a reload.
//   - A step found `running` after a crash: records are sent again (the same records, safe); a
//     report or a stamp may have gone out, so it asks.
// SPDX-License-Identifier: Apache-2.0

import {
  deadlineOf,
  listJobs,
  updateJob,
  withHash,
  type Figures,
  type Job,
  type ReportRef,
  type Step,
  type StepKind,
} from './store';

/** What a step's send came to. */
export type StepOutcome =
  | { readonly kind: 'done'; readonly note?: string }
  /** Not this time: try again after `at` (a lost connection, a busy server). */
  | { readonly kind: 'retry'; readonly at: number; readonly why: string }
  /** Handed on to something that keeps trying (the stamp queue): look again after `at`. */
  | { readonly kind: 'waiting'; readonly at: number; readonly why?: string }
  /** It may have gone out: the person looks first. */
  | { readonly kind: 'needsYou'; readonly why: string }
  /** Refused, in the refusal's own words: nothing more is tried. */
  | { readonly kind: 'failed'; readonly why: string };

export type Senders = {
  readonly records: (job: Job) => Promise<StepOutcome>;
  readonly report: (job: Job, ref: ReportRef, figures: Figures | undefined) => Promise<StepOutcome>;
  readonly stamp: (job: Job, recordId: string, resumed: boolean) => Promise<StepOutcome>;
};

export type RunDeps = {
  readonly now: () => number;
  /** This page may send the holder's requests (holder-guard.ts) and the tab is visible. */
  readonly allowed: () => boolean;
  readonly lock: <T>(fn: () => Promise<T>) => Promise<T>;
  readonly send: Senders;
};

/** Reversible steps first, permanent ones last. */
const RANK: Record<StepKind, number> = { records: 2, report: 2, stamp: 2 };
export const stepOrder = (steps: readonly Step[]): Step[] =>
  steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => RANK[a.s.kind] - RANK[b.s.kind] || a.i - b.i)
    .map((x) => x.s);

const setStep = (j: Job, id: string, patch: Partial<Step>): Job =>
  withHash({ ...j, steps: j.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

/** The report a step is about: its index in the job's reports. */
const reportOf = (j: Job, step: Step): ReportRef | undefined => j.refs.reports?.[Number(step.id.slice(7))];

/** Run one step of one job, writing its state before and after. */
const runStep = async (deps: RunDeps, job: Job, step: Step): Promise<Job | undefined> => {
  const resumed = step.state === 'running';
  // After a crash: a report or a stamp may have gone out. Records go again as themselves.
  if (resumed && step.kind === 'report')
    return updateJob(job.id, (j) =>
      setStep(j, step.id, { state: 'needsYou', why: 'may-have-gone', nextTryAt: undefined }),
    );
  // Marked running before anything is sent: a crash from here on is seen as one.
  const marked = await updateJob(job.id, (j) =>
    j.state === 'approved' || j.state === 'running'
      ? setStep({ ...j, state: 'running' }, step.id, { state: 'running', why: undefined })
      : undefined,
  );
  if (!marked || marked.state !== 'running') return marked;
  let out: StepOutcome;
  try {
    if (step.kind === 'records') out = await deps.send.records(marked);
    else if (step.kind === 'stamp') out = await deps.send.stamp(marked, marked.refs.recordId ?? '', resumed);
    else {
      const ref = reportOf(marked, step);
      out = ref
        ? await deps.send.report(marked, ref, marked.figures?.[step.id])
        : { kind: 'failed', why: 'This report isn’t in the job any more.' };
    }
  } catch (e) {
    // Thrown, not answered: for records it is safe to send again; anything else may have gone.
    const why = e instanceof Error ? e.message : String(e);
    out = step.kind === 'records' ? { kind: 'retry', at: deps.now() + 60_000, why } : { kind: 'needsYou', why };
  }
  return updateJob(job.id, (j) => {
    if (out.kind === 'done') {
      // A sent report's typed figures go at once.
      const figures =
        step.kind === 'report' && j.figures
          ? Object.fromEntries(Object.entries(j.figures).filter(([k]) => k !== step.id))
          : j.figures;
      return setStep({ ...j, figures }, step.id, {
        state: 'done',
        note: out.note,
        nextTryAt: undefined,
        why: undefined,
      });
    }
    if (out.kind === 'retry') return setStep(j, step.id, { state: 'todo', nextTryAt: out.at, why: out.why });
    if (out.kind === 'waiting') return setStep(j, step.id, { state: 'waiting', nextTryAt: out.at, why: out.why });
    if (out.kind === 'needsYou') return setStep(j, step.id, { state: 'needsYou', why: out.why, nextTryAt: undefined });
    return setStep(j, step.id, { state: 'failed', why: out.why, nextTryAt: undefined });
  });
};

/** Take one job as far as it can go now. */
export const advance = async (deps: RunDeps, id: string): Promise<Job | undefined> => {
  for (let guard = 0; guard < 50; guard++) {
    const job = (await listJobs(deps.now())).find((j) => j.id === id);
    if (!job || (job.state !== 'approved' && job.state !== 'running')) return job;
    if (deps.now() >= deadlineOf(job) && job.steps.some((s) => s.state === 'todo')) return job;
    const steps = stepOrder(job.steps);
    if (steps.every((s) => s.state === 'done'))
      return updateJob(id, (j) => withHash({ ...j, state: 'done', endedAt: deps.now(), figures: undefined }));
    if (steps.some((s) => s.state === 'failed'))
      return updateJob(id, (j) => withHash({ ...j, state: 'stopped', endedAt: deps.now(), figures: undefined }));
    // The first step not done: one at a time, in order. A stop for the person halts the job.
    const next = steps.find((s) => s.state !== 'done')!;
    if (next.state === 'needsYou') return job;
    if (next.nextTryAt !== undefined && next.nextTryAt > deps.now()) return job;
    if (!deps.allowed()) return job;
    const after = await runStep(deps, job, next);
    const now = after?.steps.find((s) => s.id === next.id);
    // Not finished this time: leave it for the next tick.
    if (!now || now.state !== 'done') return after;
  }
  return undefined;
};

/** One pass over every approved job, under the runner's lock. */
export const runJobs = async (deps: RunDeps): Promise<void> => {
  if (!deps.allowed()) return;
  await deps.lock(async () => {
    for (const j of await listJobs(deps.now()))
      if (j.state === 'approved' || j.state === 'running') await advance(deps, j.id);
  });
};

/** The person tapped "Try again" on a step that stopped for them: it runs on the next pass. */
export const tryAgain = (id: string, stepId: string): Promise<Job | undefined> =>
  updateJob(id, (j) =>
    j.state === 'running' || j.state === 'approved'
      ? setStep(j, stepId, { state: 'todo', why: undefined, nextTryAt: undefined })
      : undefined,
  );
