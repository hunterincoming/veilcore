// For tests: several "browsers" (or tabs) at once, each with its own copy of the app's
// modules and its own localStorage, against one registry (fake-registry.ts). Ported from the
// data-loss review's harness (scratchpad review-loss/h.ts). Each browser's calls run inside
// AsyncLocalStorage, so the one global localStorage knows whose storage to use. A browser
// can share another's storage (a second tab, or the same tab reloaded), see the other's
// writes only after a delay (tabs whose storage catches up late), or refuse every write (a
// private window).
// SPDX-License-Identifier: Apache-2.0

import { AsyncLocalStorage } from 'node:async_hooks';
import { vi } from 'vitest';

const als = new AsyncLocalStorage<string>();
type Store = { map: Map<string, string>; throwOnSet?: boolean; lagPeers?: string[] };
export const stores = new Map<string, Store>();
const LAG_MS = 15;

const cur = (): Store => {
  const n = als.getStore();
  if (!n) throw new Error('localStorage used outside a browser');
  return stores.get(n)!;
};

/** The global localStorage, answering for whichever browser is running. */
export const installStorage = (): void => {
  stores.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => cur().map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const s = cur();
      if (s.throwOnSet) throw new Error('QuotaExceededError');
      s.map.set(k, v);
      for (const p of s.lagPeers ?? []) setTimeout(() => stores.get(p)!.map.set(k, v), LAG_MS);
    },
    removeItem: (k: string) => {
      const s = cur();
      if (s.throwOnSet) throw new Error('QuotaExceededError');
      s.map.delete(k);
    },
    key: (i: number) => [...cur().map.keys()][i] ?? null,
    get length() {
      return cur().map.size;
    },
  });
};

const MODULES = {
  holder: () => import('../holder'),
  vault: () => import('../vault'),
  api: () => import('../api-store'),
  records: () => import('../records'),
  backup: () => import('../backup'),
  transfers: () => import('../transfers'),
  commitment: () => import('../commitment'),
  licenses: () => import('../licenses'),
  disclosure: () => import('../disclosure'),
  registryExport: () => import('../registry-export'),
  receive: () => import('../receive'),
  lineage: () => import('../lineage'),
};
type Mods = { [K in keyof typeof MODULES]: Awaited<ReturnType<(typeof MODULES)[K]>> };

export type Browser = {
  readonly name: string;
  readonly m: Mods;
  run: <T>(fn: () => Promise<T> | T) => Promise<T>;
  readonly storage: Map<string, string>;
};

/** A new browser (fresh modules). `share` names a browser whose storage it uses: a reload or a second tab. */
export const browser = async (name: string, opts: Partial<Store> = {}, share?: string): Promise<Browser> => {
  stores.set(name, share ? stores.get(share)! : { map: new Map(), ...opts });
  vi.resetModules();
  const m = {} as Record<string, unknown>;
  await als.run(name, async () => {
    for (const [k, load] of Object.entries(MODULES)) {
      try {
        m[k] = await load();
      } catch {
        /* a module this version of the app doesn't have */
      }
    }
  });
  return { name, m: m as Mods, run: (fn) => als.run(name, async () => fn()), storage: stores.get(name)!.map };
};

/** A file to hand to restoreAny, checkBackup or importRecords. */
export const fileOf = (text: string): File =>
  ({ text: () => Promise.resolve(text), size: text.length, name: 'f' }) as unknown as File;

export const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));
