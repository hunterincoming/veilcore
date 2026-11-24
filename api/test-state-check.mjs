// What a verifier checks about the state it judges besides its data (src/state-check.ts),
// and the second-indexer agreement in the lookup (src/presentation-lookup.ts). 8 October
// 2026 review: a maintenance-key holder could swap a circuit's verifier key, act, and put
// it back; and one indexer could report a root that was never on chain.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ContractMaintenanceAuthority, createConstructorContext, sampleSigningKey, signatureVerifyingKey } from '@midnight-ntwrk/compact-runtime';
import { Contract } from '../contract/src/managed/veilcore/contract/index.js';
import {
  ContractStateMismatchError,
  authorityReport,
  checkContractState,
  pinnedVerifierKeys,
  verifierKeyMismatches,
  withMainnetPins,
} from './src/state-check.ts';
import { singleCallState, singleCallStateAcross } from './src/presentation-lookup.ts';
import { matchKeyState } from './src/key-states.ts';

const witnesses = new Proxy({}, { get: () => (c) => [c.privateState, new Uint8Array(32)] });
const PROVABLE_CIRCUITS = Object.keys(new Contract(witnesses).provableCircuits);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const vk = (n) => new TextEncoder().encode(`vk:${n}`);

// ── the pins are the deployment record's
const pins = pinnedVerifierKeys('veilcore');
assert.deepEqual(Object.keys(pins).sort(), [...PROVABLE_CIRCUITS].sort());
assert.equal(pins.proveLicense, 'b338dda3501ae2dec26b241b353495580debcb359455b0671b6619197f29d59b');
assert.equal(Object.keys(pinnedVerifierKeys('veilcore-claims')).length, 5);
console.log('pins: 24 main-contract circuits and 5 claims circuits, from docs/fingerprints.md');

// ── a state stands in through the same interface ContractState has
const standIn = (keys, authority = { committee: [1], threshold: 1, counter: 16n }) => ({
  operations: () => Object.keys(keys),
  operation: (n) => (n in keys ? { verifierKey: keys[n] } : undefined),
  maintenanceAuthority: authority,
});
const names = ['anchor', 'proveLicense', 'revokeLicense'];
const testPins = Object.fromEntries(names.map((n) => [n, sha(vk(n))]));
const genuine = Object.fromEntries(names.map((n) => [n, vk(n)]));

assert.deepEqual(verifierKeyMismatches(standIn(genuine), testPins), []);
assert.deepEqual(verifierKeyMismatches(standIn({ ...genuine, proveLicense: vk('forged') }), testPins), ['proveLicense']);
assert.deepEqual(verifierKeyMismatches(standIn({ ...genuine, extra: vk('extra') }), testPins), ['extra']);
const { revokeLicense: _gone, ...missing } = genuine;
assert.deepEqual(verifierKeyMismatches(standIn(missing), testPins), ['revokeLicense']);
assert.deepEqual(verifierKeyMismatches(standIn({ ...genuine, anchor: undefined }), testPins), ['anchor']);
console.log('verifier keys: exact build matches; a swapped, extra, missing or empty key is named');

// ── refusal carries the authority, so the change is visible
assert.throws(
  () => checkContractState(standIn({ ...genuine, proveLicense: vk('forged') }), { verifierKeys: testPins }),
  (e) => e instanceof ContractStateMismatchError && e.circuits.includes('proveLicense') && e.authority.counter === 16n && /live: 1 key/.test(e.message),
);
assert.deepEqual(checkContractState(standIn(genuine), { verifierKeys: testPins }), {
  authority: { committee: 1, threshold: 1, counter: 16n, retired: false },
  keys: 'pinned',
});
assert.equal(checkContractState(standIn({ x: vk('anything') }), {}).keys, 'unchecked');
// Swap, act, restore: both states carry the pinned keys; the counter shows the change.
assert.throws(
  () => checkContractState(standIn(genuine, { committee: [1], threshold: 1, counter: 18n }), { verifierKeys: testPins, authorityCounter: 16n }),
  (e) => e instanceof ContractStateMismatchError && /counter .* is 18, not 16/.test(e.message),
);
assert.deepEqual(authorityReport(standIn(genuine, { committee: [], threshold: 1, counter: 1n })), {
  committee: 0, threshold: 1, counter: 1n, retired: true,
});
console.log('refused: a swapped key (authority reported); refused: a counter other than the one required');

