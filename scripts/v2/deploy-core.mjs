// Deploying contract v2 with a temporary single key, and inserting its keys: the steps, with
// the chain, the wallet and the key store passed in. bboard-cli/src/launcher/deploy-v2.ts runs
// it against a real network; scripts/v2/v2.test.mjs runs it against the ledger's own code.
//
// HOW (docs/contract-v2.md 5, "the temporary key"):
//  1. Each contract (main, then claims) is deployed with the constructor's ledger data, no
//     verifier key, and a maintenance authority of ONE key, the temporary key, threshold 1,
//     counter 0. The deploy carries no key, so every key goes on by the same checked path.
//  2. Every key of docs/fingerprints-v2.md goes on in slot V4, by maintenance updates signed by
//     the temporary key, at counters 0, 1, 2, ... (`perUpdate` keys in each; 1 by default, the
//     route v1 took). Each key is read from the local build and must have its published SHA-256
//     and a V4 header before it is signed.
//  3. Nothing else: no call, no removal, no IR change, no authority change. The handover to the
//     2-of-3 committee is the committee launcher's, later, after the 14-day notice.
//
// Every transaction is built with Ledger 9 types (`ledger-v9-committee`, the package the committee
// tool signs with). The record (session.mjs) is saved before and after each send, so a run that
// stops can be finished with --resume, and the chain, not the record, decides what landed.
// v2's address goes into no pinned list here.
// SPDX-License-Identifier: Apache-2.0
import {
  ContractDeploy,
  ContractMaintenanceAuthority,
  ContractOperationVersionedVerifierKey,
  ContractState,
  Intent,
  MaintenanceUpdate,
  Transaction,
  VerifierKeyInsert,
  signData,
  signatureVerifyingKey,
} from 'ledger-v9-committee';
import { V2_CONTRACTS, V2_KEY_SLOT, sha256Hex, slotOfKey } from './fingerprints.mjs';
import { stateFacts } from './ledger.mjs';

const tagged = (hex) => ({ tag: 'schnorr', value: hex });
/** How long a built transaction stays valid: after this a node can never take it. */
export const TTL_MS = 60 * 60 * 1000;
/** How long past the TTL a resume waits before it treats an unseen deploy as never landed. */
export const TTL_MARGIN_MS = 10 * 60 * 1000;
const ttl = (now = Date.now()) => new Date(now + TTL_MS);
export const MAX_PER_UPDATE = 8;

export const publicKeyOf = (signingKeyHex) => signatureVerifyingKey(tagged(signingKeyHex)).value;

/** The deploy: the constructor's ledger data, no key, the temporary key alone at counter 0. */
export const buildDeploy = (network, constructorBytes, temporaryPublicKey, now = Date.now()) => {
  const ctor = ContractState.deserialize(constructorBytes);
  const state = new ContractState();
  state.data = ctor.data;
  state.maintenanceAuthority = new ContractMaintenanceAuthority([tagged(temporaryPublicKey)], 1, 0n);
  const deploy = new ContractDeploy(state);
  const until = ttl(now);
  return {
    address: deploy.address,
    ttlEnds: until.toISOString(),
    tx: Transaction.fromParts(network, undefined, undefined, Intent.new(until).addDeploy(deploy)),
  };
};

/** Problems with a local key before it is signed into an update. Empty when it is the published V4 key. */
export const keyProblems = (circuit, vk, pins) => {
  if (!(circuit in pins)) return [`${circuit} is not a circuit in docs/fingerprints-v2.md.`];
  const p = [];
  if (slotOfKey(vk) !== V2_KEY_SLOT) p.push(`The local key of ${circuit} is not a V4 key (it says ${String(slotOfKey(vk))}).`);
  if (sha256Hex(vk) !== pins[circuit]) p.push(`The local key of ${circuit} is not the one in docs/fingerprints-v2.md.`);
  return p;
};

/** One maintenance update inserting `keys` ([circuit, bytes]) in V4, at `counter`, signed by the temporary key. */
export const buildInsertUpdate = (network, address, keys, counter, signingKeyHex) => {
  let u = new MaintenanceUpdate(
    address,
    keys.map(([c, vk]) => new VerifierKeyInsert(c, new ContractOperationVersionedVerifierKey(V2_KEY_SLOT, vk))),
    BigInt(counter),
  );
  u = u.addSignature(0n, signData(tagged(signingKeyHex), u.dataToSign));
  return { update: u, tx: Transaction.fromParts(network, undefined, undefined, Intent.new(ttl()).addMaintenanceUpdate(u)) };
};

