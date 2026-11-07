// The model's files as this device holds them, checked against the SHA-256 pinned in the bundle
// (manifest.ts). Used by both model workers: the download worker checks each file before it
// stores it, and the engine worker checks every stored file again before each start. A file that
// does not match is never used: the model stays off and Ask answers as it always does.
//
// Known gap (docs/ask-veilcore.md): WebLLM re-reads tensor-cache.json and the weight shards from
// the cache after this check without checking them itself. Only code running on this site's
// origin could change them in between, and such code could already do anything Ask can.
// SPDX-License-Identifier: Apache-2.0

import type { NeededFile } from './manifest';

export const sha256Hex = async (data: ArrayBuffer | Uint8Array): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/** SHA-256 as Subresource Integrity, the form WebLLM checks the model library and config with. */
export const sri = (hex: string): string => {
  const bytes = hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? [];
  return `sha256-${btoa(String.fromCharCode(...bytes))}`;
};

export type FileState = 'ok' | 'missing' | 'mismatch';

/** One stored file: there and matching, not there, or there and different (then it is removed). */
export const checkStored = async (f: NeededFile): Promise<FileState> => {
  const cache = await caches.open(f.scope);
  const hit = await cache.match(f.url);
  if (!hit) return 'missing';
  const body = await hit.arrayBuffer();
  if (body.byteLength === f.bytes && (await sha256Hex(body)) === f.sha256) return 'ok';
  await cache.delete(f.url);
  return 'mismatch';
};

/** Every file, checked. */
export const checkAllStored = async (
  files: readonly NeededFile[],
  onFile?: (done: number, total: number) => void,
): Promise<{ ok: boolean; missing: string[]; mismatch: string[] }> => {
  const missing: string[] = [];
  const mismatch: string[] = [];
  let done = 0;
  for (const f of files) {
    const s = await checkStored(f);
    if (s === 'missing') missing.push(f.name);
    if (s === 'mismatch') mismatch.push(f.name);
    onFile?.(++done, files.length);
  }
  return { ok: missing.length === 0 && mismatch.length === 0, missing, mismatch };
};

/** Store a checked file where WebLLM looks for it: its own cache, keyed by its address. */
export const storeChecked = async (f: NeededFile, body: ArrayBuffer): Promise<void> => {
  const cache = await caches.open(f.scope);
  const type = f.name.endsWith('.json')
    ? 'application/json'
    : f.name.endsWith('.wasm')
      ? 'application/wasm'
      : 'application/octet-stream';
  await cache.put(
    f.url,
    new Response(body, { status: 200, headers: { 'content-type': type, 'content-length': String(f.bytes) } }),
  );
};
