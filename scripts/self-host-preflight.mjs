// What a mainnet copy run with its own registry (docs/SELF-HOSTING.md) checks before it is built:
// the same things npm run deploy:mainnet checks for veilcore.org (scripts/site-mainnet-preflight.mjs,
// scripts/deploy-mainnet.mjs sponsorProblem), against the copy's own services and with no
// veilcore.org defaults. bboard-ui/vite.config.ts runs it for `vite build --mode mainnet` when the
// registry isn't VeilCore's; it refuses to build on any problem.
//
//   1. The registry anchors on mainnet at VeilCore's pinned main contract (/.well-known/veilcore-registry).
//   2. The registry serves every feature the site uses (/health), agreements included when licences
//      are on (AGREEMENTS_LIVE in bboard-ui/src/config/copy.ts).
//   3. Licences on: the site sends transactions (VITE_REAL_CHAIN=1), or it would offer licences it
//      can't make.
//   4. The sponsor says mainnet, the pinned contract, synced, its anchoring job on, and (licences on)
//      that it pays for agreements.
//   5. The indexer the browser reads (VITE_INDEXER_URL) answers for this site's own address.
//
// Also on its own: node scripts/self-host-preflight.mjs (reads the same VITE_* settings).
// SPDX-License-Identifier: Apache-2.0

import { pathToFileURL } from 'node:url';
import { normaliseAddress, readMainnetPins } from './mainnet-pins.mjs';
import { agreementsLive, checkFeatures } from './registry-features.mjs';

const trimSlash = (v) => String(v ?? '').trim().replace(/\/+$/, '');

const getJson = async (fetchImpl, url, init) => {
  try {
    const r = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return { ok: false, why: `it answered ${r.status}` };
    return { ok: true, body: await r.json() };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * Every problem found, in plain words ([] when the copy is ready to build).
 * @param {{ env: Record<string, string | undefined>, pinned: string, agreements: boolean, fetchImpl?: typeof fetch }} input
 * @returns {Promise<string[]>}
 */
export const selfHostProblems = async ({ env, pinned, agreements, fetchImpl = fetch }) => {
  const problems = [];
  const api = trimSlash(env.VITE_API_BASE);
  const origin = trimSlash(env.VITE_CANONICAL_ORIGIN);

  const wk = await getJson(fetchImpl, `${api}/.well-known/veilcore-registry`);
  if (!wk.ok) problems.push(`Could not read your registry's ${api}/.well-known/veilcore-registry (${wk.why}). Is it up?`);
  else {
    const anchors = Array.isArray(wk.body?.anchors) ? wk.body.anchors : [];
    if (!anchors.some((a) => a?.network === 'mainnet' && normaliseAddress(a?.contractAddress ?? '') === pinned))
      problems.push(
        `Your registry does not anchor on mainnet at VeilCore's main contract ${pinned}: set its VEILCORE_ANCHOR_NETWORK=mainnet and VEILCORE_ANCHOR_CONTRACT=${pinned}, redeploy it, then build again.`,
      );
  }
  const health = await getJson(fetchImpl, `${api}/health`);
  if (!health.ok) problems.push(`Could not read your registry's ${api}/health (${health.why}). Is it up and finished starting?`);
  else {
    const f = checkFeatures(health.body, api, { agreements, paidPlans: env.VITE_PAID_PLANS === 'on' });
    if (!f.ok)
      problems.push(
        `Your registry at ${api} is missing ${f.missing.join(', ')}, which this site uses. Deploy the registry's latest code (veilcore-api main) first.`,
      );
  }

  const sends = env.VITE_REAL_CHAIN === '1';
  if (agreements && !sends)
    problems.push(
      'Licences are on in this code (AGREEMENTS_LIVE), and they are made from the browser through your fee sponsor: set VITE_REAL_CHAIN=1 with VITE_SPONSOR_URL, VITE_REAL_CHAIN_CONTRACT_ADDRESS, VITE_INDEXER_URL and VITE_INDEXER_WS_URL.',
    );
  if (!sends) return problems;

  const sponsor = trimSlash(env.VITE_SPONSOR_URL);
  const st = await getJson(fetchImpl, `${sponsor}/sponsor/status`);
  if (!st.ok) problems.push(`Could not read your sponsor's ${sponsor}/sponsor/status (${st.why}). Is it up?`);
  else {
    const s = st.body ?? {};
    if (String(s.network).toLowerCase() !== 'mainnet') problems.push(`Your sponsor says it is on "${s.network}", not mainnet.`);
    if (normaliseAddress(s.contractAddress ?? '') !== pinned)
      problems.push(`Your sponsor pays for contract ${s.contractAddress}, not VeilCore's ${pinned}.`);
    if (s.synced !== true) problems.push('Your sponsor wallet is still syncing: wait until /sponsor/status says "synced": true.');
    if (s.anchorer?.enabled !== true)
      problems.push("Your sponsor's anchoring job is off: set its REGISTRY_URL and REGISTRY_OPERATOR_TOKEN, redeploy it, then build again.");
    if (agreements && s.agreements !== true)
      problems.push('Your sponsor does not pay for licence transactions: deploy it from this same commit, then build again.');
  }

  const indexer = trimSlash(env.VITE_INDEXER_URL);
  try {
    const r = await fetchImpl(indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ operationName: 'Probe', variables: {}, query: 'query Probe { block { height } }' }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.status === 403) problems.push(`Your relay refuses ${origin}: add it to the relay's ALLOWED_ORIGINS.`);
    else if (!r.ok) problems.push(`Your relay at ${indexer} answered ${r.status}. Check its /health and /alerts.`);
  } catch (e) {
    problems.push(`Could not reach your relay at ${indexer} (${e instanceof Error ? e.message : String(e)}).`);
  }
  return problems;
};

/**
 * A fetch for the build tests only: with VEILCORE_TEST_DEPLOY_GUARD set (a test stand-in for the
 * pins, which npm run deploy:mainnet refuses), VEILCORE_TEST_SELFHOST_STANDIN sends every request to
 * a local stand-in instead, keeping the path. Otherwise the real fetch.
 */
export const preflightFetch = (env) => {
  const standin = trimSlash(env.VEILCORE_TEST_SELFHOST_STANDIN);
  if (!standin || !env.VEILCORE_TEST_DEPLOY_GUARD) return fetch;
  return (url, init) => {
    const u = new URL(url);
    return fetch(`${standin}${u.pathname}${u.search}`, init);
  };
};

const main = async () => {
  const pins = readMainnetPins();
  if (!pins.ok) {
    console.error(pins.problem);
    process.exit(1);
  }
  const problems = await selfHostProblems({ env: process.env, pinned: pins.veilcore, agreements: await agreementsLive() });
  if (problems.length) {
    console.error(`\nNot ready:\n - ${problems.join('\n - ')}\n`);
    process.exit(1);
  }
  console.log('Registry, sponsor and relay are ready for a mainnet build.');
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
