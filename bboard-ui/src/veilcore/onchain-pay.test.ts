// Royalties paid on Midnight (onchain-pay.ts): amounts in base units exactly, addresses
// checked before money moves, the licensee's wallet found and asked, and the licensor's check
// read from the indexer's own answer. Test data only.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { bech32m } from '@scure/base';
import {
  countPayment,
  keepSent,
  sentFor,
  ONCHAIN_TOKENS,
  addressProblem,
  checkPayment,
  findWallets,
  fromBaseUnits,
  onChainMethod,
  payOnChain,
  reusedPayments,
  toBaseUnits,
  tokenOfMethod,
} from './onchain-pay';

const NIGHT = ONCHAIN_TOKENS[0];
const addr = (prefix: string, fill = 7) => bech32m.encode(prefix, bech32m.toWords(new Uint8Array(32).fill(fill)), 200);
const PAYEE = addr('mn_addr_preprod');
const TX = 'ab'.repeat(32);

describe('amounts', () => {
  it('in base units exactly, never rounded', () => {
    expect(toBaseUnits('500', 6)).toBe(500_000_000n);
    expect(toBaseUnits('0.000001', 6)).toBe(1n);
    expect(toBaseUnits('12.5', 6)).toBe(12_500_000n);
    expect(() => toBaseUnits('0.0000001', 6)).toThrow(/more than 6 decimal/);
    for (const bad of ['', '-1', '1e3', '0', '0.0', '1,000', ' 1 2']) expect(() => toBaseUnits(bad, 6), bad).toThrow();
    expect(fromBaseUnits(12_500_000n, 6)).toBe('12.5');
    expect(fromBaseUnits(1n, 6)).toBe('0.000001');
  });
  it('a payout method names a pinned token, and nothing else', () => {
    expect(tokenOfMethod(onChainMethod('NIGHT'))).toBe(NIGHT);
    expect(tokenOfMethod('midnight:FAKE')).toBeUndefined();
    expect(tokenOfMethod('bank transfer')).toBeUndefined();
  });
});

describe('addresses, checked before any money moves', () => {
  it("this network's unshielded address passes; a typo, another network or another kind doesn't", () => {
    expect(addressProblem(PAYEE, 'preprod')).toBeUndefined();
    expect(addressProblem(addr('mn_addr'), 'mainnet')).toBeUndefined();
    const typo = PAYEE.slice(0, -1) + (PAYEE.endsWith('q') ? 'p' : 'q');
    expect(addressProblem(typo, 'preprod')).toMatch(/isn’t a Midnight address/);
    expect(addressProblem(addr('mn_addr'), 'preprod')).toMatch(/another Midnight network/);
    expect(addressProblem(addr('mn_shield-addr_preprod'), 'preprod')).toMatch(/unshielded/);
  });
});

describe("the licensee's wallet", () => {
  it('only standard connector v4 wallets are offered', () => {
    const ok = { name: 'Lace', apiVersion: '4.0.1', connect: () => Promise.reject(new Error('x')) };
    const list = findWallets({
      lace: ok,
      old: { ...ok, apiVersion: '3.0.0' },
      junk: 5,
      noConnect: { apiVersion: '4.0.0' },
    });
    expect(list.map((w) => w.id)).toEqual(['lace']);
    expect(findWallets(undefined)).toEqual([]);
  });

  it('pays exactly the amount to the address, the wallet pays the fee and submits; returns the id', async () => {
    const asked: unknown[] = [];
    let submitted = '';
    const wallet = findWallets({
      w: {
        name: 'Test wallet',
        apiVersion: '4.0.1',
        connect: (n: string) => {
          asked.push(n);
          return Promise.resolve({
            makeTransfer: (outs: unknown, opts: unknown) => {
              asked.push(outs, opts);
              return Promise.resolve({ tx: 'beef' });
            },
            submitTransaction: (tx: string) => {
              submitted = tx;
              return Promise.resolve();
            },
            getUnshieldedAddress: () => Promise.resolve({ unshieldedAddress: PAYEE }),
          });
        },
      },
    })[0];
    const id = await payOnChain(
      wallet,
      { token: NIGHT, amount: '500', recipient: PAYEE },
      { network: 'preprod', identifierOf: () => Promise.resolve(TX) },
    );
    expect(id).toBe(TX);
    expect(submitted).toBe('beef');
    expect(asked).toEqual([
      'preprod',
      [{ kind: 'unshielded', type: '00'.repeat(32), value: 500_000_000n, recipient: PAYEE }],
      { payFees: true },
    ]);
    // A bad address is refused before the wallet is even asked.
    await expect(
      payOnChain(wallet, { token: NIGHT, amount: '5', recipient: 'nope' }, { network: 'preprod' }),
    ).rejects.toThrow(/isn’t a Midnight address/);
  });
});

