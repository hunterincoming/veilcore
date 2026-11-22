// A copy someone else runs (docs/SELF-HOSTING.md): who it names as its operator, and the checks a
// mainnet build makes against its own registry, sponsor and relay before building
// (scripts/canonical-origin.mjs, scripts/self-host-preflight.mjs). Review of PR #171, H3 and H4.
import { describe, expect, it } from 'vitest';
import { mainnetOriginProblem, operatorProblems, OPERATOR_SETTINGS } from '../../../scripts/canonical-origin.mjs';
import { selfHostProblems, preflightFetch } from '../../../scripts/self-host-preflight.mjs';
import { DEFAULT_API } from '../../../scripts/site-mainnet-preflight.mjs';
import { AGREEMENT_FEATURES, REQUIRED_FEATURES } from '../../../scripts/registry-features.mjs';
import { NOTICE } from '../components/site/OperatorNotice';
import { LANGUAGE_CODES } from './languages';

const OP = {
  VITE_OPERATOR_NAME: 'Example Breed Registry',
  VITE_OPERATOR_EMAIL: 'help@registry.example.org',
  VITE_OPERATOR_PRIVACY_URL: 'https://registry.example.org/privacy',
  VITE_OPERATOR_TERMS_URL: 'https://registry.example.org/terms',
};
const API = 'https://registry.example.org';
const SITE = 'https://records.example.org';
const PIN = 'ab'.repeat(32);

describe("a copy's operator", () => {
  it('is required, all four settings, for a mainnet build with its own registry', () => {
    expect(mainnetOriginProblem({ api: API, canonical: SITE })).toMatch(/VITE_OPERATOR_NAME/);
    const three: Record<string, string> = { ...OP, VITE_OPERATOR_TERMS_URL: '' };
    expect(mainnetOriginProblem({ api: API, canonical: SITE, env: three })).toMatch(/VITE_OPERATOR_TERMS_URL/);
    expect(mainnetOriginProblem({ api: API, canonical: SITE, env: OP })).toBeUndefined();
    expect(Object.keys(OPERATOR_SETTINGS).sort()).toEqual(Object.keys(OP).sort());
  });

  it("is refused in veilcore.org's build, where VeilCore runs it", () => {
    expect(mainnetOriginProblem({ api: DEFAULT_API, env: { VITE_OPERATOR_EMAIL: OP.VITE_OPERATOR_EMAIL } })).toMatch(
      /unset VITE_OPERATOR_EMAIL/,
    );
    expect(mainnetOriginProblem({ api: DEFAULT_API, env: {} })).toBeUndefined();
  });

  it('must be its own: no veilcore.org address or page, an https policy, a plain email', () => {
    expect(operatorProblems({ ...OP, VITE_OPERATOR_EMAIL: 'hunter@veilcore.org' }, true).join()).toMatch(
      /not a veilcore\.org one/,
    );
    expect(operatorProblems({ ...OP, VITE_OPERATOR_EMAIL: 'a`${x}@example.org' }, true).join()).toMatch(/plain email/);
    expect(
      operatorProblems({ ...OP, VITE_OPERATOR_PRIVACY_URL: 'http://registry.example.org/p' }, true).join(),
    ).toMatch(/https/);
    expect(operatorProblems({ ...OP, VITE_OPERATOR_TERMS_URL: 'https://veilcore.org/terms' }, true).join()).toMatch(
      /not one on veilcore\.org/,
    );
    expect(operatorProblems({ ...OP, VITE_OPERATOR_NAME: '<b>x</b>' }, true).join()).toMatch(/plain name/);
  });

  it('on a test network is optional, but all four or none', () => {
    expect(operatorProblems({}, false)).toEqual([]);
    expect(operatorProblems({ VITE_OPERATOR_NAME: 'X' }, false).join()).toMatch(/all four or none/);
    expect(operatorProblems(OP, false)).toEqual([]);
  });

  it('notice says the same in every language, with the same placeholders', () => {
    const holes = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort().join();
    for (const lang of LANGUAGE_CODES) {
      expect(Object.keys(NOTICE[lang]).sort(), lang).toEqual(Object.keys(NOTICE.en).sort());
      for (const [k, v] of Object.entries(NOTICE.en))
        expect(holes(NOTICE[lang][k as keyof typeof NOTICE.en]), `${lang} ${k}`).toBe(holes(v));
    }
  });
});

/** A stand-in for the copy's own services, as fetch sees them. */
const services = (o: {
  anchors?: unknown;
  features?: string[];
  status?: Record<string, unknown> | null;
  relay?: number;
}) => {
  const seen: { url: string; origin?: string }[] = [];
  const f = ((url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    seen.push({ url, origin: headers.origin });
    const json = (b: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(b), { status }));
    if (url.endsWith('/.well-known/veilcore-registry'))
      return json({ anchors: o.anchors ?? [{ chain: 'midnight', network: 'mainnet', contractAddress: PIN }] });
    if (url.endsWith('/health'))
      return json({
        ok: true,
        features: o.features ?? [...Object.keys(REQUIRED_FEATURES), ...Object.keys(AGREEMENT_FEATURES)],
      });
    if (url.endsWith('/sponsor/status'))
      return o.status === null
        ? json({}, 500)
        : json({
            network: 'mainnet',
            contractAddress: PIN,
            synced: true,
            anchorer: { enabled: true },
            agreements: true,
            ...o.status,
          });
    if (url.endsWith('/indexer')) return json({ data: { block: { height: 1 } } }, o.relay ?? 200);
    return json({}, 404);
  }) as unknown as typeof fetch;
  return { f, seen };
};
const ENV = {
  VITE_API_BASE: API,
  VITE_CANONICAL_ORIGIN: SITE,
  VITE_REAL_CHAIN: '1',
  VITE_SPONSOR_URL: 'https://sponsor.example.org',
  VITE_INDEXER_URL: 'https://relay.example.org/indexer',
};

