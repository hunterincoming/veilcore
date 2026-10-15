// What a plant's page may say about a lab: only what a signature checked here supports.
import { describe, expect, it } from 'vitest';
import {
  breederReceipt,
  labReceipt,
  receiptLineFor,
  receiptSignedLine,
  reportSigner,
  signedByWords,
  signerName,
} from './custody';
import type { SentTransfer } from './transfers';
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

/** A current name check for `name` (round 4): the registry's record behind a mark. */
const checkFor = (name: string) => ({
  source: 'licence-listing' as const,
  sourceUrl: 'https://www.cannabis.example.gov/testing-labs',
  licenceNo: 'TL-000123',
  emailDomain: 'checkedlab.example',
  checkedAt: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
  checkedBy: 'HR',
  expiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10),
  checkedName: name,
});
const MATCHED =
  /^VeilCore’s operator matched this name to cannabis\.example\.gov \(license TL-000123\) on \d{4}-\d{2}-\d{2}\. VeilCore doesn’t vouch for the lab’s work\.$/;

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

/** The breeder's deliveries of plant VEIL-1, as GET /transfers/sent lists them. */
const sentWith = (receiptId?: string, over: Partial<SentTransfer> = {}): SentTransfer[] => [
  {
    id: 'TR-0A1B2C3D',
    source_record: 'VEIL-1',
    to_handle: 'lab',
    created_at: 1,
    claimed_at: 2,
    ...(receiptId ? { receipt_attestation_id: receiptId } : {}),
    ...over,
  },
];

describe('the breeder’s receipt line', () => {
  it('counts only a receipt the lab linked to one of the breeder’s own deliveries of this plant', () => {
    const r = att({ attestationId: 'att_receipt' });
    expect(breederReceipt(plant(), [r], sentWith('att_receipt'))).toMatchObject({
      kind: 'signed',
      transferId: 'TR-0A1B2C3D',
      others: 0,
    });
    expect(breederReceipt(plant(), [], [])).toEqual({ kind: 'none', others: 0 });
    // A signature that doesn't verify, a withdrawn one, another plant's, or a lab report: no.
    for (const bad of [
      att({ attestationId: 'att_receipt', signatureValid: false }),
      att({
        attestationId: 'att_receipt',
        retraction: { attestationId: 'x', attesterPublicKey: LAB, reason: 'other', retractedAt: 'x', signature: 's' },
      }),
      att({ attestationId: 'att_receipt', subjectCommitment: 'f'.repeat(64) }),
      att({ attestationId: 'att_receipt', type: 'laboratory-report' }),
    ]) {
      expect(breederReceipt(plant(), [bad], sentWith('att_receipt')).kind).toBe('code-used');
    }
  });

  it('an attacker’s key named “Acme Labs” signing over the public fingerprint is never a receipt', () => {
    // Self-registered, signed, verifies, unwithdrawn, about this plant: everything but linked.
    const acme = att({
      key: OTHER,
      attestationId: 'att_acme',
      registeredAs: { displayName: 'Acme Labs' },
      attester: { publicKey: OTHER, displayName: 'Acme Labs' },
    });
    expect(breederReceipt(plant(), [acme], [])).toEqual({ kind: 'none', others: 1 });
    expect(breederReceipt(plant(), [acme], sentWith())).toEqual({ kind: 'code-used', others: 1 });
    // Even a key VeilCore's operator named doesn't count unless it is the linked receipt.
    const vettedAcme = {
      ...acme,
      vettedAttester: true,
      registeredAs: { displayName: 'Acme Labs', nameCheck: checkFor('Acme Labs') },
    };
    expect(breederReceipt(plant(), [vettedAcme], sentWith('att_receipt')).kind).toBe('code-used');
    // A delivery of ANOTHER plant listing the attacker's id doesn't make it this plant's receipt.
    expect(breederReceipt(plant(), [acme], sentWith('att_acme', { source_record: 'VEIL-2' })).kind).toBe('none');
    // Beside a real receipt, it is only counted.
    const real = att({ attestationId: 'att_receipt' });
    const r = breederReceipt(plant(), [acme, real], sentWith('att_receipt'));
    expect(r.kind === 'signed' && r.by.attestationId).toBe('att_receipt');
    expect(r.others).toBe(1);
  });

  it('a used code with no linked receipt (the breeder themself, or a lab that didn’t sign) is only “code used”', () => {
    const used = plant({ attestation: { attestedAt: 1, type: 'receipt-confirmed', addressedTo: 'lab' } });
    expect(breederReceipt(used, [], [])).toEqual({ kind: 'code-used', others: 0 });
    expect(breederReceipt(used, [att({ attestationId: 'att_receipt' })], sentWith('att_receipt')).kind).toBe('signed');
  });

  it('names the signer plainly only with a current name check, saying what was matched; never vouches', () => {
    const vetted = att({
      key: OTHER,
      vettedAttester: true,
      registeredAs: { displayName: 'Checked Lab', nameCheck: checkFor('Checked Lab') },
    });
    const plain = att({ registeredAs: { displayName: 'Acme Labs' } });
    const line = receiptSignedLine(vetted);
    expect(line.startsWith('Receipt signed by Checked Lab. ')).toBe(true);
    expect(line.slice('Receipt signed by Checked Lab. '.length)).toMatch(MATCHED);
    expect(receiptSignedLine(plain)).toBe('Receipt signed by a key named “Acme Labs” (name not checked)');
    // A mark with no check record behind it (every mark made before round 4) is not checked.
    const bareMark = att({ key: OTHER, vettedAttester: true, registeredAs: { displayName: 'Checked Lab' } });
    expect(receiptSignedLine(bareMark)).toBe('Receipt signed by a key named “Checked Lab” (name not checked)');
    expect(receiptSignedLine(att({ registeredAs: null, attester: { publicKey: LAB } }))).toBe(
      'Receipt signed by a key nobody has named',
    );
    // Withdrawn, a vetted key's statement no longer reads as named.
    const withdrawn = att({
      key: OTHER,
      vettedAttester: true,
      registeredAs: { displayName: 'Checked Lab', nameCheck: checkFor('Checked Lab') },
      retraction: { attestationId: 'x', attesterPublicKey: OTHER, reason: 'other', retractedAt: 'x', signature: 's' },
    });
    expect(signedByWords(withdrawn)).toMatch(/name not checked/);
    expect(line).not.toMatch(/VeilCore (has )?(checked|verified)|vouches for/i);
    // Two linked receipts: the named key first.
    const two = breederReceipt(
      plant(),
      [att({ attestationId: 'a1' }), { ...vetted, attestationId: 'a2' }],
      [...sentWith('a1'), ...sentWith('a2', { id: 'TR-11111111' })],
    );
    expect(two.kind === 'signed' && two.by.attestationId).toBe('a2');
    expect(signerName(vetted)).toEqual({ name: 'Checked Lab', checked: true });
  });
});

