// npm run verify:deployment against a stand-in indexer on this computer, run as a user would
// run it (a child process, its output and exit code). The states come from
// fixtures/verify-deployment/states.json: built from the published zk-r4 verifier keys in
// Ledger 9 format, not recorded from mainnet (make-states.mjs says how). Every failing case is
// derived from them here: a swapped key, a missing circuit, an extra circuit, a live claims
// authority, two indexers that disagree (and two whose states differ only in ledger data), a
// Ledger 8 state, an indexer that is down.
// Run: npm run test:deployments
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { after, before, test } from 'node:test';
import * as v8 from '@midnight-ntwrk/compact-runtime';
import * as v9 from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { ROOT, loadDeployments } from './deployments.mjs';
import { chooseIndexers, parseArgs } from './verify-deployment.mjs';

const d = loadDeployments('mainnet');
const MAIN = d.contracts.find((c) => c.name === 'veilcore').address;
const CLAIMS = d.contracts.find((c) => c.name === 'veilcore-claims').address;
const GENUINE = JSON.parse(readFileSync(path.join(ROOT, 'scripts/fixtures/verify-deployment/states.json'), 'utf8')).states;

const hex = (s) => Buffer.from(s.serialize()).toString('hex');
const load9 = (address) => v9.ContractState.deserialize(Buffer.from(GENUINE[address], 'hex'));
/** A copy of a genuine Ledger 9 state with `edit` applied. */
const edited = (address, edit) => {
  const s = load9(address);
  edit(s);
  return hex(s);
};
const opWith = (vk) => {
  const op = new v9.ContractOperation();
  op.verifierKey = vk;
  return op;
};

// One stand-in indexer per "host" path: /one and /two, each answering from its own table.
const tables = { one: {}, two: {} };
const seen = [];
let server;
let base;
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const which = req.url.slice(1);
      seen.push({ which, origin: req.headers.origin, body });
      if (which === 'down') {
        res.writeHead(503).end();
        return;
      }
      const { variables } = JSON.parse(body);
      const state = tables[which]?.[variables.address];
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { contractAction: state === undefined ? null : { state } } }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const verify = (args, env = {}) =>
  new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', '--import', './api/test-ts-resolve.mjs', 'scripts/verify-deployment.mjs', ...args],
      { cwd: ROOT, env: { PATH: process.env.PATH, ...env } },
    );
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (out += c));
    child.on('close', (code) => resolve({ code, out }));
  });

const serve = (which, states) => (tables[which] = states);

