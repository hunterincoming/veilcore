// Paid plans, the site's half (the registry's billing.js holds the rules). A plan belongs to
// the holder key, as records do: no account, no password, nothing about the holder here.
//
// - The plan is read from the registry (GET /api/billing/plan) and kept in memory.
// - Buying opens Paddle's own checkout page in a new tab: the registry opens the checkout and
//   answers its link (POST /api/billing/checkout). No payment company's script runs on this
//   site, which holds the holder's keys.
// - Before a new record is made (records.ts), planBlocks says whether the free number is used
//   up, so nothing is sealed that the registry would refuse to date.
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
  readonly recordCap: number;
};
/** The plans a holder can choose here. Their prices are on Paddle's page. */
export const PLANS = ['breeder', 'lab'] as const;
export type PlanName = (typeof PLANS)[number];

let current: Plan | null = null;
const listeners = new Set<() => void>();
const set = (p: Plan | null) => {
  current = p;
  for (const l of listeners) l();
};

const isPlan = (v: unknown): v is Plan =>
  isObject(v) &&
  isString(v.plan) &&
  (v.status === null || isString(v.status)) &&
  (v.periodEnd === null || isString(v.periodEnd)) &&
  typeof v.recordsHeld === 'number' &&
  Number.isSafeInteger(v.recordsHeld) &&
  typeof v.recordCap === 'number' &&
  Number.isSafeInteger(v.recordCap);

/** Read the holder's plan from the registry. Null when off, with no holder yet, or unreachable. */
export const refreshPlan = async (fetchImpl: typeof fetch = fetch): Promise<Plan | null> => {
  if (!PAID_PLANS_ENABLED) return null;
  const k = holderKeyIfAny();
  if (!k) return null;
  try {
    const res = await fetchImpl(`${BASE}/api/billing/plan`, { headers: { 'x-holder-key': k } });
    const body = await readJson(res).catch(() => null);
    if (!res.ok || !isPlan(body)) return current;
    set(body);
    return body;
  } catch {
    return current;
  }
};

export const currentPlan = (): Plan | null => current;

export const usePlan = (): Plan | null =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );

/** How many more records the free plan keeps, or null when no limit applies (off, paid, not read yet). */
export const freeLeft = (plan: Plan | null, heldHere: number): number | null => {
  if (!PAID_PLANS_ENABLED || !plan || plan.plan !== 'free') return null;
  return Math.max(0, plan.recordCap - Math.max(heldHere, plan.recordsHeld));
};

/**
 * Whether adding `n` new records would pass the free number. Uses the larger of what this
 * browser holds and what the registry last said, so a record waiting to be sent still counts.
 * Not read yet, off, or paid: never blocks (the registry still refuses past its ceiling).
 */
export const planBlocks = (n: number, heldHere: number): boolean => {
  const left = freeLeft(current, heldHere);
  return left !== null && n > left;
};

/**
 * Open Paddle's checkout for a plan in a new tab. The registry opens it and answers its link;
 * the link must be Paddle's (https, on paddle.io), or nothing is opened. Returns an error key
 * for the page to say, or null.
 */
export const openCheckout = async (
  plan: PlanName,
  fetchImpl: typeof fetch = fetch,
  open: (url: string) => void = (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
): Promise<'app.plan.err.off' | 'app.plan.err.unreachable' | 'app.plan.err.busy' | null> => {
  if (!PAID_PLANS_ENABLED) return 'app.plan.err.off';
  const k = holderKeyIfAny();
  if (!k) return 'app.plan.err.off';
  try {
    const res = await fetchImpl(`${BASE}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-holder-key': k },
      body: JSON.stringify({ plan }),
    });
    if (res.status === 429) return 'app.plan.err.busy';
    const body = await readJson(res).catch(() => null);
    const url = res.ok && isObject(body) && isString(body.url) ? body.url : '';
    if (!/^https:\/\/([a-z-]+\.)?paddle\.io\/checkout\/hsc_[0-9a-z]+\?transaction_id=txn_[0-9a-z]+$/.test(url))
      return 'app.plan.err.unreachable';
    open(url);
    return null;
  } catch {
    return 'app.plan.err.unreachable';
  }
};
