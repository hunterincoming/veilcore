// The committee tools against Midnight's real ledger code: ledger-v8 (the WebAssembly build
// the node is made from) holding a contract in a local LedgerState. Signatures, thresholds,
// counters and verifier-key rules are all checked by the ledger here; proofs and fees are
// switched off, because a maintenance update has no proof and there is no wallet to pay.
// What this cannot show is a real node and indexer accepting it: that is the preprod
// rehearsal in docs/maintenance-committee.md.
//
//   node --test scripts/committee/
//
// Set COMMITTEE_TEST_VK to a compiled verifier key file (any circuit's .verifier from a
// Compact build) to also run the insert-key checks; without one they are skipped.
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import * as L from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  assembleSigned,
  checkKeyCard,
  committeeProblems,
  describeRequest,
  isRetired,
  makeKeyCard,
  makeRequest,
  rebuildRequest,
  requestLanded,
  signRequest,
} from './core.mjs';
import { sendMaintenanceUpdate } from './submit.mjs';
import { main, makeIo, unsafeKeyPath } from './cli.mjs';

const NET = 'undeployed';
setNetworkId(NET);

const VK_FILE =
  process.env.COMMITTEE_TEST_VK ??
  path.resolve(import.meta.dirname, '..', '..', 'contract', 'src', 'managed', 'veilcore', 'keys', 'anchor.verifier');
const HAVE_VK = existsSync(VK_FILE);

/** A one-contract chain whose transactions are checked by the real ledger rules. */
const chain = (operations = []) => {
  let state = L.LedgerState.blank(NET);
  const strict = new L.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  assert.equal(strict.verifySignatures, true, 'signatures ARE checked');
  const apply = (unproven) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const v = unproven.eraseProofs().wellFormed(state, strict, new Date());
    const ctx = new L.TransactionContext(state, {
      secondsSinceEpoch: now,
      secondsSinceEpochErr: 30,
      parentBlockHash: '00'.repeat(32),
      lastBlockTime: now - 6n,
    });
    const [next, result] = state.apply(v, ctx);
    if (result.type !== 'success') throw new Error(`refused by the ledger: ${result.error ?? result.type}`);
    state = next;
  };
  const ttl = () => new Date(Date.now() + 3_600_000);
  const paperKey = L.sampleSigningKey();
  const cs = new L.ContractState();
  cs.maintenanceAuthority = new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(paperKey)], 1, 0n);
  const deploy = new L.ContractDeploy(cs);
  apply(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(ttl()).addDeploy(deploy)));
  const address = deploy.address;
  const send = (u) =>
    apply(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(ttl()).addMaintenanceUpdate(u)));
  const authority = () => state.index(address).maintenanceAuthority;
  const c = { paperKey, address, apply, send, authority, state: () => state };
  // The real contract has 16 key-adding updates behind it: bring the counter up the same way.
  if (HAVE_VK)
    for (const op of operations) {
      let u = new L.MaintenanceUpdate(
        address,
        [new L.VerifierKeyInsert(op, new L.ContractOperationVersionedVerifierKey('v3', vkBytes()))],
        authority().counter,
      );
      u = u.addSignature(0n, L.signData(paperKey, u.dataToSign));
      send(u);
    }
  return c;
};

const vkBytes = () => new Uint8Array(readFileSync(VK_FILE));

const holders = () => {
  const keys = { hunter: L.sampleSigningKey(), mako: L.sampleSigningKey(), backup: L.sampleSigningKey() };
  const cards = Object.fromEntries(Object.entries(keys).map(([h, k]) => [h, makeKeyCard(h, k)]));
  return { keys, cards, list: [cards.hunter, cards.mako, cards.backup] };
};

/** The install: the single paper key replaces itself with the 2-of-3 committee. */
const install = (c, h) => {
  const req = makeRequest({
    network: NET,
    contractAddress: c.address,
    current: c.authority(),
    actions: [{ kind: 'replace-authority', committee: h.list, threshold: 2 }],
    reason: 'install the committee',
    forbid: [...c.authority().committee],
  });
  const sig = signRequest(roundTrip(req), c.paperKey);
  const a = assembleSigned(roundTrip(req), [roundTrip(sig)], c.authority());
  assert.ok(a.ok, a.ok ? '' : a.problems.join(' '));
  c.send(a.update);
  return req;
};

