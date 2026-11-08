// "Do it for me": the job record (design v2, 4), in this browser's IndexedDB
// (`veilcore.ask.job.v1`), on this device only. Never in a backup (backup.ts reads none of it),
// never sent anywhere. The founder approved it; it holds as little as it can:
//
//   holds   step states and when to try next, the plan's rev and hash, when it was made and
//           approved, references (row hashes in the bulk-import ledger, record ids, the
//           agreements' invite ids and periods), the few values typed in the request that a
//           batch is rebuilt from (counts, a sire's code, a first tag) and the answers given on
//           the result screen. A report's typed figures are kept only until that report is sent.
//   never   the request as typed, tokens, secrets, or a copy of anything another store keeps
//           (the records themselves are in the ledger; the terms are with the license).
//
// Expiry is checked every time the jobs are read: a job not done within 72 hours of being made
// stops ("expired") and needs a new review; any job is deleted 7 days after it ends. Records it
// held for the backup and never sent are dropped then, through bulk-import.ts dropHeld, which
// deletes only `held` rows of this job's own hashes.
//
// Approve is compare-and-set: the tab sends the hash of the plan it drew, and in one IndexedDB
// transaction the job is approved only if that is still the stored plan's hash and the job is
// still `ready`. Every edit bumps `rev` and the hash with it. So an edit in another tab, then
// Approve on a stale screen, sends nothing.
// SPDX-License-Identifier: Apache-2.0

import { canonicalise } from 'veilcore-records';
import { sha256 } from '@noble/hashes/sha2.js';

export const JOB_DB = 'veilcore.ask.job.v1';
const STORE = 'jobs';

/** How long a job can wait for approval, and run, after it is made. */
export const JOB_TTL_MS = 72 * 3600_000;
/** How long a job is kept after it ends (done, stopped, expired, discarded). */
export const JOB_KEEP_MS = 7 * 86_400_000;
/**
 * How long an approved job that has started may keep trying before it stops for the person to
 * look at (never deleted while it runs; this is its visible end).
 */
export const JOB_STUCK_MS = 30 * 86_400_000;

export type JobKind = 'batch' | 'due' | 'import' | 'ready';
export type StepKind = 'records' | 'report' | 'stamp';
export type StepState = 'todo' | 'running' | 'done' | 'failed' | 'needsYou' | 'waiting';

export type Step = {
  readonly id: string;
  readonly kind: StepKind;
  readonly state: StepState;
  /** Not tried again before this (ms since 1970): kept across a reload. */
  readonly nextTryAt?: number;
  /** Why it failed or stopped, in the words of whatever refused it. */
  readonly why?: string;
  /** What it was about when it ended ("already there", how many were saved). */
  readonly note?: string;
  /**
   * It has been marked running at least once: something may have been sent. A job with a started
   * records step never has its held rows dropped (they may be on the registry).
   */
  readonly started?: boolean;
};

/**
 * A batch's own values: typed in the request, or answered on the result screen. For a collection
 * (kind 'import'), only `preset` ('offspring' for animals) and `count` (the number said, 0 if none).
 */
export type BatchSpec = {
  readonly preset: 'clones' | 'offspring';
  readonly count: number;
  readonly males?: number;
  readonly females?: number;
  readonly sireCode?: string;
  readonly ai?: boolean;
  readonly individualId?: string;
  readonly idScheme?: string;
  readonly idsLater?: boolean;
  readonly firstTag?: string;
  /** Answered on the result screen when no own parent says it. */
  readonly bredBy?: string;
  readonly taxon?: string;
  /** Pasted on the result screen: one ID per young animal, in order. */
  readonly ids?: readonly string[];
  /** Clones: the lot, as typed ("lot B"). */
  readonly lotName?: string;
  /** Born or cut yesterday, as typed; else today. */
  readonly date?: 'yesterday';
};

export type ReportRef = {
  /** The held license (held-licenses.ts) by its invite id. */
  readonly inviteId: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  /** Made at prepare, never derived: the report's id. */
  readonly statementId: string;
  /** The deal's currency, read fresh at prepare (royalty-terms.ts withDealCurrency). */
  readonly currency?: string;
  /** When the terms say this report is due (YYYY-MM-DD). */
  readonly dueOn?: string;
  /**
   * When the period ends a contract year with a yearly minimum: what that year's other reports owe
   * so far (read fresh at prepare) and the minimum, so the top-up is in the amount approved.
   */
  readonly minimum?: {
    readonly yearFrom: string;
    readonly yearTo: string;
    readonly owedBefore: string;
    readonly minimum: string;
  };
};

