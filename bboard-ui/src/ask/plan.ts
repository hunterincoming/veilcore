// "Do it for me" (design v2, 4): one request becomes one plan for one of Part A's jobs, or a
// refusal with the three closest things Ask can do. Pure and deterministic: Shortcuts is the
// planner. The optional on-device model never builds a plan (engine.ts).
//
// In this order:
//   1. every record name in this browser is masked (clauses.ts), received ones too; values bind
//      only to the person's own records;
//   2. the text is split into at most 3 clauses;
//   3. each clause's reader must use every word but a fixed list of fillers: a word left over,
//      or a negation, refuses the whole plan;
//   4. a pronoun binds only to the clause before;
//   5. the result must be one of the jobs: births or cuts, what's due, bring in a collection, or
//      get one record ready to license.
// Text the hint put in the box can't start a job until the person edits it.
//
// The provenance rule (docs/ask-veilcore.md), checked by provenanceHolds: every value carries
// where it came from: a `typed` span of the text, one of the person's own `record`s, a fixed
// `rule` (today, frozen when the job is prepared), or the `person` on the result screen.
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';
import type { StrainRecord } from '../veilcore/records';
import type { AskAction } from './engine';
import { MAX_BATCH } from './handoff';
import { isReceivedRecord } from './hint';
import { closestActions } from './shortcuts';
import { MAX_CLAUSES, splitClauses, tokenize, type Cat, type Read, type Token } from './clauses';

export type Source =
  | { readonly kind: 'typed'; readonly at: number; readonly end: number }
  | { readonly kind: 'record'; readonly id: string }
  | { readonly kind: 'rule'; readonly rule: 'today' }
  | { readonly kind: 'person' };

export type Val<T> = { readonly v: T; readonly src: Source };

/** Births or cuts: a batch of new records from a parent or a pair, each with its own details. */
export type BatchJobPlan = {
  readonly job: 'batch';
  readonly preset: 'clones' | 'offspring';
  readonly count: Val<number>;
  /** Clones: the plant cut from. */
  readonly parent?: Val<string>;
  readonly sire?: Val<string>;
  readonly dam?: Val<string>;
  /** A sire not on VeilCore, by its code as typed ("AI bull 7HO12345"). */
  readonly typedSire?: { readonly code: Val<string>; readonly ai: boolean };
  readonly males?: Val<number>;
  readonly females?: Val<number>;
  /** One young animal's own ID ("tag 1234"), and the scheme the word named. */
  readonly individualId?: Val<string>;
  readonly idScheme?: Val<'Ear tag' | 'Microchip'>;
  /** "chips to follow": the IDs come later (a Home item), with this scheme. */
  readonly idsLater?: boolean;
  /** Clones: the first plant tag, numbered on. */
  readonly firstTag?: Val<string>;
  readonly date: Val<'today'>;
};
export type DueJobPlan = { readonly job: 'due' };
export type ImportJobPlan = {
  readonly job: 'import';
  readonly kind: 'plant' | 'animal';
  /** "add my 40 mothers": the number said, to compare with the file. */
  readonly expect?: Val<number>;
};
export type ReadyJobPlan = { readonly job: 'ready'; readonly record: Val<string> };
export type JobPlan = BatchJobPlan | DueJobPlan | ImportJobPlan | ReadyJobPlan;

export type RefuseWhy =
  | 'hint'
  | 'negation'
  | 'leftover'
  | 'tooMany'
  | 'oneJob'
  | 'partB'
  | 'money'
  | 'notJob'
  | 'stampAll'
  | 'received'
  | 'noRecord'
  | 'wrongKind'
  | 'count'
  | 'sexCount'
  | 'unknown';

export type PlanResult =
  | { readonly type: 'plan'; readonly plan: JobPlan; readonly text: string }
  | {
      readonly type: 'refuse';
      readonly why: RefuseWhy;
      /** The words it couldn't use, or the name it couldn't find, as typed. */
      readonly words?: readonly string[];
      readonly closest: readonly AskAction[];
    };

