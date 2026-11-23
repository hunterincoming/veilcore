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
import { ROOT, parseFingerprintsV2, slotOfKey } from './fingerprints.mjs';
import { emptySession, readSession, sessionProblems, writeSession } from './session.mjs';
import { buildInsertUpdate, publicKeyOf, runDeploy } from './deploy-core.mjs';
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
    const fin = tx.mockProve();
    const txHash = String(fin.transactionHash()).toLowerCase();
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
    authority: (address) => state.index(address).maintenanceAuthority,
    setLatest: (address, h) => latest.set(address, h),
  };
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

test('history: a call is never refused (ledger data that differs from the constructor’s is not looked at)', async () => {
  const c = chain();
  const d = await deploy(c);
  const e = d.record.contracts.veilcore;
  const cur = stateFacts(await c.readState(e.address));
  const read = (ref) => ({ ref, status: 'SUCCESS', actions: txFacts(Buffer.from(c.txs.get(ref.txHash).raw, 'hex'), e.address) });
  const args = {
    name: 'veilcore',
    pins: PINS.veilcore,
    temporaryKey: d.record.temporaryKey.publicKey,
    deploy: read(e.deploy),
    updates: e.updates.map(read),
  };
  // A state whose ledger data has moved on, as after anyone's anchorBatch: still a PASS.
  const r = checkV2Contract({ ...args, current: { ...cur, dataHex: 'ff' } });
  assert.equal(r.ok, true, r.lines.join('\n'));
  // A V3 key on chain in place of a V4 one is refused.
  const v3 = checkV2Contract({ ...args, current: { ...cur, ops: { ...cur.ops, [CIRCUITS.veilcore[0]]: { sha256: sha(V4), slot: 'v3' } } } });
  assert.equal(v3.ok, false);
  assert.match(v3.lines.join('\n'), /not a V4 key/);
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
  assert.match(g([{ kind: 'retire' }]).join(' '), /"retire" is not allowed/);
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
