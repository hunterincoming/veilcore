// The maintenance committee: three keys, any two of which must sign a change to the
// main contract. Pure functions only: nothing here reads a network, a file or a key store.
//
// How Midnight's ledger (ledger-v8 8.1.0, the version this repo pins) treats a contract's
// maintenance authority, checked against the real ledger code in committee.test.mjs:
//
//  - The authority is ContractMaintenanceAuthority(committee, threshold, counter): a list of
//    public keys, how many of them must sign, and a replay counter.
//  - A change is a MaintenanceUpdate(address, [instructions], counter). Each signature is
//    [index into the CURRENT committee, signData(key, update.dataToSign)]. dataToSign covers
//    the address, the instructions and the counter, nothing else, so holders can sign on
//    separate machines at different times and one person adds the signatures and sends it.
//  - The update must carry the authority's current counter. Every update raises the counter
//    by one, so a signed update that has been used, or overtaken, can never be used again.
//  - Replacing the authority: the new authority's counter must be exactly current + 1.
//  - The ledger does NOT refuse a committee with the same key twice, or a threshold of 0
//    (which lets anyone change the contract with no signature at all), and a threshold of
//    2^32 silently becomes 0. This file refuses all three before anything is signed.
//
// midnight-js 4.1.1 cannot build any of this (replaceAuthority takes one key and always
// installs a one-key committee with threshold 1), so the update is built here from the
// ledger's own types, as api/src/maintenance.ts already does for the provable retirement.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import {
  ContractMaintenanceAuthority,
  ContractOperationVersion,
  ContractOperationVersionedVerifierKey,
  MaintenanceUpdate,
  ReplaceAuthority,
  VerifierKeyInsert,
  VerifierKeyRemove,
  signData,
  signatureVerifyingKey,
  verifySignature,
} from '@midnight-ntwrk/ledger-v8';

/** VeilCore's committee: three keys, two signatures. Anything else is refused. */
export const COMMITTEE_SIZE = 3;
export const COMMITTEE_THRESHOLD = 2;

export const KEY_CARD_FORMAT = 'veilcore-committee-key/v1';
export const REQUEST_FORMAT = 'veilcore-maintenance-request/v1';
export const SIGNATURE_FORMAT = 'veilcore-maintenance-signature/v1';

export const NETWORKS = ['mainnet', 'preprod', 'preview', 'undeployed'];

const HEX64 = /^[0-9a-f]{64}$/;
const HOLDER = /^[a-z0-9][a-z0-9-]{0,31}$/;
const CIRCUIT = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');
const toHex = (bytes) => Buffer.from(bytes).toString('hex');
const fromHex = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));

/** A key as people copy it: spaces, dashes and case do not matter. */
export const cleanHex = (text) =>
  String(text ?? '')
    .replace(/[\s-]/g, '')
    .toLowerCase();

/** A public key shown for checking by eye or out loud: the first and last 8 characters. */
export const fingerprint = (publicKey) => `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`;

/** 64 hex characters in groups of 8, easier to copy onto paper and to read back. */
export const groupHex = (hex) => (hex.match(/.{1,8}/g) ?? []).join(' ');

/**
 * A signing key typed or read back: 64 hex characters that the ledger accepts as a key.
 * @returns {{ value: string, publicKey: string } | { problem: string }}
 */
export const parseSigningKey = (text) => {
  const raw = String(text ?? '').trim();
  if (/^0x/i.test(raw)) return { problem: 'Leave out the 0x at the start: type only the 64 characters.' };
  const t = cleanHex(raw);
  if (!HEX64.test(t)) return { problem: `That is ${t.length} characters; a key is exactly 64, each 0-9 or a-f.` };
  try {
    return { value: t, publicKey: signatureVerifyingKey(t) };
  } catch {
    return { problem: 'Those 64 characters are not a valid signing key. Check the copy for a typo.' };
  }
};

/**
 * A public (verifying) key: 64 hex characters the ledger accepts.
 * @returns {{ value: string } | { problem: string }}
 */
export const parsePublicKey = (text) => {
  const t = cleanHex(text);
  if (!HEX64.test(t))
    return { problem: `That is ${t.length} characters; a public key is exactly 64, each 0-9 or a-f.` };
  try {
    new ContractMaintenanceAuthority([t], 1, 0n);
    return { value: t };
  } catch {
    return { problem: 'Those 64 characters are not a valid public key. Check the copy for a typo.' };
  }
};

