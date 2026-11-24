// Checking what someone shows you, with no wallet, no keys and no private state: only
// an indexer. For a verifier, a registry or an examiner.
// SPDX-License-Identifier: Apache-2.0
//
// Each check finds the transaction the other party names, requires it to have succeeded
// with exactly one call on VeilCore's contract, of the expected kind, and judges the
// state the indexer recorded for that call (docs/design.md, verifier rules 5, 7, 8 and 9).
// On mainnet only the pinned addresses are accepted, and the state judged must carry the
// pinned build's verifier keys (state-check.ts): a circuit the maintenance authority
// replaced is refused. The authority itself (committee, threshold, counter) comes back
// with every verdict, so a change is visible. The indexer is trusted for what it reports:
// for a decision that matters, give `secondIndexer` and both must agree.

import { ContractState } from '@midnight-ntwrk/compact-runtime';
import * as Veilcore from '../../contract/src/managed/veilcore/contract/index.js';
import { CLAIMS_PROVABLE_CIRCUITS, claimsLedger } from '../../contract/src/claims.js';
import {
  acceptOwnership,
  acceptPairingWithStates,
  acceptPresentationAt,
  type RawPairing,
} from '../../contract/src/verify.js';
import { type ActionSource, indexerHistory, rawPairingsBefore } from '../../api/src/pairing-history.js';
import { type Claim, claimFromCells } from '../../contract/src/verify-claims.js';
import {
  type LookupCheck,
  contractStateNow,
  presentationWithTime,
  singleCallState,
  singleCallStateAcross,
} from '../../api/src/presentation-lookup.js';
import {
  type AuthorityReport,
  ContractStateMismatchError,
  type KeyPins,
  type StateRequirements,
  checkContractState,
  pinnedVerifierKeys,
} from '../../api/src/state-check.js';
import { isProvablyRetired } from '../../api/src/maintenance.js';
import {
  type ContractVersion,
  MAINNET_PINNED,
  PREPROD_PINNED,
  type PinnedEntry,
  pinnedAt,
  versionName,
} from '../../api/src/pinned-contracts.js';
import { v2LastBatchRoot } from '../../api/src/batch-root-layout.js';
import {
  type ContractKind,
  type Network,
  type PinnedContract,
  MAINNET_CONTRACTS,
  defaultAddress,
  endpointsFor,
  isNetwork,
  pinnedContractFor,
  resolveAddress,
} from './network.js';

/** Where to read from. Nothing else is needed: no wallet, no keys. */
export type ReadOptions = {
  readonly network: Network;
  /** The indexer's GraphQL URL. Default: the network's public one (mainnet: Blockfrost, with blockfrostProjectId). */
  readonly indexer?: string;
  readonly blockfrostProjectId?: string;
  /**
   * A second indexer (your own, or another provider's). When given, every check and reader
   * here asks both: a check refuses unless they report the same transaction, call, block,
   * block time and contract state; a read of the state now (readLedger, readAuthority,
   * readClaimsAuthority, checkOwnership's current state) refuses unless both report the
   * same state. Not covered: a `history` passed to checkPresentation.
   */
  readonly secondIndexer?: string;
  /** The contract's address. Default: pinned on mainnet (and only that one is accepted), known on preprod. */
  readonly address?: string;
  /**
   * 'pinned': refuse a state whose verifier keys are not the deployment record's build.
   * 'report': only report the maintenance authority. Default: 'pinned' on mainnet (where it
   * cannot be turned off) and preprod; 'report' on a development network, where the
   * contract is usually your own build.
   */
  readonly verifierKeys?: 'pinned' | 'report';
  /**
   * Refuse unless the maintenance authority's counter is exactly this: every maintenance
   * update raises it, so pinning the value you last saw makes any change since a refusal.
   */
  readonly authorityCounter?: bigint;
  /**
   * Which contract version `address` is: 'v1' or 'v2'. On mainnet the pinned list says (a
   * version given here must match it). Off mainnet a check must say, unless the address is on
   * preprod's pinned list (deployments/preprod.json): a defaulted version is refused
   * (docs/contract-v2.md 3.1, rule 10.4).
   */
  readonly contractVersion?: ContractVersion;
  readonly timeoutMs?: number;
};

