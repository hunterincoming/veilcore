// The proving keys and parameters from the proof file host (proof-files.ts): a file is used only
// when its SHA-256 is the one this build pins, wherever it came from; a swapped file is refused,
// a missing one says so in plain words, and nothing else the page fetches is touched.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- stand-in hosts and caches answer at once */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  PROOF_FILES,
  PROOF_FILES_UNREACHABLE,
  ProofFileError,
  WRONG_PROOF_FILE,
  loadProofFile,
  pinnedPathOf,
  proofFileErrorIn,
  proofFileFetch,
  proofFileUrls,
  proofFilesHost,
} from './proof-files';
import { makeKeyMaterialProvider } from './zk-material';
import { appEn } from '../../i18n/app/en';
import { FINGERPRINTS } from '../../../../partner-kit/src/fingerprints';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const GOOD = new TextEncoder().encode('the real anchor proving key');
const SWAPPED = new TextEncoder().encode('somebody else’s proving key');
const FILES = { 'keys/anchor.prover': sha(GOOD) };
const HOST = 'https://keys.example';
const SITE = 'https://veilcore.example';

/** A host: `serve` maps URL to the bytes it answers with; anything else is a 404. */
const host = (serve: Record<string, Uint8Array | 'html' | 'throw'>) => {
  const asked: string[] = [];
  const f = vi.fn(async (url: string) => {
    asked.push(url);
    const v = serve[url];
    if (v === 'throw') throw new TypeError('Failed to fetch');
    if (v === 'html') return new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
    return v ? new Response(new Uint8Array(v)) : new Response('not found', { status: 404 });
  });
  return { fetch: f, asked };
};

/** A Cache Storage stand-in, by URL. */
const memoryCache = (init: Record<string, Uint8Array> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    m,
    cache: {
      match: async (u: string) => (m.has(u) ? new Response(new Uint8Array(m.get(u)!)) : undefined),
      put: async (u: string, r: Response) => void m.set(u, new Uint8Array(await r.arrayBuffer())),
      delete: async (u: string) => m.delete(u),
    } as unknown as Cache,
  };
};

const byHash = `${HOST}/sha256/${sha(GOOD)}`;
const onSite = `${SITE}/keys/anchor.prover`;

describe('a pinned file, by its fingerprint', () => {
  it('a good file from the host is used, and kept in the cache', async () => {
    const h = host({ [byHash]: GOOD });
    const { cache, m } = memoryCache();
    const got = await loadProofFile('keys/anchor.prover', {
      host: HOST,
      siteOrigin: SITE,
      fetch: h.fetch,
      cache,
      files: FILES,
    });
    expect(got).toEqual(GOOD);
    expect(h.asked).toEqual([byHash]);
    expect(m.get(byHash)).toEqual(GOOD);
  });

  it('a swapped file is refused: never returned, never cached, and the error says so plainly', async () => {
    const h = host({ [byHash]: SWAPPED, [onSite]: SWAPPED });
    const { cache, m } = memoryCache();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const err = await loadProofFile('keys/anchor.prover', {
      host: HOST,
      siteOrigin: SITE,
      fetch: h.fetch,
      cache,
      files: FILES,
    }).catch((e: unknown) => e);
    warn.mockRestore();
    expect(err).toBeInstanceOf(ProofFileError);
    expect((err as ProofFileError).kind).toBe('wrong');
    expect((err as Error).message).toBe(WRONG_PROOF_FILE);
    expect(m.size).toBe(0);
  });

  it('a swapped file on the host, a good copy on this site: the good one is used', async () => {
    const h = host({ [byHash]: SWAPPED, [onSite]: GOOD });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const got = await loadProofFile('keys/anchor.prover', {
      host: HOST,
      siteOrigin: SITE,
      fetch: h.fetch,
      files: FILES,
    });
    warn.mockRestore();
    expect(got).toEqual(GOOD);
    expect(h.asked).toEqual([byHash, onSite]);
  });

  it('a missing file (404, a single-page-app page, or no network) says it could not be downloaded', async () => {
    const cases: Record<string, Uint8Array | 'html' | 'throw'>[] = [
      {},
      { [byHash]: 'html', [onSite]: 'html' },
      { [byHash]: 'throw', [onSite]: 'throw' },
    ];
    for (const serve of cases) {
      const err = await loadProofFile('keys/anchor.prover', {
        host: HOST,
        siteOrigin: SITE,
        fetch: host(serve).fetch,
        files: FILES,
      }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ProofFileError);
      expect((err as ProofFileError).kind).toBe('unreachable');
      expect((err as Error).message).toBe(PROOF_FILES_UNREACHABLE);
    }
  });

  it('a bad copy in the browser’s cache is dropped and downloaded again', async () => {
    const h = host({ [byHash]: GOOD });
    const { cache, m } = memoryCache({ [byHash]: SWAPPED });
    const got = await loadProofFile('keys/anchor.prover', {
      host: HOST,
      siteOrigin: SITE,
      fetch: h.fetch,
      cache,
      files: FILES,
    });
    expect(got).toEqual(GOOD);
    expect(m.get(byHash)).toEqual(GOOD);
  });

  it('a good cached copy is used without the network', async () => {
    const h = host({});
    const { cache } = memoryCache({ [byHash]: GOOD });
    expect(
      await loadProofFile('keys/anchor.prover', { host: HOST, siteOrigin: SITE, fetch: h.fetch, cache, files: FILES }),
    ).toEqual(GOOD);
    expect(h.asked).toEqual([]);
  });

  it('a file this build does not pin is never fetched', async () => {
    const h = host({});
    await expect(
      loadProofFile('keys/somethingElse.prover', { host: HOST, siteOrigin: SITE, fetch: h.fetch, files: FILES }),
    ).rejects.toBeInstanceOf(ProofFileError);
    expect(h.asked).toEqual([]);
  });
});

