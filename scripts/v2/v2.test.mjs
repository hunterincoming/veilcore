// Contract v2's deploy, its deployment check and the committee gate, against Midnight's own
// ledger code (ledger-v9, the WebAssembly build of what the node runs) holding the contracts in a
// local LedgerState. No network, wallet, proof server or real key is involved; every key here is
// a throwaway made by the test.
//
//  - the deploy (deploy-core.mjs) deploys both v2 contracts with a temporary key and inserts
//    every key in V4, through the ledger's own checks; a run that stops is finished by --resume;
//  - `npm run verify:deployment -- --v2-record` (run as a user runs it, against a stand-in
//    indexer serving the ledger's states and the transactions' raw bytes) passes that, passes
//    again after the handover, and refuses a key removal, an IR change, a key not in the table, a
//    V3 key, an update the record does not list, and a handover to anything but 3 keys / 2;
//    it does NOT refuse calls;
//  - the gate (scripts/committee/gate.mjs): its two named exceptions, and the key slot from the contract.
//
// The v2 constructor is the compiled one (contract-v2/src/managed, `npm run compact:test -w
// contract-v2`); its circuits are the compiled ones. Every key is the same compactc 0.36.1 key
// (scripts/committee/fixtures/zkir-v3-example.verifier, a real V4 key), so the table here is a
// stand-in for docs/fingerprints-v2.md, which does not exist until the keys are built on the Mac.
// Run (after compiling contract-v2): node --test scripts/v2/v2.test.mjs
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import * as L from 'ledger-v9-committee';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
} from '@midnight-ntwrk/midnight-js-types';
import { ROOT, parseFingerprintsV2, slotOfKey } from './fingerprints.mjs';
import { emptySession, readSession, sessionProblems, writeSession } from './session.mjs';
import { TTL_MARGIN_MS, TTL_MS, buildInsertUpdate, publicKeyOf, runDeploy } from './deploy-core.mjs';
import { constructorDataHex, constructorStateBytes, haveCompiled } from './constructor.mjs';
import { stateFacts, txFacts } from './ledger.mjs';
import { checkV2Contract } from './history.mjs';
import { proofServerImage, stackProblems, REQUIRED } from './stack.mjs';
import { chainSlotProblems, gateProblems, requestSlotProblems, slotForContract } from '../committee/gate.mjs';
import { assembleSigned, authorityView, makeKeyCard, makeRequest, signRequest } from '../committee/core.mjs';

const NET = 'undeployed';
const V4 = new Uint8Array(readFileSync(path.join(ROOT, 'scripts/committee/fixtures/zkir-v3-example.verifier')));
const V3 = new Uint8Array(
  readFileSync(path.join(ROOT, 'node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier')),
);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const hex = (b) => Buffer.from(b).toString('hex');
const newKey = () => L.sampleSigningKey().value;
const sk = (h) => ({ tag: 'schnorr', value: h });

assert.ok(haveCompiled('veilcore') && haveCompiled('veilcore-claims'), 'compile contract-v2 first: npm run compact:test -w contract-v2');
const circuitsOf = async (name) => {
  const m = await import(path.join(ROOT, 'contract-v2/src/managed', name, 'contract/index.js'));
  const noW = new Proxy({}, { get: () => () => undefined });
  return Object.keys(new m.Contract(noW).provableCircuits).sort();
};
const CIRCUITS = { veilcore: await circuitsOf('veilcore'), 'veilcore-claims': await circuitsOf('veilcore-claims') };

/** A stand-in docs/fingerprints-v2.md: every circuit's key is the V4 fixture. */
const TABLE = [
  '# Contract v2 build fingerprints',
  '',
  'Commit 0123456789abcdef0123456789abcdef01234567, compiler 0.36.1.',
  '',
  '| File | SHA-256 |',
  '|---|---|',
  ...Object.entries(CIRCUITS).flatMap(([c, list]) => list.map((n) => `| \`${c}/keys/${n}.verifier\` | \`${sha(V4)}\` |`)),
  '',
].join('\n');
const PINS = parseFingerprintsV2(TABLE).pins;

/** A local chain: the ledger's rules, every transaction kept as finalized bytes (what an indexer serves as `raw`). */
const chain = () => {
  let state = L.LedgerState.blank(NET);
  const strict = new L.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  const txs = new Map();
  let height = 100;
  const apply = (tx) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const v = tx.eraseProofs().wellFormed(state, strict, new Date());
    const [next, result] = state.apply(
      v,
      new L.TransactionContext(state, { secondsSinceEpoch: now, secondsSinceEpochErr: 30, parentBlockHash: '00'.repeat(32), lastBlockTime: now - 6n }),
    );
    if (result.type !== 'success') throw new Error(`refused by the ledger: ${result.error ?? result.type}`);
    state = next;
    // A deploy or a maintenance update is mock-proved to the bytes an indexer serves. A circuit
    // call cannot be (there are no prover keys here), so it is kept with its proofs erased:
    // nothing in these checks reads a call's bytes, and txFacts refuses them.
    let fin;
    try {
      fin = tx.mockProve();
    } catch {
      fin = tx.eraseProofs();
    }
    let txHash;
    try {
      txHash = String(fin.transactionHash()).toLowerCase();
    } catch {
      txHash = sha(fin.serialize()); // an unproven call has no ledger hash; any unique name does here
    }
    const txId = String(fin.identifiers()[0]).toLowerCase();
    height++;
    txs.set(txHash, { raw: hex(fin.serialize()), status: 'SUCCESS', height, txId });
    return { txHash, txId, blockHeight: height, latest: txHash };
  };
  const latest = new Map();
  return {
    apply,
    txs,
    send: async (tx) => {
      const r = apply(tx);
      for (const intent of tx.intents.values())
        for (const a of intent.actions) if (a.address !== undefined) latest.set(String(a.address), r.txHash);
      return r;
    },
    readState: async (address) => {
      try {
        return state.index(address)?.serialize();
      } catch {
        return undefined;
      }
    },
    stateHex: (address) => hex(state.index(address).serialize()),
    latestTx: async (address) => ({ txHash: latest.get(address) }),
    txActions: async (h, address) => {
      try {
        return txFacts(Buffer.from(txs.get(h).raw, 'hex'), address);
      } catch {
        return [];
      }
    },
    ledger: () => state,
    authority: (address) => state.index(address).maintenanceAuthority,
    setLatest: (address, h) => latest.set(address, h),
  };
};

/**
 * A real call: v2's anchorBatch, built by midnight-js from the compiled contract and the
 * contract's state on the local ledger (anyone can make this call; it needs no secret), then
 * applied by the ledger. No prover key is needed: the ledger here does not check proofs.
 */
const realAnchorBatch = async (c, address) => {
  const m = await import(path.join(ROOT, 'contract-v2/src/managed/veilcore/contract/index.js'));
  const noW = new Proxy({}, { get: () => () => undefined });
  const cc = CompiledContract.make('veilcore', m.Contract).pipe(
    CompiledContract.withWitnesses(noW),
    CompiledContract.withCompiledFileAssets(path.join(ROOT, 'contract-v2/src/managed/veilcore')),
  );
  class Keys extends NodeZkConfigProvider {
    async getVerifierKey() {
      return V4;
    }
    async getVerifierKeys(ids) {
      return ids.map((i) => [i, V4]);
    }
  }
  const st = c.ledger();
  const r = await createUnprovenCallTxFromInitialStates(
    new Keys(path.join(ROOT, 'contract-v2/src/managed/veilcore')),
    {
      compiledContract: cc,
      circuitId: 'anchorBatch',
      contractAddress: address,
      args: [new Uint8Array(32).fill(7)],
      coinPublicKey: '00'.repeat(32),
      initialContractState: SerializedContractState.fromBytes('v9', st.index(address).serialize()),
      initialZswapChainState: SerializedZswapChainState.fromBytes('v9', st.zswap.serialize()),
      ledgerParameters: SerializedLedgerParameters.fromBytes('v9', st.parameters.serialize()),
      config: { networkId: NET, ttlSeconds: 3600 },
    },
    '00'.repeat(32),
  );
  const before = Buffer.from(st.index(address).serialize()).toString('hex');
  const out = await c.send(r.private.unprovenTx.deserialize({ v9: L.Transaction }));
  assert.notEqual(Buffer.from(c.ledger().index(address).serialize()).toString('hex'), before, 'the call changed the state');
  return out;
};