/**
 * A report's figures as typed on the result screen, and what they come to (the amount and currency
 * Approve shows, in the plan's hash): kept only until it is sent. The report is signed only if it
 * comes to exactly this.
 */
export type Figures = {
  readonly quantity?: string;
  readonly offspring?: string;
  readonly nothing?: boolean;
  readonly amount?: string;
  readonly currency?: string;
};

export type JobState = 'ready' | 'approved' | 'running' | 'done' | 'stopped' | 'expired' | 'discarded';

export type Job = {
  readonly v: 1;
  /** 128 random bits. */
  readonly id: string;
  readonly kind: JobKind;
  readonly state: JobState;
  readonly rev: number;
  readonly hash: string;
  readonly createdAt: number;
  readonly approvedAt?: number;
  /** The person said to go on after it stopped for them (Try again): it never lapses again. */
  readonly resumedAt?: number;
  readonly endedAt?: number;
  /** Values fixed when the job was made (in the hash): today's date on this device. */
  readonly frozen: { readonly today: string };
  readonly refs: {
    readonly rowHashes?: readonly string[];
    readonly parentId?: string;
    readonly sireId?: string;
    readonly damId?: string;
    readonly recordId?: string;
    readonly reports?: readonly ReportRef[];
  };
  readonly spec?: BatchSpec;
  readonly figures?: Readonly<Record<string, Figures>>;
  /** Bring in a collection: what the check found (counts, and the lines that need a fix). */
  readonly sheet?: {
    readonly fileName: string;
    readonly ready: number;
    readonly fix: readonly number[];
    readonly expect?: number;
  };
  /** A checked backup is needed before Approve (new keys were made). */
  readonly backupNeeded: boolean;
  readonly steps: readonly Step[];
};

