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
  /** Each child is named "<base> <n>", 1 to count. */
  readonly baseName: string;
  /** Cut on, or born on (YYYY-MM-DD). */
  readonly date: string;
  /** Clones: the plant cut from. */
  readonly parent?: StrainRecord;
  /** Offspring: the sire and the dam, either may be missing (not both). */
  readonly sire?: StrainRecord;
  readonly dam?: StrainRecord;
};

export type BatchProblem = 'parent' | 'count' | 'name' | 'date';

/** What stops a batch from being saved, in screen order; empty when it can be. */
export const batchProblems = (p: BatchPlan): BatchProblem[] => {
  const out: BatchProblem[] = [];
  if (p.preset === 'clones' ? !p.parent : !p.sire && !p.dam) out.push('parent');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > MAX_BATCH) out.push('count');
  if (!p.baseName.trim()) out.push('name');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.push('date');
  return out;
};

/** The children's names: "<base> 1" … "<base> N". */
export const childNames = (baseName: string, count: number): string[] =>
  Array.from({ length: Math.max(0, Math.min(count, MAX_BATCH)) }, (_, i) => `${baseName.trim()} ${i + 1}`);

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
      taxon: parent.taxon ?? '',
      parents: [parentRef(parent)],
      bredBy: parent.bredBy,
      dateCreated: p.date,
      notes: '',
      breedingMethod: CLONE_METHOD,
    };
  }
  const first = p.dam ?? p.sire;
  return {
    strainName: name,
    refId: '',
    taxon: first?.taxon ?? '',
    parents: [...(p.sire ? [parentRef(p.sire, 'sire')] : []), ...(p.dam ? [parentRef(p.dam, 'dam')] : [])],
    bredBy: first?.bredBy ?? '',
    dateCreated: p.date,
    notes: '',
    animal: {
      breed: p.dam?.animal?.breed || p.sire?.animal?.breed || '',
      idScheme: '',
      sex: 'unknown',
      herd: p.dam?.animal?.herd || p.sire?.animal?.herd || '',
    },
  };
};

/** The batch as the bulk import's rows, ready to seal (bulk-import.ts sealRows). */
export const batchRows = (p: BatchPlan): PreparedRow[] =>
  childNames(p.baseName, p.count).map((name, i) => {
    const fields = childFields(p, name);
    return { line: i + 1, cells: [], fields, hash: rowHashOf(fields), status: 'ready', problems: [] };
  });
