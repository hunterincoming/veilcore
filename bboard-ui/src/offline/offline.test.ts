// Works with no signal, dated in seconds (docs/offline.md): the offline worker run in a stand-in
// service-worker scope, its kill switch, the site check that covers it, the deploy headers, and the
// words and facts the pages show for a record's own timestamp. The same in a real browser:
// e2e/offline.spec.ts.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- stand-ins for the browser's promise-returning APIs */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, webcrypto, X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkServiceWorker, releaseMatches, SW_CACHE_CONTROL } from '../../../scripts/release-check.mjs';
import { workerScriptUrl } from './register';
import { whoVouches } from '../components/verify/who-vouches';
import { instantLines, sealedHereWords } from '../components/offline/offline-words';
import { instantStampFor, TSA_PINS, withinPin } from '../veilcore/instant-stamp';
import { enT } from '../i18n/translate';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SW = fs.readFileSync(path.resolve(HERE, '../../offline/sw.js'), 'utf8');
const KILL = fs.readFileSync(path.resolve(HERE, '../../offline/sw-kill.js'), 'utf8');
const ORIGIN = 'https://veilcore.example';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// ---- a stand-in service-worker scope -----------------------------------------------------------

type Served = Record<string, { body: string; headers?: Record<string, string> }>;
/** The worker as a release build writes it: its copy's hashes and the page's headers filled in. */
const PAGE_HEADERS = { 'content-security-policy': "default-src 'self'" };
const built = (files: Served, pageHeaders: Record<string, string> | null = PAGE_HEADERS) => {
  const shell = (JSON.parse(files['/offline-shell.json'].body) as { files: string[] }).files;
  const hashes = Object.fromEntries(['/index.html', ...shell].map((p) => [p, sha(files[p].body)]));
  return SW.replace("'__VEILCORE_API_BASE__'", '"https://registry.example"')
    .replace("'__VEILCORE_SHELL_FILES__'", JSON.stringify(hashes))
    .replace("'__VEILCORE_PAGE_HEADERS__'", pageHeaders ? JSON.stringify(pageHeaders) : "'__VEILCORE_PAGE_HEADERS__'");
};
const scope = (served: Served, opts: { offline?: () => boolean; pageUrl?: () => string; worker?: string } = {}) => {
  const handlers: Record<string, ((e: unknown) => void)[]> = {};
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (r: RequestInfo | URL) =>
    new URL(typeof r === 'string' ? r : r instanceof URL ? r.href : r.url, ORIGIN).pathname;
  const cache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      match: async (r: RequestInfo) => m.get(keyOf(r))?.clone(),
      put: async (r: RequestInfo, res: Response) => void m.set(keyOf(r), res.clone()),
      delete: async (r: RequestInfo) => m.delete(keyOf(r)),
    };
  };
  const fetched: string[] = [];
  const fetchImpl = async (r: RequestInfo | URL) => {
    const p = keyOf(r);
    fetched.push(p);
    if (opts.offline?.()) throw new TypeError('Failed to fetch');
    // As the site does: a page address it has no file for is the app's index.html.
    const f = served[p] ?? (/^\/(assets|releases)\/|\.json$/.test(p) ? undefined : served['/index.html']);
    if (!f) return new Response('not here', { status: 404 });
    return new Response(f.body, { status: 200, headers: f.headers ?? {} });
  };
  const messages: unknown[] = [];
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener: (t: string, h: (e: unknown) => void) => (handlers[t] ??= []).push(h),
    skipWaiting: () => undefined,
    clients: {
      claim: async () => undefined,
      matchAll: async () => [
        { id: 'page-1', url: opts.pageUrl?.() ?? `${ORIGIN}/records`, postMessage: (m: unknown) => messages.push(m) },
      ],
    },
    registration: { unregister: async () => true },
  };
  const ctx = vm.createContext({
    self,
    caches: {
      open: async (n: string) => cache(n),
      keys: async () => [...stores.keys()],
      has: async (n: string) => stores.has(n),
      delete: async (n: string) => stores.delete(n),
    },
    fetch: fetchImpl,
    crypto: webcrypto,
    Response,
    Headers,
    Request,
    URL,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Date,
    Uint8Array,
    Array,
    Object,
    Set,
    Map,
    String,
    TypeError,
    Error,
    indexedDB: undefined,
  });
  vm.runInContext(opts.worker ?? built(APP), ctx);
  /** Fire an event; resolve with what it waited on and what it answered. */
  const fire = async (type: string, extra: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    let answer: Promise<Response> | undefined;
    for (const h of handlers[type] ?? [])
      h({
        ...extra,
        waitUntil: (p: Promise<unknown>) => waits.push(p),
        respondWith: (p: Promise<Response>) => {
          answer = Promise.resolve(p);
        },
      });
    await Promise.allSettled(waits);
    return { answered: answer !== undefined, response: answer ? await answer : undefined };
  };
  return { fire, stores, fetched, messages, handlers };
};

