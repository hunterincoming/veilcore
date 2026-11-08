// IDs for young, one box each (components/ask/IdBoxes.tsx): in Add IDs (AddIds.tsx), for young
// saved without them, and on a litter's result screen before Approve (JobPage.tsx). A correction
// is permanent, so which young an ID goes on never depends on how a paste lines up (verification
// V5, W1, X1, X4, X5): every young has its own box, labelled with its birth order, name and sex,
// and the person types or scans into it. A paste is only a shortcut that fills the box it lands in
// and the boxes below, one line each, and only when it plainly lines up: one column, no heading,
// no more lines than boxes, never past a young that has an ID. Each young is shown with the ID
// it will get before Save or Approve.
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

/** A record as it is now: followed through its corrections, made here or in another tab (X2). */
export const latestOf = (records: readonly StrainRecord[], r: StrainRecord): StrainRecord => {
  let cur = records.find((x) => x.id === r.id) ?? r;
  for (let i = 0; i < 20 && cur.supersededBy; i++) {
    const next = records.find((x) => x.id === cur.supersededBy);
    if (!next) break;
    cur = next;
  }
  return cur;
};

/** One box: a young, by a key that stays put, and its ID if it has one (then read-only). */
export type IdRow = {
  readonly key: string;
  readonly name: string;
  readonly sex?: string;
  readonly saved?: string;
  /** The record to correct (Add IDs): the young's newest record. */
  readonly record?: StrainRecord;
};

/** A litter's boxes from the records as they are now, never as they were when the box opened. */
export const rowsOfLitter = (litter: Pick<Litter, 'young'>, records: readonly StrainRecord[]): IdRow[] =>
  litter.young.map((y) => {
    const now = latestOf(records, y);
    return {
      key: y.id,
      name: now.strainName,
      sex: now.animal?.sex,
      ...(hasId(now) ? { saved: now.refId!.trim() } : {}),
      record: now,
    };
  });

/** IDs the person's other own animals have: ID to name. A young of these rows, in any of its
 * versions, is not "another animal" (its saved ID counts as `taken` instead). */
export const otherIds = (records: readonly StrainRecord[], rows: readonly IdRow[]): Map<string, string> => {
  const mine = new Set(rows.map((r) => r.key));
  const isMine = (r: StrainRecord): boolean => {
    let cur: StrainRecord | undefined = r;
    for (let i = 0; i < 20 && cur; i++) {
      if (mine.has(cur.id)) return true;
      const back: string | undefined = cur.supersedes?.recordId;
      cur = back ? records.find((x) => x.id === back) : undefined;
    }
    return false;
  };
  const out = new Map<string, string>();
  for (const r of records) {
    if (!isAnimal(r) || isReceivedRecord(r) || r.supersededBy || !r.refId?.trim() || isMine(r)) continue;
    out.set(r.refId.trim(), r.strainName);
  }
  return out;
};

/** Characters that show nothing or split a line unseen: controls, zero-width, joiners, direction marks, soft hyphen, line separators. */
const INVISIBLE =
  // eslint-disable-next-line no-control-regex -- control characters are exactly what it looks for
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u00AD\u180E\u200B-\u200F\u2028-\u202E\u2060-\u2064\u206A-\u206F\uFEFF]/;
/** A list typed on one line ("A1, A2", "A1; A2", or with Japanese commas 「、」「，」): several IDs where one box takes one. */
const LIST = /[,;、，；]/;

const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

export type BoxError =
  | { readonly why: 'invisible' }
  | { readonly why: 'comma' }
  | { readonly why: 'twice'; readonly id: string }
  | { readonly why: 'taken'; readonly id: string; readonly name: string }
  | { readonly why: 'elsewhere'; readonly id: string; readonly name: string };

/**
 * What Save (or Use) would do, box by box: each young still without an ID that has something in
 * its box, with that ID (`pairs`, in birth order: what the screen shows first), and each box that
 * breaks a rule, with why (`errors`, by key). Only when there are pairs and no errors.
 */
export const checkBoxes = (
  rows: readonly IdRow[],
  values: Readonly<Record<string, string>>,
  others: ReadonlyMap<string, string> = new Map(),
): { pairs: [IdRow, string][]; errors: Record<string, BoxError> } => {
  const typed = rows
    .filter((r) => !r.saved)
    .map((r) => [r, (values[r.key] ?? '').trim()] as const)
    .filter(([, v]) => v);
  const errors: Record<string, BoxError> = {};
  for (const [r, v] of typed) {
    if (INVISIBLE.test(v)) errors[r.key] = { why: 'invisible' };
    else if (LIST.test(v)) errors[r.key] = { why: 'comma' };
    else if (typed.some(([o, w]) => o !== r && same(w, v))) errors[r.key] = { why: 'twice', id: v };
    else {
      const sib = rows.find((o) => o.saved && same(o.saved, v));
      const other = [...others].find(([o]) => same(o, v));
      if (sib) errors[r.key] = { why: 'taken', id: v, name: sib.name };
      else if (other) errors[r.key] = { why: 'elsewhere', id: v, name: other[1] };
    }
  }
  return { pairs: typed.filter(([r]) => !errors[r.key]).map(([r, v]) => [r, v]), errors };
};

export type PasteRefusal =
  | { readonly why: 'columns' }
  | { readonly why: 'header'; readonly id: string }
  | { readonly why: 'invisible'; readonly line: number }
  | { readonly why: 'comma'; readonly line: number }
  | { readonly why: 'over'; readonly n: number; readonly count: number }
  | { readonly why: 'startsAt'; readonly id: string; readonly name: string }
  /** Several IDs put in one box at once, with spaces, that can't be told apart from one ID. */
  | { readonly why: 'spaces' }
  /** A scan into a box that already had an ID: taken back. */
  | { readonly why: 'doubleScan' };