/**
 * Run the deploy (or finish one). Every step is saved in `record` (session.mjs) by `save`.
 *
 * deps:
 *   network                   the ledger's network id
 *   record                    the session record (emptySession, or one read for --resume)
 *   save(record)              write it
 *   signingKey                the temporary key, hex (held in memory only)
 *   pins                      docs/fingerprints-v2.md: { veilcore: {...}, 'veilcore-claims': {...} }
 *   constructorBytes(name)    the constructor's state bytes (constructor.mjs)
 *   localKey(name, circuit)   the built .verifier bytes
 *   send(tx)                  build, balance, prove and submit; resolves { txId, txHash, blockHeight } once it is
 *                             in a block with SucceedEntirely, rejects otherwise
 *   readState(address)        the contract's state bytes now, or undefined
 *   latestTx(address)         { txHash } of the contract's latest action (to finish a step whose send stopped)
 *   txActions(hash, address)  what that transaction did to `address` (ledger.mjs txFacts), read from the indexer;
 *                             a step whose send stopped is recorded only if its transaction really holds it
 *   landedTx                  a transaction hash the operator found (--landed-tx), used in place of latestTx
 *   now()                     the time, in ms (tests)
 *   wait()                    pause before reading the chain again
 *   log(line)
 *   perUpdate                 keys per maintenance update (1 to 8)
 */
