// A real license between two browsers: the checks each side makes on the other's step
// (license-invites.ts verify*, against the real contract on the stand-in network), and the
// licensee's key in this browser and its backup (held-licenses.ts, backup.ts).
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../../contract/src/managed/veilcore/contract/index.js';
import { createVeilcorePrivateState, withLicense } from '../../../contract/src/witnesses';
import { identityOf, licenseRequestFor, recoveryCommitmentOf } from './chain/actions';
import { contractStateAfter } from './chain/test-chain';
import {
  commitHashOf,
  headNow,
  invitePath,
  licenseCode,
  licenseStatusNow,
  verifyActivated,
  verifyIssued,
} from './license-invites';
import {
  heldLicense,
  heldLicensesForBackup,
  heldMissingFrom,
  keepHeldLicense,
  markHeldBackedUp,
  mergeHeldLicenses,
  resetHeldLicensesForTests,
  updateHeldLicense,
  type HeldLicense,
} from './held-licenses';

setNetworkId('preprod');

const ISSUER = new Uint8Array(32).fill(0x31);
const RECOVERY = new Uint8Array(32).fill(0x13);
const LICENSEE = new Uint8Array(32).fill(0x7c);
const bytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const anchored = { secret: ISSUER, circuit: 'anchor' as const, args: [recoveryCommitmentOf(RECOVERY)] };
const req = licenseRequestFor(LICENSEE, identityOf(ISSUER), ledger(contractStateAfter([anchored]).data));
const issued = { secret: ISSUER, circuit: 'issueLicense' as const, args: [bytes(req.commitment)] };
const countersigned = {
  secret: LICENSEE,
  circuit: 'countersignLicense' as const,
  args: [bytes(req.issuerRecord), 5n],
  privateState: withLicense(createVeilcorePrivateState(new Uint8Array(32)), LICENSEE, bytes(req.issuerRecord)),
};
/** The stand-in for "the contract state right after that transaction". */
const after = (s: ContractState) => () => Promise.resolve(ledger(s.data));
const TX = 'ab'.repeat(32);

describe('each side checks the other on chain, never the registry', () => {
  it('the licensee accepts an issue only when the chain shows this license', async () => {
    expect(
      (await verifyIssued(TX, req.commitment, req.issuerRecord, after(contractStateAfter([anchored, issued])))).ok,
    ).toBe(true);
    // A transaction that issued something else (or nothing) is refused.
    const v = await verifyIssued(TX, req.commitment, req.issuerRecord, after(contractStateAfter([anchored])));
    expect(v).toEqual({ ok: false, reason: 'That transaction did not issue this license.' });
    expect(
      (await verifyIssued('not a tx', req.commitment, req.issuerRecord, after(contractStateAfter([anchored])))).ok,
    ).toBe(false);
  });

  it('the issuer calls it live only when the chain shows it ACTIVE', async () => {
    const pending = after(contractStateAfter([anchored, issued]));
    expect((await verifyActivated(TX, req.commitment, req.issuerRecord, pending)).ok).toBe(false);
    const live = after(contractStateAfter([anchored, issued, countersigned]));
    expect(await verifyActivated(TX, req.commitment, req.issuerRecord, live)).toEqual({
      ok: true,
      reason: 'Countersigned on chain: the license is live.',
    });
  });

  it('a lookup that fails (wrong call, not found) is a refusal, not a pass', async () => {
    const boom = () =>
      Promise.reject(new Error('That transaction is not a single countersignLicense call on this contract.'));
    expect(await verifyActivated(TX, req.commitment, req.issuerRecord, boom)).toEqual({
      ok: false,
      reason: 'That transaction is not a single countersignLicense call on this contract.',
    });
  });

  it('the issuer reads its own head from the chain, so an answer naming another record is caught (attack round)', async () => {
    const read = () => Promise.resolve(ledger(contractStateAfter([anchored]).data));
    expect(await headNow(identityOf(ISSUER), read)).toBe(req.issuerRecord);
    // An answer naming someone else's record never equals this record's head.
    const other = licenseRequestFor(
      LICENSEE,
      identityOf(new Uint8Array(32).fill(0x44)),
      ledger(contractStateAfter([anchored]).data),
    );
    expect(other.issuerRecord).not.toBe(await headNow(identityOf(ISSUER), read));
  });

  it('the issuer reads the license status on chain itself, so a junk posted transaction cannot stall it', async () => {
    const status = (steps: Parameters<typeof contractStateAfter>[0]) =>
      licenseStatusNow(req.commitment, req.issuerRecord, () => Promise.resolve(ledger(contractStateAfter(steps).data)));
    expect(await status([anchored])).toBe('none');
    expect(await status([anchored, issued])).toBe('PENDING');
    expect(await status([anchored, issued, countersigned])).toBe('ACTIVE');
  });

  it('the first message is SHA-256 of the three raw values, the same as the registry checks', async () => {
    const [c, h, n] = ['11'.repeat(32), '22'.repeat(32), '33'.repeat(32)];
    const want = createHash('sha256')
      .update(Buffer.from(c + h + n, 'hex'))
      .digest('hex');
    expect(await commitHashOf(c, h, n)).toBe(want);
  });

  it('the read-aloud code is 6 digits, the same on both sides, and changes if any part is swapped', async () => {
    const parts = ['11'.repeat(32), '22'.repeat(32), '33'.repeat(32), '44'.repeat(32)] as const;
    const code = await licenseCode(...parts);
    expect(code).toMatch(/^\d{3} \d{3}$/);
    expect(await licenseCode(...parts)).toBe(code);
    for (let i = 0; i < 4; i++) {
      const other = [...parts] as [string, string, string, string];
      other[i] = '55'.repeat(32);
      expect(await licenseCode(...other)).not.toBe(code);
    }
  });

  it("the licensee's link keeps its token in the fragment, which browsers never send", () => {
    expect(invitePath('LI-' + 'A'.repeat(32), 'tok_en-123')).toBe(`/license-invite/LI-${'A'.repeat(32)}#t=tok_en-123`);
  });
});

