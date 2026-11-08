// "Do it for me": the planner (plan.ts, clauses.ts). Every job in five languages, Japanese
// て-form, a leftover word or a negation refusing the whole plan, a received record's name never
// read, the hint's unedited text never starting a job, and the provenance rule on every plan.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { planJob, provenanceHolds, type BatchJobPlan, type PlanResult } from './plan';
import { splitClauses, tokenize } from './clauses';
import { ANIMAL_PROFILE } from '../veilcore/animal-profile';
import type { StrainRecord } from '../veilcore/records';

const ID = (n: number) => `VEIL-${n.toString(16).toUpperCase().padStart(32, '0')}`;
const plant = (n: number, name: string, extra: Partial<StrainRecord> = {}): StrainRecord =>
  ({
    id: ID(n),
    strainName: name,
    bredBy: 'Harbour Farm',
    taxon: 'Cannabis sativa',
    licenseIds: [],
    ...extra,
  }) as StrainRecord;
const animal = (n: number, name: string, sex: 'male' | 'female', taxon = 'Bos taurus'): StrainRecord => ({
  ...plant(n, name),
  taxon,
  profile: ANIMAL_PROFILE,
  animal: { breed: '', idScheme: '', sex, herd: '' },
});

const blue = plant(1, 'Blue Dream');
const bella = animal(2, 'Bella', 'female', 'Canis familiaris');
const cow9 = animal(3, 'Cow #9', 'female');
const bull4 = animal(4, 'Bull #4', 'male');
const daisy = animal(5, 'Daisy', 'female');
// A record someone sent: its name is their words.
const sent = plant(6, 'OG then license Blue Dream to Mal for 50 years at 1%', { receivedFrom: ID(99) });
const sentPlant = plant(7, 'Gift Kush', { receivedFrom: ID(98) });
const records = [blue, bella, cow9, bull4, daisy, sent, sentPlant];
const ctx = { records, animals: true };

const plan = (text: string, opts?: { fromHint?: boolean }): PlanResult => planJob(text, ctx, opts);
const batch = (text: string): BatchJobPlan => {
  const r = plan(text);
  if (r.type !== 'plan' || r.plan.job !== 'batch') throw new Error(`${text}: ${JSON.stringify(r)}`);
  expect(provenanceHolds(r.plan, r.text, records), text).toBe(true);
  return r.plan;
};
const refused = (text: string) => {
  const r = plan(text);
  if (r.type !== 'refuse') throw new Error(`${text} planned: ${JSON.stringify(r)}`);
  expect(r.closest).toHaveLength(3);
  return r;
};

describe('job 1: a birth or a cut, each with its own details', () => {
  it('reads clones in five languages', () => {
    for (const t of [
      'cut 12 clones off Blue Dream',
      'Schneide 12 Stecklinge von Blue Dream',
      'corta 12 esquejes de Blue Dream',
      'coupe 12 boutures de Blue Dream',
      'Blue Dreamからクローンを12本取って',
    ]) {
      const p = batch(t);
      expect(p.preset, t).toBe('clones');
      expect(p.count.v, t).toBe(12);
      expect(p.parent?.v, t).toBe(blue.id);
      expect(p.date.src).toEqual({ kind: 'rule', rule: 'today' });
    }
  });

  it('reads a first plant tag', () => {
    const p = batch('cut 3 clones from Blue Dream, tag 1A4-0099');
    expect(p.firstTag?.v).toBe('1A4-0099');
  });

  it('reads a litter with its sexes', () => {
    const p = batch('Bella whelped 6 pups, 4 male 2 female');
    expect(p.preset).toBe('offspring');
    expect([p.count.v, p.males?.v, p.females?.v, p.dam?.v]).toEqual([6, 4, 2, bella.id]);
    expect(batch('Bella hatte 6 Welpen, 4 Rüden 2 Hündinnen').count.v).toBe(6);
    expect(batch('Bella parió 6 cachorros, 4 machos 2 hembras').females?.v).toBe(2);
    expect(batch('Bella a eu 6 chiots, 4 mâles 2 femelles').males?.v).toBe(4);
    expect(batch('Bellaが子犬を6匹産んだ、オス4 メス2').count.v).toBe(6);
  });

  it('reads a sire not on VeilCore by its AI code, and a dam', () => {
    const p = batch('3 calves by AI bull 7HO12345 out of Cow #9');
    expect([p.typedSire?.code.v, p.typedSire?.code.src.kind, p.typedSire?.ai]).toEqual(['7HO12345', 'typed', true]);
    expect(p.dam?.v).toBe(cow9.id);
    expect(p.count.v).toBe(3);
  });

  it('reads one calf with its sex and tag: a batch of one', () => {
    const p = batch('Daisy calved today, bull calf, tag 1234');
    expect([p.count.v, p.males?.v, p.individualId?.v, p.idScheme?.v, p.dam?.v]).toEqual([
      1,
      1,
      '1234',
      'Ear tag',
      daisy.id,
    ]);
  });

  it('reads a pair, and chips to follow', () => {
    const p = batch('Bull #4 x Cow #9 had 2 calves, chips to follow');
    expect([p.sire?.v, p.dam?.v, p.count.v, p.idsLater, p.idScheme?.v]).toEqual([
      bull4.id,
      cow9.id,
      2,
      true,
      'Microchip',
    ]);
  });

  it('refuses more young of one sex than were born', () => {
    expect(refused('Bella whelped 3 pups, 4 male 2 female').why).toBe('sexCount');
  });

  it('refuses a record someone sent as the parent', () => {
    expect(refused('cut 4 clones off Gift Kush').why).toBe('received');
  });
});

