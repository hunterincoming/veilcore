// Where a plant came from (origin-notes.ts), the plant form's "Bred by" rule (log-flow-state.ts),
// and a genebank passport sheet (MCPD) through the bulk import (bulk-import.ts): all sealed in
// fields a plant record already has, so no record's fingerprint is computed any differently.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LANDRACE_METHOD,
  acqDateOf,
  emptyOrigin,
  isTraditionalOrWild,
  originHasContent,
  originLines,
  originNotes,
  parseOrigin,
  parseOriginBlock,
} from './origin-notes';
import {
  breederRequired,
  draftHasContent,
  emptyDraft,
  originApplies,
  parseDraft,
  plantReady,
  sealInputOf,
  type Draft,
} from '../components/flow/log-flow-state';
import { parseStageHeader } from '../components/stage/stage-notes';
import { committedRecordFields, type CommittedRecordInput } from './commitment';
import { sealRecord } from './seal-record';
import { checkIntegrity, isStrainRecord, type StrainRecord } from './records';
import { toEnvelope } from './envelope';
import { __resetRecordKeysForTests } from './record-keys';
import { guessMapping, rowFields, type SheetRow } from './bulk-import';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => vi.unstubAllGlobals());

describe('the origin lines in the notes', () => {
  it('writes labelled lines in a fixed order, then a blank line, then the holder’s notes', () => {
    const o = { ...emptyOrigin(), doi: '10.18730/ABC', from: 'Sierra Mazateca\ncommunity seed bank', country: 'MEX' };
    expect(originLines(o)).toEqual([
      'Where it came from: Sierra Mazateca community seed bank',
      'Country of origin: MEX',
      'DOI or PUID: 10.18730/ABC',
    ]);
    expect(originNotes(o, '  kept in jars  ')).toBe(
      'Where it came from: Sierra Mazateca community seed bank\nCountry of origin: MEX\nDOI or PUID: 10.18730/ABC\n\nkept in jars',
    );
    // Nothing typed: the notes are the holder's own, unchanged but for trimming.
    expect(originNotes(emptyOrigin(), ' just notes ')).toBe('just notes');
    expect(originNotes(undefined, '')).toBe('');
  });

  it('reads back exactly what it wrote, and nothing the holder wrote further down', () => {
    const o = { ...emptyOrigin(), smta: 'SMTA-77', ircc: 'ABSCH-IRCC-MX-1234', received: '2019-03-04' };
    const notes = originNotes(o, 'SMTA: not a label down here');
    expect(parseOriginBlock(notes)).toEqual({
      origin: { received: '2019-03-04', smta: 'SMTA-77', ircc: 'ABSCH-IRCC-MX-1234' },
      rest: 'SMTA: not a label down here',
    });
    // Ordinary notes, or a label not at the start, are the holder's own.
    expect(parseOriginBlock('Watered daily.\nSMTA: 1')).toEqual({ origin: {}, rest: 'Watered daily.\nSMTA: 1' });
    // A label line not ended by a blank line is not a block.
    expect(parseOriginBlock('SMTA: 1\nmore text')).toEqual({ origin: {}, rest: 'SMTA: 1\nmore text' });
  });

  it('a typed line break can never start a line that reads as another label', () => {
    const o = { ...emptyOrigin(), from: 'a place\nSMTA: forged' };
    expect(parseOriginBlock(originNotes(o, '')).origin).toEqual({ from: 'a place SMTA: forged' });
  });

  it('reads MCPD dates and statuses as a passport sheet writes them', () => {
    expect(acqDateOf('20190304')).toBe('2019-03-04');
    expect(acqDateOf('1968----')).toBe('1968----');
    expect(isTraditionalOrWild('300')).toBe(true);
    expect(isTraditionalOrWild('110')).toBe(true);
    expect(isTraditionalOrWild('500')).toBe(false);
  });

  it('keeps a stored origin to strings, each cut to length', () => {
    expect(parseOrigin({ from: 'x'.repeat(500), country: 7 })).toMatchObject({ from: 'x'.repeat(200), country: '' });
    expect(parseOrigin('nope')).toBeUndefined();
    expect(originHasContent(emptyOrigin())).toBe(false);
  });
});

