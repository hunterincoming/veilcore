// Ask's on-device model, its real loading path (docs/ask-veilcore.md, v2.1): the e2e build
// (VITE_ASK_MODEL=test) served here with the production headers, the page's from
// scripts/vercel-config.mjs and each model worker's from scripts/ask-model-csp.mjs, routed as
// Vercel routes them. Hugging Face is a stand-in in this test, answering with the stub files in
// e2e/fixtures/ask-model .
//
//   - the download worker fetches only pinned addresses, checks each file, and stores it;
//   - the real WebLLM 0.2.86 starts in the engine worker under its own policy, from the stored
//     files and this site's model library; headless Chromium has no WebGPU, so the one failure
//     allowed is "no WebGPU", and Ask then answers with Shortcuts and says why;
//   - with the model stored and the network off, a question makes no request;
//   - a file that doesn't match its hash is not kept; a worker without its own policy won't run;
//   - WebLLM is never loaded by the landing page or the app until the model starts.
// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { expect, test, type BrowserContext, type Page, type Request } from '@playwright/test';
import { downloadWorkerCsp, engineWorkerCsp, modelWorkerRouteSrc } from '../../scripts/ask-model-csp.mjs';
import { API, REAL_REGISTRY, expectNoErrors, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = JSON.parse(fs.readFileSync(path.join(UI, 'src/ask-local/model-manifest.stub.json'), 'utf8')) as {
  pinned: boolean;
  redirectHosts: string[];
  models: { id: string; repo: string; commit: string; lib: { file: string }; files: { path: string }[] }[];
};
const DIST = path.join(UI, process.env.E2E_OUT_DIR ?? 'e2e-dist');
const FIXTURES = path.join(UI, 'e2e/fixtures/ask-model');
const MODEL = stub.models[0];
const FOLDER = `https://huggingface.co/${MODEL.repo}/resolve/${MODEL.commit}/`;

/** The page's headers as deployed (scripts/vercel-config.mjs), for the e2e build's registry. */
const siteHeaders = (): Record<string, string> => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcfg-e2e-'));
  fs.mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^VITE_/.test(k)));
  const r = spawnSync(process.execPath, [path.join(UI, '../scripts/vercel-config.mjs')], {
    cwd: dir,
    env: { ...env, VITE_API_BASE: API },
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')) as {
    routes: { headers?: Record<string, string> }[];
  };
  const h = { ...(cfg.routes[0].headers as Record<string, string>) };
  // Served over plain http on 127.0.0.1: upgrade-insecure-requests would send everything to https.
  h['Content-Security-Policy'] = h['Content-Security-Policy']
    .split('; ')
    .filter((d) => d !== 'upgrade-insecure-requests')
    .join('; ');
  return h;
};

const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

type Served = { origin: string; close: () => void; served: { path: string; csp: string[] }[] };

/** The build, with each path's headers chosen the way Vercel's routes choose them. */
const serve = async (opts: { workerPolicies: boolean }): Promise<Served> => {
  const site = siteHeaders();
  const download = { ...site, 'Content-Security-Policy': downloadWorkerCsp(stub) };
  const engine = { ...site, 'Content-Security-Policy': engineWorkerCsp() };
  const served: Served['served'] = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    let p = path.join(DIST, decodeURIComponent(u.pathname));
    if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    const headers = !opts.workerPolicies
      ? site
      : new RegExp(modelWorkerRouteSrc('download')).test(u.pathname)
        ? download
        : new RegExp(modelWorkerRouteSrc('engine')).test(u.pathname)
          ? engine
          : site;
    served.push({ path: u.pathname, csp: [headers['Content-Security-Policy']] });
    res.writeHead(200, { ...headers, 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => server.close(),
    served,
  };
};

/**
 * Everything leaving the browser: the site passes, Hugging Face's stand-in answers with the
 * stub files, the registry answers empty,
 * anything else is refused and recorded.
 */
const network = async (ctx: BrowserContext, origin: string, opts: { badShard?: boolean } = {}) => {
  const hf: string[] = [];
  const refused: string[] = [];
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.href.startsWith(FOLDER)) {
      hf.push(url.href);
      const file = url.href.slice(FOLDER.length);
      // Playwright does not route the request a fulfilled redirect leads to, so the shard is
      // answered here as the storage host would answer it (the redirect host is allowed by the
      // download worker's policy: ask-local.test.ts).
      if (file === 'params_shard_0.bin') {
        const body = opts.badShard ? Buffer.from('not-the-stub-16!') : fs.readFileSync(path.join(FIXTURES, file));
        return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body });
      }
      return route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        body: fs.readFileSync(path.join(FIXTURES, file)),
      });
    }
    if (url.origin === new URL(API).origin)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: url.pathname.endsWith('/records') ? '[]' : '{}',
      });
    refused.push(url.href);
    return route.abort();
  });
  return { hf, refused };
};

