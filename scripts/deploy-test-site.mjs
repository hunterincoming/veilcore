// npm run deploy:test — the public test site at test.veilcore.org.
//
// The full app on the preprod test network: logging with a date stamp, "prove it" by link,
// lab results, everything, free (the sponsor pays test fees). It reads the chain through the
// sponsor's indexer relay (sponsor/src/indexer-relay.ts), so the page carries no key and can
// be hosted. Run from Hunter's Mac, because the proving files in bboard-ui/dist/keys come from
// that machine's contract build, the one the practice contract was deployed from.
//
// It refuses to run unless both services say they are on preprod and the registry serves
// everything the site uses (its /health lists sealed records, lab results, animal records
// and the claimant's offer: scripts/registry-features.mjs; deploy the registry first). It never touches
// veilcore.org: the deploy is a preview, aliased only to test.veilcore.org. The domain is
// not added to the Vercel project (a project domain would follow every production deploy);
// the alias alone is enough, since veilcore.org's DNS is on Vercel.
//
// Before uploading it writes the release manifest (scripts/release-manifest.mjs): the SHA-256
// of every file served, the commit and the date, in releases/preprod/<commit>.json, and prints
// it. Commit and push that file with the release; anyone can then check the live site against
// it (npm run check:site -- https://test.veilcore.org, or /check-this-site on the site).
//
//   VEILCORE_TEST_REGISTRY=https://<preprod registry> VEILCORE_TEST_SPONSOR=https://<sponsor> npm run deploy:test
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkTestSiteAllowed } from './site-prod-preflight.mjs';
import { checkRegistryFeatures, featuresLine } from './registry-features.mjs';

const CONTRACT = '72fe33436d424fcf247919c8e2f0de224175cc55061739be0ebffb2d650f2f73'; // practice contract, 7 Oct
const DOMAIN = 'test.veilcore.org';
const PRODUCTION_REGISTRY = 'https://veilcore-api-production.up.railway.app';

const fail = (msg) => {
  console.error(`\nNOT DEPLOYED. The test site is unchanged. ${msg}\n`);
  process.exit(1);
};
const httpsOrigin = (name) => {
  const v = (process.env[name] ?? '').trim().replace(/\/$/, '');
  if (!v) fail(`Set ${name} to the service's https address (Railway → the service → Settings → Networking).`);
  let u;
  try {
    u = new URL(v);
  } catch {
    fail(`${name} is not a web address: ${v}`);
  }
  if (u.protocol !== 'https:' || u.pathname !== '/' || u.search)
    fail(`${name} must be just https://<domain>, nothing after it.`);
  return u.origin;
};
const getJson = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The registry checks, in order: it can be read, it doesn't anchor on mainnet, it anchors on
 * preprod, and its /health lists every feature the site uses.
 * @returns {Promise<{ ok: true } | { ok: false, problem: string }>}
 */
export const checkTestRegistry = async (registry) => {
  const descriptor = await getJson(`${registry}/.well-known/veilcore-registry`);
  if (!descriptor)
    return {
      ok: false,
      problem: `Could not read ${registry}/.well-known/veilcore-registry. Is it the preprod registry, and is it up?`,
    };
  const allowed = checkTestSiteAllowed(descriptor);
  if (!allowed.ok) return allowed;
  if (!descriptor.anchors.some((a) => String(a?.network).toLowerCase() === 'preprod'))
    return { ok: false, problem: 'That registry does not say it anchors on preprod.' };
  return checkRegistryFeatures(registry);
};