export const runDeploy = async (deps) => {
  const { record, log } = deps;
  const perUpdate = deps.perUpdate ?? 1;
  if (!Number.isInteger(perUpdate) || perUpdate < 1 || perUpdate > MAX_PER_UPDATE)
    throw new Error(`Keys per update must be 1 to ${MAX_PER_UPDATE}.`);
  const publicKey = publicKeyOf(deps.signingKey);
  if (publicKey !== record.temporaryKey.publicKey)
    throw new Error("That key is not this record's temporary key. Nothing was sent.");

  // Every local key, checked against the table before anything is sent.
  const keys = {};
  for (const name of V2_CONTRACTS) {
    keys[name] = {};
    for (const circuit of Object.keys(deps.pins[name]).sort()) {
      const vk = deps.localKey(name, circuit);
      const p = keyProblems(circuit, vk, deps.pins[name]);
      if (p.length > 0) throw new Error(`${p.join(' ')} Build the keys again (runbook section C). Nothing was sent.`);
      keys[name][circuit] = vk;
    }
  }

  const facts = async (address, tries = 30) => {
    for (let i = 0; i < tries; i++) {
      const b = await deps.readState(address);
      if (b !== undefined) return stateFacts(b);
      await deps.wait();
    }
    return undefined;
  };
  /** Wait until the chain shows the counter at `n` (the indexer is behind the node for a while). */
  const atCounter = async (address, n, tries = 30) => {
    for (let i = 0; i < tries; i++) {
      const f = await facts(address);
      if (f !== undefined && f.authority.counter >= BigInt(n)) return f;
      await deps.wait();
    }
    throw new Error(
      `The indexer does not show ${address} at counter ${n} yet. Wait 15 minutes, then run the same command with --resume. ` +
        'Do not deploy again.',
    );
  };

  const clock = deps.now ?? (() => Date.now());

  /**
   * The transaction of a step whose send stopped before it was confirmed. It is the contract's
   * latest action, or the one the operator found (--landed-tx), and it is recorded only if it
   * really holds that step: anyone may call v2, so the latest action can be someone's call.
   */
  const landedStep = async (address, isIt, what) => {
    const t = deps.landedTx !== undefined ? { txHash: String(deps.landedTx).toLowerCase() } : await deps.latestTx(address);
    let actions;
    try {
      actions = await deps.txActions(t.txHash, address);
    } catch {
      actions = [];
    }
    if (!actions.some(isIt))
      throw new Error(
        `The chain shows ${what} landed, but transaction ${t.txHash} (${deps.landedTx !== undefined ? 'given with --landed-tx' : "the contract's latest"}) ` +
          `does not hold it: another transaction (perhaps someone's call) came after it. Find ${what} on a block explorer ` +
          '(the contract address, then its transactions), and run again with --resume and --landed-tx <its hash>. Nothing was sent.',
      );
    return t.txHash;
  };

  for (const name of V2_CONTRACTS) {
    const entry = record.contracts[name];
    entry.abandoned ??= [];
    // ── 1. the deploy ──
    if (entry.deploy === null && entry.address !== null) {
      // A deploy was built and maybe sent. Its address is never dropped from the record.
      if ((await facts(entry.address, 3)) !== undefined) {
        const h = await landedStep(entry.address, (x) => x.kind === 'deploy', `the deploy of ${entry.address}`);
        entry.deploy = { txHash: h };
        entry.pending = null;
        deps.save(record);
        log(`${name}: the deploy at ${entry.address} had landed (transaction ${h}).`);
      } else {
        const ends = Date.parse(entry.pending?.ttlEnds ?? '');
        const safe = (Number.isNaN(ends) ? clock() + TTL_MS : ends) + TTL_MARGIN_MS;
        if (clock() < safe)
          throw new Error(
            `${name}: the deploy at ${entry.address} is not on chain yet, but it may still land until ` +
              `${new Date(safe).toISOString()} (its one-hour validity, plus a margin). Run the same command with --resume ` +
              'after that time. Never start a new deploy. Nothing was sent.',
          );
        // Past its validity and still not there: it can never land. Keep its address on record.
        entry.abandoned.push({ address: entry.address, reason: `deploy never landed; expired ${new Date(ends).toISOString()}` });
        log(`${name}: the deploy at ${entry.address} never landed and can no longer land; it is kept in the record as abandoned.`);
        entry.address = null;
        entry.pending = null;
        deps.save(record);
      }
    }
    if (entry.deploy === null) {
      const { address, tx, ttlEnds } = buildDeploy(deps.network, await deps.constructorBytes(name), publicKey, clock());
      entry.address = address;
      entry.pending = { kind: 'deploy', ttlEnds };
      deps.save(record);
      log(`${name}: deploying contract v2 at ${address} (one key, no verifier key yet).`);
      const r = await deps.send(tx);
      entry.deploy = { txId: r.txId, txHash: r.txHash, blockHeight: r.blockHeight };
      entry.pending = null;
      deps.save(record);
      log(`${name}: deployed at ${address}, transaction ${r.txHash ?? r.txId}, block ${r.blockHeight}.`);
    }
    const address = entry.address;
    let now = await facts(address);
    if (now === undefined)
      throw new Error(`The indexer shows no contract at ${address} yet. Wait 15 minutes, then run again with --resume. Do not deploy again.`);
    const temp = now.authority;
    if (temp.committee.length !== 1 || temp.committee[0] !== publicKey || temp.threshold !== 1)
      throw new Error(`${name} at ${address} is not held by the temporary key alone. Nothing was sent.`);

    // ── 2. the keys ──
    for (;;) {
      // A send that stopped: the chain is one update ahead of the record.
      if (now.authority.counter === BigInt(entry.updates.length) + 1n && entry.pending?.kind === 'update') {
        const k = BigInt(entry.updates.length);
        const want = [...entry.pending.circuits].sort().join();
        const h = await landedStep(
          address,
          (x) =>
            x.kind === 'update' &&
            x.counter === k &&
            x.instructions.every((i) => i.kind === 'insert-key') &&
            x.instructions.map((i) => i.circuit).sort().join() === want,
          `the update at counter ${k}`,
        );
        entry.updates.push({ counter: String(k), circuits: entry.pending.circuits, txHash: h });
        entry.pending = null;
        deps.save(record);
        log(`${name}: the update at counter ${k} had landed (transaction ${h}).`);
      }
      if (now.authority.counter !== BigInt(entry.updates.length))
        throw new Error(
          `${name}: the chain's counter is ${now.authority.counter}, but the record lists ${entry.updates.length} update(s). ` +
            'Something changed the contract that this record does not know. Stop: verify:deployment will refuse this contract.',
        );
      for (const [c, o] of Object.entries(now.ops))
        if (keys[name][c] === undefined || o.sha256 !== deps.pins[name][c] || o.slot !== V2_KEY_SLOT)
          throw new Error(`${name}: the chain holds a key for ${c} that is not its published V4 key. Stop.`);
      const missing = Object.keys(keys[name]).filter((c) => !(c in now.ops)).sort();
      if (missing.length === 0) break;
      const batch = missing.slice(0, perUpdate);
      const counter = entry.updates.length;
      const { tx } = buildInsertUpdate(deps.network, address, batch.map((c) => [c, keys[name][c]]), counter, deps.signingKey);
      entry.pending = { kind: 'update', counter: String(counter), circuits: batch };
      deps.save(record);
      log(`${name}: inserting ${batch.join(', ')} (V4), counter ${counter}; ${missing.length - batch.length} more after this.`);
      const r = await deps.send(tx);
      entry.updates.push({ counter: String(counter), circuits: batch, txId: r.txId, txHash: r.txHash, blockHeight: r.blockHeight });
      entry.pending = null;
      deps.save(record);
      now = await atCounter(address, counter + 1);
    }
    log(`${name}: all ${Object.keys(keys[name]).length} keys are on chain, in V4. Counter ${now.authority.counter}.`);
  }
  return record;
};