const tmp = () => mkdtempSync(path.join(tmpdir(), 'veilcore-v2-'));

/** Deploy both v2 contracts on `c` with a fresh temporary key; returns the record, its file and the key. */
const deploy = async (c, extra = {}) => {
  const key = newKey();
  const dir = tmp();
  const file = path.join(dir, 'record.json');
  const record = emptySession({ network: NET, commit: 'test', compiler: '0.36.1', fingerprintsSha256: sha(Buffer.from(TABLE)), publicKey: publicKeyOf(key) });
  writeSession(file, record, { first: true });
  const lines = [];
  await runDeploy({
    network: NET,
    record,
    save: (r) => writeSession(file, r),
    signingKey: key,
    pins: PINS,
    constructorBytes: (n) => constructorStateBytes(n),
    localKey: () => V4,
    send: c.send,
    readState: c.readState,
    latestTx: c.latestTx,
    txActions: c.txActions,
    wait: async () => undefined,
    log: (l) => lines.push(l),
    ...extra,
  });
  return { key, file, dir, record: readSession(file), lines };
};

/** A maintenance update on `address` signed by `key`, sent through the ledger. */
const sendUpdate = async (c, address, instructions, key) => {
  let u = new L.MaintenanceUpdate(address, instructions, c.authority(address).counter);
  u = u.addSignature(0n, L.signData(sk(key), u.dataToSign));
  return c.send(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(new Date(Date.now() + 3_600_000)).addMaintenanceUpdate(u)));
};

/** The handover, as the committee launcher builds it (core.mjs), signed by the temporary key. */
const handover = async (c, address, key) => {
  const keys = ['hunter', 'mako', 'backup'].map((h) => [h, newKey()]);
  const cards = keys.map(([h, k]) => makeKeyCard(h, k));
  const req = makeRequest({
    network: NET,
    contractAddress: address,
    current: { ...authorityView(c.authority(address)), keySlot: 'v4' },
    actions: [{ kind: 'replace-authority', committee: cards, threshold: 2 }],
    forbid: [publicKeyOf(key)],
  });
  const a = assembleSigned(req, [signRequest(req, key)], c.authority(address));
  assert.ok(a.ok, a.ok ? '' : a.problems.join(' '));
  const r = await c.send(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(new Date(Date.now() + 3_600_000)).addMaintenanceUpdate(a.update)));
  return { req, txHash: r.txHash, txId: r.txId, committee: cards.map((x) => x.publicKey) };
};

// ─────────────────────────────── a stand-in indexer, and verify:deployment run as a user runs it

