// The check page's own lookup of a batch root's anchor (anchor-check.ts).
//
// The indexer answers here are built in the shape of Midnight's indexer v4 schema
// (@midnight-ntwrk/midnight-js-indexer-public-data-provider 4.1.1, dist/gen/graphql.d.ts:
// RegularTransaction, ContractCall, TransactionOffset). They are not captured from a live
// indexer: this machine can't reach one (Preview's host is blocked here, preprod and mainnet
// need a Blockfrost key). The contract states in them are real, though: the bytes the
// compiled VeilCore contract leaves after anchorBatch, made by running the circuit
// (fixtures/anchor-indexer.json; the first test checks they still are).
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/anchor-indexer.json';
import { ANCHOR_QUERY, checkAnchorOnChain, isAnchorEntry, type AnchorCheckDeps } from './anchor-check';
import { lastBatchRootOf } from './anchor-decode';
import { anchorContractFor, readIndexersFor } from './config';
import { contractStateAfter } from './test-chain';
import { queryProblem } from '../../../../sponsor/src/indexer-relay';
import { verifyInclusion } from 'veilcore-records';

const CONTRACT = 'a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347';
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const ID = '00'.repeat(2) + 'ab'.repeat(30);
const BLOCK_MS = Date.UTC(2026, 9, 11, 14, 3, 7);
const I1 = 'https://relay.example/indexer';
const I2 = 'https://second.example/graphql';

type Tx = Record<string, unknown>;
const anchorTx = (over: Tx = {}): Tx => ({
  hash: TX,
  block: { height: 2973563, timestamp: BLOCK_MS },
  identifiers: [ID],
  transactionResult: { status: 'SUCCESS' },
  contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' }],
  ...over,
});

type Reply = { byHash?: readonly Tx[]; byId?: readonly Tx[] } | Error | number | { errors: { message: string }[] };
const indexer = (replies: Record<string, Reply>) => {
  const asked: { url: string; body: { query: string; variables: Record<string, unknown> } }[] = [];
  const f = ((input: string, init?: RequestInit) => {
    const url = input;
    asked.push({ url, body: JSON.parse(init?.body as string) as never });
    const r = replies[url];
    if (r === undefined || r instanceof Error) return Promise.reject(r ?? new TypeError('Failed to fetch'));
    if (typeof r === 'number') return Promise.resolve(new Response('{}', { status: r }));
    if ('errors' in r) return Promise.resolve(new Response(JSON.stringify(r)));
    return Promise.resolve(new Response(JSON.stringify({ data: { byHash: r.byHash ?? [], byId: r.byId ?? [] } })));
  }) as typeof fetch;
  return { fetch: f, asked };
};

const input = { network: 'mainnet', txId: TX, contractAddress: CONTRACT, expectedRoot: fixture.root };
const deps = (replies: Record<string, Reply>, indexers = [I1]): AnchorCheckDeps & { asked: unknown[] } => {
  const i = indexer(replies);
  return { buildNetwork: 'mainnet', indexers, fetch: i.fetch, asked: i.asked };
};

describe('the fixture', () => {
  it('is what the compiled contract leaves after anchorBatch, and its proof folds to that root', async () => {
    const fresh = contractStateAfter([
      {
        secret: new Uint8Array(32).fill(1),
        circuit: 'anchorBatch',
        args: [Uint8Array.from(Buffer.from(fixture.root, 'hex'))],
      },
    ]);
    expect(Buffer.from(fresh.serialize()).toString('hex')).toBe(fixture.stateHex);
    expect(lastBatchRootOf(fixture.stateHex)).toBe(fixture.root);
    expect(lastBatchRootOf(fixture.otherStateHex)).toBe(fixture.otherRoot);
    expect(await verifyInclusion(fixture.proof)).toBe(true);
    expect(fixture.proof.root).toBe(fixture.root);
  });
});

