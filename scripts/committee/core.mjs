// The maintenance committee: three keys, any two of which must sign a change to the
// main contract. Pure functions only: nothing here reads a network, a file or a key store.
//
// LEDGER 9. Midnight's mainnet moved to Ledger 9 on 6 November 2026, and what a holder signs
// changed with it: the bytes of the same update differ between Ledger 8 and Ledger 9
// ("midnight:contract-update:" became "midnight:contract-maintenance-update-..."), so a
// signature made with ledger-v8 is not valid on a Ledger 9 network. Everything here (building,
// signing, combining, checking) therefore uses Ledger 9 types, from @midnightntwrk/ledger-v9
// 1.0.1 (ledger 9.1.0.1, which has the key-removal fee fix). It is installed under the name
// `ledger-v9-committee`, because package.json pins the plain name to 1.0.0 for midnight-js 5.0.0.
// Keys did not change: a key made before the upgrade is the same key after it. Replacing the
// authority of a contract built with compactc 0.31 needs no recompile: the ledger checks the
// counter and the signatures, nothing about the compiler (the rehearsal in
// docs/committee-rehearsal.md, and committee.test.mjs).
//
// How Midnight's ledger treats a contract's maintenance authority, checked against the real
// ledger code in committee.test.mjs:
//
//  - The authority is ContractMaintenanceAuthority(committee, threshold, counter): a list of
//    public keys, how many of them must sign, and a replay counter.
//  - A change is a MaintenanceUpdate(address, [instructions], counter). Each signature is
//    [index into the CURRENT committee, signData(key, update.dataToSign)]. dataToSign covers
//    the address, the instructions and the counter, nothing else, so holders can sign on
//    separate machines at different times and one person adds the signatures and sends it.
//    Signatures must be for different members: the same index twice is refused.
//  - The update must carry the authority's current counter. Every update raises the counter
//    by one, so a signed update that has been used, or overtaken, can never be used again.
//  - Replacing the authority: the new authority's counter must be exactly current + 1.
//  - The ledger does NOT refuse a committee with the same key twice, or a threshold of 0
//    (which lets anyone change the contract with no signature at all), and a threshold of
//    2^32 silently becomes 0. This file refuses all three before anything is signed.
//
// midnight-js cannot build any of this (replaceAuthority takes one key and always installs a
// one-key committee with threshold 1, and midnight-js 5 refuses to maintain a pre-upgrade
// contract on a Ledger 9 network at all: a rule of the library, not of the chain), so the
// update is built here from the ledger's own types.
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
} from 'ledger-v9-committee';

/** VeilCore's committee: three keys, two signatures. Anything else is refused. */
export const COMMITTEE_SIZE = 3;
export const COMMITTEE_THRESHOLD = 2;

export const KEY_CARD_FORMAT = 'veilcore-committee-key/v1';
// v2: Ledger 9. A v1 request or signature was made with Ledger 8 types and can never be used
// on a Ledger 9 network; both are refused by name, and a Ledger 8 signature copied into a v2
// file does not verify.
export const REQUEST_FORMAT = 'veilcore-maintenance-request/v2';
export const SIGNATURE_FORMAT = 'veilcore-maintenance-signature/v2';
/** A new holder's signature over a change's check code, made before the change is sent. */
export const CONFIRMATION_FORMAT = 'veilcore-committee-confirmation/v1';
// v2: holds its creation time and the request it checked (bboard-cli/src/launcher/committee.ts).
export const DRY_RUN_FORMAT = 'veilcore-maintenance-dry-run/v2';
/** A dry-run record older than this is refused: make a new dry run. */
export const DRY_RUN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const LEDGER8_REQUEST_FORMAT = 'veilcore-maintenance-request/v1';
const LEDGER8_SIGNATURE_FORMAT = 'veilcore-maintenance-signature/v1';

export const NETWORKS = ['mainnet', 'preprod', 'preview', 'undeployed'];

