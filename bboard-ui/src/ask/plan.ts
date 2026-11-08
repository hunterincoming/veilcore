// "Do it for me" (design v2, 4): one request becomes one plan for one of Part A's jobs, or a
// refusal that says what was understood, what wasn't, and (where it can) a shorter sentence built
// from the person's own words that does plan, for them to send. Pure and deterministic:
// Shortcuts is the planner. The optional on-device model never builds a plan (engine.ts).
//
// In this order:
//   1. every record name in this browser is masked (clauses.ts), received ones too; values bind
//      only to the person's own records, and a name two of their own records share is refused;
//   2. the text is split into at most 3 clauses ("…, sire Bull 44", "…, lot B" are details of
//      the clause before, not clauses of their own);
//   3. each clause's reader must use every word but a fixed list of fillers: a word left over,
//      or a negation, refuses the whole plan ("no tag yet" is not a negation: IDs to follow);
//   4. a pronoun binds only to the clause before;
//   5. the result must be one of the jobs: births or cuts, what's due, bring in a collection, or
//      get one record ready to license.
// Text the hint put in the box can't start a job until the person edits it. A suggestion a
// refusal offers is made only from the words typed and the names of the person's own records.
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
import {
  MAX_CLAUSES,
  NUMBER_WORDS,
  normalizeText,
  splitClauses,
  tokenize,
  type Cat,
  type Read,
  type Token,
} from './clauses';

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
  /**
   * A sire's code as typed ("AI bull 7HO12345", "sire 7HO1234", "NAAB 7HO1234"): the sire not on
   * VeilCore, or the semen code of a sire record. `semen` when it was said to be a straw's code.
   */
  readonly typedSire?: { readonly code: Val<string>; readonly ai: boolean };
  readonly males?: Val<number>;
  readonly females?: Val<number>;
  /** One young animal's own ID ("tag 1234"), and the scheme the word named. */
  readonly individualId?: Val<string>;
  readonly idScheme?: Val<'Ear tag' | 'Microchip'>;
  /** "chips to follow", "no tag yet": the IDs come later (a Home item). */
  readonly idsLater?: boolean;
  /** Clones: the first plant tag, numbered on. */
  readonly firstTag?: Val<string>;
  /** Clones: the lot ("lot B"). */
  readonly lotName?: Val<string>;
  /** Today, or yesterday ("yesterday", "last night"), on this device's calendar when prepared. */
  readonly date: Val<'today' | 'yesterday'>;
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
  | 'notFound'
  | 'twoRecords'
  | 'wrongKind'
  | 'count'
  | 'sexCount'
  | 'unknown';

/**
 * A sentence a refusal offers to put in the box: the person's own words with the part it couldn't
 * use taken out (`text`), or "get <their record> ready to license" written in their language by
 * the screen (`ready`). The person sends it themselves.
 */
export type Suggestion = { readonly text: string } | { readonly ready: string };

export type PlanResult =
  | { readonly type: 'plan'; readonly plan: JobPlan; readonly text: string }
  | {
      readonly type: 'refuse';
      readonly why: RefuseWhy;
      /** The words it couldn't use, or the name it couldn't find, as typed. */
      readonly words?: readonly string[];
      /** What it did understand, as typed: the request without the words it couldn't use. */
      readonly understood?: string;
      readonly suggest?: readonly Suggestion[];
      readonly closest: readonly AskAction[];
    };

export type PlanContext = {
  /** Every record in this browser: the person's own and received ones (for masking). */
  readonly records: readonly StrainRecord[];
  /** Whether the site offers animal records. */
  readonly animals: boolean;
  /** The person's language (en, de, es, fr, ja): "hier" is yesterday only in French. */
  readonly lang?: string;
};

const CLOSEST: Partial<Record<RefuseWhy, readonly AskAction[]>> = {
  partB: ['agreements', 'clones', 'due'],
  money: ['due', 'agreements', 'explain'],
  notJob: ['search', 'explain', 'agreements'],
  stampAll: ['search', 'import', 'explain'],
  received: ['search', 'record', 'explain'],
  notFound: ['record', 'import', 'search'],
  oneJob: ['clones', 'offspring', 'due'],
  tooMany: ['clones', 'offspring', 'due'],
};

type Refusal = Extract<PlanResult, { type: 'refuse' }>;