const main = async () => {
  if (!existsSync('bboard-ui/public/params') || readdirSync('bboard-ui/public/params').length === 0)
    fail('The proving parameters are missing: run `cd bboard-ui && node scripts/fetch-params.mjs && cd ..` first.');
  if (!existsSync('contract/src/managed/veilcore/keys'))
    fail('The contract has no compiled keys on this computer: run `cd contract && npm run compact && cd ..` first.');

  const registry = httpsOrigin('VEILCORE_TEST_REGISTRY');
  const sponsor = httpsOrigin('VEILCORE_TEST_SPONSOR');
  if (registry === PRODUCTION_REGISTRY)
    fail('That is the live registry. The test site uses the preprod one (veilcore-api-preprod).');

  const checked = await checkTestRegistry(registry);
  if (!checked.ok) fail(checked.problem);
  console.log(featuresLine(registry));

  const status = await getJson(`${sponsor}/sponsor/status`);
  if (!status) fail(`Could not read ${sponsor}/sponsor/status. Is the sponsor up?`);
  if (String(status.network).toLowerCase() !== 'preprod')
    fail(`The sponsor says it is on "${status.network}", not preprod.`);
  if (status.contractAddress && String(status.contractAddress).toLowerCase() !== CONTRACT)
    fail(`The sponsor uses contract ${status.contractAddress}, not the practice contract ${CONTRACT}.`);
  const relay = await fetch(`${sponsor}/indexer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: `https://${DOMAIN}` },
    // The exact shape Midnight's indexer client (Apollo Client 4) sends, extensions included.
    body: JSON.stringify({
      operationName: 'Probe',
      variables: {},
      query: 'query Probe { block { height } }',
      extensions: { clientLibrary: { name: '@apollo/client', version: '4.2.3' } },
    }),
  }).catch(() => undefined);
  if (!relay || relay.status === 404)
    fail(
      'The sponsor has no indexer relay yet: redeploy it with the latest code first (railway up from the sponsor stage step).',
    );
  if (relay.status === 403)
    fail(
      `The sponsor refuses https://${DOMAIN}: add it to the sponsor's ALLOWED_ORIGINS on Railway (comma-separated), then try again.`,
    );
  if (!relay.ok)
    fail(
      `The sponsor's indexer relay answered ${relay.status} to the kind of read the site makes. Redeploy the sponsor with the latest code (npm run stage -w sponsor, then railway up), then try again.`,
    );

  const wss = sponsor.replace(/^https:/, 'wss:');
  const env = {
    ...process.env,
    VITE_NETWORK_ID: 'preprod',
    VITE_REAL_CHAIN: '1',
    VITE_REAL_CHAIN_CONTRACT_ADDRESS: CONTRACT,
    VITE_SPONSOR_URL: sponsor,
    VITE_INDEXER_URL: `${sponsor}/indexer`,
    VITE_INDEXER_WS_URL: `${wss}/indexer/ws`,
    VITE_API_BASE: registry,
    // Shared links and QR codes point at the test site, not at veilcore.org (config/network.ts).
    VITE_CANONICAL_ORIGIN: `https://${DOMAIN}`,
  };
  const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, ...opts });

  console.log(`\nBuilding the test site against ${registry} and ${sponsor}…`);
  run('npm', ['run', 'build'], { cwd: 'bboard-ui' });
  rmSync('.vercel/output', { recursive: true, force: true });
  mkdirSync('.vercel/output/static', { recursive: true });
  cpSync('bboard-ui/dist', '.vercel/output/static', { recursive: true });
  run('node', ['scripts/vercel-config.mjs']);
  // The release manifest (CONTRACT.md #31): every file served, the commit, the date, written
  // to releases/preprod/<commit>.json (commit and push it with this release) and printed.
  run('node', ['scripts/release-manifest.mjs', 'preprod', '.vercel/output/static']);
  run('npm', ['ci', '--prefix', 'tools/vercel', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
  // A preview deployment, never --prod: nothing here can touch veilcore.org.
  const url = execFileSync('./tools/vercel/node_modules/.bin/vercel', ['deploy', '--prebuilt'], {
    env,
    encoding: 'utf8',
  }).trim();
  run('./tools/vercel/node_modules/.bin/vercel', ['alias', 'set', url, DOMAIN]);
  rmSync('bboard-ui/dist', { recursive: true, force: true });
  console.log(`\nThe test site is live at https://${DOMAIN}\n`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
