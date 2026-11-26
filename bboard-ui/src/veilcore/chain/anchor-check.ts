// The check page's own look at Midnight: was this batch root really written by the
// transaction VeilCore's registry names, and when (design.md, verifier rule 7).
//
// The registry's inclusion proof ends at a batch root and names a transaction. Until now the
// page took the registry's word for that transaction and its date. Here the browser asks a
// Midnight indexer itself:
//   1. the transaction, by the hash the registry recorded (or, for an older entry, by its
//      identifier): it must exist and have succeeded in full;
//   2. its calls on VeilCore's contracts, at the addresses this build pins (config.ts
//      ANCHOR_CONTRACTS, from deployments/mainnet.json; never the address the registry names):
//      exactly one across all of them, the claims contract included (config.ts
//      COUNTED_CONTRACTS), and it must be anchorBatch, the date stamp call, on a main
//      contract (docs/contract-v2.md 3.1, rule 10);
//   3. the contract state the network recorded right after that call: its lastBatchRoot cell
//      must be the root the inclusion proof folds to. The contract keeps only the latest
//      root, so the state after this one transaction is read, never the current state. The
//      state is read with the decoder of the pinned contract the call was on (anchor-decode.ts);
//   4. the block that transaction is in: its height and time are the date. An answer
//      without both is refused: it dates nothing.
// The same transaction listed twice with different contents is refused too.
// With a second indexer configured, both are asked and must give the same answer.
//
// Once more than one contract is pinned (or for any contract other than version 1), the
// maintenance authority in that same state (who can change the contract's circuits) is judged
// against the pinned entry's published key states, as the partner kit does on mainnet
// (docs/contract-v2.md 3.3, partner-kit/src/verify.ts checkBatchAnchor): a state in none of them
// is refused, and for version 2 the page says which one it was in ("one key, not yet handed to
// the committee", or "held by the 2-of-3 committee"). It comes from the state the network
// recorded, never from fields the contract keeps about itself. With version 1 alone (mainnet
// today) none of this runs and the page reads as it always has.
//
// What it shows: the root (and so every record in the batch) existed by that block. Not
// who wrote it: anchorBatch is open to anyone by design, and a batch says nothing about who
// holds a record.
//
// The indexer is still trusted for what it reports (one indexer can lie; two independent
// ones must both lie). A run that can't reach one says so, and the page then falls back to
// calling the date the registry's report.
//
// "Failed" is kept for what Midnight itself contradicts: a read that worked and says the
// registry is wrong (the transaction failed, it made no call or several on VeilCore's
// contracts, it isn't a date stamp, the state that was read holds another root, the keys were
// in no published state, or the network is past the anchor's block and has no such
// transaction). Everything else is "couldn't confirm", never a cross, and never kept for the
// visit (anchor-lookup.ts):
//   - unreadable: the indexer gave a state this build can't decode (a format Midnight brought in
//     after this build, a ledger package that won't load), or no state, or a block it can't read;
//   - not-yet: the transaction, or its block, isn't on the indexer yet, and the indexer's own
//     latest block isn't clearly past the block the registry reports for it;
//   - no-answer: the indexer didn't answer, timed out, or answered with an error;
//   - one-of-two: with two indexers, one confirmed it and the other couldn't answer or read it.
// "The two indexers disagree" is only for two answers that were both read and differ.
// SPDX-License-Identifier: Apache-2.0

import type { ContractVersion, PinnedContract } from './config';
import { type AuthorityReport, type KeyState, authorityReportOf, matchKeyState } from '../../../../api/src/key-states';

