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
//   - Doesn't start the offline download (about 11 MB) by itself on a page someone was sent a
//     link to (check, verify and prove), when the browser asks to save data, or on a 2G
//     connection (summit fix 5b.3). There it waits to be asked: the install card on Home and
//     "Use VeilCore with no signal" in Settings offer it, with its size. A browser that already
//     has the worker keeps it, and its updates, as before.
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
  /** The offline download wasn't started by itself here (offlineHeldBack): it waits to be asked. */
  readonly held: boolean;
  /** The person asked for it (getOfflineCopy) and it isn't ready yet. */
  readonly getting: boolean;
};

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let state: OfflineState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  updateReady: false,
  installed: false,
  canInstall: false,
  ready: false,
  held: false,
  getting: false,
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
    const yes = (await p.userChoice).outcome === 'accepted';
    // Installing is asking for VeilCore with no signal: the download starts, if it was held.
    if (yes && state.held) getOfflineCopy();
    return yes;
  } catch {
    return false;
  }
};

// ---- when the offline download starts by itself (summit fix 5b.3) ----------------------------

/**
 * Pages someone is sent a link to: the check pages (/verify, /check-…) and the prove pages
 * (/prove, /prove-license). Opening a link from a message shouldn't cost a download nobody asked for.
 */
const LINK_PAGE = /^\/(verify|prove|prove-license|check-[a-z-]+)(\/|$)/;

/** What the browser says about the connection (Network Information API; Chrome, Edge, Samsung Internet). */
export type ConnectionHint = { readonly saveData?: boolean; readonly effectiveType?: string } | undefined;

/** Why the offline download didn't start by itself, or null when it does. */
export type HeldBack = 'link-page' | 'save-data' | 'slow-network';

/**
 * Whether the offline download waits to be asked on this page load.
 *   - `existing`: this browser already has the worker. It keeps it and its updates, everywhere.
 *   - `installed`: opened from the Home Screen, which is asking for it.
 *   - Otherwise it waits on a link page, when the browser asks to save data (`saveData`), and on
 *     a 2G connection (`effectiveType` 2g or slow-2g).
 */
export const offlineHeldBack = (o: {
  path: string;
  connection: ConnectionHint;
  existing: boolean;
  installed: boolean;
}): HeldBack | null => {
  if (o.existing || o.installed) return null;
  if (LINK_PAGE.test(o.path)) return 'link-page';
  if (o.connection?.saveData === true) return 'save-data';
  if (o.connection?.effectiveType === '2g' || o.connection?.effectiveType === 'slow-2g') return 'slow-network';
  return null;
};

const connectionHint = (): ConnectionHint => {
  try {
    return (navigator as Navigator & { connection?: ConnectionHint }).connection;
  } catch {
    return undefined;
  }
};

/** How big the download is, from the build's own list (/offline-shell.json `bytes`), or null. */
export const offlineDownloadBytes = async (fetchImpl: typeof fetch = fetch): Promise<number | null> => {
  try {
    const res = await fetchImpl('/offline-shell.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const bytes = ((await res.json()) as { bytes?: unknown } | null)?.bytes;
    return typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : null;
  } catch {
    return null;
  }
};

/** "11 MB": whole megabytes (1,000,000 bytes), at least 1. */
export const megabytes = (bytes: number): string => `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;

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
  void (async () => {
    let existing = !!sw.controller;
    if (!existing)
      try {
        existing = !!(await sw.getRegistration('/'));
      } catch {
        /* none that this page can see */
      }
    if (
      offlineHeldBack({ path: location.pathname, connection: connectionHint(), existing, installed: state.installed })
    )
      set({ held: true });
    else registerWorker();
  })();
};

let registering = false;

/** Register /sw.js: the offline download starts (the worker copies the release when it installs). */
const registerWorker = (): void => {
  const sw = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (registering || !sw || !OFFLINE_ON || import.meta.env.DEV) return;
  registering = true;
  set({ held: false });
  sw.addEventListener('message', (e: MessageEvent) => {
    if (e.origin && e.origin !== location.origin) return;
    const data = e.data as { type?: unknown; stale?: unknown } | null;
    // Only a page the worker answered from an older copy is told it is older: a page from the
    // network is the new release already.
    if (data?.type === 'veilcore-release' && data.stale === true) set({ updateReady: true });
    else if (data?.type === 'veilcore-send-now') window.dispatchEvent(new Event(SEND_NOW_EVENT));
  });
  sw.addEventListener('controllerchange', () => set({ ready: true, getting: false }));
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
      .catch(() => set({ getting: false }));
  } catch {
    /* refused by this browser: no offline copy */
    set({ getting: false });
  }
};

/**
 * The person asked for VeilCore with no signal (the install card, Settings): start the download
 * now, wherever this page is and whatever the connection.
 */
export const getOfflineCopy = (): void => {
  if (!state.held) return;
  set({ getting: true });
  registerWorker();
};

/**
 * A new page in the app (App.tsx): a download held only because the first page was a link page
 * starts once the person goes on into the app, unless the connection still holds it back.
 */
export const offlinePageChanged = (path: string): void => {
  if (!state.held) return;
  if (!offlineHeldBack({ path, connection: connectionHint(), existing: false, installed: state.installed }))
    registerWorker();
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