export type PlanContext = {
  /** Every record in this browser: the person's own and received ones (for masking). */
  readonly records: readonly StrainRecord[];
  /** Whether the site offers animal records. */
  readonly animals: boolean;
};

const CLOSEST: Partial<Record<RefuseWhy, readonly AskAction[]>> = {
  partB: ['agreements', 'clones', 'due'],
  money: ['due', 'agreements', 'explain'],
  notJob: ['search', 'explain', 'agreements'],
  stampAll: ['search', 'import', 'explain'],
  received: ['search', 'record', 'explain'],
  oneJob: ['clones', 'offspring', 'due'],
  tooMany: ['clones', 'offspring', 'due'],
};

const refuse = (why: RefuseWhy, text: string, words?: readonly string[]): PlanResult => ({
  type: 'refuse',
  why,
  ...(words?.length ? { words } : {}),
  closest: CLOSEST[why] ?? closestActions(text),
});

const has = (t: Token, ...cats: Cat[]) => cats.some((c) => t.cats.has(c));
const typed = (t: Token): Source => ({ kind: 'typed', at: t.at, end: t.end });
const ownRecord = (r: StrainRecord | undefined): boolean => !!r && !isReceivedRecord(r);
const isPlant = (r: StrainRecord) => !isAnimal(r) && !isStrain(r);

type Group = { readonly job: Token[]; readonly clause: number };

/** What a clause is about, by its first word that only one job uses. */
type Kind = 'clones' | 'offspring' | 'due' | 'import' | 'ready' | 'partB' | 'detail' | 'unknown';

const DETAIL: readonly Cat[] = [
  'male',
  'female',
  'idTag',
  'idChip',
  'later',
  'today',
  'offNoun',
  'bull',
  'filler',
  'and',
  'counter',
];

const kindOf = (c: readonly Token[]): Kind => {
  const any = (cat: Cat) => c.some((t) => t.cats.has(cat));
  if (any('readyWord') && any('licenseWord')) return 'ready';
  if (any('licenseWord')) return 'partB';
  if (any('dueWord')) return 'due';
  if (any('importVerb') && (any('importNoun') || any('animalNoun')) && !any('cloneNoun')) return 'import';
  if (any('cloneNoun')) return 'clones';
  if (any('offVerb') || (any('offNoun') && c.some((t) => t.record || t.n !== undefined))) return 'offspring';
  // "bull calf", "4 male 2 female", "tag 1234", "chips to follow": details of the clause before.
  if (c.every((t) => t.n !== undefined || DETAIL.some((d) => t.cats.has(d)) || isValueAfterId(c, t))) return 'detail';
  return 'unknown';
};

/** A token right after an ID word: the ID's value ("tag 1234"). */
const isValueAfterId = (c: readonly Token[], t: Token): boolean => {
  const i = c.indexOf(t);
  return i > 0 && has(c[i - 1], 'idTag', 'idChip') && !t.record && (t.unknown || t.n !== undefined);
};

/** The words a reader didn't use, as typed. */
const leftovers = (read: Read, c: readonly Token[], used: ReadonlySet<Token>): string[] =>
  c.filter((t) => !used.has(t) && !t.cats.has('filler')).map((t) => read.cased.slice(t.at, t.end));

type ReaderOut = { plan: JobPlan; used: Set<Token> } | PlanResult;

// ---- the readers ------------------------------------------------------------------------------

