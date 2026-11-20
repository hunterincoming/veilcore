// Works with no signal, dated in seconds (docs/offline.md): the offline worker run in a stand-in
// service-worker scope, its kill switch, the site check that covers it, the deploy headers, and the
// words and facts the pages show for a record's own timestamp. The same in a real browser:
// e2e/offline.spec.ts.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- stand-ins for the browser's promise-returning APIs */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
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
import { instantStampFor } from '../veilcore/instant-stamp';
import { enT } from '../i18n/translate';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SW = fs.readFileSync(path.resolve(HERE, '../../offline/sw.js'), 'utf8');
const KILL = fs.readFileSync(path.resolve(HERE, '../../offline/sw-kill.js'), 'utf8');
const ORIGIN = 'https://veilcore.example';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// ---- a stand-in service-worker scope -----------------------------------------------------------

type Served = Record<string, { body: string; headers?: Record<string, string> }>;
const scope = (served: Served, opts: { offline?: () => boolean } = {}) => {
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
      matchAll: async () => [{ id: 'page-1', postMessage: (m: unknown) => messages.push(m) }],
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
  vm.runInContext(SW.replace("'__VEILCORE_API_BASE__'", '"https://registry.example"'), ctx);
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

  it('passes the built worker served no-cache, keeping only listed files', async () => {
    const r = await checkServiceWorker(
      ORIGIN,
      manifest({ '/sw.js': sha(SW), '/offline-shell.json': 'y', '/a.js': 'z' }),
      {
        fetchImpl: fake(SW, H),
      },
    );
    expect(r).toEqual({ ok: true, wrong: [] });
  });
  it('fails a worker cached by the browser, one that keeps unlisted files, or a kill-switch build that answers requests', async () => {
    const files = { '/sw.js': sha(SW), '/offline-shell.json': 'y', '/a.js': 'z' };
    // Another worker to a worker's request than the one listed: caught.
    expect((await checkServiceWorker(ORIGIN, manifest(files), { fetchImpl: fake(KILL, H) })).wrong[0].problem).toMatch(
      /not the listed file/,
    );
    expect(
      (
        await checkServiceWorker(ORIGIN, manifest(files), {
          fetchImpl: fake(SW, { ...H, 'cache-control': 'max-age=3600' }),
        })
      ).ok,
    ).toBe(false);
    expect(
      (await checkServiceWorker(ORIGIN, manifest(files), { fetchImpl: fake(SW, H, '{"files":["/b.js"]}') })).wrong[0]
        .path,
    ).toBe('/b.js');
    expect(
      (await checkServiceWorker(ORIGIN, manifest(files, { VITE_OFFLINE: 'off' }), { fetchImpl: fake(SW, H) })).ok,
    ).toBe(false);
    expect(
      (
        await checkServiceWorker(ORIGIN, manifest({ ...files, '/sw.js': sha(KILL) }, { VITE_OFFLINE: 'off' }), {
          fetchImpl: fake(KILL, H),
        })
      ).ok,
    ).toBe(true);
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

  it('says when by the device’s clock, and that it is dated when sent: never a date', () => {
    const at = new Date(2026, 10, 19, 5, 2).getTime();
    const phone = sealedHereWords(at, enT, 'phone');
    expect(phone).toMatch(/^Sealed on this phone at .*0?5:02.* \(your phone’s clock\)\. Dated when it’s sent\.$/);
    expect(sealedHereWords(at, enT, 'computer')).toMatch(/this computer .* \(your computer’s clock\)/);
  });

  it('timestamp lines: the first says the Midnight date follows until the batch has one', () => {
    const state = {
      status: 'stamped',
      stillAsking: false,
      tokens: [
        { tsa: 'freetsa.org', at: '2026-11-19T14:03:12Z' },
        { tsa: 'timestamp.sectigo.com', at: '2026-11-19T14:03:14Z' },
      ],
    } as const;
    expect(instantLines(state, false, enT)).toEqual([
      'Timestamped 2026-11-19 14:03:12 UTC by freetsa.org (as its key names it) — the date on Midnight, the blockchain, follows in the next batch.',
      'Also timestamped 2026-11-19 14:03:14 UTC by timestamp.sectigo.com (as its key names it).',
    ]);
    expect(instantLines(state, true, enT)[0]).toBe(
      'Also timestamped 2026-11-19 14:03:12 UTC by freetsa.org (as its key names it).',
    );
    expect(instantLines({ status: 'none' }, false, enT)).toEqual([]);
  });

  it('each timestamp is its own fact: signed and checked here with the link’s proof code, the registry’s word without', () => {
    const base = {
      proof: 'none' as const,
      anchorConfirmed: false,
      testNetwork: false,
      signers: [],
      instant: [
        { tsa: 'freetsa.org', at: '2026-11-19T14:03:12Z' },
        { tsa: 'timestamp.digicert.com', at: '2026-11-19T14:03:13Z' },
      ],
    };
    const bound = whoVouches({ ...base, bound: true }).filter((r) => r.fact.startsWith('A timestamp'));
    expect(bound.map((r) => [r.fact, r.basis])).toEqual([
      ['A timestamp (freetsa.org)', 'signed'],
      ['A timestamp (timestamp.digicert.com)', 'signed'],
    ]);
    expect(bound[0].who).toBe(
      '2026-11-19 14:03:12 UTC. This page checked its signature. The name is the key’s own; who issued the key isn’t checked here.',
    );
    expect(
      whoVouches({ ...base, bound: false })
        .filter((r) => r.fact.startsWith('A timestamp'))
        .every((r) => r.basis === 'registry'),
    ).toBe(true);
  });

  it('shows a token only once it checks here against the proof code; an older registry shows nothing', async () => {
    const fp = 'ab'.repeat(32);
    const answer = (status: number, body: unknown) =>
      (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
    expect(await instantStampFor(fp, answer(404, { error: 'Not Found' }))).toEqual({ status: 'none' });
    expect(await instantStampFor(fp, answer(202, { status: 'queued' }))).toEqual({ status: 'asking' });
    expect(
      await instantStampFor(
        fp,
        answer(200, { status: 'stamped', tokens: [{ kind: 'rfc3161', token: 'AAAA', tsa: 'https://x/' }] }),
      ),
    ).toEqual({ status: 'none' });
    expect(await instantStampFor('not-hex', answer(200, {}))).toEqual({ status: 'none' });
    // A real token (a local openssl TSA), on this proof code: shown, with its own time. On another: not.
    let token: string;
    try {
      token = opensslToken(fp);
    } catch {
      return; // no openssl here: the browser test (e2e/offline.spec.ts) checks a real token
    }
    const stamped = await instantStampFor(
      fp,
      answer(200, {
        status: 'stamped',
        tokens: [{ kind: 'rfc3161', token, tsa: 'https://tsa.example/x', genTime: '1999-01-01T00:00:00Z' }],
      }),
    );
    expect(stamped.status).toBe('stamped');
    if (stamped.status === 'stamped') {
      expect(stamped.tokens[0].tsa).toBe('Unit TSA'); // the signing certificate's name, not the registry's label
      expect(stamped.tokens[0].at).not.toBe('1999-01-01T00:00:00Z'); // the token's time, not the registry's
    }
    expect(
      await instantStampFor(
        'cd'.repeat(32),
        answer(200, { status: 'stamped', tokens: [{ kind: 'rfc3161', token, tsa: 'https://tsa.example/' }] }),
      ),
    ).toEqual({ status: 'none' });
  });
});

const opensslToken = (fp: string): string => {
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
    'ca.key',
    '-out',
    'ca.pem',
    '-days',
    '2',
    '-subj',
    '/CN=Unit TSA Root',
  );
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'tsa.key', '-out', 'tsa.csr', '-subj', '/CN=Unit TSA');
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
  fs.writeFileSync(
    path.join(dir, 'tsa.cnf'),
    `[ tsa ]\ndefault_tsa = t\n[ t ]\ndir = ${dir}\nserial = ${dir}/serial\nsigner_cert = ${dir}/tsa.pem\nsigner_key = ${dir}/tsa.key\nsigner_digest = sha256\ndefault_policy = 1.2.3.4.1\ndigests = sha256\ness_cert_id_alg = sha256\naccuracy = secs:1\nordering = no\ntsa_name = no\ness_cert_id_chain = no\ncerts = ${dir}/tsa.pem\n`,
  );
  fs.writeFileSync(path.join(dir, 'serial'), '01\n');
  fs.writeFileSync(path.join(dir, 'pc.bin'), Buffer.from(fp, 'hex'));
  ssl('ts', '-query', '-data', 'pc.bin', '-sha256', '-cert', '-out', 'q.tsq');
  ssl('ts', '-reply', '-config', 'tsa.cnf', '-queryfile', 'q.tsq', '-out', 'r.tsr');
  return fs.readFileSync(path.join(dir, 'r.tsr')).toString('base64');
};