export type AnchorCheck =
  /** Every step above passed, on every configured indexer. */
  | {
      readonly status: 'checked';
      readonly txHash: string;
      /** Always there: an answer without its block's height and time is refused. */
      readonly blockHeight: number;
      /** Milliseconds since 1970, from the block. */
      readonly blockTime: number;
      /** How many independent indexers gave this same answer. */
      readonly indexers: number;
      /** The pinned contract the date came from (docs/contract-v2.md 3.1, rule 10.3). */
      readonly contract?: PinnedContract;
      /**
       * Whether the page names that contract with the date: once more than one is pinned, or
       * for any contract other than version 1. With version 1 alone, the line reads as before.
       */
      readonly nameContract?: boolean;
      /**
       * The published key state the contract's maintenance authority was in at that call
       * (docs/contract-v2.md 3.3), from the pinned entry. Only for a contract other than
       * version 1, and only once it is judged (see above): the page shows it beside the date.
       */
      readonly keyState?: KeyState;
    }
  /**
   * An indexer answered, it was read, and Midnight contradicts the registry's report.
   * `notFound`: only because the indexer, past the anchor's block, has no such transaction.
   */
  | { readonly status: 'failed'; readonly reason: string; readonly notFound?: true }
  /**
   * Couldn't confirm it, either way: see `why` (and the top of this file). Never a failure, and
   * never kept for the visit. `why` is absent only in values made before it was added.
   */
  | { readonly status: 'unreachable'; readonly reason: string; readonly why?: UnreachableWhy }
  /** This build doesn't read that network, or has nothing to read it with. */
  | { readonly status: 'not-checked'; readonly why: 'not-configured' | 'other-network'; readonly reason: string };

/** Why a check couldn't confirm the anchor (see the top of this file). */
export type UnreachableWhy = 'no-answer' | 'one-of-two' | 'unreadable' | 'not-yet';

export type AnchorCheckInput = {
  /** The network the registry says the root was anchored on. */
  readonly network: string;
  /** The transaction the registry names (its hash; an identifier is also looked up). */
  readonly txId: string;
  /** VeilCore's contracts on that network, as this build pins them (config.ts ANCHOR_CONTRACTS). */
  readonly contracts: readonly PinnedContract[];
  /**
   * Every pinned contract on that network whose calls count against "exactly one call", the
   * claims contract included (config.ts COUNTED_CONTRACTS). The main contracts are counted
   * whether or not they are listed here; only they can date a batch.
   */
  readonly counted: readonly string[];
  /** The batch root the inclusion proof folds to. */
  readonly expectedRoot: string;
  /**
   * The block height the registry reports for the anchor, and its time for it (ISO). Only used
   * to tell "not on the indexer yet" from "not on Midnight": a transaction the indexer doesn't
   * have counts as missing only once the indexer's latest block is clearly past these.
   */
  readonly reportedHeight?: number;
  readonly reportedAt?: string;
};

/**
 * How far past the registry's block (blocks, about 6 seconds each on Midnight) or its time the
 * indexer's latest block must be before a transaction it doesn't have counts as missing.
 */
export const NOT_FOUND_MARGIN_BLOCKS = 600;
export const NOT_FOUND_MARGIN_MS = 60 * 60 * 1000;

export type AnchorCheckDeps = {
  /** The network this build reads. Only that one is looked up. */
  readonly buildNetwork: string;
  /** Indexer GraphQL addresses, first one first (config.ts READ_INDEXERS). */
  readonly indexers: readonly string[];
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  /**
   * Reads lastBatchRoot from a state's hex, with the decoder of the contract version the call
   * was on (anchor-decode.ts); loaded on first use otherwise.
   */
  readonly rootOf?: (stateHex: string, version: ContractVersion) => string | Promise<string>;
  /**
   * Reads the maintenance authority from that same state, with the same version's decoder
   * (anchor-decode.ts); loaded on first use otherwise.
   */
  readonly authorityOf?: (stateHex: string, version: ContractVersion) => AuthorityLike | Promise<AuthorityLike>;
};

/** A state's maintenance authority, as the decoders read it (ContractState.maintenanceAuthority). */
type AuthorityLike = { readonly committee: readonly unknown[]; readonly threshold: number; readonly counter: bigint };

/** The entry point of the date stamp call (contract/src/veilcore.compact, anchorBatch). */
export const ANCHOR_ENTRY_POINT = 'anchorBatch';

// Both lookups in one request. The registry records the transaction's hash (the sponsor's
// anchorer and the operator tool write `hash`); an entry made by hand may hold one of its
// identifiers instead, so that is asked for too. Same fields as presentation-lookup.ts.
const TX_FIELDS = `hash
    block { height timestamp }
    ... on RegularTransaction {
      identifiers
      transactionResult { status }
      contractActions { address state ... on ContractCall { entryPoint } }
    }`;
// `tip` is the indexer's own latest block (a block with no offset), asked in the same request so
// a transaction it doesn't have can be told apart from one it hasn't reached yet.
export const ANCHOR_QUERY = `query VEILCORE_ANCHOR_CHECK($byHash: TransactionOffset!, $byId: TransactionOffset!) {
  byHash: transactions(offset: $byHash) {
    ${TX_FIELDS}
  }
  byId: transactions(offset: $byId) {
    ${TX_FIELDS}
  }
  tip: block {
    height
    timestamp
  }
}`;