export type Verdict = { readonly accepted: boolean; readonly reason: string };
export type WhenLanded = { readonly blockHeight?: number; readonly blockTime?: number };
/** The maintenance authority in the state a verdict rests on (absent only when no state was read). */
export type WithAuthority = { readonly authority?: AuthorityReport };
/**
 * The contract a date came from (docs/contract-v2.md 3.1, rule 10.3: every date is shown with
 * the name of the contract that gave it), and on mainnet the published key state its authority
 * was in, e.g. "one key, not yet handed to the committee".
 */
export type WithContract = {
  readonly contract?: PinnedContract & { readonly name: string };
  readonly keyState?: string;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};
const namesNetwork = (url: string, n: string): boolean => new RegExp(`(^|[.-])${n}([.-]|$)`).test(hostOf(url));

/**
 * The network, the indexers and the address must agree. A check run as `preprod` skips
 * the mainnet address pin, so a mainnet indexer or a mainnet address under any other
 * network name is refused rather than judged by development rules.
 */
const assertSameNetwork = (o: ReadOptions, indexers: readonly string[], address: string): void => {
  if (o.network === 'mainnet') {
    for (const i of indexers)
      if (['preprod', 'preview'].some((n) => namesNetwork(i, n)))
        throw new Error(`Refusing: the network is mainnet but the indexer ${hostOf(i)} is not. Nothing was read.`);
    return;
  }
  for (const i of indexers)
    if (namesNetwork(i, 'mainnet'))
      throw new Error(
        `Refusing: the network is ${o.network} but the indexer ${hostOf(i)} is a mainnet one. ` +
          "Use network: 'mainnet', where only VeilCore's pinned contracts are accepted. Nothing was read.",
      );
  if (Object.values(MAINNET_CONTRACTS).some((list) => list.some((c) => c.address === address)))
    throw new Error(
      `Refusing: ${address} is VeilCore's mainnet contract, but the network is ${o.network}. ` +
        "Use network: 'mainnet'. Nothing was read.",
    );
};

/** The pinned entry for a contract on `network`, if it has one (mainnet's list, or preprod's). */
const entryFor = (network: Network, address: string): PinnedEntry | undefined =>
  network === 'mainnet'
    ? pinnedAt(MAINNET_PINNED, address)
    : network === 'preprod'
      ? pinnedAt(PREPROD_PINNED, address)
      : undefined;

/**
 * What a state of this contract must carry. On mainnet: its own verifier-key table (version 1:
 * docs/fingerprints.md, as always; version 2: its entry's table, never version 1's) and one of
 * its published key states (docs/contract-v2.md 3.3). Elsewhere, as before: the keys, when
 * pinned, and no key states.
 */
const requirementsFor = (
  o: ReadOptions,
  kind: ContractKind,
  c: PinnedContract,
): StateRequirements & { readonly entry?: PinnedEntry } => {
  if (o.network === 'mainnet' && o.verifierKeys === 'report')
    throw new Error("On mainnet the verifier keys are always checked against the deployment record ('pinned').");
  const pinned =
    o.verifierKeys === undefined ? o.network === 'mainnet' || o.network === 'preprod' : o.verifierKeys === 'pinned';
  const entry = entryFor(o.network, c.address);
  let verifierKeys: KeyPins | undefined;
  if (pinned) {
    if (c.version === 'v1') verifierKeys = pinnedVerifierKeys(kind === 'veilcore' ? 'veilcore' : 'veilcore-claims');
    else if (entry !== undefined) verifierKeys = entry.verifierKeys;
    else
      throw new Error(
        `No verifier-key table is pinned for ${versionName(c.version)} at ${c.address} on ${o.network}. ` +
          "Use verifierKeys: 'report' for a contract of your own. Nothing was read.",
      );
  }
  return {
    verifierKeys,
    authorityCounter: o.authorityCounter,
    ...(o.network === 'mainnet' && entry !== undefined ? { keyStates: entry.keyStates, entry } : {}),
  };
};

