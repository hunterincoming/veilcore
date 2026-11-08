// "Do it for me": the job store and the runner (store.ts, run.ts). Compare-and-set approve (an
// edit in tab B, then Approve in tab A, sends nothing), expiry and deletion on read, the runner's
// page rule, one step at a time with its state written first, a crash before and after every
// step, a lost report answer, nextTryAt across a reload, and permanent steps last.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import {
  JOB_KEEP_MS,
  JOB_TTL_MS,
  __useJobBackend,
  approveJob,
  discardJob,
  editJob,
  getJob,
  listJobs,
  newJobId,
  planHash,
  putJob,
  setDropHeld,
  updateJob,
  withHash,
  type Job,
} from './store';
import { advance, runJobs, stepOrder, tryAgain, type RunDeps, type Senders, type StepOutcome } from './run';

const T0 = Date.UTC(2026, 10, 7, 12);
let clock = T0;
const dropped: string[][] = [];
beforeEach(() => {
  clock = T0;
  dropped.length = 0;
  __useJobBackend();
  setDropHeld((h) => {
    dropped.push([...h]);
    return Promise.resolve(h.length);
  });
});

const job = (over: Partial<Job> = {}): Job =>
  withHash({
    v: 1,
    id: newJobId(),
    kind: 'batch',
    state: 'ready',
    rev: 1,
    hash: '',
    createdAt: clock,
    frozen: { today: '2026-11-07' },
    refs: { rowHashes: ['h1', 'h2'] },
    spec: { preset: 'clones', count: 2 },
    backupNeeded: false,
    steps: [{ id: 'records', kind: 'records', state: 'todo' }],
    ...over,
  });

const deps = (send: Partial<Senders>, allowed = () => true): RunDeps & { calls: string[] } => {
  const calls: string[] = [];
  const wrap =
    <A extends unknown[]>(name: string, f?: (...a: A) => Promise<StepOutcome>) =>
    (...a: A): Promise<StepOutcome> => {
      calls.push(name);
      return f ? f(...a) : Promise.resolve({ kind: 'done' });
    };
  return {
    calls,
    now: () => clock,
    allowed,
    lock: (fn) => fn(),
    send: {
      records: wrap('records', send.records),
      report: wrap('report', send.report),
      stamp: wrap('stamp', send.stamp),
    },
  };
};

describe('approve is compare-and-set', () => {
  it('approves the plan this tab drew', async () => {
    const j = await putJob(job());
    const r = await approveJob(j.id, j.hash, clock);
    expect('job' in r && r.job.state).toBe('approved');
  });

  it('an edit in tab B, then Approve in tab A: refused, nothing sent', async () => {
    const drawnInA = await putJob(job());
    // Tab B changes the plan.
    const b = await editJob(drawnInA.id, drawnInA.hash, (j) => ({ ...j, spec: { ...j.spec!, firstTag: 'X1' } }));
    expect('job' in b && b.job.rev).toBe(2);
    // Tab A still shows rev 1.
    expect(await approveJob(drawnInA.id, drawnInA.hash, clock)).toEqual({ refused: 'changed' });
    const d = deps({});
    await runJobs(d);
    expect(d.calls).toEqual([]);
    expect((await getJob(drawnInA.id, clock))?.state).toBe('ready');
  });

  it('a hash that doesn’t match the stored plan is refused, even if stored with it', async () => {
    const j = await putJob(job());
    // Someone wrote a job whose stored hash doesn't cover its plan.
    await updateJob(j.id, (cur) => ({ ...cur, spec: { ...cur.spec!, count: 99 } }));
    expect(await approveJob(j.id, j.hash, clock)).toEqual({ refused: 'changed' });
  });

  it('frozen rule values are in the hash', () => {
    const a = job();
    expect(planHash({ ...a, frozen: { today: '2026-11-08' } })).not.toBe(a.hash);
  });

  it('only once, and not after 72 hours', async () => {
    const j = await putJob(job());
    await approveJob(j.id, j.hash, clock);
    expect(await approveJob(j.id, j.hash, clock)).toEqual({ refused: 'notReady' });
    const k = await putJob(job());
    expect(await approveJob(k.id, k.hash, T0 + JOB_TTL_MS)).toEqual({ refused: 'expired' });
  });
});

