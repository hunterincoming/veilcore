// Ask's on-device model, without a browser: the pins, the model libraries served from this site,
// each worker's own Content-Security-Policy, and where in Ask anything is fetched.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  MODEL_WORKER_FILE,
  downloadWorkerCsp,
  engineWorkerCsp,
  manifestProblem,
  modelWorkerRouteSrc,
  SITE_ROUTE_SRC,
} from '../../../scripts/ask-model-csp.mjs';
import real from './model-manifest.json';
import stub from './model-manifest.stub.json';
import { modelPinned, type ModelManifest } from './manifest';
import { sri } from './integrity';
import { checkModelHeaders } from '../../../scripts/check-model-headers.mjs';
import { libUrl, neededFiles } from './manifest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI = path.resolve(HERE, '../..');

describe('the pins', () => {
  it('the model libraries in public/ are the pinned files, byte for byte', () => {
    for (const m of (real as ModelManifest).models) {
      const file = path.join(UI, 'public', real.libs.servedFrom, m.lib.file);
      const body = fs.readFileSync(file);
      expect(body.length, m.lib.file).toBe(m.lib.bytes);
      expect(createHash('sha256').update(body).digest('hex'), m.lib.file).toBe(m.lib.sha256);
    }
    expect(real.webllm).toBe('0.2.86');
    expect(real.libs.folder).toBe('web-llm-models/v0_2_86/base');
    expect(real.libs.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('WebLLM is pinned exactly to the version the libraries were built for', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(UI, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@mlc-ai/web-llm']).toBe(real.webllm);
    const lock = JSON.parse(fs.readFileSync(path.join(UI, '../package-lock.json'), 'utf8')) as {
      packages: Record<string, { version: string; integrity: string }>;
    };
    expect(lock.packages['node_modules/@mlc-ai/web-llm']).toMatchObject({
      version: '0.2.86',
      integrity: 'sha512-plciXBCYtY7iTKHzEcsqOfSO+s5u8NqMYFPnHmRbsN8CEdKcolgXIoGLPbzO6FtJHV43m7YP00x6qQ6Kb8CJJw==',
    });
  });

  it('until scripts/pin-model.mjs has run, the real manifest says it is not pinned, and no model counts as pinned', () => {
    if (real.pinned) {
      expect(manifestProblem(real)).toBeUndefined();
      expect((real as ModelManifest).models.every(modelPinned)).toBe(true);
    } else {
      expect((real as ModelManifest).models.some(modelPinned)).toBe(false);
      expect(downloadWorkerCsp(real)).toContain("connect-src 'none'");
    }
  });

  it('the stub (e2e only) is whole, and its files are the ones in e2e/fixtures', () => {
    const m = (stub as ModelManifest).models[0];
    expect(modelPinned(m)).toBe(true);
    for (const f of m.files) {
      const body = fs.readFileSync(path.join(UI, 'e2e/fixtures/ask-model', f.path));
      expect(createHash('sha256').update(body).digest('hex'), f.path).toBe(f.sha256);
      expect(body.length).toBe(f.bytes);
    }
  });

  it('a pinned manifest is refused unless every model is at a commit and every redirect host is Hugging Face’s storage', () => {
    const one = { id: 'x', repo: 'mlc-ai/x', commit: 'a'.repeat(40) };
    expect(manifestProblem({ models: [one], redirectHosts: ['cas-bridge.xethub.hf.co'] })).toBeUndefined();
    expect(manifestProblem({ models: [{ ...one, commit: 'main' }] })).toMatch(/commit/);
    expect(manifestProblem({ models: [one], redirectHosts: ['evil.example'] })).toMatch(/not a Hugging Face/);
    expect(manifestProblem({ models: [{ ...one, repo: '../x' }] })).toMatch(/repo/);
  });

  it('SRI from a hex SHA-256 is what WebLLM checks', () => {
    expect(sri(createHash('sha256').update('abc').digest('hex'))).toBe(
      `sha256-${createHash('sha256').update('abc').digest('base64')}`,
    );
  });
});

describe('each model worker has its own policy', () => {
  it('download: only the pinned folders at their commit, the storage host and this site (the library); no eval', () => {
    const p = downloadWorkerCsp(stub);
    expect(p).toContain(
      "connect-src https://huggingface.co/veilcore-test/stub-model/resolve/0123456789abcdef0123456789abcdef01234567/ https://cas-bridge.xethub.hf.co 'self'",
    );
    expect(p).not.toMatch(/resolve\/main/);
    expect(p).toContain("default-src 'none'");
    expect(p).not.toMatch(/unsafe-eval|wasm-unsafe-eval/);
    expect(p).toContain("require-trusted-types-for 'script'");
  });

  it('engine: no network at all (it holds what is typed), WebAssembly, no eval', () => {
    const p = engineWorkerCsp();
    expect(p).toMatch(/connect-src 'none'$/);
    expect(p).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(p).not.toMatch(/huggingface|'unsafe-eval'/);
  });

  it('the route patterns match exactly the worker files Vite names', () => {
    const files = ['/assets/ask-model-download.worker-AbC_12-x.js', '/assets/ask-model-engine.worker-Zz9.js'];
    for (const f of files) {
      expect(MODEL_WORKER_FILE.test(f)).toBe(true);
      expect(new RegExp(SITE_ROUTE_SRC).test(f), f).toBe(false);
    }
    expect(new RegExp(modelWorkerRouteSrc('download')).test(files[0])).toBe(true);
    expect(new RegExp(modelWorkerRouteSrc('engine')).test(files[0])).toBe(false);
    for (const other of [
      '/',
      '/new',
      '/assets/index-abc.js',
      '/assets/ask-model-engine.worker-x.js.map',
      '/assets/x/ask-model-engine.worker-a.js',
    ])
      expect(new RegExp(SITE_ROUTE_SRC).test(other), other).toBe(true);
  });
});

describe('scripts/vercel-config.mjs: one Content-Security-Policy per response', () => {
  type Route = { src?: string; headers?: Record<string, string>; continue?: boolean };
  const config = (extra: Record<string, string> = {}, asset?: string) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcfg-model-'));
    fs.mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
    if (asset !== undefined) {
      fs.mkdirSync(path.join(dir, '.vercel/output/static/assets'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.vercel/output/static/assets/index-x.js'), asset);
    }
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^VITE_/.test(k)));
    const r = spawnSync(process.execPath, [path.resolve(UI, '../scripts/vercel-config.mjs')], {
      cwd: dir,
      env: { ...env, VITE_API_BASE: 'https://registry.example', ...extra },
      encoding: 'utf8',
    });
    if (r.status !== 0) return { error: r.stderr };
    return {
      routes: (JSON.parse(fs.readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')) as { routes: Route[] })
        .routes,
    };
  };
  /** The headers a path gets: every matching route with headers, as Vercel applies them. */
  const cspHeadersFor = (routes: Route[], p: string) =>
    routes
      .filter((r) => r.src && r.headers && new RegExp(r.src).test(p))
      .map((r) => r.headers?.['Content-Security-Policy']);

  it('a worker file gets exactly its own policy; a page gets exactly the site’s, unchanged by the model', () => {
    const { routes } = config();
    if (!routes) throw new Error('no config');
    const site = routes[0].headers?.['Content-Security-Policy'] as string;
    expect(site).toMatch(/connect-src 'self' https:\/\/registry\.example;/);
    expect(site).not.toMatch(/huggingface|hf\.co/);
    expect(site).toMatch(/trusted-types [^;]*veilcore-ask-model/);
    expect(cspHeadersFor(routes, '/assets/ask-model-download.worker-abc123.js')).toEqual([downloadWorkerCsp(real)]);
    expect(cspHeadersFor(routes, '/assets/ask-model-engine.worker-abc123.js')).toEqual([engineWorkerCsp()]);
    for (const p of ['/', '/new', '/assets/index-x.js', '/ask-model/v0_2_86/Qwen3-1.7B-q4f16_1_cs1k-webgpu.wasm'])
      expect(cspHeadersFor(routes, p), p).toEqual([site]);
    // The other security headers are the same on the workers.
    const worker = routes.find((r) => r.src === modelWorkerRouteSrc('engine'));
    expect(worker?.headers?.['X-Content-Type-Options']).toBe('nosniff');
  });

  it('refuses to deploy a test or eval build', () => {
    expect(config({ VITE_ASK_MODEL: 'test' }).error).toMatch(/never deployed/);
    expect(config({ VITE_ASK_MODEL: 'eval' }).error).toMatch(/never deployed/);
    // Set in a .env file the shell never saw: the built files give it away.
    expect(config({}, 'const r="veilcore-test/stub-model";').error).toMatch(/never deployed/);
    expect(config({}, 'window.__askEval={};').error).toMatch(/never deployed/);
    expect(config({}, 'console.log(1)').error).toBeUndefined();
  });
});

describe('where Ask fetches', () => {
  const src = (f: string) => fs.readFileSync(path.join(HERE, f), 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
  it('only the download worker fetches; the engine worker and the page side do not', () => {
    expect(src('ask-model-download.worker.ts')).toMatch(/\bfetch\(/);
    for (const f of ['ask-model-engine.worker.ts', 'client.ts', 'integrity.ts', 'manifest.ts', 'worker-csp.ts'])
      expect(src(f), f).not.toMatch(
        /\bfetch\(|WebSocket|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/,
      );
  });
  it('the one thing stored is the flag that Ask was seen', () => {
    const s = src('hint-flag.ts');
    expect(s.match(/localStorage\.\w+\(/g)).toEqual(['localStorage.getItem(', 'localStorage.setItem(']);
    expect(s).toMatch(/localStorage\.setItem\(HINT_KEY, v\)/);
    // Only a count of visits, "dismissed" or "opened" is written.
    expect([...s.matchAll(/\bwrite\((.+)\);$/gm)].map((m) => m[1])).toEqual([
      'String(Math.min(shown(v) + 1, HINT_VISITS))',
      "'dismissed'",
      "'opened'",
    ]);
    for (const f of fs.readdirSync(HERE).filter((x) => /\.tsx?$/.test(x) && !/test|hint-flag/.test(x)))
      expect(src(f), f).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });
  it('the download fetches only pinned addresses, with no cookies and no referrer', () => {
    const s = src('ask-model-download.worker.ts');
    expect(s).toMatch(/fetch\(f\.url, \{/);
    expect(s).toMatch(/neededFiles\(m, globalThis\.location\.origin\)/);
    expect(s).toMatch(/credentials: 'omit'/);
    expect(s).toMatch(/referrerPolicy: 'no-referrer'/);
  });
});

describe('the files the model needs, and where each comes from', () => {
  it('the pinned folder at its commit, and the library from this site, kept where WebLLM reads it', () => {
    const m = (stub as ModelManifest).models[0];
    const files = neededFiles(m, 'https://veilcore.org');
    for (const f of files.slice(0, -1))
      expect(f.url.startsWith(`https://huggingface.co/${m.repo}/resolve/${m.commit}/`), f.url).toBe(true);
    expect(files.at(-1)).toMatchObject({
      url: 'https://veilcore.org/ask-model/v0_2_86/Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm',
      scope: 'webllm/wasm',
      sha256: m.lib.sha256,
    });
    expect(libUrl(m, 'https://test.veilcore.org')).toBe(
      'https://test.veilcore.org/ask-model/v0_2_86/Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm',
    );
  });
});

describe('scripts/check-model-headers.mjs: after a deploy', () => {
  const dir = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-'));
    fs.mkdirSync(path.join(d, 'assets'));
    return d;
  };
  const site = (h: Record<string, Record<string, string>>): typeof fetch =>
    ((url: string) => {
      const p = new URL(url).pathname;
      const headers = h[p] ?? { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'" };
      return Promise.resolve(new Response('', { status: 200, headers }));
    }) as unknown as typeof fetch;
  const page = { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'; connect-src 'self'" };

  it('passes when each worker has exactly its own policy; fails on the page’s policy or two joined', async () => {
    const d = dir();
    fs.writeFileSync(path.join(d, 'assets/ask-model-engine.worker-abc.js'), '');
    fs.writeFileSync(path.join(d, 'assets/ask-model-download.worker-def.js'), '');
    const js = (csp: string) => ({ 'content-type': 'text/javascript', 'content-security-policy': csp });
    const good = site({
      '/': page,
      '/assets/ask-model-engine.worker-abc.js': js(engineWorkerCsp()),
      '/assets/ask-model-download.worker-def.js': js(downloadWorkerCsp(stub)),
    });
    expect((await checkModelHeaders('https://x', { staticDir: d, fetchImpl: good, manifest: stub })).ok).toBe(true);
    const twice = site({
      '/': page,
      '/assets/ask-model-engine.worker-abc.js': js(`${page['content-security-policy']}, ${engineWorkerCsp()}`),
      '/assets/ask-model-download.worker-def.js': js(downloadWorkerCsp(stub)),
    });
    const r = await checkModelHeaders('https://x', { staticDir: d, fetchImpl: twice, manifest: stub });
    expect(r.ok).toBe(false);
    expect(r.lines.join('\n')).toMatch(/engine\.worker-abc\.js policy is not the worker's own/);
  });

  it('a build without the model: fails if the model library is served anyway', async () => {
    const d = dir();
    fs.writeFileSync(path.join(d, 'assets/index-1.js'), '');
    const lib = `${stub.libs.servedFrom}${stub.models[0].lib.file}`;
    expect(
      (await checkModelHeaders('https://x', { staticDir: d, fetchImpl: site({ '/': page }), manifest: stub })).ok,
    ).toBe(true);
    const served = site({ '/': page, [lib]: { 'content-type': 'application/wasm' } });
    expect((await checkModelHeaders('https://x', { staticDir: d, fetchImpl: served, manifest: stub })).ok).toBe(false);
  });
});

describe('the hint is shown on three visits at most, and seeing it is not opening Ask', () => {
  it('counts visits to three; dismissing and opening are their own values; nothing else is stored', async () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    });
    const f = await import('./hint-flag');
    expect([f.hintDone(), f.askOpened()]).toEqual([false, false]);
    f.noteHintShown();
    expect(mem.get(f.HINT_KEY)).toBe('1');
    f.noteHintShown();
    f.noteHintShown();
    f.noteHintShown();
    expect(mem.get(f.HINT_KEY)).toBe('3');
    // Shown three times: the hint is done, but Ask was never opened (its first open is still the first).
    expect([f.hintDone(), f.askOpened()]).toEqual([true, false]);
    f.dismissHint();
    expect([f.hintDone(), f.askOpened()]).toEqual([true, false]);
    f.markAskOpened();
    expect([f.hintDone(), f.askOpened()]).toEqual([true, true]);
    // Dismissing after opening keeps "opened"; counting stops.
    f.dismissHint();
    f.noteHintShown();
    expect([...mem.entries()]).toEqual([[f.HINT_KEY, 'opened']]);
    vi.unstubAllGlobals();
  });
});

describe('scripts/release-check.mjs: the model workers, in the release check', () => {
  const files = {
    '/index.html': 'a'.repeat(64),
    '/assets/ask-model-download.worker-abc.js': 'b'.repeat(64),
    '/assets/ask-model-engine.worker-def.js': 'c'.repeat(64),
  };
  const release = (flag: string, f: Record<string, string> = files) =>
    ({ files: f, build: { settings: flag ? { VITE_ASK_MODEL: flag } : {} } }) as never;
  const serve = (engineCsp: string): typeof fetch =>
    ((url: string) => {
      const p = new URL(url).pathname;
      const csp = /download/.test(p) ? downloadWorkerCsp(stub) : engineCsp;
      return Promise.resolve(
        new Response('', {
          status: 200,
          headers: { 'content-type': 'text/javascript', 'content-security-policy': csp },
        }),
      );
    }) as unknown as typeof fetch;

  it('with the model: each worker must have exactly its own policy', async () => {
    const { checkModelWorkers } = await import('../../../scripts/release-check.mjs');
    const good = await checkModelWorkers('https://x', release('on'), {
      fetchImpl: serve(engineWorkerCsp()),
      modelManifest: stub,
    });
    expect(good).toMatchObject({ ok: true, checked: Object.keys(files).slice(1) });
    const twice = await checkModelWorkers('https://x', release('on'), {
      fetchImpl: serve(`default-src 'self', ${engineWorkerCsp()}`),
      modelManifest: stub,
    });
    expect(twice.ok).toBe(false);
    expect(twice.wrong).toEqual([
      { path: '/assets/ask-model-engine.worker-def.js', problem: 'not exactly its own Content-Security-Policy' },
    ]);
  });

  it('without the model: skipped cleanly, and a worker listed anyway is wrong; no pins given: skipped', async () => {
    const { checkModelWorkers, releaseMatches } = await import('../../../scripts/release-check.mjs');
    const none = () => Promise.reject(new Error('nothing is fetched'));
    const off = await checkModelWorkers('https://x', release('', { '/index.html': 'a'.repeat(64) }), {
      fetchImpl: none,
      modelManifest: stub,
    });
    expect(off).toMatchObject({ skipped: 'built without the model', ok: true });
    expect((await checkModelWorkers('https://x', release(''), { fetchImpl: none })).ok).toBe(false);
    expect(await checkModelWorkers('https://x', release('on'), { fetchImpl: none })).toMatchObject({
      skipped: 'no model pins given',
      ok: true,
    });
    const all = {
      files: { total: 1, matched: ['/'], differ: [], missing: [] },
      routes: { total: 1, matched: ['/'], differ: [], missing: [], headerDiffers: [] },
    };
    expect(releaseMatches({ ...all, model: { ok: false, checked: [], wrong: [] } } as never)).toBe(false);
    expect(releaseMatches(all as never)).toBe(true);
  });
});
