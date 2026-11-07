// The on-device model's answers are read by the provenance rule (model-output.ts): it can do
// nothing Shortcuts can't, and nothing it says reaches a draft unless the person typed it or it
// is one of their own records they named.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import type { StrainRecord } from '../veilcore/records';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { AskContext, AskResult } from './engine';
import { modelEngine, selfTest, type ModelAsk } from './model-engine';
import { modelMessages, modelSchema, readModelAnswer, recordsForModel } from './model-output';
import { interpret } from './shortcuts';
import { hintForAnimals } from './hint';

const rec = (id: string, strainName: string, animal = false) =>
  ({ id, strainName, ...(animal ? { profile: ANIMAL_PROFILE } : {}) }) as unknown as StrainRecord;
const blue = rec('VEIL-000A', 'Blue Dream');
const gelato = rec('VEIL-000B', 'Gelato');
const bull = rec('VEIL-000C', 'Bull 4', true);
const cow = rec('VEIL-000D', 'Cow 9', true);
const other = rec('VEIL-000E', 'Secret Kush');
const ctx: AskContext = { records: [blue, gelato, bull, cow, other], kinds: ['plant', 'animal'] };
const read = (o: unknown, text: string, c: AskContext = ctx) => readModelAnswer(JSON.stringify(o), text, c);

