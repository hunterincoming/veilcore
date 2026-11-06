// The browser's calls on both sides of Midnight's Ledger 9 fork. The other chain tests run on
// one side (VEILCORE_TEST_ERA, default 'v9', mainnet now); these run the same calls on both,
// every time: a network not yet forked (Ledger 8 states and transactions: the test networks
// until they fork) and a forked one (Ledger 9 states, and the same Ledger 8 contract's call
// built as a Ledger 9 transaction). Each must be proved, sealed, and accepted by the sponsor's
// real policy, carrying no secret.
import { describe, expect, it } from 'vitest';
import { anchorOnChain, proveOwnershipOnChain, recoveryCommitmentOf } from './actions';
import { contractStateAfter, standIns } from './test-chain';
import { readSealed, eraOf } from '../../../../sponsor/src/policy';

const RECORD = new Uint8Array(32).fill(0x5a);
const RECOVERY = new Uint8Array(32).fill(0xa5);
const contains = (hay: Uint8Array, needle: Uint8Array): boolean => Buffer.from(hay).indexOf(Buffer.from(needle)) !== -1;

describe.each(['v8', 'v9'] as const)('a call on a network on %s', (era) => {
  it('anchor: built for that ledger, proved, sealed, paid for, no secret in it', async () => {
    const r = standIns(contractStateAfter(), { era });
    const receipt = await anchorOnChain(RECORD, RECOVERY, { deps: r.deps });
    expect(receipt).toMatchObject({ circuit: 'anchor', blockHeight: 42 });
    expect(r.checkedCircuits).toEqual(['anchor']);
    expect(r.sealed).toHaveLength(1);
    // The sponsor reads it with the ledger the network is on.
    expect(eraOf(readSealed(r.sealed[0]))).toBe(era);
    expect(contains(r.sealed[0], RECORD)).toBe(false);
    expect(contains(r.sealed[0], recoveryCommitmentOf(RECOVERY))).toBe(true);
  });

  it('proveOwnership against an anchored record', async () => {
    const r = standIns(
      contractStateAfter([{ secret: RECORD, circuit: 'anchor', args: [recoveryCommitmentOf(RECOVERY)] }]),
      { era },
    );
    await proveOwnershipOnChain(RECORD, 'c4'.repeat(32), { deps: r.deps });
    expect(r.checkedCircuits).toEqual(['proveOwnership']);
    expect(eraOf(readSealed(r.sealed[0]))).toBe(era);
  });
});