const HEX64 = /^[0-9a-f]{64}$/;
const HOLDER = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** Every practice card's holder name starts with this, and no real card's does. */
export const PRACTICE_PREFIX = 'practice-';
const CIRCUIT = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * The verifier-key slot (ContractOperationVersion) a key goes in. It follows the compiler a
 * contract was built with: v1 (compactc 0.31, ZKIR v2) is 'v3'; contract v2 (compactc 0.36,
 * ZKIR v3) is 'v4' (docs/contract-v2.md 1.2). A key in the wrong slot is never used, so
 * the slot is checked against the contract's own (the request's current.keySlot).
 */
export const KEY_SLOTS = ['v3', 'v4'];

/**
 * The slot one key action uses, checked against the contract's. An action that names no slot
 * is 'v3', so every request made before the slot existed rebuilds to the same bytes. A
 * contract whose slot is not stated is taken to be 'v3' (v1): 'v4' must be asked for.
 * @returns {{ slot: 'v3' | 'v4' } | { problem: string }}
 */
export const keySlotFor = (action, current) => {
  const slot = action.keySlot ?? 'v3';
  const contractSlot = current.keySlot ?? 'v3';
  if (!KEY_SLOTS.includes(slot)) return { problem: `Unknown key slot "${String(slot)}": it is v3 or v4.` };
  if (!KEY_SLOTS.includes(contractSlot))
    return { problem: `The request says the contract's keys are in an unknown slot "${String(contractSlot)}".` };
  if (slot !== contractSlot)
    return {
      problem:
        `This contract's keys are in slot ${contractSlot.toUpperCase()}, but the key action for ` +
        `"${String(action.circuit)}" uses ${slot.toUpperCase()}. A key in the wrong slot is never used. Do not sign.`,
    };
  return { slot };
};

/**
 * The slot a verifier key's own bytes are for, from their header: compactc 0.31 keys say
 * "midnight:verifier-key[v6]:" (slot v3), 0.36 keys "midnight:verifier-key[v7]:" (slot v4).
 * The ledger refuses a key in the other slot; this finds it before anyone signs.
 * @returns {'v3' | 'v4' | undefined} undefined when the header is not one of these
 */
export const slotOfKeyBytes = (vk) => {
  const m = /^midnight:verifier-key\[v(\d+)\]:/.exec(Buffer.from(vk.slice(0, 40)).toString('latin1'));
  return m?.[1] === '6' ? 'v3' : m?.[1] === '7' ? 'v4' : undefined;
};
const toHex = (bytes) => Buffer.from(bytes).toString('hex');
const fromHex = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));

/** Ledger 9 holds a key or a signature as { tag, value }; VeilCore's keys are all Schnorr keys. */
const tagged = (hex) => ({ tag: 'schnorr', value: hex });

/** A key as people copy it: spaces, dashes and case do not matter. */
export const cleanHex = (text) =>
  String(text ?? '')
    .replace(/[\s-]/g, '')
    .toLowerCase();

/** A committee key as plain hex, from Ledger 9's { tag, value } or from hex. Only Schnorr keys. */
export const bareKey = (k) => {
  if (typeof k === 'string') return cleanHex(k);
  if (k?.tag === 'schnorr' && typeof k.value === 'string') return cleanHex(k.value);
  throw new Error("The contract's maintenance committee holds a key that is not a Schnorr key; refused.");
};

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
    return { value: t, publicKey: signatureVerifyingKey(tagged(t)).value };
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
    new ContractMaintenanceAuthority([tagged(t)], 1, 0n);
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
 * starts "midnight:contract-", so the two can never be confused). A card made before the
 * Ledger 9 upgrade is still valid: the key and this message did not change. The proof shows the
 * key was copied correctly before it is given any power: a committee member whose paper copy
 * has a typo is a lost key, and with two lost keys the contract can never be maintained.
 * It does not show WHO made the card: confirm each public key with its holder in person or
 * on a call (the fingerprint, out loud), never only by message.
 *
 * PRACTICE CARDS. A card made for a rehearsal is marked three ways, and all three must agree:
 * `practice: true` in the card, a holder name that starts "practice-", and a proof made over a
 * different message (it says "practice"). So the mark cannot be taken off: a practice card with
 * `practice` removed, or renamed, no longer proves its key. Every mainnet path refuses a
 * practice card (rebuildRequest below), because a rehearsal ends by deleting its keys.
 */

