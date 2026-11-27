// "Midnight says no" against "couldn't read Midnight" for the claim, licence and "prove you hold
// it" checks (read-failure.ts; foundation review, 26 Nov 2026, items 1 and 5).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexerTip, lookupFailureOf, lookupWords, TIP_QUERY } from './read-failure';
import { NOT_FOUND_MARGIN_BLOCKS, NOT_FOUND_MARGIN_MS } from './anchor-check';
import { checkClaim, checkTwoClaim } from './claim-check';
import type { TwoClaim } from '../two-record-claims';
import { checkLicense } from './license-check';
import { checkAnchor, checkOwnership } from './ownership-check';
import { newChallenge } from './challenge-book';
import { notIndexedYet, worthRetrying } from '../prove-relay';
import type { MadeClaim } from '../claim-link';
import { queryProblem } from '../../../../sponsor/src/indexer-relay';

/** What the look-up and the ledger packages throw today, by kind. */
const DECODE = [
  new Error('Not a contract state from ledger 8 or ledger 9.'),
  new Error("Unsupported contract state version 'midnight:contract-state[v99]'"),
  new Error('A contract state is hex.'),
  new RangeError('WebAssembly.Memory(): could not allocate memory'),
];
const UNREACHABLE = [
  new TypeError('Failed to fetch'),
  new DOMException('The operation timed out.', 'TimeoutError'),
  new DOMException('This operation was aborted', 'AbortError'),
  new Error('The indexer answered 502.'),
  new Error('The indexer refused the query: too complex'),
  new Error('The second indexer does not confirm that transaction (No such transaction.). Refused.'),
];
// The browser's clock, and an indexer that is behind it (its latest block a month old).
const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);
const BEHIND = NOW - 30 * 24 * 3600_000;
const REFUSED = [
  new Error('That transaction is not a single licence presentation on this contract.'),
  new Error('That transaction is not a single claim on VeilCore’s claims contract.'),
  new Error('That transaction did not succeed.'),
  new Error('The indexer gave two different transactions for that hash. Refused.'),
  new Error('That is not a transaction id.'),
  new Error('The two indexers disagree about that transaction (the block). Refused.'),
];

describe('lookupFailureOf', () => {
  it('only the look-up’s own verdicts are a refusal; anything else is “couldn’t read”', () => {
    for (const e of REFUSED) expect(lookupFailureOf(e), e.message).toBe('refused');
    for (const e of UNREACHABLE) expect(lookupFailureOf(e), e.message).toBe('unreachable');
    for (const e of DECODE) expect(lookupFailureOf(e), e.message).toBe('unreadable');
    // What a state holds, read and refused: a verdict, never "try again".
    for (const m of [
      "The contract's maintenance committee holds a key that is not a Schnorr key; refused.",
      'Those cells hold no claim (no claim has been made).',
    ])
      expect(lookupFailureOf(new Error(m)), m).toBe('refused');
    // The second indexer: refused only when it read the transaction and Midnight contradicts it.
    const second = (inner: string) =>
      new Error(`The second indexer does not confirm that transaction (${inner}). Refused.`);
    expect(lookupFailureOf(second('That transaction did not succeed.'))).toBe('refused');
    expect(lookupFailureOf(second('No such transaction.'))).toBe('unreachable');
    expect(lookupFailureOf(second('The indexer answered 502.'))).toBe('unreachable');
    expect(lookupFailureOf(second('Not a contract state from ledger 8 or ledger 9.'))).toBe('unreachable');
    expect(lookupFailureOf(new Error('No such transaction.'))).toBe('not-yet');
    expect(lookupFailureOf('something nobody planned for')).toBe('unreadable');
  });

  it('a licence or “prove you hold it” check retries what it couldn’t read, and refuses only a verdict', () => {
    for (const e of [...DECODE, ...UNREACHABLE]) expect(worthRetrying(lookupWords(e)), e.message).toBe(true);
    for (const e of REFUSED) expect(lookupWords(e)).toBe(e.message);
    for (const e of REFUSED) expect(worthRetrying(lookupWords(e)), e.message).toBe(false);
    expect(notIndexedYet(lookupWords(new Error('No such transaction.')))).toBe(true);
  });
});

describe('indexerTip', () => {
  it('asks the indexer for its latest block, which the relay passes on; never throws', async () => {
    const asked: string[] = [];
    const ok = ((_u: string, init?: RequestInit) => {
      asked.push(init?.body as string);
      return Promise.resolve(
        new Response(JSON.stringify({ data: { block: { height: 9, timestamp: 1_700_000_000 } } })),
      );
    }) as typeof fetch;
    expect(await indexerTip('https://i.example', ok)).toEqual({ height: 9, time: 1_700_000_000_000 });
    expect(JSON.parse(asked[0])).toEqual({ query: TIP_QUERY });
    expect(queryProblem(JSON.parse(asked[0]))).toBeUndefined();
    const down = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    expect(await indexerTip('https://i.example', down)).toBeUndefined();
    const bad = (() => Promise.resolve(new Response('{}', { status: 502 }))) as typeof fetch;
    expect(await indexerTip('https://i.example', bad)).toBeUndefined();
  });
});

