// Paid plans, the site's half (the registry's billing.js holds the rules). A plan belongs to
// the holder key, as records do: no account, no password, nothing about the holder here.
//
// - The plan is read from the registry (GET /api/billing/plan) and kept in memory.
// - Buying opens Paddle's own checkout page in a new tab: the registry opens the checkout and
//   answers its link (POST /api/billing/checkout). No payment company's script runs on this
//   site, which holds the holder's keys.
// - Before a new record is made, corrected or imported (records.ts), planGate says whether the
//   free number is used up, so nothing is sealed that the registry would refuse to date. With
//   the plan unknown (not read, unreachable) a new record is not made: the free number may be
//   used up, and a record sealed then would sit undated.
// - The plan is read when the holder's records load (records.ts refresh) and before each async
//   path that makes records (readPlan). A read is for one holder key: after any change of key
//   it no longer applies until read again (planFor).
//
// Off (config/network.ts PAID_PLANS_ENABLED), every function here does nothing.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { PAID_PLANS_ENABLED } from '../config/network';
import { holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export type Plan = {
  readonly plan: string;
  readonly status: string | null;
  readonly periodEnd: string | null;
  readonly recordsHeld: number;
  /** What counts against the free plan: proof codes dated, records deleted or not. */
  readonly recordsCounted: number;
  /** Received records not sealed yet: each holds a slot on the free plan until sealed. */
  readonly recordsReserved: number;
  readonly recordCap: number;
  /** The plans the registry sells, by name. */
  readonly plans: readonly string[];
};
/** Plans with words of their own in every language; any other the registry sells shows its name. */
export const KNOWN_PLANS = ['breeder', 'lab'] as const;
const PLAN_NAME = /^[a-z]{2,20}$/;

let current: Plan | null = null;
let currentFor: string | null = null;
// The registry answered that paid plans are off, for this key: nothing here ever blocks.
let offFor: string | null = null;
const listeners = new Set<() => void>();
const set = (p: Plan | null, key: string | null) => {
  current = p;
  currentFor = key;
  for (const l of listeners) l();
};
/** The plan read, if it was read for the key this browser uses now. */
const planFor = (): Plan | null => (current && currentFor === holderKeyIfAny() ? current : null);

/** What billing needs of a record here to tell whether it will count on the free plan. */
export type Countable = {
  readonly id: string;
  readonly recordFingerprint?: string;
  readonly receivedFrom?: string;
  readonly supersedes?: { readonly recordId: string };
};

/**
 * Records here that will count on the free plan once VeilCore stores them: content with a proof
 * code that VeilCore hasn't stored yet (`stored`). The free plan counts proof codes dated, as the
 * registry does (its recordsCounted already has everything it stored, deleted records included),
 * so only what is waiting here is added to it. A record's first correction of the holder's own
 * record (not itself a correction, not received) is free, as on the registry.
 */
export const waitingCount = (rs: readonly Countable[], stored: (id: string) => boolean): number => {
  const byId = new Map(rs.map((r) => [r.id, r]));
  // A record's correction is free only once: a second one here of the same record counts.
  const correctedHere = new Map<string, number>();
  for (const r of rs)
    if (r.supersedes) correctedHere.set(r.supersedes.recordId, (correctedHere.get(r.supersedes.recordId) ?? 0) + 1);
  const free = (r: Countable) => {
    const t = r.supersedes ? byId.get(r.supersedes.recordId) : undefined;
    return !!t && !t.supersedes && !t.receivedFrom && correctedHere.get(t.id) === 1;
  };
  // One proof code is one date, however many rows carry it.
  const fps = new Set<string>();
  for (const r of rs) if (r.recordFingerprint && !stored(r.id) && !free(r)) fps.add(r.recordFingerprint);
  return fps.size;
};

type RawPlan = Omit<Plan, 'recordsCounted' | 'recordsReserved' | 'plans'> & {
  readonly recordsCounted?: unknown;
  readonly recordsReserved?: unknown;
  readonly plans?: unknown;
};
const isPlan = (v: unknown): v is RawPlan =>
  isObject(v) &&
  isString(v.plan) &&
  (v.status === null || isString(v.status)) &&
  (v.periodEnd === null || isString(v.periodEnd)) &&
  typeof v.recordsHeld === 'number' &&
  Number.isSafeInteger(v.recordsHeld) &&
  typeof v.recordCap === 'number' &&
  Number.isSafeInteger(v.recordCap);

/** The registry's answer as this page uses it; fields an older registry leaves out are filled in. */
const asPlan = (v: unknown): Plan | null => {
  if (!isPlan(v)) return null;
  const o = v;
  const counted =
    typeof o.recordsCounted === 'number' && Number.isSafeInteger(o.recordsCounted) ? o.recordsCounted : o.recordsHeld;
  const plans = Array.isArray(o.plans) ? o.plans.filter((p): p is string => isString(p) && PLAN_NAME.test(p)) : [];
  const reserved =
    typeof o.recordsReserved === 'number' && Number.isSafeInteger(o.recordsReserved) && o.recordsReserved > 0
      ? o.recordsReserved
      : 0;
  return { ...o, recordsCounted: counted, recordsReserved: reserved, plans: plans.length ? plans : [...KNOWN_PLANS] };
};

/** Read the holder's plan from the registry. Null when off, with no holder yet, or unreachable. */
export const refreshPlan = async (fetchImpl: typeof fetch = fetch): Promise<Plan | null> => {
  if (!PAID_PLANS_ENABLED) return null;
  const k = holderKeyIfAny();
  if (!k) return null;
  try {
    const res = await fetchImpl(`${BASE}/api/billing/plan`, { headers: { 'x-holder-key': k } });
    if (res.status === 404) {
      offFor = k;
      return null;
    }
    const plan = asPlan(await readJson(res).catch(() => null));
    if (!res.ok || !plan) return planFor();
    set(plan, k);
    return plan;
  } catch {
    return planFor();
  }
};

export const currentPlan = (): Plan | null => planFor();

/** Read the plan unless it is already known for this key (or the registry said plans are off). */
export const readPlan = async (fetchImpl: typeof fetch = fetch): Promise<void> => {
  if (!PAID_PLANS_ENABLED) return;
  const k = holderKeyIfAny();
  if (!k || offFor === k || planFor()) return;
  await refreshPlan(fetchImpl);
};

export const usePlan = (): Plan | null =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    planFor,
    () => null,
  );