const where = (
  o: ReadOptions,
  kind: ContractKind,
  /** A reader of the state now, not a check of a record: off mainnet it may default to version 1. */
  reader = false,
): { indexer: string; address: string; version: ContractVersion; check: LookupCheck } => {
  if (!isNetwork(o.network)) throw new Error(`Unknown network ${String(o.network)}.`);
  const indexer = o.indexer ?? endpointsFor(o.network, {}, { blockfrostProjectId: o.blockfrostProjectId }).indexer;
  const address = resolveAddress(o.network, kind, o.address);
  assertSameNetwork(o, o.secondIndexer === undefined ? [indexer] : [indexer, o.secondIndexer], address);
  const c = pinnedContractFor(
    o.network,
    kind,
    address,
    o.contractVersion ??
      (reader && o.network !== 'mainnet' && entryFor(o.network, address) === undefined ? 'v1' : undefined),
  );
  const req = requirementsFor(o, kind, c);
  return {
    indexer,
    address,
    version: c.version,
    check: {
      verifierKeys: req.verifierKeys,
      authorityCounter: req.authorityCounter,
      keyStates: req.keyStates,
      secondIndexer: o.secondIndexer,
    },
  };
};

/**
 * This package reads version 2 for batch date stamps only (checkBatchAnchor) and for the
 * maintenance authority; every other check and reader is built on version 1's compiled
 * contract, so a version 2 contract is refused there rather than read with version 1's layout.
 */
const v1Only = (w: { readonly version: ContractVersion }, what: string): void => {
  if (w.version !== 'v1')
    throw new Error(
      `${what} reads ${versionName('v1')} only; this version of @veilcore/contracts checks ` +
        `${versionName(w.version)} for batch date stamps (checkBatchAnchor). Nothing was read.`,
    );
};

/**
 * The batch root a call wrote, read from the state after it by the reader for the pinned
 * contract's version (network.ts MAINNET_CONTRACTS), never by what the state or the caller
 * says. Version 2's by its layout (api/src/batch-root-layout.ts).
 */
const BATCH_ROOT_READERS: Readonly<Record<ContractVersion, (state: ContractState) => Uint8Array>> = {
  v1: (state) => Veilcore.ledger(state.data).lastBatchRoot,
  v2: (state) => v2LastBatchRoot(state.data.state),
};

/** A refusal for a state that is not the pinned build: a verdict, not an exception. */
const refusedState = (e: unknown): (Verdict & WithAuthority) | undefined =>
  e instanceof ContractStateMismatchError ? { accepted: false, reason: e.message, authority: e.authority } : undefined;

/** A contract's state now, as the indexer reports it. */
const stateNow = contractStateNow;

/** How often, and how far apart, two indexers are asked for the state now before they must agree. */
const AGREE_TRIES = 3;
const AGREE_WAIT_MS = 2_000;

/**
 * A contract's state now. With a second indexer, both are asked and must report the same
 * state, byte for byte; two indexers a block apart can differ for a moment, so they are
 * asked again (three times, two seconds apart) before the read is refused.
 */
const agreedStateNow = async (
  o: ReadOptions,
  w: { readonly indexer: string; readonly address: string },
  waitMs = AGREE_WAIT_MS,
): Promise<ContractState> => {
  const second = o.secondIndexer;
  if (second === undefined) return stateNow(w.indexer, w.address, o.timeoutMs);
  for (let i = 1; ; i++) {
    const [a, b] = await Promise.all([
      stateNow(w.indexer, w.address, o.timeoutMs),
      stateNow(second, w.address, o.timeoutMs).catch((e: unknown) => {
        throw new Error(
          `The second indexer does not confirm the contract's state (${e instanceof Error ? e.message : String(e)}). Refused.`,
        );
      }),
    ]);
    if (Buffer.from(a.serialize()).equals(Buffer.from(b.serialize()))) return a;
    if (i >= AGREE_TRIES)
      throw new Error(
        "The two indexers disagree about the contract's state now (one may be behind; try again shortly). Refused.",
      );
    await new Promise((r) => setTimeout(r, waitMs));
  }
};

