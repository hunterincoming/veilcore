// A real two-party licence from two browsers, end to end against the stand-ins (the real
// compiled contract and circuit IR, real sealing, the real sponsor policy): the licensee
// builds the commitment from its own secret, the issuer issues it, the licensee countersigns
// and can then prove a live licence; the issuer can revoke. The checks that matter: each
// call is one the sponsor would pay for once licence calls are allowed (and only then), the
// contract refuses the wrong party here before anything is sent, and the licence secret
// never leaves the licensee's browser.
import { describe, expect, it } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { createVeilcorePrivateState, withLicense } from '../../../../contract/src/witnesses';
import {
  countersignLicenceOnChain,
  identityOf,
  issueLicenceOnChain,
  licenceKeyOf,
  licenceRequestFor,
  proveLicenceOnChain,
  recoveryCommitmentOf,
  revokeLicenceOnChain,
} from './actions';
import { contractStateAfter, standIns } from './test-chain';

setNetworkId('preprod');

const ISSUER = new Uint8Array(32).fill(0x31);
const RECOVERY = new Uint8Array(32).fill(0x13);
const LICENSEE = new Uint8Array(32).fill(0x7c);
const STRANGER = new Uint8Array(32).fill(0x66);
const LICENCE_CALLS = [
  'anchor',
  'proveOwnership',
  'pairDna',
  'issueLicense',
  'countersignLicense',
  'proveLicense',
  'revokeLicense',
];
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const contains = (hay: Uint8Array, needle: Uint8Array): boolean => Buffer.from(hay).indexOf(Buffer.from(needle)) !== -1;

const anchored = { secret: ISSUER, circuit: 'anchor' as const, args: [recoveryCommitmentOf(RECOVERY)] };
const issuerIdentity = identityOf(ISSUER);
const req = (state: ContractState, secret = LICENSEE) => licenceRequestFor(secret, issuerIdentity, ledger(state.data));
const issued = (commitment: string) => ({
  secret: ISSUER,
  circuit: 'issueLicense' as const,
  args: [bytes(commitment)],
});
const countersigned = (issuerRecord: string, slot = 77n) => ({
  secret: LICENSEE,
  circuit: 'countersignLicense' as const,
  args: [bytes(issuerRecord), slot],
  privateState: withLicense(createVeilcorePrivateState(new Uint8Array(32)), LICENSEE, bytes(issuerRecord)),
});
const statusOf = (state: ContractState, commitment: string, issuerRecord: string) => {
  const l = ledger(state.data);
  const k = bytes(licenceKeyOf(commitment, issuerRecord));
  return l.licenseStatusOf.member(k) ? l.licenseStatusOf.lookup(k) : undefined;
};
const secretLeft = (r: ReturnType<typeof standIns>, secret: Uint8Array) =>
  r.requests.some((q) => `${q.url} ${q.body ?? ''}`.includes(hex(secret))) || r.sealed.some((b) => contains(b, secret));

describe('a real licence between two browsers (stand-in network)', () => {
  it("the licensee's commitment is built against the issuer's current head, and says nothing of the secret", () => {
    const s = contractStateAfter([anchored]);
    const a = req(s);
    expect(a.issuerRecord).toBe(issuerIdentity);
    expect(a.commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(a.commitment).not.toContain(hex(LICENSEE));
    expect(req(s, STRANGER).commitment).not.toBe(a.commitment);
  });

  it('the issuer issues it: one call the sponsor pays for once licence calls are allowed, and not before', async () => {
    const s = contractStateAfter([anchored]);
    const { commitment } = req(s);
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    const receipt = await issueLicenceOnChain(ISSUER, commitment, { deps: r.deps });
    expect(receipt.circuit).toBe('issueLicense');
    expect(r.checkedCircuits).toEqual(['issueLicense']);
    expect(r.sealed).toHaveLength(1);
    expect(secretLeft(r, ISSUER)).toBe(false);
    // A sponsor that pays only for the record calls refuses it.
    const old = standIns(s);
    await expect(issueLicenceOnChain(ISSUER, commitment, { deps: old.deps })).rejects.toThrow();
    expect(old.sealed).toHaveLength(0);
  });

  it('only the record can issue from itself: a stranger is refused here, before anything is sent', async () => {
    const s = contractStateAfter([anchored]);
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    await expect(issueLicenceOnChain(STRANGER, req(s).commitment, { deps: r.deps })).rejects.toThrow();
    expect(r.sealed).toHaveLength(0);
  });

  it('the licensee countersigns with its own secret; the secret never leaves its browser', async () => {
    const s0 = contractStateAfter([anchored]);
    const { commitment, issuerRecord } = req(s0);
    const s = contractStateAfter([anchored, issued(commitment)]);
    expect(statusOf(s, commitment, issuerRecord)).toBeDefined();
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    const receipt = await countersignLicenceOnChain(LICENSEE, issuerRecord, { deps: r.deps });
    expect(receipt.circuit).toBe('countersignLicense');
    expect(r.sealed).toHaveLength(1);
    expect(secretLeft(r, LICENSEE)).toBe(false);
  });

  it('someone without the licence secret cannot countersign it (refused here, nothing sent)', async () => {
    const s0 = contractStateAfter([anchored]);
    const { commitment, issuerRecord } = req(s0);
    const s = contractStateAfter([anchored, issued(commitment)]);
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    await expect(countersignLicenceOnChain(STRANGER, issuerRecord, { deps: r.deps })).rejects.toThrow(
      /No such license/,
    );
    expect(r.sealed).toHaveLength(0);
  });

  it('once active, the licensee proves a live licence to one verifier, without the secret', async () => {
    const s0 = contractStateAfter([anchored]);
    const { commitment, issuerRecord } = req(s0);
    const s = contractStateAfter([anchored, issued(commitment), countersigned(issuerRecord)]);
    const challenge = 'e1'.repeat(32);
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    const receipt = await proveLicenceOnChain(LICENSEE, issuerRecord, challenge, { deps: r.deps });
    expect(receipt.circuit).toBe('proveLicense');
    expect(secretLeft(r, LICENSEE)).toBe(false);
    // Not before it is active.
    const pending = contractStateAfter([anchored, issued(commitment)]);
    const p = standIns(pending, { allowedCircuits: LICENCE_CALLS });
    await expect(proveLicenceOnChain(LICENSEE, issuerRecord, challenge, { deps: p.deps })).rejects.toThrow();
    expect(p.sealed).toHaveLength(0);
  });

  it('the issuer revokes it; a stranger cannot', async () => {
    const s0 = contractStateAfter([anchored]);
    const { commitment, issuerRecord } = req(s0);
    const s = contractStateAfter([anchored, issued(commitment), countersigned(issuerRecord)]);
    const r = standIns(s, { allowedCircuits: LICENCE_CALLS });
    expect((await revokeLicenceOnChain(ISSUER, commitment, issuerRecord, { deps: r.deps })).circuit).toBe(
      'revokeLicense',
    );
    const x = standIns(s, { allowedCircuits: LICENCE_CALLS });
    await expect(revokeLicenceOnChain(STRANGER, commitment, issuerRecord, { deps: x.deps })).rejects.toThrow();
    expect(x.sealed).toHaveLength(0);
  });
});
