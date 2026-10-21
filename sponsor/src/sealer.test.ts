// The sealing job (sealer.ts) with stand-ins for the chain, the budget and the store.
import { describe, expect, it } from 'vitest';
import { Sealer, SEAL_AHEAD_S, SEAL_INTERVAL_S, SEAL_SKEW_S, type SealAttempt, type SealChain, type SealView } from './sealer.js';
import { DailyBudget } from './limits.js';
import type { Landing, PreparedAnchor } from './anchorer.js';

const T0 = 1_800_000_000_000; // ms
const nowS = BigInt(T0 / 1000);

const setup = (view: Partial<SealView> = {}, opts: { fee?: bigint; landing?: Landing; submitFails?: 'not-sent' | 'unknown' } = {}) => {
  const sent: string[] = [];
  const bounds: bigint[] = [];
  let saved: SealAttempt | undefined;
  let now = T0;
  const v: SealView = { unsealedChanges: true, rootsSinceSeal: false, lastSealTime: 0n, ...view };
  const chain: SealChain = {
    sealView: () => Promise.resolve(v),
    prepareSeal: (bound): Promise<PreparedAnchor> => {
      bounds.push(bound);
      const txId = `tx${bounds.length}`;
      return Promise.resolve({
        txId,
        ttl: new Date(now + 30 * 60_000),
        fee: opts.fee ?? 1_000n,
        submit: () => {
          if (opts.submitFails === 'not-sent') return Promise.reject(Object.assign(new Error('nope'), { name: 'NotSentError' }));
          if (opts.submitFails === 'unknown') return Promise.reject(new Error('connection reset'));
          sent.push(txId);
          return Promise.resolve();
        },
        abandon: () => Promise.resolve(),
      });
    },
    lookupSeal: () => Promise.resolve(opts.landing ?? { state: 'unknown' }),
  };
  const budget = new DailyBudget(10_000n, () => now);
  const sealer = new Sealer(
    chain,
    { load: () => saved, save: (a) => void (saved = a), clear: () => void (saved = undefined) },
    (job) => job(),
    budget,
    5_000n,
    () => now,
    () => undefined,
  );
  return { sealer, sent, bounds, budget, saved: () => saved, advance: (ms: number) => void (now += ms) };
};

describe('sealing revocations', () => {
  it('does nothing when no revocation waits, even if activations added roots', async () => {
    const s = setup({ unsealedChanges: false, rootsSinceSeal: true });
    expect(await s.sealer.runOnce()).toBe('idle');
    expect(s.bounds).toEqual([]);
  });

  it('waits out the contract interval since the last seal (plus clock skew)', async () => {
    const s = setup({ lastSealTime: nowS - SEAL_INTERVAL_S });
    expect(await s.sealer.runOnce()).toBe('too-soon');
    expect(s.bounds).toEqual([]);
    const ok = setup({ lastSealTime: nowS - SEAL_INTERVAL_S - SEAL_SKEW_S });
    expect(await ok.sealer.runOnce()).toBe('sent');
  });

  it('seals with a time ahead of now inside the slack, saves the attempt before sending, and pays from the budget', async () => {
    const s = setup();
    expect(await s.sealer.runOnce()).toBe('sent');
    expect(s.bounds).toEqual([nowS + SEAL_AHEAD_S]);
    expect(s.sent).toEqual(['tx1']);
    expect(s.saved()?.txId).toBe('tx1');
    expect(s.budget.unspent()).toBe(9_000n);
  });

  it('never sends again while an attempt may land; clears it once it lands or expires', async () => {
    const s = setup();
    await s.sealer.runOnce();
    expect(await s.sealer.runOnce()).toBe('waiting');
    expect(s.sent).toEqual(['tx1']);
    s.advance(60 * 60_000);
    expect(await s.sealer.runOnce()).toBe('expired');
    expect(s.saved()).toBeUndefined();
    const landed = setup({}, { landing: { state: 'landed', txHash: 'h', blockHeight: 1 } });
    await landed.sealer.runOnce();
    expect(await landed.sealer.runOnce()).toBe('sealed');
    expect(landed.saved()).toBeUndefined();
  });

  it('refuses a fee over the ceiling, and keeps a send that may have gone out', async () => {
    const dear = setup({}, { fee: 6_000n });
    expect(await dear.sealer.runOnce()).toBe('budget');
    expect(dear.sent).toEqual([]);
    expect(dear.saved()).toBeUndefined();
    const lost = setup({}, { submitFails: 'unknown' });
    expect(await lost.sealer.runOnce()).toBe('maybe-sent');
    expect(lost.saved()?.txId).toBe('tx1'); // looked up next run, never rebuilt
    const notSent = setup({}, { submitFails: 'not-sent' });
    expect(await notSent.sealer.runOnce()).toBe('not-sent');
    expect(notSent.saved()).toBeUndefined();
    expect(notSent.budget.unspent()).toBe(10_000n);
  });
});
