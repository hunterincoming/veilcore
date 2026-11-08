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
import type { AnimalSex } from '../veilcore/animal-profile';
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

/** One child's own details, typed on the batch screen. Empty or absent: the batch's defaults. */
export type ChildDetails = {
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

/** One line: control characters and line breaks to single spaces, trimmed (the profile seals one line). */
const line = (v: string | undefined) =>
  (v ?? '')
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
  | 'born';

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
export const batchProblems = (p: BatchPlan): BatchProblem[] => {
  const out: BatchProblem[] = [];
  if (p.preset === 'clones' ? !p.parent : !p.sire && !p.dam && !typedSireOf(p)) out.push('parent');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > MAX_BATCH) out.push('count');
  if (!p.baseName.trim()) out.push('name');
  if (!p.bredBy.trim() && !breederOptional(p)) out.push('bredBy');
  if (p.preset === 'offspring' && !p.taxon.trim()) out.push('species');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.push('date');
  const details = detailsOf(p);
  if (p.preset === 'offspring') {
    // The animal profile seals an ID only with the scheme it belongs to (SPEC 11.8).
    if (details.some((c) => line(c?.individualId)) && !line(p.idScheme)) out.push('scheme');
    if (firstRepeat(details.map((c) => c?.individualId))) out.push('dupId');
    if (details.some((c) => c?.born && !/^\d{4}-\d{2}-\d{2}$/.test(c.born))) out.push('born');
  } else if (firstRepeat(details.map((c) => c?.tag))) out.push('dupTag');
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
  return {
    strainName: name,
    refId: individualId,
    taxon: p.taxon.trim(),
    parents: [
      ...(p.sire ? [parentRef(p.sire, 'sire')] : []),
      ...(typed ? [{ role: 'sire' as const, name: typed.name, individualId: typed.individualId }] : []),
      ...(p.dam ? [parentRef(p.dam, 'dam')] : []),
    ],
    bredBy: p.bredBy.trim(),
    dateCreated: child?.born || p.date,
    notes: typed && line(p.semenCode) ? `${SEMEN_CODE_LABEL}${line(p.semenCode)}` : '',
    animal: {
      breed: own(p.dam)?.animal?.breed || own(p.sire)?.animal?.breed || '',
      idScheme: individualId ? line(p.idScheme) : '',
      sex: child?.sex ?? 'unknown',
      herd: own(p.dam)?.animal?.herd || own(p.sire)?.animal?.herd || '',
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
 */
export const firstFreeStart = (p: BatchPlan, taken: ReadonlySet<string>): number => {
  if (!p.baseName.trim() || !Number.isInteger(p.count) || p.count < 1) return 1;
  const count = Math.min(p.count, MAX_BATCH);
  // One pass up the numbers, each hashed once: a clash at n means the run starts after n.
  let start = 1;
  for (let n = 1; n - start < count && n < 1_000_000; n += 1)
    if (taken.has(rowHashOf(childFields(p, `${p.baseName.trim()} ${n}`)))) start = n + 1;
  return start;
};

/** More young than one dam has at once, as far as any species goes (litters run to about 20). */
export const UNLIKELY_YOUNG = 20;

/**
 * A count to check, not refuse: more than UNLIKELY_YOUNG young in one batch from one dam. The
 * person may still save it (embryo transfer, a record of several litters); the batch screen says
 * so beside the number. Up to MAX_BATCH either way.
 */
export const unlikelyYoung = (preset: 'clones' | 'offspring', count: number): boolean =>
  preset === 'offspring' && Number.isFinite(count) && count > UNLIKELY_YOUNG;
