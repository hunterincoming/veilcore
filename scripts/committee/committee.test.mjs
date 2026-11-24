// The committee tools against Midnight's real ledger code: ledger-v9 1.0.2 (ledger 9.1.0.2, the
// WebAssembly build of the code the node runs) holding a contract in a local LedgerState.
// Signatures, thresholds, counters and verifier-key rules are all checked by the ledger here;
// proofs and fees are switched off, because a maintenance update has no proof and there is no
// wallet to pay. Every key is made here and thrown away. Nothing touches a network.
// What this cannot show is a real node, indexer and wallet accepting it: that is the local
// rehearsal in docs/committee-rehearsal.md.
//
//   node --test scripts/committee/committee.test.mjs
//
// The Ledger 9 install tests need VeilCore's 24 compiled verifier keys (contract/src/managed/
// veilcore/keys after `npm run compact` in contract/, or COMMITTEE_TEST_KEYS=DIR); without them
// those tests are skipped. COMMITTEE_TEST_VK (one .verifier file) does the same for the older
// insert-key checks.
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import * as L from 'ledger-v9-committee';
import * as L8 from '@midnightntwrk/ledger-v8';
import * as LWallet from '@midnight-ntwrk/midnight-js-protocol/v9';
import {
  SerializedContractState,
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
} from '@midnight-ntwrk/midnight-js-types';
import {
  CONFIRMATION_FORMAT,
  DRY_RUN_FORMAT,
  PERMANENT_WARNING,
  assembleSigned,
  authorityView,
  checkKeyCard,
  committeeProblems,
  confirmationProblems,
  describeRequest,
  isRetired,
  keySlotFor,
  makeConfirmation,
  makeKeyCard,
  makeRequest,
  possessionMessage,
  rebuildRequest,
  requestLanded,
  signRequest,
  slotOfKeyBytes,
} from './core.mjs';
import {
  MAINNET_REFUSAL,
  assertReadableByWalletLedger,
  readAuthorityNow,
  sendMaintenanceUpdate,
} from './submit.mjs';
import { main, makeIo, unsafeKeyPath } from './cli.mjs';

const NET = 'undeployed';
const REPO = path.resolve(import.meta.dirname, '..', '..');

const KEYS_DIR =
  process.env.COMMITTEE_TEST_KEYS ?? path.join(REPO, 'contract', 'src', 'managed', 'veilcore', 'keys');
const VK_FILE = process.env.COMMITTEE_TEST_VK ?? path.join(KEYS_DIR, 'anchor.verifier');
const HAVE_VK = existsSync(VK_FILE);

// Ledger 9 holds keys and signatures as { tag, value }; the tool's files hold plain hex.
const sk = (hex) => ({ tag: 'schnorr', value: hex });
/** A new throwaway signing key, as hex. */
const newKey = () => L.sampleSigningKey().value;
/** The public key of a signing key, as the ledger holds it. */
const pub = (key) => L.signatureVerifyingKey(sk(key));
/** A signature by `key`, as the ledger holds it. */
const sig = (key, bytes) => L.signData(sk(key), bytes);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A one-contract chain whose transactions are checked by the real ledger rules. */
const chain = (operations = [], from) => {
  let state = from?.state ?? L.LedgerState.blank(NET);
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
  const tx = (u) => L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(ttl()).addMaintenanceUpdate(u));
  let paperKey = from?.paperKey;
  let address = from?.address;
  if (from === undefined) {
    paperKey = newKey();
    const cs = new L.ContractState();
    cs.maintenanceAuthority = new L.ContractMaintenanceAuthority([pub(paperKey)], 1, 0n);
    const deploy = new L.ContractDeploy(cs);
    apply(L.Transaction.fromParts(NET, undefined, undefined, L.Intent.new(ttl()).addDeploy(deploy)));
    address = deploy.address;
  }
  const send = (u) => apply(tx(u));
  const authority = () => state.index(address).maintenanceAuthority;
  const c = {
    paperKey,
    address,
    apply,
    send,
    tx,
    authority,
    state: () => state,
    /** The contract's whole state, as bytes: unchanged bytes mean nothing changed. */
    bytes: () => Buffer.from(state.index(address).serialize()).toString('hex'),
    /** A throwaway copy at this point (a LedgerState is immutable). */
    fork: () => chain([], { state, paperKey, address }),
  };
  // The real contract has 16 key-adding updates behind it: bring the counter up the same way.
  if (HAVE_VK)
    for (const op of operations) {
      let u = new L.MaintenanceUpdate(
        address,
        [new L.VerifierKeyInsert(op, new L.ContractOperationVersionedVerifierKey('v3', vkBytes()))],
        authority().counter,
      );
      u = u.addSignature(0n, sig(paperKey, u.dataToSign));
      send(u);
    }
  return c;
};

const vkBytes = () => new Uint8Array(readFileSync(VK_FILE));

const holders = () => {
  const keys = { hunter: newKey(), mako: newKey(), backup: newKey() };
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
    forbid: authorityView(c.authority()).committee,
  });
  const s = signRequest(roundTrip(req), c.paperKey);
  const a = assembleSigned(roundTrip(req), [roundTrip(s)], c.authority());
  assert.ok(a.ok, a.ok ? '' : a.problems.join(' '));
  c.send(a.update);
  return req;
};

/** Through JSON and back, as a file sent between people would be. */
const roundTrip = (x) => JSON.parse(JSON.stringify(x));

const request = (c, actions, reason = 'test') =>
  roundTrip(makeRequest({ network: NET, contractAddress: c.address, current: c.authority(), actions, reason }));

const refusedBy = (c, update, re) => {
  const was = c.bytes();
  assert.throws(() => c.send(update), re);
  assert.equal(c.bytes(), was, 'the contract state is byte-identical after the refusal');
};

// ─────────────────────────────────────────────────────────────── key cards

test('a key card proves its key, and nothing else passes for one', () => {
  const key = newKey();
  const card = makeKeyCard('mako', key);
  assert.equal(card.publicKey, pub(key).value);
  assert.deepEqual(checkKeyCard(roundTrip(card)), {
    ok: true,
    holder: 'mako',
    publicKey: card.publicKey,
    practice: false,
  });
  assert.match(checkKeyCard({ ...card, holder: 'hunter' }).problem, /does not match/);
  const other = makeKeyCard('mako', newKey());
  assert.match(checkKeyCard({ ...card, publicKey: other.publicKey }).problem, /does not match/);
  assert.match(checkKeyCard({ ...card, publicKey: '00'.repeat(32) }).problem, /not a valid public key/);
  assert.match(checkKeyCard({ ...card, format: 'x' }).problem, /not a VeilCore committee key card/);
  assert.throws(() => makeKeyCard('Mako Steiner', key), /holder name/);
  // The proof can never double as an approval of a contract change.
  const u = new L.MaintenanceUpdate('ab'.repeat(32), [], 0n);
  assert.match(Buffer.from(u.dataToSign).toString('latin1'), /^midnight:contract-maintenance-update/);
});

// The ledger's own refusals, word for word (ledger 9.1.0.2), so a refusal for some other
// reason does not pass for the one a test is about.
const BAD_SIGNATURE = (place) => new RegExp(`^Error: signature for key id ${place} invalid for contract ContractAddress`);
const NOT_A_MEMBER = (place) =>
  new RegExp(`declared signture for key id ${place} does not correspond to a committee member`);
const SIGNATURE_TWICE = /committee signature used more than once in the transaction/;
const BELOW_THRESHOLD = (have) => new RegExp(`does not meet required threshold \\(${have}/2 signatures\\)`);
const WRONG_COUNTER = /the signed counter for ContractAddress\([0-9a-f]{64}\) did not match the expected one/;
const NOT_NORMAL_FORM = /^Error: transaction is not in normal form$/;

// ─────────────────────────────────────────────────────────── practice cards

