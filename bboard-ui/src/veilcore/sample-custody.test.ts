// The sample's chain of custody: the lab's receipt covers what the breeder wrote and what
// the lab found on arrival, through its signed id; older receipts verify as before; and a
// difference is said plainly, without blame.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attestationPayload, canonicalise, generateKeypair, sha256Hex, verifyAttestation } from 'veilcore-records';
import {
  arrivalDetailsOf,
  custodyDigest,
  receiptCustodyDigest,
  sampleDetailsOf,
  sentByMe,
  signReceiptWith,
  type ArrivalDetails,
  type SampleDetails,
  type SentTransfer,
} from './transfers';
import {
  arrivalLine,
  breederReceipt,
  custodyDifferences,
  custodyHeadline,
  custodyLines,
  custodySummary,
  custodyView,
  receiptLineFor,
  sampleLine,
} from './custody';
import type { ResolvedAttestation } from './attesters';
import { attestRecord, type AttesterProfile } from './attester-keys';
import type { StrainRecord } from './records';

const SAMPLE: SampleDetails = {
  sampleId: 'BLU-07',
  sealNumber: '4471',
  takenFrom: 'Mother M3',
  takenOn: '2026-10-14',
  witness: 'J. Doe',
};
const ARRIVED: ArrivalDetails = {
  sampleId: 'BLU-07',
  sealNumber: '4417',
  sealIntact: 'yes',
  arrivedOn: '2026-10-15',
  condition: 'Cold, dry',
  labRef: 'ACC-9',
};
/** The registry's transfer.mjs custodyDigest for exactly these values (computed there). */
const REGISTRY_DIGEST = '20414775107061b3a541797f4ed8fe2e2a9c65e43f649c481ab637ecfc5929c2';

const BREEDER = 'b'.repeat(64);
const RECEIVED = 'e'.repeat(64);

describe('the digest a receipt carries', () => {
  it('is the registry’s: SHA-256 of the canonical JSON of the delivery and both sides', async () => {
    expect(await custodyDigest('TR-0A1B2C3D', SAMPLE, ARRIVED)).toBe(REGISTRY_DIGEST);
    expect(
      await sha256Hex(
        canonicalise({
          format: 'veilcore/sample-custody/v1',
          transferId: 'TR-0A1B2C3D',
          sample: SAMPLE,
          arrival: ARRIVED,
        }),
      ),
    ).toBe(REGISTRY_DIGEST);
  });

  it('changes with any value, not with spacing around a value or an empty field', async () => {
    const a = await custodyDigest('TR-0A1B2C3D', SAMPLE, ARRIVED);
    expect(
      await custodyDigest('TR-0A1B2C3D', { ...SAMPLE, sealNumber: ' 4471 ' }, { ...ARRIVED, condition: 'Cold, dry' }),
    ).toBe(a);
    expect(await custodyDigest('TR-0A1B2C3D', { ...SAMPLE, witness: '' }, ARRIVED)).not.toBe(a);
    expect(await custodyDigest('TR-0A1B2C3D', SAMPLE, { ...ARRIVED, sealNumber: '4471' })).not.toBe(a);
    expect(await custodyDigest('TR-0A1B2C3E', SAMPLE, ARRIVED)).not.toBe(a);
  });

  it('is read from a receipt id only in its exact form', () => {
    expect(receiptCustodyDigest(`att_0123456789abcdef_sc1_${REGISTRY_DIGEST}`)).toBe(REGISTRY_DIGEST);
    expect(receiptCustodyDigest('att_0123456789abcdef')).toBeNull();
    expect(receiptCustodyDigest(`att_x_sc1_${REGISTRY_DIGEST.toUpperCase()}`)).toBeNull();
    expect(receiptCustodyDigest(`att_x_sc1_${REGISTRY_DIGEST}_more`)).toBeNull();
  });

  it('only known fields cross, trimmed; an unknown seal state is dropped', () => {
    expect(sampleDetailsOf({ sampleId: ' A ', colour: 'red', sealNumber: 7 })).toEqual({ sampleId: 'A' });
    expect(arrivalDetailsOf({ sealIntact: 'maybe', condition: ' ok ' })).toEqual({ condition: 'ok' });
    expect(arrivalDetailsOf({ sealIntact: 'no-seal' })).toEqual({ sealIntact: 'no-seal' });
  });
});