/** Through JSON and back, as a file sent between people would be. */
const roundTrip = (x) => JSON.parse(JSON.stringify(x));

const request = (c, actions, reason = 'test') =>
  roundTrip(makeRequest({ network: NET, contractAddress: c.address, current: c.authority(), actions, reason }));

const refusedBy = (c, update, re) => assert.throws(() => c.send(update), re);

// ─────────────────────────────────────────────────────────────── key cards

test('a key card proves its key, and nothing else passes for one', () => {
  const key = L.sampleSigningKey();
  const card = makeKeyCard('mako', key);
  assert.equal(card.publicKey, L.signatureVerifyingKey(key));
  assert.deepEqual(checkKeyCard(roundTrip(card)), { ok: true, holder: 'mako', publicKey: card.publicKey });
  assert.match(checkKeyCard({ ...card, holder: 'hunter' }).problem, /does not match/);
  const other = makeKeyCard('mako', L.sampleSigningKey());
  assert.match(checkKeyCard({ ...card, publicKey: other.publicKey }).problem, /does not match/);
  assert.match(checkKeyCard({ ...card, publicKey: '00'.repeat(32) }).problem, /not a valid public key/);
  assert.match(checkKeyCard({ ...card, format: 'x' }).problem, /not a VeilCore committee key card/);
  assert.throws(() => makeKeyCard('Mako Steiner', key), /holder name/);
  // The proof can never double as an approval of a contract change.
  const u = new L.MaintenanceUpdate('ab'.repeat(32), [], 0n);
  assert.match(Buffer.from(u.dataToSign).toString('latin1'), /^midnight:contract-update:/);
  assert.doesNotMatch(Buffer.from(L.signData(key, new Uint8Array())).toString(), /^veilcore:/);
});

test('the committee must be three different keys with a threshold of two', () => {
  const h = holders();
  assert.deepEqual(committeeProblems(h.list, 2), []);
  assert.match(committeeProblems(h.list.slice(0, 2), 2).join(), /exactly 3 keys/);
  assert.match(committeeProblems([...h.list, makeKeyCard('x', L.sampleSigningKey())], 2).join(), /exactly 3 keys/);
  for (const t of [0, 1, 3, 2 ** 32, 2.5, '2'])
    assert.match(committeeProblems(h.list, t).join(), /threshold must be exactly 2/, `threshold ${t}`);
  // The ledger itself would take this: one person, two votes.
  const twice = [h.cards.hunter, makeKeyCard('hunter2', h.keys.hunter), h.cards.mako];
  assert.match(committeeProblems(twice, 2).join(), /same public key appears twice/);
  assert.match(committeeProblems([h.cards.hunter, h.cards.hunter, h.cards.mako], 2).join(), /same public key/);
  assert.match(committeeProblems(h.list, 2, { forbid: [h.cards.mako.publicKey] }).join(), /current maintenance key/);
});

// ─────────────────────────────────────────────────── what the ledger itself allows

