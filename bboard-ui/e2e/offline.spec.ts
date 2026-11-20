// Works with no signal, dated in seconds (docs/offline.md), in a real browser.
//
// The build is served the way a release deploy serves it: with the headers scripts/vercel-config.mjs
// writes (the Content-Security-Policy and Trusted Types included; all but upgrade-insecure-requests,
// which would send http://127.0.0.1 to https), sw.js no-cache, and a release list (/release.json and
// /releases/e2e/<commit>.json, hashed here as scripts/release-manifest.mjs hashes them). Then:
//   1. the first visit with signal copies the app; with no signal it opens anyway, a plant is
//      sealed, the screen says when by the phone's clock and that it is dated when sent, and
//      nothing is sent; back online it is sent by itself, and its own RFC 3161 timestamp (a real
//      token from a local openssl TSA, checked in the page) shows in seconds;
//   2. a new release: a page served from the old copy says a newer version is ready once signal
//      is back; after that the copy is the new release, and the old copy is gone;
//   3. a release list naming a file the site doesn't serve is never copied: the copy in use stays;
//   4. the kill switch (offline/sw-kill.js served as /sw.js) removes the worker and every copy.
// Screenshots at 390 and 1366 px go to E2E_SHOTS (or scratchpad/offline-shots when set by the run).
// SPDX-License-Identifier: Apache-2.0
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { API, REAL_REGISTRY, startPlant } from './helpers';

