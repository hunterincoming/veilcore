// The check before sending (preflight.ts), the logs around it (wallet.ts) and the start-up
// build line (build-info.ts).
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Ledger9 from '@midnightntwrk/ledger-v9';
import { LedgerParameters } from '@midnightntwrk/ledger-v9';
import { factsOf, preflight } from './preflight.js';
import { FacadeWallet } from './wallet.js';
import { NotSentError, Sponsor } from './sponsor.js';
import { DailyBudget, DEFAULT_LIMITS, Limits, SingleFlight } from './limits.js';
import { AGREEMENT_CIRCUITS, PHASE1_PUBLIC_CIRCUITS, type SealedTx } from './policy.js';
import { ProofOfWork, solve } from './pow.js';
import { kit } from './test-tx.js';
import { buildInfo, installedVersion, LOGGED_PACKAGES } from './build-info.js';

const PARAMS = () => LedgerParameters.initialParameters();

/**
 * A real, sealed ledger 9 transaction that pays no fee and reaches the ledger's balance check
 * (an intent with no call: test-tx's placeholder calls stop earlier, at the empty-transcript check).
 */
const L9 = kit(Ledger9);
const sealedCall = L9.sealedCall;
const unpaid = () => {
  const k = L9;
  return k.seal(Ledger9.Transaction.fromParts('preprod', undefined, undefined, Ledger9.Intent.new(k.ttlIn(600_000))));
};

/** Every line the sponsor logged while `run` ran, parsed. */
const captureLog = async (run: () => Promise<unknown>): Promise<{ lines: Record<string, unknown>[]; raw: string }> => {
  const raw: string[] = [];
  const out = vi.spyOn(console, 'log').mockImplementation((s: unknown) => void raw.push(String(s)));
  const err = vi.spyOn(console, 'error').mockImplementation((s: unknown) => void raw.push(String(s)));
  try {
    await run();
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
  return { lines: raw.map((l) => JSON.parse(l) as Record<string, unknown>), raw: raw.join('\n') };
};

/** Nothing secret-shaped: no 64+ hex digits (seeds, keys, transaction bytes), no byte lists. */
const expectNoSecretMaterial = (raw: string) => {
  expect(raw).not.toMatch(/[0-9a-fA-F]{64,}/);
  expect(raw).not.toMatch(/(?:\d{1,3},){16,}/);
  expect(raw.toLowerCase()).not.toContain('seed');
  expect(raw).not.toMatch(/mn_(?:shield|addr|dust)[a-z0-9_]*1[0-9a-z]{20,}/i);
};

/** A stand-in facade whose finished transaction is `finished` and whose recipe carries `params`. */
const facade = (finished: Uint8Array, params: unknown, over: Record<string, unknown> = {}) => {
  const calls: string[] = [];
  const f = {
    adoptTransaction: () => ({ type: 'handle' }),
    balanceFinalizedTransaction: () => Promise.resolve({ type: 'recipe', blockData: { ledgerParameters: params } }),
    signRecipe: (r: unknown) => Promise.resolve(r),
    finalizeRecipe: () => {
      calls.push('finalize');
      return Promise.resolve({ type: 'finalized', serialize: () => finished });
    },
    calculateTransactionFee: () => Promise.resolve(4_000n),
    submitTransaction: () => {
      calls.push('submit');
      return Promise.resolve('txid-1');
    },
    revert: (x: { type: string }) => {
      calls.push(`revert:${x.type}`);
      return Promise.resolve();
    },
    ...over,
  };
  return { f, calls };
};

const asSealed = (bytes: Uint8Array) => ({ serialize: () => bytes }) as unknown as SealedTx;

afterEach(() => vi.restoreAllMocks());

describe('preflight (the ledger check before sending)', () => {
  it('refuses a call whose DUST does not cover its fee, as the node does (error 138), with the shortfall', async () => {
    const r = preflight(await unpaid(), PARAMS(), 'preprod', new Date());
    expect(r.ok).toBe(false);
    if (r.ok !== false) return;
    expect(r.code).toBe('138');
    expect(r.error).toMatch(/invalid balance -\d+ for token Dust in segment 0/);
    expect(r.facts.dustSpends).toBe(0);
    expect(r.facts.dustPaid).toBe(0n);
    expect(typeof r.facts.ledgerFeeNoMargin).toBe('bigint');
    // The shortfall the ledger names is the fee it works out (nothing was paid).
    expect(r.error).toContain(`-${r.facts.ledgerFeeNoMargin}`);
  });

  it('does not refuse a contract call for want of contract state (the wallet SDK check would)', async () => {
    // test-tx's call has empty transcripts, which the ledger refuses on its own; the point is
    // that it gets past the contract lookup a blank state cannot answer.
    const r = preflight(await sealedCall('countersignLicense'), PARAMS(), 'preprod', new Date());
    expect(r.ok).toBe(false);
    if (r.ok !== false) return;
    expect(r.error).not.toMatch(/non-existant contract|ContractNotPresent/i);
    expect(r.facts.circuits).toEqual(['countersignLicense']);
    expect(r.code).toBeUndefined();
  });

  it('a wrong network is refused, without a node number', async () => {
    const r = preflight(await sealedCall('anchor'), PARAMS(), 'mainnet', new Date());
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error).toMatch(/network/i);
      expect(r.code).toBeUndefined();
    }
  });

  it('skips (sends as before) without ledger 9 parameters or with bytes ledger 9 cannot read', async () => {
    expect(preflight(await sealedCall('anchor'), undefined, 'preprod', new Date()).ok).toBe('skipped');
    expect(preflight(await sealedCall('anchor'), { not: 'params' }, 'preprod', new Date()).ok).toBe('skipped');
    expect(preflight(new Uint8Array([1, 2, 3]), PARAMS(), 'preprod', new Date()).ok).toBe('skipped');
  });

  it('a check that cannot be set up is skipped, not a refusal (a wasm trap in LedgerState.blank)', async () => {
    const bytes = await sealedCall('anchor');
    vi.spyOn(Ledger9.LedgerState, 'blank').mockImplementation(() => {
      throw new Error('RuntimeError: unreachable (wasm trap)');
    });
    const r = preflight(bytes, PARAMS(), 'preprod', new Date());
    expect(r.ok).toBe('skipped');
    if (r.ok === 'skipped') expect(r.why).toContain('wasm trap');
  });

  it('reads entry points and DUST spends, and never throws on odd shapes', () => {
    const intents = new Map([
      [1, { actions: [{ entryPoint: 'countersignLicense' }], dustActions: { spends: [{ vFee: 3n }, { vFee: 4n }] } }],
      [2, { actions: [{ entryPoint: new TextEncoder().encode('anchor') }] }],
    ]);
    expect(factsOf({ intents })).toEqual({ circuits: ['countersignLicense', 'anchor'], dustSpends: 2, dustPaid: 7n });
    expect(factsOf({} as never)).toEqual({ circuits: [], dustSpends: 0, dustPaid: 0n });
    expect(factsOf({ intents: 5 } as never)).toEqual({ circuits: [], dustSpends: 0, dustPaid: 0n });
  });
});