/** The part of a job its hash covers: everything the result screen shows and Approve sends. */
export const planHash = (j: Omit<Job, 'hash'> | Job): string => {
  const view = {
    v: j.v,
    id: j.id,
    kind: j.kind,
    rev: j.rev,
    frozen: j.frozen,
    refs: j.refs,
    spec: j.spec ?? {},
    figures: j.figures ?? {},
    sheet: j.sheet ?? {},
    backupNeeded: j.backupNeeded,
    steps: j.steps.map((s) => [s.id, s.kind]),
  };
  const bytes = sha256(new TextEncoder().encode(canonicalise(JSON.parse(JSON.stringify(view)) as object)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const withHash = (j: Omit<Job, 'hash'> | Job): Job => ({ ...j, hash: planHash(j) });

/** A new id: 128 random bits, hex. Never derived from the plan. */
export const newJobId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

export const isLive = (j: Job): boolean => j.state === 'ready' || j.state === 'approved' || j.state === 'running';
export const isEnded = (j: Job): boolean => !isLive(j);
/** End of a calendar day on this device's clock. */
const endOfDay = (day: string): number => new Date(`${day}T23:59:59.999`).getTime();

/**
 * When approval lapses: 72 hours after the job was made, or, for reports, at the end of the
 * earliest report's due day if that is sooner (a report due today waits no longer than today).
 */
export const deadlineOf = (j: Pick<Job, 'createdAt'> & Partial<Pick<Job, 'refs' | 'frozen'>>): number => {
  const ttl = j.createdAt + JOB_TTL_MS;
  const dues = (j.refs?.reports ?? [])
    .map((r) => r.dueOn)
    .filter((d): d is string => !!d && (!j.frozen || d >= j.frozen.today))
    .map(endOfDay);
  return Math.min(ttl, ...dues);
};

/** Some step was started: something may have gone out. */
export const anyStarted = (j: Job): boolean => j.steps.some((s) => s.started);
/** The records step was started: its rows may be on the registry, so they are never dropped. */
export const recordsStarted = (j: Job): boolean => j.steps.some((s) => s.kind === 'records' && s.started);

// ---- the pure rules (tested without a database) ----------------------------------------------

export type ApproveRefusal = 'changed' | 'notReady' | 'expired' | 'gone' | 'unanswered';

/** Approve: only the plan the tab drew, only while ready, only before its deadline. */
export const approveIn = (
  cur: Job | undefined,
  renderedHash: string,
  now: number,
  answered: (j: Job) => boolean = complete,
): { job: Job } | { refused: ApproveRefusal } => {
  if (!cur) return { refused: 'gone' };
  if (cur.state !== 'ready') return { refused: 'notReady' };
  if (now >= deadlineOf(cur)) return { refused: 'expired' };
  if (cur.hash !== renderedHash || planHash(cur) !== renderedHash) return { refused: 'changed' };
  // Checked again here, not only on the screen: every question answered (L7).
  if (!answered(cur)) return { refused: 'unanswered' };
  // The hash stays the one approved. Values another store now keeps (pasted IDs, sealed into the
  // held records; the answers) aren't needed after approval and go (L9).
  const spec = cur.spec ? { ...cur.spec, ids: undefined, bredBy: undefined, taxon: undefined } : undefined;
  return { job: { ...cur, ...(spec ? { spec } : {}), state: 'approved', approvedAt: now } };
};

/** What the store itself can check of a job's answers: rows sealed, a file read, every report's figures. */
export const complete = (j: Job): boolean => {
  if ((j.kind === 'batch' || j.kind === 'import') && !j.refs.rowHashes?.length) return false;
  if (j.kind === 'import' && !j.sheet) return false;
  if (j.kind === 'due')
    return (j.refs.reports ?? []).every((_, i) => {
      const f = j.figures?.[`report${i}`];
      return !!f && f.amount !== undefined && (f.nothing === true || /^\d+(\.\d+)?$/.test(f.quantity ?? ''));
    });
  return true;
};

/** An edit: only to the plan the tab drew, only while ready. Bumps rev and the hash. */
export const editIn = (
  cur: Job | undefined,
  renderedHash: string,
  change: (j: Job) => Omit<Job, 'hash'>,
): { job: Job } | { refused: ApproveRefusal } => {
  if (!cur) return { refused: 'gone' };
  if (cur.state !== 'ready') return { refused: 'notReady' };
  if (cur.hash !== renderedHash) return { refused: 'changed' };
  return { job: withHash({ ...change(cur), rev: cur.rev + 1 }) };
};

export type Sweep = 'keep' | 'expire' | 'lapse' | 'stuck' | 'delete';

/** A records job whose records aren't all sent: it never ends by itself, so its records are never lost (V1). */
export const keepsRecords = (j: Job): boolean =>
  (j.kind === 'batch' || j.kind === 'import') && j.steps.some((s) => s.kind === 'records' && s.state !== 'done');

const asks = (j: Job, why: string): boolean => j.steps.some((s) => s.state === 'needsYou' && s.why === why);

/**
 * What a read finds due (design v2, 4, and the security review's S1, S2, and the verification's V1):
 *   - a job waiting for approval expires at its deadline, and its held rows go;
 *   - an approved records job never ends by itself and never loses its records. Not started by
 *     its deadline, it asks ('lapse': send now, or discard). Started (something may have gone
 *     out, or its rows are `pending` in the ledger), it keeps going, and 30 days after approval
 *     (or after the person last tapped Send now) it asks ('stuck': send now, which checks the
 *     server first). Either way it waits for the person;
 *   - a report or stamp job not started by its deadline expires (nothing went); started, it
 *     keeps going until done, and 30 days on it stops for the person to look at ('stuck');
 *   - any ended job is deleted 7 days after it ended.
 */
export const sweepOf = (j: Job, now: number, rowsPending = false): Sweep => {
  if (isEnded(j)) return now >= (j.endedAt ?? j.createdAt) + JOB_KEEP_MS ? 'delete' : 'keep';
  if (j.state === 'ready') return now >= deadlineOf(j) ? 'expire' : 'keep';
  const since = Math.max(j.approvedAt ?? j.createdAt, j.resumedAt ?? 0);
  const started = anyStarted(j) || rowsPending;
  if (keepsRecords(j)) {
    if (asks(j, 'lapsed') || asks(j, 'stuck')) return 'keep';
    if (!started) return now >= (j.resumedAt ? since + JOB_STUCK_MS : deadlineOf(j)) ? 'lapse' : 'keep';
    return now >= since + JOB_STUCK_MS ? 'stuck' : 'keep';
  }
  if (now >= since + JOB_STUCK_MS) return 'stuck';
  if (started || j.resumedAt) return 'keep';
  return now < deadlineOf(j) ? 'keep' : 'expire';
};

/** A job stopped at its deadline: steps not done stay undone (one that may have gone out still says so), typed figures go. */
export const expired = (j: Job, now: number): Job =>
  withHash({
    ...j,
    state: 'expired',
    endedAt: now,
    figures: undefined,
    steps: j.steps.map((s) =>
      s.state === 'done' || s.state === 'needsYou' ? s : { ...s, state: 'failed', nextTryAt: undefined },
    ),
  });

/** An approved records job not sent by its deadline: it asks, it never drops (S1). */
export const lapsed = (j: Job): Job =>
  withHash({
    ...j,
    state: 'running',
    steps: j.steps.map((s) =>
      s.kind === 'records' && s.state !== 'done' ? { ...s, state: 'needsYou', why: 'lapsed', nextTryAt: undefined } : s,
    ),
  });

/**
 * 30 days on and still not done. A records job asks and goes on (its records kept: send now
 * checks the server first); any other job stops, for the person to look at.
 */
export const stuck = (j: Job, now: number): Job =>
  keepsRecords(j)
    ? withHash({
        ...j,
        state: 'running',
        steps: j.steps.map((s) =>
          s.kind === 'records' && s.state !== 'done'
            ? { ...s, state: 'needsYou', why: 'stuck', nextTryAt: undefined }
            : s,
        ),
      })
    : withHash({
        ...j,
        state: 'stopped',
        endedAt: now,
        figures: undefined,
        steps: j.steps.map((s) =>
          s.state === 'done' ? s : { ...s, state: 'needsYou', why: 'stuck', nextTryAt: undefined },
        ),
      });

// ---- where jobs are kept ----------------------------------------------------------------------

export interface JobBackend {
  all(): Promise<Job[]>;
  get(id: string): Promise<Job | undefined>;
  /** One atomic read-modify-write: `fn` sees the stored job and returns what to store (or delete). */
  tx<T>(id: string, fn: (cur: Job | undefined) => { put?: Job; del?: true; out: T }): Promise<T>;
}

/** In memory: the tests, and a browser that won't open IndexedDB (jobs then end with the tab). */
export const memoryBackend = (): JobBackend => {
  const m = new Map<string, Job>();
  return {
    all: () => Promise.resolve([...m.values()]),
    get: (id) => Promise.resolve(m.get(id)),
    tx: (id, fn) => {
      const r = fn(m.get(id));
      if (r.del) m.delete(id);
      else if (r.put) m.set(id, r.put);
      return Promise.resolve(r.out);
    },
  };
};

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB'));
  });

/** This browser's IndexedDB. */
export const idbBackend = (): JobBackend => {
  let db: Promise<IDBDatabase> | undefined;
  const open = () =>
    (db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(JOB_DB, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => {
        db = undefined;
        reject(r.error ?? new Error('IndexedDB'));
      };
    }));
  return {
    all: async () => req((await open()).transaction(STORE).objectStore(STORE).getAll() as IDBRequest<Job[]>),
    get: async (id) => req((await open()).transaction(STORE).objectStore(STORE).get(id) as IDBRequest<Job | undefined>),
    tx: async (id, fn) => {
      const t = (await open()).transaction(STORE, 'readwrite');
      const s = t.objectStore(STORE);
      // Read and write in one transaction: nothing another tab writes can come between.
      const out = await new Promise<ReturnType<typeof fn>>((resolve, reject) => {
        const g = s.get(id);
        g.onerror = () => reject(g.error ?? new Error('IndexedDB'));
        g.onsuccess = () => {
          try {
            const r = fn(g.result as Job | undefined);
            if (r.del) s.delete(id);
            else if (r.put) s.put(r.put);
            resolve(r);
          } catch (e) {
            t.abort();
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        };
      });
      await new Promise<void>((resolve, reject) => {
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('IndexedDB'));
        t.onabort = () => reject(t.error ?? new Error('IndexedDB'));
      });
      return out.out;
    },
  };
};

