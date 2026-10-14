// What a plant's page may say about a lab: only what a signature checked here supports.
import { describe, expect, it } from 'vitest';
import { breederReceipt, labReceipt, reportSigner, signerName } from './custody';
import type { ResolvedAttestation } from './attesters';
import type { StrainRecord } from './records';

const BREEDER = 'b'.repeat(64);
const RECEIVED = 'e'.repeat(64);
const LAB = 'a1'.repeat(16);
const OTHER = 'c3'.repeat(16);

const att = (over: Partial<ResolvedAttestation> & { key?: string }): ResolvedAttestation => {
  const { key = LAB, ...rest } = over;
  return {
    attestationId: `att_${Math.random().toString(16).slice(2, 10)}`,
    type: 'chain-of-custody',
    subjectCommitment: BREEDER,
    attester: { publicKey: key, displayName: 'Test Lab' },
    documentHash: RECEIVED,
    hashAlgorithm: 'sha256',
    issuedAt: '2026-10-14T10:00:00Z',
    signature: 'sig',
    strength: 'signed',
    registeredAs: { displayName: 'Test Lab' },
    retraction: null,
    signatureValid: true,
    ...rest,
  };
};

const plant = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: 'VEIL-1',
  strainName: 'Blue',
  bredBy: 'S',
  dateCreated: '2026-01-01',
  notes: '',
  loggedAt: 1,
  recordFingerprint: BREEDER,
  ...over,
});

describe('the breeder’s “Confirmed by a lab” line', () => {
  it('says yes only on a verified, unwithdrawn receipt signature about this plant', () => {
    expect(breederReceipt(plant(), [att({})])).toMatchObject({ kind: 'signed' });
    expect(breederReceipt(plant(), [])).toEqual({ kind: 'none' });
    // A signature that doesn't verify, a withdrawn one, another plant's, or a lab report: no.
    for (const bad of [
      att({ signatureValid: false }),
      att({
        retraction: { attestationId: 'x', attesterPublicKey: LAB, reason: 'other', retractedAt: 'x', signature: 's' },
      }),
      att({ subjectCommitment: 'f'.repeat(64) }),
      att({ type: 'laboratory-report' }),
    ]) {
      expect(breederReceipt(plant(), [bad]).kind).toBe('none');
    }
  });

  it('a used code with no signature (the breeder themself, or a lab that didn’t sign) is only “code used”', () => {
    const used = plant({ attestation: { attestedAt: 1, type: 'receipt-confirmed', addressedTo: 'lab' } });
    expect(breederReceipt(used, [])).toEqual({ kind: 'code-used' });
    expect(breederReceipt(used, [att({})]).kind).toBe('signed');
  });

  it('prefers a key VeilCore has checked, and names others as self-named', () => {
    const vetted = att({ key: OTHER, vettedAttester: true, registeredAs: { displayName: 'Checked Lab' } });
    const r = breederReceipt(plant(), [att({}), vetted]);
    expect(r.kind === 'signed' && r.by.attester.publicKey).toBe(OTHER);
    expect(signerName(vetted)).toEqual({ name: 'Checked Lab', checked: true });
    expect(signerName(att({}))).toEqual({ name: 'a lab key self-named “Test Lab”', checked: false });
  });
});

describe('the lab’s “You confirmed receipt” line', () => {
  const received = plant({
    id: 'VEIL-R',
    recordFingerprint: RECEIVED,
    receivedFrom: 'VEIL-1',
    receivedFromCommitment: BREEDER,
    // The registry writes this when the code is used, signed or not.
    attestation: { attestedAt: 1, type: 'receipt-confirmed' },
  });

  it('reads the lab’s own signature for this sample, nothing else', () => {
    expect(labReceipt(received, [att({})], LAB)).toMatchObject({ kind: 'signed' });
    expect(labReceipt(received, [], LAB)).toEqual({ kind: 'not-signed' });
    // Another key's receipt, or this key's receipt for a different sample of the plant.
    expect(labReceipt(received, [att({ key: OTHER })], LAB).kind).toBe('not-signed');
    expect(labReceipt(received, [att({ documentHash: '9'.repeat(64) })], LAB).kind).toBe('not-signed');
    expect(labReceipt(received, [att({})], undefined).kind).toBe('not-signed');
  });

  it('a sample turned away signs nothing and says so', () => {
    const turned = { ...received, receiptRejected: { reason: 'damaged' as const, at: 5 } };
    expect(labReceipt(turned, [], LAB)).toEqual({ kind: 'rejected', reason: 'damaged', at: 5 });
  });
});

describe('who signed a lab report', () => {
  const SHA = '5'.repeat(64);
  const report = (key = LAB, id = 'att_r') =>
    att({ key, type: 'laboratory-report', documentHash: SHA, attestationId: id });

  it('is the lab only when the same key signed receipt of this delivery’s sample', () => {
    const input = { sha: SHA, attestationId: 'att_r', subject: BREEDER, receivedFingerprint: RECEIVED };
    expect(reportSigner([report(), att({})], input).kind).toBe('this-delivery');
    // A key that only signed the report, or signed receipt of another delivery: not the lab's.
    expect(reportSigner([report()], input).kind).toBe('other-key');
    expect(reportSigner([report(), att({ documentHash: '9'.repeat(64) })], input).kind).toBe('other-key');
    expect(reportSigner([report(OTHER), att({})], input).kind).toBe('other-key');
  });

  it('without the delivery’s record, the key must at least have signed for this plant', () => {
    const input = { sha: SHA, attestationId: 'att_r', subject: BREEDER };
    expect(reportSigner([report(), att({ documentHash: '9'.repeat(64) })], input).kind).toBe('this-plant');
    expect(reportSigner([report()], input).kind).toBe('other-key');
  });

  it('no verified signature over this exact file, linked to this result, is unsigned', () => {
    const base = { sha: SHA, subject: BREEDER, receivedFingerprint: RECEIVED };
    expect(reportSigner([att({})], base).kind).toBe('unsigned');
    expect(reportSigner([report(), att({})], { ...base, sha: '6'.repeat(64) }).kind).toBe('unsigned');
    expect(reportSigner([report(), att({})], { ...base, attestationId: 'att_other' }).kind).toBe('unsigned');
    expect(reportSigner([{ ...report(), signatureValid: false }, att({})], base).kind).toBe('unsigned');
  });
});

describe('a lab’s own notes on a received sample', () => {
  it('stay outside the fingerprint, so writing them never changes what the lab signed', async () => {
    const { fingerprintRecord } = await import('./commitment');
    const r = { ...plant(), nonce: '4'.repeat(64) };
    const before = await fingerprintRecord(r);
    const withNotes = {
      ...r,
      deliveryNote: 'keep cold',
      labRef: 'ACC-0042',
      resultLock: 'age1x',
      receiptRejected: { reason: 'damaged' as const, at: 1 },
    };
    expect(await fingerprintRecord(withNotes)).toBe(before);
  });
});
