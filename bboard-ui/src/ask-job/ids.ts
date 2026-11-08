// "Add IDs" (components/ask/AddIds.tsx): the young of one dam born the same day, one box each,
// and what each box will save. A correction is permanent, so which young an ID goes on never
// depends on how a paste lines up (verification V5, W1, X1): every young has its own box, labelled
// with its name, birth order and sex, and the person types or scans into it. A paste is only a
// shortcut that fills the box it lands in and the boxes below, one line each, and only when it is
// plainly one column: anything else is refused, and it never runs past a young that has an ID.
// Before Save, each young is shown with the ID it will get.
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
  /** Every young of the litter, in birth (name) order, with an ID or without. */
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

/** Characters a copy can carry that show nothing: zero-width, joiners, direction marks, soft hyphen. */
const INVISIBLE = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\uFEFF]/;

const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

/** The ID a young has: saved on its record, or saved from this box just now (a retry after a stop). */
export const savedIdOf = (r: StrainRecord, savedHere: ReadonlyMap<string, string>): string | undefined =>
  r.refId?.trim() || savedHere.get(r.id);

/** IDs the person's other own animals already have: ID to name. The litter's young, and the
 * records that replaced them (their corrections, saved from this box), are not others (S1). */
export const otherIds = (records: readonly StrainRecord[], litter: Pick<Litter, 'young'>): Map<string, string> => {
  const mine = new Set(litter.young.map((r) => r.id));
  const out = new Map<string, string>();
  for (const r of records) {
    if (!isAnimal(r) || isReceivedRecord(r) || r.supersededBy || !r.refId?.trim()) continue;
    if (mine.has(r.id) || (r.supersedes?.recordId && mine.has(r.supersedes.recordId))) continue;
    out.set(r.refId.trim(), r.strainName);
  }
  return out;
};

export type BoxError =
  | { readonly why: 'invisible' }
  | { readonly why: 'twice'; readonly id: string }
  | { readonly why: 'taken'; readonly id: string; readonly name: string }
  | { readonly why: 'elsewhere'; readonly id: string; readonly name: string };

/**
 * What Save would do, box by box: each young still without an ID that has something in its box,
 * with that ID (`pairs`, in birth order: what the screen shows before Save), and each box that
 * breaks a rule, with why (`errors`, by record id). Save only when there are pairs and no errors.
 */
export const checkBoxes = (
  litter: Pick<Litter, 'young'>,
  values: Readonly<Record<string, string>>,
  savedHere: ReadonlyMap<string, string> = new Map(),
  others: ReadonlyMap<string, string> = new Map(),
): { pairs: [StrainRecord, string][]; errors: Record<string, BoxError> } => {
  const open = litter.young.filter((r) => !savedIdOf(r, savedHere));
  const typed = open.map((r) => [r, (values[r.id] ?? '').trim()] as const).filter(([, v]) => v);
  const errors: Record<string, BoxError> = {};
  for (const [r, v] of typed) {
    if (INVISIBLE.test(v)) {
      errors[r.id] = { why: 'invisible' };
      continue;
    }
    const twin = typed.find(([o, w]) => o !== r && same(w, v));
    if (twin) {
      errors[r.id] = { why: 'twice', id: v };
      continue;
    }
    const sib = litter.young.find((o) => {
      const s = savedIdOf(o, savedHere);
      return s !== undefined && same(s, v);
    });
    if (sib) {
      errors[r.id] = { why: 'taken', id: v, name: sib.strainName };
      continue;
    }
    const other = [...others].find(([o]) => same(o, v));
    if (other) errors[r.id] = { why: 'elsewhere', id: v, name: other[1] };
  }
  return { pairs: typed.filter(([r]) => !errors[r.id]).map(([r, v]) => [r, v]), errors };
};

export type PasteRefusal =
  | { readonly why: 'columns' }
  | { readonly why: 'header'; readonly id: string }
  | { readonly why: 'invisible'; readonly line: number };