export const possessionMessage = (holder, publicKey, practice = false) =>
  new TextEncoder().encode(`veilcore:committee-key:v1${practice ? ':practice' : ''}\n${holder}\n${publicKey}`);

/** Why this holder name does not fit this kind of card, or null. */
const holderNameProblem = (holder, practice) => {
  if (practice && !holder.startsWith(PRACTICE_PREFIX))
    return `A practice card's holder name must start with "${PRACTICE_PREFIX}" (like "${PRACTICE_PREFIX}mako").`;
  if (!practice && holder.startsWith(PRACTICE_PREFIX))
    return `A holder name that starts with "${PRACTICE_PREFIX}" is for practice cards only (keygen --practice).`;
  return null;
};

/** A new card for `holder`, signed by `signingKey`. `practice`: a rehearsal card (see above). */
export const makeKeyCard = (holder, signingKey, createdAt = new Date().toISOString(), { practice = false } = {}) => {
  if (!HOLDER.test(holder))
    throw new Error('The holder name must be 1-32 characters: small letters, digits and dashes (like "mako").');
  if (practice !== true && practice !== false) throw new Error('practice must be true or false.');
  const name = holderNameProblem(holder, practice);
  if (name !== null) throw new Error(name);
  const k = parseSigningKey(signingKey);
  if ('problem' in k) throw new Error(k.problem);
  return {
    format: KEY_CARD_FORMAT,
    holder,
    ...(practice ? { practice: true } : {}),
    publicKey: k.publicKey,
    fingerprint: fingerprint(k.publicKey),
    possessionProof: signData(tagged(k.value), possessionMessage(holder, k.publicKey, practice)).value,
    createdAt,
  };
};

/** Is this a practice card? (Only meaningful for a card that passed checkKeyCard.) */
export const isPracticeCard = (card) => card?.practice === true;

/**
 * A card checked: the right format, a valid key, and a proof made by that key.
 * @returns {{ ok: true, holder: string, publicKey: string, practice: boolean } | { ok: false, problem: string }}
 */
export const checkKeyCard = (card) => {
  const who = typeof card?.holder === 'string' ? `"${card.holder}"` : 'this card';
  if (card === null || typeof card !== 'object' || card.format !== KEY_CARD_FORMAT)
    return { ok: false, problem: `${who} is not a VeilCore committee key card (${KEY_CARD_FORMAT}).` };
  if (typeof card.holder !== 'string' || !HOLDER.test(card.holder))
    return { ok: false, problem: `${who}: the holder name is missing or not small letters, digits and dashes.` };
  if (card.practice !== undefined && card.practice !== true)
    return { ok: false, problem: `${who}: "practice" must be true or left out.` };
  const practice = card.practice === true;
  const name = holderNameProblem(card.holder, practice);
  if (name !== null) return { ok: false, problem: `${who}: ${name}` };
  const pk = parsePublicKey(card.publicKey);
  if ('problem' in pk) return { ok: false, problem: `${who}: ${pk.problem}` };
  if (pk.value !== card.publicKey)
    return { ok: false, problem: `${who}: the public key must be written in small letters, no spaces.` };
  let proved = false;
  try {
    proved = verifySignature(
      tagged(pk.value),
      possessionMessage(card.holder, pk.value, practice),
      tagged(String(card.possessionProof ?? '')),
    );
  } catch {
    proved = false;
  }
  if (!proved)
    return {
      ok: false,
      problem:
        `${who}: the proof does not match the key. The card was edited (its key, its holder name or its ` +
        'practice mark), or made for another holder name.',
    };
  return { ok: true, holder: card.holder, publicKey: pk.value, practice };
};

