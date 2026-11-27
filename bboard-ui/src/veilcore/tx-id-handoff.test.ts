// Which name of a transaction is passed on (chain/tx-hash.ts). The first real mainnet run
// (26 Nov 2026) proved a record by link and the answer never reached the checker: the page
// passed on the sponsor's 66-hex transaction IDENTIFIER where the 64-hex HASH is required, and
// the licence "issued" notice got the registry's 400 "txId must be 64 hex characters". These
// tests use ids in the real formats, so the two can't be mixed up again unnoticed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proveOwnershipOnChain, recoveryCommitmentOf } from './chain/actions';
import { contractStateAfter, standIns } from './chain/test-chain';
import { asTxHash, landedHash, txHashOf } from './chain/tx-hash';

// The proveOwnership hash from the mainnet run (block 3627363), and an identifier in Midnight's
// format: one leading byte, then 32 (66 hex characters).
const HASH = '44ddd2f262d019b146cc3e6ff98c0d3d8e1ca46be6e707dfaea82ca88f3d3f5e';
const IDENTIFIER = `00${'f1bdbc'.padEnd(58, '7')}cc73c3`;
const ID = `PR-${'AB'.repeat(16)}`;
const TOKEN = 'Abcdefghijklmnopqrstu_';
const RECORD = new Uint8Array(32).fill(0x5a);
const RECOVERY = new Uint8Array(32).fill(0xa5);

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

type Sent = { url: string; body: Record<string, unknown> };
let sent: Sent[] = [];
const registry = (status = 200, body: unknown = { ok: true }) =>
  vi.fn((url: string, init?: RequestInit) => {
    sent.push({ url, body: JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown> });
    return respond(status, body);
  });

/** An indexer that knows one transaction, by hash and identifiers. */
const indexer = (txs: { hash: string; identifiers: string[] }[]) =>
  vi.fn((_url: string, init?: RequestInit) => {
    const q = JSON.parse(init?.body as string) as { variables: { byId: { identifier: string } } };
    const id = q.variables.byId.identifier;
    return respond(200, { data: { transactions: txs.filter((t) => t.identifiers.includes(id)) } });
  });

beforeEach(() => {
  sent = [];
  vi.unstubAllGlobals();
});

it('the ids are in the formats the run saw', () => {
  expect(IDENTIFIER).toMatch(/^[0-9a-f]{66}$/);
  expect(HASH).toMatch(/^[0-9a-f]{64}$/);
});

