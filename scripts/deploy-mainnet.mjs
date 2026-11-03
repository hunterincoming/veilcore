// npm run deploy:mainnet — veilcore.org.
//
// The same steps the one-line script ran before (preflight, build --mode mainnet, Vercel
// config, release manifest, prebuilt production deploy, both aliases), plus two optional
// addresses:
//
//   VITE_INDEXER_RELAY_URL=https://<relay>/indexer   the read-only relay (docs/check-on-chain.md):
//                                                    the check page reads Midnight itself.
//   VEILCORE_MAINNET_SPONSOR=https://<sponsor>       the mainnet sponsor: the site sends real
//                                                    transactions (record keys, prove it by
//                                                    link, the DNA pairing date), with VeilCore
//                                                    paying the fee. Needs the relay too.
//
// Without the sponsor the site is exactly what it was: nothing sent from the browser.
// With it, the deploy first checks the sponsor says mainnet, VeilCore's pinned contract and
// synced, and that the relay answers this site. Nothing is built if any of that is not so.
//
// Claims ("prove one number", docs/claims-screen.md) are on when the sponsor pays for them:
// its /sponsor/status names a claims contract, which must be VeilCore's pinned one, and the
// claims proving keys and the k=15 and k=16 parameters must be on this computer.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { normaliseAddress, readMainnetPins } from './mainnet-pins.mjs';
import { vercelEnv } from './vercel-token.mjs';
import { agreementsLive } from './registry-features.mjs';

export const API = 'https://veilcore-api-production.up.railway.app';

const fail = (msg) => {
  console.error(`\nNOT DEPLOYED. veilcore.org is unchanged. ${msg}\n`);
  process.exit(1);
};

/** An https origin from an env var, or undefined when unset. Refuses anything else. */
export const httpsOrigin = (name, value) => {
  const v = (value ?? '').trim().replace(/\/+$/, '');
  if (!v) return undefined;
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`${name} is not an address.`);
  }
  if (u.protocol !== 'https:' || u.search || u.hash || u.username || u.password)
    throw new Error(`${name} must be a plain https address, like https://something.up.railway.app`);
  return v;
};

/**
 * What the sponsor's public status must say before veilcore.org sends anything through it.
 * @returns {string | undefined} the problem, or undefined when it is fine
 */
export const sponsorProblem = (status, pinned, agreements = false) => {
  if (!status || typeof status !== 'object') return 'The sponsor did not answer /sponsor/status.';
  if (String(status.network).toLowerCase() !== 'mainnet')
    return `The sponsor says it is on "${status.network}", not mainnet.`;
  if (normaliseAddress(status.contractAddress ?? '') !== pinned)
    return `The sponsor pays for contract ${status.contractAddress}, not VeilCore's ${pinned}.`;
  if (status.synced !== true)
    return 'The sponsor wallet is still syncing. Wait until /sponsor/status says "synced": true, then run this again.';
  // The site then says batches are anchored automatically: only true with the job on.
  if (status.anchorer?.enabled !== true)
    return 'The sponsor\'s anchoring job is off. Set REGISTRY_URL and REGISTRY_OPERATOR_TOKEN on it (Railway), wait for the redeploy, then run this again.';
  // Licenses on (AGREEMENTS_LIVE): the sponsor must pay for the agreement calls, or every
  // license a visitor starts would be refused at the first step. It says so only when its own
  // MAINNET_AGREEMENTS is on (sponsor/src/policy.ts), so this also catches a sponsor still
  // running the code from before the switch.
  if (agreements && status.agreements !== true)
    return 'Licenses are switched on in the site, but the sponsor does not pay for license transactions yet. Deploy the sponsor from this same commit first (Railway), wait until its /sponsor/status says "agreements": true, then run this again.';
  return undefined;
};

const CLAIMS_KEYS = ['proveRange', 'proveValue'].map((c) => `contract/src/managed/veilcore-claims/keys/${c}.prover`);
const CLAIMS_PARAMS = ['bboard-ui/public/params/bls_midnight_2p15', 'bboard-ui/public/params/bls_midnight_2p16'];
const FETCH_KEYS = 'npm exec --package=@veilcore/contracts@0.3.0 -- veilcore-keys fetch --to contract/src/managed';

/**
 * Whether veilcore.org offers claims, from the sponsor's /sponsor/status: only when the sponsor
 * pays for a claims contract, only when that is VeilCore's pinned one, and only with the
 * claims proving keys and parameters on this computer.
 * @returns {{ ok: true, address: string, line: string } | { ok: false, problem: string }}
 */
export const mainnetClaims = (status, pinnedClaims, exists) => {
  const raw = status?.claimsAddress;
  if (raw === undefined || raw === null || raw === '')
    return { ok: true, address: '', line: 'Claims: off (the sponsor names no claims contract).' };
  const address = normaliseAddress(String(raw));
  if (!pinnedClaims) return { ok: false, problem: 'The sponsor pays for claims, but no claims contract is pinned (api/src/deploy-guard.ts).' };
  if (address !== pinnedClaims)
    return { ok: false, problem: `The sponsor pays for claims on ${raw}, not VeilCore's claims contract ${pinnedClaims}.` };
  const keys = CLAIMS_KEYS.filter((f) => !exists(f));
  if (keys.length)
    return {
      ok: false,
      problem: `The sponsor pays for claims but the claims proving keys are not on this computer (${keys.join(', ')}): run \`${FETCH_KEYS}\` first (it checks every file against the published fingerprints).`,
    };
  const params = CLAIMS_PARAMS.filter((f) => !exists(f));
  if (params.length)
    return {
      ok: false,
      problem: `Claims need the k=15 and k=16 parameters (${params.join(', ')}): run \`cd bboard-ui && node scripts/fetch-params.mjs && cd ..\` first.`,
    };
  return { ok: true, address, line: `Claims: on, claims contract ${address}.` };
};