/**
 * How many more records the free plan dates, or null when no limit applies (off, paid, not read
 * yet). `waiting` is what waits here to be stored (waitingCount), on top of the registry's count.
 */
export const freeLeft = (plan: Plan | null, waiting: number): number | null => {
  if (!PAID_PLANS_ENABLED || !plan || plan.plan !== 'free') return null;
  return Math.max(0, plan.recordCap - plan.recordsCounted - plan.recordsReserved - waiting);
};

export type PlanRefusal = 'app.plan.full' | 'app.plan.unknown';
/**
 * Why `n` new records can't be made on this plan now, or null. Off (here or at the registry),
 * no holder key yet (a first record), or paid: null. The plan not known for this key: refused,
 * and read in the background so the next try knows (readPlan before async paths avoids this).
 */
export const planGate = (n: number, waiting: number): PlanRefusal | null => {
  if (!PAID_PLANS_ENABLED || n <= 0) return null;
  const k = holderKeyIfAny();
  if (!k || offFor === k) return null;
  const plan = planFor();
  if (!plan) {
    void refreshPlan();
    return 'app.plan.unknown';
  }
  const left = freeLeft(plan, waiting);
  return left !== null && n > left ? 'app.plan.full' : null;
};

/** Whether adding `n` new records would be refused on this plan now (planGate). */
export const planBlocks = (n: number, waiting: number): boolean => planGate(n, waiting) !== null;

/** Read the plan again whenever this page comes back into view (after paying on Paddle's tab). */
export const watchPlanOnReturn = (): (() => void) => {
  if (!PAID_PLANS_ENABLED || typeof window === 'undefined') return () => undefined;
  const again = () => {
    if (document.visibilityState !== 'hidden') void refreshPlan();
  };
  window.addEventListener('focus', again);
  document.addEventListener('visibilitychange', again);
  return () => {
    window.removeEventListener('focus', again);
    document.removeEventListener('visibilitychange', again);
  };
};

export type CheckoutError =
  | 'app.plan.err.off'
  | 'app.plan.err.unreachable'
  | 'app.plan.err.busy'
  | 'app.plan.err.noRecord'
  | 'app.plan.err.blocked';

/** A tab opened now, while the click still counts (Safari blocks one opened after a wait). */
type Tab = { go: (url: string) => void; close: () => void } | null;
const openTabNow = (): Tab => {
  const w = window.open('', '_blank');
  if (!w) return null;
  try {
    w.opener = null;
  } catch {
    /* already cut off */
  }
  return {
    go: (url) => {
      w.location.replace(url);
    },
    close: () => {
      w.close();
    },
  };
};

/**
 * Open Paddle's checkout for a plan in a new tab. The registry opens it and answers its link;
 * the link must be Paddle's (https, on paddle.io), or nothing is opened. Returns an error key
 * for the page to say, or null.
 */
export const openCheckout = async (
  plan: string,
  fetchImpl: typeof fetch = fetch,
  tab: () => Tab = openTabNow,
): Promise<CheckoutError | null> => {
  if (!PAID_PLANS_ENABLED) return 'app.plan.err.off';
  const k = holderKeyIfAny();
  if (!k || !PLAN_NAME.test(plan)) return 'app.plan.err.off';
  // Opened first, synchronously, then sent to Paddle's page once the registry answers.
  const w = tab();
  if (!w) return 'app.plan.err.blocked';
  const fail = (e: CheckoutError): CheckoutError => {
    w.close();
    return e;
  };
  try {
    const res = await fetchImpl(`${BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-holder-key': k },
      body: JSON.stringify({ plan }),
    });
    if (res.status === 429) return fail('app.plan.err.busy');
    if (res.status === 409) return fail('app.plan.err.noRecord');
    const body = await readJson(res).catch(() => null);
    const url = res.ok && isObject(body) && isString(body.url) ? body.url : '';
    if (!/^https:\/\/([a-z-]+\.)?paddle\.io\/checkout\/hsc_[0-9a-z]+\?transaction_id=txn_[0-9a-z]+$/.test(url))
      return fail('app.plan.err.unreachable');
    w.go(url);
    return null;
  } catch {
    return fail('app.plan.err.unreachable');
  }
};
