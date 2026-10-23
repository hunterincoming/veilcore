// Handing a live license on (hand-on.ts), end to end against the stand-ins (the real compiled
// contract and circuits, the real sponsor policy): the new holder builds a commitment against
// the license's issuing record, the current holder proposes it, the issuer approves exactly
// it. The checks that matter: nobody can move it alone, the issuer can't be steered to another
// commitment, the new holder ends up holding a live license with no countersign, and their
// secret never leaves their browser.
import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { createVeilcorePrivateState, withLicense } from '../../../../contract/src/witnesses';
import {
  approveTransferOnChain,
  identityOf,
  licenseKeyOf,
  licenseRequestAgainst,
  licenseRequestFor,
  proposeTransferOnChain,
  proveLicenseOnChain,
  recoveryCommitmentOf,
  withdrawTransferOnChain,
} from './actions';
import { contractStateAfter, standIns } from './test-chain';
import { BROWSER_CIRCUITS } from './config';
import { AGREEMENT_CIRCUITS, PHASE1_PUBLIC_CIRCUITS } from '../../../../sponsor/src/policy';

setNetworkId('preprod');

const ISSUER = new Uint8Array(32).fill(0x31);
const OTHER_ISSUER = new Uint8Array(32).fill(0x41);
const RECOVERY = new Uint8Array(32).fill(0x13);
const HOLDER = new Uint8Array(32).fill(0x7c);
const NEW_HOLDER = new Uint8Array(32).fill(0x5d);
const STRANGER = new Uint8Array(32).fill(0x66);
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const contains = (hay: Uint8Array, needle: Uint8Array): boolean => Buffer.from(hay).indexOf(Buffer.from(needle)) !== -1;
const sponsored = { allowedCircuits: [...PHASE1_PUBLIC_CIRCUITS, ...AGREEMENT_CIRCUITS] };

const anchored = (secret = ISSUER) => ({ secret, circuit: 'anchor' as const, args: [recoveryCommitmentOf(RECOVERY)] });
const issuerIdentity = identityOf(ISSUER);
const first = licenseRequestFor(HOLDER, issuerIdentity, ledger(contractStateAfter([anchored()]).data));
const asLicensee = (secret: Uint8Array) =>
  withLicense(createVeilcorePrivateState(new Uint8Array(32)), secret, bytes(first.issuerRecord));
/** A live license: anchored, issued, countersigned by HOLDER. */
const liveSteps = [
  anchored(),
  anchored(OTHER_ISSUER),
  { secret: ISSUER, circuit: 'issueLicense' as const, args: [bytes(first.commitment)] },
  {
    secret: HOLDER,
    circuit: 'countersignLicense' as const,
    args: [bytes(first.issuerRecord), 77n],
    privateState: asLicensee(HOLDER),
  },
];
const statusOf = (state: ContractState, commitment: string) => {
  const l = ledger(state.data);
  const k = bytes(licenseKeyOf(commitment, first.issuerRecord));
  return l.licenseStatusOf.member(k) ? l.licenseStatusOf.lookup(k) : undefined;
};
const live = contractStateAfter(liveSteps);
const next = licenseRequestAgainst(NEW_HOLDER, issuerIdentity, first.issuerRecord, ledger(live.data));
const proposed = {
  secret: HOLDER,
  circuit: 'proposeTransfer' as const,
  args: [bytes(first.issuerRecord), bytes(next.commitment)],
  privateState: asLicensee(HOLDER),
};
const approved = {
  secret: ISSUER,
  circuit: 'approveTransfer' as const,
  args: [bytes(first.commitment), bytes(first.issuerRecord), bytes(next.commitment)],
};