const readClones = (c: readonly Token[], ctx: PlanContext, read: Read): ReaderOut => {
  const used = new Set<Token>();
  let parent: Token | undefined;
  let count: Token | undefined;
  let firstTag: Token | undefined;
  let today: Token | undefined;
  for (let i = 0; i < c.length; i++) {
    const t = c[i];
    if (t.record) {
      if (parent) return refuse('oneJob', read.text);
      parent = t;
      used.add(t);
    } else if (has(t, 'idTag') && c[i + 1] && !c[i + 1].record) {
      firstTag = c[i + 1];
      used.add(t).add(c[i + 1]);
      i += 1;
    } else if (t.n !== undefined) {
      if (count) return refuse('count', read.text);
      count = t;
      used.add(t);
    } else if (has(t, 'today')) {
      today = t;
      used.add(t);
    } else if (has(t, 'cloneNoun', 'cloneVerb', 'from', 'counter', 'new', 'to')) used.add(t);
  }
  void today;
  const left = leftovers(read, c, used);
  if (left.length) return refuse('leftover', read.text, left);
  if (!parent?.record) return refuse('noRecord', read.text);
  if (!ownRecord(parent.record)) return refuse('received', read.text);
  if (!isPlant(parent.record)) return refuse('wrongKind', read.text);
  if (!count || count.n! < 1 || count.n! > MAX_BATCH) return refuse('count', read.text);
  return {
    used,
    plan: {
      job: 'batch',
      preset: 'clones',
      count: { v: count.n!, src: typed(count) },
      parent: { v: parent.record.id, src: { kind: 'record', id: parent.record.id } },
      ...(firstTag ? { firstTag: { v: read.cased.slice(firstTag.at, firstTag.end), src: typed(firstTag) } } : {}),
      date: { v: 'today', src: { kind: 'rule', rule: 'today' } },
    },
  };
};

/** A sire's code as typed: letters and digits with at least one digit (7HO12345). */
const CODE = /^(?=.*\d)[a-z0-9][a-z0-9-]{2,24}$/i;