test.skip(REAL_REGISTRY, 'served from the stand-in build');
test.use({ serviceWorkers: 'allow', isMobile: true, hasTouch: true });
test.describe.configure({ mode: 'serial' });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', process.env.E2E_OUT_DIR ?? 'e2e-dist');
const SHOTS = process.env.E2E_SHOTS ?? '';
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  for (const [w, h] of [
    [390, 844],
    [1366, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
};

// ---- the site as a deploy serves it ----------------------------------------------------------

const routesOf = (): { headers: Record<string, string>; sw: Record<string, string> } => {
  const dir = mkdtempSync(path.join(tmpdir(), 'offline-cfg-'));
  mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
  const r = spawnSync(process.execPath, [path.resolve(HERE, '../../scripts/vercel-config.mjs')], {
    cwd: dir,
    // As the e2e build was made (package.json e2e:build), so the policy is the one it would get.
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
    routes: { src?: string; headers?: Record<string, string> }[];
  };
  const h = cfg.routes[0].headers ?? {};
  const sw = cfg.routes.find((x) => x.src === '^/sw\\.js$')?.headers ?? {};
  return {
    headers: {
      ...h,
      'Content-Security-Policy': h['Content-Security-Policy']
        .split('; ')
        .filter((d) => d !== 'upgrade-insecure-requests')
        .join('; '),
    },
    sw,
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
  '.webmanifest': 'application/manifest+json',
};

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

/** Every file of the build by its served path, with its bytes (overrides replace some). */
const distFiles = (): Map<string, Buffer> => {
  const out = new Map<string, Buffer>();
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const f = path.join(d, n);
      if (statSync(f).isDirectory()) walk(f);
      else out.set(`/${path.relative(DIST, f).split(path.sep).join('/')}`, readFileSync(f));
    }
  };
  walk(DIST);
  return out;
};

type Site = {
  origin: string;
  /** Serve this release: files (path -> bytes), its manifest's hashes (may lie, for test 3). */
  publish: (files: Map<string, Buffer>, opts?: { lie?: string }) => string;
  /** Serve this as /sw.js instead of the build's. */
  swOverride: (text: string | undefined) => void;
  /** No signal: every request to the site is cut off, as with no network at all. */
  down: boolean;
  close: () => void;
  served: string[];
};

const startSite = async (): Promise<Site> => {
  const { headers, sw } = routesOf();
  let files = distFiles();
  let swText: string | undefined;
  const served: string[] = [];
  const state = { down: false };
  const server = http.createServer((req, res) => {
    // Playwright's setOffline() doesn't reach a service worker's own requests: the server is
    // cut off too, so the worker really has no network.
    if (state.down) return void req.socket.destroy();
    const u = new URL(req.url ?? '/', 'http://x');
    served.push(u.pathname);
    let p = decodeURIComponent(u.pathname);
    let body = p === '/sw.js' && swText !== undefined ? Buffer.from(swText) : files.get(p);
    if (!body) {
      // The single-page app's fallback, as config.json's last route.
      p = '/index.html';
      body = files.get(p);
    }
    res.writeHead(200, {
      ...headers,
      ...(u.pathname === '/sw.js' ? sw : {}),
      'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream',
    });
    res.end(body);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const origin = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  const listed = Object.fromEntries(
    Object.entries(headers)
      .map(([k, v]) => [k.toLowerCase(), v] as const)
      .filter(([k]) =>
        ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy'].includes(k),
      ),
  );
  return {
    origin,
    served,
    get down() {
      return state.down;
    },
    set down(v: boolean) {
      state.down = v;
    },
    publish: (next, opts = {}) => {
      const commit = randomBytes(20).toString('hex');
      const release = Buffer.from(
        JSON.stringify({ format: 'veilcore-release/v1', network: 'e2e', commit, date: new Date().toISOString() }),
      );
      const all = new Map(next);
      all.set('/release.json', release);
      const hashes: Record<string, string> = {};
      for (const [p, b] of all) if (!p.startsWith('/releases/')) hashes[p] = sha(b);
      if (opts.lie) hashes[opts.lie] = '00'.repeat(32);
      const manifest = {
        format: 'veilcore-release-manifest/v1',
        network: 'e2e',
        commit,
        date: new Date().toISOString(),
        uncommittedChanges: true,
        files: hashes,
        headers: listed,
      };
      all.set(`/releases/e2e/${commit}.json`, Buffer.from(JSON.stringify(manifest)));
      files = all;
      return commit;
    },
    swOverride: (text) => {
      swText = text;
    },
    close: () => server.close(),
  };
};

// ---- a local RFC 3161 TSA (openssl), for the record's own timestamp ------------------------------

const makeTsa = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'e2e-tsa-'));
  const ssl = (...args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(path.join(dir, 'ext.cnf'), 'extendedKeyUsage = critical,timeStamping\nbasicConstraints = CA:FALSE\n');
  ssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'ca.key',
    '-out',
    'ca.pem',
    '-days',
    '2',
    '-subj',
    '/CN=E2E TSA Root',
  );
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'tsa.key', '-out', 'tsa.csr', '-subj', '/CN=E2E TSA');
  ssl(
    'x509',
    '-req',
    '-in',
    'tsa.csr',
    '-CA',
    'ca.pem',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-out',
    'tsa.pem',
    '-days',
    '2',
    '-extfile',
    'ext.cnf',
  );
  writeFileSync(
    path.join(dir, 'tsa.cnf'),
    `[ tsa ]\ndefault_tsa = t\n[ t ]\ndir = ${dir}\nserial = ${dir}/serial\nsigner_cert = ${dir}/tsa.pem\nsigner_key = ${dir}/tsa.key\nsigner_digest = sha256\ndefault_policy = 1.2.3.4.1\ndigests = sha256\ness_cert_id_alg = sha256\naccuracy = secs:1\nordering = no\ntsa_name = no\ness_cert_id_chain = no\ncerts = ${dir}/tsa.pem\n`,
  );
  writeFileSync(path.join(dir, 'serial'), '01\n');
  /** A token on the proof code's 32 raw bytes, base64 (a full TimeStampResp; the page takes either). */
  return (fp: string): string => {
    writeFileSync(path.join(dir, 'pc.bin'), Buffer.from(fp, 'hex'));
    ssl('ts', '-query', '-data', 'pc.bin', '-sha256', '-cert', '-out', 'q.tsq');
    ssl('ts', '-reply', '-config', 'tsa.cnf', '-queryfile', 'q.tsq', '-out', 'r.tsr');
    return readFileSync(path.join(dir, 'r.tsr')).toString('base64');
  };
};