// ── through the lookup, on a real contract state
const OURS = 'aa'.repeat(32), TX = 'cc'.repeat(32);
const real = new Contract(witnesses).initialState(createConstructorContext({}, '0'.repeat(64))).currentContractState;
real.maintenanceAuthority = new ContractMaintenanceAuthority([signatureVerifyingKey(sampleSigningKey())], 1, 16n);
const STATE = Buffer.from(real.serialize()).toString('hex');
const tx = (state, over = {}) => ({
  identifiers: [TX], transactionResult: { status: 'SUCCESS' }, block: { height: 7, timestamp: 1_790_000_000_000 },
  contractActions: [{ address: OURS, state, entryPoint: 'anchorBatch' }], ...over,
});
const serve = (byUrl) => {
  globalThis.fetch = async (url) => {
    const t = byUrl[String(url)];
    return { ok: true, json: async () => ({ data: { transactions: t ? [t] : [] } }) };
  };
};
const look = (check) => singleCallState('http://one', OURS, TX, ['anchorBatch'], 'not a batch', undefined, check);

serve({ 'http://one': tx(STATE) });
const found = await look({});
assert.equal(found.keys, 'unchecked');
assert.deepEqual(found.authority, { committee: 1, threshold: 1, counter: 16n, retired: false });
console.log('reported: the maintenance authority at the transaction (1 key, threshold 1, counter 16)');
// The constructor's operations carry no verifier key at all: not the pinned build.
await assert.rejects(() => look({ verifierKeys: pins }), (e) => e instanceof ContractStateMismatchError && e.circuits.length === 24);
console.log('refused: a state whose verifier keys are not the pinned build');

// ── a second indexer must agree
const other = new Contract(witnesses).initialState(createConstructorContext({}, '0'.repeat(64))).currentContractState;
const OTHER = Buffer.from(other.serialize()).toString('hex');
serve({ 'http://one': tx(STATE), 'http://two': tx(STATE) });
assert.equal((await look({ secondIndexer: 'http://two' })).blockHeight, 7);
console.log('accepted: two indexers report the same transaction, block and state');
serve({ 'http://one': tx(STATE), 'http://two': tx(OTHER) });
await assert.rejects(() => look({ secondIndexer: 'http://two' }), /disagree .*contract state/);
serve({ 'http://one': tx(STATE), 'http://two': tx(STATE, { block: { height: 8, timestamp: 1_790_000_000_000 } }) });
await assert.rejects(() => look({ secondIndexer: 'http://two' }), /disagree .*block/);
// Verification review: the block time was not compared, so a first indexer could make an
// old presentation look fresh for rule 5's one-hour limit.
serve({ 'http://one': tx(STATE), 'http://two': tx(STATE, { block: { height: 7, timestamp: 1_790_000_000_000 - 5 * 3_600_000 } }) });
await assert.rejects(() => look({ secondIndexer: 'http://two' }), /disagree .*block time/);
serve({ 'http://one': tx(STATE) });
await assert.rejects(() => look({ secondIndexer: 'http://two' }), /second indexer does not confirm .*No such transaction/);
serve({ 'http://one': tx(STATE), 'http://two': tx(STATE, { transactionResult: { status: 'FAILURE' } }) });
await assert.rejects(() => look({ secondIndexer: 'http://two' }), /second indexer does not confirm/);
console.log('refused: a second indexer with another state, block, block time, no such transaction, or a failure');
// Verification review: on mainnet a caller's own verifierKeys table replaced the pins.
// Now the pins always apply there; a caller adds checks, never replaces them.
const weaker = { verifierKeys: { anchor: 'ab'.repeat(32) }, authorityCounter: 16n, secondIndexer: 'http://two' };
assert.deepEqual(withMainnetPins(weaker, 'veilcore', 'mainnet'), { ...weaker, verifierKeys: pins });
assert.deepEqual(withMainnetPins({}, 'veilcore-claims', 'mainnet').verifierKeys, pinnedVerifierKeys('veilcore-claims'));
assert.equal(withMainnetPins(weaker, 'veilcore', 'preprod'), weaker);
assert.equal(withMainnetPins({}, 'veilcore', null).verifierKeys, undefined);
console.log('mainnet: the pinned keys always apply; a caller adds a counter or a second indexer, never its own pins');

