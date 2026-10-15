// Round 5: the lab report saved to a plant follows what the lab did to it, and the public
// page says whether the saved file is the report a lab signed, matched on its SHA-256.
import { describe, expect, it } from 'vitest';
import {
  correctionWithdrawn,
  publicReportLine,
  savedFileSha,
  savedReportRow,
  savedReportSentence,
  savedReportStatus,
  type ArrivedLike,
} from './saved-report';
import { pairingFingerprintOfSha } from './commitment';
import type { ResolvedAttestation } from './attesters';
import type { ResultSummary } from './lab-results';
import type { StrainRecord } from './records';
import { localStamp, reportFileName, shortResultId } from './lab-results';

const PLANT_FP = 'b'.repeat(64);
const SHA_V1 = '3bb6af'.padEnd(64, '1');
const SHA_V2 = '7c1e04'.padEnd(64, '2');
const LAB = 'a1'.repeat(16);

const att = (over: Partial<ResolvedAttestation>): ResolvedAttestation => ({
  attestationId: `att_${Math.random().toString(16).slice(2, 10)}`,
  type: 'laboratory-report',
  subjectCommitment: PLANT_FP,
  attester: { publicKey: LAB, displayName: 'Test Lab' },
  documentHash: SHA_V1,
  hashAlgorithm: 'sha256',
  issuedAt: '2026-10-14T10:00:00Z',
  signature: 'sig',
  strength: 'signed',
  registeredAs: { displayName: 'Test Lab' },
  retraction: null,
  signatureValid: true,
  ...over,
});

const retracted = (a: ResolvedAttestation, reason: 'superseded' | 'issued-in-error'): ResolvedAttestation => ({
  ...a,
  retraction: {
    attestationId: a.attestationId,
    attesterPublicKey: LAB,
    reason,
    retractedAt: '2026-10-15T12:00:00Z',
    signature: 'r',
  },
});

const result = (over: Partial<ResultSummary>): ResultSummary => ({
  id: 'LR-3F2A0000000000000000000000000000',
  size: 1000,
  sha256: 'f'.repeat(64),
  createdAt: Date.UTC(2026, 9, 15, 14, 32),
  ...over,
});

const arrivedFrom = (results: ResultSummary[], transfer = 'TR-1'): ArrivedLike[] =>
  results.map((r) => ({
    transfer: { id: transfer, to_handle: 'acme-lab' },
    result: r,
    state: results.some((o) => o.id !== r.id && o.replaces === r.id)
      ? 'replaced'
      : r.withdrawnAt !== undefined
        ? 'withdrawn'
        : 'live',
  }));

const plant = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: 'VEIL-1',
  strainName: 'Harbour Mist',
  bredBy: 'S',
  dateCreated: '2026-01-01',
  notes: '',
  loggedAt: 1,
  recordFingerprint: PLANT_FP,
  ...over,
});

const savedV1 = (over: Partial<StrainRecord> = {}) =>
  plant({
    dnaFingerprint: pairingFingerprintOfSha(SHA_V1),
    dnaFileName: 'Lab report.pdf',
    dnaFileSha256: SHA_V1,
    ...over,
  });

describe('the pairing fingerprint is not the file’s SHA-256', () => {
  it('is the contract’s commit over the SHA-256: different, but recomputable from it', () => {
    const p = pairingFingerprintOfSha(SHA_V1);
    expect(p).toMatch(/^[0-9a-f]{64}$/);
    expect(p).not.toBe(SHA_V1);
    expect(pairingFingerprintOfSha(SHA_V1)).toBe(p);
    expect(pairingFingerprintOfSha('nope')).toBeUndefined();
  });

  it('a pairing saved before the SHA-256 was kept is matched to a lab signature through it', () => {
    const legacy = plant({ dnaFingerprint: pairingFingerprintOfSha(SHA_V1), dnaFileName: 'old.pdf' });
    expect(savedFileSha(legacy, [att({ documentHash: SHA_V2 }), att({ documentHash: SHA_V1 })])).toBe(SHA_V1);
    expect(savedFileSha(legacy, [att({ documentHash: SHA_V2 })])).toBeUndefined();
  });
});