describe('sponsor wallet: check before sending, and the logs', () => {
  it('a call the network would refuse is not sent: coins released, final refusal, one log line with the facts', async () => {
    const bytes = await unpaid();
    const { f, calls } = facade(bytes, PARAMS());
    const w = FacadeWallet.forTests(f, { network: 'preprod', preflight });
    let e: unknown;
    const { lines, raw } = await captureLog(async () => {
      e = await w.payAndSubmit(asSealed(bytes), new Date(), () => undefined).catch((x: unknown) => x);
    });
    expect(e).toBeInstanceOf(NotSentError);
    expect((e as NotSentError).retryable).toBe(false);
    expect((e as NotSentError).message).toBe('The network would refuse the transaction (error 138). Nothing was sent.');
    expect(calls).not.toContain('submit');
    expect(calls).toContain('revert:finalized');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'warn',
      msg: 'sponsor: the network would refuse this; not sent',
      circuit: 'unknown',
      feeWithMargin: '4000',
      dustSpends: 0,
      dustPaid: '0',
      nodeError: '138',
    });
    expect(lines[0].ledgerFeeNoMargin).toMatch(/^\d+$/);
    expect(lines[0].error).toMatch(/invalid balance/);
    expectNoSecretMaterial(raw);
  });

  it('a refusal other than 138 is logged with the circuit, and the call is sent anyway (the node judges)', async () => {
    const bytes = await sealedCall('countersignLicense');
    const { f, calls } = facade(bytes, PARAMS());
    const w = FacadeWallet.forTests(f, { network: 'preprod', preflight });
    let out: unknown;
    const { lines, raw } = await captureLog(async () => {
      out = await w.payAndSubmit(asSealed(bytes), new Date(), () => undefined);
    });
    expect(out).toEqual({ txId: 'txid-1', fee: 4_000n });
    expect(calls).toContain('submit');
    expect(calls).not.toContain('revert:finalized');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'warn',
      msg: 'sponsor: the ledger check would refuse this; sent anyway',
      circuit: 'countersignLicense',
      feeWithMargin: '4000',
    });
    expect(lines[0].nodeError).toBeUndefined();
    expect(typeof lines[0].error).toBe('string');
    expectNoSecretMaterial(raw);
  });

  it('DUST dated outside its window (171) is logged and sent anyway: the node judges by the block, not this clock', async () => {
    const { f, calls } = facade(new Uint8Array(3), PARAMS());
    const late = () => ({
      ok: false as const,
      facts: { circuits: ['anchor'], dustSpends: 1, dustPaid: 5_000n },
      error: 'Error: dust is outside of its validity window (declared time: 1, window: [2, 3])',
      code: '171',
    });
    const w = FacadeWallet.forTests(f, { preflight: late });
    let out: unknown;
    const { lines } = await captureLog(async () => {
      out = await w.payAndSubmit(asSealed(new Uint8Array(3)), new Date(), () => undefined);
    });
    expect(out).toEqual({ txId: 'txid-1', fee: 4_000n });
    expect(calls).toContain('submit');
    expect(calls).not.toContain('revert:finalized');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'warn',
      msg: 'sponsor: the ledger check would refuse this; sent anyway',
      circuit: 'anchor',
      nodeError: '171',
    });
  });

  it('a check that cannot be set up (LedgerState.blank throws) still sends, logged once as not checked', async () => {
    const bytes = await unpaid(); // would be a 138 refusal if the check ran
    const { f, calls } = facade(bytes, PARAMS());
    vi.spyOn(Ledger9.LedgerState, 'blank').mockImplementation(() => {
      throw new Error('RuntimeError: unreachable (wasm trap)');
    });
    const w = FacadeWallet.forTests(f, { network: 'preprod', preflight });
    let out: unknown;
    const { lines } = await captureLog(async () => {
      out = await w.payAndSubmit(asSealed(bytes), new Date(), () => undefined);
    });
    expect(out).toEqual({ txId: 'txid-1', fee: 4_000n });
    expect(calls).toContain('submit');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'info', msg: 'sponsor: not checked before sending' });
    expect(String(lines[0].why)).toContain('wasm trap');
  });

  it('a call that passes the check is sent, and nothing extra is logged', async () => {
    const { f, calls } = facade(new Uint8Array(3), PARAMS());
    const ok = () => ({ ok: true as const, facts: { circuits: ['anchor'], dustSpends: 1, dustPaid: 5_000n } });
    const w = FacadeWallet.forTests(f, { preflight: ok });
    const { lines } = await captureLog(async () => {
      expect(await w.payAndSubmit(asSealed(new Uint8Array(3)), new Date(), () => undefined)).toEqual({ txId: 'txid-1', fee: 4_000n });
    });
    expect(calls).toContain('submit');
    expect(lines).toEqual([]);
  });

  it('a check that breaks never blocks sending (logged as not checked)', async () => {
    const { f, calls } = facade(new Uint8Array(3), PARAMS());
    const broken = () => {
      throw new Error('wasm trap');
    };
    const w = FacadeWallet.forTests(f, { preflight: broken });
    const { lines } = await captureLog(() => w.payAndSubmit(asSealed(new Uint8Array(3)), new Date(), () => undefined));
    expect(calls).toContain('submit');
    expect(lines[0]).toMatchObject({ level: 'info', msg: 'sponsor: not checked before sending' });
    expect(String(lines[0].why)).toContain('wasm trap');
  });

  it('a refusal after sending logs the full node error with the same fields', async () => {
    const node = new Error('1010: Invalid Transaction: Custom error: 138');
    const { f } = facade(new Uint8Array(3), PARAMS(), { submitTransaction: () => Promise.reject(node) });
    const facts = { circuits: ['countersignLicense'], dustSpends: 2, dustPaid: 5_000n, ledgerFeeNoMargin: 3_900n };
    const w = FacadeWallet.forTests(f, { preflight: () => ({ ok: true, facts }) });
    let e: unknown;
    const { lines, raw } = await captureLog(async () => {
      e = await w.payAndSubmit(asSealed(new Uint8Array(3)), new Date(), () => undefined).catch((x: unknown) => x);
    });
    expect((e as NotSentError).message).toBe('The network refused the transaction (error 138).');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'warn',
      msg: 'sponsor: the network refused this',
      circuit: 'countersignLicense',
      feeWithMargin: '4000',
      ledgerFeeNoMargin: '3900',
      dustSpends: 2,
      dustPaid: '5000',
      nodeError: '138',
    });
    expect(lines[0].error).toContain('1010: Invalid Transaction: Custom error: 138');
    expectNoSecretMaterial(raw);
  });

  it('a submit that may have gone out is logged too, redacted', async () => {
    const leak = new Error(`socket closed while sending ${'ab'.repeat(40)}`);
    const { f } = facade(new Uint8Array(3), PARAMS(), { submitTransaction: () => Promise.reject(leak) });
    const w = FacadeWallet.forTests(f, { preflight: () => ({ ok: true, facts: { circuits: ['anchor'], dustSpends: 1, dustPaid: 1n } }) });
    const { lines, raw } = await captureLog(() => w.payAndSubmit(asSealed(new Uint8Array(3)), new Date(), () => undefined).catch(() => undefined));
    expect(lines[0]).toMatchObject({ msg: 'sponsor: submit failed; it may have been sent', circuit: 'anchor' });
    expectNoSecretMaterial(raw);
  });
});

