// Ask's handoff to the logging screen (handoff.ts, prefill.ts) and batches (batch.ts): what a
// link may carry, the provenance rule, the one-record prefill, and a batch sealed through the
// bulk import's path, held for the backup and then sent as the same records.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_BATCH,
  batchCount,
  draftLink,
  readAskState,
  readDraftFragment,
  readHandoff,
  HANDOFF_STATE_KEY,
} from './handoff';
import { prefillOf, sireAndDam } from './prefill';
import {
  CLONE_METHOD,
  batchProblems,
  batchRows,
  childNames,
  firstFreeStart,
  ownDefaults,
  type BatchPlan,
} from './batch';
import {
  HELD_FOR_BACKUP,
  holdForBackup,
  loadLedger,
  recordRowHash,
  sealRows,
  type Committer,
  type PreparedRow,
} from '../veilcore/bulk-import';
import { checkIntegrity, type StrainRecord } from '../veilcore/records';
import { __resetRecordKeysForTests, keysFor } from '../veilcore/record-keys';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import { MAX_ROWS } from '../veilcore/bulk-import';

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', () => {
    throw new Error('these tests never reach the network');
  });
  __resetRecordKeysForTests();
});

const ID = (n: number) => `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`;
const plant = (n: number, name: string): StrainRecord =>
  ({
    id: ID(n),
    strainName: name,
    bredBy: 'Harbour Farm',
    dateCreated: '2026-01-02',
    notes: '',
    taxon: 'Cannabis sativa',
    licenseIds: [],
    recordFingerprint: 'ab'.repeat(32),
  }) as unknown as StrainRecord;
const animal = (n: number, name: string, sex: 'male' | 'female'): StrainRecord => ({
  ...plant(n, name),
  taxon: 'Bos taurus',
  refId: `ID${n}`,
  profile: ANIMAL_PROFILE,
  animal: { breed: 'Wagyu', idScheme: 'ear tag', sex, herd: 'North' },
});

describe('a link carries kind, preset and count only', () => {
  it('reads a draft link, capped and checked', () => {
    expect(readDraftFragment('#draft=kind=plant&preset=clones&count=12')).toEqual({
      v: 1,
      source: 'link',
      kind: 'plant',
      preset: 'clones',
      count: 12,
    });
    // URL-encoded, as some chat apps rewrite links.
    expect(readDraftFragment('#draft=kind%3Danimal%26preset%3Doffspring%26count%3D3')?.count).toBe(3);
    expect(readDraftFragment(`#draft=preset=clones&count=${MAX_BATCH + 99}`)?.count).toBe(MAX_BATCH);
    expect(readDraftFragment('#draft=preset=clones&count=0')?.count).toBe(1);
    expect(MAX_BATCH).toBe(MAX_ROWS);
  });

  it('never takes a name, a parent or a record from a link', () => {
    const d = readDraftFragment(`#draft=kind=plant&preset=cross&name=Evil&parents=${ID(1)}&record=${ID(2)}`);
    expect(d).toEqual({ v: 1, source: 'link', kind: 'plant', preset: 'cross' });
    const p = prefillOf(d!, [plant(1, 'Blue Dream')]);
    expect(p.draft.strainName).toBe('');
    expect(p.draft.parents).toEqual([]);
    expect(p.filled.size).toBe(0);
  });

  it('refuses what is not a draft, and presets that do not fit the kind', () => {
    expect(readDraftFragment('#about')).toBeUndefined();
    expect(readDraftFragment('#draft=kind=plant&preset=offspring')).toBeUndefined();
    expect(readDraftFragment('#draft=kind=animal&preset=clones')).toBeUndefined();
    expect(readDraftFragment('#draft=kind=document')).toBeUndefined();
    expect(readDraftFragment(`#draft=${'x'.repeat(400)}`)).toBeUndefined();
  });

  it('draftLink makes what readDraftFragment reads', () => {
    const link = draftLink('https://veilcore.org/', { kind: 'animal', preset: 'offspring', count: 3 });
    expect(link).toBe('https://veilcore.org/new#draft=kind=animal&preset=offspring&count=3');
    expect(readDraftFragment(new URL(link).hash)).toMatchObject({ kind: 'animal', preset: 'offspring', count: 3 });
    expect(draftLink('https://veilcore.org', { kind: 'plant', preset: 'record', count: 9 })).not.toContain('count');
  });

  it('batchCount: whole numbers 1 to the limit', () => {
    expect(batchCount('7')).toBe(7);
    expect(batchCount(2.5)).toBeUndefined();
    expect(batchCount(-1)).toBeUndefined();
    expect(batchCount('1e3')).toBeUndefined();
  });
});