/** A computer whose graphics can run the q4f16 model, as far as the page can tell. */
const desktopWithGpu = async (page: Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: { requestAdapter: () => Promise.resolve({ features: new Set(['shader-f16']) }) },
    });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 16 });
  });
};

const openAsk = async (page: Page) => {
  await page.locator('[data-ask-open]').click();
  await expect(page.locator('[data-ask-sheet]')).toBeVisible();
};

const WEBLLM_MARK = 'Fetching param cache';
const webllmChunks = () =>
  fs
    .readdirSync(path.join(DIST, 'assets'))
    .filter((f) => f.endsWith('.js') && fs.readFileSync(path.join(DIST, 'assets', f), 'utf8').includes(WEBLLM_MARK));

test.describe('the on-device model, under the production policies', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('download, checks, the real WebLLM in its worker (fails only for no WebGPU), then Shortcuts, silent offline', async ({
    browser,
  }) => {
    const site = await serve({ workerPolicies: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = watch(page);
    const net = await network(ctx, site.origin);
    await desktopWithGpu(page);
    const violations: string[] = [];
    await page.exposeFunction('__csp', (v: string) => violations.push(v));
    await page.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __csp: (s: string) => void }).__csp(`${e.violatedDirective} ${e.blockedURI}`),
      ),
    );
    const requested: string[] = [];
    ctx.on('request', (r: Request) => requested.push(r.url()));

    // The landing page and the app, before Ask starts the model: no WebLLM, no model worker.
    const chunks = webllmChunks();
    expect(chunks.length).toBe(1);
    await page.goto(`${site.origin}/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${site.origin}/records`);
    await expect(page.locator('[data-ask-open]')).toBeVisible();
    expect(requested.filter((u) => chunks.some((c) => u.endsWith(c)) || /ask-model/.test(u))).toEqual([]);

    // The download screen: real size, what Hugging Face sees, then the download.
    await openAsk(page);
    const panel = page.locator('[data-ask-model-panel]');
    await expect(panel).toBeVisible();
    await expect(page.locator('[data-ask-model-hf]')).toHaveText(
      'The model files come from Hugging Face. Hugging Face sees your IP address, the time, which model, and that the request comes from veilcore.org. Nothing you type is sent, then or later.',
    );
    // The stub's files and this site's model library (6.4 MB) are what is downloaded.
    await expect(panel).toContainText('Download: 6 MB, kept in this browser until you delete it.');
    await expect(panel).toContainText('starting it needs a connection');
    // With the download screen the sheet is taller than the window: what Ask can do keeps its height.
    const can = await page.locator('[data-ask-can]').boundingBox();
    const intro = await page.getByText('Pick one, or type what you want to do.').boundingBox();
    expect(can && intro && can.y + can.height <= intro.y).toBe(true);
    if (process.env.ASK_SHOTS) await page.screenshot({ path: `${process.env.ASK_SHOTS}/fix-model-desktop.png` });
    await page.locator('[data-ask-model-download]').click();
    await expect(page.locator('[data-ask-model-stored]')).toBeVisible({ timeout: 30_000 });
    // The download fetched the library from this site, into WebLLM's own cache.
    expect(requested.some((u) => u === `${site.origin}/ask-model/v0_2_86/${MODEL.lib.file}`)).toBe(true);
    // Only the pinned folder; nothing else asked for.
    expect(net.hf.every((u) => u.startsWith(FOLDER))).toBe(true);
    expect(net.hf.filter((u) => u.startsWith(FOLDER)).length).toBe(MODEL.files.length);
    expect(net.refused).toEqual([]);

    // The engine starts: the real WebLLM, from the stored files and this site's library.
    const engineNote = page.locator('[data-ask-engine]');
    await expect(engineNote).toHaveAttribute('data-ask-engine', /^failed:/, { timeout: 60_000 });
    // Headless Chromium has no WebGPU: the only failure allowed. Not the policy, not a hash.
    await expect(engineNote).toHaveAttribute('data-ask-engine', 'failed:noGpu');
    // Thrown where WebLLM asks for a GPU, after the model library compiled under the policy.
    expect(await engineNote.getAttribute('data-ask-engine-detail')).toMatch(
      /^(WebGPUNotAvailableError: |Error: Unable to find a compatible GPU\.)/,
    );
    await expect(engineNote).toContainText(
      'didn’t start. This browser can’t run it. An up-to-date Chrome or Edge usually can. Without it, everything works as usual.',
    );
    // It got as far as WebGPU, with WebLLM loaded and the library compiled from the cache: the
    // start fetched only its own code (the worker, WebLLM), never the library or a model file.
    // The engine starts by itself once the download is stored, maybe before this test looks:
    // the start is everything after the download's last request (the library).
    const libAt = requested.lastIndexOf(`${site.origin}/ask-model/v0_2_86/${MODEL.lib.file}`);
    expect(libAt).toBeGreaterThan(-1);
    const atStart = requested.slice(libAt + 1);
    expect(atStart.some((u) => chunks.some((c) => u.endsWith(c)))).toBe(true);
    expect(atStart.filter((u) => !u.startsWith(`${site.origin}/assets/`) || !u.endsWith('.js'))).toEqual([]);
    // Each worker had exactly its own policy.
    const workerServes = site.served.filter((s) => /ask-model-(download|engine)\.worker-/.test(s.path));
    expect(workerServes.length).toBe(2);
    for (const s of workerServes) {
      expect(s.csp).toHaveLength(1);
      expect(s.csp[0]).toBe(/download/.test(s.path) ? downloadWorkerCsp(stub) : engineWorkerCsp());
    }

    // The model didn't start here, so this question is Shortcuts' (the model's own answer path,
    // offline, is the next test): still no request.
    const after: string[] = [];
    const count = (r: Request) => after.push(r.url());
    ctx.on('request', count);
    await ctx.setOffline(true);
    await page.locator('[data-ask-input]').fill('cut 3 clones');
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.locator('[data-ask-card="draft"]').last()).toContainText('How many: 3');
    await page.waitForTimeout(1000);
    expect(after, after.join('\n')).toEqual([]);
    await ctx.setOffline(false);
    ctx.off('request', count);
    expect(violations, violations.join('\n')).toEqual([]);

    // Delete: gone from this browser.
    await page.getByRole('button', { name: 'Delete the model from this browser' }).click();
    await expect(page.locator('[data-ask-model-message="app.ask.model.deleted"]')).toBeVisible();
    expect(await page.evaluate(() => caches.keys())).not.toContain('webllm/model');
    expectNoErrors(errors.filter((e) => !/WebGPU/i.test(e)));
    await ctx.close();
    site.close();
  });

  test('a file that doesn’t match its hash is not kept, and the model stays off', async ({ browser }) => {
    const site = await serve({ workerPolicies: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await network(ctx, site.origin, { badShard: true });
    await desktopWithGpu(page);
    await page.goto(`${site.origin}/records`);
    await openAsk(page);
    await page.locator('[data-ask-model-download]').click();
    await expect(page.locator('[data-ask-model-message="app.ask.model.failed.mismatch"]')).toBeVisible({
      timeout: 30_000,
    });
    const stored = await page.evaluate(async () => {
      const c = await caches.open('webllm/model');
      return (await c.keys()).map((r) => r.url);
    });
    expect(stored.some((u) => u.endsWith('params_shard_0.bin'))).toBe(false);
    await expect(page.locator('[data-ask-engine]')).toHaveCount(0);
    await ctx.close();
    site.close();
  });

  test('a worker served without its own policy does not run', async ({ browser }) => {
    const site = await serve({ workerPolicies: false });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const net = await network(ctx, site.origin);
    await desktopWithGpu(page);
    await page.goto(`${site.origin}/records`);
    await openAsk(page);
    await page.locator('[data-ask-model-download]').click();
    await expect(page.locator('[data-ask-model-message="app.ask.model.failed.policy"]')).toBeVisible({
      timeout: 30_000,
    });
    expect(net.hf).toEqual([]);
    await ctx.close();
    site.close();
  });
});