// ---- the stand-in registry, which "no signal" cuts off too ----------------------------------------
//
// A real local server, not page.route(): Playwright turns service workers off for any page whose
// requests it routes, which would make this test pass or fail without the worker. The build's
// registry address (registry.e2e.invalid) is pointed at it with Chromium's host resolver rules.

const REG_PORT = Number(process.env.E2E_REGISTRY_PORT ?? 4391);
test.use({ launchOptions: { args: [`--host-resolver-rules=MAP ${new URL(API).hostname} 127.0.0.1:${REG_PORT}`] } });

type Registry = {
  offline: boolean;
  dating: Record<string, unknown>[][];
  rows: Record<string, unknown>[];
  close: () => void;
};
const startRegistry = async (tsaFor: (fp: string) => string): Promise<Registry> => {
  const reg: Registry = { offline: false, dating: [], rows: [], close: () => undefined };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (v: unknown, status = 200) => {
      res.writeHead(status, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS',
      });
      res.end(JSON.stringify(v));
    };
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      // The browser is offline too (context.setOffline); this only makes sure.
      if (reg.offline) return void req.socket.destroy();
      if (req.method === 'OPTIONS') return send({}, 204);
      const key = `${req.method} ${url.pathname}`;
      if (key === 'GET /api/records') return send(reg.rows);
      if (key === 'PUT /api/records/dating') {
        const rows = JSON.parse(Buffer.concat(chunks).toString() || '[]') as Record<string, unknown>[];
        reg.dating.push(rows);
        for (const r of rows) if (!reg.rows.some((x) => x.id === r.id)) reg.rows.push({ ...r, bodyPending: true });
        return send({ ok: true, dated: rows.map((r) => r.id) });
      }
      if (key === 'PUT /api/records') return send({ ok: true, count: 0, integrityCheckedBy: 'holder' });
      if (key === 'GET /api/licenses') return send([]);
      if (key === 'GET /api/disclosures') return send([]);
      if (key === 'GET /transfers/sent') return send({ transfers: [] });
      const v = /^\/verify\/(VEIL-[0-9A-F]+)$/.exec(url.pathname);
      const row = v && reg.rows.find((r) => r.id === v[1]);
      if (row)
        return send({
          found: true,
          id: row.id,
          recordFingerprint: row.recordFingerprint,
          anchored: false,
          disclosed: [],
        });
      const m = /^\/proof\/([0-9a-f]{64})\/instant$/.exec(url.pathname);
      if (m && reg.rows.some((r) => r.recordFingerprint === m[1]))
        return send({
          status: 'stamped',
          stamps: 'the proof code as 32 raw bytes',
          tokens: [
            {
              kind: 'rfc3161',
              token: tsaFor(m[1]),
              tsa: 'https://tsa.e2e.example/',
              genTime: new Date().toISOString(),
            },
          ],
        });
      return send({ error: 'not in the test registry' }, 404);
    });
  });
  await new Promise<void>((r) => server.listen(REG_PORT, '127.0.0.1', () => r()));
  reg.close = () => server.close();
  return reg;
};

/** The worker controls the page and its copy of `commit` is complete. */
const copied = async (page: Page, commit: string) =>
  expect
    .poll(
      () =>
        page.evaluate(async (c) => {
          if (!navigator.serviceWorker.controller) return 'no worker yet';
          const keys = await caches.keys();
          if (!keys.includes(`veilcore-shell-${c}`)) return `caches: ${keys.join(',')}`;
          const meta = await (await caches.open('veilcore-offline-meta')).match('/__veilcore-offline/active');
          const active = meta ? ((await meta.json()) as { commit: string }).commit : null;
          return active === c ? 'copied' : `active: ${String(active)}`;
        }, commit),
      { timeout: 60_000 },
    )
    .toBe('copied');