describe('Ask in this tab: values from the Ask box and the person’s own records', () => {
  const own = new Set([ID(1), ID(2)]);
  const state = (d: Record<string, unknown>) => ({ [HANDOFF_STATE_KEY]: { v: 1, source: 'ask', ...d } });

  it('keeps parents only if they are records in this browser', () => {
    const d = readAskState(state({ kind: 'plant', preset: 'cross', parents: [ID(1), ID(9), 'x', ID(2)] }), own);
    expect(d?.parents).toEqual([ID(1), ID(2)]);
  });

  it('caps a name, and reads Ask state before a link', () => {
    const d = readHandoff(
      {
        state: state({ kind: 'plant', preset: 'record', name: `  ${'a'.repeat(300)}  ` }),
        hash: '#draft=preset=clones',
      },
      own,
    );
    expect(d?.source).toBe('ask');
    expect(d && d.source !== 'link' ? d.name?.length : 0).toBe(200);
  });

  it('prefills a cross with both parents and marks what it filled', () => {
    const records = [plant(1, 'Blue Dream'), plant(2, 'Gelato')];
    const d = readAskState(
      state({ kind: 'plant', preset: 'cross', name: 'Blue Gelato', parents: [ID(1), ID(2)] }),
      own,
    );
    const p = prefillOf(d!, records);
    expect(p.draft.strainName).toBe('Blue Gelato');
    expect(p.draft.parents).toEqual([
      { recordId: ID(1), name: 'Blue Dream' },
      { recordId: ID(2), name: 'Gelato' },
    ]);
    expect([...p.filled].sort()).toEqual(['parents', 'strainName']);
  });

  it('an animal’s parents go to sire and dam by the sex their records say', () => {
    const bull = animal(4, 'Bull #4', 'male');
    const cow = animal(9, 'Cow #9', 'female');
    expect(sireAndDam([cow, bull])).toEqual({ sire: bull, dam: cow });
    const p = prefillOf({ v: 1, source: 'ask', kind: 'animal', preset: 'cross', parents: [cow.id, bull.id] }, [
      cow,
      bull,
    ]);
    expect(p.draft.animal?.sire).toEqual({ name: 'Bull #4', individualId: 'ID4', recordId: bull.id });
    expect(p.draft.animal?.dam.recordId).toBe(cow.id);
    expect([...p.filled].sort()).toEqual(['dam', 'sire']);
  });
});