const refuse = (
  why: RefuseWhy,
  text: string,
  extra: { words?: readonly string[]; understood?: string; suggest?: readonly Suggestion[] } = {},
): Refusal => ({
  type: 'refuse',
  why,
  ...(extra.words?.length ? { words: extra.words } : {}),
  ...(extra.understood ? { understood: extra.understood } : {}),
  ...(extra.suggest?.length ? { suggest: extra.suggest } : {}),
  closest: CLOSEST[why] ?? closestActions(text),
});

const has = (t: Token | undefined, ...cats: Cat[]) => !!t && cats.some((c) => t.cats.has(c));
const typed = (t: Token): Source => ({ kind: 'typed', at: t.at, end: t.end });
const ownRecord = (r: StrainRecord | undefined): boolean => !!r && !isReceivedRecord(r);
const isPlant = (r: StrainRecord) => !isAnimal(r) && !isStrain(r);

/** What a clause is about. */
type Kind = 'clones' | 'offspring' | 'due' | 'import' | 'ready' | 'partB' | 'detail' | 'unknown';

/** A sire's or a straw's code as typed: letters and digits with at least one digit (7HO12345). */
const CODE = /^(?=.*\d)[a-z0-9][a-z0-9-]{2,24}$/i;
const isCode = (t: Token | undefined): boolean => !!t && !t.record && t.n === undefined && CODE.test(t.w);

/** Words a detail clause ("bull calf", "tag 1234", "sire Bull 44", "lot B") may hold. */
const DETAIL: readonly Cat[] = [
  'male',
  'female',
  'dogWord',
  'idTag',
  'idChip',
  'idAny',
  'later',
  'today',
  'yesterday',
  'hier',
  'offNoun',
  'bull',
  'by',
  'outOf',
  'ai',
  'codeWord',
  'lot',
  'first',
  'filler',
  'and',
  'counter',
];

/** A token right after an ID, lot or code word: that word's value ("tag 1234", "lot B"). */
const isValue = (c: readonly Token[], t: Token): boolean => {
  const i = c.indexOf(t);
  const prev = c[i - 1];
  if (i <= 0 || t.record) return false;
  if (has(prev, 'idTag', 'idChip', 'idAny', 'lot')) return !!t.unknown || t.n !== undefined;
  return has(prev, 'bull', 'ai', 'codeWord') && isCode(t);
};

/** A record named after a role word: "sire Bull 44", "by Rex", "out of Cow #9". */
const isRoleRecord = (c: readonly Token[], t: Token): boolean =>
  !!t.record && has(c[c.indexOf(t) - 1], 'by', 'bull', 'outOf', 'from');

const kindOf = (c: readonly Token[]): Kind => {
  const any = (cat: Cat) => c.some((t) => t.cats.has(cat));
  const jobWords = any('cloneNoun') || any('offVerb') || any('dueWord') || any('importVerb');
  if (any('readyCore') && (any('licenseWord') || (!jobWords && c.some((t) => t.record)))) return 'ready';
  if (any('licenseWord')) return 'partB';
  if (any('dueWord')) return 'due';
  if (any('importVerb') && (any('importNoun') || any('animalNoun')) && !any('cloneNoun')) return 'import';
  if (any('cloneNoun')) return 'clones';
  if (any('offVerb') || (any('offNoun') && c.some((t) => t.record || (t.n !== undefined && !isValue(c, t)))))
    return 'offspring';
  if (isDetail(c)) return 'detail';
  return 'unknown';
};

/** Every word one a detail of the clause before can be: a sex, an ID, a lot, a sire. */
const isDetail = (c: readonly Token[]): boolean =>
  !c.some((t) => has(t, 'offVerb', 'cloneNoun', 'dueWord')) &&
  c.every(
    (t) =>
      (t.n !== undefined && !t.unknown) || DETAIL.some((d) => t.cats.has(d)) || isValue(c, t) || isRoleRecord(c, t),
  );

/** The words a reader didn't use, as typed. */
const leftovers = (read: Read, c: readonly Token[], used: ReadonlySet<Token>): Token[] =>
  c.filter((t) => !used.has(t) && !t.cats.has('filler'));
const said = (read: Read, ts: readonly Token[]): string[] => ts.map((t) => read.cased.slice(t.at, t.end));

