// The mainnet gate (docs/contract-v2.md 5): every mainnet change refuses unless the contract
// shows 3 keys and threshold 2, with exactly two named exceptions:
//
//  1. "v2 before handover": on contract v2 (its address from the deploy-session record, because
//     v2 is pinned only after verify:deployment passes) while it still has the temporary single
//     key and no committee: inserts of the keys listed in docs/fingerprints-v2.md (slot V4), and
//     one replace-authority to a 2-of-3 committee (its three holders' confirmations and the
//     dry-run record of exactly that change are required by the launcher before it is sent).
//     Nothing else.
//  2. "v1 retire with the single key" (design 6): one `retire` on v1's pinned address, nothing else.
//
// And the key slot: it comes from the contract, never from the request. v1's pinned address is
// V3; v2's address from the record is V4. A request that says otherwise is refused.
//
// Pure: the launcher (bboard-cli/src/launcher/committee.ts) passes in what it read.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { COMMITTEE_SIZE, COMMITTEE_THRESHOLD, cleanHex, fingerprint } from './core.mjs';

const sha256Hex = (hex) => createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');

/**
 * The slot a contract's keys are in, from its address: 'v3' for v1's pinned address, 'v4' for
 * the v2 address in the record. On a test network, an address that is neither takes the slot
 * the operator names (--key-slot); on mainnet there is no third kind of address.
 * @returns {{ slot: 'v3' | 'v4' } | { problem: string }}
 */
export const slotForContract = ({ network, address, pinnedV1Address, v2, named }) => {
  const a = cleanHex(address);
  let slot;
  if (v2 !== undefined && a === cleanHex(v2.address)) slot = 'v4';
  else if (network === 'mainnet' && a === cleanHex(pinnedV1Address)) slot = 'v3';
  if (slot === undefined) {
    if (network === 'mainnet') return { problem: 'On mainnet the tool acts only on the pinned v1 contract or on the v2 contract in --v2-record.' };
    if (named === undefined)
      return {
        problem:
          'Say which slot this contract’s keys are in: --v2-record FILE for contract v2 (V4), or --key-slot v3|v4 for another test contract.',
      };
    return { slot: named };
  }
  if (named !== undefined && named !== slot)
    return {
      problem: `This contract's keys are in slot ${slot.toUpperCase()} (${slot === 'v4' ? 'contract v2' : 'contract v1'}), not ${named.toUpperCase()}. Nothing was made.`,
    };
  return { slot };
};

/** Refuse a request whose stated slot is not the contract's. Empty when it agrees. */
export const requestSlotProblems = (req, slot) => {
  const p = [];
  const said = req?.current?.keySlot ?? 'v3';
  if (said !== slot)
    p.push(
      `The request says the contract's keys are in slot ${String(said).toUpperCase()}, but this contract's are in ` +
        `${slot.toUpperCase()}. A request for v2 must say V4. Do not sign or send it.`,
    );
  for (const a of req?.actions ?? [])
    if ((a?.kind === 'insert-key' || a?.kind === 'remove-key') && (a.keySlot ?? 'v3') !== slot)
      p.push(`The key action for "${String(a.circuit)}" is for slot ${String(a.keySlot ?? 'v3').toUpperCase()}, not ${slot.toUpperCase()}.`);
  return p;
};

/** Refuse when a key on chain is in another slot than the contract's (checked again right before sending). */
export const chainSlotProblems = (slotsOnChain, slot) =>
  Object.entries(slotsOnChain)
    .filter(([, s]) => s !== slot)
    .map(([c, s]) => `On chain, the key of "${c}" is a ${String(s ?? 'unrecognised').toUpperCase()} key; this contract's keys are ${slot.toUpperCase()}. Nothing was sent.`);

const isCommittee = (a) => a.committee.length === COMMITTEE_SIZE && a.threshold === COMMITTEE_THRESHOLD;
const isSingle = (a) => a.committee.length === 1 && a.threshold === 1;

/**
 * The gate. `current` is the authority on chain ({ committee: hex[], threshold, counter }).
 * `v2`: { address, temporaryKey, pins } from the record and docs/fingerprints-v2.md (pins may be
 * undefined when the table is not here: then key inserts are refused). Returns the reasons to
 * refuse; empty when the change may go ahead. Only mainnet is gated.
 */
export const gateProblems = ({ network, address, current, actions, pinnedV1Address, v2 }) => {
  if (network !== 'mainnet') return [];
  const a = cleanHex(address);
  if (isCommittee(current)) return [];
  const list = Array.isArray(actions) ? actions : [];
  const refuse = (why) => [
    `${why} On mainnet every change needs a contract held by 3 keys, any 2 of which sign; this one has ` +
      `${current.committee.length} key(s), threshold ${current.threshold}. The only exceptions are contract v2 before its ` +
      'handover (the listed V4 key inserts, and the one handover) and one retire of v1 with its single key. Nothing was signed or sent.',
  ];
  if (v2 !== undefined && a === cleanHex(v2.address)) {
    if (!isSingle(current)) return refuse('This is contract v2, but it is not held by one key.');
    if (cleanHex(current.committee[0]) !== cleanHex(v2.temporaryKey))
      return refuse(
        `This is contract v2, but its single key (${fingerprint(cleanHex(current.committee[0]))}) is not the temporary key in the record.`,
      );
    if (list.length === 0) return refuse('No change.');
    if (list.length === 1 && list[0]?.kind === 'replace-authority') {
      const c = list[0];
      if (!Array.isArray(c.committee) || c.committee.length !== COMMITTEE_SIZE || c.threshold !== COMMITTEE_THRESHOLD)
        return refuse('The handover must install 3 keys, any 2 of which sign.');
      return [];
    }
    const p = [];
    for (const x of list) {
      if (x?.kind !== 'insert-key') {
        p.push(`"${String(x?.kind)}" is not allowed on v2 before the handover.`);
        continue;
      }
      if (x.keySlot !== 'v4') p.push(`The key for "${String(x.circuit)}" is not for slot V4.`);
      if (v2.pins === undefined) p.push('docs/fingerprints-v2.md is not here, so no v2 key can be checked.');
      else if (!(x.circuit in v2.pins)) p.push(`"${String(x.circuit)}" is not a circuit in docs/fingerprints-v2.md.`);
      else if (cleanHex(x.verifierKeySha256) !== v2.pins[x.circuit] || sha256Hex(cleanHex(x.verifierKey)) !== v2.pins[x.circuit])
        p.push(`The key for "${String(x.circuit)}" is not the one in docs/fingerprints-v2.md.`);
    }
    return p.length === 0 ? [] : refuse(p.join(' '));
  }
  if (a === cleanHex(pinnedV1Address) && isSingle(current)) {
    if (list.length === 1 && list[0]?.kind === 'retire') return [];
    return refuse('On v1 with its single key, the only change allowed is one retire (docs/contract-v2.md 6).');
  }
  return refuse('This contract is not held by a 2-of-3 committee.');
};