// ---- the store ------------------------------------------------------------------------------

let backend: JobBackend | undefined;
const pick = (): JobBackend => {
  if (backend) return backend;
  try {
    backend = typeof indexedDB !== 'undefined' ? idbBackend() : memoryBackend();
  } catch {
    backend = memoryBackend();
  }
  return backend;
};

/** For the tests: use this backend (a fresh memory one by default). */
export const __useJobBackend = (b: JobBackend = memoryBackend()): JobBackend => {
  backend = b;
  return b;
};

/**
 * What the store asks of the rest of the app, set by it (ask-job/prepare.ts), stand-ins in tests:
 *   dropHeld       drop this job's own held rows (bulk-import.ts dropHeld: `held` rows only)
 *   rowsPending    whether any of these rows are `pending` in the ledger (they may have landed)
 *   forgetStamps   clear this job's stamps from the stamp queue (key-stamp.ts byJob), unless stopped
 */
export type StoreHooks = {
  dropHeld: (hashes: readonly string[], job: string) => Promise<unknown>;
  rowsPending: (hashes: readonly string[]) => boolean;
  forgetStamps: (job: string) => void;
};
let hooks: StoreHooks = {
  dropHeld: () => Promise.resolve(),
  rowsPending: () => false,
  forgetStamps: () => undefined,
};
export const setStoreHooks = (h: Partial<StoreHooks>): void => {
  hooks = { ...hooks, ...h };
};

