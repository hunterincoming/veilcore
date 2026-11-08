// Batches: "Cut 12 clones from #12", "3 calves from Bull #4 x Cow #9". One review screen with N
// child records, each naming its parent(s) inside its own sealed record (a ParentRef: private,
// like every other field), and one Save that goes through the bulk import's seal path
// (bulk-import.ts sealRows), so each child is sealed exactly as an imported row is.
//
// Parentage on Midnight is a separate, public step that needs the parent's holder to confirm
// (FamilyOnChain.tsx): a batch never does it for you.
//
// What a herd book or a state tracking system needs is said before Save, child by child
// (breeder panel, 7 Nov 2026): each young animal's sex, ID and date of birth, a sire typed in
// when he is not on VeilCore (a bull from a stud, with his semen code), and for clones a plant
// tag each and a lot. Everything is a field the animal profile v1 or a plant record already
// seals, or a labelled line in the notes, so no record hashes any differently.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../veilcore/records';
import { rowHashOf, type PreparedRow, type RowFields } from '../veilcore/bulk-import';
import { isCalendarDate, type AnimalSex } from '../veilcore/animal-profile';
import { MAX_BATCH } from './handoff';

/** The notes' labels a batch seals under, always this English (as origin-notes.ts). */
export const SEMEN_CODE_LABEL = 'Sire semen code: ';
export const LOT_LABEL = 'Lot: ';
export const LOT_SIZE_LABEL = 'Lot size: ';

/**
 * The most children whose details are typed one by one on the batch screen. Above it the screen
 * shows no per-child fields: young animals take the defaults, clones the numbered tags.
 */
export const EDIT_MAX = 100;

/**
 * A young animal's own dam, when it isn't the batch's (a calf crop: many cows to one bull): one
 * of the person's own records, or typed in when she is not on VeilCore.
 */
export type ChildDam = { readonly record?: StrainRecord; readonly name?: string; readonly individualId?: string };

/** One child's own details, typed on the batch screen. Empty or absent: the batch's defaults. */
export type ChildDetails = {
  /** A young animal's own dam, when not the batch's. */
  readonly dam?: ChildDam;
  /** A young animal's sex. */
  readonly sex?: AnimalSex;
  /** A young animal's ID (ear tag, microchip, registration), exactly as written. */
  readonly individualId?: string;
  /** A young animal's date of birth (YYYY-MM-DD), when not the batch's date. */
  readonly born?: string;
  /** A clone's plant tag (its record's own reference). */
  readonly tag?: string;
};

/** A sire not on VeilCore, typed in: a name, an ID, or both. */
export type TypedSire = { readonly name: string; readonly individualId: string };

/**
 * One line: control characters, line and paragraph separators and bidirectional overrides become
 * single spaces, trimmed (the profile seals one line, and an override could make a value display
 * as something else).
 */
