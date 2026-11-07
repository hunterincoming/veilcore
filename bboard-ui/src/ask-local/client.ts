// The page's side of Ask's on-device model: whether this device can run it, the download (in
// its own worker), storage, delete, and the engine worker. Nothing here fetches: the download
// worker does, and only when the person starts it.
//
// Desktop first (docs/ask-veilcore.md): offered only on a computer-sized screen with a fine
// pointer, WebGPU with shader-f16 (the q4f16 model needs it; there is no q4f32 copy pinned),
// and, where the browser says, 8 GB of memory or more. Elsewhere the model is not offered and
// Ask is Shortcuts, as before.
// SPDX-License-Identifier: Apache-2.0

import downloadWorkerUrl from './ask-model-download.worker.ts?worker&url';
import engineWorkerUrl from './ask-model-engine.worker.ts?worker&url';
import type { DownloadIn, DownloadOut } from './ask-model-download.worker';
import type { EngineFailure, EngineIn, EngineOut } from './ask-model-engine.worker';
import {
  MANIFEST,
  MODEL_BUILT,
  MODEL_CACHES,
  cacheScope,
  fileUrl,
  modelBytes,
  modelPinned,
  type PinnedModel,
} from './manifest';

export { MODEL_BUILT };

/** The models offered, largest first (the 1.7B answers better; the 0.6B is smaller). */
export const offeredModels = (): readonly PinnedModel[] => MANIFEST.models.filter(modelPinned);
export { modelBytes };

// ---- the worker addresses, through one Trusted Types policy (scripts/vercel-config.mjs) ----

export const MODEL_POLICY = 'veilcore-ask-model';
type TT = {
  createPolicy: (
    n: string,
    r: { createScriptURL: (u: string) => string },
  ) => { createScriptURL: (u: string) => unknown };
};
let policy: { createScriptURL: (u: string) => unknown } | undefined;
const workerScript = (url: string): string => {
  const href = new URL(url, location.href).href;
  const tt = (globalThis as { trustedTypes?: TT }).trustedTypes;
  if (!tt?.createPolicy) return href;
  const allowed = new Set([
    new URL(downloadWorkerUrl, location.href).href,
    new URL(engineWorkerUrl, location.href).href,
  ]);
  policy ??= tt.createPolicy(MODEL_POLICY, {
    createScriptURL: (u: string) => {
      const v = new URL(u, location.href);
      if (!allowed.has(v.href) || v.origin !== location.origin) throw new TypeError('Not an Ask model worker.');
      return v.href;
    },
  });
  return policy.createScriptURL(href) as string;
};

// ---- can this device run it ----

export type DeviceCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not-built' | 'phone' | 'no-webgpu' | 'no-f16' | 'memory' };

type GpuAdapter = { features: { has: (f: string) => boolean } };
type Gpu = { requestAdapter: (o?: object) => Promise<GpuAdapter | null> };

export const checkDevice = async (
  env: {
    gpu?: Gpu;
    wide?: boolean;
    finePointer?: boolean;
    memoryGB?: number;
  } = {
    gpu: (navigator as unknown as { gpu?: Gpu }).gpu,
    wide: matchMedia('(min-width: 900px)').matches,
    finePointer: matchMedia('(pointer: fine)').matches,
    memoryGB: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
  },
): Promise<DeviceCheck> => {
  if (!MODEL_BUILT) return { ok: false, reason: 'not-built' };
  if (!env.wide || !env.finePointer) return { ok: false, reason: 'phone' };
  if (env.memoryGB !== undefined && env.memoryGB < 8) return { ok: false, reason: 'memory' };
  if (!env.gpu) return { ok: false, reason: 'no-webgpu' };
  let adapter: GpuAdapter | null = null;
  try {
    adapter = await env.gpu.requestAdapter({ powerPreference: 'high-performance' });
  } catch {
    adapter = null;
  }
  if (!adapter) return { ok: false, reason: 'no-webgpu' };
  if (!adapter.features.has('shader-f16')) return { ok: false, reason: 'no-f16' };
  return { ok: true };
};

// ---- storage ----

