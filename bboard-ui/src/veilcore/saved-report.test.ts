// Round 5: the lab report saved to a plant follows what the lab did to it, and the public
// page says whether the saved file is the report a lab signed, matched on its SHA-256.
import { describe, expect, it } from 'vitest';
import {
  pairingPending,
  pendingReportLine,
  correctionWithdrawn,
  publicReportLine,
  savedFileSha,
  savedReportRow,
  savedReportSentence,
  savedReportStatus,
  withdrawnSignaturesLine,
  type ArrivedLike,
} from './saved-report';
import { pairingFingerprintOfSha } from './commitment';
import { dnaPairBinding } from './chain/pairing';
import { matchesBinding } from './dna-link';
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
      /was replaced by the lab on 2026-10-15 \(UTC\) with a corrected one\. The holder hasn’t saved the corrected one yet\./,
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
      /was withdrawn by the lab on 2026-10-15 \(UTC\)\. It is still the file saved here; the lab no longer stands behind it\./,
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
    expect(replaced.text).toMatch(
      /was replaced by its lab on 2026-10-15 \(UTC\) with a corrected one\. The holder hasn’t saved the corrected one yet\./,
    );
    const withdrawn = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      atts: [retracted(v1, 'issued-in-error')],
      bound: true,
    });
    expect(withdrawn.status).toBe('failed');
    expect(withdrawn.text).toMatch(
      /was withdrawn by its lab on 2026-10-15 \(UTC\)\. It is still the file saved here; the lab no longer stands behind it\./,
    );
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
      'The holder has not saved a DNA report to this record.',
    );
  });

  it('round 5: with the registry’s binding and the link’s salt, matched; without the salt, nobody can tell which file', () => {
    const l = publicReportLine({ paired: true, binding: bind(SHA_V1), linkDna: DNA, atts: [v1], bound: true });
    expect(l.status).toBe('checked');
    expect(l.text).toMatch(/matches the lab report signed by/);
    expect(l.text).not.toMatch(/as of when this link was made/);
    // A link without the salt (an older link, or one forwarded without it): saved, but which file can't be told.
    const noSalt = publicReportLine({ paired: true, binding: bind(SHA_V1), atts: [v1], bound: true });
    expect(noSalt.status).toBe('reported');
    expect(noSalt.tie).toEqual({ state: 'saved' });
    expect(noSalt.text).toBe(
      'The holder saved a DNA report to this record. Which file it is can be checked only with the holder’s own check link and the file.',
    );
    expect(noSalt.text).not.toMatch(/3bb6af/);
    // An old link's `rs` names a file, but against a binding it is matched only with the salt.
    const oldLink = publicReportLine({ paired: true, binding: bind(SHA_V1), linkSha: SHA_V1, atts: [], bound: true });
    expect(oldLink.text).not.toMatch(/3bb6af|as of when/);
  });
});

/** Round 5 (CONTRACT.md #29): the registry publishes only a binding; the link carries the salt. */
const DNA = { salt: 'b5'.repeat(32), identity: 'a1'.repeat(32) };
const bind = (sha: string) => dnaPairBinding(sha, DNA.identity, DNA.salt);

