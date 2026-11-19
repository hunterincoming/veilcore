// The pack for the authority (authority-pack.ts, authority-pack-gather.ts): which records it
// covers, the plant counts and where they come from, missing chromatography found and listed
// first, a lab's numbers shown only when a lab stands behind them (claim-call.ts labStands), the
// dates worded as the check pages word them, the variety registration number sealed in a plant's
// notes, and the number of linked patients never in any request.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPack,
  countsOf,
  dateChecked,
  dateLines,
  dayOf,
  gapWords,
  isChromatographyReport,
  lastSixMonths,
  monthsBefore,
  packRecords,
  permitYear,
  registrationOf,
  reportLine,
  selectPack,
  type DateFacts,
  type PackFacts,
} from './authority-pack';
import { dateFactsOf, gatherPackFacts } from './authority-pack-gather';
import { proofFor } from './proofs';
import { KIND_SCHEMA_ID } from './document-kind';
import { DOCUMENT_PROFILE } from './document-profile';
import { emptyOrigin, originNotes } from './origin-notes';
import { emptyDraft, sealInputOf, parseDraft } from '../components/flow/log-flow-state';
import { stageNotes } from '../components/stage/stage-notes';
import type { StrainRecord } from './records';
import { enT, makeTranslator } from '../i18n/translate';
import { appEs } from '../i18n/app/es';

const es = makeTranslator('es', appEs);
const PERIOD = { from: '2026-05-19', to: '2026-11-18' };
const PATIENTS = 7349;

/** 64 hex with no 7, so the patient number can't turn up inside one by chance. */
const fp = (n: number): string => n.toString(16).padStart(64, 'b').replace(/7/g, 'c');

const plant = (id: string, over: Partial<StrainRecord> = {}): StrainRecord => {
  const r: StrainRecord = {
    id,
    strainName: `Plant ${id}`,
    bredBy: 'E2E association (test data)',
    dateCreated: '2025-01-10',
    notes: '',
    loggedAt: Date.parse('2025-01-10T12:00:00Z'),
    recordFingerprint: fp(id.length * 97 + id.charCodeAt(id.length - 1)),
    ...over,
  };
  return r;
};

const doc = (
  id: string,
  over: Partial<StrainRecord> & { type?: string; about?: string[]; kind?: 'grow-batch' | 'harvest-lot' } = {},
): StrainRecord => {
  const { type = 'other', about = [], kind, ...rest } = over;
  return plant(id, {
    profile: DOCUMENT_PROFILE,
    strainName: `Doc ${id}`,
    refId: id,
    document: { type, issuer: '', files: [], about: about.map((a) => ({ name: `Named ${a}`, recordId: a })) },
    ...(kind
      ? {
          fieldSchema: KIND_SCHEMA_ID[kind],
          fieldSetRoot: 'cd'.repeat(32),
          fieldSet: {
            schema: kind === 'grow-batch' ? 'veilcore/schema/grow-batch/v1' : 'veilcore/schema/harvest-lot/v1',
            values: [null, null, null],
            fieldSecret: '',
          },
        }
      : {}),
    ...rest,
  } as Partial<StrainRecord>);
};

const counted = (r: StrainRecord, values: (string | null)[]): StrainRecord => {
  if (!r.fieldSet) throw new Error('not a chain record');
  return { ...r, fieldSet: { ...r.fieldSet, values } };
};