describe('the plant form: "Bred by" only for the holder’s own breeding', () => {
  const draft = (over: Partial<Draft> = {}): Draft => ({ ...emptyDraft(), strainName: 'Oaxacan Gold', ...over });

  it('needs a breeder for the holder’s own breeding, and none for a landrace or received material', () => {
    expect(plantReady(draft())).toBe(false);
    expect(plantReady(draft({ bredBy: 'Harbour Farm' }))).toBe(true);
    expect(plantReady(draft({ source: 'received' }))).toBe(true);
    expect(plantReady(draft({ source: 'landrace' }))).toBe(true);
    // "How it was made: Landrace / heirloom" says it too, chosen or not.
    expect(breederRequired(draft({ breedingMethod: LANDRACE_METHOD }))).toBe(false);
    expect(breederRequired(draft({ breedingMethod: LANDRACE_METHOD, source: 'bred' }))).toBe(true);
    expect(plantReady(draft({ strainName: ' ', source: 'landrace' }))).toBe(false);
  });

  it('offers "Where it came from" only for a landrace or received material, never a next stage', () => {
    expect(originApplies(draft())).toBe(false);
    expect(originApplies(draft({ source: 'received' }))).toBe(true);
    expect(originApplies(draft({ breedingMethod: LANDRACE_METHOD }))).toBe(true);
    expect(originApplies(draft({ source: 'received', stageOf: 'VEIL-1' }))).toBe(false);
  });

  it('seals the origin in the notes, after a stage header, and only while the step is offered', () => {
    const origin = { ...emptyOrigin(), collection: 'Banco Comunitario', country: 'MEX' };
    const d = draft({ source: 'landrace', origin, notes: 'Grown out 2026.' });
    const input = sealInputOf(d);
    expect(input.bredBy).toBe('');
    expect(input.notes).toBe('Collection or community: Banco Comunitario\nCountry of origin: MEX\n\nGrown out 2026.');
    // Switched back to "I bred it": what the hidden step held is not sealed.
    expect(sealInputOf({ ...d, source: 'bred', bredBy: 'Me' }).notes).toBe('Grown out 2026.');
    // With a stage header (a next stage never offers the step, but the order holds).
    const staged = sealInputOf({ ...d, stage: 'F3', stageOf: undefined });
    expect(parseStageHeader(staged.notes).stage).toBe('F3');
    expect(parseOriginBlock(parseStageHeader(staged.notes).rest).origin).toEqual({
      collection: 'Banco Comunitario',
      country: 'MEX',
    });
  });

  it('keeps the choice and the origin in the draft between visits', () => {
    const d = draft({ source: 'received', origin: { ...emptyOrigin(), permit: 'P-1' } });
    const back = parseDraft(JSON.stringify(d));
    expect(back?.source).toBe('received');
    expect(back?.origin?.permit).toBe('P-1');
    expect(draftHasContent({ ...emptyDraft(), source: 'landrace' })).toBe(true);
    expect(parseDraft(JSON.stringify({ ...d, source: 'stolen' }))?.source).toBeUndefined();
  });

  it('a record with no breeder seals and recomputes, with the same fields every plant record seals', async () => {
    const r = (await sealRecord(
      sealInputOf(draft({ source: 'landrace', origin: { ...emptyOrigin(), from: 'A village seed fair' } })),
    )) as StrainRecord;
    expect(isStrainRecord(r)).toBe(true);
    expect(await checkIntegrity(r)).toBe('match');
    const fields = committedRecordFields(r as CommittedRecordInput);
    // Exactly the fields a plant bred by its holder seals; the origin is only in the notes, so no
    // record hashes differently.
    const own = await sealRecord(sealInputOf(draft({ bredBy: 'Harbour Farm' })));
    expect(Object.keys(fields).sort()).toEqual(Object.keys(committedRecordFields(own)).sort());
    expect(Object.keys(fields)).not.toContain('origin');
    expect(fields.bredBy).toBe('');
    expect(fields.notes).toBe('Where it came from: A village seed fair');
    // An empty breeder names no originator in the envelope (SPEC 3.1 `subject.originator`).
    expect(toEnvelope(r, 'holder:test').subject?.originator).toBeUndefined();
  });
});

describe('a genebank passport sheet (MCPD) through the bulk import', () => {
  const headers = [
    'INSTCODE',
    'ACCENUMB',
    'ACCENAME',
    'GENUS',
    'SPECIES',
    'SAMPSTAT',
    'COLLSRC',
    'ORIGCTY',
    'ACQDATE',
    'PUID',
    'REMARKS',
  ];
  const row = (cells: string[]): SheetRow => ({ line: 2, cells });

  it('maps the descriptor names exactly, and leaves the rest to the usual guesses', () => {
    const m = guessMapping(headers);
    expect(m.columns).toMatchObject({
      refId: 1,
      strainName: 2,
      genus: 3,
      taxon: 4,
      sampStat: 5,
      collSrc: 6,
      origCty: 7,
      acqDate: 8,
      puid: 9,
      notes: 10,
    });
    expect(m.columns.bredBy).toBeNull();
  });

  it('seals the genus with the species, the passport values in the notes, and a landrace as one', () => {
    const m = guessMapping(headers);
    const f = rowFields(
      row(['MEX001', 'CIMMYT-123', 'Bolita', 'Zea', 'mays', '300', '20', 'MEX', '20190304', '10.18730/XYZ', 'blue']),
      m,
    );
    expect(f.strainName).toBe('Bolita');
    expect(f.refId).toBe('CIMMYT-123');
    expect(f.taxon).toBe('Zea mays');
    expect(f.bredBy).toBe('');
    expect(f.breedingMethod).toBe(LANDRACE_METHOD);
    expect(f.notes).toBe(
      'Country of origin: MEX\nReceived on: 2019-03-04\nDOI or PUID: 10.18730/XYZ\nMCPD SAMPSTAT: 300\nMCPD COLLSRC: 20\n\nblue',
    );
    // An advanced cultivar (SAMPSTAT 500) is not called a landrace.
    expect(
      rowFields(row(['', 'A2', 'B73', 'Zea', 'mays', '500', '', '', '', '', '']), m).breedingMethod,
    ).toBeUndefined();
  });

  it('a sheet without passport columns imports exactly as before', () => {
    const m = guessMapping(['Name', 'Species', 'Notes']);
    const f = rowFields(row(['Harbour Mist', 'Cannabis sativa', 'note']), m);
    expect(f).toMatchObject({ strainName: 'Harbour Mist', taxon: 'Cannabis sativa', notes: 'note' });
    expect(f.breedingMethod).toBeUndefined();
  });
});
