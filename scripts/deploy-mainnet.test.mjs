// node --test scripts/deploy-mainnet.test.mjs
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainEnv, httpsOrigin, sponsorProblem } from './deploy-mainnet.mjs';

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