test('the ledger accepts committees VeilCore refuses (why core.mjs checks first)', () => {
  const c = chain();
  const A = L.sampleSigningKey();
  const B = L.sampleSigningKey();
  // threshold 0: anyone, no signature.
  let u = new L.MaintenanceUpdate(
    c.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([A, B].map(L.signatureVerifyingKey), 0, 1n))],
    0n,
  );
  c.send(u.addSignature(0n, L.signData(c.paperKey, u.dataToSign)));
  const free = new L.MaintenanceUpdate(
    c.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([], 1, 2n))],
    1n,
  );
  c.send(free); // no signature at all, and the ledger takes it
  assert.equal(c.authority().committee.length, 0);
  // A threshold of 2^32 wraps to 0.
  assert.equal(new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(A)], 2 ** 32, 0n).threshold, 0);
  // The same key twice: one holder signs as two members.
  const d = chain();
  u = new L.MaintenanceUpdate(
    d.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([A, A, B].map(L.signatureVerifyingKey), 2, 1n))],
    0n,
  );
  d.send(u.addSignature(0n, L.signData(d.paperKey, u.dataToSign)));
  u = new L.MaintenanceUpdate(d.address, [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([], 1, 2n))], 1n);
  d.send(u.addSignature(0n, L.signData(A, u.dataToSign)).addSignature(1n, L.signData(A, u.dataToSign)));
  assert.equal(d.authority().committee.length, 0, 'one person changed a "2 of 3" contract alone');
  // The new authority's counter must be exactly current + 1.
  const e = chain();
  for (const n of [0n, 2n, 5n]) {
    u = new L.MaintenanceUpdate(
      e.address,
      [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(A)], 1, n))],
      0n,
    );
    refusedBy(e, u.addSignature(0n, L.signData(e.paperKey, u.dataToSign)), /normal form/);
  }
});

// ───────────────────────────────────────────────────────────── the install

test('install: the paper key hands the contract to the 2-of-3 committee, and loses all power', () => {
  const c = chain(['anchor', 'pairDna']);
  const before = c.authority();
  const h = holders();
  const req = install(c, h);
  const after = c.authority();
  assert.deepEqual(
    [...after.committee],
    h.list.map((x) => x.publicKey),
  );
  assert.equal(after.threshold, 2);
  assert.equal(after.counter, before.counter + 1n);
  assert.ok(requestLanded(req, after));
  assert.equal(isRetired(after), false);

  // The old paper key can do nothing now, alone or with a member.
  const r = request(c, [{ kind: 'retire' }]);
  assert.throws(() => signRequest(r, c.paperKey), /not on the contract's current committee/);
  const raw = rebuildRequest(r);
  refusedBy(c, raw.update.addSignature(0n, L.signData(c.paperKey, raw.update.dataToSign)), /invalid|threshold/);
  // One committee member alone cannot either.
  const one = assembleSigned(r, [signRequest(r, h.keys.mako)], c.authority());
  assert.equal(one.ok, false);
  assert.match(one.problems.join(), /1 valid signature.*2 are needed/);
  refusedBy(c, raw.update.addSignature(1n, L.signData(h.keys.mako, raw.update.dataToSign)), /threshold/);
  assert.equal(c.authority().counter, after.counter, 'nothing changed');
});

test('install refuses a committee that includes the paper key, and a wrong paper key', () => {
  const c = chain();
  const h = holders();
  const withPaper = [makeKeyCard('hunter', c.paperKey), h.cards.mako, h.cards.backup];
  assert.throws(
    () =>
      makeRequest({
        network: NET,
        contractAddress: c.address,
        current: c.authority(),
        actions: [{ kind: 'replace-authority', committee: withPaper, threshold: 2 }],
        forbid: [...c.authority().committee],
      }),
    /current maintenance key/,
  );
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  assert.throws(() => signRequest(req, L.sampleSigningKey()), /not on the contract's current committee/);
});

// ─────────────────────────────────────────────── later changes: two holders sign

test('any two holders can rotate a lost key out; the lost key is then useless', () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const newHunter = L.sampleSigningKey();
  const cards = [makeKeyCard('hunter', newHunter), h.cards.mako, h.cards.backup];
  const req = request(c, [{ kind: 'replace-authority', committee: cards, threshold: 2 }], 'hunter lost his key');
  // Signed in any order, on separate machines, sent by someone else.
  const sigs = [signRequest(req, h.keys.backup), signRequest(req, h.keys.mako)].map(roundTrip);
  const a = assembleSigned(req, sigs, c.authority());
  assert.ok(a.ok);
  c.send(a.update);
  assert.ok(requestLanded(req, c.authority()));
  assert.equal(c.authority().committee[0], cards[0].publicKey);
  // The lost key no longer counts, even together with a member.
  const r2 = request(c, [{ kind: 'retire' }]);
  assert.throws(() => signRequest(r2, h.keys.hunter), /not on the contract's current committee/);
  const raw = rebuildRequest(r2).update;
  refusedBy(
    c,
    raw
      .addSignature(0n, L.signData(h.keys.hunter, raw.dataToSign))
      .addSignature(1n, L.signData(h.keys.mako, raw.dataToSign)),
    /invalid/,
  );
  // The new key does.
  const ok = assembleSigned(r2, [signRequest(r2, newHunter), signRequest(r2, h.keys.mako)], c.authority());
  assert.ok(ok.ok);
  c.send(ok.update);
  assert.ok(isRetired(c.authority()), 'retired: an empty committee');
});

test('a signed change can be used once, and never after another change', () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const D = makeKeyCard('backup', L.sampleSigningKey());
  const req = request(c, [{ kind: 'replace-authority', committee: [h.cards.hunter, h.cards.mako, D], threshold: 2 }]);
  const sigs = [signRequest(req, h.keys.hunter), signRequest(req, h.keys.mako)];
  const a = assembleSigned(req, sigs, c.authority());
  assert.ok(a.ok);
  c.send(a.update);
  refusedBy(c, a.update, /invalid|counter/); // replayed as is
  const again = assembleSigned(req, sigs, c.authority());
  assert.equal(again.ok, false);
  assert.match(again.problems.join(), /can never be used/);
});

test('signatures that do not count are refused before anything is sent', () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const req = request(c, [{ kind: 'retire' }]);
  const m = signRequest(req, h.keys.mako);
  const b = signRequest(req, h.keys.backup);
  const tally = (sigs) => assembleSigned(req, sigs, c.authority());

  assert.match(tally([m, m]).problems.join(), /second signature from the same key/);
  assert.match(tally([m, { ...b, signature: m.signature }]).problems.join(), /does not verify/);
  assert.match(tally([m, { ...b, index: 0 }]).problems.join(), /not on the committee at the place it claims/);
  const other = request(c, [{ kind: 'remove-key', circuit: 'anchor' }]);
  assert.match(tally([m, signRequest(other, h.keys.backup)]).problems.join(), /different request/);
  assert.match(tally([m, { nonsense: true }]).problems.join(), /not a VeilCore maintenance signature/);
  // Three valid signatures are fine (two are needed; the third is ignored by nobody).
  const all = tally([m, b, signRequest(req, h.keys.hunter)]);
  assert.ok(all.ok);
  assert.equal(all.update.signatures.length, 3);
  // Two good and one bad: sent, with a warning about the bad one.
  const warn = tally([m, b, { ...m, signature: b.signature }]);
  assert.ok(warn.ok);
  assert.equal(warn.warnings.length, 1);
  c.send(warn.update);
  assert.ok(isRetired(c.authority()));
});