describe('the signed receipt', () => {
  let posted: Record<string, unknown>[] = [];
  beforeEach(() => {
    posted = [];
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      posted.push(body);
      return Promise.resolve(
        new Response(JSON.stringify({ attestationId: body.attestationId, strength: 'signed' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carries the digest in its signed id, over the same subject and document as before', async () => {
    const lab: AttesterProfile = { keypair: await generateKeypair(), displayName: 'Lab', role: 'laboratory' };
    const out = await signReceiptWith(
      lab,
      { sourceCommitment: BREEDER, receivedRecordFingerprint: RECEIVED },
      REGISTRY_DIGEST,
    );
    expect('attestationId' in out && out.attestationId).toMatch(/^att_[0-9a-f]{16}_sc1_[0-9a-f]{64}$/);
    const signed = posted[0] as unknown as Parameters<typeof verifyAttestation>[0];
    expect(signed.subjectCommitment).toBe(BREEDER);
    expect(signed.documentHash).toBe(RECEIVED);
    expect(signed.type).toBe('chain-of-custody');
    expect(receiptCustodyDigest(signed.attestationId)).toBe(REGISTRY_DIGEST);
    // The id is inside what is signed: the digest can't be swapped without breaking the signature.
    expect(attestationPayload(signed)).toContain(REGISTRY_DIGEST);
    expect(await verifyAttestation(signed)).toBe(true);
    expect(await verifyAttestation({ ...signed, attestationId: signed.attestationId.replace(/.$/, '0') })).toBe(false);
  });

  it('without sample details is the receipt it always was, and verifies', async () => {
    const lab: AttesterProfile = { keypair: await generateKeypair(), displayName: 'Lab' };
    await signReceiptWith(lab, { sourceCommitment: BREEDER, receivedRecordFingerprint: RECEIVED });
    const signed = posted[0] as unknown as Parameters<typeof verifyAttestation>[0];
    expect(signed.attestationId).toMatch(/^att_[0-9a-f]{16}$/);
    expect(receiptCustodyDigest(signed.attestationId)).toBeNull();
    expect(await verifyAttestation(signed)).toBe(true);
  });
});

describe('one signing for a receipt and any other attestation (attester-keys.ts attestRecord)', () => {
  let posted: Record<string, unknown>[] = [];
  let answer: () => Promise<Response> = () => Promise.reject(new Error('unset'));
  beforeEach(() => {
    posted = [];
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(init.body as string) as Record<string, unknown>);
      return answer();
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

  it('a suffix goes at the end of the id, inside what is signed; without one the id is as before', async () => {
    const lab: AttesterProfile = { keypair: await generateKeypair(), displayName: 'Lab', role: 'laboratory' };
    answer = () => json({ attestationId: posted.at(-1)?.attestationId, strength: 'signed' });
    const plain = await attestRecord(lab, BREEDER, RECEIVED, 'laboratory-report');
    expect(plain.attestationId).toMatch(/^att_[0-9a-f]{16}$/);
    expect(plain.strength).toBe('signed');
    const suffixed = await attestRecord(lab, BREEDER, RECEIVED, 'chain-of-custody', `_sc1_${REGISTRY_DIGEST}`);
    expect(suffixed.attestationId).toMatch(new RegExp(`^att_[0-9a-f]{16}_sc1_${REGISTRY_DIGEST}$`));
    for (const signed of posted as unknown as Parameters<typeof verifyAttestation>[0][]) {
      expect(await verifyAttestation(signed)).toBe(true);
    }
  });

  it('the receipt says what went wrong in the same words as before', async () => {
    const lab: AttesterProfile = { keypair: await generateKeypair(), displayName: 'Lab' };
    const subject = { sourceCommitment: BREEDER, receivedRecordFingerprint: RECEIVED };
    answer = () => json({ error: 'not a lab key' });
    expect(await signReceiptWith(lab, subject)).toEqual({ error: 'not a lab key' });
    answer = () => json({ nothing: true });
    expect(await signReceiptWith(lab, subject)).toEqual({ error: 'unexpected response from the registry' });
    answer = () => Promise.reject(new TypeError('Failed to fetch'));
    expect(await signReceiptWith(lab, subject)).toEqual({ error: 'could not reach the registry' });
    // A key that can't sign is said the same way, never thrown.
    const broken: AttesterProfile = { keypair: { publicKey: lab.keypair.publicKey, privateKey: 'zz' } };
    expect(await signReceiptWith(broken, subject)).toEqual({ error: 'could not reach the registry' });
    // Only the id comes back, as before.
    answer = () => json({ attestationId: 'att_0123456789abcdef', strength: 'signed' });
    expect(await signReceiptWith(lab, subject)).toEqual({ attestationId: 'att_0123456789abcdef' });
  });
});

describe('the sample details in the downloaded summary (custodySummary)', () => {
  it('what was sent, what arrived and the differences, with the certificate’s own words', async () => {
    const id = `att_0123456789abcdef_sc1_${REGISTRY_DIGEST}`;
    const r = breederReceipt(plant(), [receiptAtt(id)], [await delivery(id)]);
    if (r.kind !== 'signed') throw new Error('expected a signed receipt');
    expect(custodySummary(r.custody)).toEqual({
      sent: SAMPLE,
      onArrival: ARRIVED,
      coveredByReceipt: true,
      differences: ['Seal number differs: sent 4471, received 4417'],
      lines: custodyLines(r.custody),
    });
  });

  it('arrival details the receipt doesn’t cover are left out, as on the certificate', async () => {
    const id = `att_0123456789abcdef_sc1_${REGISTRY_DIGEST}`;
    const v = custodyView(await delivery(id, SAMPLE, { ...ARRIVED, sealNumber: '4471' }), id);
    expect(custodySummary(v)).toEqual({
      sent: SAMPLE,
      coveredByReceipt: false,
      differences: [],
      lines: [
        `Sent: ${sampleLine(SAMPLE)}`,
        'The lab changed its arrival details after signing, so its receipt doesn’t cover them.',
      ],
    });
    expect(custodySummary(undefined)).toBeUndefined();
  });
});

describe('differences between what was sent and what arrived', () => {
  it('says each one plainly: what was sent, what was received', () => {
    expect(custodyDifferences(SAMPLE, ARRIVED)).toEqual(['Seal number differs: sent 4471, received 4417']);
    expect(custodyDifferences(SAMPLE, { ...ARRIVED, sampleId: 'BLU-08', sealNumber: '4471' })).toEqual([
      'Sample ID differs: sent BLU-07, received BLU-08',
    ]);
    expect(custodyDifferences(SAMPLE, { ...ARRIVED, sealNumber: '4471', sealIntact: 'no' })).toEqual([
      'Seal not intact on arrival',
    ]);
    expect(custodyDifferences(SAMPLE, { sampleId: 'BLU-07', sealIntact: 'no-seal' })).toEqual([
      'No seal on arrival (sent with seal 4471)',
    ]);
  });

  it('a field the lab left empty is said too; spacing and letter case are not differences', () => {
    expect(custodyDifferences(SAMPLE, { sampleId: 'blu-07' })).toEqual([
      'Seal number not confirmed on arrival (sent 4471)',
    ]);
    expect(custodyDifferences(SAMPLE, { sampleId: ' blu-07 ', sealNumber: '4471', sealIntact: 'yes' })).toEqual([]);
    expect(custodyDifferences({}, ARRIVED)).toEqual([]);
  });

  it('no wording that blames anyone', () => {
    const all = [
      ...custodyDifferences(SAMPLE, { sampleId: 'X', sealIntact: 'no-seal' }),
      ...custodyDifferences(SAMPLE, { sampleId: 'X', sealNumber: '1', sealIntact: 'no' }),
    ].join(' ');
    expect(all).not.toMatch(/tamper|fraud|wrong|fail|suspicious|broke/i);
  });

  it('one line per side for the pages', () => {
    expect(sampleLine(SAMPLE)).toBe(
      'Sample BLU-07 · seal 4471 · taken from Mother M3 on 2026-10-14 · witness J. Doe (VeilCore doesn’t check this)',
    );
    expect(arrivalLine(ARRIVED)).toBe(
      'Sample BLU-07 · seal 4417, seal intact · arrived 2026-10-15 · condition: Cold, dry · lab no. ACC-9',
    );
  });
});

// --- on the breeder's pages -----------------------------------------------------------

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
const receiptAtt = (attestationId: string): ResolvedAttestation => ({
  attestationId,
  type: 'chain-of-custody',
  subjectCommitment: BREEDER,
  attester: { publicKey: 'a1'.repeat(16), displayName: 'Test Lab' },
  documentHash: RECEIVED,
  hashAlgorithm: 'sha256',
  issuedAt: '2026-10-15T10:00:00Z',
  signature: 'sig',
  strength: 'signed',
  registeredAs: { displayName: 'Test Lab' },
  retraction: null,
  signatureValid: true,
});
const delivery = async (receiptId: string, sample = SAMPLE, arrival = ARRIVED): Promise<SentTransfer> => ({
  id: 'TR-0A1B2C3D',
  source_record: 'VEIL-1',
  to_handle: 'lab',
  created_at: 1,
  claimed_at: 2,
  receipt_attestation_id: receiptId,
  sample_custody: sample,
  arrival_custody: arrival,
  custodyDigest: await custodyDigest('TR-0A1B2C3D', sample, arrival),
});

describe('the breeder’s receipt with the sample’s chain of custody', () => {
  it('a receipt covering a different seal number shows it on the plant page, certificate and check page', async () => {
    const id = `att_0123456789abcdef_sc1_${REGISTRY_DIGEST}`;
    const r = breederReceipt(plant(), [receiptAtt(id)], [await delivery(id)]);
    expect(r.kind).toBe('signed');
    if (r.kind !== 'signed') return;
    expect(r.custody?.signed).toBe('covered');
    expect(custodyHeadline(r.custody)).toBe('Seal number differs: sent 4471, received 4417.');
    expect(custodyLines(r.custody)).toEqual([
      'Seal number differs: sent 4471, received 4417.',
      'Sent: Sample BLU-07 · seal 4471 · taken from Mother M3 on 2026-10-14 · witness J. Doe (VeilCore doesn’t check this)',
      'Received: Sample BLU-07 · seal 4417, seal intact · arrived 2026-10-15 · condition: Cold, dry · lab no. ACC-9',
    ]);
    // The certificate's receipt line itself is unchanged; the sample lines go under it.
    expect(receiptLineFor(plant(), r)).toMatch(/^Receipt signed by a key named “Test Lab” \(name not checked\)/);
  });

  it('a matching receipt says what matched', async () => {
    const arrival = { ...ARRIVED, sealNumber: '4471' };
    const digest = await custodyDigest('TR-0A1B2C3D', SAMPLE, arrival);
    const id = `att_0123456789abcdef_sc1_${digest}`;
    const r = breederReceipt(plant(), [receiptAtt(id)], [await delivery(id, SAMPLE, arrival)]);
    expect(r.kind === 'signed' && custodyHeadline(r.custody)).toBe('Sample ID and seal number match what was sent.');
  });

  it('values changed after signing are not shown as covered', async () => {
    const id = `att_0123456789abcdef_sc1_${REGISTRY_DIGEST}`;
    const changed = await delivery(id, SAMPLE, { ...ARRIVED, sealNumber: '4471' });
    const v = custodyView(changed, id);
    expect(v?.signed).toBe('changed');
    expect(v?.differences).toEqual([]);
    expect(custodyHeadline(v)).toBe(
      'The lab changed its arrival details after signing, so its receipt doesn’t cover them.',
    );
  });

  it('an older receipt, with no digest, still counts; the sample details read as not covered', async () => {
    const r = breederReceipt(plant(), [receiptAtt('att_0123456789abcdef')], [await delivery('att_0123456789abcdef')]);
    expect(r.kind).toBe('signed');
    expect(r.kind === 'signed' && r.custody?.signed).toBe('not-covered');
    expect(r.kind === 'signed' && custodyHeadline(r.custody)).toBe(
      'The lab’s receipt doesn’t cover the sample details.',
    );
  });

  it('a delivery without sample details shows nothing extra', async () => {
    const t = { ...(await delivery('att_0123456789abcdef', {}, {})) };
    const r = breederReceipt(plant(), [receiptAtt('att_0123456789abcdef')], [t]);
    expect(r.kind === 'signed' && r.custody).toBeUndefined();
    expect(custodyLines(undefined)).toEqual([]);
  });
});

describe('the sender’s list', () => {
  const store: Record<string, string> = { 'veilcore.holder.v1': 'ab'.repeat(32) };
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('works out each delivery’s digest here, from the values listed, never taking one from the registry', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            transfers: [
              {
                id: 'TR-0A1B2C3D',
                source_record: 'VEIL-1',
                to_handle: 'lab',
                created_at: 1,
                sample_custody: SAMPLE,
                arrival_custody: ARRIVED,
                custodyDigest: '0'.repeat(64),
              },
              { id: 'TR-00000002', source_record: 'VEIL-1', to_handle: 'lab', created_at: 1 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const [a, b] = await sentByMe();
    expect(a.custodyDigest).toBe(REGISTRY_DIGEST);
    expect(a.sample_custody).toEqual(SAMPLE);
    expect(b.sample_custody).toBeUndefined();
    expect(b.custodyDigest).toBe(await custodyDigest('TR-00000002', {}, {}));
  });
});
