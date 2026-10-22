// License and payment credentials (credentials.ts): signed by the licensor's deal key in the
// W3C format, accepted by the licensee's page only when they are about this license and them.
import { describe, expect, it } from 'vitest';
import { newPartyKey } from './deal';
import type { DealEntry, DealParty } from './deal-client';
import { credentialsIn, licenseCredential, paymentCredential } from './credentials';
import { publicOfDidKey, signCredential, verifyCredential } from './vc';

const hex64 = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
const breeder = newPartyKey();
const grower = newPartyKey();
const commitment = hex64();
const issuerRecord = hex64();
const issuerParty: DealParty = {
  side: 'issuer',
  mySecret: breeder.secret,
  theirPublic: grower.public,
  commitment,
  issuerRecord,
};
const growerParty: DealParty = {
  side: 'licensee',
  mySecret: grower.secret,
  theirPublic: breeder.public,
  commitment,
  issuerRecord,
};

let n = 0;
const entry = (m: Record<string, unknown>): DealEntry =>
  ({
    seq: ++n,
    fingerprint: hex64(),
    receivedAt: 0,
    signature: hex64() + hex64(),
    mine: false,
    at: Date.now(),
    ...m,
  }) as unknown as DealEntry;

const statement = entry({
  type: 'statement',
  from: 'licensee',
  statementId: 's1',
  periodFrom: '2026-09-01',
  periodTo: '2026-09-30',
  basis: 'sales',
  quantity: '10000',
  currency: 'USD',
  amountOwed: '500.00',
}) as Extract<DealEntry, { type: 'statement' }>;
const received = entry({
  type: 'received',
  from: 'issuer',
  statementId: 's1',
  statementSig: statement.signature,
  amount: '500.00',
  currency: 'USD',
}) as Extract<DealEntry, { type: 'received' }>;

describe('W3C credentials for a license', () => {
  it('the license credential is a standard W3C credential from the licensor to the licensee', () => {
    const c = licenseCredential(issuerParty, {
      agreementType: 'license',
      agreementFingerprint: hex64(),
      agreedAt: Date.UTC(2026, 9, 21),
    });
    const v = verifyCredential(c);
    expect(v.verified).toBe(true);
    expect(publicOfDidKey(c.issuer as string)).toBe(breeder.public);
    expect(publicOfDidKey((c.credentialSubject as { id: string }).id)).toBe(grower.public);
    expect(c.validFrom).toBe('2026-10-21T00:00:00Z');
    // The terms never go in: only their fingerprint.
    expect(JSON.stringify(c)).not.toMatch(/royaltyAmount|terms"/);
  });

  it('only the licensor signs them', () => {
    expect(() =>
      licenseCredential(growerParty, { agreementType: 'license', agreementFingerprint: hex64(), agreedAt: 0 }),
    ).toThrow();
  });

  it('the licensee’s page keeps only credentials from the licensor, about them, for this license', () => {
    const agreed = { agreementType: 'license', agreementFingerprint: hex64() };
    const license = licenseCredential(issuerParty, { ...agreed, agreedAt: 1 });
    // Attack pass 21 Oct, finding 1: a credential for terms other than the ones this page holds.
    const madeUp = licenseCredential(issuerParty, {
      agreementType: 'license',
      agreementFingerprint: hex64(),
      agreedAt: 1,
    });
    // A payment credential whose amount differs from what the licensor confirmed.
    const rawPayment: Record<string, unknown> = { ...paymentCredential(issuerParty, statement, received) };
    delete rawPayment.proof;
    const sub = rawPayment.credentialSubject as { royaltyPayment: Record<string, unknown> };
    const inflated = signCredential(
      { ...rawPayment, credentialSubject: { ...sub, royaltyPayment: { ...sub.royaltyPayment, amount: '5000.00' } } },
      breeder.secret,
    );
    // Unsigned @context added after the proof's.
    const extraContext = { ...license, '@context': [...(license['@context'] as string[]), 'https://evil.example/ctx'] };
    const payment = paymentCredential(issuerParty, statement, received);
    const otherDeal = licenseCredential(
      { ...issuerParty, commitment: hex64() },
      { agreementType: 'license', agreementFingerprint: hex64(), agreedAt: 1 },
    );
    // Signed by someone else, claiming to be the licensor.
    const bare: Record<string, unknown> = { ...license };
    delete bare.proof;
    const forged = signCredential(bare, newPartyKey().secret);
    const tampered = { ...payment, name: 'Changed' };
    const fromGrower = entry({ type: 'credential', from: 'licensee', credential: license });
    const entries = [
      statement,
      received,
      entry({ type: 'credential', from: 'issuer', credential: madeUp }),
      entry({ type: 'credential', from: 'issuer', credential: inflated }),
      entry({ type: 'credential', from: 'issuer', credential: extraContext }),
      entry({ type: 'credential', from: 'issuer', credential: license }),
      entry({ type: 'credential', from: 'issuer', credential: license }), // the same one twice
      entry({ type: 'credential', from: 'issuer', credential: payment }),
      entry({ type: 'credential', from: 'issuer', credential: otherDeal }),
      entry({ type: 'credential', from: 'issuer', credential: forged }),
      entry({ type: 'credential', from: 'issuer', credential: tampered }),
      fromGrower,
    ];
    const got = credentialsIn(entries, growerParty, agreed);
    expect(got.map((c) => c.kind)).toEqual(['license', 'payment']);
    expect(got[0].credential).toBe(license);
    expect(got[1].statementSignature).toBe(statement.signature);
    expect(credentialsIn(entries, issuerParty, agreed).map((c) => c.kind)).toEqual(['license', 'payment']);
    // Without a confirmed payment in the deal, a payment credential isn't kept.
    expect(
      credentialsIn(
        entries.filter((e) => e !== received),
        growerParty,
        agreed,
      ).map((c) => c.kind),
    ).toEqual(['license']);
  });

  it('a payment credential names exactly the statement it confirms', () => {
    expect(() => paymentCredential(issuerParty, statement, { ...received, statementSig: 'ff'.repeat(64) })).toThrow();
  });
});