test('a request edited after it was made cannot be signed', () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const req = request(c, [{ kind: 'remove-key', circuit: 'anchor' }]);
  const swapped = { ...req, actions: [{ kind: 'retire' }] };
  assert.match(rebuildRequest(swapped).problems.join(), /changed after it was made/);
  assert.throws(() => signRequest(swapped, h.keys.mako), /changed after it was made/);
  // Without its dataToSign it rebuilds, and then shows what it really does.
  const { dataToSign: _ignored, ...bare } = swapped;
  const r = rebuildRequest(bare);
  assert.ok(r.ok);
  assert.match(describeRequest(bare, r).join('\n'), /RETIRE/);
  // Mixing an authority change with other changes is refused.
  assert.throws(
    () =>
      makeRequest({
        network: NET,
        contractAddress: c.address,
        current: c.authority(),
        actions: [{ kind: 'retire' }, { kind: 'remove-key', circuit: 'anchor' }],
      }),
    /only action/,
  );
  // A request against a retired authority is refused.
  const dead = { ...req, current: { committee: [], threshold: 1, counter: '9' } };
  assert.match(rebuildRequest(dead).problems.join(), /retired/);
});

test('mainnet requests say whether the address is the pinned VeilCore contract', () => {
  const c = chain();
  const req = request(c, [{ kind: 'remove-key', circuit: 'anchor' }]);
  const main = { ...req, network: 'mainnet' };
  const r = rebuildRequest(main);
  assert.match(describeRequest(main, r, { pinnedMainnetAddress: c.address }).join('\n'), /the pinned address/);
  assert.match(describeRequest(main, r, { pinnedMainnetAddress: 'ff'.repeat(32) }).join('\n'), /NOT the pinned/);
});

