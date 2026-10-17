// Whether a record is tied to the plant by a DNA report (dna-tie.ts): no report, saved by the
// holder, signed by a lab, dated, and replaced or withdrawn by the lab. Same words on every
// screen; the check page's are neutral; nothing says a report proves a plant matches.
// Run: npx vitest run src/veilcore/dna-tie.test.ts
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  dnaDateOf,
  dnaDateWords,
  dnaTieMeaning,
  dnaTieOf,
  dnaTieRow,
  dnaTieSentence,
  isTied,
  type DnaTie,
} from './dna-tie';
import { publicReportLine, savedReportStatus, type SavedReport } from './saved-report';
import { pairingFingerprintOfSha } from './commitment';
import { dnaPairBinding } from './chain/pairing';
import type { ResolvedAttestation } from './attesters';
import type { StrainRecord } from './records';
import { makeTranslator } from '../i18n/translate';
import { appJa } from '../i18n/app/ja';
import { appEn } from '../i18n/app/en';
import { tiedToPlantLines } from './evidence/bundle';

const PLANT_FP = 'b'.repeat(64);
const SHA = '3bb6af'.padEnd(64, '1');
const LAB = 'a1'.repeat(16);

const att = (over: Partial<ResolvedAttestation> = {}): ResolvedAttestation => ({
  attestationId: 'att_1',
  type: 'laboratory-report',
  subjectCommitment: PLANT_FP,
  attester: { publicKey: LAB, displayName: 'Test Lab' },
  documentHash: SHA,
  hashAlgorithm: 'sha256',
  issuedAt: '2026-10-14T10:00:00Z',
  signature: 'sig',
  strength: 'signed',
  registeredAs: { displayName: 'Test Lab' },
  retraction: null,
  signatureValid: true,
  ...over,
});

const plant = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: 'VEIL-1',
  strainName: 'Harbour Mist (practice)',
  bredBy: 'Test',
  dateCreated: '2026-10-01',
  notes: '',
  loggedAt: Date.UTC(2026, 9, 1),
  recordFingerprint: PLANT_FP,
  ...over,
});

const saved = plant({ dnaFingerprint: pairingFingerprintOfSha(SHA), dnaFileSha256: SHA, dnaFileName: 'dna.pdf' });
const status = (r: StrainRecord, atts: ResolvedAttestation[]): SavedReport => savedReportStatus(r, [], atts);
const NOT_DATED = dnaDateOf(false);