let server;
let base;
let current; // the chain the indexer serves
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const { query, variables } = JSON.parse(body);
      res.writeHead(200, { 'content-type': 'application/json' });
      if (query.includes('VEILCORE_STATE')) {
        let state = null;
        try {
          state = current.stateHex(variables.address);
        } catch {
          state = null;
        }
        res.end(JSON.stringify({ data: { contractAction: state === null ? null : { state } } }));
        return;
      }
      if (query.includes('VEILCORE_V2_TX')) {
        const want = variables.offset.hash ?? variables.offset.identifier;
        const found = [...current.txs.entries()].find(([h, t]) => h === want || t.txId === want);
        const tx = found
          ? { hash: found[0], raw: found[1].raw, block: { height: found[1].height, hash: '00'.repeat(32) }, transactionResult: { status: found[1].status } }
          : null;
        res.end(JSON.stringify({ data: { transactions: tx === null ? [] : [tx] } }));
        return;
      }
      res.end(JSON.stringify({ errors: [{ message: 'unknown query' }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const verify = (args) =>
  new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', '--import', './api/test-ts-resolve.mjs', 'scripts/verify-deployment.mjs', ...args],
      { cwd: ROOT, env: { PATH: process.env.PATH } },
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });

/** verify:deployment --v2-record on the record, against `c` (network "preprod": the indexer is the stand-in). */
const verifyV2 = async (c, d, extra = []) => {
  current = c;
  const tableFile = path.join(d.dir, 'fingerprints-v2.md');
  if (!existsSync(tableFile)) writeFileSync(tableFile, TABLE);
  const rec = path.join(d.dir, 'record-preprod.json');
  writeFileSync(rec, JSON.stringify({ ...JSON.parse(readFileSync(d.file, 'utf8')), network: 'preprod' }));
  return verify(['--network', 'preprod', '--indexer', `${base}/one`, '--v2-record', rec, '--fingerprints', tableFile, ...extra]);
};

const receipt = (d, h, address) => {
  const f = path.join(d.dir, `receipt-${address.slice(0, 8)}.json`);
  writeFileSync(
    f,
    JSON.stringify({ network: 'preprod', contractAddress: address, transaction: h.txId, transactionHash: h.txHash, request: h.req }),
  );
  return f;
};

// ───────────────────────────────────────────────────────────────── the deploy

test('deploy: both contracts, the temporary key alone, every key in V4, one update each; nothing else', async () => {
  const c = chain();
  const d = await deploy(c);
  assert.deepEqual(sessionProblems(d.record), []);
  for (const name of ['veilcore', 'veilcore-claims']) {
    const e = d.record.contracts[name];
    const f = stateFacts(await c.readState(e.address));
    assert.deepEqual(Object.keys(f.ops).sort(), CIRCUITS[name]);
    for (const o of Object.values(f.ops)) assert.deepEqual(o, { sha256: sha(V4), slot: 'v4' });
    assert.deepEqual(f.authority, { committee: [publicKeyOf(d.key)], threshold: 1, counter: BigInt(CIRCUITS[name].length) });
    assert.equal(e.updates.length, CIRCUITS[name].length);
    assert.equal(e.pending, null);
    // The deploy carried no key, the constructor's data, and the temporary key at counter 0.
    const dep = txFacts(Buffer.from(c.txs.get(e.deploy.txHash).raw, 'hex'), e.address);
    assert.equal(dep.length, 1);
    assert.deepEqual(dep[0].state.ops, {});
    assert.equal(dep[0].state.dataHex, await constructorDataHex(name));
    assert.deepEqual(dep[0].state.authority, { committee: [publicKeyOf(d.key)], threshold: 1, counter: 0n });
  }
  assert.equal(CIRCUITS.veilcore.length + CIRCUITS['veilcore-claims'].length, 29);
  // The record holds no secret: the key appears nowhere in it.
  assert.doesNotMatch(readFileSync(d.file, 'utf8'), new RegExp(d.key));
  assert.match(readFileSync(d.file, 'utf8'), /never by the contractVersion or predecessor fields/);
});

test('deploy: several keys per update; the counter moves by one per update', async () => {
  const c = chain();
  const d = await deploy(c, { perUpdate: 8 });
  assert.equal(d.record.contracts.veilcore.updates.length, 3);
  assert.equal(d.record.contracts['veilcore-claims'].updates.length, 1);
  assert.equal(c.authority(d.record.contracts.veilcore.address).counter, 3n);
});

test('deploy: refuses a local key that is not the published V4 key, and a key that is not the record’s, before sending', async () => {
  const c = chain();
  let sent = 0;
  const send = async (tx) => (sent++, c.send(tx));
  await assert.rejects(deploy(c, { send, localKey: () => V3 }), /not a V4 key/);
  await assert.rejects(deploy(c, { send, localKey: () => V4.slice(0, V4.length - 1) }), /not the one in docs\/fingerprints-v2\.md/);
  const record = emptySession({ network: NET, commit: 't', compiler: '0.36.1', fingerprintsSha256: '00'.repeat(32), publicKey: publicKeyOf(newKey()) });
  await assert.rejects(
    runDeploy({ network: NET, record, save: () => undefined, signingKey: newKey(), pins: PINS, log: () => undefined }),
    /not this record's temporary key/,
  );
  assert.equal(sent, 0);
});

test('deploy: a send that landed but did not confirm is finished by --resume, from the chain', async () => {
  const c = chain();
  let n = 0;
  const flaky = async (tx) => {
    const r = await c.send(tx);
    if (++n === 4) throw new Error('confirmation lost');
    return r;
  };
  const key = newKey();
  const dir = tmp();
  const file = path.join(dir, 'r.json');
  const record = emptySession({ network: NET, commit: 't', compiler: '0.36.1', fingerprintsSha256: '00'.repeat(32), publicKey: publicKeyOf(key) });
  writeSession(file, record, { first: true });
  const deps = {
    network: NET,
    save: (r) => writeSession(file, r),
    signingKey: key,
    pins: PINS,
    constructorBytes: (x) => constructorStateBytes(x),
    localKey: () => V4,
    readState: c.readState,
    latestTx: c.latestTx,
    txActions: c.txActions,
    wait: async () => undefined,
    log: () => undefined,
  };
  await assert.rejects(runDeploy({ ...deps, record, send: flaky }), /confirmation lost/);
  const half = readSession(file);
  assert.equal(half.contracts.veilcore.pending.kind, 'update');
  await runDeploy({ ...deps, record: half, send: c.send });
  const done = readSession(file);
  assert.equal(done.contracts.veilcore.updates.length, 24);
  assert.equal(done.contracts.veilcore.updates[2].txHash, [...c.txs.keys()][3]);
  // And the deployment check accepts what the resumed run recorded.
  const v = await verifyV2(c, { dir, file });
  assert.equal(v.code, 0, v.out);
});

test('the record: never written over, never into a pinned list', () => {
  const dir = tmp();
  const f = path.join(dir, 'x.json');
  const r = emptySession({ network: NET, commit: 't', compiler: '0.36.1', fingerprintsSha256: '00'.repeat(32), publicKey: '11'.repeat(32) });
  writeSession(f, r, { first: true });
  assert.throws(() => writeSession(f, r, { first: true }), /never written over/);
  assert.throws(() => writeSession(path.join(ROOT, 'deployments', 'v2.json'), r, { first: true }), /pinned list/);
  assert.throws(() => writeSession(path.join(ROOT, 'api/src/deploy-guard.ts'), r), /pinned list/);
  assert.match(sessionProblems({ ...r, keySlot: 'v3' }).join(' '), /keys are in V4/);
  // A record naming one of v1's pinned addresses as v2 is refused when it is read.
  const v1 = JSON.parse(readFileSync(path.join(ROOT, 'deployments/mainnet.json'), 'utf8')).contracts.find((x) => x.name === 'veilcore-claims').address;
  const bad = emptySession({ network: 'mainnet', commit: 't', compiler: '0.36.1', fingerprintsSha256: '00'.repeat(32), publicKey: '11'.repeat(32) });
  bad.contracts.veilcore.address = v1;
  const f2 = path.join(dir, 'v1-as-v2.json');
  writeSession(f2, bad, { first: true });
  assert.throws(() => readSession(f2), /is a pinned v1 address, never a v2 one/);
});

// ──────────────────────────────────────────────────────── the deployment check

test('verify:deployment --v2-record: PASS with the temporary key; PASS again after the handover', async () => {
  const c = chain();
  const d = await deploy(c);
  let v = await verifyV2(c, d);
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /one key, not yet handed to the committee/);
  assert.match(v.out, /24 of 24 circuits match docs\/fingerprints-v2\.md \(V4\)/);
  assert.match(v.out, /5 of 5 circuits match/);
  assert.match(v.out, /exactly the v2 constructor's ledger data/);
  assert.match(v.out, /calls are not checked/);
  assert.match(v.out, /RESULT: PASS/);

  const main = d.record.contracts.veilcore.address;
  const h = await handover(c, main, d.key);
  v = await verifyV2(c, d, ['--receipt', receipt(d, h, main)]);
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /the 2-of-3 committee the handover installed, counter 25/);
  assert.match(v.out, /held by the 2-of-3 committee/);
  // Without the receipt the same chain is refused: the record does not account for the handover.
  v = await verifyV2(c, d);
  assert.equal(v.code, 1, v.out);
  assert.match(v.out, /expected the temporary key .* at counter 24/);
});

test('verify:deployment --v2-record refuses every maintenance update that is not a listed V4 insert or the handover', async () => {
  const cases = [
    ['a key removal', (main, key) => [new L.VerifierKeyRemove(CIRCUITS.veilcore[0], new L.ContractOperationVersion('v4'))], /REMOVES the key of/],
    ['an IR change', (main) => [new L.IrInsert(CIRCUITS.veilcore[0], new Uint8Array([1, 2, 3]))], /changes the IR of .*IrInsert/],
    ['a V3 key', () => [new L.VerifierKeyInsert('extraCircuit', new L.ContractOperationVersionedVerifierKey('v3', V3))], /not a circuit of the published build/],
    ['a V3 key beside a v2 circuit\u2019s V4 key', () => [new L.VerifierKeyInsert(CIRCUITS.veilcore[0], new L.ContractOperationVersionedVerifierKey('v3', V3))], /in slot v3 \(a v3 key\); v2 takes V4 keys only/],
  ];
  for (const [what, instructions, why] of cases) {
    const c = chain();
    const d = await deploy(c);
    const main = d.record.contracts.veilcore.address;
    const r = await sendUpdate(c, main, instructions(main, d.key), d.key);
    // Listed in the record, as if the tool had done it: still refused.
    const rec = JSON.parse(readFileSync(d.file, 'utf8'));
    rec.contracts.veilcore.updates.push({ counter: String(rec.contracts.veilcore.updates.length), circuits: ['x'], txHash: r.txHash });
    writeFileSync(d.file, JSON.stringify(rec));
    const v = await verifyV2(c, d, ['--contract', 'veilcore']);
    assert.equal(v.code, 1, `${what}: ${v.out}`);
    assert.match(v.out, why, what);
    assert.match(v.out, /RESULT: FAIL/, what);
  }
});

test('verify:deployment --v2-record refuses an update the record does not list (the counter gives it away)', async () => {
  const c = chain();
  const d = await deploy(c);
  const claims = d.record.contracts['veilcore-claims'].address;
  // The same published key, once more, on a circuit that is not v2's: not listed anywhere.
  await sendUpdate(c, claims, [new L.VerifierKeyInsert('rewriteHolder', new L.ContractOperationVersionedVerifierKey('v4', V4))], d.key);
  const v = await verifyV2(c, d, ['--contract', 'veilcore-claims']);
  assert.equal(v.code, 1, v.out);
  assert.match(v.out, /rewriteHolder +on chain, but not a circuit of the published v2 build/);
  assert.match(v.out, /the chain shows 1 update\(s\) the record does not list: refused/);
});

test('verify:deployment --v2-record refuses a handover to anything but 3 different keys, threshold 2', async () => {
  const c = chain();
  const d = await deploy(c);
  const main = d.record.contracts.veilcore.address;
  const two = [newKey(), newKey()].map((k) => L.signatureVerifyingKey(sk(k)));
  const r = await sendUpdate(
    c,
    main,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority(two, 2, c.authority(main).counter + 1n))],
    d.key,
  );
  const f = path.join(d.dir, 'bad-receipt.json');
  const cards = two.map((k, i) => ({ publicKey: k.value, holder: `h${i}` }));
  writeFileSync(
    f,
    JSON.stringify({ network: 'preprod', contractAddress: main, transactionHash: r.txHash, request: { actions: [{ kind: 'replace-authority', committee: cards }] } }),
  );
  const v = await verifyV2(c, d, ['--contract', 'veilcore', '--receipt', f]);
  assert.equal(v.code, 1, v.out);
  assert.match(v.out, /installs 2 key\(s\) with threshold 2, not 3 different keys with threshold 2/);
});