describe('the certificate’s receipt line', () => {
  it('prints a linked receipt as signed, with the same named/unnamed wording, and a used code as only that', () => {
    const named = att({
      attestationId: 'a',
      vettedAttester: true,
      registeredAs: { displayName: 'Checked Lab', nameCheck: checkFor('Checked Lab') },
    });
    const signed = breederReceipt(plant(), [named], sentWith('a'));
    expect(receiptLineFor(plant(), signed)).toMatch(
      /^Receipt signed by Checked Lab, .+ \(signature checked in this browser\)\. VeilCore’s operator matched this name to cannabis\.example\.gov \(license TL-000123\) on .+\. VeilCore doesn’t vouch for the lab’s work\.$/,
    );
    const acme = att({ attestationId: 'b', registeredAs: { displayName: 'Acme Labs' } });
    expect(receiptLineFor(plant(), breederReceipt(plant(), [acme], sentWith('b')))).toMatch(
      /^Receipt signed by a key named “Acme Labs” \(name not checked\), .+ \(signature checked in this browser\)$/,
    );
    // Unlinked, Acme is never on the certificate.
    expect(receiptLineFor(plant(), breederReceipt(plant(), [acme], sentWith()))).toMatch(/^Lab code used; no receipt/);
    expect(receiptLineFor(plant(), breederReceipt(plant(), [acme], []))).toBe('none yet');
    expect(receiptLineFor(plant(), null)).toBe('checking…');
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
    expect(labReceipt(received, [att({ attestationId: 'att_mine' })], LAB)).toMatchObject({
      kind: 'signed',
      attestationId: 'att_mine',
      linked: false,
    });
    expect(labReceipt(received, [att({ attestationId: 'att_mine' })], LAB, 'att_mine')).toMatchObject({
      kind: 'signed',
      linked: true,
    });
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

  it('is the lab only when its key is the key of the receipt linked to this delivery', () => {
    const input = { sha: SHA, attestationId: 'att_r', subject: BREEDER, receiptAttestationId: 'att_receipt' };
    const receipt = att({ attestationId: 'att_receipt' });
    expect(reportSigner([report(), receipt], input).kind).toBe('this-delivery');
    // No linked receipt: nothing shows the key had the sample.
    expect(reportSigner([report()], input).kind).toBe('no-receipt');
    expect(reportSigner([report(), receipt], { ...input, receiptAttestationId: undefined }).kind).toBe('no-receipt');
    // A receipt signed by this key but not the linked one (e.g. an attacker's own receipt over the
    // public fingerprint, then a report): no.
    expect(reportSigner([report(OTHER), att({ key: OTHER }), receipt], input).kind).toBe('other-key');
    // The linked receipt withdrawn: no longer a receipt.
    const withdrawn = att({
      attestationId: 'att_receipt',
      retraction: { attestationId: 'x', attesterPublicKey: LAB, reason: 'other', retractedAt: 'x', signature: 's' },
    });
    expect(reportSigner([report(), withdrawn], input).kind).toBe('no-receipt');
  });

  it('no verified signature over this exact file, linked to this result, is unsigned', () => {
    const base = { sha: SHA, subject: BREEDER, receiptAttestationId: 'att_receipt' };
    const receipt = att({ attestationId: 'att_receipt' });
    expect(reportSigner([receipt], base).kind).toBe('unsigned');
    expect(reportSigner([report(), receipt], { ...base, sha: '6'.repeat(64) }).kind).toBe('unsigned');
    expect(reportSigner([report(), receipt], { ...base, attestationId: 'att_other' }).kind).toBe('unsigned');
    expect(reportSigner([{ ...report(), signatureValid: false }, receipt], base).kind).toBe('unsigned');
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
