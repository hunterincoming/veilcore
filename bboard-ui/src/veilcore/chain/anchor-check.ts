// The check page's own look at Midnight: was this batch root really written by the
// transaction VeilCore's registry names, and when (design.md, verifier rule 7).
//
// The registry's inclusion proof ends at a batch root and names a transaction. Until now the
// page took the registry's word for that transaction and its date. Here the browser asks a
// Midnight indexer itself:
//   1. the transaction, by the hash the registry recorded (or, for an older entry, by its
//      identifier): it must exist and have succeeded in full;
//   2. its calls on VeilCore's contract, at the address this build pins (never the address
//      the registry names): exactly one, and it must be anchorBatch, the date stamp call;
//   3. the contract state the network recorded right after that call: its lastBatchRoot cell
//      must be the root the inclusion proof folds to. The contract keeps only the latest
//      root, so the state after this one transaction is read, never the current state;
//   4. the block that transaction is in: its height and time are the date.
// With a second indexer configured, both are asked and must give the same answer.
//
// What it shows: the root (and so every record in the batch) existed by that block. Not
// who wrote it: anchorBatch is open to anyone by design, and a batch says nothing about who
// holds a record.
//
// The indexer is still trusted for what it reports (one indexer can lie; two independent
// ones must both lie). A run that can't reach one says so, and the page then falls back to
// calling the date the registry's report.
// SPDX-License-Identifier: Apache-2.0

export type AnchorCheck =
  /** Every step above passed, on every configured indexer. */
  | {
      readonly status: 'checked';
      readonly txHash: string;
      readonly blockHeight?: number;
      /** Milliseconds since 1970, from the block. */
      readonly blockTime?: number;
      /** How many independent indexers gave this same answer. */
      readonly indexers: number;
    }
  /** An indexer answered, and its answer does not bear out the registry's report. */
  | { readonly status: 'failed'; readonly reason: string }
  /** No answer to judge: no indexer reached, or only one of two. */
  | { readonly status: 'unreachable'; readonly reason: string }
  /** This build doesn't read that network, or has nothing to read it with. */
  | { readonly status: 'not-checked'; readonly why: 'not-configured' | 'other-network'; readonly reason: string };

export type AnchorCheckInput = {
  /** The network the registry says the root was anchored on. */
  readonly network: string;
  /** The transaction the registry names (its hash; an identifier is also looked up). */
  readonly txId: string;
  /** VeilCore's contract on that network, as this build pins it. */
  readonly contractAddress: string | undefined;
  /** The batch root the inclusion proof folds to. */
  readonly expectedRoot: string;
};