/** A small production chain: a plant with a registration, one without, batches, lots and reports. */
const chain = () => {
  const source = plant('VEIL-SRC1', {
    notes: originNotes({ ...emptyOrigin(), registration: 'INASE RNC 12345' }, 'Mother room.'),
  });
  const bare = plant('VEIL-SRC2', { strainName: 'Unregistered line' });
  const b1 = counted(doc('B-0042', { kind: 'grow-batch', about: [source.id], dateCreated: '2026-06-02' }), [
    '120',
    '80',
    '1250',
  ]);
  const b2 = counted(doc('B-0043', { kind: 'grow-batch', about: [bare.id], dateCreated: '2026-07-15' }), [
    '30',
    '12',
    null,
  ]);
  // Before the period, but a lot in the period is about it.
  const old = counted(doc('B-0010', { kind: 'grow-batch', about: [source.id], dateCreated: '2026-04-01' }), [
    '50',
    '0',
    null,
  ]);
  // Out of the period altogether.
  const later = counted(doc('B-0099', { kind: 'grow-batch', about: [source.id], dateCreated: '2026-12-01' }), [
    '999',
    '999',
    null,
  ]);
  const lot1 = counted(doc('L-0007', { kind: 'harvest-lot', about: [b1.id], dateCreated: '2026-09-10' }), [
    '118',
    '51200',
    '10400',
  ]);
  const lot2 = counted(doc('L-0008', { kind: 'harvest-lot', about: [old.id], dateCreated: '2026-06-20' }), [
    '48',
    null,
    null,
  ]);
  const lot3 = counted(doc('L-0009', { kind: 'harvest-lot', about: [b2.id], dateCreated: '2026-10-01' }), [
    '30',
    null,
    null,
  ]);
  const coa = doc('COA-7', { type: 'certificate-of-analysis', about: [lot1.id], dateCreated: '2026-09-20' });
  // Not chromatography: a lab result v2, and a report of genetic numbers.
  const pathogen = doc('LR-2', { type: 'lab-report', about: [lot3.id], labResult: {} as never });
  const genetic = doc('LR-3', {
    type: 'lab-report',
    about: [lot3.id],
    fieldSchema: 'ef'.repeat(32),
    fieldSet: { schema: 'veilcore/schema/variety-identity/v1', values: [], fieldSecret: '' },
  });
  // A corrected original is left out; its later version stands in.
  const superseded = {
    ...doc('COA-OLD', { type: 'certificate-of-analysis', about: [lot3.id] }),
    supersededBy: 'COA-NEW',
  };
  return { source, bare, b1, b2, old, later, lot1, lot2, lot3, coa, pathogen, genetic, superseded };
};

const all = (c: ReturnType<typeof chain>) => Object.values(c);

const noFacts: PackFacts = { dates: new Map(), labs: new Map(), links: new Map() };
const ctx = { madeAt: new Date('2026-11-18T15:00:00Z'), held: 13, locked: 0 };

describe('the period', () => {
  it('six months back includes both ends, and a short month is not overrun', () => {
    expect(lastSixMonths('2026-11-18')).toEqual({ from: '2026-05-19', to: '2026-11-18' });
    expect(monthsBefore('2026-08-31', 6)).toBe('2026-03-01');
    expect(monthsBefore('2028-08-31', 6)).toBe('2028-03-01');
  });
  it('a permit runs one year from its start, the anniversary not included (Res. 1780/2025 art. 10)', () => {
    expect(permitYear('2026-03-10')).toEqual({ from: '2026-03-10', to: '2027-03-09' });
    expect(permitYear('2028-02-29')).toEqual({ from: '2028-02-29', to: '2029-02-28' });
  });
  it('a record’s day is the date written on it, else the day it was sealed', () => {
    expect(dayOf({ dateCreated: '2026-06-02', loggedAt: 0 })).toBe('2026-06-02');
    expect(dayOf({ dateCreated: '', loggedAt: Date.parse('2026-07-01T23:30:00Z') })).toBe('2026-07-01');
  });
});

