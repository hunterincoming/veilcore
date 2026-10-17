// The certificate's summary file and the licence file: what leaves the app when the holder
// hands a file to someone else (pre-launch licensing review, 17 Oct 2026).
//   - the summary has no agreement in it: not a term, not sales figures, not the salt, not
//     even the agreement's id; only how many there are;
//   - nor anything only the holder should have (record secrets, offer keys, names given);
//   - the licence file's status is date-checked, and its issue time is when it was issued.
// Run: npx vitest run src/components/wizard/certificate-summary.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { certificateSummary } from './certificate-summary';
import { sealAgreement, type License, type LicenseTerms } from '../../veilcore/licenses';
import { certificateFor } from '../../veilcore/license-certificate';
import { HOLDER_ONLY_FIELDS, type StrainRecord } from '../../veilcore/records';

const TERMS: LicenseTerms = {
  licensee: 'Zebulon Greenhouse Partners',
  rights: 'cultivate+propagate',
  territory: 'Ontario-and-Quebec-only',
  startDate: '2026-01-02',
  endDate: '2026-03-04',
  royaltyType: 'percent',
  royaltyAmount: '13.75',
  unitBasis: 'per-unit-sold',
  offspringRoyaltyPct: '4.25',
  sublicensable: false,
  exclusive: true,
  extraTerms: 'Licensee reports sales quarterly to the breeder by email',
};

const RECORD = {
  id: 'VEIL-SUMMARY1',
  nonce: '1'.repeat(64),
  strainName: 'Harbour Mist',
  bredBy: 'A breeder',
  dateCreated: '2026-01-01',
  notes: '',
  loggedAt: 1_767_225_600_000,
  recordFingerprint: '2'.repeat(64),
  parents: [],
  licenseIds: ['LIC-AGREEMENT-ID-1'],
  secrets: { recordSecret: '3'.repeat(64), recoverySecret: '4'.repeat(64), createdAt: 1 },
  offerKeys: { 'T-1': '5'.repeat(64) },
  sentTo: { 'T-1': 'Private Recipient Name' },
  grant: ['existence'],
} as unknown as StrainRecord;

const agreement = async (over: Partial<License> = {}): Promise<License> => {
  const sealed = await sealAgreement('license', TERMS, RECORD.recordFingerprint);
  return {
    id: 'LIC-AGREEMENT-ID-1',
    type: 'license',
    recordId: RECORD.id,
    recordFingerprint: RECORD.recordFingerprint,
    terms: TERMS,
    ...sealed,
    state: 'active',
    createdAt: 1_000,
    breederSignedAt: 2_000,
    licenseeSignedAt: 3_000,
    royaltyLog: [{ at: 4_000, input: 98_765.43, note: 'Q1 sales reported by licensee', amountOwed: 13_580.25 }],
    ...over,
  };
};

describe('the certificate summary file', () => {
  it('holds no agreement: none of its fields, its sales figures or its salt; only a count', async () => {
    const l = await agreement();
    const text = JSON.stringify(
      certificateSummary({ record: RECORD, agreements: [l], anchored: 'Not yet.', secondParty: '-', note: 'n' }),
    );
    const secrets = [
      l.id,
      l.agreementFingerprint,
      l.agreementSalt!,
      TERMS.licensee,
      TERMS.territory,
      TERMS.royaltyAmount,
      TERMS.offspringRoyaltyPct!,
      TERMS.extraTerms,
      TERMS.unitBasis,
      '98765',
      '13580',
      'Q1 sales reported',
    ];
    for (const s of secrets) expect(text, s).not.toContain(s);
    expect(text).not.toMatch(/licen[sc]ee|royalt|territory|salt/i);
    expect(JSON.parse(text)).toMatchObject({ agreements: 1 });
  });

  it('holds nothing only the holder should have', () => {
    const out = certificateSummary({ record: RECORD, anchored: '', secondParty: '', note: '' }) as {
      record: Record<string, unknown>;
    };
    for (const k of HOLDER_ONLY_FIELDS) expect(out.record, k).not.toHaveProperty(k);
    const text = JSON.stringify(out);
    for (const s of ['3'.repeat(64), '4'.repeat(64), '5'.repeat(64), 'Private Recipient Name']) {
      expect(text).not.toContain(s);
    }
    // What anyone needs to recompute the proof code stays.
    expect(out.record).toMatchObject({ nonce: RECORD.nonce, strainName: 'Harbour Mist' });
  });
});

describe('the licence file (license-certificate.ts)', () => {
  it('past its end date it says expired, never active', async () => {
    const cert = certificateFor(await agreement(), ['existence']);
    expect(cert.public.state).toBe('expired');
    expect(cert.disclosed.existence).toEqual({ state: 'expired', active: false });
  });

  it('within its dates it says active', async () => {
    const l = await agreement({ terms: { ...TERMS, endDate: '2999-01-01' } });
    expect(certificateFor(l, ['existence']).disclosed.existence).toEqual({ state: 'active', active: true });
  });

  it('issuedAt is when it was issued, not when the draft was started; a draft has none', async () => {
    expect(certificateFor(await agreement(), []).public.issuedAt).toBe(2_000);
    const draft = await agreement({ state: 'draft', breederSignedAt: undefined });
    expect(certificateFor(draft, []).public).not.toHaveProperty('issuedAt');
  });
});
