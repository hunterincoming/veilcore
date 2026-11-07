// Ask's model download (docs/ask-veilcore.md, "v2.1"). The only code in Ask that fetches, and
// only what the person asked for on the download screen: the pinned model files from Hugging
// Face, one at a time. Its Content-Security-Policy (scripts/ask-model-csp.mjs) lets it reach
// those folders at their pinned commit and Hugging Face's file storage, and nothing else; it
// checks that policy is in force before it fetches anything.
//
// Each file is checked against its SHA-256 in the bundle before it is stored. A file that
// doesn't match stops the download, and nothing of it is kept. Files already stored and
// matching are not fetched again, so a cancelled download resumes where it stopped.
//
// Requests carry no cookies and no referrer. Hugging Face still sees the address they come from
// (IP), when, which model, and the Origin veilcore.org: the download screen says so.
// SPDX-License-Identifier: Apache-2.0

import { checkStored, sha256Hex, storeChecked } from './integrity';
import { fileUrl, modelById } from './manifest';
import { ownPolicyInForce } from './worker-csp';

export type DownloadIn = { readonly type: 'start'; readonly modelId: string } | { readonly type: 'cancel' };
export type DownloadOut =
  | { readonly type: 'progress'; readonly done: number; readonly total: number }
  | { readonly type: 'done' }
  | { readonly type: 'cancelled' }
  | { readonly type: 'failed'; readonly reason: 'policy' | 'unknown-model' | 'network' | 'mismatch' | 'storage' };

const post = (m: DownloadOut) => (globalThis as unknown as { postMessage: (m: DownloadOut) => void }).postMessage(m);

let running: AbortController | undefined;

const download = async (modelId: string, signal: AbortSignal): Promise<DownloadOut> => {
  if (!(await ownPolicyInForce('download'))) return { type: 'failed', reason: 'policy' };
  const m = modelById(modelId);
  if (!m) return { type: 'failed', reason: 'unknown-model' };
  const total = m.files.reduce((n, f) => n + f.bytes, 0);
  let done = 0;
  post({ type: 'progress', done, total });
  for (const f of m.files) {
    if (signal.aborted) return { type: 'cancelled' };
    if ((await checkStored(m, f)) === 'ok') {
      done += f.bytes;
      post({ type: 'progress', done, total });
      continue;
    }
    let res: Response;
    try {
      res = await fetch(fileUrl(m, f.path), {
        signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        redirect: 'follow',
      });
    } catch {
      return signal.aborted ? { type: 'cancelled' } : { type: 'failed', reason: 'network' };
    }
    if (!res.ok || !res.body) return { type: 'failed', reason: 'network' };
    // Read with a cap: never more than the pinned size.
    const body = new Uint8Array(f.bytes);
    let at = 0;
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        if (at + value.byteLength > f.bytes) {
          await reader.cancel();
          return { type: 'failed', reason: 'mismatch' };
        }
        body.set(value, at);
        at += value.byteLength;
        post({ type: 'progress', done: done + at, total });
      }
    } catch {
      return signal.aborted ? { type: 'cancelled' } : { type: 'failed', reason: 'network' };
    }
    if (at !== f.bytes || (await sha256Hex(body)) !== f.sha256) return { type: 'failed', reason: 'mismatch' };
    try {
      await storeChecked(m, f, body.buffer);
    } catch {
      return { type: 'failed', reason: 'storage' };
    }
    done += f.bytes;
    post({ type: 'progress', done, total });
  }
  return { type: 'done' };
};

(globalThis as unknown as { onmessage: (e: MessageEvent<DownloadIn>) => void }).onmessage = (e) => {
  const m = e.data;
  if (m.type === 'cancel') {
    running?.abort();
    return;
  }
  if (m.type === 'start' && !running) {
    running = new AbortController();
    void download(m.modelId, running.signal).then((out) => {
      running = undefined;
      post(out);
    });
  }
};