const readOffspring = (c: readonly Token[], ctx: PlanContext, read: Read): ReaderOut => {
  if (!ctx.animals) return refuse('wrongKind', read.text);
  const used = new Set<Token>();
  let sire: Token | undefined;
  let dam: Token | undefined;
  let code: Token | undefined;
  let ai = false;
  let males: Token | undefined;
  let females: Token | undefined;
  let oneSex: 'male' | 'female' | undefined;
  let oneSexAt: Token | undefined;
  let idValue: Token | undefined;
  let idScheme: Token | undefined;
  let idsLater = false;
  const numbers: Token[] = [];
  let role: 'sire' | 'dam' | undefined;
  const pair: Token[] = [];
  for (let i = 0; i < c.length; i++) {
    const t = c[i];
    const next = c[i + 1];
    if (t.record) {
      used.add(t);
      if (!isAnimal(t.record)) return refuse('wrongKind', read.text);
      const r = role ?? (next && has(next, 'pairX') ? undefined : t.record.animal?.sex === 'male' ? 'sire' : 'dam');
      if (r === undefined) pair.push(t);
      else if (r === 'sire') {
        if (sire || code) return refuse('oneJob', read.text);
        sire = t;
      } else {
        if (dam) return refuse('oneJob', read.text);
        dam = t;
      }
      role = undefined;
    } else if (has(t, 'pairX') && pair.length === 1 && next?.record) {
      used.add(t);
      pair.push(next);
      used.add(next);
      i += 1;
    } else if (has(t, 'by')) {
      used.add(t);
      role = 'sire';
    } else if (has(t, 'outOf') || (has(t, 'from') && next?.record)) {
      used.add(t);
      role = 'dam';
    } else if (has(t, 'ai') && next && (has(next, 'bull') || (CODE.test(next.w) && !next.record))) {
      ai = true;
      used.add(t);
      role = 'sire';
    } else if (has(t, 'bull') && next && has(next, 'offNoun')) {
      // "bull calf": one male.
      oneSex = 'male';
      oneSexAt = t;
      used.add(t);
    } else if (has(t, 'bull') && next && !next.record && CODE.test(next.w) && next.n === undefined) {
      code = next;
      used.add(t).add(next);
      i += 1;
      role = undefined;
    } else if (has(t, 'bull') && (role === 'sire' || ai)) {
      used.add(t);
      role = 'sire';
    } else if ((role === 'sire' || ai) && !t.record && CODE.test(t.w) && t.n === undefined && !code) {
      code = t;
      used.add(t);
      role = undefined;
    } else if (has(t, 'idTag', 'idChip')) {
      used.add(t);
      idScheme = t;
      if (next && !next.record && (next.unknown || next.n !== undefined) && !has(next, 'later')) {
        idValue = next;
        used.add(next);
        i += 1;
      }
    } else if (has(t, 'later')) {
      used.add(t);
      idsLater = true;
    } else if (t.n !== undefined && next && has(next, 'male')) {
      if (males) return refuse('sexCount', read.text);
      males = t;
      used.add(t).add(next);
      i += 1;
    } else if (t.n !== undefined && next && has(next, 'female')) {
      if (females) return refuse('sexCount', read.text);
      females = t;
      used.add(t).add(next);
      i += 1;
    } else if (has(t, 'male') && next?.n !== undefined && !males) {
      // "オス4": the sex word first.
      males = next;
      used.add(t).add(next);
      i += 1;
    } else if (has(t, 'female') && next?.n !== undefined && !females) {
      females = next;
      used.add(t).add(next);
      i += 1;
    } else if (has(t, 'female') && !t.n) {
      // "heifer calf", "a heifer": one female.
      oneSex = 'female';
      oneSexAt = t;
      used.add(t);
    } else if (has(t, 'male') && !t.n) {
      oneSex = 'male';
      oneSexAt = t;
      used.add(t);
    } else if (t.n !== undefined) {
      numbers.push(t);
      used.add(t);
    } else if (has(t, 'offNoun', 'offVerb', 'today', 'counter', 'and', 'from', 'to', 'new', 'cloneVerb')) used.add(t);
  }
  const left = leftovers(read, c, used);
  if (left.length) return refuse('leftover', read.text, left);
  if (pair.length === 2) {
    const [a, b] = pair.map((p) => p.record!);
    const aMale = a.animal?.sex === 'male' || (b.animal?.sex === 'female' && a.animal?.sex !== 'female');
    if (sire || dam) return refuse('oneJob', read.text);
    sire = aMale ? pair[0] : pair[1];
    dam = aMale ? pair[1] : pair[0];
  } else if (pair.length === 1) dam = pair[0];
  for (const p of [sire, dam]) if (p && !ownRecord(p.record)) return refuse('received', read.text);
  if (!sire && !dam && !code) return refuse('noRecord', read.text);
  if (numbers.length > 1) return refuse('count', read.text);
  const count: Token | undefined = numbers[0];
  const m = males?.n ?? 0;
  const f = females?.n ?? 0;
  const n = count?.n ?? (m + f || (oneSex || idValue || code || sire || dam ? 1 : 0));
  if (n < 1 || n > MAX_BATCH) return refuse('count', read.text);
  if (m + f > n) return refuse('sexCount', read.text);
  if (oneSex && (n !== 1 || males || females)) return refuse('sexCount', read.text);
  if (idValue && n !== 1) return refuse('count', read.text);
  const scheme = idScheme ? (idScheme.cats.has('idChip') ? 'Microchip' : 'Ear tag') : undefined;
  // The count as typed; the sexes' sum ("4 male 2 female"); else one, from the word that says a
  // birth ("Daisy calved today", "bull calf").
  const sexes = [males, females].filter((x): x is Token => !!x);
  const countSrc: Source = count
    ? typed(count)
    : sexes.length
      ? { kind: 'typed', at: Math.min(...sexes.map((x) => x.at)), end: Math.max(...sexes.map((x) => x.end)) }
      : typed(c.find((t) => has(t, 'offVerb', 'offNoun')) ?? oneSexAt ?? c[0]);
  return {
    used,
    plan: {
      job: 'batch',
      preset: 'offspring',
      // One young when none is said ("Daisy calved today"): the count comes from the verb, as typed.
      count: { v: n, src: countSrc },
      ...(sire ? { sire: { v: sire.record!.id, src: { kind: 'record', id: sire.record!.id } } } : {}),
      ...(dam ? { dam: { v: dam.record!.id, src: { kind: 'record', id: dam.record!.id } } } : {}),
      ...(code && !sire
        ? { typedSire: { code: { v: read.cased.slice(code.at, code.end).toUpperCase(), src: typed(code) }, ai } }
        : {}),
      ...(males
        ? { males: { v: males.n!, src: typed(males) } }
        : oneSex === 'male'
          ? { males: { v: 1, src: typed(oneSexAt!) } }
          : {}),
      ...(females
        ? { females: { v: females.n!, src: typed(females) } }
        : oneSex === 'female'
          ? { females: { v: 1, src: typed(oneSexAt!) } }
          : {}),
      ...(idValue ? { individualId: { v: read.cased.slice(idValue.at, idValue.end), src: typed(idValue) } } : {}),
      ...(scheme ? { idScheme: { v: scheme, src: typed(idScheme!) } } : {}),
      ...(idsLater ? { idsLater: true } : {}),
      date: { v: 'today', src: { kind: 'rule', rule: 'today' } },
    },
  };
};

