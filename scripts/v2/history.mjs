// The contract v2 check (docs/contract-v2.md 3.3 and 5), as one pure function: the contract's
// current state, and every maintenance update in its history, against docs/fingerprints-v2.md
// and the deploy-session record. Used by scripts/verify-deployment.mjs --v2-record.
//
// What it accepts, and nothing else:
//   - keys: every circuit of the published build, each with the published SHA-256, in slot V4;
//     no other circuit; no V3 key anywhere;
//   - authority, before the handover: the temporary single key (threshold 1), at the counter the
//     record's updates bring it to ("one key, not yet handed to the committee");
//   - authority, after it: the 2-of-3 committee the handover installed, at the handover's counter + 1;
//   - history: the deploy starts with the temporary key at counter 0, and every maintenance update
//     from counter 0 up is accounted for, each one only inserting published V4 keys, except the
//     last, which may be the handover: one replace-authority to three different keys, any two of
//     which sign. Any key removal, any key not in the table, any IR change (IrInsert, IrRemove), any
//     other authority change is refused.
//
// Why "accounted for" is a proof and not a hope: the ledger takes a maintenance update only at
// the authority's current counter and moves the counter on by exactly one, so the updates a
// contract has ever accepted carry the counters 0, 1, ... up to the one it shows now, once each.
// If the listed updates carry exactly those counters, there is no other update.
//
// CALLS ARE NOT REFUSED. Anyone who pays a fee can call v2 (anchorBatch needs no secret), so a
// check that refused calls would let any outsider force a redeploy for the price of one call.
// A call cannot change a key or the authority. Outside calls before the public switch are
// harmless only because nobody honours a v2 record yet (design, condition 4).
// SPDX-License-Identifier: Apache-2.0
import { V2_KEY_SLOT } from './fingerprints.mjs';

const SUCCESS = 'SUCCESS';
const short = (h) => (typeof h === 'string' ? `${h.slice(0, 16)}…` : 'none');
const fp = (k) => `${k.slice(0, 8)}…${k.slice(-8)}`;
const refOf = (r) => r?.txHash ?? r?.txId ?? '(unknown)';

/**
 * @param {object} a
 * @param {string} a.name               veilcore | veilcore-claims
 * @param {Record<string,string>} a.pins circuit -> SHA-256 (docs/fingerprints-v2.md)
 * @param {string} a.temporaryKey       the temporary key's public key (hex), from the record
 * @param {{ops: object, authority: object}} a.current   the current state's facts (ledger.mjs)
 * @param {{ref: object, status: string, actions: object[]}} a.deploy   the deploy transaction's facts
 * @param {{ref: object, status: string, actions: object[]}[]} a.updates  every listed maintenance transaction
 * @param {{ref: object, status: string, actions: object[], committee?: string[]}} [a.handover]
 *        the handover transaction (from the launcher's receipt) and the committee it recorded
 * @param {string} [a.constructorDataHex] the constructor's ledger data, when a build is here
 * @returns {{ ok: boolean, lines: string[], stage: 'temporary-key' | 'committee' }}
 */