describe('which records a pack covers', () => {
  it('takes the batches and lots of the period, the batch an in-period lot names, and their sources', () => {
    const c = chain();
    const s = selectPack(all(c), PERIOD);
    expect(s.lots.map((r) => r.id)).toEqual(['L-0008', 'L-0007', 'L-0009']);
    expect(s.batches.map((b) => [b.record.id, b.outside])).toEqual([
      ['B-0010', true],
      ['B-0042', false],
      ['B-0043', false],
    ]);
    expect(s.sources.map((r) => r.id).sort()).toEqual(['VEIL-SRC1', 'VEIL-SRC2']);
    expect(packRecords(s).map((r) => r.id)).not.toContain('B-0099');
  });

  it('a lot’s chromatography is a lab report or COA about it; a lab result v2, genetic numbers and a corrected original are not', () => {
    const c = chain();
    expect(isChromatographyReport(c.coa)).toBe(true);
    expect(isChromatographyReport(c.pathogen)).toBe(false);
    expect(isChromatographyReport(c.genetic)).toBe(false);
    const s = selectPack(all(c), PERIOD);
    expect(s.reports.get('L-0007')?.map((r) => r.id)).toEqual(['COA-7']);
    expect(s.reports.get('L-0009')).toEqual([]);
    expect(s.reports.get('L-0008')).toEqual([]);
  });

  it('lists a source a batch names but this browser doesn’t hold, by the name sealed in the batch', () => {
    const lone = counted(doc('B-0050', { kind: 'grow-batch', about: ['VEIL-GONE'], dateCreated: '2026-06-01' }), [
      '5',
      '5',
      null,
    ]);
    const s = selectPack([lone], PERIOD);
    expect(s.missingSources).toEqual([{ id: 'VEIL-GONE', name: 'Named VEIL-GONE' }]);
    const p = buildPack(s, noFacts, {}, ctx);
    expect(p.gaps).toContainEqual({ kind: 'source', name: 'Named VEIL-GONE' });
  });
});

describe('plant counts', () => {
  it('sums the batches dated in the period, never one from outside it', () => {
    const c = chain();
    const counts = countsOf(selectPack(all(c), PERIOD), {});
    expect(counts).toEqual({ source: 'batches', plants: 150, inFlower: 92, batches: 2, batchesWithout: 0 });
  });
  it('uses what the officer typed instead, and says so', () => {
    const c = chain();
    const s = selectPack(all(c), PERIOD);
    expect(countsOf(s, { plants: 140, inFlower: 90 })).toMatchObject({ source: 'typed', plants: 140, inFlower: 90 });
    // Half typed: a gap, never the other half quietly taken from the batches.
    const p = buildPack(s, noFacts, { plants: 140 }, ctx);
    expect(p.counts).toMatchObject({ source: 'typed', plants: 140 });
    expect(p.counts.inFlower).toBeUndefined();
    expect(p.gaps).toContainEqual({ kind: 'counts' });
  });
  it('with no counted batch and nothing typed, the counts are a gap; a batch with no counts is named as left out', () => {
    const c = chain();
    const s = selectPack([c.source, counted(c.b1, [null, null, null])], PERIOD);
    expect(countsOf(s, {}).source).toBe('none');
    expect(buildPack(s, noFacts, {}, ctx).gaps).toContainEqual({ kind: 'counts' });
    const partial = buildPack(
      selectPack([c.source, c.bare, c.b1, counted(c.b2, [null, null, null])], PERIOD),
      noFacts,
      {},
      ctx,
    );
    expect(partial.counts).toMatchObject({ source: 'batches', plants: 120, batchesWithout: 1 });
    expect(partial.gaps).toContainEqual({ kind: 'countsPartial', n: 1 });
  });
});

