#!/usr/bin/env node
// Pin Ask's on-device model (docs/ask-veilcore.md, v2.1). Run on the maintainer's Mac: the build
// environment can't reach Hugging Face.
//
//   node scripts/pin-model.mjs            resolve each model's `main` to a commit, download that
//                                         commit, check it, write the manifest
//   node scripts/pin-model.mjs --check    the same, but only report; the manifest is not written
//
// For each model (Qwen3-1.7B-q4f16_1-MLC and Qwen3-0.6B-q4f16_1-MLC from mlc-ai):
//   1. `main` is resolved to a commit once; everything after reads that commit, never `main`.
//   2. The commit must be in WebLLM 0.2.86's format: tensor-cache.json (not the older
//      ndarray-cache.json), a chat config whose tokenizer is tokenizer.json, q4f16_1.
//   3. Every file WebLLM reads is downloaded: mlc-chat-config.json, tokenizer.json,
//      tensor-cache.json and every shard it lists. Each file's size and SHA-256 are computed
//      here, and checked against Hugging Face's own record of the file (its LFS SHA-256, for
//      the large ones) and the shard sizes tensor-cache.json gives.
//   4. Where Hugging Face redirects a file (its file storage) is recorded: the download worker's
//      Content-Security-Policy allows that host (scripts/ask-model-csp.mjs), and it must be one
//      of Hugging Face's storage hosts.
// Then bboard-ui/src/ask-local/model-manifest.json gets the commits, the files and their hashes,
// and `"pinned": true`. Nothing else changes; commit it after reading the diff.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HF_STORAGE_HOST, manifestProblem } from './ask-model-csp.mjs';

const MANIFEST = fileURLToPath(new URL('../bboard-ui/src/ask-local/model-manifest.json', import.meta.url));
const CHECK_ONLY = process.argv.includes('--check');
const HF = 'https://huggingface.co';

const say = (s) => process.stdout.write(`${s}\n`);
const fail = (s) => {
  process.stderr.write(`\nSTOPPED: ${s}\nNothing was written.\n`);
  process.exit(1);
};

const getJson = async (url) => {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) fail(`${url} answered ${r.status}`);
  return r.json();
};

/** Download a file at the pinned commit: its bytes, and the host it was redirected to, if any. */
const download = async (url) => {
  let host;
  let at = url;
  for (let hops = 0; hops < 5; hops++) {
    const r = await fetch(at, { redirect: 'manual' });
    if (r.status >= 300 && r.status < 400) {
      const next = new URL(r.headers.get('location') ?? '', at);
      if (next.host !== 'huggingface.co') host = next.host;
      at = next.href;
      continue;
    }
    if (!r.ok) fail(`${url} answered ${r.status}`);
    return { body: Buffer.from(await r.arrayBuffer()), host };
  }
  return fail(`${url}: too many redirects`);
};

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (manifest.webllm !== '0.2.86') fail(`the manifest is for WebLLM ${manifest.webllm}; this script checks for 0.2.86`);
const redirectHosts = new Set();

for (const model of manifest.models) {
  say(`\n${model.repo}`);
  const rev = await getJson(`${HF}/api/models/${model.repo}/revision/main`);
  const commit = rev.sha;
  if (!/^[0-9a-f]{40}$/.test(commit ?? '')) fail(`${model.repo}: no commit for main`);
  say(`  main is commit ${commit}`);
  const tree = await getJson(`${HF}/api/models/${model.repo}/tree/${commit}?recursive=true`);
  const listed = new Map(tree.filter((e) => e.type === 'file').map((e) => [e.path, e]));
  if (!listed.has('tensor-cache.json'))
    fail(
      `${model.repo}@${commit} has no tensor-cache.json${listed.has('ndarray-cache.json') ? ' (only ndarray-cache.json: the format before WebLLM 0.2.86)' : ''}`,
    );
  say(
    `  format: tensor-cache.json${listed.has('mlc-model-manifest.json') ? ', mlc-model-manifest.json (not used: the record names none)' : ''}`,
  );

  const folder = `${HF}/${model.repo}/resolve/${commit}/`;
  const files = [];
  const take = async (path, expectBytes) => {
    const entry = listed.get(path);
    if (!entry) fail(`${model.repo}@${commit} has no ${path}`);
    const { body, host } = await download(new URL(path, folder).href);
    if (host) redirectHosts.add(host);
    if (body.length !== entry.size) fail(`${path}: ${body.length} bytes, Hugging Face lists ${entry.size}`);
    if (expectBytes !== undefined && body.length !== expectBytes)
      fail(`${path}: ${body.length} bytes, tensor-cache.json says ${expectBytes}`);
    const hash = sha256(body);
    if (entry.lfs?.oid && entry.lfs.oid !== hash)
      fail(`${path}: SHA-256 ${hash}, Hugging Face's record says ${entry.lfs.oid}`);
    files.push({ path, bytes: body.length, sha256: hash });
    return body;
  };

  const config = JSON.parse((await take('mlc-chat-config.json')).toString('utf8'));
  if (!config.tokenizer_files?.includes('tokenizer.json')) fail(`${model.repo}: the tokenizer is not tokenizer.json`);
  if (config.quantization && config.quantization !== 'q4f16_1')
    fail(`${model.repo}: quantization ${config.quantization}, not q4f16_1`);
  await take('tokenizer.json');
  const cache = JSON.parse((await take('tensor-cache.json')).toString('utf8'));
  const shards = cache.records ?? [];
  if (!shards.length) fail(`${model.repo}: tensor-cache.json lists no shards`);
  let n = 0;
  for (const s of shards) {
    if (!/^[A-Za-z0-9._-]+$/.test(s.dataPath)) fail(`${model.repo}: odd shard path ${s.dataPath}`);
    await take(s.dataPath, s.nbytes);
    process.stdout.write(`\r  shards ${++n}/${shards.length}`);
  }
  const total = files.reduce((a, f) => a + f.bytes, 0);
  say(`\n  ${files.length} files, ${(total / 1e6).toFixed(0)} MB, every one hashed and checked`);
  model.commit = commit;
  model.files = files;
}

for (const h of redirectHosts)
  if (!HF_STORAGE_HOST.test(h)) fail(`Hugging Face redirected to ${h}, which is not one of its storage hosts`);
manifest.redirectHosts = [...redirectHosts].sort();
manifest.pinned = true;
const problem = manifestProblem(manifest);
if (problem) fail(problem);
say(`\nRedirect hosts: ${manifest.redirectHosts.join(', ') || '(none)'}`);

if (CHECK_ONLY) {
  say('Check only: the manifest was not written.');
} else {
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  say(`Wrote ${MANIFEST}. Read the diff, then commit it.`);
}