describe('a receipt carries the hash as its txId', () => {
  it('proveOwnership: txId is the 64-hex hash, never the identifier the sponsor answered with', async () => {
    const r = standIns(
      contractStateAfter([{ secret: RECORD, circuit: 'anchor', args: [recoveryCommitmentOf(RECOVERY)] }]),
    );
    const receipt = await proveOwnershipOnChain(RECORD, 'c4'.repeat(32), { deps: r.deps });
    // What the sponsor answered: the sealed transaction's identifier, longer than a hash.
    expect(receipt.identifier).toMatch(/^[0-9a-f]+$/);
    expect(receipt.identifier?.length).toBeGreaterThan(64);
    // What is passed on: the hash the network reported.
    expect(receipt.txId).toBe('ab'.repeat(32));
    expect(receipt.txHash).toBe(receipt.txId);
    expect(receipt.txId).not.toBe(receipt.identifier);
  });

  it('the prove page’s path: that receipt’s txId is posted as it is, with no lookup', async () => {
    const r = standIns(
      contractStateAfter([{ secret: RECORD, circuit: 'anchor', args: [recoveryCommitmentOf(RECOVERY)] }]),
    );
    const receipt = await proveOwnershipOnChain(RECORD, 'c4'.repeat(32), { deps: r.deps });
    vi.stubGlobal('fetch', registry());
    const { answerProveRequest } = await import('./prove-relay');
    const hashOf = vi.fn();
    // Exactly what ProvePage.tsx and LicenseProof.tsx do after the proof lands.
    expect(await answerProveRequest(ID, receipt.txId, TOKEN, hashOf)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({ txId: 'ab'.repeat(32), token: TOKEN });
    expect(hashOf).not.toHaveBeenCalled();
  });

  it('a hash the network didn’t give in 64 hex is refused before anything is passed on', () => {
    expect(landedHash(`0x${HASH.toUpperCase()}`)).toBe(HASH);
    expect(() => landedHash(IDENTIFIER)).toThrow(/hash could not be read/);
    expect(() => landedHash('')).toThrow(/hash could not be read/);
  });
});

describe('anything posted to the registry is the hash', () => {
  it('a prove answer given an identifier (an older build’s, or typed) posts its hash', async () => {
    vi.stubGlobal('fetch', registry());
    const { answerProveRequest } = await import('./prove-relay');
    const hashOf = vi.fn(() => Promise.resolve(HASH));
    expect(await answerProveRequest(ID, IDENTIFIER, TOKEN, hashOf)).toEqual({ ok: true });
    expect(hashOf).toHaveBeenCalledWith(IDENTIFIER);
    expect(sent[0].body.txId).toBe(HASH);
  });

  it('when the identifier can’t be looked up, nothing is posted and it says why', async () => {
    vi.stubGlobal('fetch', registry());
    const { answerProveRequest } = await import('./prove-relay');
    const down = () => Promise.reject(new Error('could not reach the Midnight network’s indexer'));
    expect(await answerProveRequest(ID, IDENTIFIER, TOKEN, down)).toEqual({
      error: 'could not reach the Midnight network’s indexer',
    });
    expect(await answerProveRequest(ID, 'not hex', TOKEN)).toEqual({ error: 'that is not a transaction id' });
    expect(sent).toHaveLength(0);
  });

  it('the licence notices (issued, activated) post the hash, whichever name they were given', async () => {
    vi.stubGlobal('fetch', registry());
    const { postActivated, postIssued } = await import('./license-invites');
    const hashOf = vi.fn(() => Promise.resolve(HASH));
    await postIssued('LI-1', IDENTIFIER, 'tok', hashOf);
    await postActivated('LI-1', HASH, 'tok', hashOf);
    expect(sent.map((s) => [s.url.replace(/^.*\/license-invites\//, ''), s.body.txId])).toEqual([
      ['LI-1/issued', HASH],
      ['LI-1/activated', HASH],
    ]);
    expect(hashOf).toHaveBeenCalledTimes(1); // the hash needed no lookup
  });

  it('a notice whose identifier can’t be looked up is not posted, and says why', async () => {
    vi.stubGlobal('fetch', registry());
    const { postIssued } = await import('./license-invites');
    await expect(postIssued('LI-1', IDENTIFIER, 'tok', () => Promise.reject(new Error('no such')))).rejects.toThrow(
      'no such',
    );
    expect(sent).toHaveLength(0);
  });
});

describe('txHashOf: an identifier to its hash, on the indexer', () => {
  it('a hash comes back as it is, without asking anything', async () => {
    const f = indexer([]);
    expect(await txHashOf(`0x${HASH.toUpperCase()}`, { fetch: f as never, indexer: 'https://ix.test' })).toBe(HASH);
    expect(f).not.toHaveBeenCalled();
  });

  it('an identifier is asked for, and the one transaction that carries it gives its hash', async () => {
    const f = indexer([{ hash: HASH, identifiers: [IDENTIFIER] }]);
    expect(await txHashOf(IDENTIFIER, { fetch: f as never, indexer: 'https://ix.test' })).toBe(HASH);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('refuses no answer, an answer that doesn’t carry the identifier, and two different hashes', async () => {
    const deps = (txs: { hash: string; identifiers: string[] }[]) => ({
      fetch: indexer(txs) as never,
      indexer: 'https://ix.test',
    });
    await expect(txHashOf(IDENTIFIER, deps([]))).rejects.toThrow(/no such transaction/);
    const liar = vi.fn(() =>
      respond(200, { data: { transactions: [{ hash: HASH, identifiers: ['00'.repeat(33)] }] } }),
    );
    await expect(txHashOf(IDENTIFIER, { fetch: liar, indexer: 'https://ix.test' })).rejects.toThrow(
      /no such transaction/,
    );
    await expect(
      txHashOf(
        IDENTIFIER,
        deps([
          { hash: HASH, identifiers: [IDENTIFIER] },
          { hash: 'cd'.repeat(32), identifiers: [IDENTIFIER] },
        ]),
      ),
    ).rejects.toThrow(/more than one/);
    await expect(txHashOf('zz', deps([]))).rejects.toThrow(/not a transaction id/);
  });

  it('asTxHash takes only a 64-hex hash', () => {
    expect(asTxHash(HASH)).toBe(HASH);
    expect(asTxHash(IDENTIFIER)).toBeUndefined();
    expect(asTxHash(undefined)).toBeUndefined();
  });
});