describe('checkAnchorOnChain', () => {
  it('confirms the root, by the transaction hash the registry records, with the block’s height and time', async () => {
    const d = deps({ [I1]: { byHash: [anchorTx()] } });
    expect(await checkAnchorOnChain(input, d)).toEqual({
      status: 'checked',
      txHash: TX,
      blockHeight: 2973563,
      blockTime: BLOCK_MS,
      indexers: 1,
    });
    // One request, asking by hash and by identifier, that the relay passes on.
    expect(d.asked).toHaveLength(1);
    const { body } = d.asked[0] as { body: { query: string; variables: unknown } };
    expect(body.query).toBe(ANCHOR_QUERY);
    expect(body.variables).toEqual({ byHash: { hash: TX }, byId: { identifier: TX } });
    expect(queryProblem(body)).toBeUndefined();
  });

  it('finds an entry made with one of the transaction’s identifiers, and reports its hash', async () => {
    const d = deps({ [I1]: { byId: [anchorTx()] } });
    expect(await checkAnchorOnChain({ ...input, txId: ID.toUpperCase() }, d)).toMatchObject({
      status: 'checked',
      txHash: TX,
    });
  });

  it('reads a block time given in seconds as seconds', async () => {
    const d = deps({ [I1]: { byHash: [anchorTx({ block: { height: 7, timestamp: BLOCK_MS / 1000 } })] } });
    expect(await checkAnchorOnChain(input, d)).toMatchObject({
      status: 'checked',
      blockTime: BLOCK_MS,
      blockHeight: 7,
    });
  });

  it('fails when that transaction wrote a different root', async () => {
    const tx = anchorTx({
      contractActions: [{ address: CONTRACT, state: fixture.otherStateHex, entryPoint: 'anchorBatch' }],
    });
    const v = await checkAnchorOnChain(input, deps({ [I1]: { byHash: [tx] } }));
    expect(v).toEqual({
      status: 'failed',
      reason: `that transaction wrote a different batch root (${fixture.otherRoot.slice(0, 12)}…)`,
    });
  });

  it.each([
    ['no such transaction', { byHash: [] }, /has no transaction e13c88f5a2fb/],
    [
      'a transaction that failed',
      { byHash: [anchorTx({ transactionResult: { status: 'FAILURE' } })] },
      /did not succeed/,
    ],
    [
      'one that only partly succeeded',
      { byHash: [anchorTx({ transactionResult: { status: 'PARTIAL_SUCCESS' } })] },
      /did not succeed/,
    ],
    [
      'a call on another contract (a look-alike)',
      {
        byHash: [
          anchorTx({
            contractActions: [{ address: 'ee'.repeat(32), state: fixture.stateHex, entryPoint: 'anchorBatch' }],
          }),
        ],
      },
      /no call on VeilCore’s contract/,
    ],
    [
      'another circuit',
      {
        byHash: [
          anchorTx({ contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'proveOwnership' }] }),
        ],
      },
      /not a date stamp/,
    ],
    [
      'the name in another case (a different operation on Midnight)',
      {
        byHash: [
          anchorTx({ contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'AnchorBatch' }] }),
        ],
      },
      /not a date stamp/,
    ],
    [
      'two calls bundled together',
      {
        byHash: [
          anchorTx({
            contractActions: [
              { address: CONTRACT, state: fixture.otherStateHex, entryPoint: 'anchorBatch' },
              { address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' },
            ],
          }),
        ],
      },
      /more than one call/,
    ],
    [
      'a state that is not VeilCore’s',
      {
        byHash: [anchorTx({ contractActions: [{ address: CONTRACT, state: 'deadbeef', entryPoint: 'anchorBatch' }] })],
      },
      /could not be read/,
    ],
    ['an answer about some other transaction', { byHash: [anchorTx({ hash: 'ff'.repeat(32) })] }, /has no transaction/],
  ] as const)('fails on %s', async (_name, reply, reason) => {
    const v = await checkAnchorOnChain(input, deps({ [I1]: reply }));
    expect(v.status).toBe('failed');
    expect((v as { reason: string }).reason).toMatch(reason);
  });

  it('accepts the entry point given as the hex of its name', () => {
    expect(isAnchorEntry(Buffer.from('anchorBatch').toString('hex').toUpperCase())).toBe(true);
    expect(isAnchorEntry(Buffer.from('anchor').toString('hex'))).toBe(false);
  });

  it.each([
    ['the network is down', new TypeError('Failed to fetch')],
    ['the relay answers 502', 502],
    ['the relay is rate-limited', 429],
    ['the indexer refuses the query', { errors: [{ message: 'nope' }] }],
  ] as const)('says it could not reach an indexer when %s', async (_n, reply) => {
    expect((await checkAnchorOnChain(input, deps({ [I1]: reply as Reply }))).status).toBe('unreachable');
  });

  it('with two indexers: both must answer, and the same', async () => {
    const both = await checkAnchorOnChain(
      input,
      deps({ [I1]: { byHash: [anchorTx()] }, [I2]: { byHash: [anchorTx()] } }, [I1, I2]),
    );
    expect(both).toMatchObject({ status: 'checked', indexers: 2 });

    const later = anchorTx({ block: { height: 2973563, timestamp: BLOCK_MS + 60_000 } });
    expect(
      await checkAnchorOnChain(input, deps({ [I1]: { byHash: [anchorTx()] }, [I2]: { byHash: [later] } }, [I1, I2])),
    ).toEqual({ status: 'failed', reason: 'the two indexers disagree about that transaction' });

    const lies = anchorTx({
      contractActions: [{ address: CONTRACT, state: fixture.otherStateHex, entryPoint: 'anchorBatch' }],
    });
    expect(
      await checkAnchorOnChain(input, deps({ [I1]: { byHash: [anchorTx()] }, [I2]: { byHash: [lies] } }, [I1, I2])),
    ).toEqual({ status: 'failed', reason: 'the two indexers disagree about that transaction' });

    expect(await checkAnchorOnChain(input, deps({ [I1]: { byHash: [anchorTx()] }, [I2]: 503 }, [I1, I2]))).toEqual({
      status: 'unreachable',
      reason: 'only one of the two indexers answered, and both must',
    });
  });

  it('does not look up another network, and says when it has nothing to ask', async () => {
    const d = deps({ [I1]: { byHash: [anchorTx()] } });
    expect(await checkAnchorOnChain({ ...input, network: 'preview' }, d)).toMatchObject({
      status: 'not-checked',
      why: 'other-network',
    });
    expect(await checkAnchorOnChain({ ...input, contractAddress: undefined }, d)).toMatchObject({
      status: 'not-checked',
      why: 'not-configured',
    });
    expect(await checkAnchorOnChain(input, { ...d, indexers: [] })).toMatchObject({ why: 'not-configured' });
    expect(d.asked).toHaveLength(0);
  });

  it('refuses a malformed transaction reference or root before asking anything', async () => {
    const d = deps({});
    expect(await checkAnchorOnChain({ ...input, txId: 'abc' }, d)).toMatchObject({ status: 'failed' });
    expect(await checkAnchorOnChain({ ...input, expectedRoot: 'zz' }, d)).toMatchObject({ status: 'failed' });
    expect(d.asked).toHaveLength(0);
  });

  it('checks against the contract it is given, never one the answer names', async () => {
    const v = await checkAnchorOnChain(
      { ...input, contractAddress: 'ee'.repeat(32) },
      deps({ [I1]: { byHash: [anchorTx()] } }),
    );
    expect(v).toMatchObject({ status: 'failed', reason: 'that transaction made no call on VeilCore’s contract' });
  });
});