describe('where the saved lab report stands', () => {
  const v1 = att({ attestationId: 'att_v1', documentHash: SHA_V1 });
  const v2 = att({ attestationId: 'att_v2', documentHash: SHA_V2 });
  const r1 = result({ id: 'LR-AAAA', attestationId: 'att_v1' });
  const r2 = result({ id: 'LR-BBBB', attestationId: 'att_v2', replaces: 'LR-AAAA', createdAt: r1.createdAt + 1000 });

  it('lab: the saved file is a report the lab signed and still stands behind → a tick', () => {
    const s = savedReportStatus(savedV1({ dnaResultId: 'LR-AAAA' }), arrivedFrom([r1]), [v1]);
    expect(s.kind).toBe('lab');
    expect(savedReportRow(s)).toEqual({ done: true, value: 'saved · matches the lab’s signed report' });
    expect(savedReportSentence(s)).toMatch(
      /matches a lab report signed by a key named “Test Lab” \(name not checked\), by its SHA-256/,
    );
  });

  it('replaced: the lab sent a correction → no tick, and the corrected one is offered', () => {
    const s = savedReportStatus(
      savedV1({ dnaResultId: 'LR-AAAA' }),
      arrivedFrom([{ ...r1, withdrawnAt: Date.UTC(2026, 9, 15) }, r2]),
      [retracted(v1, 'superseded'), v2],
    );
    expect(s.kind).toBe('replaced');
    if (s.kind !== 'replaced') return;
    expect(s.newer?.result.id).toBe('LR-BBBB');
    expect(savedReportRow(s)).toEqual({ done: false, value: 'replaced by the lab — save the corrected one' });
    expect(savedReportSentence(s)).toMatch(
      /was replaced by the lab on 2026-10-15 \(UTC\) with a corrected one, which is not saved yet\. The holder kept the old one saved\./,
    );
  });

  it('withdrawn: the lab withdrew it → no tick, said plainly', () => {
    const s = savedReportStatus(
      savedV1({ dnaResultId: 'LR-AAAA' }),
      arrivedFrom([{ ...r1, withdrawnAt: Date.UTC(2026, 9, 15) }]),
      [retracted(v1, 'issued-in-error')],
    );
    expect(s.kind).toBe('withdrawn');
    expect(savedReportRow(s)).toEqual({ done: false, value: 'withdrawn by the lab' });
    expect(savedReportSentence(s)).toMatch(
      /was withdrawn by the lab on 2026-10-15 \(UTC\)\. The holder kept it saved\./,
    );
  });

  it('original replaced and the correction withdrawn: no current report from that lab', () => {
    const all = [
      { ...r1, withdrawnAt: 1 },
      { ...r2, withdrawnAt: 2 },
    ];
    expect(correctionWithdrawn(all)).toBe(true);
    expect(correctionWithdrawn([r1])).toBe(false);
    expect(correctionWithdrawn([{ ...r1, withdrawnAt: 1 }])).toBe(false);
    const s = savedReportStatus(savedV1({ dnaResultId: 'LR-AAAA' }), arrivedFrom(all), [
      retracted(v1, 'superseded'),
      retracted(v2, 'issued-in-error'),
    ]);
    expect(s.kind).toBe('replaced');
    expect(savedReportRow(s)).toEqual({ done: false, value: 'replaced by the lab · no current report from acme-lab' });
  });

  it('matched from the signature alone when the delivery isn’t listed here (another device)', () => {
    expect(savedReportStatus(savedV1(), [], [retracted(v1, 'superseded')]).kind).toBe('replaced');
    expect(savedReportStatus(savedV1(), [], [retracted(v1, 'issued-in-error')]).kind).toBe('withdrawn');
    expect(savedReportStatus(savedV1(), [], [v1]).kind).toBe('lab');
  });

  it('self: no lab signature matches the saved file; none: nothing saved', () => {
    const s = savedReportStatus(
      savedV1({ dnaFileSha256: SHA_V2, dnaFingerprint: pairingFingerprintOfSha(SHA_V2) }),
      [],
      [v1],
    );
    expect(s.kind).toBe('self');
    expect(savedReportRow(s)?.done).toBe(true);
    expect(savedReportStatus(plant(), [], [v1])).toEqual({ kind: 'none' });
  });
});

