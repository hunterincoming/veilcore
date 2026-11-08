// "Add IDs" (components/ask/AddIds.tsx): the young of one dam born the same day, and which pasted
// ID goes on which young. A correction is permanent, so a column that doesn't line up with the
// litter is refused rather than guessed at (verification V5): after a save that stopped part way,
// the young that already have an ID are still listed, with it, and a column pasted again whole
// must agree with them row by row; a shorter column goes on the young still without one, in
// order, and never repeats an ID already saved.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import { isAnimal } from '../veilcore/animal-profile';
import { isReceivedRecord } from '../ask/hint';

/** Only young made in this long are asked about. */
const RECENT_DAYS = 180;

export type Litter = {
  readonly key: string;
  readonly dam: string;
  readonly born: string;
  /** Every young of the litter, in name order, with an ID or without. */
  readonly young: StrainRecord[];
  /** Those still without an ID. */
  readonly missing: StrainRecord[];
};

const hasId = (r: StrainRecord): boolean => !!r.refId?.trim();

/** The person's own litters with any young still without an ID, by dam and birth date, newest first. */
export const littersWithoutIds = (records: readonly StrainRecord[], today: string): Litter[] => {
  const since = new Date(`${today}T12:00:00`);
  since.setDate(since.getDate() - RECENT_DAYS);
  const from = since.toISOString().slice(0, 10);
  const groups = new Map<string, { key: string; dam: string; born: string; young: StrainRecord[] }>();
  for (const r of records) {
    if (!isAnimal(r) || isReceivedRecord(r) || r.supersededBy) continue;
    const dam = r.parents?.find((p) => p.role === 'dam');
    if (!dam || !r.dateCreated || r.dateCreated < from) continue;
    const key = `${dam.recordId ?? dam.name}|${r.dateCreated}`;
    const g = groups.get(key) ?? { key, dam: dam.name || dam.individualId || '', born: r.dateCreated, young: [] };
    g.young.push(r);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const young = [...g.young].sort((a, b) => a.strainName.localeCompare(b.strainName, undefined, { numeric: true }));
      return { ...g, young, missing: young.filter((r) => !hasId(r)) };
    })
    .filter((g) => g.missing.length > 0)
    .sort((a, b) => b.born.localeCompare(a.born));
};

export type IdRefusal =
  | { readonly why: 'twice'; readonly id: string }
  | { readonly why: 'taken'; readonly id: string; readonly name: string }
  | { readonly why: 'differs'; readonly id: string; readonly name: string; readonly typed: string }
  | { readonly why: 'tooMany'; readonly n: number; readonly count: number };

/** The pasted column, one ID a line (or tab or comma). */
export const idsOf = (text: string): string[] =>
  text
    .split(/\r?\n|\t|,/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Which young each pasted ID goes on, or why the column doesn't line up. The whole litter's
 * column (as many IDs as young): row by row, and a young that has an ID must have that one. A
 * shorter column: on the young still without an ID, in order, none of it an ID already saved.
 */
export const assignIds = (
  litter: Pick<Litter, 'young' | 'missing'>,
  ids: readonly string[],
): { pairs: [StrainRecord, string][] } | IdRefusal => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return { why: 'twice', id };
    seen.add(id);
  }
  const saved = litter.young.filter(hasId);
  if (saved.length && ids.length === litter.young.length) {
    const pairs: [StrainRecord, string][] = [];
    for (const [i, r] of litter.young.entries()) {
      const have = r.refId?.trim();
      if (have && have !== ids[i]) return { why: 'differs', id: have, name: r.strainName, typed: ids[i] };
      if (!have) pairs.push([r, ids[i]]);
    }
    return { pairs };
  }
  for (const r of saved)
    if (seen.has(r.refId!.trim())) return { why: 'taken', id: r.refId!.trim(), name: r.strainName };
  if (ids.length > litter.missing.length) return { why: 'tooMany', n: ids.length, count: litter.missing.length };
  return { pairs: ids.map((id, i) => [litter.missing[i], id]) };
};