describe('where they are asked for', () => {
  it('the host by fingerprint first, then this site by path', () => {
    expect(proofFileUrls('keys/anchor.prover', { host: HOST, siteOrigin: `${SITE}/some/page`, files: FILES })).toEqual([
      byHash,
      onSite,
    ]);
  });

  it('only this site’s pinned paths count as proof files', () => {
    expect(pinnedPathOf(`${SITE}/keys/anchor.prover`, SITE, FILES)).toBe('keys/anchor.prover');
    expect(pinnedPathOf('/keys/anchor.prover', SITE, FILES)).toBe('keys/anchor.prover');
    expect(pinnedPathOf(`${SITE}/keys/anchor.prover?x=1`, SITE, FILES)).toBeUndefined();
    expect(pinnedPathOf('https://elsewhere.example/keys/anchor.prover', SITE, FILES)).toBeUndefined();
    expect(pinnedPathOf(`${SITE}/zkir/anchor.bzkir`, SITE, FILES)).toBeUndefined();
  });

  it('the host setting: a plain https address only', () => {
    expect(proofFilesHost('https://keys.veilcore.org/')).toBe('https://keys.veilcore.org');
    expect(proofFilesHost('http://127.0.0.1:4100')).toBe('http://127.0.0.1:4100');
    for (const bad of [
      '',
      undefined,
      'http://keys.veilcore.org',
      'https://keys.veilcore.org/x',
      'https://a@keys.veilcore.org',
      'nope',
    ])
      expect(proofFilesHost(bad)).toBeUndefined();
  });
});