test('verify:deployment never refuses a call: a real anchorBatch by anyone, then PASS', async () => {
  const c = chain();
  const d = await deploy(c);
  const main = d.record.contracts.veilcore.address;
  await realAnchorBatch(c, main);
  await realAnchorBatch(c, main);
  const v = await verifyV2(c, d);
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /RESULT: PASS/);
});

test('history: "how it started" FAILS, never skips, when the constructor cannot be computed here', async () => {
  const c = chain();
  const d = await deploy(c);
  const e = d.record.contracts.veilcore;
  const read = (ref) => ({ ref, status: 'SUCCESS', actions: txFacts(Buffer.from(c.txs.get(ref.txHash).raw, 'hex'), e.address) });
  const r = checkV2Contract({
    name: 'veilcore',
    pins: PINS.veilcore,
    temporaryKey: d.record.temporaryKey.publicKey,
    current: stateFacts(await c.readState(e.address)),
    deploy: read(e.deploy),
    updates: e.updates.map(read),
    constructorDataHex: undefined,
  });
  assert.equal(r.ok, false);
  assert.match(r.lines.join('\n'), /FAIL {2}how it started: cannot be checked here: contract-v2 is not compiled/);
});

// ───────────────────────────────────────────────── a resume after a send that stopped

/** A record and the deploy-core dependencies, for runs driven step by step. */
const session = (c) => {
  const key = newKey();
  const dir = tmp();
  const file = path.join(dir, 'r.json');
  writeSession(
    file,
    emptySession({ network: NET, commit: 't', compiler: '0.36.1', fingerprintsSha256: '00'.repeat(32), publicKey: publicKeyOf(key) }),
    { first: true },
  );
  const deps = {
    network: NET,
    save: (r) => writeSession(file, r),
    signingKey: key,
    pins: PINS,
    constructorBytes: (x) => constructorStateBytes(x),
    localKey: () => V4,
    readState: c.readState,
    latestTx: c.latestTx,
    txActions: c.txActions,
    wait: async () => undefined,
    log: () => undefined,
  };
  return { key, dir, file, deps, read: () => readSession(file) };
};

test('resume after a deploy sent but not seen: waits out its validity, never redeploys early, never drops the address', async () => {
  const c = chain();
  const s = session(c);
  const t0 = Date.now();
  let held;
  // The deploy is handed to the network, the confirmation is lost, and the indexer has not seen it.
  const lost = async (tx) => {
    held = tx;
    throw new Error('websocket closed');
  };
  await assert.rejects(runDeploy({ ...s.deps, record: s.read(), send: lost, now: () => t0 }), /websocket closed/);
  const first = s.read().contracts.veilcore;
  assert.equal(first.pending.kind, 'deploy');
  assert.ok(first.address);
  // A resume within the hour (plus margin) refuses to deploy again, and keeps the address.
  let sent = 0;
  const count = async (tx) => (sent++, c.send(tx));
  await assert.rejects(
    runDeploy({ ...s.deps, record: s.read(), send: count, now: () => t0 + TTL_MS + TTL_MARGIN_MS - 1 }),
    /may still land until .* Never start a new deploy/,
  );
  assert.equal(sent, 0);
  assert.equal(s.read().contracts.veilcore.address, first.address);
  // It lands late: the resume finds it, checks its transaction really is that deploy, and goes on.
  await c.send(held);
  await runDeploy({ ...s.deps, record: s.read(), send: count });
  const done = s.read().contracts.veilcore;
  assert.equal(done.address, first.address);
  assert.equal(done.updates.length, 24);
  assert.deepEqual(done.abandoned, []);
});

test('resume after a deploy that never landed: only past its validity, and the old address is kept as abandoned', async () => {
  const c = chain();
  const s = session(c);
  const t0 = Date.now();
  await assert.rejects(
    runDeploy({ ...s.deps, record: s.read(), send: async () => Promise.reject(new Error('timeout')), now: () => t0 }),
    /timeout/,
  );
  const lostAddress = s.read().contracts.veilcore.address;
  // Seventy-one minutes later (the record's validity moved back, as the real clock would have moved on).
  const later = s.read();
  later.contracts.veilcore.pending.ttlEnds = new Date(t0 - TTL_MARGIN_MS - 60_000).toISOString();
  writeSession(s.file, later);
  await runDeploy({ ...s.deps, record: s.read(), send: c.send });
  const done = s.read().contracts.veilcore;
  assert.notEqual(done.address, lostAddress);
  assert.equal(done.abandoned.length, 1);
  assert.equal(done.abandoned[0].address, lostAddress);
  // verify shows it, so it is never forgotten.
  const v = await verifyV2(c, { dir: s.dir, file: s.file });
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, new RegExp(`abandoned deploy at ${lostAddress}.*it can no longer land; never pin it`));
  // A record with a pending deploy and no validity time (from an older tool) never redeploys on its own.
  const c2 = chain();
  const s2 = session(c2);
  await assert.rejects(runDeploy({ ...s2.deps, record: s2.read(), send: async () => Promise.reject(new Error('x')) }), /x/);
  const old = s2.read();
  delete old.contracts.veilcore.pending.ttlEnds;
  writeSession(s2.file, old);
  await assert.rejects(runDeploy({ ...s2.deps, record: s2.read(), send: c2.send }), /does not say until when it could land/);
  assert.equal(s2.read().contracts.veilcore.address, old.contracts.veilcore.address);
});

test('resume after an update landed unconfirmed and someone then called v2: the call is never recorded as the update', async () => {
  const c = chain();
  const s = session(c);
  let n = 0;
  // Sends 1 to 4 go through (the deploy and the updates at counters 0, 1, 2: anchorBatch's key
  // is on). Send 5, the update at counter 3, lands but its confirmation is lost.
  const flaky = async (tx) => {
    const r = await c.send(tx);
    if (++n === 5) throw new Error('confirmation lost');
    return r;
  };
  await assert.rejects(runDeploy({ ...s.deps, record: s.read(), send: flaky }), /confirmation lost/);
  const main = s.read().contracts.veilcore.address;
  const landed = [...c.txs.keys()].at(-1);
  // An outsider calls anchorBatch: it is now the contract's latest transaction.
  const call = await realAnchorBatch(c, main);
  assert.equal((await c.latestTx(main)).txHash, call.txHash);
  // The resume refuses to record the call as the update, and says how to go on.
  await assert.rejects(runDeploy({ ...s.deps, record: s.read(), send: c.send }), /does not hold it: another transaction .* --landed-tx/);
  assert.equal(s.read().contracts.veilcore.updates.length, 3);
  // A wrong --landed-tx is refused the same way; the right one is recorded.
  await assert.rejects(runDeploy({ ...s.deps, record: s.read(), send: c.send, landedTx: call.txHash }), /given with --landed-tx/);
  await runDeploy({ ...s.deps, record: s.read(), send: c.send, landedTx: landed });
  assert.equal(s.read().contracts.veilcore.updates[3].txHash, landed);
  const v = await verifyV2(c, { dir: s.dir, file: s.file });
  assert.equal(v.code, 0, v.out);
});

