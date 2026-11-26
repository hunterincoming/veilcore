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
import {
  ANCHOR_QUERY,
  KNOWN_STATE_TAGS,
  NOT_FOUND_MARGIN_BLOCKS,
  NOT_FOUND_MARGIN_MS,
  checkAnchorOnChain,
  isAnchorEntry,
  stateTagOf,
  type AnchorCheckDeps,
} from './anchor-check';
import { forgetAnchorLookups, lookUpAnchor } from './anchor-lookup';
import { stateLedgerOf } from './v1-decoder';
import { lastBatchRootOf } from './anchor-decode';
import {
  anchorContractFor,
  anchorContractsFor,
  carriesKey,
  countedContractsFor,
  readIndexersFor,
  readsThroughRelay,
  sameIndexer,
} from './config';
import { contractStateAfter } from './test-chain';
import { MAINNET_PINNED, PREPROD_PINNED } from '../../../../api/src/pinned-contracts';
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

type Reply =
  | { byHash?: readonly Tx[]; byId?: readonly Tx[]; tip?: { height?: unknown; timestamp?: unknown } | null }
  | Error
  | number
  | { errors: { message: string }[] };
const indexer = (replies: Record<string, Reply>) => {
  const asked: { url: string; body: { query: string; variables: Record<string, unknown> } }[] = [];
  const f = ((input: string, init?: RequestInit) => {
    const url = input;
    asked.push({ url, body: JSON.parse(init?.body as string) as never });
    const r = replies[url];
    if (r === undefined || r instanceof Error) return Promise.reject(r ?? new TypeError('Failed to fetch'));
    if (typeof r === 'number') return Promise.resolve(new Response('{}', { status: r }));
    if ('errors' in r) return Promise.resolve(new Response(JSON.stringify(r)));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: { byHash: r.byHash ?? [], byId: r.byId ?? [], ...('tip' in r ? { tip: r.tip } : {}) },
        }),
      ),
    );
  }) as typeof fetch;
  return { fetch: f, asked };
};