/* **********************************************************************
 * Key cards: a holder's public key, with proof the holder's stored copy can sign.
 *
 * The card is public. Its proof is a signature over a VeilCore-only message naming the
 * holder and the key (it starts "veilcore:", and every maintenance update the ledger signs
 * starts "midnight:contract-update:", so the two can never be confused). The proof shows the
 * key was copied correctly before it is given any power: a committee member whose paper copy
 * has a typo is a lost key, and with two lost keys the contract can never be maintained.
 * It does not show WHO made the card: confirm each public key with its holder in person or
 * on a call (the fingerprint, out loud), never only by message.
 */

export const possessionMessage = (holder, publicKey) =>
  new TextEncoder().encode(`veilcore:committee-key:v1\n${holder}\n${publicKey}`);

/** A new card for `holder`, signed by `signingKey`. */
export const makeKeyCard = (holder, signingKey, createdAt = new Date().toISOString()) => {
  if (!HOLDER.test(holder))
    throw new Error('The holder name must be 1-32 characters: small letters, digits and dashes (like "mako").');
  const k = parseSigningKey(signingKey);
  if ('problem' in k) throw new Error(k.problem);
  return {
    format: KEY_CARD_FORMAT,
    holder,
    publicKey: k.publicKey,
    fingerprint: fingerprint(k.publicKey),
    possessionProof: signData(k.value, possessionMessage(holder, k.publicKey)),
    createdAt,
  };
};

/**
 * A card checked: the right format, a valid key, and a proof made by that key.
 * @returns {{ ok: true, holder: string, publicKey: string } | { ok: false, problem: string }}
 */
export const checkKeyCard = (card) => {
  const who = typeof card?.holder === 'string' ? `"${card.holder}"` : 'this card';
  if (card === null || typeof card !== 'object' || card.format !== KEY_CARD_FORMAT)
    return { ok: false, problem: `${who} is not a VeilCore committee key card (${KEY_CARD_FORMAT}).` };
  if (typeof card.holder !== 'string' || !HOLDER.test(card.holder))
    return { ok: false, problem: `${who}: the holder name is missing or not small letters, digits and dashes.` };
  const pk = parsePublicKey(card.publicKey);
  if ('problem' in pk) return { ok: false, problem: `${who}: ${pk.problem}` };
  if (pk.value !== card.publicKey)
    return { ok: false, problem: `${who}: the public key must be written in small letters, no spaces.` };
  let proved = false;
  try {
    proved = verifySignature(pk.value, possessionMessage(card.holder, pk.value), String(card.possessionProof ?? ''));
  } catch {
    proved = false;
  }
  if (!proved)
    return {
      ok: false,
      problem: `${who}: the proof does not match the key. The card was edited, or made for another holder name.`,
    };
  return { ok: true, holder: card.holder, publicKey: pk.value };
};

/** Does this signing key belong to this card? (Checking a stored copy against the card.) */
export const keyMatchesCard = (signingKey, card) => {
  const k = parseSigningKey(signingKey);
  return !('problem' in k) && k.publicKey === card.publicKey;
};

/* **********************************************************************
 * The committee.
 */

/**
 * Problems with a proposed committee, in plain words; empty when it is acceptable.
 * `forbid`: public keys that must not be members (the current single key: both founders
 * hold copies of it, so as a member it would give one of them two votes).
 */
export const committeeProblems = (cards, threshold, { forbid = [] } = {}) => {
  const problems = [];
  if (!Array.isArray(cards)) return ['The committee must be a list of key cards.'];
  if (cards.length !== COMMITTEE_SIZE)
    problems.push(`The committee must have exactly ${COMMITTEE_SIZE} keys; this one has ${cards.length}.`);
  if (threshold !== COMMITTEE_THRESHOLD)
    problems.push(`The threshold must be exactly ${COMMITTEE_THRESHOLD} signatures; this one is ${threshold}.`);
  const keys = [];
  const holders = [];
  for (const card of cards) {
    const c = checkKeyCard(card);
    if (!c.ok) {
      problems.push(c.problem);
      continue;
    }
    if (keys.includes(c.publicKey))
      problems.push(
        `The same public key appears twice (${fingerprint(c.publicKey)}): one holder would have two votes.`,
      );
    if (holders.includes(c.holder)) problems.push(`Two cards name the same holder ("${c.holder}").`);
    if (forbid.map(cleanHex).includes(c.publicKey))
      problems.push(
        `"${c.holder}" is the contract's current maintenance key (${fingerprint(c.publicKey)}). Both founders hold ` +
          'paper copies of it, so it cannot be a committee member. Make a new key.',
      );
    keys.push(c.publicKey);
    holders.push(c.holder);
  }
  return problems;
};

