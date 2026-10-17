// The key date stamp under the site's real security headers (17 Oct 2026).
//
// The test site sends a Content-Security-Policy that requires Trusted Types for scripts
// (scripts/vercel-config.mjs). The proving worker was started with `new Worker(new URL(...))`,
// which that rule refuses in Chrome, so every date stamp on test.veilcore.org failed with "The
// date stamp didn't go through" before anything was proven. The other browser tests serve the
// build without those headers (vite preview), so none of them could see it.
//
// Here the same build is served with the headers a deploy writes (all but
// upgrade-insecure-requests, which would send http://127.0.0.1 to https), a plant is logged, and
// the stamp must get past starting the prover: it may only fail where the network is blocked on
// purpose (reading the contract), never at the worker, and nothing may break the policy.
// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { API, REAL_REGISTRY } from './helpers';

test.skip(REAL_REGISTRY, 'served from the stand-in build');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', process.env.E2E_OUT_DIR ?? 'e2e-dist');

/** The headers a deploy of this build would send (scripts/vercel-config.mjs), for these settings. */
const deployHeaders = (): Record<string, string> => {
  const dir = mkdtempSync(path.join(tmpdir(), 'csp-prover-'));
  mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
  const r = spawnSync(process.execPath, [path.resolve(HERE, '../../scripts/vercel-config.mjs')], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      VITE_API_BASE: API,
      VITE_REAL_CHAIN: '1',
      VITE_SPONSOR_URL: 'http://sponsor.e2e.invalid',
      VITE_NETWORK_ID: 'preview',
    },
  });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const cfg = JSON.parse(readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')) as {
    routes: { headers?: Record<string, string> }[];
  };
  const h = cfg.routes[0].headers ?? {};
  return {
    ...h,
    'Content-Security-Policy': h['Content-Security-Policy']
      .split('; ')
      .filter((d) => d !== 'upgrade-insecure-requests')
      .join('; '),
  };
};

const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

test('the key date stamp starts the prover under the site’s Content-Security-Policy and Trusted Types', async ({
  page,
}) => {
  test.setTimeout(180_000);
  test.skip(!existsSync(path.join(DIST, 'index.html')), 'run npm run e2e:build first');
  const headers = deployHeaders();
  expect(headers['Content-Security-Policy']).toMatch(/require-trusted-types-for 'script'/);
  expect(headers['Content-Security-Policy']).toMatch(/trusted-types [^;]*veilcore-prover/);

  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    let p = path.join(DIST, decodeURIComponent(u.pathname));
    if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    res.writeHead(200, { ...headers, 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    createReadStream(p).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const origin = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  try {
    const violations: string[] = [];
    const errors: string[] = [];
    await page.exposeFunction('__csp', (v: string) => violations.push(v));
    await page.addInitScript(() => {
      localStorage.setItem('veilcore.role.v1', 'breeder');
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __csp: (s: string) => void }).__csp(`${e.violatedDirective} ${e.blockedURI}`),
      );
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    // The site itself; a stand-in registry that takes the plant; everything else refused.
    const rows: unknown[] = [];
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      if (url.origin === new URL(API).origin) {
        const key = `${route.request().method()} ${url.pathname}`;
        const body = (v: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
            body: JSON.stringify(v),
          });
        if (route.request().method() === 'OPTIONS') return body({}, 204);
        if (key === 'GET /api/records') return body(rows);
        if (key === 'PUT /api/records/dating') return body({ ok: true, dated: [] });
        if (key === 'GET /api/licenses') return body([]);
        return body({ error: 'not in the test registry' }, 404);
      }
      return route.abort();
    });

    await page.goto(`${origin}/new`);
    await page.getByLabel(/Plant or line name/).fill(`CSP stamp (practice) ${Date.now()}`);
    await page.getByLabel(/Bred by/).fill('E2E');
    await page.getByRole('button', { name: /Next: check it/ }).click();
    await page.getByRole('button', { name: /Seal it/ }).click();
    const failed = page.locator('[data-error]');
    await expect(failed).toBeVisible({ timeout: 120_000 });
    const why = (await failed.getAttribute('data-error')) ?? '';
    // Before the fix: "The prover could not start in this browser: Failed to construct 'Worker':
    // This document requires 'TrustedScriptURL' assignment."
    expect(why).not.toMatch(/prover could not start|TrustedScriptURL|Failed to construct/);
    // It got past the prover, to the network this test blocks.
    expect(why).toMatch(/indexer|network|reach/i);
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    server.close();
  }
});