describe('a record and its DNA report', () => {
  it('no report saved: not tied yet, and the holder is told to add one', () => {
    const tie = dnaTieOf(status(plant(), []));
    expect(tie).toEqual({ state: 'none' });
    expect(isTied(tie)).toBe(false);
    expect(dnaTieSentence(tie, NOT_DATED)).toBe('Not tied to the plant yet: add a DNA report.');
    const row = dnaTieRow(tie, NOT_DATED);
    expect(row).toMatchObject({ id: 'DNA report', mark: 'wait', label: 'Not tied to the plant yet' });
    expect(row.value).toBe('add a DNA report');
    expect(row.sub).toBe('A DNA report from your lab is what ties a record to the plant itself.');
  });

  it('a lab report that came back but isn’t saved yet ties nothing, and says so', () => {
    const tie = dnaTieOf(status(plant(), []));
    expect(dnaTieRow(tie, NOT_DATED, { waiting: 1 }).value).toBe('a lab report came back: open it and save it here');
    expect(dnaTieRow(tie, NOT_DATED, { openedNotSaved: true }).value).toBe(
      'a lab report is open, not saved to this plant',
    );
  });

  it('saved by the holder, no lab signature on the file: tied, and said whose it is', () => {
    const tie = dnaTieOf(status(saved, []));
    expect(tie).toEqual({ state: 'self' });
    expect(isTied(tie)).toBe(true);
    expect(dnaTieSentence(tie, NOT_DATED)).toBe(
      'Tied to the plant: DNA report you saved (no lab signature matches it), not dated yet.',
    );
    // The check page says it neutrally: the holder, not "you".
    expect(dnaTieSentence(tie, undefined, 'public')).toBe(
      'Tied to the plant: DNA report the holder saved (no lab signature matches it).',
    );
    expect(dnaTieRow(tie, NOT_DATED)).toMatchObject({ mark: 'done', label: 'Tied to the plant' });
  });

  it('signed by a lab: tied, by whom in the signer’s own words', () => {
    const tie = dnaTieOf(status(saved, [att()]));
    expect(tie).toEqual({ state: 'lab', lead: 'signed by a key named “Test Lab” (name not checked)' });
    expect(dnaTieSentence(tie, NOT_DATED)).toBe(
      'Tied to the plant: DNA report signed by a key named “Test Lab” (name not checked), not dated yet.',
    );
    const row = dnaTieRow(tie, NOT_DATED);
    expect(row.value).toBe('DNA report signed by a key named “Test Lab” (name not checked)');
    expect(row.sub).toBe('Report not dated yet. A lab can compare a new test of the plant with it.');
  });

  it('dated: being dated while its batch waits, then the date its own record shows', () => {
    const tie = dnaTieOf(status(saved, [att()]));
    const waiting = dnaDateOf(true, { mark: 'wait', value: 'waiting for a batch' });
    expect(waiting).toEqual({ state: 'dating', status: 'waiting for a batch' });
    expect(dnaTieSentence(tie, waiting)).toBe(
      'Tied to the plant: DNA report signed by a key named “Test Lab” (name not checked), being dated (waiting for a batch).',
    );
    const dated = dnaDateOf(true, { mark: 'done', value: '2026-10-15 UTC — checked on Midnight' });
    expect(dated).toEqual({ state: 'dated', date: '2026-10-15 UTC — checked on Midnight' });
    expect(dnaTieSentence(tie, dated)).toBe(
      'Tied to the plant: DNA report signed by a key named “Test Lab” (name not checked), dated 2026-10-15 UTC — checked on Midnight.',
    );
    // The registry's word is said as the registry's, as the record's own date row says it.
    expect(
      dnaDateWords(dnaDateOf(true, { mark: 'reported', value: '2026-10-15 UTC (VeilCore’s registry’s report)' })),
    ).toBe('dated 2026-10-15 UTC (VeilCore’s registry’s report)');
    expect(dnaDateWords(dnaDateOf(true, { mark: 'failed', value: 'date stamp not confirmed on Midnight' }))).toBe(
      'not dated: date stamp not confirmed on Midnight',
    );
    expect(dnaTieRow(tie, dated).sub).toBe(
      'Report dated 2026-10-15 UTC — checked on Midnight. A lab can compare a new test of the plant with it.',
    );
  });

  it('replaced or withdrawn by the lab: not tied now, never a tick', () => {
    const replaced = dnaTieOf(
      status(saved, [att({ retraction: { reason: 'superseded', retractedAt: '2026-10-15T00:00:00Z' } as never })]),
    );
    expect(replaced).toEqual({ state: 'replaced' });
    expect(isTied(replaced)).toBe(false);
    expect(dnaTieSentence(replaced, NOT_DATED)).toBe(
      'Not tied to the plant now: the lab replaced the DNA report saved here.',
    );
    expect(dnaTieRow(replaced, NOT_DATED)).toMatchObject({
      mark: 'failed',
      done: false,
      label: 'Not tied to the plant now',
    });

    const withdrawn = dnaTieOf(
      status(saved, [att({ retraction: { reason: 'error', retractedAt: '2026-10-15T00:00:00Z' } as never })]),
    );
    expect(withdrawn).toEqual({ state: 'withdrawn' });
    expect(dnaTieSentence(withdrawn, NOT_DATED)).toBe(
      'Not tied to the plant now: the lab withdrew the DNA report saved here.',
    );
  });
});