describe('batches', () => {
  const mother = plant(12, 'Blue Dream #12');
  const plan = (over: Partial<BatchPlan> = {}): BatchPlan => ({
    preset: 'clones',
    count: 3,
    baseName: 'Blue Dream #12 clone',
    date: '2026-11-06',
    parent: mother,
    bredBy: 'Harbour Farm',
    taxon: 'Cannabis sativa',
    ...over,
  });

  it('names the children in order and says what is missing', () => {
    expect(childNames('X clone', 3)).toEqual(['X clone 1', 'X clone 2', 'X clone 3']);
    expect(batchProblems(plan())).toEqual([]);
    expect(batchProblems(plan({ parent: undefined, count: 0, baseName: ' ', bredBy: '', date: 'soon' }))).toEqual([
      'parent',
      'count',
      'name',
      'bredBy',
      'date',
    ]);
    // Offspring need a species; clones may leave it out.
    expect(batchProblems(plan({ taxon: '' }))).toEqual([]);
    expect(batchProblems(plan({ preset: 'offspring', parent: undefined, dam: mother, taxon: '' }))).toEqual([
      'species',
    ]);
    expect(batchProblems(plan({ count: MAX_BATCH + 1 }))).toEqual(['count']);
  });

  it('each clone names its parent inside its own record, as a clone', () => {
    const rows = batchRows(plan());
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.hash)).size).toBe(3);
    for (const r of rows) {
      expect(r.fields.parents).toEqual([{ recordId: mother.id, name: 'Blue Dream #12' }]);
      expect(r.fields.breedingMethod).toBe(CLONE_METHOD);
      expect(r.fields.bredBy).toBe('Harbour Farm');
      expect(r.fields.taxon).toBe('Cannabis sativa');
    }
  });

  it('offspring name sire and dam, with their IDs', () => {
    const bull = animal(4, 'Bull #4', 'male');
    const cow = animal(9, 'Cow #9', 'female');
    const [first] = batchRows({
      preset: 'offspring',
      count: 2,
      baseName: 'Calf',
      date: '2026-11-01',
      sire: bull,
      dam: cow,
      bredBy: 'North Farm',
      taxon: 'Bos taurus',
    });
    expect(first.fields.parents).toEqual([
      { recordId: bull.id, name: 'Bull #4', role: 'sire', individualId: 'ID4' },
      { recordId: cow.id, name: 'Cow #9', role: 'dam', individualId: 'ID9' },
    ]);
    expect(first.fields.animal).toEqual({ breed: 'Wagyu', idScheme: '', sex: 'unknown', herd: 'North' });
  });

  it('sealed here and held for the backup, then sent as the same records', async () => {
    const rows = batchRows(plan());
    const held = await sealRows(rows, { commit: holdForBackup, batchSize: rows.length, gapMs: 0 });
    expect(held.stopped).toContain(HELD_FOR_BACKUP);
    const pending = Object.values(loadLedger().rows);
    expect(pending.map((e) => e.state)).toEqual(['pending', 'pending', 'pending']);
    const ids = pending.map((e) => e.recordId);
    // Every new key is here before the backup is made.
    for (const id of ids) expect(keysFor(id)).toBeDefined();
    for (const e of pending) {
      expect(e.record?.parents).toEqual([{ recordId: mother.id, name: 'Blue Dream #12' }]);
      expect(e.record?.breedingMethod).toBe(CLONE_METHOD);
      expect(await checkIntegrity(e.record!)).toBe('match');
    }
    const sent: string[] = [];
    const commit: Committer = (batch) => {
      sent.push(...batch.map((r) => r.id));
      return Promise.resolve({ stored: batch.map((r) => r.id), refused: [] });
    };
    const done = await sealRows(rows, { commit, gapMs: 0 });
    expect(done.stopped).toBeUndefined();
    expect(sent.sort()).toEqual([...ids].sort());
    expect(Object.values(done.outcomes).every((o) => o.state === 'sealed')).toBe(true);
  });

  // Review round 1, B3: the bulk import treats a row it has seen as done, so a second identical
  // batch used to save nothing and say it was saved.
  const taken = (extra: readonly StrainRecord[] = []) =>
    new Set([...Object.keys(loadLedger().rows), ...extra.map(recordRowHash)]);
  const saveAll = async (rows: PreparedRow[]) => {
    const sent: string[] = [];
    const commit: Committer = (batch) => {
      sent.push(...batch.map((r) => r.id));
      return Promise.resolve({ stored: batch.map((r) => r.id), refused: [] });
    };
    await sealRows(rows, { commit: holdForBackup, batchSize: rows.length, gapMs: 0 });
    const done = await sealRows(rows, { commit, gapMs: 0 });
    return { sent, done };
  };

  it('the same clones cut again are new records, numbered on', async () => {
    const first = await saveAll(batchRows({ ...plan(), start: firstFreeStart(plan(), taken()) }));
    expect(first.sent).toHaveLength(3);
    const start = firstFreeStart(plan(), taken());
    expect(start).toBe(4);
    const again = batchRows({ ...plan(), start });
    expect(again.map((r) => r.fields.strainName)).toEqual([4, 5, 6].map((n) => `Blue Dream #12 clone ${n}`));
    const second = await saveAll(again);
    expect(second.sent).toHaveLength(3);
    expect(second.sent.some((id) => first.sent.includes(id))).toBe(false);
    // And a record already in the set counts too (sealed on another device).
    const elsewhere = {
      ...mother,
      id: ID(77),
      strainName: 'Blue Dream #12 clone 7',
      parents: [{ recordId: mother.id, name: 'Blue Dream #12' }],
      dateCreated: '2026-11-06',
      refId: '',
      notes: '',
    } as unknown as StrainRecord;
    expect(firstFreeStart(plan(), taken([elsewhere]))).toBe(8);
  });

  it('two litters of the same pair on the same day are both saved', async () => {
    const bull = animal(4, 'Bull #4', 'male');
    const cow = animal(9, 'Cow #9', 'female');
    const litter: BatchPlan = {
      preset: 'offspring',
      count: 2,
      baseName: 'Cow #9 offspring',
      date: '2026-11-06',
      sire: bull,
      dam: cow,
      bredBy: 'North Farm',
      taxon: 'Bos taurus',
    };
    const one = await saveAll(batchRows({ ...litter, start: firstFreeStart(litter, taken()) }));
    const start = firstFreeStart(litter, taken());
    expect(start).toBe(3);
    const two = await saveAll(batchRows({ ...litter, start }));
    expect(one.sent).toHaveLength(2);
    expect(two.sent).toHaveLength(2);
    expect(new Set([...one.sent, ...two.sent]).size).toBe(4);
  });

  // Review round 1, item 6: a received record's words are someone else's.
  it('fills breeder, species and breed only from records the person logged', () => {
    const received = {
      ...mother,
      bredBy: 'Their Farm',
      taxon: 'Their species',
      receivedFrom: 'aa'.repeat(32),
    } as unknown as StrainRecord;
    expect(ownDefaults([received])).toEqual({ bredBy: '', taxon: '' });
    expect(ownDefaults([received, mother])).toEqual({ bredBy: 'Harbour Farm', taxon: 'Cannabis sativa' });
    const cow = { ...animal(9, 'Cow #9', 'female'), receivedFrom: 'bb'.repeat(32) } as unknown as StrainRecord;
    const [row] = batchRows({
      preset: 'offspring',
      count: 1,
      baseName: 'Calf',
      date: '2026-11-06',
      dam: cow,
      bredBy: 'Me',
      taxon: 'Bos taurus',
    });
    expect(row.fields.animal).toEqual({ breed: '', idScheme: '', sex: 'unknown', herd: '' });
    expect(row.fields.bredBy).toBe('Me');
  });
});

describe('an unlikely number of young is pointed out, never refused', () => {
  it('more than 20 young from one dam: a note; clones and up to 20 young: none', async () => {
    const { unlikelyYoung, UNLIKELY_YOUNG } = await import('./batch');
    expect(UNLIKELY_YOUNG).toBe(20);
    expect(unlikelyYoung('offspring', 20)).toBe(false);
    expect(unlikelyYoung('offspring', 21)).toBe(true);
    expect(unlikelyYoung('offspring', 500)).toBe(true);
    expect(unlikelyYoung('clones', 500)).toBe(false);
    expect(unlikelyYoung('offspring', NaN)).toBe(false);
  });
});