/** The typed text with these tokens taken out, joins tidied ("cut 20 clones of Gelato, lot B" → "cut 20 clones of Gelato"). */
const without = (read: Read, drop: readonly Token[]): string => {
  let out = read.cased;
  for (const t of [...drop].sort((a, b) => b.at - a.at)) out = `${out.slice(0, t.at)}${out.slice(t.end)}`;
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s+([,、。;])/g, '$1')
    .replace(/([,、;])\s*(?=[,、;。]|$)/g, '')
    .replace(/^[\s,、;。]+|[\s,、;。]+$/g, '')
    .replace(/(\s+(for|to|at|of|from|by|and|with|für|zur|zum|von|und|para|de|y|con|pour|à|et|par))+$/i, '')
    .trim();
};

/** Only these groups' words, as typed, each group whole, joined with commas. */
const keepGroups = (read: Read, groups: readonly (readonly Token[])[]): string =>
  groups
    .filter((g) => g.length)
    .map((g) => read.cased.slice(g[0].at, g[g.length - 1].end))
    .join(', ');

type ReaderOut = { plan: JobPlan; used: Set<Token> } | Refusal | { left: Token[] };

const dateOf = (c: readonly Token[], used: Set<Token>, lang?: string): Val<'today' | 'yesterday'> | Refusal => {
  // "hier": French yesterday, German here (said in passing: nothing to do with the date).
  for (const t of c) if (has(t, 'hier') && lang !== 'fr') used.add(t);
  const y = c.filter((t) => has(t, 'yesterday') || (lang === 'fr' && has(t, 'hier')));
  const tod = c.filter((t) => has(t, 'today'));
  for (const t of [...y, ...tod]) used.add(t);
  if (y.length && tod.length) return refuse('count', '');
  return y.length ? { v: 'yesterday', src: typed(y[0]) } : { v: 'today', src: { kind: 'rule', rule: 'today' } };
};

// ---- the readers ------------------------------------------------------------------------------

