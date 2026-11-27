// PR #231, second review: a forged claim link whose transaction id the indexer can't parse must
// fail, never stay amber "couldn't read". Two layers, each tested on its own:
//   1. the link: a transaction is named by its hash only, 64 lowercase hex (tx-hash-rule.ts), so
//      such a link is refused as invalid before anything is asked;
//   2. the check: an indexer that says "invalid transaction hash/identifier" is a refusal, and one
//      that is up but refused the look-up is judged by missingFromChain, like "No such transaction".
// The indexer here behaves as midnight-indexer v4 does (indexer-api query.rs, transactions(offset:)):
// it hex-decodes the offset and needs 32 bytes for a hash, and answers a client error otherwise.
// The look-up runs through the real api/src/presentation-lookup.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkClaim, checkTwoClaim } from './claim-check';
import { checkLicense } from './license-check';
import { checkOwnership } from './ownership-check';
import { newChallenge } from './challenge-book';
import { NOT_FOUND_MARGIN_MS } from './anchor-check';
import { lookupFailureOf, lookupWords } from './read-failure';
import { worthRetrying } from '../prove-relay';
import { claimLink, isOldClaimLink, readClaimLink, type MadeClaim } from '../claim-link';
import { readTwoClaimLink, twoClaimLink, type TwoClaim } from '../two-record-claims';
import { isTxHash, namesIdentifier } from '../tx-hash-rule';
import { MATCH_SCHEMA } from '../marker-claims';

const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);
const CONTRACT = 'c1'.repeat(32);
const TIP = { height: 5_000_000, timestamp: NOW - 20_000 };
const BAD_IDS = ['ab', 'abc', 'f'.repeat(63), 'ab'.repeat(33), 'ab'.repeat(128)];
const ORIGIN = 'https://veilcore.org';
const hashOf = (link: string) => link.slice(link.indexOf('#'));

const honestIndexer = vi.fn((_u: unknown, init?: RequestInit) => {
  const body = JSON.parse(init?.body as string) as { query: string; variables?: { offset?: Record<string, string> } };
  const json = (o: unknown) => Promise.resolve(new Response(JSON.stringify(o), { status: 200 }));
  if (/VEILCORE_TIP/.test(body.query)) return json({ data: { block: TIP } });
  const off = body.variables?.offset ?? {};
  const hex = off.hash ?? off.identifier ?? '';
  const decodes = /^[0-9a-fA-F]*$/.test(hex) && hex.length % 2 === 0;
  if (off.identifier !== undefined && !decodes)
    return json({ data: null, errors: [{ message: 'invalid transaction identifier' }] });
  if (off.hash !== undefined && (!decodes || hex.length !== 64))
    return json({ data: null, errors: [{ message: 'invalid transaction hash' }] });
  return json({ data: { transactions: [] } });
});

beforeEach(() => vi.stubGlobal('fetch', honestIndexer));
afterEach(() => vi.unstubAllGlobals());

const range = (over: Partial<MadeClaim> = {}): MadeClaim => ({
  kind: 'range',
  contract: CONTRACT,
  txId: 'ab'.repeat(32),
  record: 'ee'.repeat(32),
  schema: 'veilcore/schema/potency/v1',
  slot: 0,
  op: 'at-most',
  bound: '300',
  ...over,
});

describe('layer 1: a claim link names its transaction by its hash only', () => {
  it('the rule: 64 lowercase hex, nothing else', () => {
    expect(isTxHash('ab'.repeat(32))).toBe(true);
    for (const id of [...BAD_IDS, 'AB'.repeat(32), `0x${'ab'.repeat(31)}`, undefined, 7])
      expect(isTxHash(id)).toBe(false);
  });

  it('a one-number claim link with any other id is refused as it is read, the further claims and the lab’s too', () => {
    expect(readClaimLink(hashOf(claimLink(range(), ORIGIN)))).toBeDefined();
    for (const id of BAD_IDS) {
      expect(readClaimLink(hashOf(claimLink(range({ txId: id }), ORIGIN))), id).toBeUndefined();
      const attested = range({ attested: { txId: id, attester: 'aa'.repeat(64) } });
      expect(readClaimLink(hashOf(claimLink(attested, ORIGIN))), `attested ${id}`).toBeUndefined();
    }
    // A further claim, on a lab's comparison schema.
    const marker = range({ schema: MATCH_SCHEMA, slot: 2, op: 'at-least', bound: '30' });
    expect(
      readClaimLink(
        hashOf(
          claimLink(
            { ...marker, more: [{ kind: 'range', txId: '02'.repeat(32), slot: 1, op: 'at-least', bound: '1' }] },
            ORIGIN,
          ),
        ),
      ),
    ).toBeDefined();
    const withMore = (id: string) =>
      readClaimLink(
        hashOf(
          claimLink({ ...marker, more: [{ kind: 'range', txId: id, slot: 1, op: 'at-least', bound: '1' }] }, ORIGIN),
        ),
      );
    for (const id of BAD_IDS) expect(withMore(id), `more ${id}`).toBeUndefined();
  });

  it('a two-record claim link with any other id is refused as it is read', () => {
    const two = {
      kind: 'distinct',
      contract: CONTRACT,
      record: 'ee'.repeat(32),
      other: 'dd'.repeat(32),
      schema: 'veilcore/schema/potency/v1',
    };
    for (const id of BAD_IDS)
      expect(
        readTwoClaimLink(hashOf(twoClaimLink({ ...two, txId: id } as unknown as TwoClaim, ORIGIN))),
        id,
      ).toBeUndefined();
  });

  it('an older link with the 66-hex identifier says so, a plain bad one doesn’t', () => {
    const old = hashOf(claimLink(range({ txId: 'ab'.repeat(33) }), ORIGIN));
    expect(isOldClaimLink(old)).toBe(true);
    expect(isOldClaimLink(hashOf(claimLink(range({ txId: 'ab' }), ORIGIN)))).toBe(false);
    expect(isOldClaimLink('#c=not-base64!')).toBe(false);
    expect(namesIdentifier({ attested: { txId: 'cd'.repeat(33) } })).toBe(true);
    expect(namesIdentifier({ more: [{ txId: 'cd'.repeat(33) }] })).toBe(true);
    expect(namesIdentifier({ txId: 'cd'.repeat(32) })).toBe(false);
  });
});