/**
 * VeilCore's ledger now: for checkLineage, identityOf, isLive and the other readers. With
 * `secondIndexer`, both indexers must report the same state; where keys are pinned (always
 * on mainnet), the state must carry the pinned build's verifier keys, or
 * ContractStateMismatchError is thrown and nothing is returned.
 */
export const readLedger = async (o: ReadOptions): Promise<Veilcore.Ledger> => {
  const w = where(o, 'veilcore', true);
  v1Only(w, 'readLedger');
  const state = await agreedStateNow(o, w);
  checkContractState(state, w.check, 'the current state');
  return Veilcore.ledger(state.data);
};

/**
 * Rule 5: a licence presentation. `txId` is what the licensee gave you; `challenge` is
 * the one you sent them (newChallenge(), used once); `issuer` is any record of the
 * licensing identity; `issuedAt` (ms) is when you sent the challenge. Accepted only if
 * that transaction answered your challenge with a licence from that issuer that was live
 * when presented, and it is under an hour old.
 */
export const checkPresentation = async (
  o: ReadOptions & {
    readonly txId: string;
    readonly issuer: Uint8Array;
    readonly challenge: Uint8Array;
    readonly issuedAt?: number;
    /**
     * The contract's state after every call, ONE STATE PER CALL, from the last seal before
     * the presentation up to and including it, from an indexer you trust. It gets neither
     * the verifier-key check nor the second-indexer comparison (it is ledger data only);
     * its last state must match this presentation's. With it the issuer-scoped rule decides, so a
     * third party's revocations cannot make an honest presentation fail (verify.ts,
     * acceptPresentationScoped). Its last state must be this presentation's.
     */
    readonly history?: readonly Veilcore.Ledger[];
    /** 'strict': the original rule 5 even with a history. */
    readonly rule?: 'strict' | 'issuer-scoped';
  },
): Promise<Verdict & WhenLanded & WithAuthority> => {
  const w = where(o, 'veilcore');
  v1Only(w, 'checkPresentation');
  let found: Awaited<ReturnType<typeof presentationWithTime>>;
  try {
    found = await presentationWithTime(w.indexer, w.address, o.txId, o.timeoutMs, w.check);
  } catch (e) {
    const r = refusedState(e);
    if (r !== undefined) return r;
    throw e;
  }
  const v = acceptPresentationAt(found.ledger, o.issuer, o.challenge, {
    landedAt: found.blockTime,
    blockHeight: found.blockHeight,
    issuedAt: o.issuedAt,
    history: o.history,
    rule: o.rule,
  });
  return { ...v, blockHeight: found.blockHeight, blockTime: found.blockTime, authority: found.authority };
};

/**
 * Rule 8: an ownership proof. Accepted only if that transaction answered your
 * `challenge` for `record`'s identity from its live head, and that head has not moved
 * since (rotated, or recovered away from whoever made the proof). With a second indexer,
 * the head must not have moved by either indexer's account of the state now.
 */
export const checkOwnership = async (
  o: ReadOptions & { readonly txId: string; readonly record: Uint8Array; readonly challenge: Uint8Array },
): Promise<Verdict & WhenLanded & WithAuthority> => {
  const w = where(o, 'veilcore');
  v1Only(w, 'checkOwnership');
  let found: Awaited<ReturnType<typeof singleCallState>>;
  const nows: ContractState[] = [];
  try {
    found = await singleCallState(
      w.indexer,
      w.address,
      o.txId,
      ['proveOwnership'],
      'That transaction is not a single proveOwnership call on this contract.',
      o.timeoutMs,
      w.check,
    );
    for (const i of o.secondIndexer === undefined ? [w.indexer] : [w.indexer, o.secondIndexer]) {
      const s = await stateNow(i, w.address, o.timeoutMs);
      checkContractState(s, w.check, 'the current state');
      nows.push(s);
    }
  } catch (e) {
    const r = refusedState(e);
    if (r !== undefined) return r;
    throw e;
  }
  const after = Veilcore.ledger(found.state.data);
  let v: Verdict = { accepted: false, reason: 'no current state was read' };
  for (const s of nows) {
    v = acceptOwnership(after, o.record, o.challenge, Veilcore.ledger(s.data));
    if (!v.accepted) break;
  }
  return { ...v, blockHeight: found.blockHeight, blockTime: found.blockTime, authority: found.authority };
};