describe('the public check page’s lab report line', () => {
  const v1 = att({ attestationId: 'att_v1', documentHash: SHA_V1 });

  it('never says "Not confirmed by a lab" beside a counted lab report signature', () => {
    for (const linkSha of [undefined, SHA_V1, SHA_V2]) {
      const l = publicReportLine({ paired: true, linkSha, atts: [v1], bound: true });
      expect(l.text).not.toMatch(/Not confirmed by a lab/);
    }
  });

  it('the link names the saved file and it matches the lab’s signature → checked, by SHA-256', () => {
    const l = publicReportLine({ paired: true, linkSha: SHA_V1, atts: [v1], bound: true });
    expect(l.status).toBe('checked');
    expect(l.text).toMatch(
      /Its file \(SHA-256 3bb6af11…111111\) matches the lab report signed by a key named “Test Lab”/,
    );
    expect(publicReportLine({ paired: true, linkSha: SHA_V1, atts: [v1], bound: false }).status).toBe('reported');
  });

  it('a saved report the lab replaced or withdrew → failed, in words', () => {
    const replaced = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      atts: [retracted(v1, 'superseded')],
      bound: true,
    });
    expect(replaced.status).toBe('failed');
    expect(replaced.text).toMatch(/was replaced by its lab on 2026-10-15 \(UTC\).*The holder kept the old one saved\./);
    const withdrawn = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      atts: [retracted(v1, 'issued-in-error')],
      bound: true,
    });
    expect(withdrawn.status).toBe('failed');
    expect(withdrawn.text).toMatch(/was withdrawn by its lab on 2026-10-15 \(UTC\)\. The holder kept it saved\./);
  });

  it('no matching signature, or no file named, is said as exactly that', () => {
    expect(publicReportLine({ paired: true, linkSha: SHA_V2, atts: [v1], bound: true }).text).toMatch(
      /No lab signature on this record matches it, so it is the holder’s own statement/,
    );
    expect(publicReportLine({ paired: true, atts: [v1], bound: true }).text).toMatch(
      /This link doesn’t name the file, so this page can’t tell whether it is the signed lab report listed above/,
    );
    expect(publicReportLine({ paired: true, atts: [], bound: true }).text).toMatch(/No lab has signed a lab report/);
    expect(publicReportLine({ paired: false, atts: [v1], bound: true }).text).toBe(
      'The holder has not saved a lab report to this record.',
    );
  });

  it('with the registry’s pairing fingerprint: matched without the link, and a stale link is called stale', () => {
    const pfp = pairingFingerprintOfSha(SHA_V1);
    const l = publicReportLine({ paired: true, pairingFingerprint: pfp, atts: [v1], bound: true });
    expect(l.status).toBe('checked');
    expect(l.text).not.toMatch(/as of when this link was made/);
    const stale = publicReportLine({ paired: true, pairingFingerprint: pfp, linkSha: SHA_V2, atts: [v1], bound: true });
    expect(stale.text).toMatch(/The holder has saved a different file since this link was made\./);
  });
});

describe('a lab report has one short id and one file name on both sides', () => {
  it('names the download with local date, time and the short id', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7 x');
    const at = new Date(2026, 9, 15, 14, 32).getTime();
    expect(shortResultId('LR-3f2a9c00000000000000000000000000')).toBe('LR-3F2A');
    expect(reportFileName(pdf, at, 'LR-3f2a9c00000000000000000000000000')).toBe(
      'Lab report 2026-10-15 14-32 LR-3F2A.pdf',
    );
    expect(reportFileName(pdf, at, 'LR-3f2a9c00000000000000000000000000')).not.toBe(
      reportFileName(pdf, at, 'LR-9e010000000000000000000000000000'),
    );
  });

  it('shows times with the zone’s name', () => {
    expect(localStamp(Date.UTC(2026, 9, 15, 14, 32), 'en-US')).toMatch(/2026.*(UTC|GMT|[A-Z]{2,5}|[+-]\d)/);
  });
});