// ──────────────────────────────────────────────────────── circuit keys

test(
  'removing and inserting circuit keys needs two signatures',
  { skip: HAVE_VK ? false : `no verifier key file (${VK_FILE}); set COMMITTEE_TEST_VK` },
  () => {
    const c = chain(['anchor', 'pairDna']);
    const h = holders();
    install(c, h);
    const ops = () => c.state().index(c.address).operations();
    const rm = request(c, [{ kind: 'remove-key', circuit: 'anchor' }]);
    const one = rebuildRequest(rm).update;
    refusedBy(c, one.addSignature(0n, L.signData(h.keys.hunter, one.dataToSign)), /threshold/);
    c.send(assembleSigned(rm, [signRequest(rm, h.keys.hunter), signRequest(rm, h.keys.backup)], c.authority()).update);
    assert.deepEqual(ops(), ['pairDna']);

    const vk = vkBytes();
    const sha = createHash('sha256').update(vk).digest('hex');
    const hex = Buffer.from(vk).toString('hex');
    assert.throws(
      () =>
        request(c, [{ kind: 'insert-key', circuit: 'anchor', verifierKey: hex, verifierKeySha256: '00'.repeat(32) }]),
      /does not match the SHA-256/,
    );
    const ins = request(c, [
      { kind: 'remove-key', circuit: 'pairDna' },
      { kind: 'insert-key', circuit: 'pairDna', verifierKey: hex, verifierKeySha256: sha },
      { kind: 'insert-key', circuit: 'anchor', verifierKey: hex, verifierKeySha256: sha },
    ]);
    assert.match(describeRequest(ins, rebuildRequest(ins)).join('\n'), new RegExp(sha));
    const before = c.authority().counter;
    c.send(assembleSigned(ins, [signRequest(ins, h.keys.mako), signRequest(ins, h.keys.hunter)], c.authority()).update);
    assert.deepEqual([...ops()].sort(), ['anchor', 'pairDna']);
    assert.equal(c.authority().counter, before + 1n, 'one update, one step of the counter, however many changes');
  },
);

// ────────────────────────────────────────────── sending, against the same ledger

