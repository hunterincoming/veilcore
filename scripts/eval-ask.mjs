#!/usr/bin/env node
// Ask's evaluation: Shortcuts against the on-device model, on the same 200 requests in five
// languages (scripts/fixtures/ask-eval.json), in a real browser with a real GPU. Run on the
// maintainer's Mac after scripts/pin-model.mjs; the model is offered by default only if this
// says it clearly wins (scripts/ask-eval-score.mjs clearlyWins).
//
//   cd bboard-ui && VITE_ASK_MODEL=eval npx vite build --mode preview --outDir ask-eval-dist && cd ..
//   node scripts/eval-ask.mjs                      the 1.7B model, Chrome on this Mac, a window
//   node scripts/eval-ask.mjs --model Qwen3-0.6B-q4f16_1-MLC
//
// The build is served here with the site's own headers (scripts/vercel-config.mjs) and each
// model worker's own policy (scripts/ask-model-csp.mjs). The model is downloaded from Hugging
// Face through the app's own download (pinned commit, every file checked), started, and must pass
// its test answer. Then the network is switched off and every request is asked of both engines;
// any request the browser makes while they answer counts against the model.
// Writes ask-eval-report.json in the current folder.
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadWorkerCsp, engineWorkerCsp, modelWorkerRouteSrc } from './ask-model-csp.mjs';
import { clearlyWins, matches, summarise } from './ask-eval-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : process.argv[i + 1];
};
const DIST = path.resolve(arg('--dist', path.join(ROOT, 'bboard-ui/ask-eval-dist')));
const MODEL_ID = arg('--model', 'Qwen3-1.7B-q4f16_1-MLC');
const CHANNEL = arg('--channel', 'chrome');
const HEADLESS = process.argv.includes('--headless');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'bboard-ui/src/ask-local/model-manifest.json'), 'utf8'));
if (!manifest.pinned) {
  console.error('The model is not pinned yet: run node scripts/pin-model.mjs first.');
  process.exit(1);
}
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(
    `No build in ${DIST}. Build it with:\n  cd bboard-ui && VITE_ASK_MODEL=eval npx vite build --mode preview --outDir ask-eval-dist`,
  );
  process.exit(1);
}
const set = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/ask-eval.json'), 'utf8'));

// ---- the site, with its headers ----
const siteHeaders = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcfg-eval-'));
  fs.mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^VITE_/.test(k)));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/vercel-config.mjs')], {
    cwd: dir,
    env,
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  const h = {
    ...JSON.parse(fs.readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')).routes[0].headers,
  };
  h['Content-Security-Policy'] = h['Content-Security-Policy']
    .split('; ')
    .filter((d) => d !== 'upgrade-insecure-requests')
    .join('; ');
  return h;
};
const site = siteHeaders();
const TYPES = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? '/', 'http://x');
  let p = path.join(DIST, decodeURIComponent(u.pathname));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  const headers = new RegExp(modelWorkerRouteSrc('download')).test(u.pathname)
    ? { ...site, 'Content-Security-Policy': downloadWorkerCsp(manifest) }
    : new RegExp(modelWorkerRouteSrc('engine')).test(u.pathname)
      ? { ...site, 'Content-Security-Policy': engineWorkerCsp() }
      : site;
  res.writeHead(200, {
    ...headers,
    'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream',
  });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---- the browser ----
const require = createRequire(path.join(ROOT, 'bboard-ui/package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({
  channel: CHANNEL,
  headless: HEADLESS,
  args: HEADLESS ? ['--enable-unsafe-webgpu'] : [],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();
await page.goto(`${origin}/records`);
await page.waitForFunction(() => '__askEval' in window, null, {
  timeout: 60_000,
});

console.log(`Downloading ${MODEL_ID} (pinned commit, every file checked)...`);
const dl = await page.evaluate((id) => window.__askEval.download(id), MODEL_ID);
if (dl !== 'done') throw new Error(`download: ${dl}`);
console.log('Starting it...');
const started = await page.evaluate((id) => window.__askEval.start(id), MODEL_ID);
console.log(
  `  started: ${started.ok}${started.why ? ` (${started.why})` : ''}, test answer right: ${started.selfTest}`,
);
if (!started.ok) throw new Error(`the model did not start: ${started.why}`);

// ---- the questions, with the network off ----
await ctx.setOffline(true);
const requests = [];
ctx.on('request', (r) => requests.push(r.url()));
const answers = {};
const times = [];
for (const [i, c] of set.cases.entries()) {
  const s = await page.evaluate(([t, r, k]) => window.__askEval.shortcuts(t, r, k), [c.text, set.records, set.kinds]);
  const t0 = Date.now();
  const m = await page.evaluate(([t, r, k]) => window.__askEval.model(t, r, k), [c.text, set.records, set.kinds]);
  times.push(Date.now() - t0);
  const alone = await page.evaluate(
    ([t, r, k]) => window.__askEval.model(t, r, k, true),
    [c.text, set.records, set.kinds],
  );
  answers[c.id] = {
    shortcuts: matches(s, c.expect, set.records),
    model: matches(m, c.expect, set.records),
    modelOnly: matches(alone, c.expect, set.records),
    got: { shortcuts: s, model: m, alone },
  };
  process.stdout.write(`\r  ${i + 1}/${set.cases.length}`);
}
await ctx.setOffline(false);
await browser.close();
server.close();

const sum = summarise(set.cases, answers);
const verdict = clearlyWins(sum, requests.length);
times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)];
console.log(`\n\n${MODEL_ID}, ${sum.total} requests`);
console.log(`  Shortcuts right:            ${sum.shortcuts}`);
console.log(`  Model (as Ask uses it):     ${sum.model}`);
console.log(`  Model alone (no fallback):  ${sum.modelOnly}`);
for (const [lang, l] of Object.entries(sum.byLang))
  console.log(`  ${lang}: Shortcuts ${l.shortcuts}/${l.total}, model ${l.model}/${l.total}`);
console.log(`  Model right where Shortcuts was wrong: ${sum.wins.length}; the other way round: ${sum.losses.length}`);
console.log(`  Median time per model answer: ${median} ms`);
console.log(`  Requests while answering (network off): ${requests.length}`);
console.log(`  Test answer on this device: ${started.selfTest ? 'right' : 'WRONG'}`);
console.log(
  verdict.wins && started.selfTest
    ? '\nCLEARLY WINS: the model may be offered by default.'
    : `\nDOES NOT CLEARLY WIN: keep the model hidden.\n  ${[...verdict.reasons, ...(started.selfTest ? [] : ['the test answer was wrong'])].join('\n  ')}`,
);
fs.writeFileSync(
  'ask-eval-report.json',
  JSON.stringify(
    {
      model: MODEL_ID,
      date: new Date().toISOString(),
      summary: sum,
      verdict,
      medianMs: median,
      requests,
      answers,
    },
    null,
    2,
  ),
);
console.log('Details: ask-eval-report.json');