export const line = (v: string | undefined) =>
  (v ?? '')
    .replace(/[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── Species: what a batch of young can sensibly be ─────────────────────────────────────────

/** The species groups a batch treats differently, from the species as typed (any of the five languages). */
export type SpeciesGroup = 'cattle' | 'horse' | 'sheepGoat' | 'dog' | 'pig';
const SPECIES: readonly [SpeciesGroup, RegExp][] = [
  ['cattle', /\b(cattle|cows?|bulls?|bovine|bos|rind|rinder|kuh|bovins?|vaches?|bovinos?|vacas?|ganado)\b|牛/i],
  ['horse', /\b(horses?|equine|equus|ponys?|ponies|pferde?|chevaux|cheval|caballos?|yeguas?)\b|馬/i],
  ['sheepGoat', /\b(sheep|ovis|goats?|capra|schafe?|ziegen?|moutons?|brebis|chèvres?|ovejas?|cabras?)\b|羊|ヤギ/i],
  ['dog', /\b(dogs?|canis|hunde?|chiens?|perros?)\b|犬/i],
  ['pig', /\b(pigs?|swine|sus|schweine?|porcs?|cerdos?)\b|豚/i],
];
export const speciesGroup = (taxon: string): SpeciesGroup | undefined => SPECIES.find(([, re]) => re.test(taxon))?.[0];

/**
 * A semen code is asked only where straws carry one: cattle (NAAB and national codes), sheep and
 * goats. A dog or horse breeder never sees a field about bulls' stud codes.
 */
export const semenCodeApplies = (taxon: string): boolean => {
  const g = speciesGroup(taxon);
  return g === 'cattle' || g === 'sheepGoat';
};

/** The breeding method a clone is sealed with (breeding-methods.ts, always this English). */
export const CLONE_METHOD = 'Clone / cutting';

export type BatchPreset = 'clones' | 'offspring';

export type BatchPlan = {
  readonly preset: BatchPreset;
  readonly count: number;
  /** Each child is named "<base> <n>", from `start` (default 1). */
  readonly baseName: string;
  /** The first number: past any child an earlier batch already made (firstFreeStart). */
  readonly start?: number;
  /**
   * Who bred them, and the species: typed here, or filled from a parent the person logged
   * themselves. Never from a record received from someone else (provenance rule).
   */
  readonly bredBy: string;
  readonly taxon: string;
  /** Cut on, or born on (YYYY-MM-DD). */
  readonly date: string;
  /** Clones: the plant cut from. */
  readonly parent?: StrainRecord;
  /** Offspring: the sire and the dam, either may be missing (not both). */
  readonly sire?: StrainRecord;
  readonly dam?: StrainRecord;
  /** Offspring: a sire not on VeilCore, typed in (used only when no sire record is picked). */
  readonly typedSire?: TypedSire;
  /** Offspring by artificial insemination: the typed sire's semen code (a NAAB code, say). */
  readonly semenCode?: string;
  /** Offspring: the ID scheme every child's ID belongs to ("Ear tag", "Microchip"). */
  readonly idScheme?: string;
  /** Clones: the lot's name, sealed in each clone's notes with the lot size. */
  readonly lotName?: string;
  /** Each child's own details, by its place in the batch (0 is the first). */
  readonly children?: readonly (ChildDetails | undefined)[];
};

export type BatchProblem =
  | 'parent'
  | 'count'
  | 'name'
  | 'bredBy'
  | 'species'
  | 'date'
  | 'scheme'
  | 'dupId'
  | 'dupTag'
  | 'born'
  | 'takenId'
  | 'takenTag';

/** IDs and plant tags already on the person's records, exactly as written: a batch may not repeat them. */
export type Existing = { readonly ids?: ReadonlySet<string>; readonly tags?: ReadonlySet<string> };

/** IDs (animals) or plant tags (plants) on these records, as written. */
export const existingOf = (records: readonly StrainRecord[], isAnimal: (r: StrainRecord) => boolean): Existing => ({
  ids: new Set(
    records
      .filter(isAnimal)
      .map((r) => line(r.refId))
      .filter(Boolean),
  ),
  tags: new Set(
    records
      .filter((r) => !isAnimal(r))
      .map((r) => line(r.refId))
      .filter(Boolean),
  ),
});

/** The first of these values already taken, if any. */
export const firstTaken = (values: readonly (string | undefined)[], taken: ReadonlySet<string> | undefined) =>
  taken ? values.map(line).find((v) => v && taken.has(v)) : undefined;

/** Today on the person's own calendar (as log-flow-state.ts today). */
const todayHere = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Clones of a plant the person logged with no breeder (a landrace, or material they received and
 * logged as such): a clone is the same plant, so it needs no breeder either. Never for young
 * animals, whose profile needs a breeder or holder (SPEC 11.8).
 */
export const breederOptional = (p: Pick<BatchPlan, 'preset' | 'parent'>): boolean =>
  p.preset === 'clones' && !!p.parent && !isReceived(p.parent) && !p.parent.bredBy?.trim();

/** The typed sire, when one is used: no sire record picked, and a name or an ID typed. */
export const typedSireOf = (p: Pick<BatchPlan, 'preset' | 'sire' | 'typedSire'>): TypedSire | undefined =>
  p.preset === 'offspring' && !p.sire && p.typedSire && (line(p.typedSire.name) || line(p.typedSire.individualId))
    ? { name: line(p.typedSire.name), individualId: line(p.typedSire.individualId) }
    : undefined;

/** The children whose details count: the first `count`. */
const detailsOf = (p: BatchPlan): (ChildDetails | undefined)[] =>
  Array.from(
    { length: Math.max(0, Math.min(Number.isInteger(p.count) ? p.count : 0, MAX_BATCH)) },
    (_, i) => p.children?.[i],
  );

/** The first value typed twice, if any (exactly as written, spaces at the ends aside). */
export const firstRepeat = (values: readonly (string | undefined)[]): string | undefined => {
  const seen = new Set<string>();
  for (const v of values.map(line).filter(Boolean)) {
    if (seen.has(v)) return v;
    seen.add(v);
  }
  return undefined;
};

/** What stops a batch from being saved, in screen order; empty when it can be. */
export const batchProblems = (p: BatchPlan, existing: Existing = {}): BatchProblem[] => {
  const out: BatchProblem[] = [];
  const details = detailsOf(p);
  if (
    p.preset === 'clones'
      ? !p.parent
      : !p.sire && !p.dam && !typedSireOf(p) && !(details.length > 0 && details.every(hasOwnDam))
  )
    out.push('parent');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > MAX_BATCH) out.push('count');
  if (!p.baseName.trim()) out.push('name');
  if (!p.bredBy.trim() && !breederOptional(p)) out.push('bredBy');
  if (p.preset === 'offspring' && !p.taxon.trim()) out.push('species');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.push('date');
  if (p.preset === 'offspring') {
    // The animal profile seals an ID only with the scheme it belongs to (SPEC 11.8).
    if (details.some((c) => line(c?.individualId)) && !line(p.idScheme)) out.push('scheme');
    if (firstRepeat(details.map((c) => c?.individualId))) out.push('dupId');
    if (
      firstTaken(
        details.map((c) => c?.individualId),
        existing.ids,
      )
    )
      out.push('takenId');
    // A real calendar date, and not one still to come.
    if (details.some((c) => c?.born && (!isCalendarDate(c.born) || c.born > todayHere()))) out.push('born');
  } else {
    if (firstRepeat(details.map((c) => c?.tag))) out.push('dupTag');
    if (
      firstTaken(
        details.map((c) => c?.tag),
        existing.tags,
      )
    )
      out.push('takenTag');
  }
  return out;
};

/**
 * The plant tags a clone batch suggests, numbered on from the first: "1A4-0099" → "1A4-0100",
 * keeping the digits' width; a tag that doesn't end in a number gets "-2", "-3"… after the first.
 * Empty when no first tag is typed. Only a suggestion: each can be changed before Save.
 */
export const suggestTags = (first: string, count: number): string[] => {
  const f = line(first);
  const n = Math.max(0, Math.min(Number.isInteger(count) ? count : 0, MAX_BATCH));
  if (!f) return Array.from({ length: n }, () => '');
  const m = /^(.*?)(\d+)$/.exec(f);
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return f;
    if (!m) return `${f}-${i + 1}`;
    const next = (BigInt(m[2]) + BigInt(i)).toString();
    return `${m[1]}${next.padStart(m[2].length, '0')}`;
  });
};