/**
 * What goes with a job that ends: its stamps not yet made (S7), and its held rows only when the
 * person never approved it, or discarded it. An approved job's records are never dropped by
 * themselves (V1), and records that started going never at all (B2).
 */
const letGo = async (j: Job): Promise<void> => {
  hooks.forgetStamps(j.id);
  const mayDrop = !j.approvedAt || j.state === 'discarded';
  if (j.refs.rowHashes?.length && mayDrop && !recordsStarted(j)) await hooks.dropHeld(j.refs.rowHashes, j.id);
};

const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
const notify = (local = true) => {
  listeners.forEach((l) => l());
  if (local)
    try {
      channel?.postMessage('changed');
    } catch {
      /* the other tabs see it on their next read */
    }
};
/** Called when any job changes, in this tab or another. */
export const onJobsChange = (l: () => void): (() => void) => {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(JOB_DB);
    channel.onmessage = () => notify(false);
  }
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Every job, after the expiry sweep. */
export const listJobs = async (now = Date.now()): Promise<Job[]> => {
  const b = pick();
  const out: Job[] = [];
  let changed = false;
  for (const j of await b.all()) {
    const pending = !!j.refs.rowHashes?.length && hooks.rowsPending(j.refs.rowHashes);
    const what = sweepOf(j, now, pending);
    if (what === 'keep') {
      out.push(j);
      continue;
    }
    changed = true;
    const kept = await b.tx<{ job?: Job; ended: boolean }>(j.id, (cur) => {
      if (!cur) return { out: { ended: true } };
      const again = sweepOf(cur, now, pending);
      if (again === 'delete') return { del: true, out: { ended: true } };
      const next =
        again === 'expire'
          ? expired(cur, now)
          : again === 'lapse'
            ? lapsed(cur)
            : again === 'stuck'
              ? stuck(cur, now)
              : cur;
      return { put: next, out: { job: next, ended: isEnded(next) } };
    });
    if (kept.ended) await letGo(kept.job ?? j);
    if (kept.job) out.push(kept.job);
  }
  if (changed) notify();
  return out.sort((a, b) => b.createdAt - a.createdAt);
};

export const getJob = async (id: string, now = Date.now()): Promise<Job | undefined> =>
  (await listJobs(now)).find((j) => j.id === id);

export const putJob = async (j: Job): Promise<Job> => {
  const job = withHash(j);
  await pick().tx(job.id, () => ({ put: job, out: undefined }));
  notify();
  return job;
};

/** Approve the plan this tab drew (compare-and-set). */
export const approveJob = async (
  id: string,
  renderedHash: string,
  now = Date.now(),
  answered: (j: Job) => boolean = complete,
): Promise<{ job: Job } | { refused: ApproveRefusal }> => {
  const r = await pick().tx<{ job: Job } | { refused: ApproveRefusal }>(id, (cur) => {
    const a = approveIn(cur, renderedHash, now, answered);
    return 'job' in a ? { put: a.job, out: a } : { out: a };
  });
  notify();
  return r;
};

/** Change the plan this tab drew (compare-and-set). */
export const editJob = async (
  id: string,
  renderedHash: string,
  change: (j: Job) => Omit<Job, 'hash'>,
): Promise<{ job: Job } | { refused: ApproveRefusal }> => {
  const r = await pick().tx<{ job: Job } | { refused: ApproveRefusal }>(id, (cur) => {
    const e = editIn(cur, renderedHash, change);
    return 'job' in e ? { put: e.job, out: e } : { out: e };
  });
  notify();
  return r;
};

/** The runner's own writes: step states. Not for the plan (that is editJob). */
export const updateJob = async (id: string, change: (j: Job) => Job | undefined): Promise<Job | undefined> => {
  const r = await pick().tx(id, (cur) => {
    if (!cur) return { out: undefined };
    const next = change(cur);
    return next ? { put: next, out: next } : { out: cur };
  });
  notify();
  return r;
};

/**
 * Discard a job: one not approved, or approved but not started (nothing went: a lapsed job the
 * person chooses not to send). Its held records and its stamps not yet made go.
 */
export const discardJob = async (id: string, now = Date.now()): Promise<void> => {
  const j = await updateJob(id, (cur) =>
    cur.state === 'ready' || ((cur.state === 'approved' || cur.state === 'running') && !anyStarted(cur))
      ? withHash({ ...cur, state: 'discarded', endedAt: now, figures: undefined })
      : undefined,
  );
  if (j?.state === 'discarded') await letGo(j);
};
