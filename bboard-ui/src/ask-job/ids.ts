// "Add IDs" (components/ask/AddIds.tsx): the young of one dam born the same day, and which pasted
// ID goes on which young. A correction is permanent, so a column that doesn't line up with the
// litter is refused rather than guessed at (verification V5, W1, W4): every cell keeps its place,
// an empty one included; after a save that stopped part way, the young that already have an ID
// are still listed, with it, and a column pasted again whole must agree with them row by row; a
// shorter column goes on the young still without one, in order, with no empty row; and no ID
// may be one the litter or another of the person's animals already has.
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
  | { readonly why: 'elsewhere'; readonly id: string; readonly name: string }
  | { readonly why: 'differs'; readonly id: string; readonly name: string; readonly typed: string }
  | { readonly why: 'tooMany'; readonly n: number; readonly count: number }
  | { readonly why: 'blank'; readonly row: number }
  | { readonly why: 'comma'; readonly id: string };

/**
 * The pasted column, cell by cell in place: one row a line, and a row copied across from a
 * spreadsheet split at its tabs. An empty cell stays, as "no ID for this one", so every cell keeps
 * its position (verification W1); only empty lines at the very end go (a spreadsheet adds one).
 */
export const idsOf = (text: string): string[] => {
  const cells = text.split(/\r?\n/).flatMap((line) => line.split('\t').map((s) => s.trim()));
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  return cells;
};

const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

/**
 * Which young each pasted ID goes on, or why the column doesn't line up. Nothing is ever shifted
 * or guessed:
 *   - a column with a row for every young of the litter goes row by row; an empty row is "no ID
 *     for this one", and a young that has an ID must have that one (or an empty row);
 *   - a shorter column goes on the young still without an ID, in order, and may have no empty
 *     row (which young it skips can't be told), nor an ID already saved in the litter;
 *   - an ID twice, or one another of the person's animals has (`others`, ID to name), is refused;
 *   - a cell with a comma is refused: one ID a row, and an ID may itself hold a comma.
 */
export const assignIds = (
  litter: Pick<Litter, 'young' | 'missing'>,
  cells: readonly string[],
  others: ReadonlyMap<string, string> = new Map(),
): { pairs: [StrainRecord, string][] } | IdRefusal => {
  const comma = cells.find((c) => c.includes(','));
  if (comma) return { why: 'comma', id: comma };
  const seen = new Set<string>();
  for (const id of cells) {
    if (!id) continue;
    if (seen.has(id.toUpperCase())) return { why: 'twice', id };
    seen.add(id.toUpperCase());
    const other = [...others].find(([o]) => same(o, id));
    if (other) return { why: 'elsewhere', id, name: other[1] };
  }
  const saved = litter.young.filter(hasId);
  const savedAs = (id: string) => saved.find((r) => same(r.refId!.trim(), id));
  if (cells.length === litter.young.length) {
    const pairs: [StrainRecord, string][] = [];
    for (const [i, r] of litter.young.entries()) {
      const have = r.refId?.trim();
      if (have && cells[i] && !same(have, cells[i]))
        return { why: 'differs', id: have, name: r.strainName, typed: cells[i] };
      const on = !have && cells[i] ? savedAs(cells[i]) : undefined;
      if (on) return { why: 'taken', id: on.refId!.trim(), name: on.strainName };
      if (!have && cells[i]) pairs.push([r, cells[i]]);
    }
    return { pairs };
  }
  const blank = cells.findIndex((c) => !c);
  if (blank !== -1) return { why: 'blank', row: blank + 1 };
  for (const id of cells) {
    const on = savedAs(id);
    if (on) return { why: 'taken', id: on.refId!.trim(), name: on.strainName };
  }
  if (cells.length > litter.missing.length) return { why: 'tooMany', n: cells.length, count: litter.missing.length };
  return { pairs: cells.map((id, i) => [litter.missing[i], id]) };
};

/** IDs the person's other own animals already have, outside this litter: ID to name. */
export const otherIds = (records: readonly StrainRecord[], litter: Pick<Litter, 'young'>): Map<string, string> => {
  const mine = new Set(litter.young.map((r) => r.id));
  const out = new Map<string, string>();
  for (const r of records)
    if (isAnimal(r) && !isReceivedRecord(r) && !r.supersededBy && !mine.has(r.id) && r.refId?.trim())
      out.set(r.refId.trim(), r.strainName);
  return out;
};