describe('handing a license on (stand-in network)', () => {
  it('the site and the sponsor allow the three hand-on calls', () => {
    for (const c of ['proposeTransfer', 'approveTransfer', 'withdrawTransfer']) {
      expect(BROWSER_CIRCUITS).toContain(c);
      expect(AGREEMENT_CIRCUITS).toContain(c);
    }
  });

  it('the new holder builds against the license’s issuing record, and only the issuer’s own', () => {
    expect(next.issuerRecord).toBe(first.issuerRecord);
    expect(next.commitment).not.toBe(first.commitment);
    expect(next.commitment).not.toContain(hex(NEW_HOLDER));
    // A link naming another issuer's record is refused before anything is sent.
    expect(() =>
      licenseRequestAgainst(NEW_HOLDER, issuerIdentity, identityOf(OTHER_ISSUER), ledger(live.data)),
    ).toThrow(/isn’t the sender’s/);
  });

  it('the holder proposes it: one sponsored call, the secret stays in the browser', async () => {
    const r = standIns(live, sponsored);
    const receipt = await proposeTransferOnChain(HOLDER, first.issuerRecord, next.commitment, { deps: r.deps });
    expect(receipt.circuit).toBe('proposeTransfer');
    expect(r.sealed).toHaveLength(1);
    expect(r.requests.some((q) => `${q.url} ${q.body ?? ''}`.includes(hex(HOLDER)))).toBe(false);
    expect(r.sealed.some((b) => contains(b, HOLDER))).toBe(false);
  });

  it('nobody else can propose it: not the issuer, not a stranger', async () => {
    for (const who of [ISSUER, STRANGER]) {
      const r = standIns(live, sponsored);
      await expect(
        proposeTransferOnChain(who, first.issuerRecord, next.commitment, { deps: r.deps }),
      ).rejects.toThrow();
      expect(r.sealed).toHaveLength(0);
    }
  });

  it('the issuer approves exactly the proposed one; another commitment, or another issuer, is refused', async () => {
    const s = contractStateAfter([...liveSteps, proposed]);
    const wrong = licenseRequestAgainst(STRANGER, issuerIdentity, first.issuerRecord, ledger(s.data));
    const no = standIns(s, sponsored);
    await expect(
      approveTransferOnChain(ISSUER, first.commitment, first.issuerRecord, wrong.commitment, { deps: no.deps }),
    ).rejects.toThrow();
    await expect(
      approveTransferOnChain(OTHER_ISSUER, first.commitment, first.issuerRecord, next.commitment, { deps: no.deps }),
    ).rejects.toThrow();
    expect(no.sealed).toHaveLength(0);
    const ok = standIns(s, sponsored);
    expect(
      (await approveTransferOnChain(ISSUER, first.commitment, first.issuerRecord, next.commitment, { deps: ok.deps }))
        .circuit,
    ).toBe('approveTransfer');
  });

  it('the issuer can’t move it without a proposal', async () => {
    const r = standIns(live, sponsored);
    await expect(
      approveTransferOnChain(ISSUER, first.commitment, first.issuerRecord, next.commitment, { deps: r.deps }),
    ).rejects.toThrow();
  });

  it('after approval: the new holder’s license is live with no countersign, the old one is gone', async () => {
    const s = contractStateAfter([...liveSteps, proposed, approved]);
    expect(statusOf(s, first.commitment)).toBeUndefined();
    expect(statusOf(s, next.commitment)).toBeDefined();
    // The new holder can prove it; the old holder can't.
    const ok = standIns(s, sponsored);
    expect(
      (await proveLicenseOnChain(NEW_HOLDER, first.issuerRecord, 'cd'.repeat(32), { deps: ok.deps })).circuit,
    ).toBe('proveLicense');
    const old = standIns(s, sponsored);
    await expect(
      proveLicenseOnChain(HOLDER, first.issuerRecord, 'cd'.repeat(32), { deps: old.deps }),
    ).rejects.toThrow();
  });

  it('the holder can take a proposal back before approval, and then it can’t be approved', async () => {
    const s = contractStateAfter([...liveSteps, proposed]);
    const r = standIns(s, sponsored);
    expect((await withdrawTransferOnChain(HOLDER, first.issuerRecord, { deps: r.deps })).circuit).toBe(
      'withdrawTransfer',
    );
    const after = contractStateAfter([
      ...liveSteps,
      proposed,
      { ...proposed, circuit: 'withdrawTransfer' as const, args: [bytes(first.issuerRecord)] },
    ]);
    const no = standIns(after, sponsored);
    await expect(
      approveTransferOnChain(ISSUER, first.commitment, first.issuerRecord, next.commitment, { deps: no.deps }),
    ).rejects.toThrow();
  });
});