test('sendMaintenanceUpdate: sent once, confirmed from the chain, never twice', async () => {
  const c = chain();
  const h = holders();
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const signed = assembleSigned(req, [signRequest(req, c.paperKey)], c.authority());
  assert.ok(signed.ok);
  let submitted = 0;
  let loseConfirmation = false;
  const providers = {
    publicDataProvider: {
      queryContractState: async (a) => c.state().index(a),
      watchForTxData: async (txId) => {
        if (loseConfirmation) throw new Error('websocket closed');
        return { txId, txHash: txId, blockHeight: 1, status: 'SucceedEntirely' };
      },
    },
    proofProvider: { proveTx: async (tx) => tx },
    walletProvider: { balanceTx: async (tx) => tx },
    midnightProvider: {
      submitTx: async (tx) => {
        submitted++;
        c.apply(tx);
        return `tx${submitted}`;
      },
    },
  };
  const landed = (a) => requestLanded(req, a);
  const r = await sendMaintenanceUpdate(providers, c.address, signed.update, landed, { waitMs: 1 });
  assert.equal(r.sent, true);
  assert.equal(submitted, 1);
  assert.equal(r.authority.threshold, 2);
  const again = await sendMaintenanceUpdate(providers, c.address, signed.update, landed, { waitMs: 1 });
  assert.equal(again.sent, false, 'run again: the chain shows it, nothing is sent');
  assert.equal(submitted, 1);

  // Landed, but the confirmation was lost: the chain says it landed, so it is not an error.
  const d = chain();
  const req2 = request(d, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const s2 = assembleSigned(req2, [signRequest(req2, d.paperKey)], d.authority());
  loseConfirmation = true;
  const p2 = {
    ...providers,
    publicDataProvider: { ...providers.publicDataProvider, queryContractState: async (a) => d.state().index(a) },
    midnightProvider: { submitTx: async (tx) => (d.apply(tx), 'txL') },
  };
  const lost = await sendMaintenanceUpdate(p2, d.address, s2.update, (a) => requestLanded(req2, a), { waitMs: 1 });
  assert.equal(lost.sent, true);
  assert.ok(requestLanded(req2, d.authority()));

  // Refused by the network: the error comes back, nothing is claimed.
  loseConfirmation = false;
  const e = chain();
  const req3 = request(e, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const bad = rebuildRequest(req3).update.addSignature(
    0n,
    L.signData(L.sampleSigningKey(), rebuildRequest(req3).update.dataToSign),
  );
  const p3 = {
    ...providers,
    publicDataProvider: { ...providers.publicDataProvider, queryContractState: async (a) => e.state().index(a) },
    midnightProvider: { submitTx: async (tx) => (e.apply(tx), 'txR') },
  };
  await assert.rejects(
    () => sendMaintenanceUpdate(p3, e.address, bad, (a) => requestLanded(req3, a), { waitMs: 1 }),
    /invalid/,
  );
  assert.equal(e.authority().committee.length, 1);
});

// ──────────────────────────────────────────────────────────── the offline tool

const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'committee-test-'));
/** Run cli.mjs main with these answers typed in; returns the exit code and the screen. */
const cli = async (argv, answers = [], cwd) => {
  const input = new PassThrough();
  const output = new PassThrough();
  let screen = '';
  output.on('data', (d) => (screen += d));
  for (const a of answers) input.write(`${a}\n`);
  input.end();
  const here = process.cwd();
  if (cwd) process.chdir(cwd);
  try {
    const code = await main(argv, makeIo(input, output));
    return { code, screen };
  } finally {
    process.chdir(here);
  }
};

test('keygen --out: the key goes to a 0600 file, never on screen; never over a file; never in a synced folder', async () => {
  const dir = tmp();
  const key = path.join(dir, 'mako.key.json');
  const r = await cli(['keygen', '--holder', 'mako', '--out', key], [], dir);
  assert.equal(r.code, 0, r.screen);
  assert.equal(statSync(key).mode & 0o777, 0o600);
  const stored = JSON.parse(readFileSync(key, 'utf8'));
  assert.doesNotMatch(r.screen, new RegExp(stored.signingKey));
  assert.match(stored.warning, /Never send it to anyone/);
  const card = JSON.parse(readFileSync(path.join(dir, 'committee-key-mako.json'), 'utf8'));
  assert.equal(checkKeyCard(card).ok, true);
  assert.doesNotMatch(JSON.stringify(card), new RegExp(stored.signingKey));
  // Never over an existing key file or card.
  const again = await cli(['keygen', '--holder', 'mako', '--out', key, '--card', 'other.json'], [], dir);
  assert.equal(again.code, 1);
  assert.match(again.screen, /already exists/);
  assert.equal(JSON.parse(readFileSync(key, 'utf8')).signingKey, stored.signingKey, 'untouched');
  // check: the stored copy against the card.
  assert.equal((await cli(['check', '--card', 'committee-key-mako.json', '--key-file', key], [], dir)).code, 0);
  assert.equal((await cli(['check', '--card', 'committee-key-mako.json'], [stored.signingKey], dir)).code, 0);
  const wrong = await cli(['check', '--card', 'committee-key-mako.json'], [L.sampleSigningKey()], dir);
  assert.equal(wrong.code, 1);
  assert.match(wrong.screen, /NOT the one/);
  // Places a key file must not go.
  const home = '/Users/hunter';
  assert.match(unsafeKeyPath('/Users/hunter/Library/Mobile Documents/com~apple~CloudDocs/k.json', home), /iCloud/);
  assert.match(unsafeKeyPath('/Users/hunter/Dropbox/k.json', home), /cloud-synced/);
  assert.match(unsafeKeyPath('/Users/hunter/Desktop/k.json', home), /Desktop and Documents/);
  assert.match(unsafeKeyPath(path.resolve(import.meta.dirname, 'k.json'), home), /code folder/);
  assert.equal(unsafeKeyPath('/Volumes/KEYS/k.json', home), null);
});

