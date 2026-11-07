// The on-device model's pins (model-manifest.json, written by scripts/pin-model.mjs on the
// maintainer's computer): which model folders on Hugging Face, at which commit, and the SHA-256
// of every file in them; the model library each needs, served from this site, and its SHA-256.
// Compiled into the bundle: nothing about the model is read from anywhere else.
//
// VITE_ASK_MODEL decides whether the model is offered at all:
//   (unset)  never: the default, and veilcore.org's until the founders decide;
//   on       offered on a computer whose graphics can run it, once the manifest is pinned;
//   test     the e2e build: a stub model (model-manifest.stub.json, tiny files a test serves);
//   eval     scripts/eval-ask.mjs's build, which also lets that script ask both engines.
// scripts/vercel-config.mjs refuses to deploy a test or eval build.
// SPDX-License-Identifier: Apache-2.0

import real from './model-manifest.json';
import stub from './model-manifest.stub.json';

export type ModelFile = {
  /** The file's path in the model folder (tensor-cache.json, params_shard_0.bin, ...). */
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
};
export type PinnedModel = {
  readonly id: string;
  readonly repo: string;
  readonly commit: string;
  readonly lib: { readonly file: string; readonly bytes: number; readonly sha256: string };
  readonly requiredFeatures: readonly string[];
  readonly vramMB: number;
  readonly contextWindow: number;
  readonly files: readonly ModelFile[];
};
export type ModelManifest = {
  readonly pinned: boolean;
  readonly webllm: string;
  readonly libs: {
    readonly repo: string;
    readonly commit: string;
    readonly folder: string;
    readonly servedFrom: string;
  };
  readonly redirectHosts: readonly string[];
  readonly models: readonly PinnedModel[];
};

export type ModelFlag = 'off' | 'on' | 'test' | 'eval';
const raw = (import.meta.env.VITE_ASK_MODEL ?? '').trim();
export const MODEL_FLAG: ModelFlag = raw === 'on' || raw === 'test' || raw === 'eval' ? raw : 'off';

export const MANIFEST: ModelManifest = MODEL_FLAG === 'test' ? stub : real;

const COMMIT = /^[0-9a-f]{40}$/;
const SHA = /^[0-9a-f]{64}$/;
const PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

/** Whether a model's pins are whole: a commit, at least the files WebLLM reads, a hash for each. */
export const modelPinned = (m: PinnedModel): boolean =>
  COMMIT.test(m.commit) &&
  SHA.test(m.lib.sha256) &&
  m.files.length > 0 &&
  m.files.every((f) => PATH.test(f.path) && !f.path.includes('..') && SHA.test(f.sha256) && f.bytes > 0) &&
  ['mlc-chat-config.json', 'tensor-cache.json', 'tokenizer.json'].every((p) => m.files.some((f) => f.path === p));

/** The model is offered in this build: the flag is on and its pins are whole. */
export const MODEL_BUILT = MODEL_FLAG !== 'off' && MANIFEST.pinned && MANIFEST.models.some(modelPinned);

export const modelById = (id: string): PinnedModel | undefined =>
  MANIFEST.models.find((m) => m.id === id && modelPinned(m));

/** The model folder at its pinned commit: never `main`. */
export const modelFolder = (m: PinnedModel): string => `https://huggingface.co/${m.repo}/resolve/${m.commit}/`;
export const fileUrl = (m: PinnedModel, path: string): string => new URL(path, modelFolder(m)).href;

/** WebLLM's cache for a file (its ArtifactCache scopes): the chat config apart, the rest with the model. */
export const cacheScope = (path: string): 'webllm/config' | 'webllm/model' =>
  path === 'mlc-chat-config.json' || path === 'mlc-model-manifest.json' ? 'webllm/config' : 'webllm/model';
export const MODEL_CACHES = ['webllm/config', 'webllm/model', 'webllm/wasm'] as const;

/**
 * The model library on this site, as an absolute address: WebLLM keeps an absolute address in
 * its own cache (`webllm/wasm`) and reads it from there, where a relative one would be fetched
 * again on every start. The download stores it there, checked; the engine never fetches it.
 * Not on `localhost`: WebLLM always fetches an address containing "localhost" past its cache,
 * which the engine worker's policy (connect-src 'none') refuses. Serve a local build on
 * 127.0.0.1 instead (the browser tests and scripts/eval-ask.mjs do).
 */
export const libUrl = (m: PinnedModel, origin: string): string =>
  new URL(`${MANIFEST.libs.servedFrom}${m.lib.file}`, origin).href;

export type CacheScope = (typeof MODEL_CACHES)[number];
/** One file the model needs on this device: where it comes from, where it is kept, its pin. */
export type NeededFile = {
  readonly name: string;
  readonly url: string;
  readonly scope: CacheScope;
  readonly bytes: number;
  readonly sha256: string;
};
/** Every file the model needs, the model library last. */
export const neededFiles = (m: PinnedModel, origin: string): NeededFile[] => [
  ...m.files.map((f) => ({
    name: f.path,
    url: fileUrl(m, f.path),
    scope: cacheScope(f.path),
    bytes: f.bytes,
    sha256: f.sha256,
  })),
  { name: m.lib.file, url: libUrl(m, origin), scope: 'webllm/wasm', bytes: m.lib.bytes, sha256: m.lib.sha256 },
];

/** Every byte the model takes on this device, the library included. */
export const modelBytes = (m: PinnedModel): number => m.files.reduce((n, f) => n + f.bytes, 0) + m.lib.bytes;
