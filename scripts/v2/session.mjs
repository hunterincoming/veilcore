// The v2 deploy-session record: what `npm run deploy-v2 -w bboard-cli` did, written as it goes.
// A public file: addresses, transaction ids and hashes, counters, the temporary key's PUBLIC key.
// No secret is ever in it.
//
// It is how the other tools find v2 before v2 is pinned (docs/contract-v2.md 5):
//   - `npm run verify:deployment -- --v2-record FILE` checks the contracts it names, and the
//     history it lists, against docs/fingerprints-v2.md;
//   - the committee launcher (`--v2-record FILE`) takes v2's address from it, and its key slot (V4).
// It is NOT a pin. Nothing here writes deployments/*.json, api/src/deploy-guard.ts or any SDK or
// site list; v2's addresses go into those in their own PR, after verify:deployment passes
// (docs/runbooks/deploy-v2.md, step 17).
//
// IDENTIFYING v2. A checker identifies v2 by its pinned address (and, for how it started, by the
// constructor's ledger data), never by the `contractVersion` or `predecessor` fields in its state:
// Midnight does not run the constructor on chain, so any copy can carry those values.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { V2_CONTRACTS, V2_KEY_SLOT } from './fingerprints.mjs';

export const SESSION_FORMAT = 'veilcore-v2-deploy-session/v1';
export const SESSION_NETWORKS = ['mainnet', 'preprod', 'undeployed'];
export const IDENTIFY_NOTE =
  'Checkers identify contract v2 by its pinned address (after verify:deployment passes and the pin PR), never by ' +
  'the contractVersion or predecessor fields in its state: Midnight does not run the constructor on chain, so ' +
  'any copy can carry those values.';
export const SESSION_WHAT =
  'A VeilCore contract v2 deploy session (docs/runbooks/deploy-v2.md). Public: no secret is in this file. It is ' +
  'not a pin. ' +
  IDENTIFY_NOTE;

const HEX64 = /^[0-9a-f]{64}$/;
const HEXID = /^[0-9a-f]{2,256}$/;

export const emptySession = ({ network, commit, compiler, fingerprintsSha256, publicKey, now = new Date() }) => ({
  format: SESSION_FORMAT,
  what: SESSION_WHAT,
  network,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  commit,
  compiler,
  keySlot: V2_KEY_SLOT,
  fingerprintsSha256,
  temporaryKey: { publicKey, storedAs: 'age-encrypted file on the maintainer’s Mac only; never on paper' },
  contracts: Object.fromEntries(V2_CONTRACTS.map((c) => [c, { address: null, deploy: null, pending: null, updates: [] }])),
});

const txRefProblems = (t, where) => {
  const p = [];
  if (t === null || typeof t !== 'object') return [`${where} is missing.`];
  if (t.txHash === undefined && t.txId === undefined) p.push(`${where} has neither a transaction hash nor an id.`);
  if (t.txHash !== undefined && !HEX64.test(t.txHash)) p.push(`${where}: the transaction hash is not 64 hex characters.`);
  if (t.txId !== undefined && !HEXID.test(t.txId)) p.push(`${where}: the transaction id is not hex.`);
  return p;
};

/** Problems with a session record, in plain words; empty when it is well formed. */
export const sessionProblems = (s) => {
  const p = [];
  if (s === null || typeof s !== 'object' || s.format !== SESSION_FORMAT)
    return [`This is not a contract v2 deploy-session record (${SESSION_FORMAT}).`];
  if (!SESSION_NETWORKS.includes(s.network)) p.push(`Unknown network "${String(s.network)}".`);
  if (s.keySlot !== V2_KEY_SLOT) p.push(`The record's key slot is "${String(s.keySlot)}"; contract v2's keys are in V4.`);
  if (!HEX64.test(String(s.temporaryKey?.publicKey ?? ''))) p.push("The temporary key's public key is not 64 hex characters.");
  if (!HEX64.test(String(s.fingerprintsSha256 ?? ''))) p.push('The record does not say which docs/fingerprints-v2.md it used.');
  for (const c of V2_CONTRACTS) {
    const e = s.contracts?.[c];
    if (e === undefined || e === null || typeof e !== 'object') {
      p.push(`The record has no entry for ${c}.`);
      continue;
    }
    if (e.address !== null && !HEX64.test(String(e.address))) p.push(`${c}: the address is not 64 hex characters.`);
    if (e.deploy !== null) p.push(...txRefProblems(e.deploy, `${c}: the deploy`));
    if (!Array.isArray(e.updates)) {
      p.push(`${c}: the list of updates is missing.`);
      continue;
    }
    e.updates.forEach((u, i) => {
      p.push(...txRefProblems(u, `${c}: update ${i + 1}`));
      if (String(u?.counter) !== String(i)) p.push(`${c}: update ${i + 1} is at counter ${String(u?.counter)}, not ${i}.`);
      if (!Array.isArray(u?.circuits) || u.circuits.length === 0) p.push(`${c}: update ${i + 1} names no circuit.`);
    });
  }
  const addrs = V2_CONTRACTS.map((c) => s.contracts?.[c]?.address).filter((a) => typeof a === 'string');
  if (new Set(addrs).size !== addrs.length) p.push('The two contracts have the same address.');
  return p;
};

/** A record read from a file and checked. Throws with every problem. */
export const readSession = (file) => {
  let s;
  try {
    s = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Could not read the deploy-session record ${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const p = sessionProblems(s);
  if (p.length > 0) throw new Error(`${file}: ${p.join(' ')}`);
  return s;
};

/** Which v2 contract of the record is at `address`, or undefined. */
export const contractAt = (s, address) =>
  V2_CONTRACTS.find((c) => s.contracts[c].address !== null && s.contracts[c].address === String(address).toLowerCase());

/**
 * Write the record. The first write never goes over an existing file; later writes replace it
 * whole (written beside it, then renamed), so a crash leaves the old or the new record, never half of one.
 * Refuses any place that is a pinned list (deployments/, api/src/deploy-guard.ts).
 */
export const writeSession = (file, s, { first = false } = {}) => {
  const p = path.resolve(file);
  if (/(^|[\\/])deployments[\\/]/.test(p) || /deploy-guard\.ts$/.test(p))
    throw new Error(`${p} is a pinned list. The deploy-session record is never written there.`);
  const body = `${JSON.stringify({ ...s, updatedAt: new Date().toISOString() }, null, 2)}\n`;
  if (first) {
    if (existsSync(p)) throw new Error(`${p} already exists; it is never written over. Choose another --out.`);
    writeFileSync(p, body, { flag: 'wx', mode: 0o644 });
    return p;
  }
  const tmp = `${p}.writing`;
  writeFileSync(tmp, body, { mode: 0o644 });
  renameSync(tmp, p);
  return p;
};