// ── key states (docs/contract-v2.md 3.3, rule 10): a pinned contract's published authority states
const V1_MAIN = [
  { retired: false, committee: 1, threshold: 1, counter: 16n, block: 2922687, label: 'one key, counter 16' },
  { retired: true, committee: 0, threshold: 1, counter: 17n, block: null, label: 'retired (sealed)' },
];
const V2_MAIN = [
  { retired: false, committee: 1, threshold: 1, counter: 24n, block: 3600000, label: 'one key, not yet handed to the committee' },
  { retired: false, committee: 3, threshold: 2, counter: 27n, block: 3700000, label: 'the 2-of-3 committee' },
];
// v1 with all 24 keys at counter 16, or after `retire`; nothing else.
assert.equal(checkContractState(standIn(genuine), { verifierKeys: testPins, keyStates: V1_MAIN }).keyState.label, 'one key, counter 16');
assert.equal(
  checkContractState(standIn(genuine, { committee: [], threshold: 1, counter: 17n }), { keyStates: V1_MAIN }).keyState.label,
  'retired (sealed)',
);
for (const a of [
  { committee: [1], threshold: 1, counter: 17n }, // a live key used since the deploy minutes
  { committee: [1, 2], threshold: 1, counter: 16n }, // another key added
  { committee: [], threshold: 1, counter: 18n }, // retired after another update
])
  assert.throws(
    () => checkContractState(standIn(genuine, a), { verifierKeys: testPins, keyStates: V1_MAIN }),
    (e) => e instanceof ContractStateMismatchError && /none of the states published for it \(one key, counter 16; retired \(sealed\)\)/.test(e.message),
  );
// v2: its own table and its own states; v1's states are not v2's.
assert.equal(
  checkContractState(standIn(genuine, { committee: [1], threshold: 1, counter: 24n }), { verifierKeys: testPins, keyStates: V2_MAIN }).keyState.label,
  'one key, not yet handed to the committee',
);
assert.equal(
  checkContractState(standIn(genuine, { committee: [1, 2, 3], threshold: 2, counter: 27n }), { keyStates: V2_MAIN }).keyState.label,
  'the 2-of-3 committee',
);
assert.throws(() => checkContractState(standIn(genuine), { keyStates: V2_MAIN }), ContractStateMismatchError);
// A retired state whose counter is not compared (the claims contract, retired from its deploy).
assert.equal(matchKeyState([{ retired: true, committee: 0, threshold: 1, counter: null, block: 1, label: 'r' }], { retired: true, committee: 0, threshold: 1, counter: 99n })?.label, 'r');
// Without key states, nothing changes: the authority is reported, not judged.
assert.equal(checkContractState(standIn(genuine, { committee: [1], threshold: 1, counter: 99n }), {}).keyState, undefined);
console.log('key states: v1 at counter 16 or retired after it; v2 by its own published states; anything else refused');

// ── one call across several contracts (rule 10.2)
const THEIRS = 'bb'.repeat(32);
const across = (callable, actions) => {
  serve({ 'http://one': tx(STATE, { contractActions: actions }) });
  return singleCallStateAcross('http://one', [OURS, THEIRS], callable, TX, ['anchorBatch'], 'not a batch', 20_000, undefined, () => ({}));
};
assert.equal((await across([OURS, THEIRS], [{ address: THEIRS, state: STATE, entryPoint: 'anchorBatch' }])).address, THEIRS);
await assert.rejects(
  () => across([OURS, THEIRS], [{ address: OURS, state: STATE, entryPoint: 'anchorBatch' }, { address: THEIRS, state: STATE, entryPoint: 'anchorBatch' }]),
  /not a batch/,
);
// A call on a pinned contract that was not asked about still counts, and is not answered for.
await assert.rejects(() => across([OURS], [{ address: THEIRS, state: STATE, entryPoint: 'anchorBatch' }]), /not a batch/);
await assert.rejects(
  () => across([OURS], [{ address: OURS, state: STATE, entryPoint: 'anchorBatch' }, { address: THEIRS, state: STATE, entryPoint: 'proveRange' }]),
  /not a batch/,
);
console.log('across contracts: exactly one call on all of them together, and on one that was asked about');

console.log('\nall state checks pass');