describe('which indexers and contract the page uses', () => {
  it('mainnet reads only through the relay named for it, never a leftover test indexer', () => {
    expect(readIndexersFor('mainnet', { indexer: 'https://sponsor.test/indexer' })).toEqual([]);
    expect(readIndexersFor('mainnet', { relay: I1, indexer: 'https://sponsor.test/indexer' })).toEqual([I1]);
    expect(readIndexersFor('mainnet', { relay: I1, second: I2 })).toEqual([I1, I2]);
    expect(readIndexersFor('mainnet', { relay: I1, second: I1 })).toEqual([I1]);
  });

  it('a test network falls back to the indexer its chain features use', () => {
    expect(readIndexersFor('preprod', { indexer: 'https://sponsor.test/indexer' })).toEqual([
      'https://sponsor.test/indexer',
    ]);
  });

  it('never puts a key in the page, and never reads over plain http except on this computer', () => {
    expect(
      readIndexersFor('mainnet', { relay: 'https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetX123' }),
    ).toEqual([]);
    expect(readIndexersFor('mainnet', { relay: 'http://relay.example/indexer' })).toEqual([]);
    expect(readIndexersFor('mainnet', { relay: 'http://127.0.0.1:8080/indexer' })).toEqual([
      'http://127.0.0.1:8080/indexer',
    ]);
    expect(readIndexersFor('mainnet', { relay: I1, second: 'https://x.example/?api_key=k' })).toEqual([I1]);
  });

  it('the contract: mainnet’s pinned address, else the test build’s demo contract', () => {
    expect(anchorContractFor('mainnet', CONTRACT.toUpperCase(), 'c0'.repeat(32))).toBe(CONTRACT);
    expect(anchorContractFor('mainnet', '', 'c0'.repeat(32))).toBeUndefined();
    expect(anchorContractFor('preprod', CONTRACT, 'c0'.repeat(32))).toBe('c0'.repeat(32));
  });
});