test('the published build, as mainnet serves it (Ledger 9 format): PASS for all 29 circuits, exit 0', async () => {
  serve('one', { ...GENUINE });
  const { code, out } = await verify(['--network', 'mainnet', '--indexer', `${base}/one`]);
  assert.equal(code, 0, out);
  assert.equal((out.match(/^ {2}PASS {2}/gm) ?? []).length, 24 + 5 + 2, out);
  assert.match(out, /PASS {2}proveLicense +b338dda3501ae2de…/);
  assert.match(out, /state read in Ledger 9 format; the contract was compiled for Ledger 8 \(compactc 0\.31\.1\)/);
  assert.match(out, /maintenance authority: 1 key\(s\), threshold 1, counter 16 \(published: 1 key\(s\), threshold 1; the counter is not recorded/);
  assert.match(out, /maintenance authority: retired \(empty committee\), counter 1/);
  assert.match(out, /RESULT: PASS\. On mainnet, every circuit's verifier key matches the published build \(29 of 29\)/);
  assert.doesNotMatch(out, /FAIL/);
});

test('one swapped verifier key: that circuit FAILs with both hashes, exit 1', async () => {
  serve('one', {
    ...GENUINE,
    [MAIN]: edited(MAIN, (s) => s.setOperation('proveLicense', opWith(s.operation('anchor').verifierKey))),
  });
  const { code, out } = await verify(['--indexer', `${base}/one`]);
  assert.equal(code, 1, out);
  assert.match(out, /FAIL {2}proveLicense +on chain 198c0740486feba6…, published b338dda3501ae2de…/);
  assert.equal((out.match(/^ {2}FAIL/gm) ?? []).length, 1, out);
  assert.match(out, /RESULT: FAIL\..*28 of 29 circuits match/);
});

test('a circuit missing, and one the build does not have: both named, exit 1', async () => {
  const s = load9(MAIN);
  const rebuilt = new v9.ContractState();
  for (const n of s.operations()) if (n !== 'discharge') rebuilt.setOperation(n, s.operation(n));
  rebuilt.setOperation('rewriteHolder', opWith(s.operation('anchor').verifierKey));
  rebuilt.maintenanceAuthority = s.maintenanceAuthority;
  serve('one', { ...GENUINE, [MAIN]: hex(rebuilt) });
  const { code, out } = await verify(['--indexer', `${base}/one`, '--contract', 'veilcore']);
  assert.equal(code, 1, out);
  assert.match(out, /FAIL {2}discharge +not on chain/);
  assert.match(out, /FAIL {2}rewriteHolder +on chain, but not a circuit of the published build/);
});

test('the claims contract with a live maintenance key: the authority FAILs, exit 1', async () => {
  serve('one', {
    ...GENUINE,
    [CLAIMS]: edited(CLAIMS, (s) => (s.maintenanceAuthority = new v9.ContractMaintenanceAuthority([v9.signatureVerifyingKey(v9.sampleSigningKey())], 1, 2n))),
  });
  const { code, out } = await verify(['--indexer', `${base}/one`, '--contract', 'veilcore-claims']);
  assert.equal(code, 1, out);
  assert.match(out, /FAIL {2}maintenance authority: 1 key\(s\), threshold 1, counter 2 \(published: retired \(empty committee\)/);
  assert.match(out, /5 of 5 circuits match/);
});

test('a Ledger 8 state with the same keys (a network before its fork) also passes', async () => {
  const s9 = load9(MAIN);
  const s8 = new v8.ContractState();
  for (const n of s9.operations()) {
    const op = new v8.ContractOperation();
    op.verifierKey = s9.operation(n).verifierKey;
    s8.setOperation(n, op);
  }
  s8.maintenanceAuthority = new v8.ContractMaintenanceAuthority([v8.signatureVerifyingKey(v8.sampleSigningKey())], 1, 16n);
  serve('one', { ...GENUINE, [MAIN]: hex(s8) });
  const { code, out } = await verify(['--indexer', `${base}/one`, '--contract', 'veilcore']);
  assert.equal(code, 0, out);
  assert.match(out, /state read in Ledger 8 format/);
});

test('two indexers: agreeing passes; disagreeing cannot check that contract (exit 2), not FAIL', async () => {
  serve('one', { ...GENUINE });
  serve('two', { ...GENUINE });
  let r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /both indexers report the same verifier key for every circuit and the same maintenance authority \(the same state, byte for byte\)/);
  serve('two', { ...GENUINE, [CLAIMS]: edited(CLAIMS, (s) => (s.maintenanceAuthority = new v9.ContractMaintenanceAuthority([], 1, 2n))) });
  r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /CANNOT CHECK {2}the two indexers report different verifier keys or maintenance authority for this contract \(maintenance authority;/);
  assert.match(r.out, /RESULT: CANNOT CHECK: veilcore-claims \(the indexers disagree.*The rest matches: 24 of 24 circuits\./);
  assert.doesNotMatch(r.out, /FAIL|chain does not match/);
  // A contract that really differs is still a FAIL (exit 1), with the disagreement named.
  serve('one', { ...GENUINE, [MAIN]: edited(MAIN, (s) => s.setOperation('proveLicense', opWith(s.operation('anchor').verifierKey))) });
  serve('two', {
    ...GENUINE,
    [MAIN]: edited(MAIN, (s) => s.setOperation('proveLicense', opWith(s.operation('anchor').verifierKey))),
    [CLAIMS]: edited(CLAIMS, (s) => (s.maintenanceAuthority = new v9.ContractMaintenanceAuthority([], 1, 2n))),
  });
  r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /RESULT: FAIL\..*23 of 24 circuits match\. Not checked \(indexers disagree or could not be read\): veilcore-claims\./);
});

test('two indexers a batch apart: the ledger data differs, the keys and authority agree, so it checks (exit 0)', async () => {
  // The main contract's data changes with every anchored batch; the verdict does not rest on it.
  const later = edited(MAIN, (s) => (s.data = new v9.ChargedState(v9.StateValue.newArray().arrayPush(v9.StateValue.newNull()))));
  assert.notEqual(later, GENUINE[MAIN]);
  serve('one', { ...GENUINE });
  serve('two', { ...GENUINE, [MAIN]: later });
  const r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /the rest of the state differs, as it does between batches; it is not what is checked/);
  assert.match(r.out, /RESULT: PASS\..*\(29 of 29\)/);
});

test('two indexers that disagree about one verifier key: that circuit named, exit 2, not FAIL', async () => {
  serve('one', { ...GENUINE });
  serve('two', { ...GENUINE, [MAIN]: edited(MAIN, (s) => s.setOperation('proveLicense', opWith(s.operation('anchor').verifierKey))) });
  const r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`, '--contract', 'veilcore']);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /different verifier keys or maintenance authority for this contract \(proveLicense;/);
  assert.match(r.out, /RESULT: CANNOT CHECK: veilcore \(the indexers disagree/);
  assert.doesNotMatch(r.out, /FAIL/);
});

test('a real FAIL still wins when the second indexer gives an unreadable state for another contract (exit 1)', async () => {
  const bad = edited(MAIN, (s) => s.setOperation('proveLicense', opWith(s.operation('anchor').verifierKey)));
  serve('one', { ...GENUINE, [MAIN]: bad });
  serve('two', { ...GENUINE, [MAIN]: bad, [CLAIMS]: '00ff00ff' });
  const r = await verify(['--indexer', `${base}/one`, '--second-indexer', `${base}/two`]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /CANNOT CHECK {2}A state the indexers gave could not be read/);
  assert.match(r.out, /RESULT: FAIL\..*Not checked \(indexers disagree or could not be read\): veilcore-claims\./);
});

test('an unreadable state from the first indexer leaves that contract not checked (exit 2)', async () => {
  serve('one', { ...GENUINE, [CLAIMS]: '00ff00ff' });
  const r = await verify(['--indexer', `${base}/one`]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /CANNOT CHECK {2}The state the indexer gave for veilcore-claims could not be read/);
  assert.match(r.out, /RESULT: CANNOT CHECK: veilcore-claims/);
  assert.doesNotMatch(r.out, /RESULT: (PASS|FAIL)/);
});

test('cannot check (exit 2): indexer down, no such contract, wrong network, bad arguments', async () => {
  let r = await verify(['--indexer', `${base}/down`]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /CANNOT CHECK: The indexer at 127\.0\.0\.1:\d+ answered HTTP 503/);
  serve('one', {});
  r = await verify(['--indexer', `${base}/one`]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /has no contract at a04de0a2/);
  r = await verify(['--indexer', 'https://indexer.preprod.midnight.network/api/v4/graphql']);
  assert.equal(r.code, 2);
  assert.match(r.out, /is a preprod indexer, but the network is mainnet/);
  r = await verify(['--indexer', 'http://indexer.example.org/graphql']);
  assert.match(r.out, /must be https/);
  r = await verify(['--network', 'testnet-02']);
  assert.match(r.out, /No deployments file for "testnet-02"/);
  r = await verify(['--frobnicate']);
  assert.equal(r.code, 2);
  assert.match(r.out, /Unknown argument --frobnicate/);
});

test('indexer choice: the relay by default with the site origin; a Blockfrost id from the environment, never shown', () => {
  let ix = chooseIndexers(parseArgs([]), d, {});
  assert.equal(ix.first.url, 'https://veilcore-indexer-relay-production.up.railway.app/indexer');
  assert.deepEqual(ix.first.headers, { origin: 'https://veilcore.org' });
  assert.equal(ix.first.operator, 'VeilCore');
  ix = chooseIndexers(parseArgs([]), d, { VEILCORE_BLOCKFROST_PROJECT_ID: 'mainnetAbCdEf123456' });
  assert.equal(ix.first.url, 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetAbCdEf123456');
  assert.equal(ix.first.shown, 'midnight-mainnet.blockfrost.io');
  assert.deepEqual(ix.first.headers, {});
  ix = chooseIndexers(parseArgs(['--indexer', 'https://my.indexer.example/graphql']), d, { VEILCORE_BLOCKFROST_PROJECT_ID: 'mainnetAbCdEf123456' });
  assert.equal(ix.first.url, 'https://my.indexer.example/graphql');
  assert.throws(() => chooseIndexers(parseArgs(['--second-indexer', 'https://veilcore-indexer-relay-production.up.railway.app/indexer']), d, {}), /same indexer/);
  const pre = loadDeployments('preprod');
  assert.deepEqual(chooseIndexers(parseArgs(['--network', 'preprod']), pre, {}).first.headers, { origin: 'https://test.veilcore.org' });
});

test('the project id never appears in the output', async () => {
  const secret = 'mainnetZZsecretZZ0042';
  // Point the Blockfrost entry at nothing reachable: the run fails to connect, and the error
  // names only the host.
  const r = await verify([], { VEILCORE_BLOCKFROST_PROJECT_ID: secret, HTTPS_PROXY: '', https_proxy: '' });
  assert.equal(r.code, 2);
  assert.doesNotMatch(r.out, new RegExp(secret));
  assert.match(r.out, /midnight-mainnet\.blockfrost\.io/);
});

test('the default relay request carries the site origin and the documented query', async () => {
  seen.length = 0;
  serve('one', { ...GENUINE });
  await verify(['--indexer', `${base}/one`, '--contract', 'veilcore']);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].origin, undefined, 'a user-given indexer gets no Origin header');
  assert.match(JSON.parse(seen[0].body).query, /contractAction\(address: \$address\) \{ state \}/);
});