describe('gaps, listed before anything else', () => {
  it('finds every lot with no chromatography report, and the source with no registration number', () => {
    const c = chain();
    const p = buildPack(selectPack(all(c), PERIOD), noFacts, { patients: PATIENTS }, ctx);
    const kinds = p.gaps.map((g) => g.kind);
    expect(p.gaps.filter((g) => g.kind === 'chromatography')).toEqual([
      { kind: 'chromatography', lot: 'L-0008' },
      { kind: 'chromatography', lot: 'L-0009' },
    ]);
    expect(p.gaps).toContainEqual({ kind: 'registration', source: 'Unregistered line' });
    expect(p.gaps).not.toContainEqual({ kind: 'registration', source: 'Plant VEIL-SRC1' });
    expect(kinds).not.toContain('patients');
    // No dates were looked up here: every record is "not dated yet", and says so.
    expect(p.gaps).toContainEqual({ kind: 'undated', n: packRecords(p.selection).length });
    expect(gapWords({ kind: 'chromatography', lot: 'L-0008' }, es)).toBe(
      'Lote L-0008: falta el informe cromatográfico.',
    );
  });
  it('a pack with no patient count says it is missing; one with every report has no chromatography gap', () => {
    const c = chain();
    const p = buildPack(selectPack([c.source, c.b1, c.lot1, c.coa], PERIOD), noFacts, {}, ctx);
    expect(p.gaps.map((g) => g.kind)).toContain('patients');
    expect(p.gaps.some((g) => g.kind === 'chromatography')).toBe(false);
  });
  it('counts records locked in this browser, which a pack leaves out', () => {
    const c = chain();
    const p = buildPack(selectPack(all(c), PERIOD), noFacts, {}, { ...ctx, locked: 2 });
    expect(p.gaps).toContainEqual({ kind: 'locked', n: 2 });
    expect(gapWords({ kind: 'locked', n: 2 }, enT)).toMatch(/^2 records in this browser are locked/);
  });
});

describe('a lab’s numbers, only when a lab stands behind them (labStands)', () => {
  const signed = (): StrainRecord =>
    doc('COA-S', {
      type: 'certificate-of-analysis',
      about: ['L-0007'],
      labSignature: { key: 'k', record: 'r', about: 'a' } as never,
      fieldSchema: 'aa'.repeat(32),
      fieldSet: {
        schema: 'veilcore/schema/potency/v1',
        values: ['21500', null, null, '700', null, null, '24100', '9800'],
        fieldSecret: '',
      },
    });
  const bound = { ok: true, lab: { ok: true, signer: { kind: 'bound' } } };

  it('shows the numbers, as the lab signed them, for a lab that is identified and hasn’t withdrawn', () => {
    const line = reportLine(signed(), bound, 'Signed by Example Lab.');
    expect(line.kind).toBe('lab-signed');
    if (line.kind !== 'lab-signed') return;
    expect(line.numbers).toEqual([
      { path: 'potency.totalThc', value: '21.500', unit: '%' },
      { path: 'potency.totalCbd', value: '0.700', unit: '%' },
      { path: 'potency.totalCannabinoids', value: '24.100', unit: '%' },
      { path: 'potency.moisture', value: '9.800', unit: '%' },
    ]);
  });

  it('shows the sealed document and no numbers for every other verdict', () => {
    for (const v of [
      undefined,
      { ok: false, lab: { ok: true, signer: { kind: 'bound' } } },
      { ok: true, lab: { ok: false, signer: { kind: 'bound' } } },
      { ok: true, lab: { ok: true, signer: { kind: 'none' } } },
      { ok: true, lab: { ok: true, signer: { kind: 'retracted' } } },
      { ok: true, lab: { ok: true, signer: { kind: 'conflict' } } },
      { ok: true, lab: { ok: true } },
    ]) {
      const line = reportLine(signed(), v, 'Signed by Example Lab.');
      expect(line).toMatchObject({ kind: 'document', labSignature: true });
      expect('numbers' in line).toBe(false);
    }
  });

  it('through the pack: the lot’s line follows the lab verdict that was looked up', () => {
    const c = chain();
    const r = signed();
    const s = selectPack([c.source, c.b1, c.lot1, r], PERIOD);
    const facts = (verdict: unknown): PackFacts => ({
      ...noFacts,
      labs: new Map([[r.id, { verdict: verdict as never, signer: 'Signed by Example Lab.' }]]),
    });
    expect(buildPack(s, facts(bound), {}, ctx).reports.get('L-0007')?.[0].kind).toBe('lab-signed');
    expect(
      buildPack(s, facts({ ok: true, lab: { ok: true, signer: { kind: 'none' } } }), {}, ctx).reports.get('L-0007')?.[0]
        .kind,
    ).toBe('document');
    // A signed report still covers the lot: it is there, only its numbers aren't shown.
    expect(buildPack(s, noFacts, {}, ctx).gaps.some((g) => g.kind === 'chromatography')).toBe(false);
  });
});

