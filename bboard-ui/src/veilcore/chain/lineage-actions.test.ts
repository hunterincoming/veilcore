// Parentage and offspring royalties on chain, from the browser (actions.ts): each call runs
// against the real contract on the stand-in network and is refused here, before anything is
// sent, when the contract would refuse it.
import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { checkLineage } from '../../../../contract/src/verify';
import {
  acceptObligationOnChain,
  confirmParentOnChain,
  dischargeOnChain,
  identityOf,
  proposeObligationOnChain,
  proposeParentOnChain,
  recoveryCommitmentOf,
  rejectObligationOnChain,
  withdrawParentOnChain,
} from './actions';
import { contractStateAfter, standIns } from './test-chain';
import { BROWSER_CIRCUITS } from './config';

setNetworkId('preprod');

const PARENT = new Uint8Array(32).fill(0x31);
const CHILD = new Uint8Array(32).fill(0x32);
const BREEDER = new Uint8Array(32).fill(0x33);
const STRANGER = new Uint8Array(32).fill(0x66);
const RECOVERY = new Uint8Array(32).fill(0x13);
const O = 'ab'.repeat(32);
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const anchor = (secret: Uint8Array) => ({ secret, circuit: 'anchor' as const, args: [recoveryCommitmentOf(RECOVERY)] });
const all = [anchor(PARENT), anchor(CHILD), anchor(BREEDER)];
const proposed = { secret: CHILD, circuit: 'proposeParent' as const, args: [bytes(identityOf(PARENT))] };
const confirmed = { secret: PARENT, circuit: 'confirmParent' as const, args: [bytes(identityOf(CHILD))] };
const owed = { secret: BREEDER, circuit: 'proposeObligation' as const, args: [bytes(identityOf(PARENT)), bytes(O)] };
const accepted = { secret: PARENT, circuit: 'acceptObligation' as const, args: [bytes(O), bytes(identityOf(BREEDER))] };
const allowed = { allowedCircuits: BROWSER_CIRCUITS };

describe('parentage on chain', () => {
  it('the child names a parent, the parent confirms; a stranger can do neither for them', async () => {
    const r = standIns(contractStateAfter(all), allowed);
    expect((await proposeParentOnChain(CHILD, identityOf(PARENT), { deps: r.deps })).circuit).toBe('proposeParent');
    const s = contractStateAfter([...all, proposed]);
    const no = standIns(s, allowed);
    await expect(confirmParentOnChain(STRANGER, identityOf(CHILD), { deps: no.deps })).rejects.toThrow();
    expect(no.sealed).toHaveLength(0);
    const ok = standIns(s, allowed);
    expect((await confirmParentOnChain(PARENT, identityOf(CHILD), { deps: ok.deps })).circuit).toBe('confirmParent');
    const after = ledger(contractStateAfter([...all, proposed, confirmed]).data);
    const report = checkLineage(after, bytes(identityOf(CHILD)));
    expect(report.ancestors.map((a) => Buffer.from(a).toString('hex'))).toEqual([identityOf(PARENT)]);
  });

  it('the child can take back a proposal the parent has not confirmed', async () => {
    const r = standIns(contractStateAfter([...all, proposed]), allowed);
    expect((await withdrawParentOnChain(CHILD, { deps: r.deps })).circuit).toBe('withdrawParent');
  });
});

describe('offspring royalties on chain', () => {
  it('the breeder proposes, the holder accepts, and every confirmed descendant shows it', async () => {
    const r = standIns(contractStateAfter([...all, proposed, confirmed]), allowed);
    await proposeObligationOnChain(BREEDER, identityOf(PARENT), O, { deps: r.deps });
    const pending = standIns(contractStateAfter([...all, proposed, confirmed, owed]), allowed);
    await acceptObligationOnChain(PARENT, O, identityOf(BREEDER), { deps: pending.deps });
    const after = ledger(contractStateAfter([...all, proposed, confirmed, owed, accepted]).data);
    const child = checkLineage(after, bytes(identityOf(CHILD)));
    expect(child.clean).toBe(false);
    expect(child.encumbered.map((a) => Buffer.from(a).toString('hex'))).toEqual([identityOf(PARENT)]);
  });

  it('only the beneficiary releases it; the holder can decline a proposal', async () => {
    const inForce = contractStateAfter([...all, owed, accepted]);
    const no = standIns(inForce, allowed);
    await expect(dischargeOnChain(PARENT, identityOf(PARENT), O, { deps: no.deps })).rejects.toThrow();
    const yes = standIns(inForce, allowed);
    expect((await dischargeOnChain(BREEDER, identityOf(PARENT), O, { deps: yes.deps })).circuit).toBe('discharge');
    const declining = standIns(contractStateAfter([...all, owed]), allowed);
    expect((await rejectObligationOnChain(PARENT, O, identityOf(BREEDER), { deps: declining.deps })).circuit).toBe(
      'rejectObligation',
    );
  });
});