/**
 * Rule 9: a bound DNA pairing. The holder gives you the report file, `txId`, `record` (any
 * record of the identity) and `salt` (an evidence file holds all but the report:
 * readPairingEvidence). Hash the report file yourself (reportHashOf) for `reportHash`:
 * the hash alone is the holder's word, and a hash is all anyone needs to make a pairing.
 * Accepted only if that transaction is a single pairDna call that paired
 * H("veilcore:v1:dnapair", reportHash, identity, salt) for `record`'s identity. Then:
 * whoever controlled this record's identity at `pairedAt` (block time, ms) had this
 * report, or its SHA-256, by then. A binding copied to another record, a raw report hash,
 * a wrong salt or report: refused. It does not show who controls the record now
 * (checkOwnership answers that).
 *
 * The reason also says:
 *  - when the report's hash was paired raw before this pairing (`publishedRawEarlier`):
 *    from then on anyone could have made it. The contract's history is read over the
 *    indexer's subscription: `indexerWS` (default: the network's, when `indexer` is not
 *    given), or `history`. With neither, the reason says this was not checked. The history
 *    comes from one indexer and gets no second-indexer comparison;
 *  - when the identity changed keys since the pairing (`identityMoved`): a sale, a new key
 *    and a recovery from a thief look the same, so an earlier key holder made it.
 * The state now is read to resolve a record made after the pairing and to see key changes;
 * with a second indexer, both indexers' states now must accept.
 */
export const checkPairing = async (
  o: ReadOptions & {
    readonly txId: string;
    readonly record: Uint8Array;
    readonly reportHash: Uint8Array;
    readonly salt: Uint8Array;
    /** The indexer's subscription URL (wss://…/graphql/ws), for the contract's history. */
    readonly indexerWS?: string;
    /** The contract's history from elsewhere (pairing-history.ts), instead of `indexerWS`. */
    readonly history?: ActionSource;
  },
): Promise<
  Verdict &
    WhenLanded &
    WithAuthority & {
      readonly pairedAt?: number;
      readonly identityMoved?: boolean;
      readonly publishedRawEarlier?: readonly RawPairing[];
    }
> => {
  const w = where(o, 'veilcore');
  v1Only(w, 'checkPairing');
  let found: Awaited<ReturnType<typeof singleCallState>>;
  const nows: ContractState[] = [];
  try {
    found = await singleCallState(
      w.indexer,
      w.address,
      o.txId,
      ['pairDna'],
      'That transaction is not a single pairDna call on this contract.',
      o.timeoutMs,
      w.check,
    );
    for (const i of o.secondIndexer === undefined ? [w.indexer] : [w.indexer, o.secondIndexer]) {
      const s = await stateNow(i, w.address, o.timeoutMs);
      checkContractState(s, w.check, 'the current state');
      nows.push(s);
    }
  } catch (e) {
    const r = refusedState(e);
    if (r !== undefined) return r;
    throw e;
  }
  const ws =
    o.indexerWS ??
    (o.indexer === undefined
      ? endpointsFor(o.network, {}, { blockfrostProjectId: o.blockfrostProjectId }).indexerWS
      : undefined);
  const history =
    o.history ?? (ws === undefined ? undefined : indexerHistory(w.indexer, ws, { timeoutMs: o.timeoutMs }));
  const earlierRaw =
    history === undefined
      ? undefined
      : (await rawPairingsBefore(history(w.address), o.reportHash, o.txId)).map((p) => ({
          record: p.record,
          landedAt: p.blockTime,
          blockHeight: p.blockHeight,
          txId: p.txId,
        }));
  const v = acceptPairingWithStates(
    Veilcore.ledger(found.state.data),
    { record: o.record, reportHash: o.reportHash, salt: o.salt },
    {
      landedAt: found.blockTime,
      blockHeight: found.blockHeight,
      nows: nows.map((s) => Veilcore.ledger(s.data)),
      earlierRaw,
    },
  );
  return { ...v, blockHeight: found.blockHeight, blockTime: found.blockTime, authority: found.authority };
};