describe('the public endpoint with the check in place', () => {
  it('answers 400 refused-by-network (what the site already reads), and spends no budget', async () => {
    const t = Date.now();
    const now = () => t;
    const bytes = await sealedCall('countersignLicense');
    // What the wallet finished is short of its fee (138), the one refusal that stops a call.
    const { f, calls } = facade(await unpaid(), PARAMS(), { estimateTransactionFee: () => Promise.resolve(4_000n) });
    const wallet = FacadeWallet.forTests(f, { network: 'preprod', preflight });
    vi.spyOn(wallet, 'isSynced').mockReturnValue(true);
    const pow = new ProofOfWork(new Uint8Array(32).fill(3), 6, 600_000, now);
    const budget = new DailyBudget(1_000_000n, now);
    const limits = new Limits(DEFAULT_LIMITS, now);
    const sponsor = new Sponsor(
      {
        policy: {
          contractAddress: L9.VC,
          allowedCircuits: new Set([...PHASE1_PUBLIC_CIRCUITS, ...AGREEMENT_CIRCUITS]),
          maxBytes: 64_000,
          maxTtlMs: 30 * 60_000,
        },
        maxFeeSpecks: { default: 5_000n },
        sponsorTtlMs: 30 * 60_000,
        rememberMs: 2 * 3600_000,
        syncWaitMs: 10,
      },
      wallet,
      pow,
      limits,
      budget,
      new SingleFlight(20),
      now,
    );
    const { challenge } = pow.issue();
    let out: Awaited<ReturnType<Sponsor['handle']>> | undefined;
    await captureLog(async () => {
      out = await sponsor.handle({
        ip: '198.51.100.4',
        body: { tx: Buffer.from(bytes).toString('base64'), ticket: 'c'.repeat(32), challenge, nonce: solve(challenge, bytes, 6) },
      });
    });
    expect(out?.status).toBe(400);
    expect(out?.body).toMatchObject({ ok: false, code: 'refused-by-network' });
    expect(calls).not.toContain('submit');
    expect(budget.spentToday).toBe(0n);
    expect(sponsor.counters['refused:refused-by-network']).toBe(1);
  });
});