/** A release as a deploy publishes it: the files, release.json and the manifest of their hashes. */
const release = (files: Served, commit: string, lie?: string): Served => {
  const hashes: Record<string, string> = {};
  for (const [p, f] of Object.entries(files)) hashes[p] = sha(f.body);
  if (lie) hashes[lie] = '00'.repeat(32);
  return {
    ...files,
    '/release.json': { body: JSON.stringify({ format: 'veilcore-release/v1', network: 'mainnet', commit, date: 'x' }) },
    [`/releases/mainnet/${commit}.json`]: {
      body: JSON.stringify({
        format: 'veilcore-release-manifest/v1',
        network: 'mainnet',
        commit,
        date: 'x',
        files: hashes,
      }),
    },
  };
};
const APP: Served = {
  '/index.html': { body: '<html>app</html>', headers: { 'content-security-policy': "default-src 'self'" } },
  '/assets/index-abc.js': { body: 'console.log(1)' },
  '/assets/big.wasm': { body: 'wasm bytes not in the shell' },
  '/offline-shell.json': {
    body: JSON.stringify({ format: 'veilcore-offline-shell/v1', files: ['/assets/index-abc.js'] }),
  },
};
const COMMIT_A = 'a'.repeat(40);
const COMMIT_B = 'b'.repeat(40);
const req = (p: string, init: { mode?: string; cache?: string; origin?: string } = {}) => ({
  method: 'GET',
  url: `${init.origin ?? ORIGIN}${p}`,
  mode: init.mode ?? 'cors',
  cache: init.cache ?? 'default',
});

