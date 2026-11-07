#!/usr/bin/env node
// After a deploy: does the site serve Ask's model workers with their own policy, and nothing of
// the model when the build has none? (docs/ask-veilcore.md, v2.1). Read-only: it fetches the
// files the build in .vercel/output/static says the site has, and compares their headers.
//
//   node scripts/check-model-headers.mjs https://veilcore.org
//   node scripts/check-model-headers.mjs https://test.veilcore.org .vercel/output/static
//
// For each worker file in the build: served, as JavaScript, with exactly one
// Content-Security-Policy, and that one the worker's own (scripts/ask-model-csp.mjs). A second
// header would show here as two policies joined with a comma. The page's policy must name no
// Hugging Face host. In a build without the model: no worker files, and no model library served.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODEL_WORKER_FILE, downloadWorkerCsp, engineWorkerCsp } from './ask-model-csp.mjs';

const MANIFEST = new URL('../bboard-ui/src/ask-local/model-manifest.json', import.meta.url);

/**
 * @param {string} site
 * @param {{ staticDir?: string, fetchImpl?: typeof fetch, manifest?: object }} [o]
 * @returns {Promise<{ ok: boolean, lines: string[] }>}
 */
export const checkModelHeaders = async (site, o = {}) => {
  const staticDir = o.staticDir ?? '.vercel/output/static';
  const fetchImpl = o.fetchImpl ?? fetch;
  const manifest = o.manifest ?? JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const base = site.replace(/\/$/, '');
  const lines = [];
  let ok = true;
  const bad = (s) => {
    ok = false;
    lines.push(`FAIL ${s}`);
  };
  const assets = `${staticDir}/assets`;
  if (!existsSync(assets)) return { ok: false, lines: [`FAIL no build in ${staticDir}`] };
  const workers = readdirSync(assets)
    .map((f) => `/assets/${f}`)
    .filter((p) => MODEL_WORKER_FILE.test(p));

  const page = await fetchImpl(`${base}/`, { cache: 'no-store' });
  const pageCsp = page.headers.get('content-security-policy') ?? '';
  if (!pageCsp) bad('/ has no Content-Security-Policy');
  else if (/huggingface|hf\.co/.test(pageCsp)) bad('/ policy names Hugging Face');
  else lines.push('ok   / policy names no Hugging Face host');

  if (workers.length === 0) {
    lines.push('This build has no model (VITE_ASK_MODEL unset).');
    for (const m of manifest.models ?? []) {
      const r = await fetchImpl(`${base}${manifest.libs.servedFrom}${m.lib.file}`, { cache: 'no-store' });
      if ((r.headers.get('content-type') ?? '').includes('wasm'))
        bad(`${manifest.libs.servedFrom}${m.lib.file} is served`);
      else lines.push(`ok   ${manifest.libs.servedFrom}${m.lib.file} is not served`);
    }
    return { ok, lines };
  }
  for (const p of workers) {
    const want = /download/.test(p) ? downloadWorkerCsp(manifest) : engineWorkerCsp();
    const r = await fetchImpl(`${base}${p}`, { cache: 'no-store' });
    const csp = r.headers.get('content-security-policy') ?? '';
    const type = r.headers.get('content-type') ?? '';
    if (r.status !== 200) bad(`${p} answered ${r.status}`);
    else if (!/javascript/.test(type)) bad(`${p} is ${type || 'untyped'}, not JavaScript`);
    else if (csp !== want) bad(`${p} policy is not the worker's own:\n       got  ${csp}\n       want ${want}`);
    else lines.push(`ok   ${p} has exactly its own policy`);
  }
  return { ok, lines };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = process.argv[2];
  if (!site) {
    console.error('Usage: node scripts/check-model-headers.mjs <site address> [static folder]');
    process.exit(2);
  }
  const r = await checkModelHeaders(site, { staticDir: process.argv[3] });
  for (const l of r.lines) console.log(l);
  console.log(r.ok ? '\nModel headers: as they should be.' : '\nModel headers: NOT as they should be.');
  process.exit(r.ok ? 0 : 1);
}