/** The ledger's authority as plain data (committee as hex strings, counter as a bigint). */
export const authorityView = (a) => ({
  committee: [...a.committee].map((k) => cleanHex(k)),
  threshold: Number(a.threshold),
  counter: BigInt(a.counter),
});

/** Nobody can sign for this authority (an empty committee, or more signatures than members). */
export const isRetired = (a) => a.threshold > a.committee.length;

/* **********************************************************************
 * Requests: one maintenance change, written down so each holder can check and sign it.
 *
 * A request holds what the change is (its actions) and what it is valid against (the
 * network, the contract, the authority as it stands). Every holder's tool rebuilds the
 * ledger update from those fields and signs what it rebuilt; the `dataToSign` in the file is
 * only compared, never trusted, so a file edited after it was made cannot get a signature
 * for something other than what the holder was shown.
 */

const sameKeys = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);

const plainCurrent = (current) => ({
  committee: current.committee.map(cleanHex),
  threshold: Number(current.threshold),
  counter: String(BigInt(current.counter)),
});

/** One action, checked. @returns {{ problem: string } | { instruction: unknown, describe: string }} */
const actionToInstruction = (action, current, opts) => {
  switch (action?.kind) {
    case 'replace-authority': {
      const problems = committeeProblems(action.committee, action.threshold, { forbid: opts.forbid });
      if (problems.length > 0) return { problem: problems.join(' ') };
      const keys = action.committee.map((c) => c.publicKey);
      if (sameKeys(keys, current.committee) && action.threshold === current.threshold)
        return { problem: 'That committee is the one already in place: nothing would change.' };
      return {
        instruction: new ReplaceAuthority(
          new ContractMaintenanceAuthority(keys, COMMITTEE_THRESHOLD, BigInt(current.counter) + 1n),
        ),
        describe:
          `Replace who can change the contract with a committee of ${keys.length} keys, any ${action.threshold} of ` +
          `which must sign: ${action.committee.map((c) => `${c.holder} (${fingerprint(c.publicKey)})`).join(', ')}.`,
      };
    }
    case 'retire':
      return {
        instruction: new ReplaceAuthority(new ContractMaintenanceAuthority([], 1, BigInt(current.counter) + 1n)),
        describe:
          'RETIRE the authority for good: an empty committee, which no key can ever satisfy. Nobody, including ' +
          'the committee, can change this contract again. This cannot be undone.',
      };
    case 'remove-key': {
      if (typeof action.circuit !== 'string' || !CIRCUIT.test(action.circuit))
        return { problem: 'A remove-key action needs a circuit name (letters, digits, underscores).' };
      return {
        instruction: new VerifierKeyRemove(action.circuit, new ContractOperationVersion('v3')),
        describe: `Remove the verifier key of circuit "${action.circuit}": it can no longer be called.`,
      };
    }
    case 'insert-key': {
      if (typeof action.circuit !== 'string' || !CIRCUIT.test(action.circuit))
        return { problem: 'An insert-key action needs a circuit name (letters, digits, underscores).' };
      const vkHex = cleanHex(action.verifierKey);
      if (!/^([0-9a-f]{2})+$/.test(vkHex)) return { problem: `The verifier key for "${action.circuit}" is not hex.` };
      const vk = fromHex(vkHex);
      if (sha256Hex(vk) !== cleanHex(action.verifierKeySha256))
        return {
          problem: `The verifier key for "${action.circuit}" does not match the SHA-256 written next to it. Do not sign.`,
        };
      return {
        instruction: new VerifierKeyInsert(action.circuit, new ContractOperationVersionedVerifierKey('v3', vk)),
        describe:
          `Insert a verifier key for circuit "${action.circuit}" (SHA-256 ${sha256Hex(vk)}). Compare it with ` +
          'docs/fingerprints.md, or with a build of the published source, before signing: a new key can change ' +
          'anything the contract stores.',
      };
    }
    default:
      return { problem: `Unknown action "${String(action?.kind)}".` };
  }
};

/**
 * Check a request and rebuild its ledger update.
 * @returns {{ ok: true, update: MaintenanceUpdate, lines: string[] } | { ok: false, problems: string[] }}
 */