const readClones = (c: readonly Token[], ctx: PlanContext, read: Read): ReaderOut => {
  const used = new Set<Token>();
  let parent: Token | undefined;
  let count: Token | undefined;
  let firstTag: Token | undefined;
  let lot: Token | undefined;
  for (let i = 0; i < c.length; i++) {
    const t = c[i];
    const next = c[i + 1];
    if (t.record) {
      if (parent) return refuse('oneJob', read.text);
      parent = t;
      used.add(t);
    } else if (has(t, 'idTag') && next && !next.record && (next.unknown || next.n !== undefined)) {
      firstTag = next;
      used.add(t).add(next);
      i += 1;
    } else if (has(t, 'lot') && next && !next.record && (next.unknown || next.n !== undefined)) {
      lot = next;
      used.add(t).add(next);
      i += 1;
    } else if (has(t, 'first') && c.slice(i + 1).some((x) => has(x, 'idTag'))) {
      // "first tag …", "starting at tag …".
      used.add(t);
    } else if (t.n !== undefined) {
      if (count) return refuse('count', read.text);
      count = t;
      used.add(t);
    } else if (has(t, 'cloneNoun', 'cloneVerb', 'from', 'counter', 'new', 'to', 'and')) used.add(t);
  }
  const date = dateOf(c, used, ctx.lang);
  if ('type' in date) return date;
  const left = leftovers(read, c, used);
  if (left.length) return { left };
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
      ...(lot ? { lotName: { v: read.cased.slice(lot.at, lot.end), src: typed(lot) } } : {}),
      date,
    },
  };
};

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
  const setRecord = (t: Token, r: 'sire' | 'dam' | undefined): Refusal | undefined => {
    used.add(t);
    if (!isAnimal(t.record)) return refuse('wrongKind', read.text);
    if (r === undefined) pair.push(t);
    else if (r === 'sire') {
      if (sire) return refuse('oneJob', read.text);
      sire = t;
    } else {
      if (dam) return refuse('oneJob', read.text);
      dam = t;
    }
    return undefined;
  };
  for (let i = 0; i < c.length; i++) {
    const t = c[i];
    const next = c[i + 1];
    if (t.record) {
      const r = role ?? (has(next, 'pairX') ? undefined : t.record.animal?.sex === 'male' ? 'sire' : 'dam');
      const no = setRecord(t, r);
      if (no) return no;
      role = undefined;
    } else if (has(t, 'pairX') && pair.length === 1 && next?.record) {
      used.add(t);
      const no = setRecord(next, undefined);
      if (no) return no;
      i += 1;
    } else if (has(t, 'by')) {
      used.add(t);
      role = 'sire';
    } else if (has(t, 'outOf') || (has(t, 'from') && next?.record)) {
      used.add(t);
      role = 'dam';
    } else if (has(t, 'ai') && (has(next, 'bull') || isCode(next) || has(next, 'codeWord'))) {
      ai = true;
      used.add(t);
      role = 'sire';
    } else if (has(t, 'bull') && has(next, 'offNoun')) {
      // "bull calf": one male.
      oneSex = 'male';
      oneSexAt = t;
      used.add(t);
    } else if (has(t, 'bull') && next?.record) {
      // "sire Bull 44".
      used.add(t);
      role = 'sire';
    } else if (has(t, 'bull', 'codeWord') && isCode(next)) {
      // "sire 7HO1234", "NAAB 7HO1234": a code. A code word names a straw's code.
      if (code) return refuse('oneJob', read.text);
      if (has(t, 'codeWord')) ai = true;
      code = next;
      used.add(t).add(next);
      i += 1;
      role = undefined;
    } else if (has(t, 'bull', 'codeWord') && (role === 'sire' || ai || has(next, 'codeWord'))) {
      used.add(t);
      role = 'sire';
    } else if ((role === 'sire' || ai) && isCode(t) && !code) {
      code = t;
      used.add(t);
      role = undefined;
    } else if (has(t, 'idTag', 'idChip', 'idAny')) {
      used.add(t);
      if (has(t, 'idTag', 'idChip')) idScheme = t;
      if (has(t, 'later')) idsLater = true;
      else if (next && !next.record && (next.unknown || next.n !== undefined) && !has(next, 'later')) {
        idValue = next;
        used.add(next);
        i += 1;
      }
    } else if (has(t, 'later')) {
      used.add(t);
      idsLater = true;
    } else if (t.n !== undefined && next && (has(next, 'male') || (has(next, 'dogWord') && !has(next, 'female')))) {
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
    } else if (has(t, 'female') && t.n === undefined) {
      // "heifer calf", "a heifer": one female.
      oneSex = 'female';
      oneSexAt = t;
      used.add(t);
    } else if (has(t, 'male') && t.n === undefined) {
      oneSex = 'male';
      oneSexAt = t;
      used.add(t);
    } else if (t.n !== undefined) {
      numbers.push(t);
      used.add(t);
    } else if (has(t, 'offNoun', 'offVerb', 'counter', 'and', 'from', 'to', 'new', 'cloneVerb')) used.add(t);
  }
  const date = dateOf(c, used, ctx.lang);
  if ('type' in date) return date;
  const left = leftovers(read, c, used);
  if (left.length) return { left };
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
  const count = numbers[0];
  const m = males?.n ?? 0;
  const f = females?.n ?? 0;
  const n = count?.n ?? (m + f || 1);
  if (n < 1 || n > MAX_BATCH) return refuse('count', read.text);
  if (m + f > n) return refuse('sexCount', read.text);
  if (oneSex && (n !== 1 || males || females)) return refuse('sexCount', read.text);
  if (idValue && n !== 1)
    return refuse('count', read.text, {
      words: said(read, [idValue]),
      understood: without(read, [idValue, ...(idScheme ? [idScheme] : [])]),
      suggest: [{ text: without(read, [idValue, ...(idScheme ? [idScheme] : [])]) }],
    });
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
      count: { v: n, src: countSrc },
      ...(sire ? { sire: { v: sire.record!.id, src: { kind: 'record', id: sire.record!.id } } } : {}),
      ...(dam ? { dam: { v: dam.record!.id, src: { kind: 'record', id: dam.record!.id } } } : {}),
      ...(code
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
      date,
    },
  };
};

const readDue = (c: readonly Token[], read: Read): ReaderOut => {
  const used = new Set(c.filter((t) => has(t, 'dueWord', 'dueVerb', 'to', 'and', 'today', 'from', 'every')));
  const left = leftovers(read, c, used);
  if (left.length) return { left };
  return { used, plan: { job: 'due' } };
};