describe('what each date rests on', () => {
  const tx = 'ab'.repeat(32);
  const checked = (network: string): DateFacts => ({
    state: 'anchored',
    midnight: {
      network,
      txHash: tx,
      reportedAt: '2026-09-21T10:00:00Z',
      check: {
        status: 'checked',
        txHash: tx,
        blockHeight: 4242,
        blockTime: Date.parse('2026-09-21T10:02:00Z'),
        indexers: 2,
      },
    },
  });
  const reported: DateFacts = {
    state: 'anchored',
    midnight: {
      network: 'mainnet',
      txHash: tx,
      reportedAt: '2026-09-21T10:00:00Z',
      check: { status: 'unreachable', reason: 'x' },
    },
  };

  it('says "checked" only when this browser found the batch root on Midnight', () => {
    expect(dateChecked(checked('mainnet'))).toBe(true);
    expect(dateChecked(checked('preview'))).toBe(false);
    expect(dateChecked(reported)).toBe(false);
    expect(dateLines(checked('mainnet'), enT)[0]).toMatch(/^On Midnight’s main network: checked by this browser/);
    const r = dateLines(reported, enT).join(' ');
    expect(r).toContain('2026-09-21 10:00 UTC, as VeilCore’s registry reports it. Not checked by this browser');
    expect(r).not.toMatch(/checked by this browser when/);
    expect(dateLines(reported, es)[0]).toContain('según informa el servidor de registros de VeilCore. No comprobado');
  });

  it('a test network is practice data; a failed look-up says not to rely on the date', () => {
    expect(dateLines(checked('preview'), enT)[0]).toContain('A test network: practice data, not a real date.');
    const failed: DateFacts = {
      state: 'anchored',
      midnight: { network: 'mainnet', check: { status: 'failed', reason: 'no such transaction' } },
    };
    expect(dateLines(failed, enT)[0]).toContain('not confirmed: no such transaction. Don’t rely on the date');
  });

  it('not dated, in a batch, or not sealed: said plainly, with no date', () => {
    expect(dateLines({ state: 'none' }, enT)).toEqual(['Not dated on any network yet.']);
    expect(dateLines({ state: 'pending' }, enT)).toEqual(['In a batch, not dated on any network yet.']);
    expect(dateLines({ state: 'unsealed' }, enT)).toEqual(['Not sealed, so nothing dates it.']);
  });

  it('Bitcoin and RFC 3161 are the batch root’s, and a qualified authority is the registry’s statement to check', () => {
    const lines = dateLines(
      {
        ...reported,
        bitcoin: { status: 'bitcoin', blockHeight: 921000, blockTime: '2026-09-21T11:00:00Z' },
        tsa: { genTime: '2026-09-21T10:00:05Z', tsa: 'Example TSA', qualified: 'eIDAS' },
      },
      enT,
    );
    expect(lines[1]).toContain('VeilCore’s registry reports the batch root in Bitcoin block 921000');
    expect(lines[2]).toContain('the batch root carries a timestamp from Example TSA');
    expect(lines[2]).toContain('this record’s inclusion proof links it to that root');
    expect(lines[3]).toContain('Check the trusted list yourself');
    // Never that the record itself has a qualified timestamp.
    expect(lines.join(' ')).not.toMatch(/record (has|carries) a qualified/i);
  });

  it('dates checked on Midnight’s main network leave no gap; reported ones are counted as not checked', () => {
    const c = chain();
    const s = selectPack([c.source, c.b1, c.lot1, c.coa], PERIOD);
    const dates = new Map(packRecords(s).map((r, i) => [r.id, i === 0 ? reported : checked('mainnet')]));
    const p = buildPack(s, { ...noFacts, dates }, { patients: 1 }, ctx);
    expect(p.gaps.filter((g) => g.kind === 'undated' || g.kind === 'unchecked')).toEqual([{ kind: 'unchecked', n: 1 }]);
  });
});