/** The notes a clone is sealed with: the lot, when it is named, and its size. */
export const lotNotes = (lotName: string | undefined, count: number): string =>
  line(lotName) ? `${LOT_LABEL}${line(lotName)}\n${LOT_SIZE_LABEL}${count}` : '';

/** The children's names: "<base> <start>" … "<base> <start + N - 1>". */
export const childNames = (baseName: string, count: number, start = 1): string[] =>
  Array.from({ length: Math.max(0, Math.min(count, MAX_BATCH)) }, (_, i) => `${baseName.trim()} ${start + i}`);

/** Whether a record came from someone else (a transfer or a delivery): its words are theirs. */
export const isReceived = (r: StrainRecord | undefined): boolean => !!r?.receivedFrom;

/** What a batch can fill in from its parent(s): only from records the person logged themselves. */
export const ownDefaults = (parents: readonly (StrainRecord | undefined)[]): { bredBy: string; taxon: string } => {
  const own = parents.filter((r): r is StrainRecord => !!r && !isReceived(r));
  return { bredBy: own[0]?.bredBy ?? '', taxon: own.find((r) => r.taxon)?.taxon ?? '' };
};

const parentRef = (r: StrainRecord, role?: 'sire' | 'dam'): ParentRef => ({
  recordId: r.id,
  name: r.strainName,
  ...(role ? { role } : {}),
  ...(role && r.refId ? { individualId: r.refId } : {}),
});

/** A child's dam: its own (a record, or typed with a name or an ID), else the batch's. */
const damOf = (p: BatchPlan, child?: ChildDetails): ParentRef | undefined => {
  const d = child?.dam;
  if (d?.record) return parentRef(d.record, 'dam');
  if (d && (line(d.name) || line(d.individualId)))
    return { role: 'dam', name: line(d.name), individualId: line(d.individualId) };
  return p.dam ? parentRef(p.dam, 'dam') : undefined;
};

/** Whether a child has a dam of its own, not the batch's. */
export const hasOwnDam = (c: ChildDetails | undefined): boolean =>
  !!c?.dam && (!!c.dam.record || !!line(c.dam.name) || !!line(c.dam.individualId));

/**
 * One child's fields, exactly as it will be sealed. `child` is its own details (by its place in
 * the batch); without them, the batch's defaults: sex not stated, no ID, the batch's date.
 */