// ───────────────────────────────────────────────────────────── the client stack

test('the stack: refused until midnight-js 5.0.1, ledger-v9 1.0.2, runtime 4.0.2 and proof server 9.0.2 by digest', () => {
  const good = (pkg) => REQUIRED[pkg];
  const yml = (img) => () => `services:\n  proof-server:\n    image: ${img}\n`;
  const D = 'a'.repeat(64);
  assert.deepEqual(stackProblems({ version: good, yml: yml(`midnightntwrk/proof-server:9.0.2@sha256:${D}`) }), []);
  const old = stackProblems({ version: (p) => (p === '@midnightntwrk/ledger-v9' ? '1.0.0' : good(p)), yml: yml(`midnightntwrk/proof-server:9.0.2@sha256:${D}`) });
  assert.match(old.join(' '), /@midnightntwrk\/ledger-v9 is 1\.0\.0; contract v2 needs 1\.0\.2.*step 8/);
  assert.match(stackProblems({ version: good, yml: yml(`midnightntwrk/proof-server:9.0.1@sha256:${D}`) }).join(' '), /proof server is 9\.0\.1/);
  assert.match(stackProblems({ version: good, yml: yml('midnightntwrk/proof-server:9.0.2') }).join(' '), /not pinned by its digest/);
  assert.deepEqual(proofServerImage(`    image: midnightntwrk/proof-server:9.0.2@sha256:${D}\n`), { tag: '9.0.2', digest: D });
});

// ──────────────────────────────────────────────────────────────────── the gate

test('gate: 3 keys and threshold 2 pass; 3-of-3, 2-of-2 and a single key are refused outside the two exceptions', () => {
  const k = () => publicKeyOf(newKey());
  const V1 = 'a0'.repeat(32);
  const base = { network: 'mainnet', address: V1, pinnedV1Address: V1, actions: [{ kind: 'remove-key', circuit: 'x', keySlot: 'v3' }] };
  assert.deepEqual(gateProblems({ ...base, current: { committee: [k(), k(), k()], threshold: 2, counter: 3n } }), []);
  for (const current of [
    { committee: [k(), k(), k()], threshold: 3, counter: 3n },
    { committee: [k(), k()], threshold: 2, counter: 3n },
    { committee: [k()], threshold: 1, counter: 3n },
  ])
    assert.match(gateProblems({ ...base, current }).join(' '), /every change needs a contract held by 3 keys/);
  // Test networks are not gated.
  assert.deepEqual(gateProblems({ ...base, network: 'preprod', current: { committee: [k()], threshold: 1, counter: 0n } }), []);
});

test('gate, exception 2: one retire on v1’s pinned address with the single key, nothing else, nowhere else', () => {
  const V1 = 'a0'.repeat(32);
  const single = { committee: [publicKeyOf(newKey())], threshold: 1, counter: 16n };
  const g = (address, actions) => gateProblems({ network: 'mainnet', address, pinnedV1Address: V1, current: single, actions });
  assert.deepEqual(g(V1, [{ kind: 'retire' }]), []);
  assert.match(g(V1, [{ kind: 'replace-authority', committee: [], threshold: 2 }]).join(' '), /only change allowed is one retire/);
  assert.match(g(V1, [{ kind: 'retire' }, { kind: 'retire' }]).join(' '), /only change allowed is one retire/);
  assert.match(g('b0'.repeat(32), [{ kind: 'retire' }]).join(' '), /not held by a 2-of-3 committee/);
  // v1 is matched first: a record that names v1's address as v2 opens no v2 exception on it.
  const asV2 = { address: V1, temporaryKey: single.committee[0], pins: PINS.veilcore };
  const v4Insert = { kind: 'insert-key', circuit: CIRCUITS.veilcore[0], verifierKey: hex(V4), verifierKeySha256: sha(V4), keySlot: 'v4' };
  assert.match(gateProblems({ network: 'mainnet', address: V1, pinnedV1Address: V1, current: single, actions: [v4Insert], v2: asV2 }).join(' '), /only change allowed is one retire/);
  assert.deepEqual(slotForContract({ network: 'mainnet', address: V1, pinnedV1Address: V1, v2: asV2 }), { slot: 'v3' });
});

test('gate, exception 1: v2 before the handover takes listed V4 inserts and one handover, nothing else', () => {
  const V1 = 'a0'.repeat(32);
  const temp = publicKeyOf(newKey());
  const v2 = { address: 'c0'.repeat(32), temporaryKey: temp, pins: PINS.veilcore };
  const single = { committee: [temp], threshold: 1, counter: 4n };
  const g = (actions, current = single, extra = {}) =>
    gateProblems({ network: 'mainnet', address: v2.address, pinnedV1Address: V1, current, actions, v2, ...extra });
  const insert = (circuit, vk = V4, keySlot = 'v4') => ({ kind: 'insert-key', circuit, verifierKey: hex(vk), verifierKeySha256: sha(vk), keySlot });
  const cards = ['a', 'b', 'c'].map((h) => makeKeyCard(h, newKey()));
  assert.deepEqual(g([insert(CIRCUITS.veilcore[0]), insert(CIRCUITS.veilcore[1])]), []);
  assert.deepEqual(g([{ kind: 'replace-authority', committee: cards, threshold: 2 }]), []);
  // Refused: a key not in the table, a V3 key, a key with no slot, any removal, any retire, a 2-key handover.
  assert.match(g([insert('notACircuit')]).join(' '), /not a circuit in docs\/fingerprints-v2\.md/);
  assert.match(g([insert(CIRCUITS.veilcore[0], V3, 'v3')]).join(' '), /not for slot V4/);
  assert.match(g([{ ...insert(CIRCUITS.veilcore[0]), keySlot: undefined }]).join(' '), /not for slot V4/);
  assert.match(g([{ kind: 'remove-key', circuit: CIRCUITS.veilcore[0], keySlot: 'v4' }]).join(' '), /"remove-key" is not allowed/);
  // One retire, alone, closes an abandoned v2 for good (design condition 7); not with anything else.
  assert.deepEqual(g([{ kind: 'retire' }]), []);
  assert.match(g([insert(CIRCUITS.veilcore[0]), { kind: 'retire' }]).join(' '), /a retire goes alone/);
  assert.match(g([{ kind: 'replace-authority', committee: cards.slice(0, 2), threshold: 2 }]).join(' '), /must install 3 keys/);
  // Refused: a v2 that already has another single key, or no table to check keys against.
  assert.match(g([insert(CIRCUITS.veilcore[0])], { ...single, committee: [publicKeyOf(newKey())] }).join(' '), /not the temporary key/);
  assert.match(gateProblems({ network: 'mainnet', address: v2.address, pinnedV1Address: V1, current: single, actions: [insert(CIRCUITS.veilcore[0])], v2: { ...v2, pins: undefined } }).join(' '), /no v2 key can be checked/);
  // Once a committee holds v2, the ordinary rule applies (2 of 3 sign anything).
  assert.deepEqual(g([{ kind: 'remove-key', circuit: 'x', keySlot: 'v4' }], { committee: cards.map((x) => x.publicKey), threshold: 2, counter: 30n }), []);
});