/** Three practice holders, as a rehearsal makes them. */
const practiceHolders = () => {
  const keys = { hunter: newKey(), mako: newKey(), backup: newKey() };
  const list = Object.entries(keys).map(([h, k]) => makeKeyCard(`practice-${h}`, k, undefined, { practice: true }));
  return { keys, list };
};

test('a practice card is marked three ways, and the mark cannot be taken off', () => {
  const key = newKey();
  const card = makeKeyCard('practice-mako', key, undefined, { practice: true });
  assert.equal(card.practice, true);
  assert.deepEqual(checkKeyCard(roundTrip(card)), {
    ok: true,
    holder: 'practice-mako',
    publicKey: card.publicKey,
    practice: true,
  });
  // A real card has no such field, and its name cannot start with practice-.
  assert.equal('practice' in makeKeyCard('mako', key), false);
  assert.throws(() => makeKeyCard('practice-mako', key), /starts with "practice-" is for practice cards only/);
  assert.throws(() => makeKeyCard('mako', key, undefined, { practice: true }), /must start with "practice-"/);
  assert.throws(() => makeKeyCard('practice-mako', key, undefined, { practice: 'yes' }), /practice must be true or false/);
  // The mark taken off by hand: the name still gives it away.
  const { practice: _mark, ...unmarked } = card;
  assert.match(checkKeyCard(unmarked).problem, /starts with "practice-" is for practice cards only/);
  // The mark taken off and the card renamed: the proof was made over the practice message.
  assert.match(checkKeyCard({ ...unmarked, holder: 'mako' }).problem, /proof does not match the key/);
  // A real card marked as practice, or a practice proof under a real name: refused too.
  const real = makeKeyCard('mako', key);
  assert.match(checkKeyCard({ ...real, practice: true }).problem, /must start with "practice-"/);
  assert.match(checkKeyCard({ ...real, holder: 'practice-mako', practice: true }).problem, /proof does not match the key/);
  assert.match(checkKeyCard({ ...card, practice: 'true' }).problem, /"practice" must be true or left out/);
  assert.match(checkKeyCard({ ...card, practice: false }).problem, /"practice" must be true or left out/);
  // The two proofs are over different messages.
  assert.notDeepEqual(possessionMessage('practice-mako', card.publicKey, true), possessionMessage('practice-mako', card.publicKey));
});

test('practice cards are refused on mainnet on every path: request, read, sign, confirm, submit', () => {
  const c = chain();
  const p = practiceHolders();
  const refusal = /"practice-hunter" is a PRACTICE card.*never accepted on mainnet/s;
  const args = (network, committee) => ({
    network,
    contractAddress: c.address,
    current: c.authority(),
    actions: [{ kind: 'replace-authority', committee, threshold: 2 }],
  });
  // A test network takes them.
  const local = roundTrip(makeRequest(args(NET, p.list)));
  assert.ok(rebuildRequest(local).ok);
  // Mainnet does not: no request is made.
  assert.throws(() => makeRequest(args('mainnet', p.list)), refusal);
  // One practice card among real ones is enough.
  const h = holders();
  assert.throws(() => makeRequest(args('mainnet', [p.list[0], h.cards.mako, h.cards.backup])), refusal);
  // A request file written by hand for mainnet (the test-network one, relabelled, with or
  // without its data to sign): not read, not signed, not confirmed, not put together.
  for (const forged of [{ ...local, network: 'mainnet' }, { ...local, network: 'mainnet', dataToSign: undefined }]) {
    const r = rebuildRequest(forged);
    assert.equal(r.ok, false);
    assert.match(r.problems.join(' '), refusal);
    assert.throws(() => signRequest(forged, c.paperKey), refusal);
    assert.throws(() => makeConfirmation(forged, p.list[0], p.keys.hunter), refusal);
    assert.match(confirmationProblems(forged, []).join(' '), refusal);
    const put = assembleSigned(forged, [signRequest(local, c.paperKey)], c.authority());
    assert.equal(put.ok, false);
    assert.match(put.problems.join(' '), refusal);
  }
  // The same three real cards on mainnet are fine: only the mark is refused.
  assert.ok(rebuildRequest(roundTrip(makeRequest(args('mainnet', h.list)))).ok);
});

// ───────────────────────────────────────── the old single key is never a member

test('the single key in place cannot be a member of a new committee: request, sign, submit, with or without forbid', () => {
  const c = chain();
  const h = holders();
  const withPaper = [makeKeyCard('hunter', c.paperKey), h.cards.mako, h.cards.backup];
  const refusal = /"hunter" is the contract's current maintenance key .* cannot be a committee member\. Make a new key\./;
  const args = { network: NET, contractAddress: c.address, current: c.authority() };
  // `request --replace` gave no forbid list: refused all the same.
  assert.throws(
    () => makeRequest({ ...args, actions: [{ kind: 'replace-authority', committee: withPaper, threshold: 2 }] }),
    refusal,
  );
  // A request file written by hand, as `submit` and `sign` read it: refused at every step.
  const good = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const { dataToSign: _d, dataToSignSha256: _h, ...bare } = good;
  const forged = { ...bare, actions: [{ kind: 'replace-authority', committee: withPaper, threshold: 2 }] };
  assert.match(rebuildRequest(forged).problems.join(' '), refusal);
  assert.throws(() => signRequest(forged, c.paperKey), refusal);
  const put = assembleSigned(forged, [signRequest(good, c.paperKey)], c.authority());
  assert.equal(put.ok, false);
  assert.match(put.problems.join(' '), refusal);
  // Once a committee of three is in place, its members may stay through a rotation.
  install(c, h);
  const rotate = request(c, [
    { kind: 'replace-authority', committee: [h.cards.hunter, h.cards.mako, makeKeyCard('backup', newKey())], threshold: 2 },
  ]);
  assert.ok(rebuildRequest(rotate).ok);
});

// ─────────────────────────────── confirmations: the new holders sign the check code

