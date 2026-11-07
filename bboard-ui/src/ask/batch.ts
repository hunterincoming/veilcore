// Batches: "Cut 12 clones from #12", "3 calves from Bull #4 x Cow #9". One review screen with N
// child records, each naming its parent(s) inside its own sealed record (a ParentRef: private,
// like every other field), and one Save that goes through the bulk import's seal path
// (bulk-import.ts sealRows), so each child is sealed exactly as an imported row is.
//
// Parentage on Midnight is a separate, public step that needs the parent's holder to confirm
// (FamilyOnChain.tsx): a batch never does it for you.
// SPDX-License-Identifier: Apache-2.0

import type { ParentRef, StrainRecord } from '../veilcore/records';
import { rowHashOf, type PreparedRow, type RowFields } from '../veilcore/bulk-import';
import { MAX_BATCH } from './handoff';

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
};

export type BatchProblem = 'parent' | 'count' | 'name' | 'bredBy' | 'species' | 'date';

/** What stops a batch from being saved, in screen order; empty when it can be. */
export const batchProblems = (p: BatchPlan): BatchProblem[] => {
  const out: BatchProblem[] = [];
  if (p.preset === 'clones' ? !p.parent : !p.sire && !p.dam) out.push('parent');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > MAX_BATCH) out.push('count');
  if (!p.baseName.trim()) out.push('name');
  if (!p.bredBy.trim()) out.push('bredBy');
  if (p.preset === 'offspring' && !p.taxon.trim()) out.push('species');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.push('date');
  return out;
};

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

/** One child's fields, exactly as it will be sealed. */
export const childFields = (p: BatchPlan, name: string): RowFields => {
  if (p.preset === 'clones' && p.parent) {
    const parent = p.parent;
    return {
      strainName: name,
      refId: '',
      taxon: p.taxon.trim(),
      parents: [parentRef(parent)],
      bredBy: p.bredBy.trim(),
      dateCreated: p.date,
      notes: '',
      breedingMethod: CLONE_METHOD,
    };
  }
  const own = (r: StrainRecord | undefined) => (r && !isReceived(r) ? r : undefined);
  return {
    strainName: name,
    refId: '',
    taxon: p.taxon.trim(),
    parents: [...(p.sire ? [parentRef(p.sire, 'sire')] : []), ...(p.dam ? [parentRef(p.dam, 'dam')] : [])],
    bredBy: p.bredBy.trim(),
    dateCreated: p.date,
    notes: '',
    animal: {
      breed: own(p.dam)?.animal?.breed || own(p.sire)?.animal?.breed || '',
      idScheme: '',
      sex: 'unknown',
      herd: own(p.dam)?.animal?.herd || own(p.sire)?.animal?.herd || '',
    },
  };
};

/** The batch as the bulk import's rows, ready to seal (bulk-import.ts sealRows). */
export const batchRows = (p: BatchPlan): PreparedRow[] =>
  childNames(p.baseName, p.count, p.start).map((name, i) => {
    const fields = childFields(p, name);
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