test('gate: the key slot comes from the contract, never from the request', () => {
  const V1 = 'a0'.repeat(32);
  const v2 = { address: 'c0'.repeat(32), temporaryKey: '11'.repeat(32) };
  assert.deepEqual(slotForContract({ network: 'mainnet', address: V1, pinnedV1Address: V1, v2 }), { slot: 'v3' });
  assert.deepEqual(slotForContract({ network: 'mainnet', address: v2.address, pinnedV1Address: V1, v2 }), { slot: 'v4' });
  assert.match(slotForContract({ network: 'mainnet', address: v2.address, pinnedV1Address: V1, v2, named: 'v3' }).problem, /in slot V4 \(contract v2\), not V3/);
  assert.match(slotForContract({ network: 'mainnet', address: 'd0'.repeat(32), pinnedV1Address: V1, v2 }).problem, /only on the pinned v1 contract or on the v2 contract/);
  assert.match(slotForContract({ network: 'preprod', address: 'd0'.repeat(32), pinnedV1Address: V1 }).problem, /Say which slot/);
  assert.deepEqual(slotForContract({ network: 'preprod', address: 'd0'.repeat(32), pinnedV1Address: V1, named: 'v4' }), { slot: 'v4' });
  // A request for v2 that leaves the slot out (so V3, the old default) is refused.
  const req = { current: { committee: [], threshold: 1, counter: '0' }, actions: [{ kind: 'insert-key', circuit: 'anchor' }] };
  assert.match(requestSlotProblems(req, 'v4').join(' '), /must say V4/);
  assert.match(requestSlotProblems({ ...req, current: { ...req.current, keySlot: 'v4' } }, 'v4').join(' '), /is for slot V3, not V4/);
  assert.deepEqual(requestSlotProblems({ current: { keySlot: 'v4' }, actions: [{ kind: 'insert-key', circuit: 'a', keySlot: 'v4' }] }, 'v4'), []);
  // The chain's own keys, read right before sending.
  assert.deepEqual(chainSlotProblems({ a: 'v4', b: 'v4' }, 'v4'), []);
  assert.match(chainSlotProblems({ a: 'v4', b: 'v3' }, 'v4').join(' '), /key of "b" is a V3 key/);
  assert.equal(slotOfKey(V4), 'v4');
});

test('core: an insert whose key has no V3 or V4 header is refused before signing', () => {
  const c = chain();
  const key = newKey();
  const cs = new L.ContractState();
  cs.maintenanceAuthority = new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(sk(key))], 1, 0n);
  const dep = new L.ContractDeploy(cs);
  c.apply(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(new Date(Date.now() + 3_600_000)).addDeploy(dep)));
  const junk = new Uint8Array(64).fill(7);
  assert.throws(
    () =>
      makeRequest({
        network: NET,
        contractAddress: dep.address,
        current: { ...authorityView(c.authority(dep.address)), keySlot: 'v4' },
        actions: [{ kind: 'insert-key', circuit: 'a', verifierKey: hex(junk), verifierKeySha256: sha(junk), keySlot: 'v4' }],
      }),
    /does not start with a V3 or V4 key header/,
  );
  // buildInsertUpdate (the deploy's own path) is only ever given keys checked against the table.
  assert.ok(buildInsertUpdate(NET, dep.address, [['a', V4]], 0n, key).update);
});

// ───────────────────────────────────────────────────── the v2 proof server pin (one place)

test('proof server 9.0.2: one pin in bboard-cli/proof-server-v2.yml, refused until its digest is filled in', async () => {
  const ps = await import('./proof-server.mjs');
  const repo = readFileSync(ps.V2_PROOF_SERVER_FILE, 'utf8');
  const pin = ps.readPin(repo);
  assert.equal(pin.tag, '9.0.2');
  // Either still waiting for the Mac's digest, or pinned by one; never anything else.
  const p = ps.pinProblems(repo);
  if (pin.filled) assert.deepEqual(p, []);
  else assert.match(p.join(' '), /digest is not filled in yet.*step 8/);
  // The deploy's stack check reads the same file.
  assert.equal((await import('./stack.mjs')).PROOF_SERVER_FILE, ps.V2_PROOF_SERVER_FILE);

  const D = 'b'.repeat(64);
  const filled = ps.withDigest(repo, `midnightntwrk/proof-server@sha256:${D}`);
  assert.deepEqual(ps.pinProblems(filled), []);
  assert.equal(ps.readPin(filled).digest, D);
  assert.equal(ps.withDigest(repo, `sha256:${D}`), filled);
  assert.equal(filled.split('\n').length, repo.split('\n').length, 'only the image line changes');
  for (const bad of ['', 'sha256:' + 'B'.repeat(64), 'sha256:' + 'b'.repeat(63), D, `midnightntwrk/proof-server:9.0.2`])
    assert.throws(() => ps.withDigest(repo, bad), /not a digest/);
  assert.match(ps.pinProblems(filled.replace(':9.0.2@', ':9.0.1@')).join(' '), /9\.0\.1; contract v2 needs 9\.0\.2/);
  assert.match(ps.pinProblems('services: {}\n').join(' '), /names no proof-server image/);
});

test('proof server 9.0.2: the running server must say it is 9.0.2', async () => {
  const ps = await import('./proof-server.mjs');
  assert.deepEqual(ps.versionProblems('9.0.2'), []);
  for (const pre of ['9.0.2-rc1', '9.0.2-rc.1', 'v9.0.2+build.7', '9.0.2-alpha'])
    assert.match(ps.versionProblems(pre).join(' '), /needs exactly 9\.0\.2/, pre);
  assert.deepEqual(ps.versionProblems('"9.0.2"\n'), []);
  assert.match(ps.versionProblems('9.0.1').join(' '), /says it is 9\.0\.1/);
  assert.match(ps.versionProblems('9.0.2 (ledger 9.0.0)').join(' '), /says it is 9\.0\.2, 9\.0\.0/);
  assert.match(ps.versionProblems('ok').join(' '), /did not say its version/);
  const asked = [];
  const answer = (status, body) => async (url) => {
    asked.push(String(url));
    return { ok: status === 200, status, text: async () => body };
  };
  assert.deepEqual(await ps.checkRunningProofServer('http://127.0.0.1:6300', answer(200, '9.0.2')), []);
  assert.equal(asked[0], 'http://127.0.0.1:6300/version');
  assert.match((await ps.checkRunningProofServer('http://127.0.0.1:6300', answer(200, '9.0.1'))).join(' '), /9\.0\.1/);
  assert.match((await ps.checkRunningProofServer('http://127.0.0.1:6300', answer(404, ''))).join(' '), /HTTP 404/);
  const down = async () => {
    throw new Error('connection refused');
  };
  assert.match((await ps.checkRunningProofServer('http://127.0.0.1:6300', down)).join(' '), /connection refused/);
});

