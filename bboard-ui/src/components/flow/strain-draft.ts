// Logging a strain or line: what its first screen keeps between visits, and what it is sealed
// as (veilcore/seal-record.ts sealStrainRecord). Kept beside the plant's and the animal's drafts.
// SPDX-License-Identifier: Apache-2.0

import { STRAIN_GROUPS, type StrainGroup } from '../../veilcore/strain-profile';
import type { StrainSealInput } from '../../veilcore/seal-record';
import type { ParentRef } from '../../veilcore/records';

/** A parent strain as typed: a name and a deposit number, or a logged strain picked (recordId). */
export type StrainParentDraft = { name: string; deposit: string; recordId?: string };

export type StrainDraft = {
  name: string;
  designation: string;
  group: StrainGroup;
  species: string;
  /** One deposit number per line, as typed. */
  deposits: string;
  method: string;
  generation: string;
  /** '' when not stated. */
  madeOn: string;
  parent1: StrainParentDraft;
  parent2: StrainParentDraft;
  maker: string;
  notes: string;
};

const emptyParent = (): StrainParentDraft => ({ name: '', deposit: '' });

export const emptyStrainDraft = (): StrainDraft => ({
  name: '',
  designation: '',
  group: 'bacterium',
  species: '',
  deposits: '',
  method: '',
  generation: '',
  madeOn: '',
  parent1: emptyParent(),
  parent2: emptyParent(),
  maker: '',
  notes: '',
});

const parentHas = (p: StrainParentDraft) => Boolean(p.name.trim() || p.deposit.trim() || p.recordId);

export const strainDraftHasContent = (d: StrainDraft): boolean =>
  Boolean(
    d.name.trim() ||
    d.designation.trim() ||
    d.species.trim() ||
    d.deposits.trim() ||
    d.method.trim() ||
    d.generation.trim() ||
    d.madeOn ||
    parentHas(d.parent1) ||
    parentHas(d.parent2) ||
    d.maker.trim() ||
    d.notes.trim(),
  );

export type StrainMissing = 'nameOrDesignation' | 'species' | 'maker' | 'deposits';

/** One line, trimmed: a pasted line break or tab becomes a space (the profile seals one line). */
const line = (v: string) =>
  v
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

/** The deposit numbers: one per line, trimmed, empty lines and repeats dropped. */
export const depositsOf = (text: string): string[] => [
  ...new Set(
    text
      .split(/[\n,;]+/)
      .map(line)
      .filter(Boolean),
  ),
];

export const strainMissing = (d: StrainDraft): StrainMissing | undefined => {
  if (!d.name.trim() && !d.designation.trim()) return 'nameOrDesignation';
  if (!d.species.trim()) return 'species';
  if (!d.maker.trim()) return 'maker';
  if (depositsOf(d.deposits).length > 8 || depositsOf(d.deposits).some((x) => Array.from(x).length > 200))
    return 'deposits';
  return undefined;
};

const parentOf = (p: StrainParentDraft): ParentRef[] =>
  parentHas(p)
    ? [{ name: line(p.name), individualId: line(p.deposit), ...(p.recordId ? { recordId: p.recordId } : {}) }]
    : [];

export const strainSealInputOf = (d: StrainDraft): StrainSealInput => ({
  name: line(d.name),
  designation: line(d.designation),
  group: d.group,
  species: line(d.species),
  deposits: depositsOf(d.deposits),
  method: line(d.method),
  generation: line(d.generation),
  madeOn: /^\d{4}-\d{2}-\d{2}$/.test(d.madeOn) ? d.madeOn : '',
  parents: [...parentOf(d.parent1), ...parentOf(d.parent2)],
  maker: line(d.maker),
  notes: d.notes.trim(),
  photoFingerprints: [],
});

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '');

const parseParent = (v: unknown): StrainParentDraft => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    name: str(o.name),
    deposit: str(o.deposit),
    ...(typeof o.recordId === 'string' && o.recordId ? { recordId: str(o.recordId, 128) } : {}),
  };
};

/** A stored strain draft read back, keeping only well-formed fields. */
export const parseStrainDraft = (v: unknown): StrainDraft | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const group = (STRAIN_GROUPS as readonly unknown[]).includes(o.group) ? (o.group as StrainGroup) : 'bacterium';
  return {
    name: str(o.name),
    designation: str(o.designation),
    group,
    species: str(o.species),
    deposits: str(o.deposits, 2000),
    method: str(o.method),
    generation: str(o.generation),
    madeOn: /^\d{4}-\d{2}-\d{2}$/.test(str(o.madeOn)) ? str(o.madeOn) : '',
    parent1: parseParent(o.parent1),
    parent2: parseParent(o.parent2),
    maker: str(o.maker),
    notes: str(o.notes, 20_000),
  };
};