export type AnchorCheckDeps = {
  /** The network this build reads. Only that one is looked up. */
  readonly buildNetwork: string;
  /** Indexer GraphQL addresses, first one first (config.ts READ_INDEXERS). */
  readonly indexers: readonly string[];
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  /** Reads lastBatchRoot from a state's hex (anchor-decode.ts); loaded on first use otherwise. */
  readonly rootOf?: (stateHex: string) => string | Promise<string>;
};

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
export const ANCHOR_QUERY = `query VEILCORE_ANCHOR_CHECK($byHash: TransactionOffset!, $byId: TransactionOffset!) {
  byHash: transactions(offset: $byHash) {
    ${TX_FIELDS}
  }
  byId: transactions(offset: $byId) {
    ${TX_FIELDS}
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
  | { kind: 'ok'; txHash: string; blockHeight?: number; blockTime?: number; root: string }
  | { kind: 'refused'; reason: string }
  | { kind: 'unreachable'; reason: string };

const asTxList = (v: unknown): Tx[] =>
  Array.isArray(v) ? v.filter((t): t is Tx => typeof t === 'object' && t !== null) : [];

const askOne = async (
  indexer: string,
  input: { txId: string; contract: string; root: string },
  deps: AnchorCheckDeps,
  rootOf: (stateHex: string) => Promise<string>,
): Promise<Answer> => {
  let body: { data?: { byHash?: unknown; byId?: unknown } | null; errors?: unknown };
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
    if (!res.ok) return { kind: 'unreachable', reason: `the indexer answered ${res.status}` };
    body = (await res.json()) as typeof body;
  } catch {
    return { kind: 'unreachable', reason: 'the indexer did not answer' };
  }
  if (Array.isArray(body.errors) && body.errors.length > 0)
    return { kind: 'unreachable', reason: 'the indexer could not answer the question' };
  if (typeof body.data !== 'object' || body.data === null)
    return { kind: 'unreachable', reason: 'the indexer’s answer could not be read' };

  // Every transaction the indexer returned that really is this one.
  const found = new Map<string, Tx>();
  for (const t of asTxList(body.data.byHash)) if (norm(t.hash) === input.txId) found.set(norm(t.hash), t);
  for (const t of asTxList(body.data.byId)) {
    const ids = Array.isArray(t.identifiers) ? t.identifiers.map(norm) : [];
    if (ids.includes(input.txId) && HEX64.test(norm(t.hash))) found.set(norm(t.hash), t);
  }
  if (found.size === 0)
    return { kind: 'refused', reason: `Midnight’s indexer has no transaction ${short(input.txId)}` };
  if (found.size > 1) return { kind: 'refused', reason: `more than one transaction answers to ${short(input.txId)}` };
  const [[txHash, tx]] = [...found];

  if (tx.transactionResult?.status !== 'SUCCESS')
    return { kind: 'refused', reason: 'that transaction did not succeed on Midnight' };

  const actions = Array.isArray(tx.contractActions) ? (tx.contractActions as Action[]) : [];
  const calls = actions.filter((a) => typeof a === 'object' && a !== null && norm(a.address) === input.contract);
  if (calls.length === 0) return { kind: 'refused', reason: 'that transaction made no call on VeilCore’s contract' };
  // A call bundled with any other on the contract is refused outright, so the verdict never
  // depends on which point in the transaction the recorded state describes.
  if (calls.length > 1)
    return { kind: 'refused', reason: 'that transaction made more than one call on VeilCore’s contract' };
  if (!isAnchorEntry(calls[0].entryPoint))
    return {
      kind: 'refused',
      reason: 'that transaction’s call on VeilCore’s contract is not a date stamp (anchorBatch)',
    };
  const stateHex = norm(calls[0].state);
  if (!/^[0-9a-f]+$/.test(stateHex) || stateHex.length % 2 !== 0)
    return { kind: 'refused', reason: 'the indexer gave no contract state for that call' };

  let written: string;
  try {
    written = norm(await rootOf(stateHex));
  } catch {
    return { kind: 'refused', reason: 'the contract state after that call could not be read as VeilCore’s' };
  }
  if (written !== input.root)
    return { kind: 'refused', reason: `that transaction wrote a different batch root (${short(written)})` };

  const h = tx.block?.height;
  return {
    kind: 'ok',
    txHash,
    blockHeight: typeof h === 'number' && Number.isSafeInteger(h) && h >= 0 ? h : undefined,
    blockTime: blockTimeMs(tx.block?.timestamp),
    root: written,
  };
};

const defaultRootOf = async (stateHex: string): Promise<string> =>
  (await import('./anchor-decode')).lastBatchRootOf(stateHex);

/** Look the registry's anchor up on Midnight. Never throws. */
export const checkAnchorOnChain = async (input: AnchorCheckInput, deps: AnchorCheckDeps): Promise<AnchorCheck> => {
  const txId = norm(input.txId);
  const root = norm(input.expectedRoot);
  const contract = norm(input.contractAddress);
  if (input.network !== deps.buildNetwork)
    return {
      status: 'not-checked',
      why: 'other-network',
      reason: `the registry names the ${input.network} network, and this page reads only ${deps.buildNetwork}`,
    };
  if (!HEX64.test(contract) || deps.indexers.length === 0)
    return { status: 'not-checked', why: 'not-configured', reason: 'this page has no Midnight indexer to ask' };
  if (!HEX64.test(txId))
    return { status: 'failed', reason: 'the registry’s transaction reference is not a transaction id' };
  if (!HEX64.test(root)) return { status: 'failed', reason: 'the batch root is not 64 hexadecimal characters' };

  const rootOf = async (s: string) => (deps.rootOf ?? defaultRootOf)(s);
  const answers = await Promise.all(deps.indexers.map((i) => askOne(i, { txId, contract, root }, deps, rootOf)));

  const ok = answers.filter((a): a is Extract<Answer, { kind: 'ok' }> => a.kind === 'ok');
  const refused = answers.filter((a): a is Extract<Answer, { kind: 'refused' }> => a.kind === 'refused');
  if (refused.length > 0)
    return {
      status: 'failed',
      reason: ok.length > 0 ? 'the two indexers disagree about that transaction' : refused[0].reason,
    };
  if (ok.length < answers.length)
    return {
      status: 'unreachable',
      reason:
        answers.length > 1 && ok.length > 0
          ? 'only one of the two indexers answered, and both must'
          : (answers.find((a) => a.kind === 'unreachable') as { reason: string }).reason,
    };
  const [first, ...rest] = ok;
  const differs = rest.some(
    (a) =>
      a.txHash !== first.txHash ||
      a.blockHeight !== first.blockHeight ||
      a.blockTime !== first.blockTime ||
      a.root !== first.root,
  );
  if (differs) return { status: 'failed', reason: 'the two indexers disagree about that transaction' };
  return {
    status: 'checked',
    txHash: first.txHash,
    blockHeight: first.blockHeight,
    blockTime: first.blockTime,
    indexers: ok.length,
  };
};