describe('the variety registration number', () => {
  it('is read from the labelled block sealed in the notes, after a stage header too', () => {
    expect(registrationOf({ notes: 'Variety registration: INASE RNC 12345' })).toBe('INASE RNC 12345');
    expect(registrationOf({ notes: stageNotes('F3', '', 'Variety registration: RNC 9\n\nMy notes') })).toBe('RNC 9');
    // The holder's own notes can't pose as it.
    expect(registrationOf({ notes: 'Watered.\nVariety registration: forged' })).toBe('');
  });

  it('is sealed from the plant form whoever bred it, and kept in the draft', () => {
    const d = {
      ...emptyDraft(),
      strainName: 'Line 7',
      bredBy: 'Us',
      registration: ' INASE RNC 12345 ',
      notes: 'Notes.',
    };
    expect(sealInputOf(d).notes).toBe('Variety registration: INASE RNC 12345\n\nNotes.');
    expect(sealInputOf({ ...d, registration: '' }).notes).toBe('Notes.');
    // Received material: after the origin lines, in the one block.
    const received = sealInputOf({ ...d, source: 'received', origin: { ...emptyOrigin(), permit: 'P-1' } });
    expect(received.notes).toBe('Permit: P-1\nVariety registration: INASE RNC 12345\n\nNotes.');
    expect(registrationOf({ notes: received.notes })).toBe('INASE RNC 12345');
    expect(parseDraft(JSON.stringify(d))?.registration).toBe(' INASE RNC 12345 ');
  });
});

describe('the number of linked patients is never in any request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the look-ups are given the records only, and the pack is built without a request', async () => {
    const c = chain();
    const s = selectPack(all(c), PERIOD);
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init?: RequestInit) => {
        sent.push(`${url.toString()}\n${typeof init?.body === 'string' ? init.body : ''}`);
        return Promise.resolve(new Response(JSON.stringify({ error: 'not in a batch yet' }), { status: 404 }));
      }),
    );
    // Its only inputs: the selection and how to look things up. No form.
    expect(gatherPackFacts.length).toBe(2);
    const facts = await gatherPackFacts(s, {
      proof: (f) => proofFor(f),
      anchor: () => undefined,
      lab: async () => {
        await fetch('/attestations/subject/x');
        return { verdict: undefined, signer: '' };
      },
      link: (r) => `https://veilcore.org/verify/${r.id}?fp=${r.recordFingerprint}`,
      deviceOnly: () => false,
    });
    const before = sent.length;
    expect(before).toBe(packRecords(s).length);
    const p = buildPack(s, facts, { patients: PATIENTS, plants: 150, inFlower: 92 }, ctx);
    expect(sent.length).toBe(before);
    expect(p.form.patients).toBe(PATIENTS);
    for (const req of sent) expect(req).not.toContain(String(PATIENTS));
    // And the check links carry nothing typed into the form either.
    for (const link of facts.links.values()) expect(link).not.toContain(String(PATIENTS));
  });

  it('a record with no proof code is looked up nowhere', async () => {
    const proof = vi.fn();
    expect(await dateFactsOf(plant('VEIL-X', { recordFingerprint: '' }), { proof, anchor: () => undefined })).toEqual({
      state: 'unsealed',
    });
    expect(proof).not.toHaveBeenCalled();
  });

  it('never asks about a lab signature on a record kept on this device only', async () => {
    const c = chain();
    const r = { ...c.coa, labSignature: { key: 'k', record: 'r', about: 'a' } as never };
    const s = selectPack([c.source, c.b1, c.lot1, r], PERIOD);
    const lab = vi.fn(() => Promise.resolve({ verdict: undefined, signer: '' }));
    await gatherPackFacts(s, {
      proof: () => Promise.resolve({ status: 'none' }),
      anchor: () => undefined,
      lab,
      link: () => undefined,
      deviceOnly: (x) => x.id === r.id,
    });
    expect(lab).not.toHaveBeenCalled();
  });
});
