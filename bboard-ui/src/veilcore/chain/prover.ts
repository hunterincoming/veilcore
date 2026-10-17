// The page's side of the proving worker: a ProvingProvider midnight-js can use, plus the
// sponsor's proof of work. One worker, started on first use.
//
// The site's Content-Security-Policy requires Trusted Types for scripts
// (scripts/vercel-config.mjs: require-trusted-types-for 'script'), and a Worker's script
// address is one of the places that rule covers. `new Worker(new URL(...))` was refused by
// Chrome before any proving began ("Failed to construct 'Worker': This document requires
// 'TrustedScriptURL' assignment"), so every date stamp on the test site failed with "The date
// stamp didn't go through" (found 17 Oct 2026). The worker's address now comes from Vite
// (`?worker&url`, the bundled worker file on this site) and goes through one policy,
// `veilcore-prover`, which the CSP names and which allows exactly that address and nothing else.
// SPDX-License-Identifier: Apache-2.0

import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import proverWorkerUrl from './prover.worker.ts?worker&url';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let worker: Worker | undefined;
let ready: Promise<void> | undefined;
const readyGate: { open?: () => void } = {};
let nextId = 1;
const pending = new Map<number, Pending>();
let onProgress: ((msg: string) => void) | undefined;

/** The Trusted Types policy name the CSP allows for the worker (scripts/vercel-config.mjs). */
export const PROVER_POLICY = 'veilcore-prover';

type ScriptUrlPolicy = { createScriptURL: (url: string) => unknown };
type TrustedTypesFactory = {
  createPolicy: (name: string, rules: { createScriptURL: (url: string) => string }) => ScriptUrlPolicy;
};
let policy: ScriptUrlPolicy | undefined;

/**
 * The worker's script address, as the page's Trusted Types rule wants it: through the
 * `veilcore-prover` policy where the browser has Trusted Types, which lets through only the
 * bundled worker on this site's own origin. A plain string where it doesn't.
 */
export const proverScriptUrl = (
  base: string = typeof location === 'undefined' ? 'http://localhost/' : location.href,
  tt: TrustedTypesFactory | undefined = (globalThis as { trustedTypes?: TrustedTypesFactory }).trustedTypes,
): unknown => {
  const href = new URL(proverWorkerUrl, base).href;
  if (!tt?.createPolicy) return href;
  policy ??= tt.createPolicy(PROVER_POLICY, {
    createScriptURL: (url: string) => {
      const u = new URL(url, base);
      if (u.href !== href || u.origin !== new URL(base).origin) throw new TypeError('Not the proving worker.');
      return u.href;
    },
  });
  return policy.createScriptURL(href);
};

const start = (): Worker => {
  if (worker) return worker;
  ready = new Promise<void>((r) => {
    readyGate.open = r;
  });
  // A TrustedScriptURL where Trusted Types apply (typed as a string: TypeScript's DOM types
  // don't have Trusted Types yet).
  worker = new Worker(proverScriptUrl() as string, { type: 'module' });
  worker.onmessage = (
    ev: MessageEvent<{
      id?: number;
      ok?: boolean;
      value?: unknown;
      error?: string;
      progress?: string;
      ready?: boolean;
    }>,
  ) => {
    const m = ev.data;
    if (m.ready) {
      readyGate.open?.();
      return;
    }
    if (m.progress !== undefined) {
      onProgress?.(m.progress);
      return;
    }
    if (m.id === undefined) return;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.value);
    else p.reject(new Error(m.error ?? 'The prover failed.'));
  };
  worker.onerror = (e) => {
    // A crash in the prover (out of memory on a small phone, say) ends the worker; every
    // waiting call fails with that, and the next call starts a fresh worker. So does a worker
    // that never loaded (its file or its WebAssembly refused): proverReady hears it too.
    const why = new Error(e.message || 'The prover stopped. Try on a laptop if it repeats.');
    for (const p of pending.values()) p.reject(why);
    pending.clear();
    for (const f of [...startFailures]) f(why);
    worker = undefined;
    ready = undefined;
  };
  return worker;
};

/** Who is waiting in proverReady for the worker to fail to start. */
const startFailures = new Set<(e: Error) => void>();

/**
 * Start the prover now, and wait until it is listening (its WebAssembly loaded). Called first
 * thing in a call (actions.ts), before anything is read from the network: a browser that
 * refuses the worker (a policy, a blocked file) is told at once, in the prover's own words,
 * and the prover is warm by the time the transaction is ready to prove.
 */
export const proverReady = (timeoutMs = 90_000): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let gate: Promise<void> | undefined;
    try {
      start();
      gate = ready;
    } catch (e) {
      worker = undefined;
      ready = undefined;
      reject(new Error(`The prover could not start in this browser: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }
    const done = (f: () => void) => {
      clearTimeout(timer);
      startFailures.delete(onFail);
      f();
    };
    const onFail = (e: Error) =>
      done(() => reject(new Error(`The prover could not start in this browser: ${e.message}`)));
    const timer = setTimeout(
      () => done(() => reject(new Error('The prover did not start in time. Try again, or on a laptop.'))),
      timeoutMs,
    );
    startFailures.add(onFail);
    void (gate ?? Promise.resolve()).then(() => done(resolve));
  });

const call = <T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = nextId++;
    let w: Worker;
    try {
      w = start();
    } catch (e) {
      // The worker couldn't be made at all (a browser policy refused it): said as it is, and
      // the next call tries afresh.
      worker = undefined;
      ready = undefined;
      reject(new Error(`The prover could not start in this browser: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    void (ready ?? Promise.resolve()).then(() => w.postMessage({ ...msg, id }, transfer));
  });

/** Where progress messages from the worker go (the step's status line). */
export const setProverProgress = (fn: ((msg: string) => void) | undefined): void => {
  onProgress = fn;
};

/** A ProvingProvider backed by the worker. `cacheName` keys the downloaded files to one contract build. */
export const workerProvingProvider = (cacheName: string): ProvingProvider => ({
  check: (preimage, keyLocation) => call<(bigint | undefined)[]>({ op: 'check', preimage, keyLocation, cacheName }),
  prove: (preimage, keyLocation, bindingInput) =>
    call<Uint8Array>({ op: 'prove', preimage, keyLocation, bindingInput, cacheName }),
});

export const workerPow = (challenge: string, tx: Uint8Array, difficulty: number): Promise<string> =>
  call<string>({ op: 'pow', challenge, tx, difficulty });