describe('the checks a mainnet copy makes before it builds', () => {
  it('pass when the registry, sponsor and relay are ready, and ask the relay as the site itself', async () => {
    const { f, seen } = services({});
    expect(await selfHostProblems({ env: ENV, pinned: PIN, agreements: true, fetchImpl: f })).toEqual([]);
    expect(seen.find((s) => s.url.endsWith('/indexer'))?.origin).toBe(SITE);
  });

  it('refuse a registry that anchors elsewhere or is missing features', async () => {
    const wrong = services({ anchors: [{ network: 'mainnet', contractAddress: 'cd'.repeat(32) }] });
    expect((await selfHostProblems({ env: ENV, pinned: PIN, agreements: true, fetchImpl: wrong.f })).join()).toMatch(
      /does not anchor on mainnet at VeilCore's main contract/,
    );
    const old = services({ features: Object.keys(REQUIRED_FEATURES) });
    expect((await selfHostProblems({ env: ENV, pinned: PIN, agreements: true, fetchImpl: old.f })).join()).toMatch(
      /missing license-invites-v1/,
    );
  });

  it('refuse licences with no sponsor, and a sponsor that is not ready', async () => {
    const { f } = services({});
    const noChain: Record<string, string> = { ...ENV, VITE_REAL_CHAIN: '' };
    expect((await selfHostProblems({ env: noChain, pinned: PIN, agreements: true, fetchImpl: f })).join()).toMatch(
      /set VITE_REAL_CHAIN=1/,
    );
    expect(await selfHostProblems({ env: noChain, pinned: PIN, agreements: false, fetchImpl: f })).toEqual([]);
    for (const [status, why] of [
      [{ network: 'preprod' }, /not mainnet/],
      [{ contractAddress: 'cd'.repeat(32) }, /not VeilCore's/],
      [{ synced: false }, /still syncing/],
      [{ anchorer: { enabled: false } }, /anchoring job is off/],
      [{ agreements: false }, /licence transactions/],
    ] as const) {
      const s = services({ status });
      expect((await selfHostProblems({ env: ENV, pinned: PIN, agreements: true, fetchImpl: s.f })).join()).toMatch(why);
    }
  });

  it('refuse a relay that refuses this site', async () => {
    const { f } = services({ relay: 403 });
    expect((await selfHostProblems({ env: ENV, pinned: PIN, agreements: true, fetchImpl: f })).join()).toMatch(
      /refuses https:\/\/records\.example\.org: add it to the relay's ALLOWED_ORIGINS/,
    );
  });

  it('use a stand-in only in a test build (with the test pins)', () => {
    expect(preflightFetch({ VEILCORE_TEST_SELFHOST_STANDIN: 'http://127.0.0.1:1' })).toBe(fetch);
    expect(
      preflightFetch({ VEILCORE_TEST_SELFHOST_STANDIN: 'http://127.0.0.1:1', VEILCORE_TEST_DEPLOY_GUARD: 'x' }),
    ).not.toBe(fetch);
  });
});

describe('the nginx version of the headers (scripts/nginx-headers.mjs)', () => {
  it('gives each route its whole header set, the workers their own policy, and the app fallback', async () => {
    const { nginxConf } = await import('../../../scripts/nginx-headers.mjs');
    const { SITE_ROUTE_SRC, modelWorkerRouteSrc } = await import('../../../scripts/ask-model-csp.mjs');
    const { SW_ROUTE_SRC, SW_CACHE_CONTROL } = await import('../../../scripts/release-check.mjs');
    const site = { 'Content-Security-Policy': "default-src 'self'", 'X-Frame-Options': 'DENY' };
    const conf = nginxConf([
      { src: SITE_ROUTE_SRC, headers: site, continue: true },
      { src: SW_ROUTE_SRC, headers: { 'Cache-Control': SW_CACHE_CONTROL }, continue: true },
      { src: modelWorkerRouteSrc('download'), headers: { ...site, 'Content-Security-Policy': "default-src 'none'" } },
      { src: modelWorkerRouteSrc('engine'), headers: { ...site, 'Content-Security-Policy': "script-src 'self'" } },
      { src: '^/tools/passkey-check$', dest: '/tools/passkey-check.html' },
      { handle: 'filesystem' },
      { src: '/.*', dest: '/index.html' },
    ]);
    const blocks = conf.split(/\n(?=location )/).filter((b) => b.startsWith('location '));
    expect(blocks).toHaveLength(5);
    for (const b of blocks) expect(b).toContain('add_header X-Frame-Options "DENY" always;');
    expect(blocks.find((b) => b.includes('ask-model-download'))).toContain(
      `Content-Security-Policy "default-src 'none'"`,
    );
    expect(blocks.find((b) => b.startsWith('location = /sw.js'))).toContain(`Cache-Control "${SW_CACHE_CONTROL}"`);
    expect(blocks.find((b) => b.startsWith('location = /tools/passkey-check'))).toContain(
      'try_files /tools/passkey-check.html =404;',
    );
    expect(blocks.find((b) => b.startsWith('location / '))).toContain('try_files $uri /index.html;');
    expect(() => nginxConf([])).toThrow(/Run it again first/);
  });
});
