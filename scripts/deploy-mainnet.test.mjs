// node --test scripts/deploy-mainnet.test.mjs
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAINNET_REGISTRY, chainEnv, httpsOrigin, mainnetClaims, registryAddress, sponsorProblem } from './deploy-mainnet.mjs';
import { readProofFiles } from './proof-files.mjs';

const PIN = 'a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347';

test('without a sponsor the site sends nothing, and no leftover indexer reaches the build', () => {
  assert.deepEqual(chainEnv(undefined, undefined, PIN), {
    VITE_REAL_CHAIN: '',
    VITE_SPONSOR_URL: '',
    VITE_REAL_CHAIN_CONTRACT_ADDRESS: '',
    VITE_INDEXER_URL: '',
    VITE_INDEXER_WS_URL: '',
  });
});

test('with a sponsor: the pinned contract, and the indexer through the relay, https and wss', () => {
  assert.deepEqual(chainEnv('https://relay.example.org/indexer/', 'https://s.example.org', PIN), {
    VITE_REAL_CHAIN: '1',
    VITE_SPONSOR_URL: 'https://s.example.org',
    VITE_REAL_CHAIN_CONTRACT_ADDRESS: PIN,
    VITE_INDEXER_URL: 'https://relay.example.org/indexer',
    VITE_INDEXER_WS_URL: 'wss://relay.example.org/indexer/ws',
  });
  assert.throws(() => chainEnv(undefined, 'https://s.example.org', PIN), /needs VITE_INDEXER_RELAY_URL/);
});

test('the sponsor address must be plain https', () => {
  assert.equal(httpsOrigin('X', ' https://s.example.org/ '), 'https://s.example.org');
  assert.equal(httpsOrigin('X', ''), undefined);
  assert.throws(() => httpsOrigin('X', 'http://s.example.org'), /plain https/);
  assert.throws(() => httpsOrigin('X', 'https://s.example.org/?project_id=x'), /plain https/);
});

test('the sponsor must say mainnet, the pinned contract and synced', () => {
  const ok = { network: 'mainnet', contractAddress: PIN, synced: true, anchorer: { enabled: true } };
  assert.equal(sponsorProblem(ok, PIN), undefined);
  assert.match(sponsorProblem({ ...ok, network: 'preprod' }, PIN), /not mainnet/);
  assert.match(sponsorProblem({ ...ok, contractAddress: 'ab'.repeat(32) }, PIN), /not VeilCore's/);
  assert.match(sponsorProblem({ ...ok, synced: false }, PIN), /still syncing/);
  assert.match(sponsorProblem(undefined, PIN), /did not answer/);
  assert.match(sponsorProblem({ ...ok, anchorer: { enabled: false } }, PIN), /anchoring job is off/);
});

test('with licenses switched on, the sponsor must pay for license transactions', () => {
  const ok = { network: 'mainnet', contractAddress: PIN, synced: true, anchorer: { enabled: true } };
  assert.equal(sponsorProblem(ok, PIN, false), undefined);
  assert.match(sponsorProblem(ok, PIN, true), /does not pay for license transactions/);
  assert.match(sponsorProblem({ ...ok, agreements: false }, PIN, true), /does not pay for license transactions/);
  assert.equal(sponsorProblem({ ...ok, agreements: true }, PIN, true), undefined);
});

test('the Vercel token comes from the environment or the keychain, and only into Vercel calls', async () => {
  const { vercelToken, vercelEnv } = await import('./vercel-token.mjs');
  assert.equal(vercelToken({ VERCEL_TOKEN: ' abc ' }), 'abc');
  const read = () => 'fromkeychain\n';
  if (process.platform === 'darwin') assert.equal(vercelToken({}, read), 'fromkeychain');
  else assert.equal(vercelToken({}, read), undefined);
  assert.deepEqual(vercelEnv({ A: '1', VERCEL_TOKEN: 't' }), { A: '1', VERCEL_TOKEN: 't' });
  const src = (await import('node:fs')).readFileSync(new URL('./deploy-mainnet.mjs', import.meta.url), 'utf8');
  assert.match(src, /delete env\.VERCEL_TOKEN;/);
});

test('claims: on only when the sponsor pays for VeilCore\'s pinned claims contract, with its keys among the pinned proof files', () => {
  const CLAIMS = 'ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d';
  const all = () => true;
  assert.deepEqual(mainnetClaims({}, CLAIMS, all), {
    ok: true,
    address: '',
    line: 'Claims: off (the sponsor names no claims contract).',
  });
  assert.equal(mainnetClaims({ claimsAddress: CLAIMS.toUpperCase() }, CLAIMS, all).address, CLAIMS);
  assert.match(mainnetClaims({ claimsAddress: 'ab'.repeat(32) }, CLAIMS, all).problem, /not VeilCore's claims contract/);
  assert.match(mainnetClaims({ claimsAddress: CLAIMS }, '', all).problem, /no claims contract is pinned/);
  assert.match(mainnetClaims({ claimsAddress: CLAIMS }, CLAIMS, (f) => !f.endsWith('.prover')).problem, /proving keys .*proof-files\.json/);
  assert.match(mainnetClaims({ claimsAddress: CLAIMS }, CLAIMS, (f) => !f.includes('2p16')).problem, /k=15 and k=16/);
  // The site's own pins carry everything claims need.
  const table = readProofFiles();
  assert.equal(mainnetClaims({ claimsAddress: CLAIMS }, CLAIMS, (f) => Object.hasOwn(table.files, f)).ok, true);
});

test('the registry address: production when unset, any plain https address when set, nothing else', () => {
  assert.equal(MAINNET_REGISTRY, 'https://veilcore-api-production.up.railway.app');
  assert.equal(registryAddress(undefined), MAINNET_REGISTRY);
  assert.equal(registryAddress('  '), MAINNET_REGISTRY);
  assert.equal(registryAddress(' https://r.example.org/ '), 'https://r.example.org');
  assert.throws(() => registryAddress('http://r.example.org'), /VEILCORE_MAINNET_REGISTRY must be a plain https address/);
  assert.throws(() => registryAddress('r.example.org'), /VEILCORE_MAINNET_REGISTRY is not an address/);
  assert.throws(() => registryAddress('https://r.example.org/?token=x'), /plain https/);
  const src = readFileSync(new URL('./deploy-mainnet.mjs', import.meta.url), 'utf8');
  // One address for the preflight, the build and the page's connect-src; no other one in the code.
  assert.match(src, /VITE_API_BASE: registry,\n\s+VEILCORE_API_ORIGIN: registry,/);
  assert.equal(src.split('veilcore-api-production.up.railway.app').length, 2);
});