/** An indexer answering with this transaction for both lookups. */
const indexer = (tx: Record<string, unknown> | null) => ({
  indexers: ['https://indexer.test/graphql'],
  fetch: (() =>
    Promise.resolve(
      new Response(JSON.stringify({ data: { byId: tx ? [tx] : [], byHash: tx ? [tx] : [] } }), { status: 200 }),
    )) as unknown as typeof fetch,
});
const tx = (outputs: Record<string, unknown>[], status = 'SUCCESS') => ({
  hash: 'cd'.repeat(32),
  identifiers: [TX],
  block: { height: 4243, timestamp: 1 },
  transactionResult: { status },
  unshieldedCreatedOutputs: outputs,
});
const out = (owner: string, value: string, tokenType = '00'.repeat(32)) => ({
  owner,
  value,
  tokenType,
  outputIndex: 0,
});

describe("the licensor's check, on Midnight", () => {
  const ask = (t: Record<string, unknown> | null, amount = '500') =>
    checkPayment({ txId: TX, payTo: PAYEE, token: NIGHT, amount }, indexer(t));

  it('a successful transfer of at least the amount to the payout address checks out', async () => {
    const r = await ask(tx([out(PAYEE, '500000000'), out(addr('mn_addr_preprod', 9), '1')]));
    expect(r).toEqual({ ok: true, txHash: 'cd'.repeat(32), paid: 500_000_000n, blockHeight: 4243 });
    // Split across two outputs, and with a tagged token type: still the same payment.
    expect((await ask(tx([out(PAYEE, '200000000'), out(PAYEE, '300000000', '01' + '00'.repeat(32))]))).ok).toBe(true);
  });

  it('too little, to someone else, another token, a failed or missing transaction: not counted', async () => {
    const why = async (t: Record<string, unknown> | null) => {
      const r = await ask(t);
      return r.ok ? 'counted' : r.reason;
    };
    expect(await why(tx([out(PAYEE, '499999999')]))).toMatch(/less than 500/);
    expect(await why(tx([out(addr('mn_addr_preprod', 9), '500000000')]))).toMatch(/no NIGHT to your payout address/);
    expect(await why(tx([out(PAYEE, '500000000', '11'.repeat(32))]))).not.toBe('counted');
    expect(await why(tx([out(PAYEE, '500000000')], 'FAILURE'))).toMatch(/didn’t succeed/);
    expect(await why(null)).toMatch(/no such transaction/);
  });

  it('an indexer that does not answer is said as such, not as unpaid', async () => {
    const r = await checkPayment(
      { txId: TX, payTo: PAYEE, token: NIGHT, amount: '1' },
      {
        indexers: ['https://indexer.test/graphql'],
        fetch: () => Promise.reject(new TypeError('x')),
      },
    );
    expect(r).toMatchObject({ ok: false, unreachable: true });
  });

  it('one transaction counts for one statement only', () => {
    const m = onChainMethod('NIGHT');
    const reused = reusedPayments([
      { statementSig: 's2', method: m, reference: TX.toUpperCase(), at: 2 },
      { statementSig: 's1', method: m, reference: TX, at: 1 },
      { statementSig: 's3', method: 'bank transfer', reference: TX, at: 3 },
    ]);
    expect([...reused]).toEqual([['s2', 's1']]);
  });
});

describe('a payment sent but not yet recorded', () => {
  it('is kept for its statement, so the page offers to record it and never to pay again', () => {
    const mem = new Map<string, string>();
    const g = globalThis as unknown as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    try {
      expect(sentFor('sig-1')).toBeUndefined();
      keepSent('sig-1', TX);
      expect(sentFor('sig-1')).toBe(TX);
      expect(sentFor('sig-2')).toBeUndefined();
      mem.set('veilcore:onchain-sent', JSON.stringify({ 'sig-3': '<script>' }));
      expect(sentFor('sig-3')).toBeUndefined();
    } finally {
      g.localStorage = before;
    }
  });

  it('a transaction id the message cannot carry is refused before anything is sent', async () => {
    let submitted = false;
    const wallet = findWallets({
      w: {
        name: 'W',
        apiVersion: '4.0.1',
        connect: () =>
          Promise.resolve({
            makeTransfer: () => Promise.resolve({ tx: 'beef' }),
            submitTransaction: () => {
              submitted = true;
              return Promise.resolve();
            },
            getUnshieldedAddress: () => Promise.resolve({ unshieldedAddress: PAYEE }),
          }),
      },
    })[0];
    await expect(
      payOnChain(
        wallet,
        { token: NIGHT, amount: '1', recipient: PAYEE },
        { network: 'preprod', identifierOf: () => Promise.resolve('ab'.repeat(61)) },
      ),
    ).rejects.toThrow(/Nothing was sent/);
    expect(submitted).toBe(false);
  });
});

describe('one payment counts for one statement, across every deal', () => {
  it('a transaction already counted for another statement is not counted again', () => {
    const mem = new Map<string, string>();
    const g = globalThis as unknown as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    try {
      expect(countPayment(TX, 'deal-A-statement')).toBeUndefined();
      expect(countPayment(TX, 'deal-A-statement')).toBeUndefined(); // the same statement again: fine
      expect(countPayment(TX.toUpperCase(), 'deal-B-statement')).toBe('deal-A-statement');
    } finally {
      g.localStorage = before;
    }
  });
});