export const childFields = (p: BatchPlan, name: string, child?: ChildDetails): RowFields => {
  if (p.preset === 'clones' && p.parent) {
    const parent = p.parent;
    return {
      strainName: name,
      refId: line(child?.tag),
      taxon: p.taxon.trim(),
      parents: [parentRef(parent)],
      bredBy: p.bredBy.trim(),
      dateCreated: p.date,
      notes: lotNotes(p.lotName, p.count),
      breedingMethod: CLONE_METHOD,
    };
  }
  const own = (r: StrainRecord | undefined) => (r && !isReceived(r) ? r : undefined);
  const typed = typedSireOf(p);
  const individualId = line(child?.individualId);
  const dam = damOf(p, child);
  const damRecord = dam && 'recordId' in dam ? (child?.dam?.record ?? p.dam) : undefined;
  return {
    strainName: name,
    refId: individualId,
    taxon: p.taxon.trim(),
    parents: [
      ...(p.sire ? [parentRef(p.sire, 'sire')] : []),
      ...(typed ? [{ role: 'sire' as const, name: typed.name, individualId: typed.individualId }] : []),
      ...(dam ? [dam] : []),
    ],
    bredBy: p.bredBy.trim(),
    dateCreated: child?.born || p.date,
    notes: typed && line(p.semenCode) && semenCodeApplies(p.taxon) ? `${SEMEN_CODE_LABEL}${line(p.semenCode)}` : '',
    animal: {
      breed: own(damRecord)?.animal?.breed || own(p.sire)?.animal?.breed || '',
      idScheme: individualId ? line(p.idScheme) : '',
      sex: child?.sex ?? 'unknown',
      herd: own(damRecord)?.animal?.herd || own(p.sire)?.animal?.herd || '',
    },
  };
};

/** The batch as the bulk import's rows, ready to seal (bulk-import.ts sealRows). */
export const batchRows = (p: BatchPlan): PreparedRow[] =>
  childNames(p.baseName, p.count, p.start).map((name, i) => {
    const fields = childFields(p, name, p.children?.[i]);
    return { line: i + 1, cells: [], fields, hash: rowHashOf(fields), status: 'ready', problems: [] };
  });

/**
 * The first number at which none of the batch's children would be a record already made: by an
 * earlier batch (in the bulk import's ledger, sent or waiting) or in the person's set. The bulk
 * import treats a row it has seen as done, so a second litter of the same pair on the same day,
 * or the same clones cut again, would otherwise save nothing and say they were saved.
 *
 * Numbered past every name already used ("<base> <n>" among `names`, the person's records and
 * the ledger's), so two records never share a name; then past any clash of the rows themselves,
 * each hashed with its own details (sex, ID, birth date, tag), as it will be sealed.
 */
export const firstFreeStart = (
  p: BatchPlan,
  taken: ReadonlySet<string>,
  names: ReadonlySet<string> = new Set(),
): number => {
  const base = p.baseName.trim();
  if (!base || !Number.isInteger(p.count) || p.count < 1) return 1;
  const count = Math.min(p.count, MAX_BATCH);
  let start = 1;
  const prefix = `${base} `;
  for (const n of names) {
    if (!n.startsWith(prefix)) continue;
    const rest = n.slice(prefix.length);
    if (/^[1-9]\d{0,6}$/.test(rest)) start = Math.max(start, Number(rest) + 1);
  }
  // One pass up the numbers, each hashed once: a clash at n means the run starts after n.
  for (let n = start; n - start < count && n < 2_000_000; n += 1)
    if (taken.has(rowHashOf(childFields(p, `${base} ${n}`, p.children?.[n - start])))) start = n + 1;
  return start;
};

/** More young than one dam has at once, as far as any species goes (litters run to about 20). */
export const UNLIKELY_YOUNG = 20;

/** More young than one dam of this species usually has at once (cattle and horses: twins at most). */
export const youngLimit = (taxon = ''): number => {
  const g = speciesGroup(taxon);
  return g === 'cattle' || g === 'horse' ? 2 : g === 'sheepGoat' ? 4 : g === 'dog' ? 16 : UNLIKELY_YOUNG;
};

/**
 * A count to check, not refuse: more young from one dam than her species usually has at once.
 * Young given a dam of their own (a calf crop: many cows, one bull) don't count against the
 * batch's dam. The person may still save it (embryo transfer, a record of several litters); the
 * batch screen says so beside the number. Up to MAX_BATCH either way.
 */
export const unlikelyYoung = (
  preset: 'clones' | 'offspring',
  count: number,
  taxon = '',
  children: readonly (ChildDetails | undefined)[] = [],
): boolean => {
  if (preset !== 'offspring' || !Number.isFinite(count)) return false;
  const own = children.slice(0, count).filter(hasOwnDam).length;
  return count - own > youngLimit(taxon);
};