const getJson = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  }
};

/** The build's chain settings, from the two optional addresses. Throws a plain problem. */
export const chainEnv = (relayUrl, sponsor, pinned) => {
  if (!sponsor)
    return {
      VITE_REAL_CHAIN: '',
      VITE_SPONSOR_URL: '',
      VITE_REAL_CHAIN_CONTRACT_ADDRESS: '',
      VITE_INDEXER_URL: '',
      VITE_INDEXER_WS_URL: '',
    };
  if (!relayUrl)
    throw new Error('VEILCORE_MAINNET_SPONSOR needs VITE_INDEXER_RELAY_URL too: the browser reads Midnight through the relay.');
  const relay = new URL(relayUrl);
  return {
    VITE_REAL_CHAIN: '1',
    VITE_SPONSOR_URL: sponsor,
    VITE_REAL_CHAIN_CONTRACT_ADDRESS: pinned,
    VITE_INDEXER_URL: relay.href.replace(/\/+$/, ''),
    VITE_INDEXER_WS_URL: `wss://${relay.host}${relay.pathname.replace(/\/+$/, '')}/ws`,
  };
};

const main = async () => {
  const pins = readMainnetPins();
  if (!pins.ok) fail(pins.problem);
  let relay;
  let sponsor;
  let chain;
  try {
    relay = process.env.VITE_INDEXER_RELAY_URL?.trim() || undefined;
    sponsor = httpsOrigin('VEILCORE_MAINNET_SPONSOR', process.env.VEILCORE_MAINNET_SPONSOR);
    chain = chainEnv(relay, sponsor, pins.veilcore);
  } catch (e) {
    fail(e.message);
  }

  // Licenses happen in the visitor's browser, through the sponsor: switched on with no sponsor,
  // the site would offer them and send nothing.
  const live = await agreementsLive();
  if (live && !sponsor)
    fail('Licenses are switched on (AGREEMENTS_LIVE), and they need the sponsor: set VEILCORE_MAINNET_SPONSOR and VITE_INDEXER_RELAY_URL, then run this again.');

  // Always set, so an address left in this shell never reaches the build.
  let claimsAddress = '';
  if (sponsor) {
    const status = await getJson(`${sponsor}/sponsor/status`);
    const problem = sponsorProblem(status, pins.veilcore, live);
    if (problem) fail(problem);
    const claims = mainnetClaims(status, pins.claims, existsSync);
    if (!claims.ok) fail(claims.problem);
    claimsAddress = claims.address;
    console.log(claims.line);
    const probe = await fetch(chain.VITE_INDEXER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://veilcore.org' },
      // The exact shape Midnight's indexer client (Apollo Client 4) sends, as deploy-test-site.mjs does.
      body: JSON.stringify({
        operationName: 'Probe',
        variables: {},
        query: 'query Probe { block { height } }',
        extensions: { clientLibrary: { name: '@apollo/client', version: '4.2.3' } },
      }),
    }).catch(() => undefined);
    if (!probe?.ok) fail(`The relay at ${chain.VITE_INDEXER_URL} did not answer for veilcore.org. Check its /health first.`);
    if (!existsSync('bboard-ui/public/params') || readdirSync('bboard-ui/public/params').length === 0)
      fail('The proving parameters are missing: run `cd bboard-ui && node scripts/fetch-params.mjs && cd ..` first.');
    console.log(`Sponsor ${sponsor}: mainnet, VeilCore's contract, synced. The site will send real transactions.`);
  } else {
    console.log('No VEILCORE_MAINNET_SPONSOR: the site sends no transactions (as before).');
  }

  const env = {
    ...process.env,
    VITE_API_BASE: API,
    ...chain,
    VITE_NETWORK_ID: 'mainnet',
    VITE_REAL_CHAIN_CLAIMS_ADDRESS: claimsAddress,
  };
  delete env.VERCEL_TOKEN;
  const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, ...opts });

  run('node', ['scripts/site-mainnet-preflight.mjs']);
  run('npm', ['run', 'build:mainnet'], { cwd: 'bboard-ui' });
  rmSync('.vercel/output', { recursive: true, force: true });
  mkdirSync('.vercel/output/static', { recursive: true });
  cpSync('bboard-ui/dist', '.vercel/output/static', { recursive: true });
  run('node', ['scripts/vercel-config.mjs']);
  run('node', ['scripts/release-manifest.mjs', 'mainnet', '.vercel/output/static']);
  run('npm', ['ci', '--prefix', 'tools/vercel', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
  // Only the Vercel calls get the token (scripts/vercel-token.mjs), never the build.
  const vEnv = vercelEnv(env);
  const url = execFileSync('./tools/vercel/node_modules/.bin/vercel', ['deploy', '--prebuilt', '--prod'], {
    env: vEnv,
    encoding: 'utf8',
  }).trim();
  console.log(`Deployed ${url}`);
  run('./tools/vercel/node_modules/.bin/vercel', ['alias', 'set', url, 'veilcore.org'], { env: vEnv });
  run('./tools/vercel/node_modules/.bin/vercel', ['alias', 'set', url, 'www.veilcore.org'], { env: vEnv });
  rmSync('bboard-ui/dist', { recursive: true, force: true });
  console.log('\nveilcore.org is live.\n');
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