type Action = { address?: unknown; state?: unknown; entryPoint?: unknown };
type Tx = {
  hash?: unknown;
  block?: { height?: unknown; timestamp?: unknown } | null;
  identifiers?: unknown;
  transactionResult?: { status?: unknown } | null;
  contractActions?: unknown;
};

const HEX64 = /^[0-9a-f]{64}$/;
const norm = (h: unknown): string => (typeof h === 'string' ? h.trim().toLowerCase().replace(/^0x/, '') : '');
const short = (h: string): string => `${h.slice(0, 12)}…`;
const utf8Hex = (s: string): string =>
  Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('');

/** The block's time in ms. The indexer gives ms; a value too small to be ms is read as seconds. */
export const blockTimeMs = (t: unknown): number | undefined => {
  if (typeof t !== 'number' || !Number.isFinite(t) || t <= 0) return undefined;
  return t < 1e12 ? t * 1000 : t;
};

/**
 * Whether an indexer's entry point is `anchorBatch`, exactly. Midnight operation names are
 * case-sensitive (presentation-lookup.ts matchEntryPoint); the indexer may give the name as
 * text or as the hex of its UTF-8 bytes, and only hex digits are case-insensitive.
 */
export const isAnchorEntry = (raw: unknown): boolean => {
  if (typeof raw !== 'string') return false;
  if (raw === ANCHOR_ENTRY_POINT) return true;
  const h = raw.replace(/^0x/i, '');
  return /^[0-9a-fA-F]+$/.test(h) && h.toLowerCase() === utf8Hex(ANCHOR_ENTRY_POINT);
};

/** One indexer's answer, judged on its own. */
type Answer =
  | {
      kind: 'ok';
      txHash: string;
      blockHeight: number;
      blockTime: number;
      root: string;
      address: string;
      /** Only when the key states were judged. */
      authority?: AuthorityReport;
      keyState?: KeyState;
    }
  | { kind: 'refused'; reason: string; notFound?: true }
  | { kind: 'unreachable'; reason: string; why: Exclude<UnreachableWhy, 'one-of-two'> };

/**
 * The ledger's tag at the start of a contract state's bytes (`midnight:contract-state[v8]:`),
 * read from the hex without loading a decoder; undefined when the bytes don't start with one.
 */
export const stateTagOf = (stateHex: string): string | undefined => {
  const head = stateHex.slice(0, 120);
  let text = '';
  for (let i = 0; i + 1 < head.length; i += 2) {
    const c = parseInt(head.slice(i, i + 2), 16);
    if (c < 0x20 || c > 0x7e) break;
    text += String.fromCharCode(c);
  }
  return /^midnight:contract-state\[v\d+\]:/.exec(text)?.[0];
};

/** The contract-state tags this build's decoders read (v1-decoder.ts STATE_TAGS; its test compares). */
export const KNOWN_STATE_TAGS: readonly string[] = ['midnight:contract-state[v6]:', 'midnight:contract-state[v8]:'];

/** Why a state couldn't be read, in a few words: its format is newer than this build, or it just didn't decode. */
const unreadableState = (stateHex: string): Extract<Answer, { kind: 'unreachable' }> => {
  const tag = stateTagOf(stateHex);
  return {
    kind: 'unreachable',
    why: 'unreadable',
    reason:
      tag !== undefined && !KNOWN_STATE_TAGS.includes(tag)
        ? `the contract state is in a format this page can’t read yet (${tag.slice(0, -1)})`
        : 'the contract state after that call couldn’t be read here',
  };
};

const heightOf = (h: unknown): number | undefined =>
  typeof h === 'number' && Number.isSafeInteger(h) && h >= 0 ? h : undefined;

/** JSON with object keys sorted, so two copies of one answer compare equal. */
const stableJson = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    typeof x === 'object' && x !== null && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : x,
  );

const asTxList = (v: unknown): Tx[] =>
  Array.isArray(v) ? v.filter((t): t is Tx => typeof t === 'object' && t !== null) : [];