test('a new committee is confirmed only when each of its three holders signs the check code with their key', () => {
  const c = chain();
  const h = holders();
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const digest = sha256(rebuildRequest(req).update.dataToSign);
  const confirm = (who) => roundTrip(makeConfirmation(req, h.cards[who], h.keys[who]));
  const all = ['hunter', 'mako', 'backup'].map(confirm);
  assert.equal(all[0].format, CONFIRMATION_FORMAT);
  assert.equal(all[0].dataToSignSha256, digest);
  assert.deepEqual(confirmationProblems(req, all), []);
  assert.deepEqual(confirmationProblems(req, [all[2], all[0], all[1]]), [], 'in any order');
  // The message can never count as a maintenance signature, and holds no key.
  for (const f of all) assert.doesNotMatch(JSON.stringify(f), new RegExp(Object.values(h.keys).join('|')));
  // None, one or two: each missing holder is named.
  const missing = (who) => new RegExp(`No valid confirmation from "${who}" \\(.{17}\\) for check code ${digest.slice(0, 16)}`);
  const none = confirmationProblems(req, []).join(' ');
  for (const who of ['hunter', 'mako', 'backup']) assert.match(none, missing(who));
  const two = confirmationProblems(req, [all[0], all[1]]);
  assert.equal(two.length, 1);
  assert.match(two[0], missing('backup'));
  assert.match(confirmationProblems(req, [all[0], all[0], all[1]]).join(' '), missing('backup'), 'the same holder twice');
  // A holder whose stored key is not the card's (a mistyped paper copy) cannot make one.
  assert.throws(() => makeConfirmation(req, h.cards.mako, newKey()), /That key is NOT the one on mako's card/);
  // A card that is not one of the three, and a card renamed, cannot either.
  const outsider = newKey();
  assert.throws(
    () => makeConfirmation(req, makeKeyCard('eve', outsider), outsider),
    /"eve" \(.{17}\) is not one of the keys this change installs/,
  );
  // A confirmation signed by another key under mako's name, or one edited, does not verify.
  const forged = { ...all[1], signature: makeConfirmation(req, h.cards.hunter, h.keys.hunter).signature };
  assert.match(confirmationProblems(req, [all[0], forged, all[2]]).join(' '), missing('mako'));
  // For another change (another counter, or one key different): refused, and the holder still missing.
  const other = { ...req, current: { ...req.current, counter: '7' }, dataToSign: undefined };
  const stale = confirmationProblems(other, all).join(' ');
  assert.match(stale, /Confirmation 1 was made for a different change \(check code [0-9a-f]{16}; this one is [0-9a-f]{16}\)/);
  assert.match(stale, /No valid confirmation from "hunter"/);
  const swapped = request(c, [
    { kind: 'replace-authority', committee: [h.cards.hunter, h.cards.mako, makeKeyCard('backup', newKey())], threshold: 2 },
  ]);
  assert.match(confirmationProblems(swapped, all).join(' '), /Confirmation 3 was made for a different change/);
  // The same change on another network is another message.
  const elsewhere = { ...req, network: 'preprod', dataToSign: undefined };
  assert.match(confirmationProblems(elsewhere, all).join(' '), /No valid confirmation from "hunter"/);
  // Not a confirmation file at all.
  assert.match(
    confirmationProblems(req, [all[0], all[1], { nonsense: true }]).join(' '),
    /Confirmation 3 is not a VeilCore committee confirmation file/,
  );
  // A maintenance signature is not a confirmation, and a confirmation is not a maintenance signature.
  const s = signRequest(req, c.paperKey);
  assert.match(confirmationProblems(req, [all[0], all[1], s]).join(' '), /Confirmation 3 is not a VeilCore committee confirmation file/);
  const asSig = assembleSigned(req, [{ ...s, signature: all[0].signature }], c.authority());
  assert.equal(asSig.ok, false);
  assert.match(asSig.problems.join(' '), /Signature 1 does not verify/);
  // A change that installs no committee needs none.
  assert.deepEqual(confirmationProblems(request(c, [{ kind: 'retire' }]), []), []);
  assert.throws(
    () => makeConfirmation(request(c, [{ kind: 'retire' }]), h.cards.mako, h.keys.mako),
    /is not one of the keys this change installs/,
  );
});

test('the committee must be three different keys with a threshold of two', () => {
  const h = holders();
  assert.deepEqual(committeeProblems(h.list, 2), []);
  assert.match(committeeProblems(h.list.slice(0, 2), 2).join(), /exactly 3 keys/);
  assert.match(committeeProblems([...h.list, makeKeyCard('x', newKey())], 2).join(), /exactly 3 keys/);
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
  const A = newKey();
  const B = newKey();
  // threshold 0: anyone, no signature.
  let u = new L.MaintenanceUpdate(
    c.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([A, B].map(pub), 0, 1n))],
    0n,
  );
  c.send(u.addSignature(0n, sig(c.paperKey, u.dataToSign)));
  const free = new L.MaintenanceUpdate(
    c.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([], 1, 2n))],
    1n,
  );
  c.send(free); // no signature at all, and the ledger takes it
  assert.equal(c.authority().committee.length, 0);
  // A threshold of 2^32 wraps to 0.
  assert.equal(new L.ContractMaintenanceAuthority([pub(A)], 2 ** 32, 0n).threshold, 0);
  // The same key twice: one holder signs as two members.
  const d = chain();
  u = new L.MaintenanceUpdate(
    d.address,
    [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([A, A, B].map(pub), 2, 1n))],
    0n,
  );
  d.send(u.addSignature(0n, sig(d.paperKey, u.dataToSign)));
  u = new L.MaintenanceUpdate(d.address, [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([], 1, 2n))], 1n);
  d.send(u.addSignature(0n, sig(A, u.dataToSign)).addSignature(1n, sig(A, u.dataToSign)));
  assert.equal(d.authority().committee.length, 0, 'one person changed a "2 of 3" contract alone');
  // The new authority's counter must be exactly current + 1.
  const e = chain();
  for (const n of [0n, 2n, 5n]) {
    u = new L.MaintenanceUpdate(
      e.address,
      [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority([pub(A)], 1, n))],
      0n,
    );
    refusedBy(e, u.addSignature(0n, sig(e.paperKey, u.dataToSign)), NOT_NORMAL_FORM);
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
    authorityView(after).committee,
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
  refusedBy(c, raw.update.addSignature(0n, sig(c.paperKey, raw.update.dataToSign)), BAD_SIGNATURE(0));
  // One committee member alone cannot either.
  const one = assembleSigned(r, [signRequest(r, h.keys.mako)], c.authority());
  assert.equal(one.ok, false);
  assert.match(one.problems.join(), /1 valid signature.*2 are needed/);
  refusedBy(c, raw.update.addSignature(1n, sig(h.keys.mako, raw.update.dataToSign)), BELOW_THRESHOLD(1));
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
        forbid: authorityView(c.authority()).committee,
      }),
    /current maintenance key/,
  );
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  assert.throws(() => signRequest(req, newKey()), /not on the contract's current committee/);
});

// ─────────────────────────────────────────────── later changes: two holders sign