const held = (over: Partial<HeldLicense> = {}): HeldLicense => ({
  inviteId: 'LI-' + '1'.repeat(32),
  secret: 'aa'.repeat(32),
  commitment: req.commitment,
  identity: identityOf(ISSUER),
  issuerRecord: req.issuerRecord,
  licenseeNonce: '66'.repeat(32),
  label: 'Green Valley Farms',
  acceptedAt: 1,
  ...over,
});

describe("the licensee's key in this browser and its backup", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
    resetHeldLicensesForTests();
  });

  it('the first key for an invite is kept, never replaced, and never changes', () => {
    keepHeldLicense(held());
    keepHeldLicense(held({ secret: 'bb'.repeat(32) }));
    expect(heldLicense(held().inviteId)?.secret).toBe('aa'.repeat(32));
    expect(() => updateHeldLicense(held().inviteId, (h) => ({ ...h, secret: 'cc'.repeat(32) }))).toThrow();
    updateHeldLicense(held().inviteId, (h) => ({ ...h, issueTx: TX }));
    resetHeldLicensesForTests(); // read back from storage
    expect(heldLicense(held().inviteId)?.issueTx).toBe(TX);
  });

  it('the backup holds the key; a checked file marks it backed up; a file without it does not pass', () => {
    keepHeldLicense(held());
    const file = heldLicensesForBackup();
    expect(file[0].secret).toBe('aa'.repeat(32));
    expect(heldMissingFrom([])).toHaveLength(1);
    expect(heldMissingFrom(file)).toHaveLength(0);
    // A file with a different secret for the same invite does not count.
    expect(heldMissingFrom([{ ...file[0], secret: 'dd'.repeat(32) }])).toHaveLength(1);
    markHeldBackedUp(file, 99);
    expect(heldLicense(held().inviteId)?.backedUpAt).toBe(99);
  });

  it('restoring adds the licenses a browser lacks and never replaces one it has', () => {
    keepHeldLicense(held());
    const other = held({ inviteId: 'LI-' + '2'.repeat(32), secret: 'ee'.repeat(32) });
    expect(mergeHeldLicenses([{ ...held(), secret: 'ff'.repeat(32) }, other, { junk: true }])).toBe(1);
    expect(heldLicense(held().inviteId)?.secret).toBe('aa'.repeat(32));
    expect(heldLicense(other.inviteId)?.secret).toBe('ee'.repeat(32));
  });
});