test('a phone is not offered the model and sees nothing about it; a narrow window is told to widen', async ({
  browser,
}) => {
  const site = await serve({ workerPolicies: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await network(ctx, site.origin);
  await desktopWithGpu(page);
  await page.goto(`${site.origin}/records`);
  await openAsk(page);
  await expect(page.locator('[data-ask-can]')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-ask-model-panel]')).toHaveCount(0);
  await ctx.close();
  const wide = await browser.newContext({ viewport: { width: 700, height: 800 } });
  const p2 = await wide.newPage();
  await network(wide, site.origin);
  await desktopWithGpu(p2);
  await p2.goto(`${site.origin}/records`);
  await openAsk(p2);
  await expect(p2.locator('[data-ask-model-panel="not-here"]')).toHaveText(
    'Make this window wider to see the optional language model.',
  );
  await wide.close();
  site.close();
});

test('the model’s own answer path: stored, started (a stand-in past WebGPU), and with the network off, no request', async ({
  browser,
}) => {
  const site = await serve({ workerPolicies: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await network(ctx, site.origin);
  await desktopWithGpu(page);
  // Test builds only: the engine worker runs every real check (its policy, every stored file's
  // hash), then answers with a stand-in instead of WebLLM, which needs a GPU.
  await page.addInitScript(() => {
    (globalThis as { __askStandInEngine?: boolean }).__askStandInEngine = true;
  });
  await page.goto(`${site.origin}/records`);
  await openAsk(page);
  await page.locator('[data-ask-model-download]').click();
  await expect(page.locator('[data-ask-model-stored]')).toBeVisible({ timeout: 30_000 });
  const note = page.locator('[data-ask-engine]');
  await expect(note).toHaveAttribute('data-ask-engine', 'model', { timeout: 30_000 });
  await expect(note).toHaveText(
    'Using the language model on this device (Qwen3 0.6B). Its answers get the same checks as always.',
  );
  await expect(page.locator('[data-ask-privacy]')).toHaveAttribute('data-ask-privacy', 'model');
  await expect(page.locator('[data-ask-privacy]')).toContainText(
    'Typing here sends nothing. The language model runs on this device. Only Save sends.',
  );

  const after: string[] = [];
  ctx.on('request', (r: Request) => after.push(r.url()));
  await ctx.setOffline(true);
  // Shortcuts can't read this one ("took 9 off": no word it knows); the model's answer can.
  await page.locator('[data-ask-input]').fill('took 9 off the mother plant');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  const card = page.locator('[data-ask-card="draft"]').last();
  await expect(card).toContainText('Opens: Cut clones');
  await expect(card).toContainText('How many: 9');
  await page.waitForTimeout(1000);
  expect(after, after.join('\n')).toEqual([]);
  await ctx.setOffline(false);
  if (process.env.ASK_SHOTS) await page.screenshot({ path: `${process.env.ASK_SHOTS}/fix-model-on-desktop.png` });
  expectNoErrors(errors);
  await ctx.close();
  site.close();
});
