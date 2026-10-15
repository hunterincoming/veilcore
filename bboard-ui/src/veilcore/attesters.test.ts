// The one signer label (round 4): a checked name says what was matched, where and when;
// anything else, including an expired check or a mark with no record, says "name not checked".
import { describe, expect, it } from 'vitest';
import {
  currentNameCheck,
  nameChecked,
  signerLabel,
  strengthLabel,
  type NameCheck,
  type ResolvedAttestation,
} from './attesters';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const LAB = 'a1'.repeat(32);

const check = (over: Partial<NameCheck> = {}): NameCheck => ({
  source: 'licence-listing',
  sourceUrl: 'https://www.cannabis.example.gov/licensed-testing-labs?state=nj',
  licenceNo: 'TL-000123',
  emailDomain: 'acmelabs.example',
  checkedAt: '2026-10-01',
  checkedBy: 'HR',
  expiresAt: '2027-10-01',
  checkedName: 'Acme Labs',
  ...over,
});

const att = (over: Partial<ResolvedAttestation> = {}, nameCheck: NameCheck | null = check()): ResolvedAttestation => ({
  attestationId: 'att_1',
  type: 'chain-of-custody',
  subjectCommitment: 'b'.repeat(64),
  attester: { publicKey: LAB, displayName: 'Acme Labs' },
  documentHash: 'e'.repeat(64),
  hashAlgorithm: 'sha256',
  issuedAt: '2026-10-14T10:00:00Z',
  signature: 'sig',
  strength: 'signed-and-accredited',
  vettedAttester: true,
  registeredAs: { displayName: 'Acme Labs', nameCheck },
  retraction: null,
  signatureValid: true,
  ...over,
});

const CHECKED =
  'Receipt signed by Acme Labs. VeilCore’s operator matched this name to cannabis.example.gov (license TL-000123) on 2026-10-01. VeilCore doesn’t vouch for the lab’s work.';
const NOT_CHECKED = 'Receipt signed by a key named “Acme Labs” (name not checked)';

describe('signerLabel', () => {
  it('a current check states the listing host, the licence number and the day, and that VeilCore doesn’t vouch', () => {
    const s = signerLabel(att(), 'Receipt signed by', NOW);
    expect(s.checked).toBe(true);
    expect(s.text).toBe(CHECKED);
    expect(s.lead).toBe('Receipt signed by Acme Labs');
    expect(s.match).toEqual({
      before: 'VeilCore’s operator matched this name to ',
      host: 'cannabis.example.gov',
      href: 'https://www.cannabis.example.gov/licensed-testing-labs?state=nj',
      after: ' (license TL-000123) on 2026-10-01.',
    });
    expect(`${s.lead}.${s.rest}`).toBe(s.text);
    // Never "checked by VeilCore", "verified", or a word that vouches.
    expect(s.text).not.toMatch(/VeilCore (has )?(checked|verified)|vouches for|certif|approved/i);
  });

  it('an accreditation listing reads "certificate"; no number, no brackets', () => {
    expect(signerLabel(att({}, check({ source: 'accreditation' })), 'Signed by', NOW).text).toContain(
      'matched this name to cannabis.example.gov (certificate TL-000123) on 2026-10-01.',
    );
    const noNumber = check();
    delete noNumber.licenceNo;
    expect(signerLabel(att({}, noNumber), 'Signed by', NOW).text).toContain(
      'matched this name to cannabis.example.gov on 2026-10-01.',
    );
  });

  it('an expired check reads "name not checked", by this browser’s clock, whatever the registry says', () => {
    const expired = att({}, check({ checkedAt: '2025-10-01', expiresAt: '2026-10-01' }));
    expect(signerLabel(expired, 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
    expect(currentNameCheck(expired, NOW)).toBeNull();
    expect(nameChecked(expired, NOW)).toBe(false);
    // The same record the day before it ran out still counts.
    expect(signerLabel(expired, 'Receipt signed by', Date.parse('2026-09-30T12:00:00Z')).checked).toBe(true);
    // The registry's own "expired" status reads the same, with no record sent.
    const reported = att({ registeredAs: { displayName: 'Acme Labs', nameCheck: null, nameCheckStatus: 'expired' } });
    expect(signerLabel(reported, 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
  });

  it('strengthLabel says an earlier check expired, and is not "ok"', () => {
    const expired = att({}, check({ checkedAt: '2025-01-01', expiresAt: '2026-01-01' }));
    const s = strengthLabel(expired);
    expect(s.ok).toBe(false);
    expect(s.label).toBe('Signed · name not checked');
    expect(s.why).toMatch(
      /^Signed by a key named “Acme Labs” \(name not checked\)\. .*An earlier check of this name has expired\./,
    );
    const ok = strengthLabel(
      att(
        {},
        check({
          checkedAt: new Date().toISOString().slice(0, 10),
          expiresAt: new Date(Date.now() + 100 * 86_400_000).toISOString().slice(0, 10),
        }),
      ),
    );
    expect(ok.ok).toBe(true);
    expect(ok.label).toBe('Signed · name matched to a public listing');
  });

  it('a mark without a check record (made before round 4) and an unmarked key read "name not checked"', () => {
    expect(signerLabel(att({}, null), 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
    expect(signerLabel(att({ vettedAttester: false }), 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
    expect(signerLabel(att({ vettedAttester: undefined }), 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
    expect(signerLabel(att({ registeredAs: null, attester: { publicKey: LAB } }), 'Receipt signed by', NOW).text).toBe(
      'Receipt signed by a key nobody has named',
    );
  });

  it('a check for another name, a bad link or impossible dates never reads as checked', () => {
    for (const bad of [
      check({ checkedName: 'Other Labs' }),
      check({ sourceUrl: 'javascript:alert(1)' }),
      check({ sourceUrl: 'http://cannabis.example.gov/labs' }),
      check({ sourceUrl: 'https://user:pw@cannabis.example.gov/labs' }),
      check({ checkedAt: '2026-10-20' }), // after "now"
      check({ checkedAt: '2026-10-01', expiresAt: '2028-10-01' }), // longer than 12 months
      check({ expiresAt: 'soon' }),
      check({ source: 'phone-call' as NameCheck['source'] }),
    ]) {
      expect(signerLabel(att({}, bad), 'Receipt signed by', NOW).checked, JSON.stringify(bad)).toBe(false);
    }
  });

  it('a withdrawn or unverified signature is never named as checked', () => {
    const withdrawn = att({
      retraction: { attestationId: 'att_1', attesterPublicKey: LAB, reason: 'other', retractedAt: 'x', signature: 's' },
    });
    expect(signerLabel(withdrawn, 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
    expect(signerLabel(att({ signatureValid: false }), 'Receipt signed by', NOW).text).toBe(NOT_CHECKED);
  });
});