describe('the check page (publicReportLine)', () => {
  // Round 5: the registry sends a binding; the link carries the salt and identity.
  const DNA = { salt: 'b5'.repeat(32), identity: 'a1'.repeat(32) };
  const binding = dnaPairBinding(SHA, DNA.identity, DNA.salt);
  it('nothing saved: "not tied yet", in words that blame no one', () => {
    const l = publicReportLine({ paired: false, atts: [], bound: true });
    expect(l.tie).toEqual({ state: 'none' });
    expect(dnaTieSentence(l.tie, undefined, 'public')).toBe(
      'Not tied to the plant yet: no DNA report is saved to this record.',
    );
  });
  it('a lab-signed file, a holder’s own file, an unnamed file, and a withdrawn one', () => {
    expect(publicReportLine({ paired: true, binding, linkDna: DNA, atts: [att()], bound: true }).tie).toEqual({
      state: 'lab',
      lead: 'signed by a key named “Test Lab” (name not checked)',
    });
    expect(
      publicReportLine({ paired: true, binding, linkDna: DNA, chosenSha: SHA, atts: [], bound: true }).tie,
    ).toEqual({
      state: 'self',
    });
    const unnamed = publicReportLine({ paired: true, atts: [att()], bound: true }).tie;
    expect(unnamed).toEqual({ state: 'saved' });
    expect(dnaTieSentence(unnamed, undefined, 'public')).toBe('Tied to the plant: DNA report the holder saved.');
    const gone = publicReportLine({
      paired: true,
      binding,
      linkDna: DNA,
      atts: [att({ retraction: { reason: 'error', retractedAt: '2026-10-15T00:00:00Z' } as never })],
      bound: true,
    });
    expect(gone.tie).toEqual({ state: 'withdrawn' });
    expect(gone.status).toBe('failed');
  });
});

describe('what it claims, in every language', () => {
  it('never says a DNA report proves the plant matches: it lets a lab compare', () => {
    expect(dnaTieMeaning()).toBe(
      'A DNA report lets a lab compare a new test of a plant with it. It doesn’t show by itself that a plant matches.',
    );
    for (const [k, v] of Object.entries(appEn as Record<string, string>).filter(([k]) =>
      k.startsWith('app.plant.tie.'),
    ))
      expect(/\b(proves?|confirms?|guarantees?|verif(y|ies))\b/i.test(v), `${k}: ${v}`).toBe(false);
  });

  it('is said in the visitor’s language (Japanese: DNA報告書)', () => {
    const ja = makeTranslator('ja', appJa);
    const tie: DnaTie = { state: 'none' };
    expect(dnaTieSentence(tie, dnaDateOf(false), 'holder', ja)).toBe(
      'まだ植物に結び付いていません：DNA報告書を追加してください。',
    );
    expect(dnaTieSentence({ state: 'self' }, dnaDateOf(false), 'holder', ja)).toContain('DNA報告書');
  });
});

describe('the evidence bundle’s README.txt (bundle.ts tiedToPlantLines)', () => {
  type Ev = Parameters<typeof tiedToPlantLines>[0];
  type Sig = Parameters<typeof tiedToPlantLines>[1][number];
  const ev = (labReport: Ev['labReport']) => ({ labReport }) as Ev;
  const sig = (over: Partial<Sig> = {}): Sig => ({
    ok: true,
    withdrawn: false,
    text: '',
    type: 'laboratory-report',
    publicKey: LAB,
    displayName: 'Test Lab',
    savedReport: true,
    ...over,
  });
  const report = { pairingFingerprint: pairingFingerprintOfSha(SHA) ?? '', fileSha256: SHA };

  it('no DNA report: not tied yet, and what would tie it', () => {
    expect(tiedToPlantLines(ev(null), [])).toEqual([
      'Not tied to the plant yet: no DNA report is saved to this record.',
      "A DNA report (a lab's genotype of the plant) is what ties a record to the plant itself. VeilCore doesn't test DNA.",
    ]);
  });

  it('a lab-signed report, dated by its own record, and what it does and doesn’t show', () => {
    expect(tiedToPlantLines(ev(report), [sig()], 'VEIL-D1')).toEqual([
      `Tied to the plant: DNA report signed by a key named “Test Lab” (name not checked; key ${LAB}).`,
      "A separate record, VEIL-D1, dates this DNA report's existence: it holds only the report's SHA-256. Its own evidence bundle has its date.",
      'A DNA report lets a lab compare a new test of a plant with it. It doesn’t show by itself that a plant matches.',
    ]);
  });

  it('the holder’s own file, not dated; a withdrawn one is not tied now', () => {
    expect(tiedToPlantLines(ev(report), [])[0]).toBe(
      'Tied to the plant: DNA report the holder saved (no lab signature matches it).',
    );
    expect(tiedToPlantLines(ev(report), [])[1]).toBe(
      "Nothing dates this DNA report yet: it was saved after sealing, so this record's batch doesn't date it.",
    );
    expect(tiedToPlantLines(ev(report), [sig({ withdrawn: true, withdrawnReason: 'error' })])).toEqual([
      'Not tied to the plant now: the lab withdrew the DNA report saved here.',
    ]);
  });
});