export const rebuildRequest = (req, opts = {}) => {
  const problems = [];
  if (req === null || typeof req !== 'object' || req.format !== REQUEST_FORMAT)
    return { ok: false, problems: [`This is not a VeilCore maintenance request (${REQUEST_FORMAT}).`] };
  if (!NETWORKS.includes(req.network)) problems.push(`Unknown network "${String(req.network)}".`);
  const address = cleanHex(req.contractAddress);
  if (!HEX64.test(address)) problems.push('The contract address is not 64 hex characters.');
  let current;
  try {
    current = plainCurrent(req.current);
    if (!current.committee.every((k) => !('problem' in parsePublicKey(k))))
      problems.push('The current committee in the request has a key that is not valid.');
    if (!Number.isInteger(current.threshold) || current.threshold < 1)
      problems.push('The current threshold in the request is not a whole number of 1 or more.');
    if (isRetired(current)) problems.push('The contract in this request is retired: nobody can change it.');
  } catch {
    problems.push('The request does not say which authority it is valid against (committee, threshold, counter).');
  }
  const actions = Array.isArray(req.actions) ? req.actions : [];
  if (actions.length === 0) problems.push('The request has no actions.');
  const authorityActions = actions.filter((a) => a?.kind === 'replace-authority' || a?.kind === 'retire');
  if (authorityActions.length > 0 && actions.length > 1)
    problems.push('Replacing or retiring the authority must be the only action in its request.');
  if (problems.length > 0) return { ok: false, problems };

  const instructions = [];
  const lines = [];
  for (const a of actions) {
    const r = actionToInstruction(a, current, opts);
    if ('problem' in r) problems.push(r.problem);
    else {
      instructions.push(r.instruction);
      lines.push(r.describe);
    }
  }
  if (problems.length > 0) return { ok: false, problems };
  const update = new MaintenanceUpdate(address, instructions, BigInt(current.counter));
  if (req.dataToSign !== undefined && cleanHex(req.dataToSign) !== toHex(update.dataToSign))
    return {
      ok: false,
      problems: [
        'The request says one thing and its data to sign says another: the file was changed after it was made. ' +
          'Do not sign it. Ask for a fresh request.',
      ],
    };
  return { ok: true, update, lines };
};

/** A new request. `current` is the authority as the chain shows it now. Throws when it is not acceptable. */
export const makeRequest = ({ network, contractAddress, current, actions, reason = '', forbid = [] }) => {
  const req = {
    format: REQUEST_FORMAT,
    network,
    contractAddress: cleanHex(contractAddress),
    current: plainCurrent(current),
    actions,
    reason: String(reason),
    createdAt: new Date().toISOString(),
  };
  const r = rebuildRequest(req, { forbid });
  if (!r.ok) throw new Error(r.problems.join(' '));
  return { ...req, dataToSign: toHex(r.update.dataToSign), dataToSignSha256: sha256Hex(r.update.dataToSign) };
};

/** What a request does, in plain words, for the person about to sign or send it. */
export const describeRequest = (req, rebuilt, { pinnedMainnetAddress } = {}) => {
  const address = cleanHex(req.contractAddress);
  const which =
    req.network === 'mainnet'
      ? address === pinnedMainnetAddress
        ? "VeilCore's main contract on MAINNET (the pinned address)"
        : 'a MAINNET contract that is NOT the pinned VeilCore main contract'
      : `a contract on ${req.network} (a test network)`;
  const c = plainCurrent(req.current);
  return [
    `Network:   ${req.network}`,
    `Contract:  ${address}`,
    `           ${which}`,
    `Valid for: the authority as it stands now, ${c.committee.length} key(s), ${c.threshold} signature(s) needed, counter ${c.counter}.`,
    '           Once any other change is made, this request can never be used.',
    ...rebuilt.lines.map((l, i) => `Change ${i + 1}:  ${l}`),
    ...(req.reason ? [`Reason:    ${req.reason}`] : []),
    `Check code: ${sha256Hex(rebuilt.update.dataToSign).slice(0, 16)} (compare with the other signers)`,
  ];
};

/* **********************************************************************
 * Signatures: each holder signs on their own machine; one person collects and sends.
 */

/**
 * Sign a request with one holder's key. The key must be a member of the request's CURRENT
 * committee; its place in that list is the signature's index.
 */
