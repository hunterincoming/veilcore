// The page's side of the offline worker (docs/offline.md; the worker is offline/sw.js).
//
//   - Registers /sw.js, from this site only, with updateViaCache 'none', so the browser asks for
//     the worker itself past every cache on each check (security review S16: a worker outlives a
//     bad deploy; this is how a fix or the kill switch reaches it).
//   - In a build with VITE_OFFLINE=off registers nothing and unregisters any worker it finds
//     (the kill switch, with offline/sw-kill.js served as /sw.js).
//   - Says whether there is signal, and whether a newer copy of the site is ready, for the
//     banner (OfflineBar) and the install card (InstallCard).
//   - When signal comes back, or the worker says Background Sync fired, tells the record sync
//     (records.ts startRecordSync) to send now. It never sends anything itself.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';

export const OFFLINE_ON = import.meta.env.VITE_OFFLINE !== 'off';
export const SW_URL = '/sw.js';
const SW_POLICY = 'veilcore-sw';
/** What a page listens for to send now (records.ts startRecordSync). */
export const SEND_NOW_EVENT = 'veilcore-send-now';

type ScriptUrlPolicy = { createScriptURL: (url: string) => unknown };
type TrustedTypesFactory = {
  createPolicy: (name: string, rules: { createScriptURL: (url: string) => string }) => ScriptUrlPolicy;
};
let policy: ScriptUrlPolicy | undefined;

/**
 * The worker's address, as the page's Trusted Types rule wants it (scripts/vercel-config.mjs:
 * `trusted-types … veilcore-sw`): the policy lets through exactly /sw.js on this site and
 * nothing else. A plain string where the browser has no Trusted Types.
 */
export const workerScriptUrl = (
  base: string = location.href,
  tt: TrustedTypesFactory | undefined = (globalThis as { trustedTypes?: TrustedTypesFactory }).trustedTypes,
): unknown => {
  const href = new URL(SW_URL, base).href;
  if (!tt?.createPolicy) return href;
  policy ??= tt.createPolicy(SW_POLICY, {
    createScriptURL: (url: string) => {
      const u = new URL(url, base);
      if (u.href !== href || u.origin !== new URL(base).origin) throw new TypeError('Not the offline worker.');
      return u.href;
    },
  });
  return policy.createScriptURL(href);
};

export type OfflineState = {
  /** The browser says it has a connection. */
  readonly online: boolean;
  /** The worker copied a newer release than the one this page came from. */
  readonly updateReady: boolean;
  /** Opened from the Home Screen (or as an installed app). */
  readonly installed: boolean;
  /** The browser offered to install the app (Chrome, Edge, Android): a button can ask. */
  readonly canInstall: boolean;
  /** A worker controls this page, so it would open with no signal. */
  readonly ready: boolean;
};

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let state: OfflineState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  updateReady: false,
  installed: false,
  canInstall: false,
  ready: false,
};
const listeners = new Set<() => void>();
const set = (next: Partial<OfflineState>) => {
  const merged = { ...state, ...next };
  if (Object.keys(merged).every((k) => merged[k as keyof OfflineState] === state[k as keyof OfflineState])) return;
  state = merged;
  listeners.forEach((l) => l());
};
let installPrompt: InstallPrompt | undefined;

export const offlineState = (): OfflineState => state;
export const onOfflineState = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useOfflineState = (): OfflineState => useSyncExternalStore(onOfflineState, offlineState, offlineState);

/** Ask the browser to install the app (only where it offered: canInstall). */
export const askToInstall = async (): Promise<boolean> => {
  const p = installPrompt;
  if (!p) return false;
  installPrompt = undefined;
  set({ canInstall: false });
  try {
    await p.prompt();
    return (await p.userChoice).outcome === 'accepted';
  } catch {
    return false;
  }
};

const standalone = (): boolean => {
  try {
    return (
      matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
};

let started = false;

/** Called once, from main.tsx. Never throws: a browser without workers just has no offline copy. */
export const startOffline = (): void => {
  if (started || typeof window === 'undefined') return;
  started = true;
  set({ installed: standalone(), online: navigator.onLine !== false });
  window.addEventListener('online', () => {
    set({ online: true });
    window.dispatchEvent(new Event(SEND_NOW_EVENT));
    void navigator.serviceWorker?.controller?.postMessage({ type: 'veilcore-check' });
    // And a new worker, if there is one: each release's worker holds the files of its own copy
    // (offline/sw.js SHELL_FILES), so the copy of a new release is served by the new worker.
    if (OFFLINE_ON && !import.meta.env.DEV)
      void navigator.serviceWorker
        ?.getRegistration()
        .then((r) => r?.update())
        .catch(() => undefined);
  });
  window.addEventListener('offline', () => set({ online: false }));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e as InstallPrompt;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => set({ installed: true, canInstall: false }));
  const sw = navigator.serviceWorker;
  if (!sw) return;
  if (!OFFLINE_ON) {
    void sw
      .getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => undefined);
    // And the proof codes left for Background Sync (offline/dating-mirror.ts): the page's own
    // queue (veilcore/outbox.ts) still has them.
    try {
      indexedDB.deleteDatabase('veilcore-offline');
    } catch {
      /* nothing kept */
    }
    // And the copies themselves: this page may unregister the old worker before the browser has
    // fetched the kill switch, which would then never run (security review of PR #145, K-1).
    void (async () => {
      try {
        for (const k of await caches.keys()) if (k.startsWith('veilcore-')) await caches.delete(k);
      } catch {
        /* no Cache Storage here */
      }
    })();
    return;
  }
  // `npm run dev` serves source files, not a release: no worker there.
  if (import.meta.env.DEV) return;
  sw.addEventListener('message', (e: MessageEvent) => {
    if (e.origin && e.origin !== location.origin) return;
    const data = e.data as { type?: unknown; stale?: unknown } | null;
    // Only a page the worker answered from an older copy is told it is older: a page from the
    // network is the new release already.
    if (data?.type === 'veilcore-release' && data.stale === true) set({ updateReady: true });
    else if (data?.type === 'veilcore-send-now') window.dispatchEvent(new Event(SEND_NOW_EVENT));
  });
  sw.addEventListener('controllerchange', () => set({ ready: true }));
  set({ ready: !!sw.controller });
  try {
    void sw
      .register(workerScriptUrl() as string, { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        // Each load with signal: the worker looks for a new release (it also does on every page).
        if (navigator.onLine !== false) {
          void reg.update().catch(() => undefined);
          (sw.controller ?? reg.active)?.postMessage({ type: 'veilcore-check' });
        }
      })
      .catch(() => undefined);
  } catch {
    /* refused by this browser: no offline copy */
  }
};

/**
 * Ask the browser to wake the worker when signal comes back (Background Sync; Chrome on Android
 * and desktop). Where there is none, the page sends on its next open or `online` event instead.
 */
export const askForBackgroundSend = async (): Promise<boolean> => {
  try {
    const reg: unknown = await navigator.serviceWorker?.getRegistration();
    const sync = (reg as { sync?: { register: (tag: string) => Promise<void> } } | undefined)?.sync;
    if (!sync) return false;
    await sync.register('veilcore-send');
    return true;
  } catch {
    return false;
  }
};