const input = {
  network: 'mainnet',
  txId: TX,
  contracts: [{ version: 'v1', address: CONTRACT }] as const,
  counted: [] as readonly string[],
  expectedRoot: fixture.root,
};
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
    expect(lastBatchRootOf(fixture.stateHex, 'v1')).toBe(fixture.root);
    expect(lastBatchRootOf(fixture.otherStateHex, 'v1')).toBe(fixture.otherRoot);
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
      // The contract it came from; with version 1 alone the page doesn't name it.
      contract: { version: 'v1', address: CONTRACT },
      nameContract: false,
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
  ] as const)('fails on %s', async (_name, reply, reason) => {
    const v = await checkAnchorOnChain(input, deps({ [I1]: reply }));
    expect(v.status).toBe('failed');
    expect((v as { reason: string }).reason).toMatch(reason);
  });

  it('the same transaction twice: fine when both entries agree, refused when they differ', async () => {
    // By hash and by identifier, identical (keys in another order): one answer.
    const same = anchorTx({ identifiers: [TX] });
    const reordered = Object.fromEntries(Object.entries(anchorTx({ identifiers: [TX] })).reverse());
    expect(await checkAnchorOnChain(input, deps({ [I1]: { byHash: [same], byId: [reordered] } }))).toMatchObject({
      status: 'checked',
    });
    // Two entries for one hash that say different things: never "keep the last one".
    for (const other of [
      anchorTx({ contractActions: [{ address: CONTRACT, state: fixture.otherStateHex, entryPoint: 'anchorBatch' }] }),
      anchorTx({ block: { height: 1, timestamp: BLOCK_MS } }),
    ]) {
      for (const reply of [
        { byHash: [anchorTx(), other] },
        { byHash: [other, anchorTx()] },
        { byHash: [anchorTx()], byId: [{ ...other, identifiers: [TX] }] },
      ]) {
        const v = await checkAnchorOnChain(input, deps({ [I1]: reply }));
        expect(v).toEqual({
          status: 'failed',
          reason: 'the indexer gave two different answers for transaction e13c88f5a2fb…',
        });
      }
    }
  });

  it('a "checked" answer must say when: with no block height or time it is never checked, and never failed', async () => {
    for (const [block, why] of [
      [null, 'not-yet'],
      [undefined, 'not-yet'],
      [{ height: 7 }, 'unreadable'],
      [{ timestamp: BLOCK_MS }, 'unreadable'],
      [{ height: -1, timestamp: BLOCK_MS }, 'unreadable'],
      [{ height: 7, timestamp: 0 }, 'unreadable'],
    ] as const) {
      const v = await checkAnchorOnChain(input, deps({ [I1]: { byHash: [anchorTx({ block })] } }));
      expect(v.status, JSON.stringify(block)).toBe('unreachable');
      expect(v).toMatchObject({ why });
      expect((v as { reason: string }).reason).toMatch(/^the indexer didn’t say when/);
    }
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
    expect(await checkAnchorOnChain(input, deps({ [I1]: reply as Reply }))).toMatchObject({
      status: 'unreachable',
      why: 'no-answer',
    });
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
      why: 'one-of-two',
      reason: 'only one of the two indexers could confirm it, and both must (the indexer answered 503)',
    });
  });

  // Foundation review, 26 Nov 2026 (items 1 and 5): "couldn't read Midnight" is never "Midnight
  // says no". A state in a format this build can't decode (the next ledger fork), a transaction
  // the indexer hasn't reached, an indexer that times out: none of these is a cross.
  describe('couldn’t read it is not failed', () => {
    const tagHex = (t: string) => Buffer.from(t, 'utf8').toString('hex');
    const tag = stateTagOf(fixture.stateHex) ?? '';
    const future = tagHex('midnight:contract-state[v99]:') + fixture.stateHex.slice(tagHex(tag).length);
    const withState = (state: string) =>
      anchorTx({ contractActions: [{ address: CONTRACT, state, entryPoint: 'anchorBatch' }] });

    it('reads the format tag from the bytes, and knows the two this build decodes', () => {
      expect(KNOWN_STATE_TAGS).toContain(tag);
      expect(stateTagOf(future)).toBe('midnight:contract-state[v99]:');
      expect(stateTagOf('deadbeef')).toBeUndefined();
      // The same two tags v1-decoder.ts reads, and no others.
      for (const t of KNOWN_STATE_TAGS) expect(stateLedgerOf(Buffer.from(`${t}x`, 'utf8'))).toBeDefined();
      expect(stateLedgerOf(Buffer.from('midnight:contract-state[v99]:x', 'utf8'))).toBeUndefined();
    });

    it('a state in a format newer than this build: couldn’t read, never failed', async () => {
      const v = await checkAnchorOnChain(input, deps({ [I1]: { byHash: [withState(future)] } }));
      expect(v).toEqual({
        status: 'unreachable',
        why: 'unreadable',
        reason: 'the contract state is in a format this page can’t read yet (midnight:contract-state[v99])',
      });
    });

    it('a decoder that throws (a ledger package that won’t load): couldn’t read', async () => {
      const d = {
        ...deps({ [I1]: { byHash: [anchorTx()] } }),
        rootOf: () => {
          throw new Error('WebAssembly.instantiate(): out of memory');
        },
      };
      expect(await checkAnchorOnChain(input, d)).toEqual({
        status: 'unreachable',
        why: 'unreadable',
        reason: 'the contract state after that call couldn’t be read here',
      });
    });

    it('a state that won’t decode, or none at all: couldn’t read', async () => {
      for (const state of ['deadbeef', '', 'zz', undefined]) {
        const v = await checkAnchorOnChain(input, deps({ [I1]: { byHash: [withState(state as string)] } }));
        expect(v, String(state)).toMatchObject({ status: 'unreachable', why: 'unreadable' });
      }
    });

    it('a maintenance authority that won’t decode: couldn’t read', async () => {
      const two = {
        ...input,
        contracts: [
          { version: 'v1', address: CONTRACT, keyStates: [] as never },
          { version: 'v2', address: 'ee'.repeat(32) },
        ] as const,
      };
      const d = {
        ...deps({ [I1]: { byHash: [anchorTx()] } }),
        authorityOf: () => {
          throw new Error('Not a ledger 9 contract state');
        },
      };
      expect(await checkAnchorOnChain(two, d)).toMatchObject({ status: 'unreachable', why: 'unreadable' });
    });

    it('a transaction the indexer doesn’t have: not yet, until its latest block is clearly past the registry’s', async () => {
      const H = 2973563;
      const at = new Date(BLOCK_MS).toISOString();
      const notYet = { status: 'unreachable', why: 'not-yet' };
      const missing = {
        status: 'failed',
        notFound: true,
        reason: 'Midnight’s indexer has no transaction e13c88f5a2fb…',
      };
      const ask = (tip: unknown, more: { reportedHeight?: number; reportedAt?: string } = {}) =>
        checkAnchorOnChain(
          { ...input, ...more },
          deps({ [I1]: { byHash: [], ...(tip === undefined ? {} : { tip: tip as never }) } }),
        );
      // No tip in the answer, or one that can't be read: can't tell.
      expect(await ask(undefined, { reportedHeight: H })).toMatchObject(notYet);
      expect(await ask(null, { reportedHeight: H })).toMatchObject(notYet);
      expect(await ask({ height: 'x' }, { reportedHeight: H })).toMatchObject(notYet);
      // Behind, level, or only a little past the registry's block.
      for (const height of [H - 10, H, H + NOT_FOUND_MARGIN_BLOCKS - 1])
        expect(await ask({ height, timestamp: BLOCK_MS }, { reportedHeight: H }), String(height)).toMatchObject(notYet);
      // Clearly past it: Midnight has no such transaction.
      expect(await ask({ height: H + NOT_FOUND_MARGIN_BLOCKS, timestamp: BLOCK_MS }, { reportedHeight: H })).toEqual(
        missing,
      );
      // With no block from the registry, its time: an hour past it.
      expect(await ask({ height: 1, timestamp: BLOCK_MS + 60_000 }, { reportedAt: at })).toMatchObject(notYet);
      expect(await ask({ height: 1, timestamp: BLOCK_MS + NOT_FOUND_MARGIN_MS }, { reportedAt: at })).toEqual(missing);
      // Nothing from the registry to compare against: never "missing".
      expect(await ask({ height: H + 10 ** 6, timestamp: BLOCK_MS * 2 })).toMatchObject(notYet);
      // An answer about some other transaction is the same as none.
      const other = await checkAnchorOnChain(
        { ...input, reportedHeight: H },
        deps({ [I1]: { byHash: [anchorTx({ hash: 'ff'.repeat(32) })], tip: { height: H + 5 } } }),
      );
      expect(other).toMatchObject(notYet);
    });

    it('an indexer that times out: couldn’t reach it', async () => {
      const hang = ((_u: string, init?: RequestInit) =>
        new Promise<Response>((_ok, no) =>
          init?.signal?.addEventListener('abort', () =>
            no(new DOMException('The operation timed out.', 'TimeoutError')),
          ),
        )) as typeof fetch;
      const v = await checkAnchorOnChain(input, {
        buildNetwork: 'mainnet',
        indexers: [I1],
        fetch: hang,
        timeoutMs: 20,
      });
      expect(v).toEqual({ status: 'unreachable', why: 'no-answer', reason: 'the indexer did not answer' });
    });

    it('two indexers: one behind or unreadable is “couldn’t confirm”, never “disagree”', async () => {
      const two = (a: Reply, b: Reply) =>
        checkAnchorOnChain({ ...input, reportedHeight: 2973563 }, deps({ [I1]: a, [I2]: b }, [I1, I2]));
      const lagging = { byHash: [], tip: { height: 2973000 } };
      // Both behind.
      expect(await two(lagging, lagging)).toMatchObject({ status: 'unreachable', why: 'not-yet' });
      // One confirms, the other is behind, or can't read the state, or hasn't put it in a block.
      for (const other of [lagging, { byHash: [withState(future)] }, { byHash: [anchorTx({ block: null })] }]) {
        const v = await two({ byHash: [anchorTx()] }, other);
        expect(v, JSON.stringify(other).slice(0, 60)).toMatchObject({ status: 'unreachable', why: 'one-of-two' });
        expect(await two(other, { byHash: [anchorTx()] })).toMatchObject({ status: 'unreachable', why: 'one-of-two' });
      }
      // One can't read it, the other is behind: the unreadable state is said first.
      expect(await two(lagging, { byHash: [withState(future)] })).toMatchObject({ why: 'unreadable' });
      // One says Midnight contradicts it, the other couldn't answer: failed on what was read.
      const failedTx = { byHash: [anchorTx({ transactionResult: { status: 'FAILURE' } })] };
      expect(await two(failedTx, 503)).toEqual({
        status: 'failed',
        reason: 'that transaction did not succeed on Midnight',
      });
      // Both read, and they differ: that is "disagree".
      expect(await two({ byHash: [anchorTx()] }, failedTx)).toEqual({
        status: 'failed',
        reason: 'the two indexers disagree about that transaction',
      });
    });

    it('a genuine contradiction, read from a state that decoded, stays failed', async () => {
      const v = await checkAnchorOnChain(input, deps({ [I1]: { byHash: [withState(fixture.otherStateHex)] } }));
      expect(v).toMatchObject({ status: 'failed' });
      expect((v as { notFound?: true }).notFound).toBeUndefined();
    });

    it('the query asks for the indexer’s latest block, and the relay still passes it on', async () => {
      const d = deps({ [I1]: { byHash: [anchorTx()] } });
      await checkAnchorOnChain(input, d);
      const { body } = d.asked[0] as { body: { query: string } };
      expect(body.query).toMatch(/tip: block \{\s*height\s*timestamp\s*\}/);
      expect(queryProblem(body)).toBeUndefined();
    });
  });

  describe('what is kept for the visit (anchor-lookup.ts)', () => {
    const proofWith = (anchor: Record<string, unknown>) =>
      ({ root: fixture.root, anchor: { chain: 'midnight', network: 'mainnet', txHash: TX, ...anchor } }) as never;
    const PIN = [{ version: 'v1', address: CONTRACT }] as const;
    const count = (replies: Record<string, Reply>) => {
      forgetAnchorLookups();
      const d = deps(replies);
      return { d, twice: async (p: never) => [await lookUpAnchor(p, d, PIN, []), await lookUpAnchor(p, d, PIN, [])] };
    };

    it('never keeps “couldn’t read”: the next look asks again', async () => {
      const tag = stateTagOf(fixture.stateHex) ?? '';
      const future =
        Buffer.from('midnight:contract-state[v99]:').toString('hex') +
        fixture.stateHex.slice(Buffer.from(tag).toString('hex').length);
      const { d, twice } = count({
        [I1]: {
          byHash: [anchorTx({ contractActions: [{ address: CONTRACT, state: future, entryPoint: 'anchorBatch' }] })],
        },
      });
      const [a, b] = await twice(proofWith({}));
      expect(a).toMatchObject({ status: 'unreachable', why: 'unreadable' });
      expect(b).toMatchObject({ status: 'unreachable', why: 'unreadable' });
      expect(d.asked).toHaveLength(2);
    });

    it('never keeps “not yet”, nor “missing” (an indexer can drop a block)', async () => {
      for (const tip of [{ height: 1 }, { height: 10 ** 7 }]) {
        const { d, twice } = count({ [I1]: { byHash: [], tip } });
        const [a] = await twice(proofWith({ blockHeight: 100 }));
        expect(a?.status).toBe(tip.height === 1 ? 'unreachable' : 'failed');
        expect(d.asked).toHaveLength(2);
      }
    });

    it('keeps a contradiction that was read, and a confirmed date', async () => {
      for (const state of [fixture.otherStateHex, fixture.stateHex]) {
        const { d, twice } = count({
          [I1]: { byHash: [anchorTx({ contractActions: [{ address: CONTRACT, state, entryPoint: 'anchorBatch' }] })] },
        });
        await twice(proofWith({}));
        expect(d.asked).toHaveLength(1);
      }
    });

    it('passes the registry’s block and time on to the check', async () => {
      const { d } = count({ [I1]: { byHash: [], tip: { height: 100 + NOT_FOUND_MARGIN_BLOCKS } } });
      expect(await lookUpAnchor(proofWith({ blockHeight: 100 }), d, PIN, [])).toMatchObject({ status: 'failed' });
      forgetAnchorLookups();
      expect(
        await lookUpAnchor(
          proofWith({ anchoredAt: new Date(BLOCK_MS).toISOString() }),
          deps({ [I1]: { byHash: [], tip: { height: 1, timestamp: BLOCK_MS + NOT_FOUND_MARGIN_MS } } }),
          PIN,
          [],
        ),
      ).toMatchObject({ status: 'failed', notFound: true });
    });
  });

  it('does not look up another network, and says when it has nothing to ask', async () => {
    const d = deps({ [I1]: { byHash: [anchorTx()] } });
    expect(await checkAnchorOnChain({ ...input, network: 'preview' }, d)).toMatchObject({
      status: 'not-checked',
      why: 'other-network',
    });
    expect(await checkAnchorOnChain({ ...input, contracts: [] }, d)).toMatchObject({
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
      { ...input, contracts: [{ version: 'v1', address: 'ee'.repeat(32) }] },
      deps({ [I1]: { byHash: [anchorTx()] } }),
    );
    expect(v).toMatchObject({ status: 'failed', reason: 'that transaction made no call on VeilCore’s contract' });
  });

  // Rule 10.2 (docs/contract-v2.md 3.1): a call on the pinned claims contract counts against
  // "exactly one call", as the partner kit counts it (partner-kit/test/two-contracts.test.ts,
  // "a call on the claims contract counts too"). Only a main contract's call can date a batch.
  describe('a call on the pinned claims contract counts too', () => {
    const CLAIMS = MAINNET_PINNED.find((e) => e.kind === 'claims')?.address ?? '';
    const onMainnet = { ...input, counted: countedContractsFor('mainnet', input.contracts) };
    const proveRange = { address: CLAIMS, state: fixture.otherStateHex, entryPoint: 'proveRange' };

    it('the counted list is every contract pinned on mainnet, claims included', () => {
      expect(CLAIMS).toMatch(/^[0-9a-f]{64}$/);
      expect([...countedContractsFor('mainnet', input.contracts)].sort()).toEqual(
        MAINNET_PINNED.map((e) => e.address).sort(),
      );
      expect(countedContractsFor('mainnet', [])).toEqual([]);
    });

    it('anchorBatch on the main contract plus proveRange on the claims contract: refused', async () => {
      const tx = anchorTx({
        contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' }, proveRange],
      });
      expect(await checkAnchorOnChain(onMainnet, deps({ [I1]: { byHash: [tx] } }))).toEqual({
        status: 'failed',
        reason: 'that transaction made more than one call on VeilCore’s contract',
      });
      // The claims address in another form is the same contract.
      const upper = anchorTx({
        contractActions: [
          { address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' },
          { ...proveRange, address: `0x${CLAIMS.toUpperCase()}` },
        ],
      });
      expect(await checkAnchorOnChain(onMainnet, deps({ [I1]: { byHash: [upper] } }))).toMatchObject({
        status: 'failed',
      });
    });

    it('a call on the claims contract alone dates nothing', async () => {
      const tx = anchorTx({ contractActions: [{ ...proveRange, entryPoint: 'anchorBatch' }] });
      expect(await checkAnchorOnChain(onMainnet, deps({ [I1]: { byHash: [tx] } }))).toEqual({
        status: 'failed',
        reason: 'that transaction’s call on VeilCore’s contract is not a date stamp (anchorBatch)',
      });
    });

    it('anchorBatch alone is still checked', async () => {
      expect(await checkAnchorOnChain(onMainnet, deps({ [I1]: { byHash: [anchorTx()] } }))).toMatchObject({
        status: 'checked',
        contract: { version: 'v1', address: CONTRACT },
        nameContract: false,
      });
    });
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

  it('finds a key by its decoded parameter name, wherever it is in the address', () => {
    for (const keyed of [
      'https://x.example/graphql?project_id=abc',
      'https://x.example/graphql?project%5Fid=abc',
      'https://x.example/graphql?PROJECT-ID=abc',
      'https://x.example/graphql?a=1&api_key=abc',
      'https://x.example/graphql?apikey=abc',
      'https://x.example/graphql?api%2Dkey=abc',
      'https://x.example/graphql?key=abc',
      'https://x.example/graphql?token=abc',
      'https://x.example/graphql?access_token=abc',
      'https://x.example/graphql#token=abc',
      'https://user:pass@x.example/graphql',
      'https://user@x.example/graphql',
      'not a url ?project%5Fid=abc',
    ])
      expect(carriesKey(keyed), keyed).toBe(true);
    for (const clean of [
      I1,
      I2,
      'https://x.example/graphql?network=preprod',
      'https://keyserver.example/token/graphql',
    ])
      expect(carriesKey(clean), clean).toBe(false);
    expect(readIndexersFor('mainnet', { relay: 'https://x.example/graphql?project%5Fid=abc' })).toEqual([]);
    expect(readIndexersFor('mainnet', { relay: I1, second: 'https://x.example/?key=k' })).toEqual([I1]);
  });

  it('the test-network fallback is held to the same rules: no key, https', () => {
    expect(readIndexersFor('preprod', { indexer: 'https://x.blockfrost.io/api/v0?project_id=preprodX' })).toEqual([]);
    expect(readIndexersFor('preview', { indexer: 'http://indexer.example/graphql' })).toEqual([]);
    expect(readIndexersFor('preview', { indexer: 'https://indexer.example/graphql' })).toEqual([
      'https://indexer.example/graphql',
    ]);
  });

  it('the same indexer written two ways is one indexer, not two', () => {
    for (const twin of [`${I1}/`, 'https://RELAY.example/indexer', 'https://relay.example:443/indexer//', `${I1}?x=1`])
      expect(readIndexersFor('mainnet', { relay: I1, second: twin }), twin).toEqual([I1]);
    expect(sameIndexer(I1, `${I1}/`)).toBe(true);
    expect(sameIndexer(I1, 'https://relay.example/other')).toBe(false);
    expect(readIndexersFor('mainnet', { relay: I1, second: I2 })).toEqual([I1, I2]);
  });

  it('says it reads through VeilCore’s relay unless the first indexer is one Midnight runs', () => {
    expect(readsThroughRelay([I1])).toBe(true);
    expect(readsThroughRelay([])).toBe(false);
    expect(readsThroughRelay(['https://indexer.preview.midnight.network/api/v4/graphql/'])).toBe(false);
    expect(readsThroughRelay(['https://indexer.preview.midnight.network/api/v4/graphql', I1])).toBe(false);
  });

  it('the contract: mainnet’s pinned address, else the test build’s demo contract', () => {
    expect(anchorContractFor('mainnet', CONTRACT.toUpperCase(), 'c0'.repeat(32))).toBe(CONTRACT);
    expect(anchorContractFor('mainnet', '', 'c0'.repeat(32))).toBeUndefined();
    expect(anchorContractFor('preprod', CONTRACT, 'c0'.repeat(32))).toBe('c0'.repeat(32));
  });

  it('the contract list: on mainnet the pinned list (v1, then v2 since 25 Nov 2026), off mainnet a named version, or none', () => {
    // With its pinned entry's key states, which the page judges only once more than one is pinned.
    const main = MAINNET_PINNED.filter((e) => e.kind === 'veilcore');
    expect(main.map((e) => e.version)).toEqual(['v1', 'v2']);
    expect(anchorContractsFor('mainnet', CONTRACT.toUpperCase(), 'c0'.repeat(32))).toEqual(
      main.map((e) => ({ version: e.version, address: e.address, keyStates: e.keyStates })),
    );
    expect(main[0].address).toBe(CONTRACT);
    expect(anchorContractsFor('mainnet', '', 'c0'.repeat(32))).toEqual([]);
    // A mainnet pin the pinned list doesn't hold: nothing is read.
    expect(anchorContractsFor('mainnet', 'c0'.repeat(32), undefined)).toEqual([]);
    // Off mainnet a check names its contract version (docs/contract-v2.md 3.1, rule 10.4): the
    // build names it, or preprod's pinned list does; a defaulted one reads nothing.
    expect(anchorContractsFor('preprod', CONTRACT, 'c0'.repeat(32))).toEqual([]);
    expect(anchorContractsFor('preview', CONTRACT, 'c0'.repeat(32), 'v1')).toEqual([
      { version: 'v1', address: 'c0'.repeat(32) },
    ]);
    expect(anchorContractsFor('undeployed', CONTRACT, 'c0'.repeat(32), 'v2')).toEqual([
      { version: 'v2', address: 'c0'.repeat(32) },
    ]);
    const testSite = PREPROD_PINNED.find((e) => e.kind === 'veilcore')?.address ?? '';
    expect(anchorContractsFor('preprod', CONTRACT, testSite)).toEqual([{ version: 'v1', address: testSite }]);
    expect(anchorContractsFor('preprod', CONTRACT, testSite, 'v2')).toEqual([]);
    expect(anchorContractsFor('preprod', CONTRACT, undefined, 'v1')).toEqual([]);
  });
});