describe('round 5: a file the visitor chooses, checked against the binding with the link’s salt', () => {
  const v1 = att({ attestationId: 'att_v1', documentHash: SHA_V1 });
  it('the holder’s file matches, another file doesn’t, and neither leaves the browser', () => {
    const ok = publicReportLine({
      paired: true,
      binding: bind(SHA_V1),
      linkDna: DNA,
      chosenSha: SHA_V1,
      atts: [],
      bound: true,
    });
    expect(ok.chosen).toBe('matches');
    expect(ok.status).toBe('checked');
    expect(ok.text).toMatch(
      /^The file you chose is the one saved\. The holder saved a DNA report file to this record \(SHA-256 3bb6af11…111111\)/,
    );
    const other = publicReportLine({
      paired: true,
      binding: bind(SHA_V1),
      linkDna: DNA,
      chosenSha: SHA_V2,
      atts: [],
      bound: true,
    });
    expect(other.chosen).toBe('differs');
    expect(other.status).toBe('failed');
    expect(other.text).toMatch(/^The file you chose is not the one saved\./);
    expect(other.text).not.toMatch(/7c1e04/);
    // The holder's file, and it is the signed lab report too.
    const signed = publicReportLine({
      paired: true,
      binding: bind(SHA_V1),
      linkDna: DNA,
      chosenSha: SHA_V1,
      atts: [v1],
      bound: true,
    });
    expect(signed.chosen).toBe('matches');
    expect(signed.text).toMatch(/matches the lab report signed by/);
    // Without a chosen file and no signature to try: the page asks for the file.
    expect(publicReportLine({ paired: true, binding: bind(SHA_V1), linkDna: DNA, atts: [], bound: true }).text).toMatch(
      /To see which, choose the file the holder sent you/,
    );
  });

  it('a pairing saved before the SHA-256 was kept is bound over its pairing fingerprint, and still matches', () => {
    const l = publicReportLine({
      paired: true,
      binding: bind(pairingFingerprintOfSha(SHA_V1) ?? ''),
      linkDna: DNA,
      chosenSha: SHA_V1,
      atts: [],
      bound: true,
    });
    expect(l.chosen).toBe('matches');
    expect(matchesBinding(bind(SHA_V1), SHA_V1, DNA.identity, DNA.salt)).toBe('file');
    expect(matchesBinding(bind(SHA_V1), SHA_V2, DNA.identity, DNA.salt)).toBe(false);
    expect(matchesBinding(bind(SHA_V1), SHA_V1, DNA.identity, 'c'.repeat(64))).toBe(false);
  });
});