test('keygen --paper: shown once, checked back from paper, written nowhere', async () => {
  const dir = tmp();
  const input = new PassThrough();
  const output = new PassThrough();
  let screen = '';
  let key;
  output.on('data', (d) => {
    screen += d;
    const m = String(d).match(/^ {2}((?:[0-9a-f]{8} ){7}[0-9a-f]{8})$/m);
    if (m && key === undefined) {
      key = m[1].replace(/ /g, '');
      input.write('WRITTEN\n');
      input.write(`${L.sampleSigningKey()}\n`); // a copying mistake first
      input.write(`${m[1]}\n`); // then the right one, with its spaces
      input.end();
    }
  });
  const here = process.cwd();
  process.chdir(dir);
  let code;
  try {
    code = await main(['keygen', '--holder', 'backup', '--paper'], makeIo(input, output));
  } finally {
    process.chdir(here);
  }
  assert.equal(code, 0, screen);
  assert.match(screen, /does not match/);
  assert.match(screen, /Your paper copy matches/);
  const card = JSON.parse(readFileSync(path.join(dir, 'committee-key-backup.json'), 'utf8'));
  assert.equal(card.publicKey, L.signatureVerifyingKey(key));
  assert.doesNotMatch(readFileSync(path.join(dir, 'committee-key-backup.json'), 'utf8'), new RegExp(key));
});

test('sign: shows the change, asks for SIGN, writes a signature that counts', async () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const dir = tmp();
  const req = request(c, [{ kind: 'remove-key', circuit: 'anchor' }], 'switch off a broken circuit');
  writeFileSync(path.join(dir, 'req.json'), JSON.stringify(req));
  const no = await cli(['sign', '--request', 'req.json'], ['no'], dir);
  assert.equal(no.code, 1);
  assert.match(no.screen, /Remove the verifier key of circuit "anchor"/);
  assert.match(no.screen, /switch off a broken circuit/);
  const yes = await cli(['sign', '--request', 'req.json', '--out', 'm.json'], ['SIGN', h.keys.mako], dir);
  assert.equal(yes.code, 0, yes.screen);
  assert.doesNotMatch(yes.screen, new RegExp(h.keys.mako));
  const s1 = JSON.parse(readFileSync(path.join(dir, 'm.json'), 'utf8'));
  const keyFile = path.join(tmp(), 'b.json');
  writeFileSync(keyFile, JSON.stringify({ signingKey: h.keys.backup }));
  assert.equal(
    (await cli(['sign', '--request', 'req.json', '--key-file', keyFile, '--out', 'b.json'], ['SIGN'], dir)).code,
    0,
  );
  const s2 = JSON.parse(readFileSync(path.join(dir, 'b.json'), 'utf8'));
  assert.ok(assembleSigned(req, [s1, s2], c.authority()).ok);
  // A key not on the committee gets no signature file.
  const out = await cli(['sign', '--request', 'req.json', '--out', 'x.json'], ['SIGN', c.paperKey], dir);
  assert.equal(out.code, 1);
  assert.match(out.screen, /not on the contract's current committee/);
  assert.equal(existsSync(path.join(dir, 'x.json')), false);
  // On mainnet it signs only for the pinned VeilCore contract.
  writeFileSync(path.join(dir, 'main.json'), JSON.stringify({ ...req, network: 'mainnet' }));
  const pin = await cli(['sign', '--request', 'main.json', '--out', 'y.json'], ['SIGN', h.keys.mako], dir);
  assert.equal(pin.code, 1);
  assert.match(pin.screen, /only for the pinned VeilCore main contract/);
});