/** Room for the model: free quota more than its size and a tenth. Unknown counts as room. */
export const storageRoom = async (bytes: number): Promise<{ enough: boolean; free?: number }> => {
  try {
    const e = await navigator.storage.estimate();
    if (e.quota === undefined || e.usage === undefined) return { enough: true };
    const free = e.quota - e.usage;
    return { enough: free > bytes * 1.1, free };
  } catch {
    return { enough: true };
  }
};

/** Which offered model is stored whole on this device (its files' keys; checked on every start). */
export const storedModel = async (): Promise<PinnedModel | undefined> => {
  try {
    for (const m of offeredModels()) {
      let all = true;
      for (const f of m.files) {
        const c = await caches.open(cacheScope(f.path));
        if (!(await c.match(fileUrl(m, f.path)))) {
          all = false;
          break;
        }
      }
      if (all) return m;
    }
  } catch {
    /* no Cache API here (a private window): nothing stored */
  }
  return undefined;
};

/** Delete the model from this device: every file WebLLM or the download stored. */
export const deleteModel = async (): Promise<void> => {
  stopEngine();
  for (const name of MODEL_CACHES) {
    try {
      await caches.delete(name);
    } catch {
      /* already gone */
    }
  }
};

// ---- download ----

export type DownloadEvents = {
  progress: (done: number, total: number) => void;
  end: (out: Exclude<DownloadOut, { type: 'progress' }>) => void;
};
let downloader: Worker | undefined;

export const startDownload = (m: PinnedModel, on: DownloadEvents): void => {
  // Kept after the download, so the browser does not clear it to make room.
  void navigator.storage?.persist?.().catch(() => false);
  downloader ??= new Worker(workerScript(downloadWorkerUrl), { type: 'module' });
  downloader.onmessage = (e: MessageEvent<DownloadOut>) => {
    const out = e.data;
    if (out.type === 'progress') on.progress(out.done, out.total);
    else {
      downloader?.terminate();
      downloader = undefined;
      on.end(out);
    }
  };
  downloader.onerror = () => {
    downloader?.terminate();
    downloader = undefined;
    on.end({ type: 'failed', reason: 'network' });
  };
  downloader.postMessage({ type: 'start', modelId: m.id } satisfies DownloadIn);
};

export const cancelDownload = (): void => downloader?.postMessage({ type: 'cancel' } satisfies DownloadIn);

// ---- the engine ----

export type ModelSession = {
  readonly modelId: string;
  ask: (messages: readonly { role: 'system' | 'user'; content: string }[], schema: string) => Promise<string>;
};

let engineWorker: Worker | undefined;
let session: Promise<ModelSession> | undefined;

export class EngineFailed extends Error {
  constructor(readonly reason: EngineFailure) {
    super(reason);
  }
}

/** Start the model (once per page): checks, loads, then answers. Rejects with EngineFailed. */
export const startEngine = (m: PinnedModel, onProgress?: (stage: string, p: number) => void): Promise<ModelSession> => {
  session ??= new Promise<ModelSession>((resolve, reject) => {
    const w = new Worker(workerScript(engineWorkerUrl), { type: 'module' });
    engineWorker = w;
    let next = 1;
    const waiting = new Map<number, { ok: (s: string) => void; no: (e: Error) => void }>();
    w.onmessage = (e: MessageEvent<EngineOut>) => {
      const out = e.data;
      if (out.type === 'progress') onProgress?.(out.stage, out.progress);
      else if (out.type === 'failed') {
        stopEngine();
        reject(new EngineFailed(out.reason));
      } else if (out.type === 'ready')
        resolve({
          modelId: m.id,
          ask: (messages, schema) =>
            new Promise<string>((ok, no) => {
              const id = next++;
              waiting.set(id, { ok, no });
              w.postMessage({ type: 'ask', id, messages, schema } satisfies EngineIn);
            }),
        });
      else if (out.type === 'answer') {
        const p = waiting.get(out.id);
        waiting.delete(out.id);
        if (out.error || out.text === undefined) p?.no(new Error('no answer'));
        else p?.ok(out.text);
      }
    };
    w.onerror = () => {
      stopEngine();
      reject(new EngineFailed('failed'));
    };
    w.postMessage({ type: 'load', modelId: m.id } satisfies EngineIn);
  });
  return session;
};

export const stopEngine = (): void => {
  engineWorker?.terminate();
  engineWorker = undefined;
  session = undefined;
};