const askOne = async (
  indexer: string,
  input: {
    txId: string;
    contracts: ReadonlyMap<string, ContractVersion>;
    counted: ReadonlySet<string>;
    root: string;
    /** Per main contract: the key states to judge its state against; absent when not judged. */
    judge: ReadonlyMap<string, readonly KeyState[]>;
    /** The registry's block and time for the anchor (AnchorCheckInput). */
    reportedHeight?: number;
    reportedAt?: string;
  },
  deps: AnchorCheckDeps,
  rootOf: (stateHex: string, version: ContractVersion) => Promise<string>,
  authorityOf: (stateHex: string, version: ContractVersion) => Promise<AuthorityLike>,
): Promise<Answer> => {
  let body: { data?: { byHash?: unknown; byId?: unknown; tip?: unknown } | null; errors?: unknown };
  try {
    const res = await (deps.fetch ?? fetch)(indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        query: ANCHOR_QUERY,
        variables: { byHash: { hash: input.txId }, byId: { identifier: input.txId } },
      }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 15_000),
    });
    if (!res.ok) return { kind: 'unreachable', why: 'no-answer', reason: `the indexer answered ${res.status}` };
    body = (await res.json()) as typeof body;
  } catch {
    return { kind: 'unreachable', why: 'no-answer', reason: 'the indexer did not answer' };
  }
  if (Array.isArray(body.errors) && body.errors.length > 0)
    return { kind: 'unreachable', why: 'no-answer', reason: 'the indexer could not answer the question' };
  if (typeof body.data !== 'object' || body.data === null)
    return { kind: 'unreachable', why: 'no-answer', reason: 'the indexer’s answer could not be read' };

  // Every transaction the indexer returned that really is this one. The same transaction
  // may come back twice (by hash and by identifier); that is fine only when both entries
  // say exactly the same. Two different entries for one hash are refused, never resolved
  // by keeping whichever came last.
  const found = new Map<string, Tx>();
  let conflicting = false;
  const add = (t: Tx) => {
    const h = norm(t.hash);
    const seen = found.get(h);
    if (seen !== undefined && stableJson(seen) !== stableJson(t)) conflicting = true;
    else found.set(h, t);
  };
  for (const t of asTxList(body.data.byHash)) if (norm(t.hash) === input.txId) add(t);
  for (const t of asTxList(body.data.byId)) {
    const ids = Array.isArray(t.identifiers) ? t.identifiers.map(norm) : [];
    if (ids.includes(input.txId) && HEX64.test(norm(t.hash))) add(t);
  }
  if (conflicting)
    return { kind: 'refused', reason: `the indexer gave two different answers for transaction ${short(input.txId)}` };
  if (found.size === 0) {
    // Missing only once the indexer is clearly past the block the registry reports; until then,
    // or with nothing to compare against, it may just not have reached it yet.
    const tip =
      typeof body.data.tip === 'object' && body.data.tip !== null ? (body.data.tip as Tx['block']) : undefined;
    const tipHeight = heightOf(tip?.height);
    const tipTime = blockTimeMs(tip?.timestamp);
    const reportedTime = input.reportedAt === undefined ? NaN : Date.parse(input.reportedAt);
    const past =
      (input.reportedHeight !== undefined &&
        tipHeight !== undefined &&
        tipHeight >= input.reportedHeight + NOT_FOUND_MARGIN_BLOCKS) ||
      (input.reportedHeight === undefined &&
        Number.isFinite(reportedTime) &&
        tipTime !== undefined &&
        tipTime >= reportedTime + NOT_FOUND_MARGIN_MS);
    return past
      ? { kind: 'refused', notFound: true, reason: `Midnight’s indexer has no transaction ${short(input.txId)}` }
      : {
          kind: 'unreachable',
          why: 'not-yet',
          reason: `Midnight’s indexer doesn’t have transaction ${short(input.txId)} yet`,
        };
  }
  if (found.size > 1) return { kind: 'refused', reason: `more than one transaction answers to ${short(input.txId)}` };
  const [[txHash, tx]] = [...found];

  if (tx.transactionResult?.status !== 'SUCCESS')
    return { kind: 'refused', reason: 'that transaction did not succeed on Midnight' };

  const actions = Array.isArray(tx.contractActions) ? (tx.contractActions as Action[]) : [];
  const calls = actions.filter((a) => typeof a === 'object' && a !== null && input.counted.has(norm(a.address)));
  if (calls.length === 0) return { kind: 'refused', reason: 'that transaction made no call on VeilCore’s contract' };
  // A call bundled with any other on the contract is refused outright, so the verdict never
  // depends on which point in the transaction the recorded state describes.
  if (calls.length > 1)
    return { kind: 'refused', reason: 'that transaction made more than one call on VeilCore’s contract' };
  if (!input.contracts.has(norm(calls[0].address)) || !isAnchorEntry(calls[0].entryPoint))
    return {
      kind: 'refused',
      reason: 'that transaction’s call on VeilCore’s contract is not a date stamp (anchorBatch)',
    };
  // Which pinned contract the call was on decides how its state is read.
  const version = input.contracts.get(norm(calls[0].address)) as ContractVersion;
  const stateHex = norm(calls[0].state);
  if (!/^[0-9a-f]+$/.test(stateHex) || stateHex.length % 2 !== 0)
    return { kind: 'unreachable', why: 'unreadable', reason: 'the indexer gave no contract state for that call' };

  // A state that won't decode says nothing about the record: Midnight re-expresses old states in
  // each new ledger's format, so a format newer than this build is the usual cause.
  let written: string;
  try {
    written = norm(await rootOf(stateHex, version));
  } catch {
    return unreadableState(stateHex);
  }
  if (!HEX64.test(written)) return unreadableState(stateHex);
  if (written !== input.root)
    return { kind: 'refused', reason: `that transaction wrote a different batch root (${short(written)})` };

  // Who could change the contract at that call, from the state itself, judged against the
  // pinned entry's published key states (docs/contract-v2.md 3.3).
  const keyStates = input.judge.get(norm(calls[0].address));
  let authority: AuthorityReport | undefined;
  let keyState: KeyState | undefined;
  if (keyStates !== undefined) {
    try {
      authority = authorityReportOf(await authorityOf(stateHex, version));
    } catch {
      return unreadableState(stateHex);
    }
    keyState = matchKeyState(keyStates, authority);
    if (keyState === undefined)
      return {
        kind: 'refused',
        reason:
          'the keys that can change VeilCore’s contract were, at that call, in none of the states VeilCore published for it',
      };
  }

  // The block is the date. An answer that doesn't say which block, or when, dates nothing; it
  // isn't a contradiction either: the indexer may not have put the transaction in a block yet.
  const blockHeight = heightOf(tx.block?.height);
  const blockTime = blockTimeMs(tx.block?.timestamp);
  if (blockHeight === undefined || blockTime === undefined)
    return {
      kind: 'unreachable',
      why: tx.block === null || tx.block === undefined ? 'not-yet' : 'unreadable',
      reason: 'the indexer didn’t say when: it gave no block height or time for that transaction',
    };
  return {
    kind: 'ok',
    txHash,
    blockHeight,
    blockTime,
    root: written,
    address: norm(calls[0].address),
    ...(authority === undefined ? {} : { authority }),
    ...(keyState === undefined ? {} : { keyState }),
  };
};