export const PRACTICE_ON_MAINNET =
  'is a PRACTICE card, made for a rehearsal. Practice keys are thrown away, so a practice card is never ' +
  'accepted on mainnet. Each holder makes a real key (keygen without --practice).';

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
  committee: [...a.committee].map(bareKey),
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
  committee: [...current.committee].map(bareKey),
  threshold: Number(current.threshold),
  counter: String(BigInt(current.counter)),
  ...(current.keySlot === undefined ? {} : { keySlot: current.keySlot }),
});

/** One action, checked. @returns {{ problem: string } | { instruction: unknown, describe: string }} */
const actionToInstruction = (action, current, opts) => {
  switch (action?.kind) {
    case 'replace-authority': {
      // A single key that can change the contract today can never be a member, on every path
      // (install, request, read, sign, submit): the request names the authority it is valid
      // against, so the rule needs nothing from the caller.
      const forbid = [...(opts.forbid ?? []), ...(current.committee.length === 1 ? current.committee : [])];
      const problems = committeeProblems(action.committee, action.threshold, { forbid });
      if (opts.network === 'mainnet' && Array.isArray(action.committee))
        for (const card of action.committee)
          if (isPracticeCard(card) || String(card?.holder ?? '').startsWith(PRACTICE_PREFIX))
            problems.push(`"${String(card?.holder)}" ${PRACTICE_ON_MAINNET}`);
      if (problems.length > 0) return { problem: problems.join(' ') };
      const keys = action.committee.map((c) => c.publicKey);
      if (sameKeys(keys, current.committee) && action.threshold === current.threshold)
        return { problem: 'That committee is the one already in place: nothing would change.' };
      return {
        instruction: new ReplaceAuthority(
          new ContractMaintenanceAuthority(keys.map(tagged), COMMITTEE_THRESHOLD, BigInt(current.counter) + 1n),
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
      const s = keySlotFor(action, current);
      if ('problem' in s) return s;
      return {
        instruction: new VerifierKeyRemove(action.circuit, new ContractOperationVersion(s.slot)),
        describe: `Remove the verifier key of circuit "${action.circuit}" (slot ${s.slot.toUpperCase()}): it can no longer be called.`,
      };
    }
    case 'insert-key': {
      if (typeof action.circuit !== 'string' || !CIRCUIT.test(action.circuit))
        return { problem: 'An insert-key action needs a circuit name (letters, digits, underscores).' };
      const s = keySlotFor(action, current);
      if ('problem' in s) return s;
      const vkHex = cleanHex(action.verifierKey);
      if (!/^([0-9a-f]{2})+$/.test(vkHex)) return { problem: `The verifier key for "${action.circuit}" is not hex.` };
      const vk = fromHex(vkHex);
      const own = slotOfKeyBytes(vk);
      if (own !== undefined && own !== s.slot)
        return {
          problem:
            `The verifier key for "${action.circuit}" is a ${own.toUpperCase()} key, but it would go in slot ` +
            `${s.slot.toUpperCase()}. The ledger refuses that. Do not sign.`,
        };
      if (sha256Hex(vk) !== cleanHex(action.verifierKeySha256))
        return {
          problem: `The verifier key for "${action.circuit}" does not match the SHA-256 written next to it. Do not sign.`,
        };
      return {
        instruction: new VerifierKeyInsert(action.circuit, new ContractOperationVersionedVerifierKey(s.slot, vk)),
        describe:
          `Insert a verifier key for circuit "${action.circuit}" (slot ${s.slot.toUpperCase()}, SHA-256 ` +
          `${sha256Hex(vk)}). Compare it with ${s.slot === 'v4' ? 'docs/fingerprints-v2.md' : 'docs/fingerprints.md'}, ` +
          'or with a build of the published source, before signing: a new key can change anything the contract stores.',
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
  if (req?.format === LEDGER8_REQUEST_FORMAT)
    return {
      ok: false,
      problems: [
        "This request was made before Midnight's Ledger 9 upgrade. What a holder signs changed with that upgrade, " +
          'so it can never be used. Make a new request with this version of the tool.',
      ],
    };
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
    const r = actionToInstruction(a, current, { ...opts, network: req.network });
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

export const PERMANENT_WARNING =
  'A wrong committee key is PERMANENT. After this change only these keys can change the contract. If two of ' +
  'them are not held by the people named (a typo, a lost copy, a key made by someone else), nobody can ever ' +
  'change or fix this contract again, and nothing can undo it. Check every key with its holder, out loud.';

/**
 * Exactly what a request changes: every key that can change the contract now, every key that
 * can afterwards, and the counter before and after. Keys are written in full.
 */
export const changeSummary = (req) => {
  const c = plainCurrent(req.current);
  const before = BigInt(c.counter);
  const first = Array.isArray(req.actions) ? req.actions[0] : undefined;
  const lines = [
    `Now:       ${c.committee.length} key(s), ${c.threshold} signature(s) needed, counter ${before}.`,
    ...c.committee.map((k, i) => `           ${i + 1}. ${k}`),
  ];
  if (first?.kind === 'replace-authority')
    lines.push(
      `After:     ${first.committee.length} keys, ${first.threshold} signatures needed, counter ${before + 1n}.`,
      ...first.committee.map((card, i) => `           ${i + 1}. ${card.publicKey} (${card.holder})`),
      `WARNING:   ${PERMANENT_WARNING}`,
    );
  else if (first?.kind === 'retire')
    lines.push(`After:     no keys at all (retired for good), counter ${before + 1n}.`);
  else lines.push(`After:     the same key(s) and threshold, counter ${before + 1n}.`);
  return lines;
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
    ...changeSummary(req),
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
    signature: signData(tagged(k.value), rebuilt.update.dataToSign).value,
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
    if (s?.format === LEDGER8_SIGNATURE_FORMAT) {
      problems.push(
        `${label} was made before Midnight's Ledger 9 upgrade (with Ledger 8). It is not valid on Ledger 9: ` +
          'the holder must sign this request again with this version of the tool.',
      );
      continue;
    }
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
      valid = verifySignature(tagged(member), rebuilt.update.dataToSign, tagged(String(s.signature)));
    } catch {
      valid = false;
    }
    if (!valid) {
      problems.push(
        `${label} does not verify: it was damaged or edited, or made with the Ledger 8 tool (not valid on Ledger 9).`,
      );
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
    update = update.addSignature(BigInt(index), tagged(byIndex.get(index)));
  return {
    ok: true,
    update,
    signers: [...byIndex.keys()].map((i) => fingerprint(chain.committee[i])),
    warnings: problems,
  };
};

/* **********************************************************************
 * Confirmations: before a new committee is sent, each of its holders signs the change's
 * check code with their stored key.
 *
 * A card's proof was made when the key was made. This is made at the last moment, from the
 * copy the holder actually kept (the paper, the USB drive), over the hash of the exact bytes
 * the change signs: the address, the three keys, the threshold and both counters. So a card
 * with a mistyped key, a paper copy that no longer reads, or a holder who cannot sign is found
 * while it is still harmless. The message starts "veilcore:", so it can never count as a
 * maintenance signature (those start "midnight:contract-"). A confirmation holds no secret.
 */

/** The cards of the committee a request installs; empty when it installs none. */
export const newCommittee = (req) => {
  const a = Array.isArray(req?.actions) ? req.actions[0] : undefined;
  return a?.kind === 'replace-authority' && Array.isArray(a.committee) ? a.committee : [];
};

export const confirmationMessage = ({ network, contractAddress, dataToSignSha256, holder, publicKey }) =>
  new TextEncoder().encode(
    `veilcore:committee-confirm:v1\n${network}\n${contractAddress}\n${dataToSignSha256}\n${holder}\n${publicKey}`,
  );

/**
 * One new holder's confirmation of the change in `req`, signed with their stored key.
 * Throws when the request is not acceptable, the card is not one of the new committee's, or
 * the key is not the card's.
 */
export const makeConfirmation = (req, card, signingKey, opts = {}) => {
  const rebuilt = rebuildRequest(req, opts);
  if (!rebuilt.ok) throw new Error(rebuilt.problems.join(' '));
  const c = checkKeyCard(card);
  if (!c.ok) throw new Error(c.problem);
  const place = newCommittee(req).findIndex((m) => m.publicKey === c.publicKey && m.holder === c.holder);
  if (place < 0)
    throw new Error(
      `"${c.holder}" (${fingerprint(c.publicKey)}) is not one of the keys this change installs. Check you have ` +
        'the right card and the right dry-run record.',
    );
  const k = parseSigningKey(signingKey);
  if ('problem' in k) throw new Error(k.problem);
  if (k.publicKey !== c.publicKey)
    throw new Error(
      `That key is NOT the one on ${c.holder}'s card (${fingerprint(c.publicKey)}). Check the copy for a typo. ` +
        'Nothing was signed. Tell the person installing the committee: it must not be sent.',
    );
  const body = {
    network: req.network,
    contractAddress: cleanHex(req.contractAddress),
    dataToSignSha256: sha256Hex(rebuilt.update.dataToSign),
    holder: c.holder,
    publicKey: c.publicKey,
  };
  return {
    format: CONFIRMATION_FORMAT,
    ...body,
    counter: String(BigInt(req.current.counter)),
    place,
    signature: signData(tagged(k.value), confirmationMessage(body)).value,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Why the new committee in `req` is not confirmed by all of its holders; empty when every
 * one of them has a valid confirmation among `files` for exactly this change (and when the
 * request installs no committee). Only the signature is trusted: every other field of a
 * confirmation file is rebuilt from the request.
 */
export const confirmationProblems = (req, files, opts = {}) => {
  const rebuilt = rebuildRequest(req, opts);
  if (!rebuilt.ok) return rebuilt.problems;
  const cards = newCommittee(req);
  if (cards.length === 0) return [];
  const digest = sha256Hex(rebuilt.update.dataToSign);
  const list = Array.isArray(files) ? files : [];
  const problems = [];
  for (const [n, f] of list.entries()) {
    const label = `Confirmation ${n + 1}`;
    if (f === null || typeof f !== 'object' || f.format !== CONFIRMATION_FORMAT)
      problems.push(`${label} is not a VeilCore committee confirmation file (${CONFIRMATION_FORMAT}).`);
    else if (f.dataToSignSha256 !== digest)
      problems.push(
        `${label} was made for a different change (check code ${String(f.dataToSignSha256).slice(0, 16)}; this ` +
          `one is ${digest.slice(0, 16)}).`,
      );
    else if (!cards.some((c) => c.publicKey === f.publicKey))
      problems.push(`${label} is from a key that is not one of the three this change installs.`);
  }
  for (const card of cards) {
    const message = confirmationMessage({
      network: req.network,
      contractAddress: cleanHex(req.contractAddress),
      dataToSignSha256: digest,
      holder: card.holder,
      publicKey: card.publicKey,
    });
    const confirmed = list.some((f) => {
      if (f?.format !== CONFIRMATION_FORMAT || f.publicKey !== card.publicKey) return false;
      try {
        return verifySignature(tagged(card.publicKey), message, tagged(String(f.signature ?? '')));
      } catch {
        return false;
      }
    });
    if (!confirmed)
      problems.push(
        `No valid confirmation from "${card.holder}" (${fingerprint(card.publicKey)}) for check code ` +
          `${digest.slice(0, 16)}. Each of the three new holders must sign it with their stored key ` +
          '(cli.mjs confirm) before this change is sent.',
      );
  }
  return problems;
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
