// The sponsor's policy is equally strict on both sides of Midnight's Ledger 9 fork.
// policy.test.ts runs its full set on one ledger (VEILCORE_TEST_ERA, default Ledger 9); this
// runs every refusal and the acceptances on BOTH, every time: each transaction is read by its
// own ledger (the other refuses its bytes) and checked with that ledger's classes.
import { describe, expect, it } from 'vitest';
import * as Ledger8 from '@midnightntwrk/ledger-v8';
import * as Ledger9 from '@midnightntwrk/ledger-v9';
import { eraOf, inspect, PHASE1_PUBLIC_CIRCUITS, readSealed, type PolicyConfig } from './policy.js';
import { kit } from './test-tx.js';

const ledgers = [
  ['v8', Ledger8 as unknown as typeof Ledger9],
  ['v9', Ledger9],
] as const;

describe.each(ledgers)('sponsor policy on a Ledger %s transaction', (era, L) => {
  const k = kit(L);
  const config: PolicyConfig = {
    contractAddress: k.VC,
    allowedCircuits: new Set(PHASE1_PUBLIC_CIRCUITS),
    maxBytes: 64_000,
    maxTtlMs: 30 * 60_000,
  };
  const code = (b: Uint8Array) => {
    const { verdict } = inspect(b, config, new Date());
    return verdict.ok ? 'ok' : verdict.code;
  };

  it.each(PHASE1_PUBLIC_CIRCUITS)('pays for a sealed %s call, read by its own ledger', async (circuit) => {
    const bytes = await k.sealedCall(circuit);
    expect(code(bytes)).toBe('ok');
    expect(eraOf(readSealed(bytes))).toBe(era);
  });

  it('refuses everything else, exactly as on the other ledger', async () => {
    expect(code(await k.sealedCall('anchor', k.ttlIn(10 * 60_000), k.OTHER))).toBe('wrong-contract');
    expect(code(await k.sealedCall('issueLicense'))).toBe('circuit-not-allowed');
    expect(code(await k.sealedCall('anchorBatch'))).toBe('circuit-not-allowed');
    expect(code(await k.hostile.twoCalls())).toBe('action-count');
    expect(code(await k.hostile.twoIntents())).toBe('intent-count');
    expect(code(await k.hostile.shieldedOffer())).toBe('shielded-offer');
    expect(code(await k.hostile.unshieldedOffer())).toBe('unshielded-offer');
    expect(code(await k.hostile.dustActions())).toBe('dust-actions');
    expect(code(k.hostile.deploy())).toBe('deploy');
    expect(code(k.hostile.maintenance())).toBe('maintenance');
    expect(code(k.hostile.unproven())).toBe('unreadable');
    expect(code(await k.hostile.provenNotBound())).toBe('unreadable');
    expect(code(await k.sealedCall('anchor', k.ttlIn(-1000)))).toBe('expired');
    expect(code(await k.sealedCall('anchor', k.ttlIn(3 * 3_600_000)))).toBe('ttl-too-far');
  });

  it("is never read by the other ledger's classes", async () => {
    const bytes = await k.sealedCall('anchor');
    const other = (era === 'v9' ? Ledger8 : Ledger9) as typeof Ledger9;
    expect(() => other.Transaction.deserialize('signature', 'proof', 'binding', bytes)).toThrow();
  });
});