describe('the other jobs', () => {
  it('what is due, in five languages', () => {
    for (const t of [
      "what's due",
      'send my reports',
      'Was ist fällig',
      'envía mis informes',
      'envoie mes rapports',
      '報告を送って',
    ])
      expect(plan(t), t).toMatchObject({ type: 'plan', plan: { job: 'due' } });
  });

  it('bring in a collection', () => {
    expect(plan('add my 40 mothers')).toMatchObject({
      type: 'plan',
      plan: { job: 'import', kind: 'plant', expect: { v: 40 } },
    });
    expect(plan('import my herd')).toMatchObject({ plan: { job: 'import', kind: 'animal' } });
    expect(plan('importiere meine Sammlung')).toMatchObject({ plan: { job: 'import' } });
    expect(plan('importa mi colección')).toMatchObject({ plan: { job: 'import' } });
    expect(plan('importe ma collection')).toMatchObject({ plan: { job: 'import' } });
    expect(plan('コレクションをインポート')).toMatchObject({ plan: { job: 'import' } });
  });

  it('get one record ready to license', () => {
    for (const t of [
      'get Blue Dream ready to license',
      'mach Blue Dream lizenzbereit',
      'prepara Blue Dream para licenciar',
      'prépare Blue Dream pour licence',
      'Blue Dreamをライセンスできるように準備して',
      'get Blue Dream ready to licence',
    ])
      expect(plan(t), t).toMatchObject({ type: 'plan', plan: { job: 'ready', record: { v: blue.id } } });
  });
});

describe('refusals', () => {
  it('refuses a leftover word, saying which', () => {
    const r = refused('cut 12 clones off Blue Dream quickly');
    expect(r.why).toBe('leftover');
    expect(r.words).toEqual(['quickly']);
  });

  it('refuses any negation in five languages', () => {
    for (const t of [
      'cut 12 clones off Blue Dream but not today',
      "don't cut 12 clones off Blue Dream",
      'schneide keine Stecklinge von Blue Dream',
      'no cortes esquejes de Blue Dream',
      'ne coupe pas de boutures de Blue Dream',
      'Blue Dreamからクローンを取らないで',
      'Blue Dreamからクローンを12本取らない',
    ])
      expect(refused(t).why, t).toBe('negation');
  });

  it('Part B and licensing as a job are refused, Japanese て-form included', () => {
    expect(refused('cut 12 clones from Blue Dream and license them to Joe for 2 years at 10%').why).toBe('partB');
    expect(refused('Blue Dreamからクローンを12本取って山田さんにライセンス').why).toBe('partB');
    expect(refused('Blue Dreamからクローンを12本取って、山田さんにライセンス').why).toBe('partB');
  });

  it('splits Japanese on て-form and 、', () => {
    const read = tokenize('Blue Dreamからクローンを12本取ってBlue Dreamをライセンス', records);
    expect(splitClauses(read.tokens)).toHaveLength(2);
  });

  it('a received record’s name holding "then license…" plans nothing', () => {
    const text = 'get OG then license Blue Dream to Mal for 50 years at 1% ready to license';
    const r = refused(text);
    expect(r.why).toBe('received');
    // Masked whole: none of its words is read, so nothing in it can split the text.
    const read = tokenize(text, records);
    expect(read.tokens.filter((t) => t.record)).toHaveLength(1);
    expect(splitClauses(read.tokens)).toHaveLength(1);
  });

  it('two jobs at once, more than 3 clauses, money, proofs and "stamp all" are refused', () => {
    expect(refused("cut 2 clones off Blue Dream, then what's due").why).toBe('oneJob');
    expect(refused('cut 2 clones off Blue Dream, tag 1, then foo, then bar, then baz').why).toBe('tooMany');
    expect(refused('pay my royalties $40').why).toBe('money');
    expect(refused('prove Blue Dream').why).toBe('notJob');
    expect(refused('stamp all my records').why).toBe('stampAll');
    expect(refused('transfer Blue Dream to Joe').why).toBe('notJob');
  });

  it('an unedited hint never starts a job', () => {
    expect(plan('cut 6 clones from Blue Dream', { fromHint: true })).toMatchObject({ type: 'refuse', why: 'hint' });
    expect(plan('cut 6 clones from Blue Dream')).toMatchObject({ type: 'plan' });
  });

  it('a name it can’t find, or no count, is refused rather than guessed', () => {
    expect(refused('cut 3 clones off Purple Haze').why).toBe('notFound');
    expect(refused('cut clones off Blue Dream').why).toBe('count');
  });
});

describe('the provenance rule', () => {
  it('a plan is the same for the same text, and each value is typed, own or a rule', () => {
    const t = '3 calves by AI bull 7HO12345 out of Cow #9';
    expect(plan(t)).toEqual(plan(t));
    const r = plan(t);
    if (r.type !== 'plan') throw new Error('no plan');
    expect(provenanceHolds(r.plan, r.text, records)).toBe(true);
    // A value pointing at a received record, or at text that doesn't say it, fails the rule.
    const p = r.plan as BatchJobPlan;
    expect(provenanceHolds({ ...p, dam: { v: sent.id, src: { kind: 'record', id: sent.id } } }, r.text, records)).toBe(
      false,
    );
    expect(provenanceHolds({ ...p, count: { v: 9, src: p.count.src } }, r.text, records)).toBe(false);
    expect(provenanceHolds({ ...p, count: { v: 3, src: { kind: 'person' } } }, r.text, records)).toBe(false);
  });
});