describe('the claim check', () => {
  const CONTRACT = 'c1'.repeat(32);
  const link = { contract: CONTRACT, txId: 'ab'.repeat(32), blockHeight: 500 } as unknown as MadeClaim;
  const failing = (e: unknown) => ({
    contract: CONTRACT,
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- some cases are a DOMException or a string, as a browser throws them
    read: () => Promise.reject(e),
  });

  it('a claim whose state can’t be decoded, or an indexer that didn’t answer: couldn’t read, never failed', async () => {
    for (const e of [...DECODE, ...UNREACHABLE]) {
      const v = await checkClaim(link, failing(e));
      expect(v, e.message).toEqual({ ok: false, reason: e.message, unreadable: true });
    }
  });

  it('what Midnight contradicts fails', async () => {
    for (const e of REFUSED) expect(await checkClaim(link, failing(e))).toEqual({ ok: false, reason: e.message });
  });

  it('a transaction the indexer doesn’t have: not yet only while the indexer is behind the link’s block', async () => {
    const missing = new Error('No such transaction.');
    const at = (tip: unknown) => ({ ...failing(missing), tip: () => Promise.resolve(tip as never), now: () => NOW });
    for (const tip of [undefined, { height: 500 }, { height: 500 + NOT_FOUND_MARGIN_BLOCKS - 1, time: BEHIND }])
      expect(await checkClaim(link, at(tip))).toMatchObject({ ok: false, unreadable: true });
    expect(await checkClaim(link, at({ height: 500 + NOT_FOUND_MARGIN_BLOCKS }))).toEqual({
      ok: false,
      reason: 'Midnight has no such transaction.',
    });
  });

  // PR #231 review: anyone can write a claim link, its block and time included. A made-up
  // transaction must fail, never read as "couldn't read it", whatever the link names.
  describe('a forged claim link with a made-up transaction fails', () => {
    const missing = new Error('No such transaction.');
    const TIP = { height: 5_000_000, time: NOW - 20_000 };
    const forged = (over: object, tip: object = TIP) =>
      checkClaim({ contract: CONTRACT, txId: 'ab'.repeat(32), ...over } as unknown as MadeClaim, {
        ...failing(missing),
        tip: () => Promise.resolve(tip),
        now: () => NOW,
      });
    const no = { ok: false, reason: 'Midnight has no such transaction.' };

    it('with no block and no time', async () => expect(await forged({})).toEqual(no));
    it('with a huge block', async () => {
      expect(await forged({ blockHeight: Number.MAX_SAFE_INTEGER })).toEqual(no);
    });
    it('with a huge block beside an old time', async () => {
      expect(await forged({ blockHeight: Number.MAX_SAFE_INTEGER, blockTime: NOW - 2 * NOT_FOUND_MARGIN_MS })).toEqual(
        no,
      );
    });
    it('with a time in the future, even when the indexer is behind', async () => {
      expect(await forged({ blockTime: NOW + 24 * 3600_000 }, { height: 10, time: BEHIND })).toEqual(no);
    });
    it('only a time within the last hour may wait', async () => {
      expect(await forged({ blockTime: TIP.time - 60_000 })).toMatchObject({ unreadable: true });
    });
    it('a claim about two records, the same', async () => {
      const two = (over: object) =>
        checkTwoClaim({ contract: CONTRACT, txId: 'ab'.repeat(32), ...over } as unknown as TwoClaim, {
          ...failing(missing),
          tip: () => Promise.resolve(TIP),
          now: () => NOW,
        });
      expect(await two({})).toEqual(no);
      expect(await two({ blockHeight: Number.MAX_SAFE_INTEGER })).toEqual(no);
      expect(await two({ blockTime: TIP.time - 60_000 })).toMatchObject({ unreadable: true });
      for (const e of DECODE)
        expect(
          await checkTwoClaim({ contract: CONTRACT, txId: 'ab'.repeat(32) } as unknown as TwoClaim, failing(e)),
          e.message,
        ).toEqual({ ok: false, reason: e.message, unreadable: true });
      for (const e of REFUSED)
        expect(
          await checkTwoClaim({ contract: CONTRACT, txId: 'ab'.repeat(32) } as unknown as TwoClaim, failing(e)),
        ).toEqual({ ok: false, reason: e.message });
    });
  });
});

describe('the licence and “prove you hold it” checks', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  const identity = 'ee'.repeat(32);
  const txId = 'ab'.repeat(32);

  it('a state that won’t decode is “try again”, never a refusal of the answer', async () => {
    for (const e of DECODE) {
      const lic = await checkLicense(
        { txId, identity, challenge: newChallenge() },
        { presentation: () => Promise.reject(e) },
      );
      expect(lic.accepted).toBe(false);
      expect(worthRetrying(lic.reason), e.message).toBe(true);
      const own = await checkOwnership(
        { txId, identity, challenge: newChallenge() },
        { stateAfter: () => Promise.reject(e), latest: () => Promise.reject(e) },
      );
      expect(worthRetrying(own.reason), e.message).toBe(true);
    }
  });

  it('the anchor line: “couldn’t confirm” only for a verdict, nothing when it couldn’t be read', async () => {
    for (const e of [...DECODE, ...UNREACHABLE])
      expect(await checkAnchor(txId, identity, { stateAfter: () => Promise.reject(e) }), e.message).toBeUndefined();
    for (const e of REFUSED)
      expect(await checkAnchor(txId, identity, { stateAfter: () => Promise.reject(e) }), e.message).toBe(false);
  });
});