/**
 * The main contracts a batch check tries (docs/contract-v2.md 3.1, rule 10): the one `address`
 * names; with no address, on mainnet every pinned main contract (version 1 and, once pinned,
 * version 2), and on preprod the pinned one.
 */
const batchCandidates = (o: ReadOptions, sameNetwork: (address: string) => void): PinnedContract[] => {
  if (o.network === 'mainnet' && o.address === undefined) {
    const all = MAINNET_CONTRACTS.veilcore.filter(
      (c) => o.contractVersion === undefined || c.version === o.contractVersion,
    );
    if (all.length === 0)
      throw new Error(
        o.contractVersion === undefined
          ? 'No VeilCore contract is pinned for mainnet in this version yet. Nothing was read or sent.'
          : `No ${versionName(o.contractVersion)} is pinned for mainnet in this version. Nothing was read.`,
      );
    for (const c of all) sameNetwork(c.address);
    return [...all];
  }
  const a = resolveAddress(o.network, 'veilcore', o.address ?? defaultAddress(o.network, 'veilcore'));
  sameNetwork(a);
  return [pinnedContractFor(o.network, 'veilcore', a, o.contractVersion)];
};

/** Every contract a call on which counts against "exactly one call" (rule 10.2). */
const pinnedAddressesOn = (network: Network, candidates: readonly PinnedContract[]): string[] => {
  const listed = network === 'mainnet' ? MAINNET_PINNED : network === 'preprod' ? PREPROD_PINNED : [];
  return [...new Set([...candidates.map((c) => c.address), ...listed.map((e) => e.address)])];
};

/**
 * Rule 7: was `root` (an SDK batch root) timestamped by transaction `txId`? Says when, by
 * the block, and on which contract. It does not say who: anchoring a batch is
 * unauthenticated, and inclusion in a batch is not possession.
 *
 * Rule 10 (docs/contract-v2.md 3.1): given an address, only that contract, and only if it is
 * pinned; given none, every pinned main contract is tried. The transaction must make exactly
 * one call on all of VeilCore's pinned contracts together, an anchorBatch, and its state is read
 * by the decoder of the contract it called, with that contract's own verifier keys and key
 * states. The same root on two contracts is two dates; this never joins them. Off mainnet,
 * name the version (`contractVersion`) unless the address is on preprod's pinned list.
 */