const readImport = (c: readonly Token[], ctx: PlanContext, read: Read): ReaderOut => {
  const used = new Set<Token>();
  let expect: Token | undefined;
  for (const t of c) {
    if (t.n !== undefined && !expect) {
      expect = t;
      used.add(t);
    } else if (has(t, 'importVerb', 'importNoun', 'animalNoun', 'dogWord', 'from', 'to', 'new', 'counter', 'and'))
      used.add(t);
  }
  const left = leftovers(read, c, used);
  if (left.length) return { left };
  const animal = ctx.animals && c.some((t) => has(t, 'animalNoun', 'dogWord'));
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
    } else if (has(t, 'readyWord', 'readyCore', 'licenseWord', 'to', 'cloneVerb', 'dueVerb')) used.add(t);
  }
  const left = leftovers(read, c, used);
  if (left.length) return { left };
  if (!record) return refuse('noRecord', read.text);
  if (!ownRecord(record)) return refuse('received', read.text);
  return { used, plan: { job: 'ready', record: { v: record.id, src: { kind: 'record', id: record.id } } } };
};

const readGroup = (kind: Kind, g: readonly Token[], ctx: PlanContext, read: Read, before?: StrainRecord): ReaderOut =>
  kind === 'clones'
    ? readClones(g, ctx, read)
    : kind === 'offspring'
      ? readOffspring(g, ctx, read)
      : kind === 'due'
        ? readDue(g, read)
        : kind === 'import'
          ? readImport(g, ctx, read)
          : readReady(g, read, before);

// ---- the plan ---------------------------------------------------------------------------------

/** A word left over that reads as a name ("Luna"): typed with a capital, not a word Ask knows. */
const looksLikeName = (read: Read, t: Token): boolean => {
  const w = read.cased.slice(t.at, t.end);
  return !!t.unknown && /^\p{Lu}/u.test(w) && !/\d/.test(w);
};

/**
 * Read one request. `fromHint`: the text is the hint's example, put in the box and not edited
 * since (AskSheet.tsx): it never starts a job.
 */
export const planJob = (typedText: string, ctx: PlanContext, opts: { fromHint?: boolean } = {}): PlanResult =>
  plan(typedText, ctx, opts, 0);