test('any two holders can rotate a lost key out; the lost key is then useless', () => {
  const c = chain();
  const h = holders();
  install(c, h);
  const newHunter = newKey();
  const cards = [makeKeyCard('hunter', newHunter), h.cards.mako, h.cards.backup];
  const req = request(c, [{ kind: 'replace-authority', committee: cards, threshold: 2 }], 'hunter lost his key');
  // Signed in any order, on separate machines, sent by someone else.
  const sigs = [signRequest(req, h.keys.backup), signRequest(req, h.keys.mako)].map(roundTrip);
  const a = assembleSigned(req, sigs, c.authority());
  assert.ok(a.ok);
  c.send(a.update);
  assert.ok(requestLanded(req, c.authority()));
  assert.equal(authorityView(c.authority()).committee[0], cards[0].publicKey);
  // The lost key no longer counts, even together with a member.
  const r2 = request(c, [{ kind: 'retire' }]);
  assert.throws(() => signRequest(r2, h.keys.hunter), /not on the contract's current committee/);
  const raw = rebuildRequest(r2).update;
  refusedBy(
    c,
    raw
      .addSignature(0n, sig(h.keys.hunter, raw.dataToSign))
      .addSignature(1n, sig(h.keys.mako, raw.dataToSign)),
    BAD_SIGNATURE(0),
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
  const D = makeKeyCard('backup', newKey());
  const req = request(c, [{ kind: 'replace-authority', committee: [h.cards.hunter, h.cards.mako, D], threshold: 2 }]);
  const sigs = [signRequest(req, h.keys.hunter), signRequest(req, h.keys.mako)];
  const a = assembleSigned(req, sigs, c.authority());
  assert.ok(a.ok);
  c.send(a.update);
  refusedBy(c, a.update, WRONG_COUNTER); // replayed as is
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
    refusedBy(c, one.addSignature(0n, sig(h.keys.hunter, one.dataToSign)), BELOW_THRESHOLD(1));
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

// ─────────────────────── Ledger 9: the install, from the contract as it stands on mainnet
//
// The start is the main contract's shape on mainnet: VeilCore's 24 circuit names, each with
// its compactc 0.31.1 verifier key in the pre-upgrade slot ('v3'), one maintenance key,
// counter 16 (16 key-adding updates). The key files are checked against the hashes in
// deployments/mainnet.json, so these are the keys on chain, not stand-ins. The data is empty
// and the maintenance key is a throwaway: a maintenance update reads neither.

const MAINNET = JSON.parse(readFileSync(path.join(REPO, 'deployments', 'mainnet.json'), 'utf8')).contracts.find(
  (c) => c.name === 'veilcore',
);
const CIRCUITS = Object.keys(MAINNET.circuits);
const keyFile = (name) => path.join(KEYS_DIR, `${name}.verifier`);
const HAVE_KEYS = CIRCUITS.every((n) => existsSync(keyFile(n)));
const needKeys = {
  skip: HAVE_KEYS
    ? false
    : `VeilCore's compiled verifier keys are not in ${KEYS_DIR}: run "npm run compact" in contract/, or set COMMITTEE_TEST_KEYS`,
};

let mainnetShape;
/** A fresh copy of the contract as it stands on mainnet: 24 circuits, one key, counter 16. */
const asOnMainnet = () => {
  if (mainnetShape === undefined) {
    const c = chain();
    const insert = (names) => {
      const u = new L.MaintenanceUpdate(
        c.address,
        names.map((n) => {
          const vk = new Uint8Array(readFileSync(keyFile(n)));
          assert.equal(sha256(vk), MAINNET.circuits[n].verifierKey, `${n}: the key file is the one on mainnet`);
          return new L.VerifierKeyInsert(n, new L.ContractOperationVersionedVerifierKey('v3', vk));
        }),
        c.authority().counter,
      );
      c.send(u.addSignature(0n, sig(c.paperKey, u.dataToSign)));
    };
    // 16 updates, 24 keys: the first carries nine, the other fifteen one each.
    insert(CIRCUITS.slice(0, 9));
    for (const n of CIRCUITS.slice(9)) insert([n]);
    mainnetShape = c;
  }
  return mainnetShape.fork();
};

const operationHashes = (c) => {
  const cs = c.state().index(c.address);
  return Object.fromEntries(
    cs
      .operations()
      .map(String)
      .sort()
      .map((n) => [n, sha256(cs.operation(n).serialize())]),
  );
};

/** The install with the tool, from request to signed update, each file through JSON. */
const toolInstall = (c, h) => {
  const req = roundTrip(
    makeRequest({
      network: NET,
      contractAddress: c.address,
      current: c.authority(),
      actions: [{ kind: 'replace-authority', committee: h.list, threshold: 2 }],
      reason: 'install the committee',
      forbid: authorityView(c.authority()).committee,
    }),
  );
  const signed = assembleSigned(req, [roundTrip(signRequest(req, c.paperKey))], c.authority());
  assert.ok(signed.ok, signed.ok ? '' : signed.problems.join(' '));
  return { req, update: signed.update };
};

/** A change that leaves the contract as it was: one circuit's key removed and put back. */
const sameKeyAgain = (c) => {
  const vk = readFileSync(keyFile('anchor'));
  return request(c, [
    { kind: 'remove-key', circuit: 'anchor' },
    { kind: 'insert-key', circuit: 'anchor', verifierKey: vk.toString('hex'), verifierKeySha256: sha256(vk) },
  ]);
};

test('Ledger 9: the start is the contract as on mainnet (24 circuits, one key, counter 16)', needKeys, () => {
  const c = asOnMainnet();
  const a = authorityView(c.authority());
  assert.equal(CIRCUITS.length, 24);
  assert.deepEqual(c.state().index(c.address).operations().map(String).sort(), [...CIRCUITS].sort());
  assert.deepEqual(a, { committee: [pub(c.paperKey).value], threshold: 1, counter: 16n });
});

test('Ledger 9: the install the tool builds is accepted; the counter becomes 17', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  const before = operationHashes(c);
  const { req, update } = toolInstall(c, h);
  // What the people signing and sending are shown: every key in full, the counter, the warning.
  const shown = describeRequest(req, rebuildRequest(req)).join('\n');
  assert.match(shown, new RegExp(`Now: +1 key\\(s\\), 1 signature\\(s\\) needed, counter 16\\.\\n +1\\. ${pub(c.paperKey).value}`));
  assert.match(shown, /After: +3 keys, 2 signatures needed, counter 17\./);
  for (const card of h.list) assert.ok(shown.includes(`${card.publicKey} (${card.holder})`));
  assert.ok(shown.includes(PERMANENT_WARNING));
  assert.match(PERMANENT_WARNING, /wrong committee key is PERMANENT/);

  c.send(update);
  assert.deepEqual(authorityView(c.authority()), {
    committee: h.list.map((x) => x.publicKey),
    threshold: 2,
    counter: 17n,
  });
  assert.ok(requestLanded(req, c.authority()));
  assert.deepEqual(operationHashes(c), before, 'all 24 circuit keys are unchanged');
});

test('Ledger 9: after the install the old key is refused', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  const { update: installUpdate } = toolInstall(c, h);
  c.send(installUpdate);
  const req = sameKeyAgain(c);
  // The tool gives the old key no signature, and counts none from it.
  assert.throws(() => signRequest(req, c.paperKey), /not on the contract's current committee/);
  const forged = { ...signRequest(req, h.keys.hunter), signature: sig(c.paperKey, rebuildRequest(req).update.dataToSign).value };
  assert.equal(assembleSigned(req, [forged, signRequest(req, h.keys.mako)], c.authority()).ok, false);
  // The ledger refuses it in every place, alone, doubled, or beside a real member.
  const raw = rebuildRequest(req).update;
  const old = sig(c.paperKey, raw.dataToSign);
  for (const i of [0, 1, 2]) refusedBy(c, raw.addSignature(BigInt(i), old), BAD_SIGNATURE(i));
  refusedBy(c, raw.addSignature(3n, old), NOT_A_MEMBER(3));
  refusedBy(c, raw.addSignature(0n, old).addSignature(1n, old), SIGNATURE_TWICE);
  refusedBy(c, raw.addSignature(0n, old).addSignature(1n, sig(h.keys.mako, raw.dataToSign)), BAD_SIGNATURE(0));
  // The install itself cannot be sent a second time: its one signature is the old key's, and
  // place 0 is now a holder's.
  refusedBy(c, installUpdate, BAD_SIGNATURE(0));
  assert.equal(c.authority().counter, 17n);
});

test('Ledger 9: one signature is refused', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  c.send(toolInstall(c, h).update);
  const req = sameKeyAgain(c);
  const raw = rebuildRequest(req).update;
  for (const [i, who] of ['hunter', 'mako', 'backup'].entries()) {
    const one = assembleSigned(req, [signRequest(req, h.keys[who])], c.authority());
    assert.equal(one.ok, false);
    assert.match(one.problems.join(), /1 valid signature.*2 are needed/);
    refusedBy(c, raw.addSignature(BigInt(i), sig(h.keys[who], raw.dataToSign)), BELOW_THRESHOLD(1));
  }
  refusedBy(c, raw, BELOW_THRESHOLD(0)); // and none at all
  assert.equal(c.authority().counter, 17n);
});

test('Ledger 9: the same holder signing twice is refused', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  c.send(toolInstall(c, h).update);
  const req = sameKeyAgain(c);
  const m = signRequest(req, h.keys.mako);
  const twice = assembleSigned(req, [m, roundTrip(m)], c.authority());
  assert.equal(twice.ok, false);
  assert.match(twice.problems.join(), /second signature from the same key/);
  // Under another member's place: the tool refuses it, and so does the ledger.
  assert.equal(assembleSigned(req, [m, { ...m, index: 0, publicKey: h.cards.hunter.publicKey }], c.authority()).ok, false);
  const raw = rebuildRequest(req).update;
  const s = sig(h.keys.mako, raw.dataToSign);
  refusedBy(c, raw.addSignature(0n, s).addSignature(1n, s), SIGNATURE_TWICE);
  refusedBy(c, raw.addSignature(1n, s).addSignature(2n, s), SIGNATURE_TWICE);
  refusedBy(c, raw.addSignature(1n, s).addSignature(1n, s), SIGNATURE_TWICE);
  assert.equal(c.authority().counter, 17n);
});

test('Ledger 9: every pair of two holders is accepted', needKeys, () => {
  const base = asOnMainnet();
  const h = holders();
  base.send(toolInstall(base, h).update);
  const before = operationHashes(base);
  for (const [a, b] of [
    ['hunter', 'mako'],
    ['hunter', 'backup'],
    ['mako', 'backup'],
  ]) {
    const c = base.fork();
    const req = sameKeyAgain(c);
    // Signed in either order, on separate machines.
    const signed = assembleSigned(req, [signRequest(req, h.keys[b]), signRequest(req, h.keys[a])].map(roundTrip), c.authority());
    assert.ok(signed.ok, `${a} and ${b}`);
    c.send(signed.update);
    assert.equal(c.authority().counter, 18n, `${a} and ${b}`);
    assert.equal(c.authority().committee.length, 3);
    assert.deepEqual(operationHashes(c), before);
  }
  assert.equal(base.authority().counter, 17n, 'the copies did not touch the original');
});

test('Ledger 9: a wrong counter is refused', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  const current = authorityView(c.authority());
  for (const counter of [15n, 17n, 0n]) {
    const req = roundTrip(
      makeRequest({
        network: NET,
        contractAddress: c.address,
        current: { ...current, counter },
        actions: [{ kind: 'replace-authority', committee: h.list, threshold: 2 }],
      }),
    );
    const s = signRequest(req, c.paperKey);
    // The tool refuses to put it together against the chain as it is.
    const put = assembleSigned(req, [s], c.authority());
    assert.equal(put.ok, false, `counter ${counter}`);
    assert.match(put.problems.join(), /chain's counter is 16.*can never be used/s);
    // And the ledger refuses it when it is sent anyway.
    const raw = rebuildRequest(req).update;
    refusedBy(c, raw.addSignature(0n, sk(s.signature)), WRONG_COUNTER);
  }
  // The right counter for the update, a wrong one inside the new authority (it must be 17).
  for (const next of [16n, 18n]) {
    const u = new L.MaintenanceUpdate(
      c.address,
      [new L.ReplaceAuthority(new L.ContractMaintenanceAuthority(h.list.map((x) => sk(x.publicKey)), 2, next))],
      16n,
    );
    refusedBy(c, u.addSignature(0n, sig(c.paperKey, u.dataToSign)), NOT_NORMAL_FORM);
  }
  assert.equal(c.authority().counter, 16n);
  assert.equal(c.authority().committee.length, 1);
});

test('Ledger 9: a signature made with ledger-v8 is refused', needKeys, () => {
  const c = asOnMainnet();
  const h = holders();
  const { req, update } = toolInstall(c, h);
  const raw = rebuildRequest(req).update;
  // The same change as Ledger 8 writes it, signed by the same key with ledger-v8.
  const u8 = new L8.MaintenanceUpdate(
    c.address,
    [new L8.ReplaceAuthority(new L8.ContractMaintenanceAuthority(h.list.map((x) => x.publicKey), 2, 17n))],
    16n,
  );
  assert.equal(L8.signatureVerifyingKey(c.paperKey), pub(c.paperKey).value, 'the key itself is the same on both');
  assert.notEqual(Buffer.from(u8.dataToSign).toString('hex'), Buffer.from(raw.dataToSign).toString('hex'));
  const sig8 = L8.signData(c.paperKey, u8.dataToSign);
  assert.ok(L8.verifySignature(L8.signatureVerifyingKey(c.paperKey), u8.dataToSign, sig8), 'valid on Ledger 8');
  // In a signature file of today's format: it does not verify.
  const good = signRequest(req, c.paperKey);
  const file8 = assembleSigned(req, [{ ...good, signature: sig8 }], c.authority());
  assert.equal(file8.ok, false);
  assert.match(file8.problems.join(), /does not verify.*Ledger 8/);
  // In a file the Ledger 8 tool wrote: refused by its format, as is a Ledger 8 request.
  const old = assembleSigned(req, [{ ...good, format: 'veilcore-maintenance-signature/v1', signature: sig8 }], c.authority());
  assert.equal(old.ok, false);
  assert.match(old.problems.join(), /before Midnight's Ledger 9 upgrade/);
  assert.match(
    rebuildRequest({ ...req, format: 'veilcore-maintenance-request/v1' }).problems.join(),
    /before Midnight's Ledger 9 upgrade/,
  );
  // Sent anyway: the ledger refuses it, and nothing changes.
  refusedBy(c, raw.addSignature(0n, sk(sig8)), BAD_SIGNATURE(0));
  assert.equal(c.authority().counter, 16n);
  // A Ledger 8 transaction is not even read by Ledger 9.
  const tx8 = L8.Transaction.fromParts(
    NET,
    undefined,
    undefined,
    L8.Intent.new(new Date(Date.now() + 3_600_000)).addMaintenanceUpdate(u8.addSignature(0n, sig8)),
  );
  assert.throws(() => L.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', tx8.serialize()));
  // The Ledger 9 signature over the same change is accepted.
  c.send(update);
  assert.equal(c.authority().counter, 17n);
});

test('Ledger 9: the transaction is read and accepted by the wallet\'s copy of ledger-v9 too (what midnight-js 5.0.1 and the wallet use)', needKeys, () => {
  const c = asOnMainnet();
  const { update } = toolInstall(c, holders());
  const bytes = c.tx(update).serialize();
  const tx = LWallet.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
  const state = LWallet.LedgerState.deserialize(c.state().serialize());
  const strict = new LWallet.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const [next, result] = state.apply(
    tx.eraseProofs().wellFormed(state, strict, new Date()),
    new LWallet.TransactionContext(state, {
      secondsSinceEpoch: now,
      secondsSinceEpochErr: 30,
      parentBlockHash: '00'.repeat(32),
      lastBlockTime: now - 6n,
    }),
  );
  assert.equal(result.type, 'success');
  assert.equal(next.index(c.address).maintenanceAuthority.counter, 17n);
  // The fee a replace-authority costs is computed the same by both versions.
  const fee = (Lx, t) => t.fees(Lx.LedgerParameters.initialParameters());
  assert.equal(fee(L, c.tx(update)), fee(LWallet, tx));
});

// ────────────────────────────────────────────── sending, against the same ledger

/**
 * midnight-js 5 providers over a local ledger on Ledger 9 (protocol version 2.x), whose
 * indexer hands over Ledger 9 state bytes. A maintenance update has no circuit to prove:
 * proving it only changes its stage.
 */
const framework = (c, { watch, submit, protocolVersion = 2_001_000, networkId = NET }) => {
  const placeholderProver = {
    check: async () => [],
    prove: async () => new L.Proof('0100').serialize(),
    lookupKey: async () => undefined,
  };
  const read9 = (tx) => tx.deserialize({ v9: L.Transaction });
  return {
    publicDataProvider: {
      queryContractState: async (a) => ({
        protocolVersion,
        contractState: SerializedContractState.fromBytes('v9', c.state().index(a).serialize()),
      }),
      queryLatestProtocolVersion: async () => protocolVersion,
      watchForTxData: async (txId) => {
        if (watch()) throw new Error('websocket closed');
        return { era: 'v9', txId, txHash: txId, blockHeight: 1, status: 'SucceedEntirely' };
      },
    },
    proofProvider: createProofProviderFromHandlers({
      v8: undefined,
      v9: (tx) => read9(tx).prove(placeholderProver, L.CostModel.initialCostModel()),
    }),
    walletProvider: createWalletProviderFromHandlers({
      v8: undefined,
      v9: async (tx) => read9(tx).bind(),
      getCoinPublicKey: () => '00'.repeat(32),
      getEncryptionPublicKey: () => '00'.repeat(32),
    }),
    midnightProvider: createMidnightProviderFromHandlers({
      v8: undefined,
      v9: async (tx) => submit(read9(tx)),
    }),
    config: { networkId, ttlSeconds: 3600 },
  };
};

const signedInstall = (c, h) => {
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const signed = assembleSigned(req, [signRequest(req, c.paperKey)], c.authority());
  assert.ok(signed.ok);
  return { req, update: signed.update, landed: (a) => requestLanded(req, a) };
};

test('sendMaintenanceUpdate: refused before anything is built on a network still on Ledger 8', async () => {
  const c = chain();
  const { update, landed } = signedInstall(c, holders());
  let submitted = 0;
  const notForked = framework(c, { watch: () => false, submit: () => `tx${++submitted}`, protocolVersion: 1_000_000 });
  await assert.rejects(
    () => sendMaintenanceUpdate(notForked, c.address, update, landed, { waitMs: 1 }),
    /not on Midnight Ledger 9.*Nothing was built or sent/s,
  );
  assert.equal(submitted, 0);
  assert.equal(c.authority().counter, 0n, 'nothing changed on chain');
});

test('sendMaintenanceUpdate: mainnet is refused unless the caller allows it', async () => {
  const c = chain();
  const { update, landed } = signedInstall(c, holders());
  let asked = 0;
  let submitted = 0;
  const mainnet = framework(c, { watch: () => false, submit: () => `tx${++submitted}`, networkId: 'mainnet' });
  const read = mainnet.publicDataProvider.queryContractState;
  mainnet.publicDataProvider.queryContractState = async (a) => (asked++, read(a));
  for (const options of [undefined, {}, { allowMainnet: false }, { allowMainnet: 'yes' }, { allowMainnet: 1 }])
    await assert.rejects(() => sendMaintenanceUpdate(mainnet, c.address, update, landed, options), (e) => e.message === MAINNET_REFUSAL);
  assert.equal(asked, 0, 'refused before the chain is even read');
  assert.equal(submitted, 0);
  assert.equal(c.authority().counter, 0n, 'nothing changed');
});

test("readAuthorityNow reads the authority from either ledger's state bytes", async () => {
  const c = chain();
  const read9 = await readAuthorityNow(framework(c, { watch: () => false, submit: () => '' }).publicDataProvider, c.address);
  assert.deepEqual(read9, { committee: [pub(c.paperKey).value], threshold: 1, counter: 0n });
  // A Ledger 8 state (a network not yet upgraded): keys are bare hex; the view is the same.
  const cs8 = new L8.ContractState();
  cs8.maintenanceAuthority = new L8.ContractMaintenanceAuthority([pub(c.paperKey).value], 1, 3n);
  const read8 = await readAuthorityNow(
    { queryContractState: async () => ({ contractState: SerializedContractState.fromBytes('v8', cs8.serialize()) }) },
    c.address,
  );
  assert.deepEqual(read8, { committee: read9.committee, threshold: 1, counter: 3n });
});

test('sendMaintenanceUpdate: sent once, confirmed from the chain, never twice', async () => {
  const c = chain();
  const h = holders();
  const { update, landed } = signedInstall(c, h);
  let submitted = 0;
  let loseConfirmation = false;
  const providers = framework(c, {
    watch: () => loseConfirmation,
    submit: (tx) => {
      submitted++;
      c.apply(tx);
      return `tx${submitted}`;
    },
  });
  const r = await sendMaintenanceUpdate(providers, c.address, update, landed, { waitMs: 1 });
  assert.equal(r.sent, true);
  assert.equal(submitted, 1);
  assert.equal(r.authority.threshold, 2);
  const again = await sendMaintenanceUpdate(providers, c.address, update, landed, { waitMs: 1 });
  assert.equal(again.sent, false, 'run again: the chain shows it, nothing is sent');
  assert.equal(submitted, 1);

  // Landed, but the confirmation was lost: the chain says it landed, so it is not an error.
  const d = chain();
  const second = signedInstall(d, h);
  loseConfirmation = true;
  const p2 = framework(d, { watch: () => loseConfirmation, submit: (tx) => (d.apply(tx), 'txL') });
  const lost = await sendMaintenanceUpdate(p2, d.address, second.update, second.landed, { waitMs: 1 });
  assert.equal(lost.sent, true);
  assert.ok(second.landed(d.authority()));

  // Refused by the network: the error comes back, nothing is claimed.
  loseConfirmation = false;
  const e = chain();
  const req3 = request(e, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const bad = rebuildRequest(req3).update.addSignature(0n, sig(newKey(), rebuildRequest(req3).update.dataToSign));
  const p3 = framework(e, { watch: () => false, submit: (tx) => (e.apply(tx), 'txR') });
  await assert.rejects(
    () => sendMaintenanceUpdate(p3, e.address, bad, (a) => requestLanded(req3, a), { waitMs: 1 }),
    // midnight-js 5 wraps a provider's failure (ProviderFailedError); the ledger's reason is its cause.
    (err) => /invalid/.test(String(err?.cause?.message ?? err?.message)),
  );
  assert.equal(e.authority().committee.length, 1);
});

test('before anything is sent: the transaction must read back the same in the ledger copy the wallet uses', async () => {
  const c = chain();
  const { update, landed } = signedInstall(c, holders());
  // `ledger-v9-committee` built it; @midnightntwrk/ledger-v9 (midnight-js 5.0.1, the wallet) reads the same bytes.
  // Both are 1.0.2, installed under two names.
  assert.equal(LWallet.Transaction === L.Transaction, false, 'two separate copies of the ledger');
  assert.doesNotThrow(() => assertReadableByWalletLedger(c.tx(update), update));
  const bytes = c.tx(update).serialize();
  const back = LWallet.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
  assert.deepEqual(Buffer.from(back.serialize()), Buffer.from(bytes));
  assert.deepEqual(
    Buffer.from(L.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', back.serialize()).serialize()),
    Buffer.from(bytes),
  );
  // A wallet ledger that cannot read it, reads it differently, or reads another update: stopped.
  const cannot = { deserialize: () => { throw new Error('unknown tag'); } };
  const differs = { deserialize: () => ({ serialize: () => bytes.slice(1), intents: new Map() }) };
  const other = rebuildRequest(request(c, [{ kind: 'retire' }])).update;
  for (const [decoder, u, why] of [
    [cannot, update, /does not read this transaction as it was built \(it could not be read: unknown tag\)/],
    [differs, update, /does not read this transaction as it was built \(it reads back as different bytes\)/],
    [undefined, other, /does not read this transaction as it was built \(it does not hold this one maintenance update\)/],
  ])
    assert.throws(() => assertReadableByWalletLedger(c.tx(update), u, decoder), why);
  // In the sending path it comes before the proof server and the wallet: nothing is submitted.
  let submitted = 0;
  const providers = framework(c, { watch: () => false, submit: () => `tx${++submitted}` });
  await assert.rejects(
    () => sendMaintenanceUpdate(providers, c.address, update, landed, { waitMs: 1, walletLedgerTransaction: cannot }),
    /it could not be read: unknown tag\)\. The two ledger versions in this tool no longer agree\. Nothing was sent\./,
  );
  assert.equal(submitted, 0);
  assert.equal(c.authority().counter, 0n, 'nothing changed on chain');
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
  const wrong = await cli(['check', '--card', 'committee-key-mako.json'], [newKey()], dir);
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
      input.write(`${newKey()}\n`); // a copying mistake first
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
  assert.equal(card.publicKey, pub(key).value);
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

test('keygen --practice: a practice card needs the flag and the name, and says what it is', async () => {
  const dir = tmp();
  const key = path.join(dir, 'p.key');
  const made = await cli(['keygen', '--practice', '--holder', 'practice-mako', '--out', key], [], dir);
  assert.equal(made.code, 0, made.screen);
  assert.match(made.screen, /PRACTICE KEY: for a rehearsal only\. Its card is marked as practice and is refused on mainnet\./);
  const card = JSON.parse(readFileSync(path.join(dir, 'committee-key-practice-mako.json'), 'utf8'));
  assert.equal(card.practice, true);
  assert.deepEqual(checkKeyCard(card), { ok: true, holder: 'practice-mako', publicKey: card.publicKey, practice: true });
  assert.equal(JSON.parse(readFileSync(key, 'utf8')).practice, true);
  const checked = await cli(['check', '--card', 'committee-key-practice-mako.json', '--key-file', key], [], dir);
  assert.equal(checked.code, 0);
  assert.match(checked.screen, /This is a PRACTICE card: for a rehearsal only\. It is refused on mainnet\./);
  // The flag without the name, the name without the flag, the flag with a value: nothing is made.
  const noName = await cli(['keygen', '--practice', '--holder', 'mako', '--out', path.join(dir, 'a.key')], [], dir);
  assert.equal(noName.code, 1);
  assert.match(noName.screen, /A practice key's holder name must start with "practice-": --practice --holder practice-mako\. Nothing was made\./);
  const noFlag = await cli(['keygen', '--holder', 'practice-hunter', '--out', path.join(dir, 'b.key')], [], dir);
  assert.equal(noFlag.code, 1);
  assert.match(noFlag.screen, /A holder name that starts with "practice-" is for rehearsals: add --practice\. Nothing was made\./);
  const valued = await cli(['keygen', '--holder', 'practice-x', '--practice', 'yes', '--out', path.join(dir, 'c.key')], [], dir);
  assert.equal(valued.code, 1);
  assert.match(valued.screen, /--practice takes no value\. Nothing was made\./);
  for (const f of ['a.key', 'b.key', 'c.key', 'committee-key-mako.json', 'committee-key-practice-hunter.json'])
    assert.equal(existsSync(path.join(dir, f)), false, f);
  // A real key says nothing about practice.
  const real = await cli(['keygen', '--holder', 'mako', '--out', path.join(dir, 'm.key')], [], dir);
  assert.equal(real.code, 0);
  assert.doesNotMatch(real.screen, /PRACTICE/);
  assert.equal('practice' in JSON.parse(readFileSync(path.join(dir, 'committee-key-mako.json'), 'utf8')), false);
});

test('confirm: a new holder signs the check code from the dry-run record, offline, with the stored key', async () => {
  const c = chain();
  const h = holders();
  const dir = tmp();
  const req = request(c, [{ kind: 'replace-authority', committee: h.list, threshold: 2 }]);
  const digest = sha256(rebuildRequest(req).update.dataToSign);
  const record = { format: DRY_RUN_FORMAT, network: NET, dataToSignSha256: digest, request: req };
  const write = (name, value) => writeFileSync(path.join(dir, name), JSON.stringify(value));
  write('dry.json', record);
  for (const who of ['hunter', 'mako', 'backup']) write(`${who}.json`, h.cards[who]);
  const base = ['confirm', '--record', 'dry.json'];

  // Not typed: nothing signed. The change and its check code are shown first.
  const no = await cli([...base, '--card', 'mako.json', '--out', 'no.json'], ['yes'], dir);
  assert.equal(no.code, 1);
  assert.match(no.screen, new RegExp(`Check code: ${digest.slice(0, 16)}`));
  assert.match(no.screen, /After: +3 keys, 2 signatures needed, counter 1\./);
  assert.match(no.screen, /Not confirmed\. Nothing was signed\./);
  // Real cards on a test network: a warning for each, not a refusal. Practice cards: none.
  assert.equal(no.screen.match(/WARNING: "(hunter|mako|backup)" \(.{17}\) is NOT a practice card, and this is undeployed/g).length, 3);
  const quiet = practiceHolders();
  const pr = request(c, [{ kind: 'replace-authority', committee: quiet.list, threshold: 2 }]);
  write('p-req.json', pr);
  const shown = await cli(['read', '--request', 'p-req.json'], [], dir);
  assert.equal(shown.code, 0);
  assert.doesNotMatch(shown.screen, /NOT a practice card/);
  write('real-req.json', req);
  assert.match((await cli(['read', '--request', 'real-req.json'], [], dir)).screen, /WARNING: "hunter" .* is NOT a practice card/);
  // A stored copy that is not the card's key (the typo this step exists to find): nothing written.
  const typo = await cli([...base, '--card', 'mako.json', '--out', 'typo.json'], ['CONFIRM', newKey()], dir);
  assert.equal(typo.code, 1);
  assert.match(typo.screen, /That key is NOT the one on mako's card .* Nothing was signed\. Tell the person installing the committee: it must not be sent\./);
  // From paper, and from a key file: the key is never on screen or in the file.
  const yes = await cli([...base, '--card', 'mako.json', '--out', 'c-mako.json'], ['CONFIRM', h.keys.mako], dir);
  assert.equal(yes.code, 0, yes.screen);
  assert.match(yes.screen, new RegExp(`Confirmed by mako \\(.{17}\\) for check code ${digest.slice(0, 16)}\\.`));
  assert.doesNotMatch(yes.screen, new RegExp(h.keys.mako));
  assert.doesNotMatch(readFileSync(path.join(dir, 'c-mako.json'), 'utf8'), new RegExp(h.keys.mako));
  const files = [JSON.parse(readFileSync(path.join(dir, 'c-mako.json'), 'utf8'))];
  for (const who of ['hunter', 'backup']) {
    const keyFile = path.join(tmp(), `${who}.key`);
    writeFileSync(keyFile, JSON.stringify({ signingKey: h.keys[who] }));
    const r = await cli([...base, '--card', `${who}.json`, '--key-file', keyFile, '--out', `c-${who}.json`], ['CONFIRM'], dir);
    assert.equal(r.code, 0, r.screen);
    files.push(JSON.parse(readFileSync(path.join(dir, `c-${who}.json`), 'utf8')));
  }
  assert.deepEqual(confirmationProblems(req, files), [], 'the three files are what the sending tool needs');
  // A card that is not one of the three.
  const eve = newKey();
  write('eve.json', makeKeyCard('eve', eve));
  const out = await cli([...base, '--card', 'eve.json', '--out', 'eve-c.json'], ['CONFIRM', eve], dir);
  assert.equal(out.code, 1);
  assert.match(out.screen, /"eve" \(.{17}\) is not one of the keys this change installs\. .* Nothing was signed\./);
  // A record whose check code is not its request's, an old-format record, a change with no committee.
  write('edited.json', { ...record, dataToSignSha256: 'ab'.repeat(32) });
  const edited = await cli(['confirm', '--record', 'edited.json', '--card', 'mako.json'], ['CONFIRM', h.keys.mako], dir);
  assert.equal(edited.code, 1);
  assert.match(edited.screen, /The record says one check code and the change inside it gives another: the file was changed after it was made\./);
  write('v1.json', { ...record, format: 'veilcore-maintenance-dry-run/v1' });
  const v1 = await cli(['confirm', '--record', 'v1.json', '--card', 'mako.json'], ['CONFIRM', h.keys.mako], dir);
  assert.equal(v1.code, 1);
  assert.match(v1.screen, /v1\.json is not a dry-run record \(veilcore-maintenance-dry-run\/v2\)/);
  const retire = request(c, [{ kind: 'retire' }]);
  write('retire.json', { ...record, request: retire, dataToSignSha256: sha256(rebuildRequest(retire).update.dataToSign) });
  const none = await cli(['confirm', '--record', 'retire.json', '--card', 'mako.json'], ['CONFIRM', h.keys.mako], dir);
  assert.equal(none.code, 1);
  assert.match(none.screen, /This change installs no new committee, so there is nothing to confirm\. Nothing was signed\./);
  // On mainnet: only for the pinned contract, and never for practice cards.
  const main = { ...req, network: 'mainnet', dataToSign: undefined };
  write('main.json', { ...record, request: main, dataToSignSha256: sha256(rebuildRequest(main).update.dataToSign) });
  const pin = await cli(['confirm', '--record', 'main.json', '--card', 'mako.json'], ['CONFIRM', h.keys.mako], dir);
  assert.equal(pin.code, 1);
  assert.match(pin.screen, /on mainnet this tool confirms only for the pinned VeilCore main contract\. Nothing was signed\./);
  const p = practiceHolders();
  const practice = { ...request(c, [{ kind: 'replace-authority', committee: p.list, threshold: 2 }]), network: 'mainnet', dataToSign: undefined };
  write('practice.json', { ...record, request: practice });
  write('p-hunter.json', p.list[0]);
  const refused = await cli(['confirm', '--record', 'practice.json', '--card', 'p-hunter.json'], ['CONFIRM', p.keys.hunter], dir);
  assert.equal(refused.code, 1);
  assert.match(refused.screen, /This change cannot be confirmed: "practice-hunter" is a PRACTICE card.*never accepted on mainnet/s);
  for (const f of ['no.json', 'typo.json', 'eve-c.json'])
    assert.equal(existsSync(path.join(dir, f)), false, f);
});

// ──────────────────────── the verifier-key slot: V3 for v1, V4 for contract v2
//
// compactc 0.31 (v1) keys go in ContractOperationVersion 'v3'; compactc 0.36 (contract v2,
// ZKIR v3) keys in 'v4' (docs/contract-v2.md 1.2). The tool used to hard-code 'v3'. The slot
// is now a parameter of each key action, checked against the contract's slot
// (request.current.keySlot) and against the key's own header, and the ledger agrees.
//
// fixtures/zkir-v3-example.verifier is a compactc 0.36.1 verifier key from Midnight's
// examples (midnightntwrk/midnight-examples, examples/leaderboard/contract/managed/leaderboard/
// keys/submitScore.verifier, Apache-2.0), SHA-256
// 7e2a95768e28411ef88624a96f8f857c53e662fd84b3fa00301b88bb819cbdba. The v1-format key is
// midnight-js's own ledger-8 test fixture.

const V4_KEY_FILE = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'zkir-v3-example.verifier');
const V3_KEY_FILE = path.join(
  REPO,
  'node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier',
);
const v4Key = () => new Uint8Array(readFileSync(V4_KEY_FILE));
const v3Key = () => new Uint8Array(readFileSync(V3_KEY_FILE));
const keyAction = (circuit, vk, keySlot) => ({
  kind: 'insert-key',
  circuit,
  verifierKey: Buffer.from(vk).toString('hex'),
  verifierKeySha256: sha256(vk),
  ...(keySlot === undefined ? {} : { keySlot }),
});
/** A fresh one-key contract on the local ledger, whose request says its keys are in `keySlot`. */
const slotted = (keySlot) => {
  const c = chain();
  const current = () => ({ ...authorityView(c.authority()), ...(keySlot === undefined ? {} : { keySlot }) });
  const req = (actions) =>
    roundTrip(makeRequest({ network: NET, contractAddress: c.address, current: current(), actions, reason: 'slot' }));
  const sendSigned = (r) => c.send(assembleSigned(r, [signRequest(r, c.paperKey)], c.authority()).update);
  return { c, req, sendSigned };
};

test('key slot: absent is v3; a slot must match the contract; unknown slots are refused', () => {
  assert.deepEqual(keySlotFor({ circuit: 'anchor' }, {}), { slot: 'v3' });
  assert.deepEqual(keySlotFor({ circuit: 'anchor', keySlot: 'v3' }, { keySlot: 'v3' }), { slot: 'v3' });
  assert.deepEqual(keySlotFor({ circuit: 'anchor', keySlot: 'v4' }, { keySlot: 'v4' }), { slot: 'v4' });
  assert.match(keySlotFor({ circuit: 'anchor', keySlot: 'v4' }, {}).problem, /keys are in slot V3, .* uses V4/);
  assert.match(keySlotFor({ circuit: 'anchor' }, { keySlot: 'v4' }).problem, /keys are in slot V4, .* uses V3/);
  assert.match(keySlotFor({ circuit: 'anchor', keySlot: 'v3' }, { keySlot: 'v4' }).problem, /wrong slot/);
  assert.match(keySlotFor({ circuit: 'anchor', keySlot: 'v5' }, { keySlot: 'v5' }).problem, /Unknown key slot/);
  assert.match(keySlotFor({ circuit: 'anchor' }, { keySlot: 'V4' }).problem, /unknown slot/);
});

test('key slot: a key says which slot it is for', () => {
  assert.equal(slotOfKeyBytes(v4Key()), 'v4');
  assert.equal(slotOfKeyBytes(v3Key()), 'v3');
  assert.equal(slotOfKeyBytes(new Uint8Array(64)), undefined);
});

test('key slot: a request with no slot rebuilds to the same bytes as before the slot existed', () => {
  const c = chain();
  const vk = v3Key();
  const r = request(c, [keyAction('anchor', vk), { kind: 'remove-key', circuit: 'pairDna' }]);
  const old = new L.MaintenanceUpdate(
    c.address,
    [
      new L.VerifierKeyInsert('anchor', new L.ContractOperationVersionedVerifierKey('v3', vk)),
      new L.VerifierKeyRemove('pairDna', new L.ContractOperationVersion('v3')),
    ],
    c.authority().counter,
  );
  assert.equal(r.dataToSign, Buffer.from(old.dataToSign).toString('hex'));
});

test('key slot: a v2 (0.36.1) key goes in V4 on a V4 contract, and the ledger accepts it', () => {
  const { c, req, sendSigned } = slotted('v4');
  const r = req([keyAction('proveAttested', v4Key(), 'v4')]);
  assert.match(describeRequest(r, rebuildRequest(r)).join('\n'), /slot V4, SHA-256 .*fingerprints-v2\.md/);
  sendSigned(r);
  assert.deepEqual(c.state().index(c.address).operations().map(String), ['proveAttested']);
  // The same bytes, built by hand in V4: what the tool signed is exactly that.
  const byHand = new L.MaintenanceUpdate(
    c.address,
    [new L.VerifierKeyInsert('x', new L.ContractOperationVersionedVerifierKey('v4', v4Key()))],
    0n,
  );
  const r2 = req([keyAction('x', v4Key(), 'v4')]);
  assert.notEqual(r2.dataToSign, Buffer.from(byHand.dataToSign).toString('hex'), 'counter moved on');
  const again = new L.MaintenanceUpdate(
    c.address,
    [new L.VerifierKeyInsert('x', new L.ContractOperationVersionedVerifierKey('v4', v4Key()))],
    c.authority().counter,
  );
  assert.equal(r2.dataToSign, Buffer.from(again.dataToSign).toString('hex'));
});

test('key slot: the wrong slot is refused before signing, and the ledger would refuse it too', () => {
  // A V4 key with no slot named (so V3) on a V3 contract: refused by the key's own header.
  const v3c = slotted(undefined);
  assert.throws(() => v3c.req([keyAction('a', v4Key())]), /is a V4 key, but it would go in slot V3/);
  // A V3 key named V4 on a V4 contract: refused by its header.
  const v4c = slotted('v4');
  assert.throws(() => v4c.req([keyAction('a', v3Key(), 'v4')]), /is a V3 key, but it would go in slot V4/);
  // A V3 action on a V4 contract, and a V4 action on a V3 contract: refused by the contract's slot.
  assert.throws(() => v4c.req([keyAction('a', v4Key())]), /keys are in slot V4, .* uses V3/);
  assert.throws(() => v4c.req([{ kind: 'remove-key', circuit: 'a' }]), /keys are in slot V4, .* uses V3/);
  assert.throws(() => v3c.req([keyAction('a', v4Key(), 'v4')]), /keys are in slot V3, .* uses V4/);
  // The ledger's own rule, which the checks above mirror: each slot takes only its own keys.
  const raw = (slot, vk) => {
    const u = new L.MaintenanceUpdate(
      v3c.c.address,
      [new L.VerifierKeyInsert('raw', new L.ContractOperationVersionedVerifierKey(slot, vk))],
      v3c.c.authority().counter,
    );
    return u.addSignature(0n, sig(v3c.c.paperKey, u.dataToSign));
  };
  assert.throws(() => v3c.c.send(raw('v3', v4Key())), /verifier-key\[v6\].*got 'midnight:verifier-key\[v7\]/);
  assert.throws(() => v3c.c.send(raw('v4', v3Key())), /verifier-key\[v7\].*got 'midnight:verifier-key\[v6\]/);
});

test('key slot: removing a V4 key needs the V4 slot', () => {
  const { c, req, sendSigned } = slotted('v4');
  sendSigned(req([keyAction('proveValue', v4Key(), 'v4')]));
  sendSigned(req([{ kind: 'remove-key', circuit: 'proveValue', keySlot: 'v4' }]));
  assert.deepEqual(c.state().index(c.address).operations().map(String), []);
});