describe('start-up build line', () => {
  it('names the installed wallet SDK, ledger and midnight-js versions, and the platform commit or deployment', () => {
    const info = buildInfo({ RAILWAY_GIT_COMMIT_SHA: 'e226a73', RAILWAY_DEPLOYMENT_ID: 'd-1' } as NodeJS.ProcessEnv);
    for (const p of LOGGED_PACKAGES) expect(info[p]).toMatch(/^\d+\.\d+\.\d+/);
    expect(info['@midnightntwrk/ledger-v9']).toBe(installedVersion('@midnightntwrk/ledger-v9', import.meta.dirname));
    expect(info.commit).toBe('e226a73');
    expect(info.deployment).toBe('d-1');
  });

  it('says so when the platform gives no commit, and never echoes odd text', () => {
    const info = buildInfo({ RAILWAY_GIT_COMMIT_SHA: 'x y "z"' } as NodeJS.ProcessEnv);
    expect(info.commit).toBe('not given');
    expect(info.deployment).toBe('unknown');
    expect(installedVersion('@veilcore/no-such-package', import.meta.dirname)).toBe('not found');
  });

  it('holds versions and identifiers only', () => {
    expectNoSecretMaterial(JSON.stringify(buildInfo({ SPONSOR_SEED: 'ab'.repeat(32) } as NodeJS.ProcessEnv)));
  });
});