export type Pasted = {
  readonly values: Record<string, string>;
  /** The young whose boxes the paste filled, in order. */
  readonly filled: readonly string[];
  /** It reached a young that has an ID and stopped there: that young, and the lines not used. */
  readonly stopped?: { readonly name: string; readonly left: number };
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

const DIGIT = /\p{Nd}/u;
const LETTER = /\p{L}/u;
/** A line's shape: each letter a, each digit 9, the rest as is ("UK123-04" is "aa999-99"). */
const shapeOf = (s: string) => s.replace(/\p{L}/gu, 'a').replace(/\p{Nd}/gu, '9');

/**
 * Whether a first line reads as a column's heading, not an ID: a heading word or the scheme; no
 * digit over a line with one; or, over lines that all share one shape, a line with letters in it
 * that doesn't share it ("Litter 3 tags" over 985112000000001…), or that has a space where the
 * line under it has none ("Tag 2026" over A1).
 */
export const looksLikeHeading = (first: string, below: readonly string[] = [], scheme = ''): boolean => {
  const w = first
    .trim()
    .replace(/[:：]+$/, '')
    .trim()
    .toLowerCase();
  if (!w) return false;
  if (HEADINGS.has(w) || (scheme.trim() && w === scheme.trim().toLowerCase())) return true;
  const rest = below.map((l) => l.trim()).filter(Boolean);
  if (!rest.length) return false;
  if (!DIGIT.test(w) && DIGIT.test(rest[0])) return true;
  if (!LETTER.test(w)) return false;
  const shapes = new Set(rest.map(shapeOf));
  if (rest.length >= 2 && shapes.size === 1 && !shapes.has(shapeOf(first.trim()))) return true;
  // Over a single ID: a word of three letters or more in a line of another shape ("Tag2026" over A1).
  if (rest.length === 1 && shapeOf(first.trim()) !== shapeOf(rest[0]) && /\p{L}{3,}/u.test(first)) return true;
  return /\s/.test(first.trim()) && !rest.some((l) => /\s/.test(l));
};

/**
 * A pasted column, line by line in place (an empty line stays, as "nothing for this box"), or why
 * it isn't plainly one column of IDs: a line with a tab (after one trailing tab, a scanner's, is
 * dropped) is more than one column; a line with a comma or semicolon is a list; a first line that
 * reads as a heading, or a line with invisible characters, is refused too. Empty lines at the
 * very end go.
 */
export const readColumn = (text: string, scheme = ''): string[] | PasteRefusal => {
  const lines = text.split(/\r\n|\r|\n/).map((l) => (l.endsWith('\t') ? l.slice(0, -1) : l));
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.some((l) => l.includes('\t'))) return { why: 'columns' };
  const cells = lines.map((l) => l.trim());
  const bad = cells.findIndex((c) => INVISIBLE.test(c));
  if (bad !== -1) return { why: 'invisible', line: bad + 1 };
  const list = cells.findIndex((c) => LIST.test(c));
  if (list !== -1) return { why: 'comma', line: list + 1 };
  if (cells.length && looksLikeHeading(cells[0], cells.slice(1), scheme)) return { why: 'header', id: cells[0] };
  return cells;
};

/**
 * A paste into the box of `startKey`: one line a box, from that box down, only a plain column
 * (readColumn). Refused, with nothing filled, when it has more lines than boxes from there to the
 * end (it doesn't line up), or when its first line is an ID a young here already has (the column
 * starts higher up). It never goes into or past a young that has an ID: it stops there and says
 * so. An empty line never clears a box: what was typed there stays.
 */
export const pasteInto = (
  rows: readonly IdRow[],
  startKey: string,
  text: string,
  values: Readonly<Record<string, string>>,
  scheme = '',
): Pasted | PasteRefusal => {
  const cells = readColumn(text, scheme);
  if (!Array.isArray(cells)) return cells;
  const at = Math.max(
    0,
    rows.findIndex((r) => r.key === startKey),
  );
  const room = rows.length - at;
  if (cells.length > room) return { why: 'over', n: cells.length, count: room };
  const startsAt = cells[0] ? rows.find((r) => r.saved && same(r.saved, cells[0])) : undefined;
  if (startsAt) return { why: 'startsAt', id: cells[0], name: startsAt.name };
  const next = { ...values };
  const filled: string[] = [];
  for (let k = 0; k < cells.length; k++) {
    const r = rows[at + k];
    if (r.saved) return { values: next, filled, stopped: { name: r.name, left: cells.length - k } };
    if (cells[k]) {
      next[r.key] = cells[k];
      filled.push(r.key);
    }
  }
  return { values: next, filled };
};

/**
 * Text put into an empty box all at once without a paste event (a phone's clipboard chip,
 * autofill, dictation), with spaces in it. It is never split across young (verification round 6,
 * S1): one ID is often printed in groups ("985 112 345 678 901", "UK 123456 700001"), and a
 * real paste keeps it in one box too. Kept whole (undefined) when it reads as one ID in groups:
 * a word with no digit (a country or herd mark), or digit groups only. Refused ('unclear') when
 * every word mixes letters and digits ("M1 M2 M3"): that is likely several IDs, and which young
 * each is for can't be told.
 */
export const splitInsert = (text: string): 'unclear' | undefined => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return undefined;
  return words.every((w) => DIGIT.test(w) && LETTER.test(w)) ? 'unclear' : undefined;
};