test('proof server 9.0.2: pinned only when Midnight\'s GitHub release names the digest Docker pulled', async () => {
  const ps = await import('./proof-server.mjs');
  const D = 'c'.repeat(64);
  const line = `midnightntwrk/proof-server@sha256:${D}`;
  const release = (over = {}) => ({
    url: 'https://api.github.com/repos/midnightntwrk/midnight-ledger/releases/123456',
    html_url: 'https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-9.0.2',
    tag_name: 'proof-server-9.0.2',
    draft: false,
    prerelease: false,
    body: `Proof server 9.0.2\n\nmidnightntwrk/proof-server:9.0.2@sha256:${D}\n`,
    ...over,
  });
  assert.deepEqual(ps.releaseProblems(release(), line), []);
  assert.deepEqual(ps.releaseProblems(release(), `sha256:${D}`), []);
  assert.equal(ps.digestOf(line), `sha256:${D}`);
  // Mandatory: no digest in the release, another digest, another tag, a pre-release: refused.
  assert.match(ps.releaseProblems(release({ body: 'Fixes a crash.' }), line).join(' '), /names no digest for midnightntwrk\/proof-server:9\.0\.2.*Do not pin/);
  assert.match(
    ps.releaseProblems(release({ body: `midnightntwrk/proof-server:9.0.2@sha256:${'d'.repeat(64)}` }), line).join(' '),
    /is not the one Midnight published.*Do not pin/,
  );
  assert.match(ps.releaseProblems(release({ tag_name: 'proof-server-9.0.1' }), line).join(' '), /not proof-server-9\.0\.2/);
  assert.match(ps.releaseProblems(release({ prerelease: true }), line).join(' '), /pre-release/);
  assert.match(ps.releaseProblems(release({ draft: true }), line).join(' '), /draft/);
  assert.match(ps.releaseProblems({ message: 'Not Found' }, line).join(' '), /not a GitHub release/);
  assert.match(ps.releaseProblems(release(), 'sha256:' + 'C'.repeat(64)).join(' '), /not a docker inspect digest/);

  // pin writes the file only when the release backs the digest.
  const d = mkdtempSync(path.join(tmpdir(), 'ps-pin-'));
  const f = path.join(d, 'proof-server-v2.yml');
  const original = readFileSync(ps.V2_PROOF_SERVER_FILE, 'utf8');
  writeFileSync(f, original);
  await assert.rejects(ps.pin({ line, release: release({ body: 'no digest' }), file: f }), /names no digest for midnightntwrk\/proof-server:9\.0\.2/);
  assert.equal(readFileSync(f, 'utf8'), original, 'nothing written on a refusal');
  const said = await ps.pin({ line, release: release(), file: f });
  assert.match(said.join('\n'), /the one Midnight published in proof-server-9\.0\.2/);
  assert.equal(ps.readPin(readFileSync(f, 'utf8')).digest, D);
  assert.deepEqual(ps.pinProblems(readFileSync(f, 'utf8')), []);
});