export type Pasted = {
  readonly values: Record<string, string>;
  /** The young whose boxes the paste filled, in order. */
  readonly filled: readonly string[];
  /** It reached a young that has an ID and stopped there: that young, and the lines not used. */
  readonly stopped?: { readonly name: string; readonly left: number };
  /** More lines than boxes below: how many weren't used. */
  readonly over?: number;
};

/** Words a column's heading is made of, in the five languages. */
const HEADINGS = new Set(
  [
    'id',
    'ids',
    'tag',
    'tags',
    'ear tag',
    'ear tags',
    'eartag',
    'tag number',
    'tag no',
    'tag #',
    'microchip',
    'chip',
    'chip number',
    'number',
    'no',
    '#',
    'name',
    'animal id',
    'individual id',
    'identification',
    'ohrmarke',
    'ohrmarken',
    'kennnummer',
    'kennnummern',
    'nummer',
    'chipnummer',
    'mikrochip',
    'transponder',
    'crotal',
    'crotales',
    'identificación',
    'identificacion',
    'número',
    'numero',
    'chip',
    'microchip',
    'boucle',
    'boucles',
    'identifiant',
    'identifiants',
    'numéro',
    'puce',
    'puce électronique',
    '番号',
    '耳標',
    'タグ',
    'マイクロチップ',
    '個体番号',
    '個体識別番号',
    'id番号',
  ].map((w) => w.toLowerCase()),
);

/** Whether a first line reads as a column's heading, not an ID. */
export const looksLikeHeading = (first: string, second: string | undefined, scheme = ''): boolean => {
  const w = first
    .trim()
    .replace(/[:：]+$/, '')
    .trim()
    .toLowerCase();
  if (!w) return false;
  if (HEADINGS.has(w) || (scheme.trim() && w === scheme.trim().toLowerCase())) return true;
  // No digit in it, when the line under it has one: a heading over a column of tags.
  return !/\d/.test(w) && !!second && /\d/.test(second);
};

/**
 * A pasted column, line by line in place (an empty line stays, as "no ID for this one"), or why
 * it isn't plainly one column: a line with a tab (after one trailing tab, a scanner's, is
 * dropped) is more than one column; a first line that reads as a heading, or a line with
 * invisible characters, is refused too. Empty lines at the very end go.
 */
export const readColumn = (text: string, scheme = ''): string[] | PasteRefusal => {
  const lines = text.split(/\r\n|\r|\n/).map((l) => (l.endsWith('\t') ? l.slice(0, -1) : l));
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.some((l) => l.includes('\t'))) return { why: 'columns' };
  const cells = lines.map((l) => l.trim());
  const bad = cells.findIndex((c) => INVISIBLE.test(c));
  if (bad !== -1) return { why: 'invisible', line: bad + 1 };
  if (cells.length && looksLikeHeading(cells[0], cells[1], scheme)) return { why: 'header', id: cells[0] };
  return cells;
};

/**
 * A paste into the box of young `startId`: one line a box, from that box down, never past a young
 * that has an ID and never into one; only a plain column (readColumn).
 */
export const pasteInto = (
  litter: Pick<Litter, 'young'>,
  startId: string,
  text: string,
  values: Readonly<Record<string, string>>,
  savedHere: ReadonlyMap<string, string> = new Map(),
  scheme = '',
): Pasted | PasteRefusal => {
  const cells = readColumn(text, scheme);
  if (!Array.isArray(cells)) return cells;
  const at = litter.young.findIndex((r) => r.id === startId);
  const next = { ...values };
  const filled: string[] = [];
  for (let k = 0; k < cells.length; k++) {
    const r = litter.young[at + k];
    if (!r) return { values: next, filled, over: cells.length - k };
    if (savedIdOf(r, savedHere))
      return { values: next, filled, stopped: { name: r.strainName, left: cells.length - k } };
    next[r.id] = cells[k];
    filled.push(r.id);
  }
  return { values: next, filled };
};