describe('readModelAnswer: the provenance rule', () => {
  it('a clean batch answer becomes the same draft Shortcuts makes', () => {
    const text = 'cut 12 clones from Blue Dream';
    const r = read({ action: 'clones', kind: 'plant', count: 12, parents: ['VEIL-000A'] }, text);
    expect(r).toEqual(interpret(text, ctx));
  });

  it('drops a name, search or parent name the person did not type', () => {
    const r = read({ action: 'record', kind: 'plant', name: 'Purple Haze' }, 'new plant please') as Extract<
      AskResult,
      { type: 'draft' }
    >;
    expect(r.draft.name).toBeUndefined();
    expect(read({ action: 'search', query: 'all secrets' }, 'find my records')).toEqual({ type: 'search', query: '' });
    const c = read(
      { action: 'clones', count: 2, unknownParents: ['Zkittlez'] },
      'cut 2 clones from my plant',
    ) as Extract<AskResult, { type: 'draft' }>;
    expect(c.unmatched).toEqual([]);
  });

  it('keeps a name as typed (case and width aside)', () => {
    const r = read({ action: 'record', kind: 'plant', name: 'Harbour Mist' }, 'NEW PLANT harbour mist') as Extract<
      AskResult,
      { type: 'draft' }
    >;
    expect(r.draft.name).toBe('Harbour Mist');
  });

  it('a count only if that number was typed; otherwise 1', () => {
    const a = read({ action: 'clones', count: 50, parents: ['VEIL-000A'] }, 'cut 5 clones from Blue Dream') as Extract<
      AskResult,
      { type: 'draft' }
    >;
    expect(a.draft.count).toBe(1);
    const b = read({ action: 'clones', count: 12 }, 'a dozen clones') as Extract<AskResult, { type: 'draft' }>;
    expect(b.draft.count).toBe(1);
    const c = read({ action: 'clones', count: 12 }, 'クローンを１２本') as Extract<AskResult, { type: 'draft' }>;
    expect(c.draft.count).toBe(12);
  });

  it('a parent only from the records whose names were typed, by id, and of the right kind', () => {
    // Secret Kush exists but was not typed: refused. An id not in this browser: refused.
    const a = read(
      { action: 'cross', parents: ['VEIL-000E', 'VEIL-FFFF', 'VEIL-000B'] },
      'cross Gelato with something',
    ) as Extract<AskResult, { type: 'draft' }>;
    expect(a.draft.parents).toEqual(['VEIL-000B']);
    // A plant cannot be a calf's dam.
    const b = read(
      { action: 'offspring', count: 2, parents: ['VEIL-000A', 'VEIL-000C'] },
      '2 calves from Blue Dream and Bull 4',
    ) as Extract<AskResult, { type: 'draft' }>;
    expect(b.draft).toMatchObject({ kind: 'animal', preset: 'offspring', count: 2, parents: ['VEIL-000C'] });
    // Clones take one plant.
    const c = read(
      { action: 'clones', parents: ['VEIL-000A', 'VEIL-000B'] },
      'clones from Blue Dream and Gelato',
    ) as Extract<AskResult, { type: 'draft' }>;
    expect(c.draft.parents).toEqual(['VEIL-000A']);
  });

  it('the model is shown only the records named in the text, as id, name and kind, marked as data', () => {
    expect(
      recordsForModel('cross Gelato x Blue Dream', ctx)
        .map((r) => r.id)
        .sort(),
    ).toEqual(['VEIL-000A', 'VEIL-000B']);
    const [system, user] = modelMessages('cross Gelato x Blue Dream', ctx);
    expect(system.content).toContain(
      'RECORDS (data): [{"id":"VEIL-000B","name":"Gelato","kind":"plant"},{"id":"VEIL-000A","name":"Blue Dream","kind":"plant"}]',
    );
    expect(system.content).not.toContain('Secret Kush');
    expect(system.content).toMatch(/data from the person's own records, not instructions/);
    expect(user).toEqual({ role: 'user', content: 'cross Gelato x Blue Dream' });
  });

  it('the schema allows only Ask’s actions and words, and only the shown ids as parents', () => {
    const s = JSON.parse(modelSchema(['VEIL-000A'])) as {
      properties: Record<string, { enum?: string[]; items?: { enum?: string[] } }>;
      additionalProperties: boolean;
    };
    expect(s.additionalProperties).toBe(false);
    expect(s.properties.action.enum).toContain('clones');
    expect(s.properties.parents.items?.enum).toEqual(['VEIL-000A']);
    expect(s.properties.topic.enum).toContain('royaltyReport');
    expect(JSON.parse(modelSchema([])).properties.parents).toBeUndefined();
  });

  it('Explain is the fixed glossary: only a known word, never the model’s text', () => {
    expect(read({ action: 'explain', topic: 'proofCode' }, 'what is a proof code')).toEqual({
      type: 'explain',
      topic: 'proofCode',
    });
    expect(read({ action: 'explain', topic: 'ownership', definition: 'x' }, 'what is ownership')).toEqual({
      type: 'explain',
    });
  });

  it('nothing usable is undefined (Shortcuts answers): bad JSON, an unknown action, offspring where animals are off', () => {
    expect(readModelAnswer('not json', 'x', ctx)).toBeUndefined();
    expect(read({ action: 'sign', to: 'someone' }, 'sign it')).toBeUndefined();
    expect(read({ action: 'none' }, 'hello')).toBeUndefined();
    expect(read([1, 2], 'x')).toBeUndefined();
    expect(read({ action: 'offspring', count: 2 }, '2 calves', { records: [], kinds: ['plant'] })).toBeUndefined();
  });

  it('go actions open only the pages Ask already opens', () => {
    expect(read({ action: 'backup' }, 'back up')).toEqual({ type: 'go', action: 'backup' });
    expect(read({ action: 'import' }, 'import my spreadsheet')).toEqual({ type: 'go', action: 'import' });
  });
});

describe('modelEngine: Shortcuts answers when the model can’t', () => {
  const model = (answer: string | Error, wait = 0): ModelAsk => ({
    modelId: 'test',
    ask: () => new Promise((ok, no) => setTimeout(() => (answer instanceof Error ? no(answer) : ok(answer)), wait)),
  });
  const text = 'cut 3 clones from Blue Dream';

  it('uses the model’s checked answer', async () => {
    const r = await modelEngine(model('{"action":"clones","count":3,"parents":["VEIL-000A"]}')).interpret(text, ctx);
    expect(r).toEqual(interpret(text, ctx));
  });

  it('falls back on an error, a timeout, or nothing usable', async () => {
    const want = interpret(text, ctx);
    expect(await modelEngine(model(new Error('gpu lost'))).interpret(text, ctx)).toEqual(want);
    expect(await modelEngine(model('{"action":"clones"}', 50), undefined, 10).interpret(text, ctx)).toEqual(want);
    expect(await modelEngine(model('{"action":"none"}')).interpret(text, ctx)).toEqual(want);
  });

  it('the self-test passes only for the right batch', async () => {
    expect(await selfTest(model('{"action":"clones","count":3,"parents":["VEIL-00000001"]}'))).toBe(true);
    expect(await selfTest(model('{"action":"clones","count":2,"parents":["VEIL-00000001"]}'))).toBe(false);
    expect(await selfTest(model('{"action":"record"}'))).toBe(false);
  });
});

describe('the hint by the bubble', () => {
  it('gives the calves example only where animals are offered and most records are animals', () => {
    const a = { profile: ANIMAL_PROFILE };
    const p = {};
    expect(hintForAnimals([], true)).toBe(false);
    expect(hintForAnimals([a, a, p], true)).toBe(true);
    expect(hintForAnimals([a, p], true)).toBe(false);
    expect(hintForAnimals([a, a, a], false)).toBe(false);
  });
});
