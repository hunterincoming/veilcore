// The two claims about a pair of records from the browser (claims-call.ts proveDistinctOnChain,
// proveUnchangedOnChain), end to end against stand-ins (test-chain.ts): the claims contract's real
// compiled circuits and circuit IR, the real sealing, and the REAL sponsor policy. What this pins
// down: the inputs pass the contract's own circuits, no number or salt is in what is sent, a pair
// the contract would refuse never leaves the browser, and today's sponsor refuses to pay for both
// (sponsor/src/policy.ts CLAIMS_CIRCUITS), which is why the page doesn't offer the button
// (config/copy.ts TWO_RECORD_CLAIMS_SPONSORED). When the sponsor's list changes, the last test here
// fails and says so.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { CLAIMS_CIRCUITS } from '../../../../sponsor/src/policy';
import { proveDistinctOnChain, proveUnchangedOnChain } from './claims-call';
import { ADDRESS, claimsContractState, standIns } from './test-chain';
import { claimMaterial } from '../claims-input';
import { POTENCY, potency, sealedNumbers } from '../two-record-test-records';

const sponsorCalls = (r: ReturnType<typeof standIns>) => r.requests.filter((q) => q.url.endsWith('/sponsor'));

describe('a claim about two records from the browser (stand-in network, real sponsor policy)', () => {
  it('proveDistinct: the circuit takes it, nothing secret is sent, and today’s sponsor won’t pay', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const [ma, mb] = await Promise.all([claimMaterial(a as never), claimMaterial(b as never)]);
    await expect(proveDistinctOnChain(ma, mb, { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /does not pay for "proveDistinct"/,
    );
    // Proved against the contract's own circuit, then handed to the sponsor, which refused.
    expect(r.checkedCircuits).toEqual(['proveDistinct']);
    expect(sponsorCalls(r)).toHaveLength(1);
    expect(r.sealed).toHaveLength(0);
    const sent = sponsorCalls(r)[0].body ?? '';
    expect(sent).not.toContain(a.fieldSet!.fieldSecret);
    expect(sent).not.toContain(b.fieldSet!.fieldSecret);
  });

  it('proveUnchanged: the same, with the list of numbers allowed to change', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const [mo, mc] = await Promise.all([claimMaterial(original as never), claimMaterial(corrected as never)]);
    await expect(proveUnchangedOnChain(mo, mc, [0], { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /does not pay for "proveUnchanged"/,
    );
    expect(r.checkedCircuits).toEqual(['proveUnchanged']);
    expect(r.sealed).toHaveLength(0);
  });

  it('a pair the contract would refuse never leaves the browser', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const same = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const changed = await sealedNumbers(POTENCY, potency(300n, 12000n));
    const [ma, ms, mc] = await Promise.all([a, same, changed].map((x) => claimMaterial(x as never)));
    await expect(proveDistinctOnChain(ma, ma, { deps: r.deps, contract: ADDRESS })).rejects.toThrow(/same record/);
    await expect(proveDistinctOnChain(ma, ms, { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /don’t differ in enough/,
    );
    await expect(proveUnchangedOnChain(ma, mc, [0], { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /isn’t in your list changed/,
    );
    expect(r.requests).toHaveLength(0);
    expect(r.checkedCircuits).toEqual([]);
  });

  it('the sponsor pays for neither yet: the site says so until both lists change together', async () => {
    const { TWO_RECORD_CLAIMS_SPONSORED } = await import('../../config/copy');
    const paid = (['proveDistinct', 'proveUnchanged'] as const).every((c) =>
      (CLAIMS_CIRCUITS as readonly string[]).includes(c),
    );
    expect(paid).toBe(false);
    expect(TWO_RECORD_CLAIMS_SPONSORED).toBe(paid);
  });
});