const readDue = (c: readonly Token[], read: Read): ReaderOut => {
  const used = new Set(c.filter((t) => has(t, 'dueWord', 'dueVerb', 'to', 'and', 'today')));
  const left = leftovers(read, c, used);
  if (left.length) return refuse('leftover', read.text, left);
  return { used, plan: { job: 'due' } };
};

const readImport = (c: readonly Token[], ctx: PlanContext, read: Read): ReaderOut => {
  const used = new Set<Token>();
  let expect: Token | undefined;
  for (const t of c) {
    if (t.n !== undefined && !expect) {
      expect = t;
      used.add(t);
    } else if (has(t, 'importVerb', 'importNoun', 'animalNoun', 'from', 'to', 'new', 'counter')) used.add(t);
  }
  const left = leftovers(read, c, used);
  if (left.length) return refuse('leftover', read.text, left);
  const animal = ctx.animals && c.some((t) => has(t, 'animalNoun'));
  return {
    used,
    plan: {
      job: 'import',
      kind: animal ? 'animal' : 'plant',
      ...(expect ? { expect: { v: expect.n!, src: typed(expect) } } : {}),
    },
  };
};

const readReady = (c: readonly Token[], read: Read, before?: StrainRecord): ReaderOut => {
  const used = new Set<Token>();
  let record: StrainRecord | undefined;
  for (const t of c) {
    if (t.record) {
      if (record) return refuse('oneJob', read.text);
      record = t.record;
      used.add(t);
    } else if (has(t, 'pronoun') && before && !record) {
      // A pronoun binds only to the clause before.
      record = before;
      used.add(t);
    } else if (has(t, 'readyWord', 'licenseWord', 'to', 'cloneVerb', 'dueVerb')) used.add(t);
  }
  const left = leftovers(read, c, used);
  if (left.length) return refuse('leftover', read.text, left);
  if (!record) return refuse('noRecord', read.text);
  if (!ownRecord(record)) return refuse('received', read.text);
  return { used, plan: { job: 'ready', record: { v: record.id, src: { kind: 'record', id: record.id } } } };
};

// ---- the plan ---------------------------------------------------------------------------------

/**
 * Read one request. `fromHint`: the text is the hint's example, put in the box and not edited
 * since (AskSheet.tsx): it never starts a job.
 */