/**
 * No signal, or signal back: the browser's own offline switch (navigator.onLine and the page's
 * requests), and the site and the stand-in registry cut off (the worker's requests).
 */
const goOffline = async (context: BrowserContext, off: boolean) => {
  reg.offline = off;
  site.down = off;
  await context.setOffline(off);
};

let site: Site;
let reg: Registry;
test.beforeAll(async () => {
  test.skip(!existsSync(path.join(DIST, 'index.html')), 'run npm run e2e:build first');
  site = await startSite();
  reg = await startRegistry(makeTsa());
});
test.afterAll(() => {
  site?.close();
  reg?.close();
});
test.beforeEach(() => {
  reg.offline = false;
  reg.dating = [];
  reg.rows = [];
});

test('opens and seals with no signal; sent and timestamped by itself when signal is back', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const violations: string[] = [];
  await page.exposeFunction('__csp', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    localStorage.setItem('veilcore.role.v1', 'breeder');
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __csp: (s: string) => void }).__csp(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  const commit = site.publish(distFiles());

  // A first visit with signal: the worker copies the release, checked file by file.
  await page.goto(`${site.origin}/records`);
  await copied(page, commit);

  // No signal. The app opens from the copy, and says what works and what waits.
  await goOffline(context, true);
  await page.goto(`${site.origin}/new`);
  await expect(page.locator('[data-offline-bar]')).toBeVisible();
  await startPlant(page);
  const name = `Pasture calf (practice) ${Date.now()}`;
  await page.getByLabel(/Plant or line name/).fill(name);
  await page.getByLabel(/Bred by/).fill('E2E');
  await page.getByRole('button', { name: /Next: check it/ }).click();
  await page.getByRole('button', { name: /Seal it/ }).click();
  const here = page.locator('[data-sealed-here]').first();
  await expect(here).toBeVisible({ timeout: 60_000 });
  // The phone's own clock, said as such, and the date only when sent: never a date before.
  await expect(here).toContainText(/Sealed on this phone at .+ \(your phone’s clock\)\. Dated when it’s sent\./);
  // Chromium has Background Sync: the proof code goes by itself.
  await expect(here).toContainText(/Its proof code goes by itself when you’re back online\./);
  await expect(page.locator('[data-record-dated-next]')).toHaveCount(0);
  expect(reg.dating, 'nothing sent with no signal').toEqual([]);
  await shot(page, 'offline-sealed');

  // Signal again: sent by itself (the page's online event), then its own timestamp in seconds.
  await goOffline(context, false);
  await expect.poll(() => reg.dating.length, { timeout: 30_000 }).toBeGreaterThan(0);
  const sent = reg.dating.flat() as { id: string; recordFingerprint: string }[];
  expect(sent.every((r) => Object.keys(r).every((k) => ['id', 'recordFingerprint', 'keyBinding'].includes(k)))).toBe(
    true,
  );
  await expect(page.locator('[data-offline-bar]')).toHaveCount(0);
  const line = page.locator('[data-record-dated-next]').first();
  await expect(line).toContainText(
    // In the person's own time zone, to the second; the name is the signing key's own (its certificate's).
    /Timestamped .+\d{2}:\d{2}:\d{2}.* by E2E TSA \(as its key names it\) — the date on Midnight, the blockchain, follows in the next batch\./,
    { timeout: 30_000 },
  );
  await shot(page, 'online-timestamped');

  // Home: the install card, worded for what happens next.
  await page.goto(`${site.origin}/records`);
  await expect(page.locator('[data-install-card]')).toBeVisible();
  await shot(page, 'home-install-card');

  // The check page shows the timestamp as its own fact, checked here.
  const fp = sent[0].recordFingerprint;
  await page.goto(`${site.origin}/verify/${sent[0].id}?fp=${fp}`);
  await expect(page.locator('[data-instant-stamp]')).toContainText(
    /Timestamped \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC by E2E TSA/,
  );
  // Its own fact in "What each fact rests on": signed, checked here, the name the key's own.
  await page.locator('[data-see-checks]').click();
  await expect(page.locator('[data-instant-fact="E2E TSA"]')).toContainText(/a key named E2E TSA \(name not checked\)/);
  await shot(page, 'check-page-timestamp');

  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('a new release: the old copy says so once signal is back, then the copy is the new release', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  const a = site.publish(distFiles());
  await page.goto(`${site.origin}/records`);
  await copied(page, a);

  // Release B changes the page itself.
  const b = distFiles();
  b.set(
    '/index.html',
    Buffer.from(b.get('/index.html')!.toString().replace('</head>', '<meta name="e2e-release" content="B" /></head>')),
  );
  const bCommit = site.publish(b);

  // No signal: the page comes from A's copy, never from anything of B.
  await goOffline(context, true);
  await page.goto(`${site.origin}/records`);
  await expect(page.locator('meta[name="e2e-release"]')).toHaveCount(0);
  // Signal again: the worker copies B, and the page from A's copy says a newer version is ready.
  await goOffline(context, false);
  await copied(page, bCommit);
  await expect(page.locator('[data-update-ready]')).toBeVisible({ timeout: 30_000 });
  await shot(page, 'update-ready');
  expect((await page.evaluate(() => caches.keys())).filter((k) => k.startsWith('veilcore-shell-'))).toEqual([
    `veilcore-shell-${bCommit}`,
  ]);
  // And with no signal now, the page is B's.
  await goOffline(context, true);
  await page.goto(`${site.origin}/records`);
  await expect(page.locator('meta[name="e2e-release"]')).toHaveCount(1);
  await goOffline(context, false);
});