describe('expiry and deletion, on every read', () => {
  it('a job not approved within 72 hours expires, its held rows dropped through dropHeld', async () => {
    await putJob(job());
    clock = T0 + JOB_TTL_MS;
    const [e] = await listJobs(clock);
    expect(e.state).toBe('expired');
    expect(dropped).toEqual([['h1', 'h2']]);
  });

  it('a job is deleted 7 days after it ends', async () => {
    const j = await putJob(job());
    await discardJob(j.id, clock);
    expect(dropped).toEqual([['h1', 'h2']]);
    expect((await listJobs(clock + JOB_KEEP_MS - 1)).map((x) => x.id)).toEqual([j.id]);
    expect(await listJobs(clock + JOB_KEEP_MS)).toEqual([]);
  });

  it('an approved job whose records are on their way doesn’t lapse', async () => {
    const j = await putJob(job({ state: 'running', steps: [{ id: 'records', kind: 'records', state: 'running' }] }));
    clock = T0 + JOB_TTL_MS + 1;
    expect((await getJob(j.id, clock))?.state).toBe('running');
  });

  it('an approved report job lapses at 72 hours, figures gone, nothing sent', async () => {
    const j = await putJob(
      job({
        kind: 'due',
        state: 'approved',
        refs: { reports: [{ inviteId: 'i', periodFrom: '2026-07-01', periodTo: '2026-09-30', statementId: 's' }] },
        figures: { report0: { quantity: '40' } },
        steps: [{ id: 'report0', kind: 'report', state: 'todo' }],
      }),
    );
    clock = T0 + JOB_TTL_MS;
    const d = deps({});
    await runJobs(d);
    const e = await getJob(j.id, clock);
    expect(e?.state).toBe('expired');
    expect(e?.figures).toBeUndefined();
    expect(d.calls).toEqual([]);
  });
});