describe('round 6: the check page describes the file saved NOW, from the registry', () => {
  // The scenario the final review reproduced: the breeder saved v1; the lab replaced it
  // with v2; the breeder saved v2; the lab withdrew v2. Since round 5 the registry says
  // which file only as a binding, matched here with the link's salt.
  const v1 = att({ attestationId: 'att_v1', documentHash: SHA_V1 });
  const v2 = att({ attestationId: 'att_v2', documentHash: SHA_V2 });
  const pfp2 = pairingFingerprintOfSha(SHA_V2) ?? '';
  const finalAtts = [retracted(v1, 'superseded'), retracted(v2, 'issued-in-error')];

  it('the certificate’s link after a withdrawal says withdrawn, like the certificate', () => {
    const l = publicReportLine({ paired: true, binding: bind(SHA_V2), linkDna: DNA, atts: finalAtts, bound: true });
    expect(l.status).toBe('failed');
    expect(l.text).toMatch(
      /^The DNA report saved to this record \(SHA-256 7c1e0422…222222\) was withdrawn by its lab on 2026-10-15 \(UTC\)\./,
    );
    expect(l.text).not.toMatch(/No lab has signed|holder kept|as of when this link was made/);
    // The same story as the certificate, which reads it from the breeder's side.
    const cert = savedReportStatus(savedV1({ dnaFileSha256: SHA_V2, dnaFingerprint: pfp2 }), [], finalAtts);
    expect(cert.kind).toBe('withdrawn');
    expect(savedReportSentence(cert)).toContain('It is still the file saved here; the lab no longer stands behind it.');
    expect(l.text).toContain('It is still the file saved here; the lab no longer stands behind it.');
    // An older pairing (bound over its pairing fingerprint): the signature's SHA-256 is matched too.
    expect(
      publicReportLine({ paired: true, binding: bind(pfp2), linkDna: DNA, atts: finalAtts, bound: true }).text,
    ).toMatch(/\(SHA-256 7c1e0422…222222\) was withdrawn by its lab/);
  });

  it('the withdrawn-signatures line says what was withdrawn, and agrees with the lab report line', () => {
    expect(withdrawnSignaturesLine(finalAtts)).toBe(
      '2 signatures were withdrawn by their signers, so they are not counted: 2 lab reports.',
    );
    const receipt = att({ attestationId: 'att_r', type: 'chain-of-custody', documentHash: 'c'.repeat(64) });
    expect(withdrawnSignaturesLine([retracted(receipt, 'issued-in-error'), retracted(v1, 'superseded'), v2])).toBe(
      '2 signatures were withdrawn by their signers, so they are not counted: a lab’s receipt and a lab report.',
    );
    expect(withdrawnSignaturesLine([retracted(v1, 'superseded')])).toBe(
      'One signature was withdrawn by its signer, so it is not counted: a lab report.',
    );
    expect(withdrawnSignaturesLine([v1, v2])).toBeNull();
    // A signature that doesn't verify isn't counted as withdrawn either.
    expect(withdrawnSignaturesLine([{ ...retracted(v1, 'superseded'), signatureValid: false }])).toBeNull();
  });

  it('an old link after the breeder saved the corrected one: describes the corrected one, never "replaced"', () => {
    const l = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      binding: bind(SHA_V2),
      linkDna: DNA,
      atts: [retracted(v1, 'superseded'), v2],
      bound: true,
    });
    expect(l.status).toBe('checked');
    expect(l.text).toMatch(/Its file \(SHA-256 7c1e0422…222222\) matches the lab report signed by/);
    expect(l.text).not.toMatch(/replaced|kept|as of when this link was made/);
  });

  it('an old link after the lab withdrew the correction: describes the withdrawn correction, not the replaced original', () => {
    const l = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      binding: bind(SHA_V2),
      linkDna: DNA,
      atts: finalAtts,
      bound: true,
    });
    expect(l.status).toBe('failed');
    expect(l.text).toMatch(/\(SHA-256 7c1e0422…222222\) was withdrawn by its lab on 2026-10-15 \(UTC\)/);
    expect(l.text).not.toMatch(/3bb6af|replaced|kept/);
  });

  it('a link made before the lab replaced the saved report: factual, no intent', () => {
    const l = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      binding: bind(SHA_V1),
      linkDna: DNA,
      atts: [retracted(v1, 'superseded'), v2],
      bound: true,
    });
    expect(l.status).toBe('failed');
    expect(l.text).toBe(
      'The DNA report saved to this record (SHA-256 3bb6af11…111111) was replaced by its lab on 2026-10-15 (UTC) with a corrected one. The holder hasn’t saved the corrected one yet.',
    );
  });

  it('a binding no signature matches is never described as a signed file', () => {
    const l = publicReportLine({ paired: true, binding: bind(SHA_V1), linkDna: DNA, atts: [v2], bound: true });
    expect(l.status).toBe('reported');
    expect(l.text).toMatch(/choose the file the holder sent you/);
    expect(l.text).not.toMatch(/7c1e04/);
  });

  it('the link’s file is believed only when the registry is too old to send a binding, and then said as of the link', () => {
    const l = publicReportLine({ paired: true, linkSha: SHA_V1, atts: [v1], bound: true });
    expect(l.text).toMatch(/\(as of when this link was made\)/);
    // The registry binds a different file now: the link's file is never described.
    const now = publicReportLine({
      paired: true,
      linkSha: SHA_V1,
      binding: bind(SHA_V2),
      linkDna: DNA,
      atts: [v1],
      bound: true,
    });
    expect(now.status).toBe('reported');
    expect(now.text).not.toMatch(/3bb6af|matches the lab report/);
  });

  it('an older registry and a link naming no file: never "No lab has signed" beside withdrawn lab reports', () => {
    const l = publicReportLine({ paired: true, atts: finalAtts, bound: true });
    expect(l.text).not.toMatch(/No lab has signed/);
    expect(l.text).toMatch(/every lab report signed about this record was withdrawn by its lab/);
  });

  it('the breeder’s preview, the certificate and the check page use the same words', () => {
    const replacedHolder = savedReportSentence({ kind: 'replaced', lab: 'acme-lab', at: Date.UTC(2026, 9, 15) });
    const replacedPublic = publicReportLine({
      paired: true,
      binding: bind(SHA_V1),
      linkDna: DNA,
      atts: [retracted(v1, 'superseded')],
      bound: true,
    }).text;
    for (const t of [replacedHolder, replacedPublic]) {
      expect(t).toMatch(/2026-10-15 \(UTC\) with a corrected one\. The holder hasn’t saved the corrected one yet\.$/);
    }
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

describe('a stale pairing on the check page (the registry left it out)', () => {
  it('is "not known yet", never "no report saved", and only when the registry says dna is stale', () => {
    expect(pairingPending({ staleGrant: ['dna', 'sealed'] })).toBe(true);
    expect(pairingPending({ staleGrant: ['sealed'] })).toBe(false);
    expect(pairingPending({ staleGrant: ['dna'], dnaPairedByHolder: false })).toBe(false);
    expect(pairingPending({})).toBe(false);
    expect(pairingPending(undefined)).toBe(false);
    const line = pendingReportLine();
    expect(line.status).toBe('reported');
    expect(line.text).toMatch(/isn’t shown right now/);
    expect(line.text).not.toMatch(/not saved/);
  });
});