test('a release whose list doesn’t match what the site serves is never copied', async ({ page, context }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  const good = site.publish(distFiles());
  await page.goto(`${site.origin}/records`);
  await copied(page, good);
  // The next list names a SHA-256 for the page that the site doesn't serve.
  const bad = site.publish(distFiles(), { lie: '/index.html' });
  await page.goto(`${site.origin}/records`);
  await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({ type: 'veilcore-check' }));
  await page.waitForTimeout(3_000);
  const keys = await page.evaluate(() => caches.keys());
  expect(keys).not.toContain(`veilcore-shell-${bad}`);
  expect(keys).toContain(`veilcore-shell-${good}`);
  await goOffline(context, true);
  await page.goto(`${site.origin}/records`);
  await expect(page.locator('[data-offline-bar]')).toBeVisible();
  await goOffline(context, false);
});

test('the kill switch: the worker unregisters itself and every copy goes', async ({ page, context }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('veilcore.role.v1', 'breeder'));
  const c = site.publish(distFiles());
  await page.goto(`${site.origin}/records`);
  await copied(page, c);
  site.swOverride(readFileSync(path.resolve(HERE, '../offline/sw-kill.js'), 'utf8'));
  try {
    // The next page load with signal asks for /sw.js past every cache and gets the kill switch.
    await page.goto(`${site.origin}/records`);
    await expect
      .poll(
        () =>
          page.evaluate(async () => ({
            workers: (await navigator.serviceWorker.getRegistrations()).length,
            copies: (await caches.keys()).filter((k) => k.startsWith('veilcore-')).length,
          })),
        { timeout: 60_000 },
      )
      .toEqual({ workers: 0, copies: 0 });
    // Nothing answers with no signal now.
    await goOffline(context, true);
    const failed = await page.goto(`${site.origin}/records`).then(
      () => false,
      () => true,
    );
    expect(failed).toBe(true);
  } finally {
    site.swOverride(undefined);
    await goOffline(context, false);
  }
});