export const checkV2Contract = (a) => {
  const lines = [];
  let failed = 0;
  const pass = (l) => lines.push(`  PASS  ${l}`);
  const fail = (l) => {
    failed++;
    lines.push(`  FAIL  ${l}`);
  };
  const pins = a.pins;
  const circuits = Object.keys(pins).sort();
  const temp = String(a.temporaryKey).toLowerCase();

  // ── the current keys ──────────────────────────────────────────────
  const ops = a.current.ops;
  const width = Math.max(...[...circuits, ...Object.keys(ops)].map((n) => n.length));
  let keysOk = 0;
  for (const c of circuits) {
    const o = ops[c];
    if (o === undefined) fail(`${c.padEnd(width)}  not on chain`);
    else if (o.sha256 !== pins[c]) fail(`${c.padEnd(width)}  on chain ${short(o.sha256)}, published ${short(pins[c])}`);
    else if (o.slot !== V2_KEY_SLOT) fail(`${c.padEnd(width)}  the published key, but not a V4 key (slot ${String(o.slot)})`);
    else {
      keysOk++;
      pass(`${c.padEnd(width)}  ${short(o.sha256)}  V4`);
    }
  }
  for (const c of Object.keys(ops).filter((n) => !(n in pins)).sort())
    fail(`${c.padEnd(width)}  on chain, but not a circuit of the published v2 build`);
  lines.push(`  ${keysOk} of ${circuits.length} circuits match docs/fingerprints-v2.md (V4).`);

  // ── the deploy ────────────────────────────────────────────────────
  const deploys = (a.deploy?.actions ?? []).filter((x) => x.kind === 'deploy');
  const seen = new Map(); // circuit -> how it got its key
  if (a.deploy === undefined || a.deploy.status !== SUCCESS || deploys.length !== 1)
    fail(
      `history: the deploy transaction ${refOf(a.deploy?.ref)} ${
        a.deploy === undefined ? 'was not read' : a.deploy.status !== SUCCESS ? `did not succeed (${String(a.deploy.status)})` : 'does not deploy this address'
      }`,
    );
  else {
    const s = deploys[0].state;
    const au = s.authority;
    if (au.committee.length === 1 && au.committee[0] === temp && au.threshold === 1 && au.counter === 0n)
      pass(`history: deployed with the temporary key ${fp(temp)} alone, counter 0 (transaction ${short(refOf(a.deploy.ref))})`);
    else
      fail(
        `history: the deploy's authority is ${au.committee.length} key(s), threshold ${au.threshold}, counter ${au.counter}; ` +
          `the record's temporary key is ${fp(temp)}, threshold 1, counter 0`,
      );
    for (const [c, o] of Object.entries(s.ops)) {
      if (!(c in pins)) fail(`history: the deploy carries a key for ${c}, which is not a circuit of the published build`);
      else if (o.sha256 !== pins[c] || o.slot !== V2_KEY_SLOT) fail(`history: the deploy carries a key for ${c} that is not its published V4 key`);
      else seen.set(c, 'deploy');
    }
    if (a.constructorDataHex === undefined)
      lines.push('  NOTE  how it started: not checked here (no compiled contract-v2 in this checkout)');
    else if (s.dataHex === a.constructorDataHex) pass("how it started: the deploy carries exactly the v2 constructor's ledger data");
    else fail("how it started: the deploy's ledger data is NOT the v2 constructor's. It is not a genuine v2 deployment");
  }

  // ── every maintenance update, by counter ──────────────────────────
  const listed = [...(a.updates ?? []), ...(a.handover ? [{ ...a.handover, isHandover: true }] : [])];
  const all = [];
  for (const t of [a.deploy, ...listed].filter(Boolean)) {
    if (t !== a.deploy && t.status !== SUCCESS) fail(`history: transaction ${refOf(t.ref)} did not succeed (${String(t.status)})`);
    for (const x of t.actions ?? []) if (x.kind === 'update') all.push({ ...x, ref: t.ref, isHandover: t.isHandover === true });
  }
  all.sort((x, y) => (x.counter < y.counter ? -1 : x.counter > y.counter ? 1 : 0));
  let gaps = false;
  all.forEach((u, i) => {
    if (u.counter !== BigInt(i)) gaps = true;
  });
  if (gaps)
    fail(`history: the listed updates carry counters ${all.map((u) => u.counter).join(', ')}; they must be 0, 1, 2, ... once each`);
  let handover;
  all.forEach((u, i) => {
    const where = `update at counter ${u.counter} (transaction ${short(refOf(u.ref))})`;
    for (const ins of u.instructions) {
      if (ins.kind === 'insert-key') {
        if (!(ins.circuit in pins)) fail(`history: ${where} inserts a key for ${ins.circuit}, not a circuit of the published build`);
        else if (ins.slot !== V2_KEY_SLOT || ins.headerSlot !== V2_KEY_SLOT)
          fail(`history: ${where} inserts a key for ${ins.circuit} in slot ${ins.slot} (a ${String(ins.headerSlot)} key); v2 takes V4 keys only`);
        else if (ins.sha256 !== pins[ins.circuit]) fail(`history: ${where} inserts a key for ${ins.circuit} that is not in docs/fingerprints-v2.md`);
        else if (seen.has(ins.circuit)) fail(`history: ${where} inserts a key for ${ins.circuit} a second time`);
        else seen.set(ins.circuit, where);
      } else if (ins.kind === 'replace-authority') {
        const n = ins.authority;
        const distinct = new Set(n.committee).size === n.committee.length;
        const problems = [];
        if (u.instructions.length !== 1) problems.push('it is not the only change in its update');
        if (i !== all.length - 1) problems.push('another update follows it');
        if (!u.isHandover) problems.push("it is not the handover named by the launcher's receipt");
        if (n.committee.length !== 3 || n.threshold !== 2 || !distinct) problems.push(`it installs ${n.committee.length} key(s) with threshold ${n.threshold}, not 3 different keys with threshold 2`);
        if (n.committee.includes(temp)) problems.push('the temporary key is a member');
        if (n.counter !== u.counter + 1n) problems.push(`its new counter is ${n.counter}, not ${u.counter + 1n}`);
        if (a.handover?.committee !== undefined && n.committee.join() !== a.handover.committee.map((k) => k.toLowerCase()).join())
          problems.push('it is not the committee the receipt recorded');
        if (problems.length > 0) fail(`history: ${where} replaces the authority, refused: ${problems.join('; ')}`);
        else handover = { counter: u.counter, committee: n.committee };
      } else if (ins.kind === 'remove-key') fail(`history: ${where} REMOVES the key of ${ins.circuit}; v2 refuses any key removal before the committee`);
      else if (ins.kind === 'ir-insert' || ins.kind === 'ir-remove')
        fail(`history: ${where} changes the IR of ${ins.circuit} (${ins.kind === 'ir-insert' ? 'IrInsert' : 'IrRemove'}); refused`);
      else fail(`history: ${where} holds a maintenance change this check does not know; refused`);
    }
  });
  if (a.handover !== undefined && handover === undefined)
    fail('history: the receipt names a handover, but no accepted handover is in its transaction');
  const missing = circuits.filter((c) => !seen.has(c));
  if (missing.length > 0) fail(`history: no listed update inserted the key of ${missing.join(', ')}`);
  else pass(`history: all ${circuits.length} keys inserted, each once, each published, each V4; no removal, no IR change`);
  lines.push('  NOTE  calls are not checked: anyone may call v2, and a call cannot change a key or the authority');

  // ── the authority now ─────────────────────────────────────────────
  const au = a.current.authority;
  let stage = 'temporary-key';
  if (handover !== undefined) {
    stage = 'committee';
    const ok =
      au.threshold === 2 && au.committee.join() === handover.committee.join() && au.counter === handover.counter + 1n;
    const said = `${au.committee.length} key(s), threshold ${au.threshold}, counter ${au.counter}`;
    if (ok) pass(`maintenance authority: the 2-of-3 committee the handover installed, counter ${au.counter}`);
    else
      fail(
        `maintenance authority: ${said}; after the handover it must be that committee at counter ${handover.counter + 1n}` +
          (au.counter > handover.counter + 1n ? ' (a later update is not in the record)' : ''),
      );
  } else {
    const n = BigInt(all.length);
    const ok = au.committee.length === 1 && au.committee[0] === temp && au.threshold === 1 && au.counter === n;
    if (ok) pass(`maintenance authority: one key, not yet handed to the committee (${fp(temp)}), counter ${au.counter}`);
    else
      fail(
        `maintenance authority: ${au.committee.length} key(s), threshold ${au.threshold}, counter ${au.counter}; expected the ` +
          `temporary key ${fp(temp)} alone at counter ${n}` +
          (au.counter > n ? ` (the chain shows ${au.counter - n} update(s) the record does not list: refused)` : ''),
      );
  }
  return { ok: failed === 0, lines, stage, circuits: circuits.length, matching: keysOk };
};
