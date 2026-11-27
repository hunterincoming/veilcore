// Telling "Midnight says no" from "couldn't read Midnight" when a look-up on Midnight throws
// (api/src/presentation-lookup.ts, used by the claim check, the licence check and the
// "prove you hold it" check), the same split anchor-check.ts makes for a record's date.
//
// Only the look-up's own verdicts count as "refused": it found the transaction, read it, and it
// isn't what the link says (it failed, it made no call or several, it is another kind of call,
// two indexers gave two answers). "No such transaction" is "not yet" until the indexer is
// clearly past the block the link names. Everything else (no answer, a timeout, an error from
// the indexer, a state this build can't decode, because Midnight changed its format or a ledger
// package won't load) is "couldn't read": never a failure, and worth trying again.
// SPDX-License-Identifier: Apache-2.0

import { blockTimeMs, missingFromChain } from './anchor-check';

export type LookupFailure = 'refused' | 'not-yet' | 'unreachable' | 'unreadable';

/** The look-up's verdicts (presentation-lookup.ts askIndexer, lookUp, singleCallState). */
const REFUSALS: readonly RegExp[] = [
  /^That transaction is not a single /,
  /^That transaction did not succeed\./,
  /^The indexer gave two different transactions for that hash\./,
  /^That is not a transaction id\./,
  /^The two indexers disagree about that transaction/,
  // What the state holds, read, and refused: never accepted, so never "try again".
  /^The contract's maintenance committee holds a key that is not a Schnorr key; refused\./,
  /^Those cells hold no claim/,
  /^An attested claim with no laboratory key/,
  // The state checks' own refusals (api/src/state-check.ts ContractStateMismatchError).
  /^Refused: /,
];

/**
 * The indexer itself says the id can't be any transaction (midnight-indexer `transactions(offset:)`:
 * a hash that isn't 32 bytes, an identifier that isn't hex). Never "couldn't reach": it answered.
 */
const NOT_A_TX = /^The indexer refused the query: invalid transaction (hash|identifier)/i;

/** The indexer answered but wouldn't run the look-up: up, so not "couldn't reach" once its tip is current. */
const QUERY_REFUSED = /^The indexer refused the query/;

/** The second indexer's own answer, inside the look-up's "does not confirm" (presentation-lookup.ts lookUp). */
const SECOND = /^The second indexer does not confirm that transaction \((.*)\)\. Refused\.$/s;

/** The network or the indexer didn't answer (presentation-lookup.ts, and the browser's own fetch errors). */
const UNREACHABLE: readonly RegExp[] = [
  /^The indexer answered \d+\./,
  /^The indexer refused the query/,
  /Failed to fetch|NetworkError|Load failed|timed? ?out|aborted/i,
];

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** What a check says for an id the indexer can't parse (app.err.chain.notTx). */
const NOT_A_TX_WORDS = 'That is not a transaction id.';

/** What kind of failure a look-up's error is. Anything not known to be a verdict is "couldn't read". */
export const lookupFailureOf = (e: unknown): LookupFailure => {
  const msg = messageOf(e);
  const name = e instanceof Error ? e.name : '';
  // The second indexer read it and says Midnight contradicts it: both read, and they differ.
  // Anything else from it (no answer, behind, couldn't decode) is "couldn't confirm".
  const second = SECOND.exec(msg);
  if (second) return lookupFailureOf(new Error(second[1])) === 'refused' ? 'refused' : 'unreachable';
  if (REFUSALS.some((r) => r.test(msg)) || NOT_A_TX.test(msg) || name === 'ContractStateMismatchError')
    return 'refused';
  if (/^No such transaction\b/.test(msg)) return 'not-yet';
  if (name === 'AbortError' || name === 'TimeoutError' || UNREACHABLE.some((r) => r.test(msg))) return 'unreachable';
  return 'unreadable';
};

/**
 * A look-up error as the reason a licence or "prove you hold it" check gives: a verdict as the
 * look-up said it, "No such transaction." as it is (prove-relay.ts notIndexedYet waits on it),
 * and anything else as "try again" (prove-relay.ts worthRetrying).
 */
export const lookupWords = (e: unknown): string => {
  const kind = lookupFailureOf(e);
  if (NOT_A_TX.test(messageOf(e))) return NOT_A_TX_WORDS;
  if (kind === 'refused' || kind === 'not-yet') return messageOf(e);
  return kind === 'unreachable'
    ? 'could not reach the Midnight network’s indexer; try again in a few minutes'
    : 'could not read that transaction from Midnight right now; try again in a few minutes';
};

/** The indexer's own latest block: its height and time (ms), or undefined when it can't be had. */
export type IndexerTip = { readonly height?: number; readonly time?: number } | undefined;

export const TIP_QUERY = 'query VEILCORE_TIP { block { height timestamp } }';

/** Ask an indexer for its latest block. Never throws. */
export const indexerTip = async (indexer: string, f: typeof fetch = fetch, timeoutMs = 15_000): Promise<IndexerTip> => {
  try {
    const res = await f(indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: TIP_QUERY }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { data?: { block?: { height?: unknown; timestamp?: unknown } | null } };
    const b = body.data?.block;
    if (!b) return undefined;
    const h = b.height;
    return {
      ...(typeof h === 'number' && Number.isSafeInteger(h) && h >= 0 ? { height: h } : {}),
      ...(blockTimeMs(b.timestamp) === undefined ? {} : { time: blockTimeMs(b.timestamp) }),
    };
  } catch {
    return undefined;
  }
};

/**
 * A look-up error, for a link whose own block and time say when its transaction landed (a claim
 * link anyone can write): `refused` for what Midnight contradicts, including a transaction the
 * indexer doesn't have once it is missing by anchor-check.ts missingFromChain (the link's block
 * and time can only make that sooner, never later); otherwise couldn't read.
 */
export const linkReadFailure = async (
  e: unknown,
  claimed: { readonly blockHeight?: number; readonly blockTime?: number },
  tip: () => Promise<IndexerTip>,
  now: number,
): Promise<{ refused: true; reason: string } | { refused: false; reason: string }> => {
  const msg = messageOf(e);
  if (NOT_A_TX.test(msg)) return { refused: true, reason: NOT_A_TX_WORDS };
  const kind = lookupFailureOf(e);
  if (kind === 'refused') return { refused: true, reason: msg };
  // Not found, or an indexer that answered but wouldn't run the look-up: judged by its own latest
  // block and the clock (missingFromChain), never left amber on the link's word. A link's time is
  // read in milliseconds, as the site writes it; one small enough to be seconds is read as seconds.
  if (
    (kind === 'not-yet' || QUERY_REFUSED.test(msg)) &&
    missingFromChain(await tip(), { height: claimed.blockHeight, time: blockTimeMs(claimed.blockTime) }, now)
  )
    return { refused: true, reason: 'Midnight has no such transaction.' };
  return { refused: false, reason: msg };
};