test('proof server release check: the four ways round it are closed', async () => {
  const ps = await import('./proof-server.mjs');
  const D = 'e'.repeat(64);
  const line = `sha256:${D}`;
  const good = {
    url: 'https://api.github.com/repos/midnightntwrk/midnight-ledger/releases/987',
    html_url: 'https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-9.0.2',
    tag_name: 'proof-server-9.0.2',
    draft: false,
    prerelease: false,
    body: `docker pull midnightntwrk/proof-server:9.0.2@sha256:${D}`,
  };
  assert.deepEqual(ps.releaseProblems(good, line), []);

  // 1. draft and prerelease must both be there and false: a missing or odd value is a refusal.
  for (const over of [{ draft: undefined }, { prerelease: undefined }, { draft: 'false' }, { prerelease: 0 }, { prerelease: null }]) {
    const r = { ...good, ...over };
    for (const k of Object.keys(over)) if (over[k] === undefined) delete r[k];
    assert.match(ps.releaseProblems(r, line).join(' '), /does not say it is a published, final release/, JSON.stringify(over));
  }

  // 2. The release must be midnight-ledger's, by its own URLs.
  for (const over of [
    { html_url: 'https://github.com/someone/midnight-ledger/releases/tag/proof-server-9.0.2' },
    { html_url: 'https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-9.0.2-rc1' },
    { html_url: undefined },
  ])
    assert.match(ps.releaseProblems({ ...good, ...over }, line).join(' '), /release's page is/);
  for (const over of [
    { url: 'https://api.github.com/repos/someone/midnight-ledger/releases/987' },
    { url: 'https://api.github.com/repos/midnightntwrk/midnight-ledger/releases/987/../../../x' },
    { url: undefined },
  ])
    assert.match(ps.releaseProblems({ ...good, ...over }, line).join(' '), /not one of midnightntwrk\/midnight-ledger's/);

  // 3. Only a digest tied to midnightntwrk/proof-server:9.0.2 counts.
  const tiedTo = (body) => ps.releaseDigests(body);
  assert.deepEqual(tiedTo(`midnightntwrk/proof-server:9.0.2@sha256:${D}`), [`sha256:${D}`]);
  assert.deepEqual(tiedTo(`docker.io/midnightntwrk/proof-server:9.0.2@sha256:${D}`), [`sha256:${D}`]);
  // The older 'a reference on a line with the 9.0.2 tag' path is gone: only the tagged reference counts.
  assert.deepEqual(tiedTo(`Image \`midnightntwrk/proof-server:9.0.2\`: \`midnightntwrk/proof-server@sha256:${D}\``), []);
  assert.deepEqual(tiedTo(`midnightntwrk/proof-server:9.0.2 midnightntwrk/proof-server@sha256:${D}`), []);
  for (const body of [
    `sha256:${D}`,
    `checksum of the binary: sha256:${D}`,
    `midnightntwrk/proof-server:9.0.1@sha256:${D}`,
    `midnightntwrk/proof-server:9.0.2-rc1@sha256:${D}`,
    `midnightntwrk/proof-server:9.0.2-rc1 midnightntwrk/proof-server@sha256:${D}`,
    `midnightntwrk/proof-server:9.0.21@sha256:${D}`,
    `evil/midnightntwrk/proof-server:9.0.2@sha256:${D}`,
    `midnightntwrk/proof-server-fork:9.0.2@sha256:${D}`,
    // the tag on one line, the reference on another
    `midnightntwrk/proof-server:9.0.2\nmidnightntwrk/proof-server@sha256:${D}`,
  ]) {
    assert.deepEqual(tiedTo(body), [], body);
    assert.match(ps.releaseProblems({ ...good, body }, line).join(' '), /names no digest for midnightntwrk\/proof-server:9\.0\.2/, body);
  }

  // 4. CI's independent re-check: the pinned digest against the release CI fetched.
  const placeholder = readFileSync(ps.V2_PROOF_SERVER_FILE, 'utf8').replace(/@sha256:\S+/, '@sha256:FILL-IN-THE-9.0.2-DIGEST');
  assert.deepEqual(ps.verifyPin(placeholder, undefined), [], 'the placeholder: nothing pinned, every tool refuses');
  const pinned = ps.withDigest(placeholder, line);
  assert.deepEqual(ps.verifyPin(pinned, good), []);
  assert.match(ps.verifyPin(pinned, { ...good, body: `midnightntwrk/proof-server:9.0.2@sha256:${'f'.repeat(64)}` }).join(' '), /not the one Midnight published/);
  assert.match(ps.verifyPin(pinned, { ...good, prerelease: true }).join(' '), /published, final release/);
  assert.match(ps.verifyPin(pinned, undefined).join(' '), /not a GitHub release/);
  assert.match(ps.verifyPin(pinned.replace(':9.0.2@', ':9.0.1@'), good).join(' '), /9\.0\.1; contract v2 needs 9\.0\.2/);
  assert.match(ps.verifyPin(placeholder.replace(':9.0.2@', ':9.0.1@'), good).join(' '), /9\.0\.1/);

  // The workflow that runs it: minimal, read-only, no secrets, pinned actions.
  const wf = readFileSync(path.join(path.dirname(ps.V2_PROOF_SERVER_FILE), '..', '.github', 'workflows', 'proof-server-pin.yaml'), 'utf8');
  assert.match(wf, /bboard-cli\/proof-server-v2\.yml/);
  assert.match(wf, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.doesNotMatch(wf, /pull_request_target|secrets\.|GITHUB_TOKEN|: *write/);
  for (const u of wf.match(/uses:\s*\S+/g) ?? []) assert.match(u, /@[0-9a-f]{40}$/, u);
  assert.match(wf, /node scripts\/v2\/proof-server\.mjs verify/);
});

test("proof server release check: Midnight's own format (an Image line, then the Digest line)", async () => {
  const ps = await import('./proof-server.mjs');
  const real = JSON.parse(readFileSync(new URL('./fixtures/proof-server-9.0.2-release.json', import.meta.url), 'utf8'));
  const D = 'sha256:787ef99db4b4706eb14d94ad389ca45f1c09bcdf740afecb01899bfbda63dc64';
  const pulled = `midnightntwrk/proof-server@${D}`;
  // The real release, as Midnight published it, backs the digest Docker pulled.
  assert.deepEqual(ps.releaseDigests(real.body), [D]);
  assert.deepEqual(ps.releaseProblems(real, pulled), []);
  assert.match(ps.releaseProblems(real, `sha256:${'0'.repeat(64)}`).join(' '), /is not the one Midnight published/);
  // ...and pins it, and CI's re-check passes on the pinned file.
  const d = mkdtempSync(path.join(tmpdir(), 'ps-real-'));
  const f = path.join(d, 'proof-server-v2.yml');
  writeFileSync(f, readFileSync(ps.V2_PROOF_SERVER_FILE, 'utf8').replace(/@sha256:\S+/, '@sha256:FILL-IN-THE-9.0.2-DIGEST'));
  await ps.pin({ line: pulled, release: real, file: f });
  assert.deepEqual(ps.verifyPin(readFileSync(f, 'utf8'), real), []);

  const [imageLine, digestLine, ...rest] = real.body.split('\n');
  const body = (...lines) => lines.join('\n');
  const refused = (b, why) => {
    assert.deepEqual(ps.releaseDigests(b), [], b);
    assert.match(ps.releaseProblems({ ...real, body: b }, pulled).join(' '), /names no digest for midnightntwrk\/proof-server:9\.0\.2/, b);
    void why;
  };
  // The Docker Hub image alone, or with docker.io/, on the Image line is fine too.
  assert.deepEqual(ps.releaseDigests(body('Image: `midnightntwrk/proof-server:9.0.2`', digestLine)), [D]);
  assert.deepEqual(ps.releaseDigests(body('Image: docker.io/midnightntwrk/proof-server:9.0.2', `Digest: ${D}`)), [D]);
  // Negative variants.
  refused(body(imageLine, '', digestLine, ...rest), 'a blank line between them');
  refused(body(imageLine, 'Built from release/ledger-9.1.0.2.', digestLine, ...rest), 'the digest line not adjacent');
  refused(body(digestLine, imageLine, ...rest), 'the digest before the image');
  refused(body(imageLine.replaceAll('9.0.2', '9.0.1'), digestLine), 'the Image line for 9.0.1');
  refused(body('Image: `ghcr.io/midnight-ntwrk/proof-server:9.0.2` (also `docker.io/someone/proof-server:9.0.2`)', digestLine), 'another repo');
  refused(body('Image: `ghcr.io/midnight-ntwrk/proof-server:9.0.2`', digestLine), 'the ghcr mirror alone, no Docker Hub image');
  refused(body('Image: `docker.io/midnightntwrk/proof-server:9.0.2-rc1`', digestLine), 'a pre-release tag');
  refused(body('Image: `docker.io/evil/midnightntwrk/proof-server:9.0.2`', digestLine), 'a lookalike path');
  refused(body('Image: `docker.io/midnightntwrk/proof-server-fork:9.0.2`', digestLine), 'a lookalike name');
  refused(body('Image: `midnightntwrk/proof-server:9.0.2` and `midnightntwrk/proof-server:9.0.1`', digestLine), 'two tags on one line');
  refused(body('Images: `midnightntwrk/proof-server:9.0.2`', digestLine), 'not an Image line');
  refused(body(imageLine, `Digest: \`${D}\` (amd64 only)`), 'more on the digest line');
  refused(body(imageLine, `Checksum: \`${D}\``), 'not a Digest line');
  refused(`Digest: \`${D}\``, 'a loose digest');
  // The whole Image line must be one of Midnight's exact forms: unknown parts are refused, not skipped.
  const ghcrAlso = (also) => `Image: \`ghcr.io/midnight-ntwrk/proof-server:9.0.2\` (also \`${also}\`)`;
  assert.deepEqual(ps.releaseDigests(body(ghcrAlso('midnightntwrk/proof-server:9.0.2'), digestLine)), [D]);
  assert.deepEqual(ps.releaseDigests(body(`${imageLine}   `, `${digestLine} `)), [D], 'trailing spaces only');
  for (const line of [
    'Image: `ghcr.io/midnight\u2010ntwrk/proof-server:9.0.2` (also `docker.io/midnightntwrk/proof-server:9.0.2`)',
    'Image: `ghcr.io/midnight-ntwrk/proof\u2011server:9.0.2` (also `docker.io/midnightntwrk/proof-server:9.0.2`)',
    ghcrAlso('docker.io/midnightntwrk/proof\u2010server:9.0.2'),
    'Image: `ghcr.io/midnight-ntwrk/proof-server` (also `docker.io/midnightntwrk/proof-server:9.0.2`)',
    'Image: `ghcr.io/midnight-ntwrk/proof-server:9.0.1` (also `docker.io/midnightntwrk/proof-server:9.0.2`)',
    'Image: `docker.io/midnightntwrk/proof-server:9.0.2` (also `ghcr.io/midnight-ntwrk/proof-server:9.0.2`)',
    `${imageLine} (and \`docker.io/attacker/proof-server:9.0.2\`)`,
    'Image: `docker.io/midnightntwrk/proof-server:9.0.2` (recommended)',
    'Image: `docker.io/midnightntwrk/proof-server:9.0.2',
    'Image:  `docker.io/midnightntwrk/proof-server:9.0.2`',
    ` ${imageLine}`,
    'Image: `docker.io/midnightntwrk/proof-server`',
  ])
    refused(body(line, digestLine), line);
  for (const dl of [`Digest:  \`${D}\``, `Digest: \`${D}`, `Digest: ${D.replace('sha256', 'SHA256')}`, ` ${digestLine}`])
    refused(body(imageLine, dl), dl);
  // Two Image blocks giving different digests for 9.0.2: refused outright.
  const other = `sha256:${'a'.repeat(64)}`;
  const two = body(imageLine, digestLine, '', 'Image: `midnightntwrk/proof-server:9.0.2`', `Digest: \`${other}\``);
  assert.deepEqual(ps.releaseDigests(two).sort(), [D, other].sort());
  assert.match(ps.releaseProblems({ ...real, body: two }, pulled).join(' '), /more than one digest/);
  // The same digest twice is one digest.
  assert.deepEqual(ps.releaseProblems({ ...real, body: body(imageLine, digestLine, '', imageLine, digestLine) }, pulled), []);
  // Every other refusal still holds on the real body.
  for (const over of [{ draft: true }, { prerelease: true }, { prerelease: undefined }, { tag_name: 'proof-server-9.0.1' }, { html_url: 'https://github.com/someone/midnight-ledger/releases/tag/proof-server-9.0.2' }])
    assert.notDeepEqual(ps.releaseProblems({ ...real, ...over }, pulled), [], JSON.stringify(over));
});