describe('the runner', () => {
  it('never runs a job that isn’t approved, nor on a check or prove page', async () => {
    const ready = await putJob(job());
    const approved = await putJob(job({ state: 'approved' }));
    const paused = deps({}, () => false);
    await runJobs(paused);
    expect(paused.calls).toEqual([]);
    const d = deps({});
    await runJobs(d);
    expect(d.calls).toEqual(['records']);
    expect((await getJob(ready.id, clock))?.state).toBe('ready');
    expect((await getJob(approved.id, clock))?.state).toBe('done');
  });

  it('writes the step as running before it sends', async () => {
    const j = await putJob(job({ state: 'approved' }));
    let seen: string | undefined;
    await runJobs(
      deps({
        records: async () => {
          seen = (await getJob(j.id, clock))?.steps[0].state;
          return { kind: 'done' };
        },
      }),
    );
    expect(seen).toBe('running');
  });

  it('a crash before or after the records step sends them again as themselves, once done no more', async () => {
    const j = await putJob(job({ state: 'approved' }));
    // Killed mid-send: the step is left running.
    await updateJob(j.id, (cur) =>
      withHash({ ...cur, state: 'running', steps: [{ ...cur.steps[0], state: 'running' }] }),
    );
    const d = deps({});
    await runJobs(d);
    expect(d.calls).toEqual(['records']);
    // Killed after it landed: done stays done.
    await runJobs(d);
    expect(d.calls).toEqual(['records']);
    expect((await getJob(j.id, clock))?.state).toBe('done');
  });

  it('a report left running after a crash asks; Try again sends through the fresh check', async () => {
    const j = await putJob(
      job({
        kind: 'due',
        state: 'running',
        refs: { reports: [{ inviteId: 'i', periodFrom: '2026-07-01', periodTo: '2026-09-30', statementId: 's' }] },
        figures: { report0: { quantity: '40' } },
        steps: [{ id: 'report0', kind: 'report', state: 'running' }],
      }),
    );
    const d = deps({ report: () => Promise.resolve({ kind: 'done', note: 'already' }) });
    await runJobs(d);
    expect(d.calls).toEqual([]);
    expect((await getJob(j.id, clock))?.steps[0].state).toBe('needsYou');
    await tryAgain(j.id, 'report0');
    await runJobs(d);
    expect(d.calls).toEqual(['report']);
    const done = await getJob(j.id, clock);
    expect(done?.state).toBe('done');
    // The typed figure went with the send.
    expect(done?.figures).toBeUndefined();
  });

  it('a lost report answer stops and asks; the retry finds the one there and sends no second', async () => {
    const there: string[] = [];
    const report = (): Promise<StepOutcome> => {
      // The fresh read before a send (sayOnce): one there already, so nothing is sent.
      if (there.length) return Promise.resolve({ kind: 'done', note: 'already' });
      there.push('statement');
      return Promise.reject(new Error('Could not reach the VeilCore registry.'));
    };
    const j = await putJob(
      job({
        kind: 'due',
        state: 'approved',
        refs: { reports: [{ inviteId: 'i', periodFrom: '2026-07-01', periodTo: '2026-09-30', statementId: 's' }] },
        figures: { report0: { quantity: '40' } },
        steps: [{ id: 'report0', kind: 'report', state: 'todo' }],
      }),
    );
    const d = deps({ report });
    await runJobs(d);
    expect((await getJob(j.id, clock))?.steps[0].state).toBe('needsYou');
    await tryAgain(j.id, 'report0');
    await runJobs(d);
    expect(there).toEqual(['statement']);
    expect((await getJob(j.id, clock))?.steps[0].note).toBe('already');
  });

  it('nextTryAt survives a reload: no retry before it', async () => {
    const j = await putJob(job({ state: 'approved' }));
    const d = deps({ records: () => Promise.resolve({ kind: 'retry', at: clock + 60_000, why: 'offline' }) });
    await runJobs(d);
    expect((await getJob(j.id, clock))?.steps[0].nextTryAt).toBe(T0 + 60_000);
    // "Reload": a new runner reads the same store.
    const again = deps({});
    await runJobs(again);
    expect(again.calls).toEqual([]);
    clock = T0 + 60_000;
    await runJobs(again);
    expect(again.calls).toEqual(['records']);
  });

  it('a refusal stops the job with the refusal’s words; nothing else is tried', async () => {
    const j = await putJob(job({ state: 'approved' }));
    await runJobs(deps({ records: () => Promise.resolve({ kind: 'failed', why: 'too large' }) }));
    const s = await advance(deps({}), j.id);
    expect(s?.state).toBe('stopped');
    expect(s?.steps[0].why).toBe('too large');
  });

  it('a stamp handed to the queue waits, then finishes when it lands', async () => {
    let landed = false;
    const stamp = (): Promise<StepOutcome> =>
      Promise.resolve(landed ? { kind: 'done' } : { kind: 'waiting', at: clock + 3600_000 });
    const j = await putJob(
      job({
        kind: 'ready',
        state: 'approved',
        refs: { recordId: 'VEIL-1' },
        steps: [{ id: 'stamp', kind: 'stamp', state: 'todo' }],
      }),
    );
    await runJobs(deps({ stamp }));
    expect((await getJob(j.id, clock))?.steps[0].state).toBe('waiting');
    landed = true;
    clock += 3600_000;
    await runJobs(deps({ stamp }));
    expect((await getJob(j.id, clock))?.state).toBe('done');
  });

  it('permanent steps run last', () => {
    const order = stepOrder([
      { id: 'a', kind: 'records', state: 'todo' },
      { id: 'b', kind: 'stamp', state: 'todo' },
    ]);
    expect(order.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('the words', () => {
  it('Japanese never says "AI", and the mode is まとめて準備', async () => {
    const { job: ja } = await import('../i18n/app/ja/job');
    const { ask } = await import('../i18n/app/ja/ask');
    for (const [k, v] of Object.entries({ ...ja, ...ask })) expect(/\bAI\b|ＡＩ/.test(v), `${k}: ${v}`).toBe(false);
    expect(ja['app.job.mode']).toBe('まとめて準備');
  });

  it('the job record is never in a backup: backup.ts reads no IndexedDB', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.join(__dirname, '../veilcore/backup.ts'), 'utf8');
    expect(src).not.toMatch(/indexedDB|veilcore\.ask\.job/);
  });
});