export const checkBatchAnchor = async (
  o: ReadOptions & { readonly txId: string; readonly root: Uint8Array },
): Promise<Verdict & WhenLanded & WithAuthority & WithContract> => {
  if (!isNetwork(o.network)) throw new Error(`Unknown network ${String(o.network)}.`);
  const indexer = o.indexer ?? endpointsFor(o.network, {}, { blockfrostProjectId: o.blockfrostProjectId }).indexer;
  const candidates = batchCandidates(o, (address) =>
    assertSameNetwork(o, o.secondIndexer === undefined ? [indexer] : [indexer, o.secondIndexer], address),
  );
  // Each contract's own requirements, worked out before anything is read.
  const reqs = new Map(candidates.map((c) => [c.address, requirementsFor(o, 'veilcore', c)]));
  let found: Awaited<ReturnType<typeof singleCallStateAcross>>;
  try {
    found = await singleCallStateAcross(
      indexer,
      pinnedAddressesOn(o.network, candidates),
      candidates.map((c) => c.address),
      o.txId,
      ['anchorBatch'],
      candidates.length === 1
        ? 'That transaction is not a single anchorBatch call on this contract.'
        : 'That transaction is not a single anchorBatch call on one of VeilCore’s pinned contracts.',
      o.timeoutMs ?? 20_000,
      o.secondIndexer,
      (address) => {
        const r = reqs.get(address);
        if (r === undefined) throw new Error('Internal error: a call on a contract that was not asked about.');
        return { verifierKeys: r.verifierKeys, authorityCounter: r.authorityCounter, keyStates: r.keyStates };
      },
    );
  } catch (e) {
    const r = refusedState(e);
    if (r !== undefined) return r;
    throw e;
  }
  const contract = candidates.find((c) => c.address === found.address) as PinnedContract;
  const onChain = Buffer.from(BATCH_ROOT_READERS[contract.version](found.state)).toString('hex');
  const ok = onChain === Buffer.from(o.root).toString('hex');
  // Which contract gave the date is said in the reason once there is more than one it could be
  // (always for version 2), with version 2's key state ("one key, not yet handed to the
  // committee"). With version 1 alone, the reason reads as it always has.
  const several = o.network === 'mainnet' ? MAINNET_CONTRACTS.veilcore.length > 1 : contract.version !== 'v1';
  const named = several
    ? ` (${versionName(contract.version)}${contract.version !== 'v1' && found.keyState ? `; ${found.keyState.label}` : ''})`
    : '';
  return {
    accepted: ok,
    reason: ok
      ? `the root was timestamped${found.blockHeight === undefined ? '' : ` in block ${found.blockHeight}`}${found.blockTime === undefined ? '' : `, ${new Date(found.blockTime).toISOString()}`}${named}`
      : `that transaction timestamped a different root${named}`,
    blockHeight: found.blockHeight,
    blockTime: found.blockTime,
    authority: found.authority,
    contract: { ...contract, name: versionName(contract.version) },
    ...(found.keyState === undefined ? {} : { keyState: found.keyState.label }),
  };
};

/**
 * Read one claim by its transaction id from VeilCore's claims contract. Judge it with
 * verifyClaim, against the schema document from its publisher and the laboratory keys
 * you trust.
 */
export const readClaim = async (
  o: ReadOptions & { readonly txId: string },
): Promise<
  {
    readonly claim: Claim;
    readonly cells: ReturnType<typeof claimsLedger>;
    readonly entryPoint: string;
    readonly authority: AuthorityReport;
  } & WhenLanded
> => {
  const w = where(o, 'claims');
  v1Only(w, 'readClaim');
  // A state that is not the pinned build throws ContractStateMismatchError: nothing is read.
  const found = await singleCallState(
    w.indexer,
    w.address,
    o.txId,
    CLAIMS_PROVABLE_CIRCUITS,
    'That transaction is not a single claim on this claims contract.',
    o.timeoutMs,
    w.check,
  );
  const cells = claimsLedger(found.state.data);
  return {
    claim: claimFromCells(cells),
    cells,
    entryPoint: found.entryPoint,
    authority: found.authority,
    blockHeight: found.blockHeight,
    blockTime: found.blockTime,
  };
};

/**
 * The claims contract's maintenance authority now. `retired`: an empty committee, so
 * nobody can change its circuits. With `secondIndexer`, both indexers must agree on the
 * state. The verifier keys are not checked here: this reports the authority whatever the
 * circuits are.
 */
export const readClaimsAuthority = async (
  o: ReadOptions,
): Promise<{
  readonly retired: boolean;
  readonly keys: number;
  readonly threshold: number;
  readonly counter: bigint;
}> => {
  const w = where(o, 'claims', true);
  const a = (await agreedStateNow(o, w)).maintenanceAuthority;
  return { retired: isProvablyRetired(a), keys: a.committee.length, threshold: a.threshold, counter: a.counter };
};

/**
 * VeilCore's main contract's maintenance authority now: committee size, threshold and
 * counter. Every maintenance update raises the counter; compare it with the value the
 * latest deployment record revision gives. With `secondIndexer`, both indexers must agree
 * on the state. The verifier keys are not checked here: this reports the authority
 * whatever the circuits are.
 */
export const readAuthority = async (o: ReadOptions): Promise<AuthorityReport> => {
  const w = where(o, 'veilcore', true);
  return checkContractState(await agreedStateNow(o, w), {}).authority;
};