describe('layer 2: the check, for a claim that reaches it some other way', () => {
  it('the indexer saying the id is no transaction is a refusal, never "couldn’t reach"', () => {
    for (const m of ['invalid transaction hash', 'invalid transaction identifier']) {
      const e = new Error(`The indexer refused the query: ${m}`);
      expect(lookupFailureOf(e)).toBe('refused');
      expect(lookupWords(e)).toBe('That is not a transaction id.');
      expect(worthRetrying(lookupWords(e))).toBe(false);
    }
  });

  it('one-number claim: a made-up id fails with a current tip, whatever time or block it names', async () => {
    for (const id of BAD_IDS)
      for (const over of [{}, { blockTime: NOW - 365 * 24 * 3600_000 }, { blockHeight: 1 }]) {
        const v = await checkClaim(range({ txId: id, ...over }), { contract: CONTRACT, now: () => NOW });
        expect(v, `${id.length} ${JSON.stringify(over)}`).toEqual({
          ok: false,
          reason: 'That is not a transaction id.',
        });
      }
    // Control: a well-formed made-up hash fails as missing.
    expect(await checkClaim(range(), { contract: CONTRACT, now: () => NOW })).toEqual({
      ok: false,
      reason: 'Midnight has no such transaction.',
    });
  });

  it('two-record claim: the same', async () => {
    for (const id of BAD_IDS) {
      const v = await checkTwoClaim({ contract: CONTRACT, txId: id } as unknown as TwoClaim, {
        contract: CONTRACT,
        now: () => NOW,
      });
      expect(v, String(id.length)).toEqual({ ok: false, reason: 'That is not a transaction id.' });
    }
  });

  it('an indexer that is up but refused the look-up for another reason: judged by its latest block, not left amber', async () => {
    const refusing = (msg: string) =>
      vi.fn((_u: unknown, init?: RequestInit) => {
        const q = (JSON.parse(init?.body as string) as { query: string }).query;
        return Promise.resolve(
          new Response(
            JSON.stringify(
              /VEILCORE_TIP/.test(q) ? { data: { block: TIP } } : { data: null, errors: [{ message: msg }] },
            ),
          ),
        );
      });
    vi.stubGlobal('fetch', refusing('query too complex'));
    expect(await checkClaim(range(), { contract: CONTRACT, now: () => NOW })).toEqual({
      ok: false,
      reason: 'Midnight has no such transaction.',
    });
    // A claim made in the last hour may still wait.
    expect(
      await checkClaim(range({ blockTime: TIP.timestamp - 60_000 }), { contract: CONTRACT, now: () => NOW }),
    ).toMatchObject({ ok: false, unreadable: true });
  });

  it('a link’s time in seconds is read as seconds, so an honest recent claim isn’t failed early', async () => {
    const secs = Math.floor((TIP.timestamp - 60_000) / 1000);
    expect(await checkClaim(range({ blockTime: secs }), { contract: CONTRACT, now: () => NOW })).toMatchObject({
      ok: false,
      unreadable: true,
    });
    expect(
      await checkClaim(range({ blockTime: Math.floor((NOW - 2 * NOT_FOUND_MARGIN_MS) / 1000) }), {
        contract: CONTRACT,
        now: () => NOW,
      }),
    ).toEqual({ ok: false, reason: 'Midnight has no such transaction.' });
  });

  it('licence and “prove you hold it”: an id the indexer can’t parse is refused, not “try again”', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    const identity = 'ee'.repeat(32);
    const bad = () => Promise.reject(new Error('The indexer refused the query: invalid transaction hash'));
    const lic = await checkLicense(
      { txId: 'ab'.repeat(32), identity, challenge: newChallenge() },
      { presentation: bad },
    );
    expect(lic).toMatchObject({ accepted: false, reason: 'That is not a transaction id.' });
    const own = await checkOwnership(
      { txId: 'ab'.repeat(33), identity, challenge: newChallenge() },
      { stateAfter: bad, latest: bad },
    );
    expect(own).toMatchObject({ accepted: false, reason: 'That is not a transaction id.' });
    expect(worthRetrying(own.reason)).toBe(false);
  });
});

describe('the other refusals a state check gives are refusals', () => {
  it('“Refused: …”, a ContractStateMismatchError, and an attested claim with no laboratory key', () => {
    expect(
      lookupFailureOf(new Error("Refused: the contract's verifier keys at x are not the pinned build's (a).")),
    ).toBe('refused');
    const mismatch = new Error('something else');
    mismatch.name = 'ContractStateMismatchError';
    expect(lookupFailureOf(mismatch)).toBe('refused');
    expect(
      lookupFailureOf(new Error('An attested claim with no laboratory key: not a claim this contract writes.')),
    ).toBe('refused');
  });
});