const defaultRootOf = async (stateHex: string, version: ContractVersion): Promise<string> =>
  (await import('./anchor-decode')).lastBatchRootOf(stateHex, version);

const defaultAuthorityOf = async (stateHex: string, version: ContractVersion): Promise<AuthorityLike> =>
  (await import('./anchor-decode')).maintenanceAuthorityOf(stateHex, version);

const sameAuthority = (a: AuthorityReport | undefined, b: AuthorityReport | undefined): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.committee === b.committee &&
    a.threshold === b.threshold &&
    a.counter === b.counter &&
    a.retired === b.retired);

/** Look the registry's anchor up on Midnight. Never throws. */
export const checkAnchorOnChain = async (input: AnchorCheckInput, deps: AnchorCheckDeps): Promise<AnchorCheck> => {
  const txId = norm(input.txId);
  const root = norm(input.expectedRoot);
  // Address to version; an entry that is not an address is left out.
  const contracts = new Map<string, ContractVersion>();
  for (const c of input.contracts) if (HEX64.test(norm(c.address))) contracts.set(norm(c.address), c.version);
  // Calls on any of these count against "exactly one call": the main contracts and every other
  // pinned contract on the network (rule 10.2).
  const counted = new Set<string>(contracts.keys());
  for (const a of input.counted) if (HEX64.test(norm(a))) counted.add(norm(a));
  if (input.network !== deps.buildNetwork)
    return {
      status: 'not-checked',
      why: 'other-network',
      reason: `the registry names the ${input.network} network, and this page reads only ${deps.buildNetwork}`,
    };
  if (contracts.size === 0 || deps.indexers.length === 0)
    return { status: 'not-checked', why: 'not-configured', reason: 'this page has no Midnight indexer to ask' };
  if (!HEX64.test(txId))
    return { status: 'failed', reason: 'the registry’s transaction reference is not a transaction id' };
  if (!HEX64.test(root)) return { status: 'failed', reason: 'the batch root is not 64 hexadecimal characters' };

  // The key states are judged once the date has to be named with its contract (more than one
  // pinned, or a contract other than version 1), for every pinned entry that lists them: as the
  // partner kit does on mainnet. With version 1 alone nothing changes.
  const several = contracts.size > 1;
  const judge = new Map<string, readonly KeyState[]>();
  for (const c of input.contracts) {
    const a = norm(c.address);
    if (contracts.get(a) === c.version && c.keyStates !== undefined && (several || c.version !== 'v1'))
      judge.set(a, c.keyStates);
  }

  const rootOf = async (s: string, v: ContractVersion) => (deps.rootOf ?? defaultRootOf)(s, v);
  const authorityOf = async (s: string, v: ContractVersion) => (deps.authorityOf ?? defaultAuthorityOf)(s, v);
  const answers = await Promise.all(
    deps.indexers.map((i) =>
      askOne(
        i,
        {
          txId,
          contracts,
          counted,
          root,
          judge,
          ...(heightOf(input.reportedHeight) === undefined ? {} : { reportedHeight: input.reportedHeight }),
          ...(input.reportedAt === undefined ? {} : { reportedAt: input.reportedAt }),
        },
        deps,
        rootOf,
        authorityOf,
      ),
    ),
  );

  const ok = answers.filter((a): a is Extract<Answer, { kind: 'ok' }> => a.kind === 'ok');
  const refused = answers.filter((a): a is Extract<Answer, { kind: 'refused' }> => a.kind === 'refused');
  const unread = answers.filter((a): a is Extract<Answer, { kind: 'unreachable' }> => a.kind === 'unreachable');
  // Two answers that were both read, and differ: one says the record checks out, the other
  // that Midnight contradicts it.
  if (refused.length > 0 && ok.length > 0)
    return { status: 'failed', reason: 'the two indexers disagree about that transaction' };
  // Midnight contradicts the registry, as read (the other indexer, if any, couldn't answer).
  // "Not found" is never kept for the visit (anchor-lookup.ts): an indexer can drop a block.
  if (refused.length > 0)
    return {
      status: 'failed',
      reason: refused[0].reason,
      ...(refused.every((r) => r.notFound) ? { notFound: true as const } : {}),
    };
  if (unread.length > 0) {
    if (ok.length > 0)
      return {
        status: 'unreachable',
        why: 'one-of-two',
        reason: `only one of the two indexers could confirm it, and both must (${unread[0].reason})`,
      };
    // Nothing confirmed or contradicted. The most telling reason first: a state that can't be
    // read, then a transaction not reached yet, then no answer at all.
    const first = unread.find((a) => a.why === 'unreadable') ?? unread.find((a) => a.why === 'not-yet') ?? unread[0];
    return { status: 'unreachable', why: first.why, reason: first.reason };
  }
  const [first, ...rest] = ok;
  const differs = rest.some(
    (a) =>
      a.txHash !== first.txHash ||
      a.blockHeight !== first.blockHeight ||
      a.blockTime !== first.blockTime ||
      a.root !== first.root ||
      a.address !== first.address ||
      !sameAuthority(a.authority, first.authority),
  );
  if (differs) return { status: 'failed', reason: 'the two indexers disagree about that transaction' };
  const version = contracts.get(first.address) as ContractVersion;
  return {
    status: 'checked',
    txHash: first.txHash,
    blockHeight: first.blockHeight,
    blockTime: first.blockTime,
    indexers: ok.length,
    contract: { version, address: first.address },
    nameContract: several || version !== 'v1',
    // Shown beside the date for version 2 only, as the kit does: version 1's states are its
    // deploy and its seal, and its line reads as before.
    ...(version !== 'v1' && first.keyState !== undefined ? { keyState: first.keyState } : {}),
  };
};