const plan = (typedText: string, ctx: PlanContext, opts: { fromHint?: boolean }, depth: number): PlanResult => {
  const read = tokenize(typedText, ctx.records);
  const text = read.text.trim();
  if (!text) return refuse('unknown', '');
  if (opts.fromHint) return refuse('hint', text);
  if (read.negated) return refuse('negation', text);
  // Things no job here does, whatever else is said.
  if (read.tokens.some((t) => has(t, 'money'))) return refuse('money', text);
  if (read.tokens.some((t) => has(t, 'notJob'))) return refuse('notJob', text);
  if (read.tokens.some((t) => has(t, 'stamp'))) return refuse('stampAll', text);
  // A name two of the person's own records share: which one is meant can't be told from the text.
  for (const t of read.tokens) {
    if (!t.record || !ownRecord(t.record)) continue;
    const n = normalizeText(t.record.strainName ?? '').trim();
    if (ctx.records.filter((r) => ownRecord(r) && normalizeText(r.strainName ?? '').trim() === n).length > 1)
      return refuse('twoRecords', text, { words: said(read, [t]) });
  }

  const clauses = splitClauses(read.tokens);
  // Details join the clause before ("6 pups, 4 male 2 female", "…, sire Bull 44", "…, lot B").
  const groups: Token[][] = [];
  const kinds: Kind[] = [];
  for (const c of clauses) {
    // After a first clause, one that holds only details is a detail ("…, bull calf by Bull 44").
    const k = groups.length && isDetail(c) ? 'detail' : kindOf(c);
    if (k === 'detail' && groups.length) groups[groups.length - 1].push(...c);
    else {
      groups.push([...c]);
      kinds.push(k);
    }
  }
  if (groups.length > MAX_CLAUSES) return refuse('tooMany', text);
  const again = (t: string): PlanResult | undefined =>
    depth < 2 && t && t !== read.cased.trim() ? plan(t, ctx, {}, depth + 1) : undefined;
  if (kinds.includes('partB')) {
    // The first part on its own, and "get <record> ready to license" for the record licensed.
    // "cut 12 clones … and license them …" is one clause: the part before the "and" that comes
    // before the license word, when there is no other clause.
    const lic = groups.flat().findIndex((t) => has(t, 'licenseWord'));
    const andAt = groups
      .flat()
      .slice(0, Math.max(0, lic))
      .reverse()
      .find((t) => has(t, 'and'));
    const others = groups.filter((_, i) => kinds[i] !== 'partB');
    const firstPart = others.length
      ? keepGroups(read, others)
      : andAt
        ? read.cased.slice(groups[0][0].at, andAt.at).trim()
        : '';
    const first = firstPart ? again(firstPart) : undefined;
    const named = groups.flat().find((t) => t.record && ownRecord(t.record))?.record;
    const suggest: Suggestion[] = [
      ...(first?.type === 'plan' ? [{ text: firstPart }] : []),
      ...(named ? [{ ready: named.strainName }] : []),
    ];
    return refuse('partB', text, { suggest });
  }
  const bad = kinds.findIndex((k) => k === 'unknown' || k === 'detail');
  if (bad !== -1) {
    const left = groups[bad];
    const shorter = keepGroups(
      read,
      groups.filter((_, i) => i !== bad),
    );
    const p = again(shorter);
    return refuse('unknown', text, {
      words: said(
        read,
        left.filter((t) => !t.cats.has('filler')),
      ),
      ...(p?.type === 'plan' ? { understood: shorter, suggest: [{ text: shorter }] } : {}),
    });
  }
  if (groups.length > 1) {
    const firstOnly = keepGroups(read, groups.slice(0, 1));
    const one = again(firstOnly);
    return refuse('oneJob', text, one?.type === 'plan' ? { suggest: [{ text: firstOnly }] } : {});
  }
  const [g] = groups;
  const out = readGroup(kinds[0], g, ctx, read);
  if ('type' in out) return out;
  if ('left' in out) {
    const words = said(read, out.left);
    // A name not on file ("Luna whelped 6 pups"): say so, rather than "say it more simply".
    if (out.left.some((t) => looksLikeName(read, t)))
      return refuse('notFound', text, {
        words: said(
          read,
          out.left.filter((t) => looksLikeName(read, t)),
        ),
      });
    const shorter = without(read, out.left);
    const p = again(shorter);
    return refuse('leftover', text, {
      words,
      ...(p?.type === 'plan' ? { understood: shorter, suggest: [{ text: shorter }] } : {}),
    });
  }
  return { type: 'plan', plan: out.plan, text: read.text };
};

type AnyVal = Val<number> | Val<string>;
/** Every value a plan carries, with its source. */
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
      p.lotName,
      p.date,
    ].filter((v): v is AnyVal => !!v);
  if (p.job === 'import') return p.expect ? [p.expect] : [];
  if (p.job === 'ready') return [p.record];
  return [];
};

/** The number a span says, in figures or in words ("6", "twins"); undefined when it says none. */
const numbersIn = (span: string): number[] => {
  const digits = [...span.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const words = span
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .flatMap((w) => (Object.hasOwn(NUMBER_WORDS, w) ? [NUMBER_WORDS[w]] : []));
  const ja = Object.keys(NUMBER_WORDS)
    .filter((w) => /[^ -~]/.test(w) && span.includes(w))
    .map((w) => NUMBER_WORDS[w]);
  return [...digits, ...words, ...ja];
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
    if (s.kind === 'rule') return s.rule === 'today' && val.v === 'today';
    if (s.kind === 'typed') {
      if (s.at < 0 || s.end > text.length || s.end <= s.at) return false;
      const span = text.slice(s.at, s.end);
      if (typeof val.v === 'number') {
        const ns = numbersIn(span);
        // The number itself, the sum of the numbers said ("4 male 2 female"), or one said in words.
        return ns.length ? ns.includes(val.v) || ns.reduce((a, b) => a + b, 0) === val.v : val.v === 1;
      }
      if (val.v === 'Ear tag' || val.v === 'Microchip' || val.v === 'yesterday') return true;
      return typeof val.v === 'string' && span.toLowerCase() === val.v.toLowerCase();
    }
    return false;
  });
