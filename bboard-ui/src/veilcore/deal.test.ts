// The private channel between licensor and licensee (deal.ts).
import { describe, expect, it } from 'vitest';
import {
  dealKeys,
  newPartyKey,
  openMessage,
  sealMessage,
  verifyDisclosed,
  verifyStrict,
  type DealMessage,
} from './deal';
import { amountOwed, ledgerOf } from '../components/licensing/RoyaltyLedger';
import type { DealEntry } from './deal-client';

const C = '11'.repeat(32);
const H = '22'.repeat(32);
const issuer = newPartyKey();
const licensee = newPartyKey();
const statement: DealMessage = {
  type: 'statement',
  statementId: 's1',
  periodFrom: '2026-07-01',
  periodTo: '2026-09-30',
  basis: 'sales',
  quantity: '10000',
  currency: 'USD',
  amountOwed: '500.00',
  from: 'licensee',
  at: 1,
};

describe('the deal channel', () => {
  it('both sides derive the same channel, and nobody else does', async () => {
    const a = await dealKeys(issuer.secret, licensee.public, C, H);
    const b = await dealKeys(licensee.secret, issuer.public, C, H);
    expect(a.dealId).toBe(b.dealId);
    expect(a.writeToken).toBe(b.writeToken);
    const other = await dealKeys(newPartyKey().secret, issuer.public, C, H);
    expect(other.dealId).not.toBe(a.dealId);
    // The same two keys for another license: another channel.
    expect((await dealKeys(issuer.secret, licensee.public, C, '33'.repeat(32))).dealId).not.toBe(a.dealId);
  });

  it('a message opens for the other side, signed by its sender', async () => {
    const mine = await dealKeys(licensee.secret, issuer.public, C, H);
    const theirs = await dealKeys(issuer.secret, licensee.public, C, H);
    const sealed = await sealMessage(statement, licensee.secret, mine);
    const o = await openMessage(sealed, theirs, 'issuer');
    expect(o?.message).toEqual(statement);
    expect(o?.mine).toBe(false);
    // Anyone shown it later can check it against the licensee's public key.
    expect(verifyDisclosed(statement, o!.signature, licensee.public)).toBe(true);
    expect(verifyDisclosed({ ...statement, amountOwed: '5.00' }, o!.signature, licensee.public)).toBe(false);
  });

  it('one side cannot write in the other’s name, and a changed message does not open', async () => {
    const issuerKeys = await dealKeys(issuer.secret, licensee.public, C, H);
    const licenseeKeys = await dealKeys(licensee.secret, issuer.public, C, H);
    // The licensee claims the issuer accepted: signed with the licensee's key, so it fails.
    const forged = await sealMessage(
      { type: 'reply', statementId: 's1', statementSig: 'aa', decision: 'accepted', from: 'issuer', at: 2 },
      licensee.secret,
      licenseeKeys,
    );
    expect(await openMessage(forged, issuerKeys, 'issuer')).toBeUndefined();
    expect(await openMessage(forged, licenseeKeys, 'licensee')).toBeUndefined();
    const sealed = await sealMessage(statement, licensee.secret, licenseeKeys);
    const flipped = { ...sealed, ct: (sealed.ct[0] === 'A' ? 'B' : 'A') + sealed.ct.slice(1) };
    expect(await openMessage(flipped, issuerKeys, 'issuer')).toBeUndefined();
  });
});

describe('royalties', () => {
  it('owed: a percent of sales, or a fee per unit, to the cent', () => {
    expect(amountOwed({ royaltyType: 'percent', royaltyAmount: '5' }, '10000')).toBe('500.00');
    expect(amountOwed({ royaltyType: 'flat', royaltyAmount: '2.5' }, '41')).toBe('102.50');
    expect(amountOwed({ royaltyType: 'percent', royaltyAmount: '5' }, '')).toBe('0.00');
  });

  it('the ledger takes each side’s word only on its own steps', () => {
    const e = (m: Partial<DealEntry> & { type: string; from: 'issuer' | 'licensee' }, seq: number) =>
      ({ seq, fingerprint: '', receivedAt: 0, signature: String(seq), mine: false, at: seq, ...m }) as DealEntry;
    const entries = [
      e({ ...statement }, 1),
      // The licensee can't accept its own statement, nor the issuer say it paid.
      e({ type: 'reply', statementId: 's1', statementSig: '1', decision: 'accepted', from: 'licensee' }, 2),
      e(
        {
          type: 'paid',
          statementId: 's1',
          statementSig: '1',
          payTo: 'x',
          amount: '500.00',
          currency: 'USD',
          method: 'x',
          reference: '',
          paidOn: '2026-10-01',
          from: 'issuer',
        },
        3,
      ),
      e({ type: 'reply', statementId: 's1', statementSig: '1', decision: 'accepted', from: 'issuer' }, 4),
    ];
    const { lines } = ledgerOf(entries);
    expect(lines).toHaveLength(1);
    expect(lines[0].reply?.seq).toBe(4);
    expect(lines[0].paid).toBeUndefined();
  });
});

describe('strict signatures', () => {
  it('refuse a small-order public key, with which a trivial signature passes lenient checks', () => {
    // The identity point (y = 1) and the signature R = identity, S = 0.
    const pub = new Uint8Array(32);
    pub[0] = 1;
    const sig = new Uint8Array(64);
    sig[0] = 1;
    expect(verifyStrict(sig, new TextEncoder().encode('anything'), pub)).toBe(false);
  });
});

describe('a reply counts for one statement only', () => {
  it('two statements with the same id: each reply names its statement by signature', () => {
    const e = (m: Record<string, unknown>, sig: string, at: number) =>
      ({ seq: at, fingerprint: '', receivedAt: 0, signature: sig, mine: false, at, ...m }) as unknown as DealEntry;
    const a = e({ ...statement, amountOwed: '5.00' }, 'sa', 1);
    const b = e({ ...statement, amountOwed: '500.00' }, 'sb', 2);
    const reply = e(
      { type: 'reply', statementId: 's1', statementSig: 'sa', decision: 'accepted', from: 'issuer' },
      'r',
      3,
    );
    const { lines } = ledgerOf([a, b, reply]);
    expect(lines.find((l) => l.statement.signature === 'sa')?.reply?.decision).toBe('accepted');
    expect(lines.find((l) => l.statement.signature === 'sb')?.reply).toBeUndefined();
  });
});