export const planJob = (typedText: string, ctx: PlanContext, opts: { fromHint?: boolean } = {}): PlanResult => {
  const read = tokenize(typedText, ctx.records);
  const text = read.text.trim();
  if (!text) return refuse('unknown', '');
  if (opts.fromHint) return refuse('hint', text);
  if (read.negated) return refuse('negation', text);
  // Things no job here does, whatever else is said.
  if (read.tokens.some((t) => has(t, 'money'))) return refuse('money', text);
  if (read.tokens.some((t) => has(t, 'notJob'))) return refuse('notJob', text);
  if (read.tokens.some((t) => has(t, 'stamp'))) return refuse('stampAll', text);

  const clauses = splitClauses(read.tokens);
  // Details join the clause before ("6 pups, 4 male 2 female").
  const groups: Group[] = [];
  const kinds: Kind[] = [];
  clauses.forEach((c, i) => {
    const k = kindOf(c);
    if (k === 'detail' && groups.length) groups[groups.length - 1].job.push(...c);
    else {
      groups.push({ job: [...c], clause: i });
      kinds.push(k);
    }
  });
  if (groups.length > MAX_CLAUSES) return refuse('tooMany', text);
  if (kinds.includes('partB')) return refuse('partB', text);
  if (kinds.some((k) => k === 'unknown' || k === 'detail')) {
    const g = groups[kinds.findIndex((k) => k === 'unknown' || k === 'detail')];
    return refuse('unknown', text, leftovers(read, g.job, new Set()));
  }
  if (groups.length > 1) return refuse('oneJob', text);
  const [g] = groups;
  const out: ReaderOut =
    kinds[0] === 'clones'
      ? readClones(g.job, ctx, read)
      : kinds[0] === 'offspring'
        ? readOffspring(g.job, ctx, read)
        : kinds[0] === 'due'
          ? readDue(g.job, read)
          : kinds[0] === 'import'
            ? readImport(g.job, ctx, read)
            : readReady(g.job, read);
  if ('type' in out) return out;
  return { type: 'plan', plan: out.plan, text: read.text };
};

/** Every value a plan carries, with its source. */
type AnyVal = Val<number> | Val<string>;
export const valuesOf = (p: JobPlan): AnyVal[] => {
  if (p.job === 'batch')
    return [
      p.count,
      p.parent,
      p.sire,
      p.dam,
      p.typedSire?.code,
      p.males,
      p.females,
      p.individualId,
      p.idScheme,
      p.firstTag,
      p.date,
    ].filter((v): v is AnyVal => !!v);
  if (p.job === 'import') return p.expect ? [p.expect] : [];
  if (p.job === 'ready') return [p.record];
  return [];
};

/**
 * The provenance rule, checked: each value is a span of the text that says it, one of the
 * person's own records, or a fixed rule. A plan never carries a `person` value (only the result
 * screen adds those) or a received record.
 */
export const provenanceHolds = (p: JobPlan, text: string, records: readonly StrainRecord[]): boolean =>
  valuesOf(p).every((val) => {
    const s = val.src;
    if (s.kind === 'record') {
      const r = records.find((x) => x.id === s.id);
      return !!r && ownRecord(r) && val.v === s.id;
    }
    if (s.kind === 'rule') return s.rule === 'today';
    if (s.kind === 'typed') {
      if (s.at < 0 || s.end > text.length || s.end <= s.at) return false;
      const span = text.slice(s.at, s.end);
      if (typeof val.v === 'number') {
        const digits = [...span.matchAll(/\d+/g)].map((m) => Number(m[0]));
        // The number itself, the sum of the numbers said ("4 male 2 female"), or one said in words.
        return digits.length ? digits.includes(val.v) || digits.reduce((a, b) => a + b, 0) === val.v : val.v === 1;
      }
      if (val.v === 'Ear tag' || val.v === 'Microchip') return true;
      return typeof val.v === 'string' && span.toLowerCase() === val.v.toLowerCase();
    }
    return false;
  });