describe('the offline worker', () => {
  it('copies only the listed shell, checked file by file, under the release’s commit', async () => {
    const s = scope(release(APP, COMMIT_A));
    await s.fire('install');
    const copy = s.stores.get(`veilcore-shell-${COMMIT_A}`);
    expect([...(copy?.keys() ?? [])].sort()).toEqual(['/assets/index-abc.js', '/index.html']);
    // Kept with the headers it was sent with: a page from the copy runs under the same policy.
    expect(copy?.get('/index.html')?.headers.get('content-security-policy')).toBe("default-src 'self'");
  });

  it('copies nothing when a file isn’t the listed one, or the site has no release list', async () => {
    const bad = scope(release(APP, COMMIT_A, '/assets/index-abc.js'));
    await bad.fire('install');
    expect([...bad.stores.keys()].filter((k) => k.startsWith('veilcore-shell-'))).toEqual([]);
    const none = scope(APP);
    await none.fire('install');
    expect([...none.stores.keys()].filter((k) => k.startsWith('veilcore-shell-'))).toEqual([]);
    // A list naming a file the release list doesn't: refused whole.
    const extra = scope(
      release(
        {
          ...APP,
          '/offline-shell.json': { body: JSON.stringify({ format: 'veilcore-offline-shell/v1', files: ['/evil.js'] }) },
        },
        COMMIT_A,
      ),
    );
    await extra.fire('install');
    expect([...extra.stores.keys()].filter((k) => k.startsWith('veilcore-shell-'))).toEqual([]);
  });

  it('never answers another site, a check that asks not to be cached, the release list or itself', async () => {
    const s = scope(release(APP, COMMIT_A));
    await s.fire('install');
    for (const r of [
      req('/api/records', { origin: 'https://registry.example' }),
      req('/assets/index-abc.js', { cache: 'no-store' }),
      req('/index.html', { cache: 'reload' }),
      req('/release.json'),
      req(`/releases/mainnet/${COMMIT_A}.json`),
      req('/sw.js'),
      { ...req('/api/x'), method: 'PUT' },
    ])
      expect((await s.fire('fetch', { request: r })).answered, r.url).toBe(false);
  });

  it('pages from the network first; the copy only with no network, remembered for “a newer version is ready”', async () => {
    let offline = false;
    const files = release(APP, COMMIT_A);
    const s = scope(files, { offline: () => offline });
    await s.fire('install');
    const online = await s.fire('fetch', {
      request: req('/records', { mode: 'navigate' }),
      resultingClientId: 'page-1',
    });
    expect(await online.response?.text()).toBe('<html>app</html>');
    offline = true;
    const fromCopy = await s.fire('fetch', {
      request: req('/records', { mode: 'navigate' }),
      resultingClientId: 'page-1',
    });
    expect(await fromCopy.response?.text()).toBe('<html>app</html>');
    // A built file comes from the copy.
    const js = await s.fire('fetch', { request: req('/assets/index-abc.js') });
    expect(await js.response?.text()).toBe('console.log(1)');
    // A new release: copied, the old copy deleted, and the page from A's copy told it is older.
    offline = false;
    const b = release({ ...APP, '/index.html': { body: '<html>B</html>' } }, COMMIT_B);
    for (const k of Object.keys(files)) delete files[k];
    Object.assign(files, b);
    await s.fire('message', { data: { type: 'veilcore-check' }, origin: ORIGIN });
    expect([...s.stores.keys()].filter((k) => k.startsWith('veilcore-shell-'))).toEqual([`veilcore-shell-${COMMIT_B}`]);
    expect(s.messages).toContainEqual({ type: 'veilcore-release', commit: COMMIT_B, stale: true });
    // Unchanged files are reused from the old copy, not fetched again.
    expect(s.fetched.filter((p) => p === '/assets/index-abc.js').length).toBe(1);
  });

  it('a built file fetched from the network is kept only when it is this site’s own answer (basic) with the listed bytes', async () => {
    const files = release(APP, COMMIT_A);
    const s = scope(files);
    await s.fire('install');
    await s.fire('fetch', { request: req('/assets/big.wasm') });
    // The stand-in's answers aren't "basic" (same-origin, as a browser marks them): not kept.
    expect(s.stores.get(`veilcore-shell-${COMMIT_A}`)?.has('/assets/big.wasm')).toBe(false);
    expect(SW).toMatch(/res\.type === 'basic'/);
  });

  it('is one file: no importScripts, nothing from another site', () => {
    expect(SW).not.toMatch(/importScripts\s*\(/);
    expect(SW.match(/['"`]https?:\/\//g)).toBeNull();
    expect(SW).toContain("'__VEILCORE_API_BASE__'");
    expect(SW).toContain("'__VEILCORE_SHELL_FILES__'");
    expect(SW).toContain("'__VEILCORE_PAGE_HEADERS__'");
  });
});

describe('the offline worker, after the review of PR #145', () => {
  it('serves a file from the copy only when it hashes to the value the worker was built with (SW-1)', async () => {
    let offline = false;
    const s = scope(release(APP, COMMIT_A), { offline: () => offline });
    await s.fire('install');
    const copy = s.stores.get(`veilcore-shell-${COMMIT_A}`)!;
    const meta = s.stores.get('veilcore-offline-meta')!;
    // Code injected into one visit writes Cache Storage directly: a file, and the copy's own
    // record, naming the planted file's hash (the record is never what a file is checked against).
    copy.set('/assets/index-abc.js', new Response('stealKeys()'));
    meta.set(
      '/__veilcore-offline/active',
      new Response(
        JSON.stringify({ commit: COMMIT_A, network: 'mainnet', files: { '/assets/index-abc.js': sha('stealKeys()') } }),
      ),
    );
    const js = await s.fire('fetch', { request: req('/assets/index-abc.js') });
    expect(await js.response?.text()).toBe('console.log(1)'); // the network's, the listed bytes
    copy.set('/index.html', new Response('<html>planted</html>'));
    offline = true;
    const page = await s.fire('fetch', { request: req('/records', { mode: 'navigate' }) }).catch(() => undefined);
    expect(page?.response).toBeUndefined();
  });

  it('serves the kept page with the headers built into the worker, never the kept ones (SW-1)', async () => {
    let offline = false;
    const s = scope(release(APP, COMMIT_A), { offline: () => offline });
    await s.fire('install');
    const copy = s.stores.get(`veilcore-shell-${COMMIT_A}`)!;
    // The right bytes, kept with a policy that lets anything run.
    copy.set(
      '/index.html',
      new Response('<html>app</html>', {
        headers: { 'content-security-policy': 'script-src *', refresh: '0; url=https://x.example' },
      }),
    );
    copy.set('/assets/index-abc.js', new Response('console.log(1)', { headers: { 'content-type': 'text/html' } }));
    offline = true;
    const page = (await s.fire('fetch', { request: req('/records', { mode: 'navigate' }) })).response!;
    expect(await page.text()).toBe('<html>app</html>');
    expect(page.headers.get('content-security-policy')).toBe("default-src 'self'");
    expect(page.headers.get('refresh')).toBeNull();
    const js = (await s.fire('fetch', { request: req('/assets/index-abc.js') })).response!;
    expect(js.headers.get('content-type')).toBe('text/javascript');
    // A worker whose page headers were never filled in (no release made it) never serves the page.
    const bare = scope(release(APP, COMMIT_A), { offline: () => offline, worker: built(APP, null) });
    offline = false;
    await bare.fire('install');
    offline = true;
    const none = await bare.fire('fetch', { request: req('/records', { mode: 'navigate' }) }).catch(() => undefined);
    expect(none?.response).toBeUndefined();
  });

  it('a newer release it can’t copy (even an unreadable list) marks the copy old: served only on network failure (SW-2)', async () => {
    let offline = false;
    const files = release(APP, COMMIT_A);
    const s = scope(files, { offline: () => offline });
    await s.fire('install');
    // Release B is named, but its list can't be read.
    files['/release.json'] = {
      body: JSON.stringify({ format: 'veilcore-release/v1', network: 'mainnet', commit: COMMIT_B, date: 'x' }),
    };
    await s.fire('message', { data: { type: 'veilcore-check' }, origin: ORIGIN });
    const meta = (await (s.stores.get('veilcore-offline-meta')!.get('/__veilcore-offline/active') as Response)
      .clone()
      .json()) as { supersededSince?: unknown };
    expect(typeof meta.supersededSince).toBe('number');
    expect(SW).toMatch(/SUPERSEDED_MAX_MS = 48 \* 3_600_000/);
    // With no network at all, the old copy still opens (within 48 hours).
    offline = true;
    const page = await s.fire('fetch', { request: req('/records', { mode: 'navigate' }) });
    expect(await page.response?.text()).toBe('<html>app</html>');
  });

  it('never sends the holder key while a check or prove page is open (SW-3)', async () => {
    let url = `${ORIGIN}/verify/VEIL-1`;
    const s = scope(release(APP, COMMIT_A), { pageUrl: () => url });
    const sync = s.handlers.sync[0];
    const run = async () => {
      let waited: Promise<unknown> = Promise.resolve();
      sync({ tag: 'veilcore-send', waitUntil: (p: Promise<unknown>) => (waited = p) });
      return waited;
    };
    await expect(run()).rejects.toThrow(/check or prove page is open/);
    url = `${ORIGIN}/prove/PR-1`;
    await expect(run()).rejects.toThrow(/check or prove page is open/);
    expect(s.fetched.filter((p) => p.includes('/api/records/dating'))).toEqual([]);
    // Checked again right before the request, so a page opened while the queue was read still
    // stops it (re-check of the PR #145 fixes).
    expect(SW).toMatch(/await pausedCheck\(\);\s*const res = await fetch\(`\$\{API_BASE\}\/api\/records\/dating`/);
  });
});

describe('the kill switch (VITE_OFFLINE=off)', () => {
  it('answers no request, deletes every copy, and unregisters itself', async () => {
    expect(KILL).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
    const handlers: Record<string, (e: unknown) => void> = {};
    const deleted: string[] = [];
    let unregistered = false;
    const ctx = vm.createContext({
      self: {
        addEventListener: (t: string, h: (e: unknown) => void) => (handlers[t] = h),
        skipWaiting: () => undefined,
        registration: { unregister: async () => (unregistered = true) },
        clients: { matchAll: async () => [] },
      },
      caches: {
        keys: async () => ['veilcore-shell-x', 'veilcore-offline-meta', 'other'],
        delete: async (k: string) => deleted.push(k),
      },
      indexedDB: { deleteDatabase: () => undefined },
    });
    vm.runInContext(KILL, ctx);
    const waits: Promise<unknown>[] = [];
    handlers.activate({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    expect(deleted).toEqual(['veilcore-shell-x', 'veilcore-offline-meta']);
    expect(unregistered).toBe(true);
  });
});

describe('checking the site covers the worker (release-check.mjs)', () => {
  const manifest = (files: Record<string, string>, settings: Record<string, string> = {}) =>
    ({
      format: 'veilcore-release-manifest/v1',
      network: 'mainnet',
      commit: COMMIT_A,
      date: 'x',
      files,
      build: { mode: 'mainnet', settings, node: 'v', npm: 'v' },
    }) as never;
  const fake = (sw: string, headers: Record<string, string>, shell = '{"files":["/a.js"]}') =>
    (async (u: string) =>
      new Response(u.endsWith('/sw.js') ? sw : shell, {
        status: 200,
        headers: u.endsWith('/sw.js') ? headers : {},
      })) as typeof fetch;
  const H = { 'content-type': 'text/javascript', 'cache-control': SW_CACHE_CONTROL };
  /** The worker as a release writes it: hashes for the page and /a.js, the page's headers. */
  const fill = (hashes: Record<string, string>, page: Record<string, string> | null) =>
    SW.replace("'__VEILCORE_SHELL_FILES__'", JSON.stringify(hashes)).replace(
      "'__VEILCORE_PAGE_HEADERS__'",
      page ? JSON.stringify(page) : "'__VEILCORE_PAGE_HEADERS__'",
    );
  const WSW = fill({ '/index.html': 'x', '/a.js': 'z' }, { 'content-security-policy': "default-src 'self'" });

  it('passes the built worker served no-cache, keeping only listed files', async () => {
    const r = await checkServiceWorker(
      ORIGIN,
      manifest({ '/sw.js': sha(WSW), '/offline-shell.json': 'y', '/a.js': 'z', '/index.html': 'x' }),
      {
        fetchImpl: fake(WSW, H),
      },
    );
    expect(r).toEqual({ ok: true, wrong: [] });
  });
  it('fails a worker cached by the browser, one that keeps unlisted files, or a kill-switch build that answers requests', async () => {
    const files = { '/sw.js': sha(WSW), '/offline-shell.json': 'y', '/a.js': 'z', '/index.html': 'x' };
    // Another worker to a worker's request than the one listed: caught.
    expect((await checkServiceWorker(ORIGIN, manifest(files), { fetchImpl: fake(KILL, H) })).wrong[0].problem).toMatch(
      /not the listed file/,
    );
    expect(
      (
        await checkServiceWorker(ORIGIN, manifest(files), {
          fetchImpl: fake(WSW, { ...H, 'cache-control': 'max-age=3600' }),
        })
      ).ok,
    ).toBe(false);
    expect(
      (await checkServiceWorker(ORIGIN, manifest(files), { fetchImpl: fake(WSW, H, '{"files":["/b.js"]}') })).wrong[0]
        .path,
    ).toBe('/b.js');
    expect(
      (await checkServiceWorker(ORIGIN, manifest(files, { VITE_OFFLINE: 'off' }), { fetchImpl: fake(WSW, H) })).ok,
    ).toBe(false);
    expect(
      (
        await checkServiceWorker(ORIGIN, manifest({ ...files, '/sw.js': sha(KILL) }, { VITE_OFFLINE: 'off' }), {
          fetchImpl: fake(KILL, H),
        })
      ).ok,
    ).toBe(true);
  });
  it('requires the listed Content-Security-Policy on the worker too (R-1)', async () => {
    const files = { '/sw.js': sha(WSW), '/offline-shell.json': 'y', '/a.js': 'z', '/index.html': 'x' };
    const listed = {
      ...(manifest(files) as object),
      headers: { 'content-security-policy': "default-src 'self'" },
    } as never;
    const without = await checkServiceWorker(ORIGIN, listed, { fetchImpl: fake(WSW, H) });
    expect(without.wrong.map((w) => w.problem)).toContain('not served with the listed Content-Security-Policy');
    const withCsp = await checkServiceWorker(ORIGIN, listed, {
      fetchImpl: fake(WSW, { ...H, 'content-security-policy': "default-src 'self'" }),
    });
    expect(withCsp.ok).toBe(true);
  });
  it('holds what the worker checks kept files against, and the page headers it keeps, to the release list (SW-1)', async () => {
    const check = async (sw: string) =>
      (
        await checkServiceWorker(
          ORIGIN,
          {
            ...(manifest({
              '/sw.js': sha(sw),
              '/offline-shell.json': 'y',
              '/a.js': 'z',
              '/index.html': 'x',
            }) as object),
            headers: { 'content-security-policy': "default-src 'self'" },
          } as never,
          { fetchImpl: fake(sw, { ...H, 'content-security-policy': "default-src 'self'" }) },
        )
      ).wrong.map((w) => w.problem);
    expect(await check(WSW)).toEqual([]);
    expect(
      await check(fill({ '/index.html': 'x', '/a.js': 'evil' }, { 'content-security-policy': "default-src 'self'" })),
    ).toContain('the worker holds it to another SHA-256 than the release list');
    expect(await check(fill({ '/index.html': 'x' }, { 'content-security-policy': "default-src 'self'" }))).toContain(
      'kept for offline use but the worker has no SHA-256 for it',
    );
    expect(
      await check(fill({ '/index.html': 'x', '/a.js': 'z' }, { 'content-security-policy': 'script-src *' })),
    ).toContain('serves its kept page with another Content-Security-Policy than the listed one');
    expect(await check(fill({ '/index.html': 'x', '/a.js': 'z' }, null))).toContain(
      'has no headers for the page it keeps',
    );
    expect(await check(SW)).toContain('has no SHA-256 for the files it keeps');
    // A release list with no headers: a worker without them never serves the kept page, so it passes.
    const noHeaders = fill({ '/index.html': 'x', '/a.js': 'z' }, null);
    const listed = await checkServiceWorker(
      ORIGIN,
      manifest({ '/sw.js': sha(noHeaders), '/offline-shell.json': 'y', '/a.js': 'z', '/index.html': 'x' }),
      { fetchImpl: fake(noHeaders, H) },
    );
    expect(listed.wrong).toEqual([]);
  });
  it('says a release from before the worker wasn’t checked, and a whole check fails on a bad worker', async () => {
    expect((await checkServiceWorker(ORIGIN, manifest({ '/a.js': 'z' }))).skipped).toMatch(/no offline worker/);
    const ok = { total: 1, matched: ['/'], differ: [], missing: [] };
    const routes = { total: 1, matched: ['/'], differ: [], missing: [], headerDiffers: [], headersListed: true };
    expect(
      releaseMatches({ files: ok, routes, worker: { ok: false, wrong: [{ path: '/sw.js', problem: 'x' }] } }),
    ).toBe(false);
  });
});

describe('the deploy’s headers (vercel-config.mjs)', () => {
  it('serve /sw.js no-cache, and let the page register exactly that worker under Trusted Types', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-cfg-'));
    fs.mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
    const r = spawnSync(process.execPath, [path.resolve(HERE, '../../../scripts/vercel-config.mjs')], {
      cwd: dir,
      env: { PATH: process.env.PATH, VITE_API_BASE: 'https://registry.example' },
      encoding: 'utf8',
    });
    expect(r.status, r.stderr).toBe(0);
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')) as {
      routes: { src?: string; headers?: Record<string, string> }[];
    };
    expect(cfg.routes.find((x) => x.src === '^/sw\\.js$')?.headers).toEqual({ 'Cache-Control': SW_CACHE_CONTROL });
    expect(cfg.routes[0].headers?.['Content-Security-Policy']).toMatch(/trusted-types [^;]*\bveilcore-sw\b/);
  });
  it('the page’s Trusted Types policy lets through /sw.js on this site and nothing else', () => {
    let rule: ((u: string) => string) | undefined;
    const tt = {
      createPolicy: (_n: string, r: { createScriptURL: (u: string) => string }) => (
        (rule = r.createScriptURL),
        { createScriptURL: (u: string) => r.createScriptURL(u) }
      ),
    };
    expect(workerScriptUrl(`${ORIGIN}/records`, tt)).toBe(`${ORIGIN}/sw.js`);
    expect(() => rule?.('https://evil.example/sw.js')).toThrow();
    expect(() => rule?.(`${ORIGIN}/other.js`)).toThrow();
  });
});

describe('a record sealed with no signal, and its own timestamp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says when by the device’s clock, not checked, and that it is dated when sent: never a date', () => {
    const at = new Date(2026, 10, 19, 5, 2).getTime();
    const phone = sealedHereWords(at, enT, 'phone');
    expect(phone).toMatch(
      /^Sealed on this phone at .*0?5:02.* \(your phone’s clock, not checked\)\. Dated when it’s sent\.$/,
    );
    expect(sealedHereWords(at, enT, 'computer')).toMatch(/this computer .* \(your computer’s clock, not checked\)/);
  });

  it('timestamp lines lead with the minute, and say the Midnight date follows until the batch has one', () => {
    const state = {
      status: 'stamped',
      stillAsking: false,
      disagree: false,
      tokens: [
        { tsa: 'FreeTSA', at: '2026-11-19T14:03:12Z' },
        { tsa: 'DigiCert', at: '2026-11-19T14:03:14Z' },
      ],
    } as const;
    expect(instantLines(state, false, enT)).toEqual([
      'Timestamped 2026-11-19 14:03 UTC by FreeTSA — the date on Midnight, the blockchain, follows in the next batch.',
      'Also timestamped 2026-11-19 14:03 UTC by DigiCert.',
    ]);
    expect(instantLines(state, true, enT)[0]).toBe('Also timestamped 2026-11-19 14:03 UTC by FreeTSA.');
    expect(instantLines({ status: 'none' }, false, enT)).toEqual([]);
    // Authorities more than five minutes apart: none leads (TSA-5).
    expect(instantLines({ ...state, disagree: true }, false, enT)).toEqual([enT.t('app.instant.disagree')]);
  });

  it('each timestamp is its own fact: signed and checked here with the link’s proof code, the registry’s word without', () => {
    const base = {
      proof: 'none' as const,
      anchorConfirmed: false,
      testNetwork: false,
      signers: [],
      instant: [
        { tsa: 'FreeTSA', at: '2026-11-19T14:03:12Z' },
        { tsa: 'DigiCert', at: '2026-11-19T14:03:13Z' },
      ],
    };
    const bound = whoVouches({ ...base, bound: true }).filter((r) => r.fact.startsWith('A timestamp'));
    expect(bound.map((r) => [r.fact, r.basis])).toEqual([
      ['A timestamp (FreeTSA)', 'signed'],
      ['A timestamp (DigiCert)', 'signed'],
    ]);
    expect(bound[0].who).toBe(
      '2026-11-19 14:03:12 UTC. This page checked its signature, made with the key this site lists for that authority.',
    );
    expect(
      whoVouches({ ...base, bound: false })
        .filter((r) => r.fact.startsWith('A timestamp'))
        .every((r) => r.basis === 'registry'),
    ).toBe(true);
    expect(whoVouches({ ...base, bound: true, instantDisagree: true })[1].who).toMatch(
      /disagree by more than five minutes/,
    );
  });

  it('shows a token only when a pinned certificate signed it, over this proof code, named from the pin (TSA-1)', async () => {
    const fp = 'ab'.repeat(32);
    const answer = (status: number, body: unknown) =>
      (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
    const stampedBy = (token: string, extra: Record<string, unknown> = {}) =>
      answer(200, {
        status: 'stamped',
        tokens: [{ kind: 'rfc3161', token, tsa: 'https://timestamp.digicert.com/', ...extra }],
      });
    expect(await instantStampFor(fp, answer(404, { error: 'Not Found' }))).toEqual({ status: 'none' });
    expect(await instantStampFor(fp, answer(202, { status: 'queued' }))).toEqual({ status: 'asking' });
    expect(await instantStampFor(fp, stampedBy('AAAA'))).toEqual({ status: 'none' });
    expect(await instantStampFor('not-hex', answer(200, {}))).toEqual({ status: 'none' });
    let tsa: UnitTsa;
    let forger: UnitTsa;
    try {
      tsa = unitTsa('Unit TSA');
      // A registry's own key, made to look like an authority: same name, same time-stamping use.
      forger = unitTsa('timestamp.digicert.com');
    } catch {
      return; // no openssl here: the browser test (e2e/offline.spec.ts) checks a real token
    }
    const pins = [{ name: 'Unit Authority', certSha256: tsa.certSha256 }];
    const good = tsa.token(fp);
    const stamped = await instantStampFor(
      fp,
      stampedBy(good, { genTime: '1999-01-01T00:00:00Z', qualified: { scheme: 'eIDAS' } }),
      pins,
    );
    expect(stamped.status).toBe('stamped');
    if (stamped.status === 'stamped') {
      expect(stamped.tokens).toHaveLength(1);
      expect(stamped.tokens[0].tsa).toBe('Unit Authority'); // the pin's name, not the certificate's or the registry's
      expect(stamped.tokens[0].at).not.toBe('1999-01-01T00:00:00Z'); // the token's time, not the registry's
      expect(Object.keys(stamped.tokens[0]).sort()).toEqual(['at', 'tsa']); // no "qualified" (TSA-6)
      expect(stamped.disagree).toBe(false);
    }
    // Signed by a key nobody pinned, however it is named: not shown.
    expect(await instantStampFor(fp, stampedBy(forger.token(fp)), pins)).toEqual({ status: 'none' });
    // Carrying the pinned certificate beside the forger's own signature: still not.
    expect(await instantStampFor(fp, stampedBy(forger.tokenWithExtraCert(fp, tsa.certPem)), pins)).toEqual({
      status: 'none',
    });
    // The re-check's attack: a certificate of the forger's own whose second extensions block
    // carries the pinned certificate's key identifier, beside the pinned certificate, and the
    // signer named by that identifier. A parser that keeps the last identifier checks the
    // signature with the forger's key; one that keeps the first finds the pinned certificate.
    expect(await instantStampFor(fp, stampedBy(twoBlockForgery(forger.token(fp), tsa.certPem)), pins)).toEqual({
      status: 'none',
    });
    // A pinned token on another proof code: not.
    expect(await instantStampFor('cd'.repeat(32), stampedBy(good), pins)).toEqual({ status: 'none' });
    // No pins at all: nothing.
    expect(await instantStampFor(fp, stampedBy(good), [])).toEqual({ status: 'none' });
    // The same certificate twice: one token (TSA-5).
    const twice = await instantStampFor(
      fp,
      answer(200, {
        status: 'stamped',
        tokens: [
          { kind: 'rfc3161', token: good, tsa: 'a' },
          { kind: 'rfc3161', token: tsa.token(fp), tsa: 'b' },
        ],
      }),
      pins,
    );
    expect(twice.status === 'stamped' && twice.tokens.length).toBe(1);
  });

  it('the pins the site ships are well formed, and each names its checked certificate in docs/tsa-pins', () => {
    const file = JSON.parse(fs.readFileSync(path.resolve(HERE, '../config/tsa-pins.json'), 'utf8')) as {
      format: string;
      pins: { name: string; certSha256: string; file: string; notBefore: string; validUntil: string }[];
    };
    expect(file.format).toBe('veilcore-tsa-pins/v1');
    expect(TSA_PINS.length).toBe(file.pins.length);
    for (const p of file.pins) {
      const pem = fs.readFileSync(path.resolve(HERE, '../../..', p.file), 'utf8');
      const der = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ''), 'base64');
      expect(sha(der as unknown as string), p.file).toBe(p.certSha256);
      // Its window is the certificate's own life.
      const x = new X509Certificate(der);
      expect(Date.parse(p.notBefore), p.file).toBe(Date.parse(x.validFrom));
      expect(Date.parse(p.validUntil), p.file).toBe(Date.parse(x.validTo));
    }
  });

  it('a pinned token counts only within its certificate’s life', () => {
    const pin = {
      name: 'A',
      certSha256: 'ab'.repeat(32),
      notBefore: '2026-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
    };
    expect(withinPin(pin, '2026-11-20T12:00:00Z')).toBe(true);
    expect(withinPin(pin, '2025-12-31T23:59:59Z')).toBe(false);
    expect(withinPin(pin, '2030-01-01T00:00:01Z')).toBe(false);
    expect(withinPin({ ...pin, validUntil: 'not a date' }, '2026-11-20T12:00:00Z')).toBe(false);
    expect(withinPin({ name: 'B', certSha256: pin.certSha256 }, '2026-11-20T12:00:00Z')).toBe(true);
    expect(withinPin(pin, 'not a date')).toBe(false);
  });
});

// ---- DER surgery for the two-extension-block attack ----------------------------------------
type Node = { tag: number; s: number; e: number; w: Buffer };
const tlvAt = (b: Buffer, at: number): Node => {
  let len = b[at + 1];
  let h = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[at + 2 + i];
    h = 2 + n;
  }
  return { tag: b[at], s: at + h, e: at + h + len, w: b.subarray(at, at + h + len) };
};
const kidsOf = (b: Buffer, n: Node): Node[] => {
  const o: Node[] = [];
  for (let a = n.s; a < n.e; ) {
    const k = tlvAt(b, a);
    o.push(k);
    a = k.e;
  }
  return o;
};
const enc = (tag: number, ...parts: Buffer[]): Buffer => {
  const body = Buffer.concat(parts);
  const n = body.length;
  const l =
    n < 0x80
      ? [n]
      : n < 0x100
        ? [0x81, n]
        : n < 0x10000
          ? [0x82, n >> 8, n & 255]
          : [0x83, n >> 16, (n >> 8) & 255, n & 255];
  return Buffer.concat([Buffer.from([tag, ...l]), body]);
};
const skiOf = (certDer: Buffer): Buffer => {
  const tbs = kidsOf(certDer, kidsOf(certDer, tlvAt(certDer, 0))[0]);
  const [list] = kidsOf(certDer, tbs.find((x) => x.tag === 0xa3)!);
  for (const e of kidsOf(certDer, list)) {
    const parts = kidsOf(certDer, e);
    if (parts[0].w.equals(Buffer.from('0603551d0e', 'hex'))) {
      const inner = tlvAt(certDer, parts[parts.length - 1].s);
      return certDer.subarray(inner.s, inner.e);
    }
  }
  throw new Error('no subject key identifier');
};
/** The forger's token, re-made as described above (its signature over the signed attributes is untouched). */
const twoBlockForgery = (tokenB64: string, pinnedPem: string): string => {
  const pinned = Buffer.from(pinnedPem.replace(/-----[^-]+-----|\s/g, ''), 'base64');
  const pinnedSki = skiOf(pinned);
  let b = Buffer.from(tokenB64, 'base64');
  // A full TimeStampResp: the token is its second field.
  const top = kidsOf(b, tlvAt(b, 0));
  if (top[0].tag === 0x30 && top[1]?.tag === 0x30) b = Buffer.from(top[1].w);
  const [ct, ex] = kidsOf(b, tlvAt(b, 0));
  const sd = kidsOf(b, kidsOf(b, ex)[0]);
  const ci = sd.findIndex((k) => k.tag === 0xa0);
  const forgerCert = kidsOf(b, sd[ci]).find((c) => !c.w.equals(pinned))!;
  const cc = kidsOf(b, forgerCert);
  const tbs = kidsOf(b, cc[0]);
  const second = enc(
    0xa3,
    enc(0x30, enc(0x30, Buffer.from('0603551d0e', 'hex'), enc(0x04, enc(0x04, Buffer.from(pinnedSki))))),
  );
  const certA = enc(
    0x30,
    enc(0x30, ...tbs.map((x) => Buffer.from(x.w)), second),
    Buffer.from(cc[1].w),
    Buffer.from(cc[2].w),
  );
  const [si] = kidsOf(b, sd[sd.length - 1]);
  const siParts = kidsOf(b, si);
  const nsi = enc(
    0x30,
    ...siParts.map((x, i) =>
      i === 0 ? enc(0x02, Buffer.from([3])) : i === 1 ? enc(0x80, Buffer.from(pinnedSki)) : Buffer.from(x.w),
    ),
  );
  const nsd = sd.map((x, i) =>
    i === ci ? enc(0xa0, certA, pinned) : i === sd.length - 1 ? enc(0x31, nsi) : Buffer.from(x.w),
  );
  return enc(0x30, Buffer.from(ct.w), enc(0xa0, enc(0x30, ...nsd))).toString('base64');
};

type UnitTsa = {
  certSha256: string;
  certPem: string;
  token: (fp: string) => string;
  tokenWithExtraCert: (fp: string, extraPem: string) => string;
};
const unitTsa = (cn: string): UnitTsa => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unit-tsa-'));
  const ssl = (...a: string[]) => execFileSync('openssl', a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  fs.writeFileSync(
    path.join(dir, 'ext.cnf'),
    'extendedKeyUsage = critical,timeStamping\nbasicConstraints = CA:FALSE\n',
  );
  ssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'tsa.key',
    '-out',
    'tsa.pem',
    '-days',
    '2',
    '-subj',
    `/CN=${cn}`,
    '-addext',
    'extendedKeyUsage=critical,timeStamping',
  );
  fs.writeFileSync(
    path.join(dir, 'tsa.cnf'),
    `[ tsa ]\ndefault_tsa = t\n[ t ]\ndir = ${dir}\nserial = ${dir}/serial\nsigner_cert = ${dir}/tsa.pem\nsigner_key = ${dir}/tsa.key\nsigner_digest = sha256\ndefault_policy = 1.2.3.4.1\ndigests = sha256\ness_cert_id_alg = sha256\naccuracy = secs:1\nordering = no\ntsa_name = no\ness_cert_id_chain = no\ncerts = ${dir}/tsa.pem\n`,
  );
  fs.writeFileSync(path.join(dir, 'serial'), '01\n');
  const certPem = fs.readFileSync(path.join(dir, 'tsa.pem'), 'utf8');
  const der = execFileSync('openssl', ['x509', '-in', path.join(dir, 'tsa.pem'), '-outform', 'DER']);
  const reply = (fp: string, certs: string) => {
    fs.writeFileSync(path.join(dir, 'pc.bin'), Buffer.from(fp, 'hex'));
    fs.writeFileSync(path.join(dir, 'chain.pem'), certs);
    ssl('ts', '-query', '-data', 'pc.bin', '-sha256', '-cert', '-out', 'q.tsq');
    ssl('ts', '-reply', '-config', 'tsa.cnf', '-queryfile', 'q.tsq', '-chain', 'chain.pem', '-out', 'r.tsr');
    return fs.readFileSync(path.join(dir, 'r.tsr')).toString('base64');
  };
  return {
    certSha256: createHash('sha256').update(der).digest('hex'),
    certPem,
    token: (fp) => reply(fp, certPem),
    tokenWithExtraCert: (fp, extra) => reply(fp, `${extra}${certPem}`),
  };
};