describe('midnight-js’s fetch (FetchZkConfigProvider)', () => {
  it('answers pinned paths checked from the host, and passes everything else through untouched', async () => {
    const base = vi.fn(async (input: string | URL) => {
      const u = input.toString();
      if (u === byHash) return new Response(new Uint8Array(GOOD));
      return new Response(`other ${u}`, { headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const f = proofFileFetch(base, { host: HOST, siteOrigin: SITE, files: FILES });
    expect(new Uint8Array(await (await f(`${SITE}/keys/anchor.prover`)).arrayBuffer())).toEqual(GOOD);
    expect(await (await f(`${SITE}/compiler/contract-info.json`)).text()).toBe(
      `other ${SITE}/compiler/contract-info.json`,
    );
    expect(await (await f(`${SITE}/sponsor`, { method: 'POST' })).text()).toBe(`other ${SITE}/sponsor`);
  });

  it('a swapped file stops the call with the plain error, which survives the library’s wrapping', async () => {
    const base = (async () => new Response(new Uint8Array(SWAPPED))) as unknown as typeof fetch;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const err = await proofFileFetch(base, { host: HOST, siteOrigin: SITE, files: FILES })(
      `${SITE}/keys/anchor.prover`,
    ).catch((e: unknown) => e);
    warn.mockRestore();
    const wrapped = new Error('Failed to fetch ZK artifact from …', { cause: err });
    expect(proofFileErrorIn(wrapped)?.message).toBe(WRONG_PROOF_FILE);
  });
});

describe('the prover worker’s files (zk-material.ts)', () => {
  it('with a host, the keys and parameters come from it by fingerprint, checked', async () => {
    const PARAM = new TextEncoder().encode('k=13 parameters');
    const files = {
      'keys/anchor.prover': sha(GOOD),
      'keys/anchor.verifier': sha(GOOD),
      'params/bls_midnight_2p13': sha(PARAM),
    };
    const ir = readFileSync(path.resolve(HERE, '../../../../contract/src/managed/veilcore/zkir/anchor.zkir'));
    const asked: string[] = [];
    const f = async (u: string) => {
      asked.push(u);
      if (u === byHash) return new Response(new Uint8Array(GOOD));
      if (u === `${HOST}/sha256/${sha(PARAM)}`) return new Response(new Uint8Array(PARAM));
      return new Response('not found', { status: 404 });
    };
    const realFetch = globalThis.fetch;
    // The circuit itself still comes from this site.
    globalThis.fetch = (async (u: string) =>
      u.endsWith('/zkir/anchor.zkir')
        ? new Response(new Uint8Array(ir))
        : new Response('', { status: 404 })) as typeof fetch;
    try {
      const km = makeKeyMaterialProvider(SITE, 'test', () => undefined, { host: HOST, files, fetch: f });
      const m = await km.lookupKey('anchor');
      expect(m?.proverKey).toEqual(GOOD);
      expect(await km.getParams(13)).toEqual(PARAM);
      expect(asked.every((u) => u.startsWith(`${HOST}/sha256/`))).toBe(true);
      await expect(km.getParams(14)).rejects.toThrow(/not on this site yet/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('with a host, a swapped proving key stops the proof before it starts', async () => {
    const files = { 'keys/anchor.prover': sha(GOOD), 'keys/anchor.verifier': sha(GOOD) };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const km = makeKeyMaterialProvider(SITE, 'test', () => undefined, {
      host: HOST,
      files,
      fetch: async () => new Response(new Uint8Array(SWAPPED)),
    });
    await expect(km.lookupKey('anchor')).rejects.toThrow(WRONG_PROOF_FILE);
    warn.mockRestore();
  });
});

describe('the pins this site is built with', () => {
  it('every key is the published contract build’s (partner-kit fingerprints), and every parameter Midnight’s', () => {
    const params = JSON.parse(
      readFileSync(path.resolve(HERE, '../../../scripts/params.sha256.json'), 'utf8'),
    ) as Record<string, string>;
    const keys = Object.entries(PROOF_FILES).filter(([p]) => p.startsWith('keys/'));
    expect(keys.length).toBe(54);
    for (const [p, h] of keys) {
      const owner = (['veilcore', 'veilcore-claims'] as const).filter(
        (c) => (FINGERPRINTS[c] as Record<string, string>)[p] === h,
      );
      expect(owner.length, p).toBe(1);
    }
    for (const [p, h] of Object.entries(PROOF_FILES).filter(([q]) => q.startsWith('params/')))
      expect(h, p).toBe(params[p.slice('params/'.length)]);
    expect(
      Object.keys(PROOF_FILES)
        .filter((p) => p.startsWith('params/'))
        .sort(),
    ).toEqual([13, 14, 15, 16].map((k) => `params/bls_midnight_2p${k}`));
  });

  it('the two errors are sentences a person sees, in every language', () => {
    const en = appEn as Record<string, string>;
    expect(en['app.err.chain.proofFileWrong']).toBe(WRONG_PROOF_FILE);
    expect(en['app.err.chain.proofFilesUnreachable']).toBe(PROOF_FILES_UNREACHABLE);
  });
});