export const signRequest = (req, signingKey, opts = {}) => {
  const rebuilt = rebuildRequest(req, opts);
  if (!rebuilt.ok) throw new Error(rebuilt.problems.join(' '));
  const k = parseSigningKey(signingKey);
  if ('problem' in k) throw new Error(k.problem);
  const index = plainCurrent(req.current).committee.indexOf(k.publicKey);
  if (index < 0)
    throw new Error(
      `This key (${fingerprint(k.publicKey)}) is not on the contract's current committee, so its signature would ` +
        'not count. Check you used the right key, and that the request is for the right contract.',
    );
  return {
    format: SIGNATURE_FORMAT,
    network: req.network,
    contractAddress: cleanHex(req.contractAddress),
    counter: String(BigInt(req.current.counter)),
    dataToSignSha256: sha256Hex(rebuilt.update.dataToSign),
    index,
    publicKey: k.publicKey,
    signature: signData(k.value, rebuilt.update.dataToSign),
  };
};

/**
 * Put a request and its signatures together into the update to send, checked against the
 * authority as the chain shows it NOW. Refuses rather than send something the chain refuses.
 * @returns {{ ok: true, update: MaintenanceUpdate, signers: string[] } | { ok: false, problems: string[] }}
 */
export const assembleSigned = (req, signatureFiles, onChain, opts = {}) => {
  const rebuilt = rebuildRequest(req, opts);
  if (!rebuilt.ok) return rebuilt;
  const chain = authorityView(onChain);
  const asked = plainCurrent(req.current);
  if (BigInt(asked.counter) !== chain.counter)
    return {
      ok: false,
      problems: [
        `The chain's counter is ${chain.counter}; this request was made for ${asked.counter}. Something changed the ` +
          'contract since, so this request can never be used. Make a new one from the chain as it is now.',
      ],
    };
  if (!sameKeys(asked.committee, chain.committee) || asked.threshold !== chain.threshold)
    return { ok: false, problems: ["The request's committee is not the one on chain. Make a new request."] };
  const digest = sha256Hex(rebuilt.update.dataToSign);
  const problems = [];
  const byIndex = new Map();
  for (const [n, s] of signatureFiles.entries()) {
    const label = `Signature ${n + 1}`;
    if (s?.format !== SIGNATURE_FORMAT) {
      problems.push(`${label} is not a VeilCore maintenance signature file.`);
      continue;
    }
    if (s.dataToSignSha256 !== digest) {
      problems.push(
        `${label} was made for a different request (check code ${String(s.dataToSignSha256).slice(0, 16)}).`,
      );
      continue;
    }
    const index = Number(s.index);
    const member = chain.committee[index];
    if (!Number.isInteger(index) || member === undefined || member !== cleanHex(s.publicKey)) {
      problems.push(`${label} is from a key that is not on the committee at the place it claims.`);
      continue;
    }
    let valid = false;
    try {
      valid = verifySignature(member, rebuilt.update.dataToSign, String(s.signature));
    } catch {
      valid = false;
    }
    if (!valid) {
      problems.push(`${label} does not verify: it was damaged or edited.`);
      continue;
    }
    if (byIndex.has(index)) {
      problems.push(`${label} is a second signature from the same key (${fingerprint(member)}): it counts once.`);
      continue;
    }
    byIndex.set(index, String(s.signature));
  }
  if (byIndex.size < chain.threshold)
    problems.push(
      `${byIndex.size} valid signature(s) from different committee members; ${chain.threshold} are needed. Nothing was sent.`,
    );
  if (byIndex.size < chain.threshold) return { ok: false, problems };
  let update = rebuilt.update;
  for (const index of [...byIndex.keys()].sort((a, b) => a - b))
    update = update.addSignature(BigInt(index), byIndex.get(index));
  return {
    ok: true,
    update,
    signers: [...byIndex.keys()].map((i) => fingerprint(chain.committee[i])),
    warnings: problems,
  };
};

/** Is the change in `req` visible on chain? (The counter moved on, and a new authority is the one asked for.) */
export const requestLanded = (req, onChain) => {
  const chain = authorityView(onChain);
  const before = BigInt(req.current.counter);
  if (chain.counter <= before) return false;
  const a = req.actions[0];
  if (a?.kind === 'replace-authority')
    return (
      chain.counter === before + 1n &&
      sameKeys(
        chain.committee,
        a.committee.map((c) => c.publicKey),
      ) &&
      chain.threshold === a.threshold
    );
  if (a?.kind === 'retire')
    return chain.counter === before + 1n && chain.committee.length === 0 && chain.threshold === 1;
  return true;
};
