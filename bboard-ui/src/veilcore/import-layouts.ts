// Remembered column layouts for the spreadsheet import (/records/import): "seal today's sheet".
//
// A tissue culture lab or a registry clerk exports the same file every day, with the same
// columns. Picking which column is which every time is the cost that stops them, so once a file
// has been sealed, its layout (the row that names the columns, and which column is which) is
// remembered in this browser. The next file with the same column names opens on the check
// screen, already filled in: the row count and one button.
//
// This is how lab software does it: an import template is saved after the first mapping and
// offered again when a file arrives with the same set of column headers (CDD Vault's mapping
// templates; Clarity LIMS's CSV parser and AssayNet's import templates map by header name).
// So columns are remembered by name, not by position: a file whose columns come in another
// order still matches, and each field finds its column again by name.
//
// Kept in this browser's local storage only, never sent anywhere, and never part of a record.
// What is kept: the column names, the row they are on, which column fills which field, and the
// "bred by" and animal ID scheme and species typed on that screen. Nothing from the rows and
// nothing from the file's name: a layout is shown by its column names. A file whose "column
// names" look like a row of data (a date, a number, a code like V-001) is never remembered
// (canRemember): those would be record content, and would never match the next file anyway.
// Names like "Day 14", "Well 96" or "P10" are column names, in any language. Each layout can be forgotten on the import page, or all of
// them with the site's data.
// SPDX-License-Identifier: Apache-2.0

import {
  ANIMAL_FIELDS,
  FIELDS,
  PASSPORT_FIELDS,
  emptyAnimalMapping,
  emptyMapping,
  withHeaderRow,
  type AnimalFieldKey,
  type DateOrder,
  type FieldKey,
  type Mapping,
  type Sheet,
} from './bulk-import';

export const LAYOUTS_KEY = 'veilcore.import-layouts.v1';
/** The most layouts kept; the one used longest ago goes first. */
export const MAX_LAYOUTS = 20;

const ALL_FIELDS: readonly FieldKey[] = [...FIELDS, ...PASSPORT_FIELDS];

/** A mapping with each column known by its name (headerKeys), not its position. */
export type StoredMapping = {
  readonly columns: Partial<Record<FieldKey, string>>;
  readonly animal?: {
    readonly columns: Partial<Record<AnimalFieldKey, string>>;
    readonly idScheme: string;
    readonly species: string;
  };
  readonly bredByDefault: string;
  readonly dateOrder: DateOrder;
};

export type SavedLayout = {
  readonly version: 1;
  /** The file's column names, as one value (signatureOf): what a new file is matched by. */
  readonly id: string;
  /** The column names as written (trimmed): what the person sees it called. */
  readonly columns: readonly string[];
  /** The row the column names were on. */
  readonly headerLine: number;
  readonly mapping: StoredMapping;
  readonly savedAt: number;
  readonly usedAt: number;
};

const norm = (h: string): string => h.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

/** Each column's name, made comparable; a name used twice is told apart by how often it came before. */
export const headerKeys = (headers: readonly string[]): string[] => {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const k = norm(h);
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    return n === 0 ? k : `${k}#${n + 1}`;
  });
};

/** The set of column names, in any order: two files with the same columns have the same signature. */
export const signatureOf = (headers: readonly string[]): string => [...headerKeys(headers)].sort().join('\u001f');

/** toSheet's name for a column with no name in the header row ("Column C"). */
const UNNAMED = /^Column [A-Z]{1,3}$/;

/**
 * Month names and their short forms in English, German, Spanish and French (Japanese dates are
 * written with 年, 月 and 日, below). Only ever matched as a whole word next to a number, so a
 * column called "March" or "Mai" alone is still a column name.
 */
const MONTHS = [
  // English
  'january february march april may june july august september october november december',
  'jan feb mar apr jun jul aug sep sept oct nov dec',
  // German
  'januar jänner februar märz mär mrz mai juni juli oktober okt dezember dez',
  // Spanish
  'enero ene febrero marzo abril abr mayo junio julio agosto ago septiembre setiembre octubre noviembre diciembre dic',
  // French
  'janvier janv février fevrier févr fevr mars avril avr juin juillet juil août aout septembre octobre novembre',
  'décembre decembre déc',
]
  .join(' ')
  .split(' ')
  .join('|');
/** Between a day, a month and a year: spaces, a full stop, a comma, a slash or a dash. */
const GAP = '[\\s.,/-]*';
const WRITTEN_DATE = [
  // 12 Mar 2024, 12. März 2024, 12 de marzo de 2024, 1er mars, 12-Mar-24, 12th March
  new RegExp(`(?<![\\p{L}\\d])\\d{1,2}(?:st|nd|rd|th|er)?${GAP}(?:de\\s+)?(?:${MONTHS})(?!\\p{L})`, 'iu'),
  // March 12, 2024, Mar 12 2024, Nov 2024, Nov 24, März 2024
  new RegExp(`(?<!\\p{L})(?:${MONTHS})${GAP}(?:de\\s+)?\\d{1,4}(?!\\d)`, 'iu'),
  // 2024年3月12日, 令和6年3月, 3月12日 (a year or a month alone, such as 2024年 or 3月, is a column name)
  /\d{1,4}\s*年\s*\d{1,2}\s*月|\d{1,2}\s*月\s*\d{1,2}\s*日/u,
];

/**
 * A header cell that reads like a value from a row: a date (in numbers, or written out with a
 * month's name in English, German, Spanish or French, or in Japanese), a number, or a code like
 * V-001, AB_12, V001 or #4471 (a separator, or three digits or more). A word, a space and a number
 * ("Day 14", "Well 96", "Rack 10") and a short name like "P10" or "F1" are column names.
 */
export const looksLikeData = (cell: string): boolean => {
  const v = cell.normalize('NFKC').trim();
  return (
    v.length > 60 ||
    /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(v) ||
    /^[-+]?[\d\s.,:%/]*\d[\d\s.,:%/]*$/.test(v) ||
    /^[A-Za-z]{0,4}([-_#]\d{2,}|\d{3,})[A-Za-z]?$/.test(v) ||
    WRITTEN_DATE.some((re) => re.test(v))
  );
};

/** Whether a mapping fills any field at all. */
const fillsAField = (m: Mapping): boolean =>
  Object.values(m.columns).some((c) => c !== null && c !== undefined) ||
  (!!m.animal && Object.values(m.animal.columns).some((c) => c !== null));

/**
 * Whether these column names may be remembered with this mapping: none of them reads like a value
 * from a row, and the mapping fills at least one field (the person picked which column is which,
 * in whatever language the sheet is in). A file with no header row is not remembered.
 */
export const canRemember = (headers: readonly string[], mapping: Mapping): boolean => {
  const named = headers.filter((h) => !UNNAMED.test(h.trim()));
  return named.length > 0 && !named.some(looksLikeData) && fillsAField(mapping);
};

/** How a layout is shown: its first column names. */
export const layoutLabel = (columns: readonly string[], max = 4): string => {
  const named = columns.filter((c) => c && !UNNAMED.test(c));
  return named.slice(0, max).join(' · ') + (named.length > max ? ' …' : '');
};

const toStored = (headers: readonly string[], m: Mapping): StoredMapping => {
  const keys = headerKeys(headers);
  const name = (c: number | null | undefined) => (c === null || c === undefined ? undefined : keys[c]);
  const columns: Partial<Record<FieldKey, string>> = {};
  for (const f of ALL_FIELDS) {
    const k = name(m.columns[f]);
    if (k !== undefined) columns[f] = k;
  }
  let animal: StoredMapping['animal'];
  if (m.animal) {
    const ac: Partial<Record<AnimalFieldKey, string>> = {};
    for (const f of ANIMAL_FIELDS) {
      const k = name(m.animal.columns[f]);
      if (k !== undefined) ac[f] = k;
    }
    animal = { columns: ac, idScheme: m.animal.idScheme, species: m.animal.species };
  }
  return { columns, ...(animal ? { animal } : {}), bredByDefault: m.bredByDefault, dateOrder: m.dateOrder };
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** A kept mapping on a file's columns: each field finds its column by name; anything else is left out. */
export const mappingFor = (headers: readonly string[], s: StoredMapping): Mapping => {
  const keys = headerKeys(headers);
  const at = (k: unknown): number | null => {
    if (typeof k !== 'string') return null;
    const i = keys.indexOf(k);
    return i >= 0 ? i : null;
  };
  const base = emptyMapping();
  const columns = { ...base.columns };
  const sc = (s.columns ?? {}) as Record<string, unknown>;
  for (const f of ALL_FIELDS) columns[f] = at(sc[f]);
  const dateOrder: DateOrder = s.dateOrder === 'mdy' || s.dateOrder === 'dmy' ? s.dateOrder : 'auto';
  const out: Mapping = { ...base, columns, bredByDefault: str(s.bredByDefault), dateOrder };
  if (!s.animal || typeof s.animal !== 'object') return out;
  const a = emptyAnimalMapping();
  const acols = { ...a.columns };
  const ac = (s.animal.columns ?? {}) as Record<string, unknown>;
  for (const f of ANIMAL_FIELDS) acols[f] = at(ac[f]);
  return { ...out, animal: { columns: acols, idScheme: str(s.animal.idScheme), species: str(s.animal.species) } };
};

const valid = (v: unknown): v is SavedLayout => {
  if (!v || typeof v !== 'object') return false;
  const l = v as Partial<SavedLayout>;
  return (
    l.version === 1 &&
    typeof l.id === 'string' &&
    Array.isArray(l.columns) &&
    l.columns.every((c) => typeof c === 'string') &&
    typeof l.headerLine === 'number' &&
    typeof l.savedAt === 'number' &&
    typeof l.usedAt === 'number' &&
    !!l.mapping &&
    typeof l.mapping === 'object'
  );
};

/** The layouts kept in this browser, the one used last first. Nothing kept (or unreadable): none. */
export const loadLayouts = (): SavedLayout[] => {
  try {
    const v = JSON.parse(localStorage.getItem(LAYOUTS_KEY) ?? '[]') as unknown;
    // Only what a layout is made of: an older entry's other fields (a name from the file) are dropped.
    return Array.isArray(v)
      ? v
          .filter(valid)
          .map(({ version, id, columns, headerLine, mapping, savedAt, usedAt }) => ({
            version,
            id,
            columns,
            headerLine,
            mapping,
            savedAt,
            usedAt,
          }))
          .sort((a, b) => b.usedAt - a.usedAt)
      : [];
  } catch {
    return [];
  }
};

const store = (layouts: SavedLayout[]): boolean => {
  try {
    if (layouts.length === 0) localStorage.removeItem(LAYOUTS_KEY);
    else localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts));
    return true;
  } catch {
    return false;
  }
};

/**
 * Remember this file's layout in this browser. A file with the same columns replaces the one kept
 * before. False when its column names can't be remembered (canRemember), or this browser won't
 * keep it.
 */
export const rememberLayout = (
  sheet: Pick<Sheet, 'headers' | 'headerLine'>,
  mapping: Mapping,
  now = Date.now(),
): boolean => {
  if (!canRemember(sheet.headers, mapping)) return false;
  const id = signatureOf(sheet.headers);
  const all = loadLayouts();
  const before = all.find((l) => l.id === id);
  const layout: SavedLayout = {
    version: 1,
    id,
    columns: sheet.headers.map((h) => h.replace(/\s+/g, ' ').trim()),
    headerLine: sheet.headerLine,
    mapping: toStored(sheet.headers, mapping),
    savedAt: before?.savedAt ?? now,
    usedAt: now,
  };
  return store([layout, ...all.filter((l) => l.id !== id)].slice(0, MAX_LAYOUTS));
};

/**
 * What sealing did with Remember: kept the columns, wasn't asked to (unticked, or the names read
 * like a row), or couldn't keep them because this browser won't store anything (a private window,
 * site data blocked, storage full). The page says so in that last case instead of failing quietly.
 */
export type RememberOutcome = 'kept' | 'not-asked' | 'not-kept';

export const rememberOnSeal = (
  sheet: Pick<Sheet, 'headers' | 'headerLine'>,
  mapping: Mapping,
  remember: boolean,
  now = Date.now(),
): RememberOutcome => {
  if (!remember || !canRemember(sheet.headers, mapping)) return 'not-asked';
  return rememberLayout(sheet, mapping, now) ? 'kept' : 'not-kept';
};

/**
 * The Remember box after something happens on the import. A new file starts it ticked. Forget and
 * an untick turn it off, and it stays off: picking another header row or changing a column is not
 * the person changing their mind, so it never ticks itself again after they pressed Forget.
 */
export type RememberEvent = 'new-file' | 'tick' | 'untick' | 'forget' | 'other-header-row' | 'column-changed';

export const rememberAfter = (on: boolean, event: RememberEvent): boolean =>
  event === 'new-file' || event === 'tick' ? true : event === 'untick' || event === 'forget' ? false : on;

export type LayoutMatch = { layout: SavedLayout; sheet: Sheet; mapping: Mapping };

/**
 * A kept layout for this file: the same column names, on the row they were on last time (or the
 * row found by itself). The sheet comes back read from that row, with the mapping on it.
 */
export const matchLayout = (sheet: Sheet, layouts: readonly SavedLayout[] = loadLayouts()): LayoutMatch | undefined => {
  for (const layout of layouts) {
    const candidates: Sheet[] = [sheet];
    if (layout.headerLine !== sheet.headerLine && sheet.raw.some((r) => r.line === layout.headerLine)) {
      candidates.unshift(withHeaderRow(sheet, layout.headerLine));
    }
    for (const s of candidates) {
      if (s.headers.length > 0 && signatureOf(s.headers) === layout.id) {
        return { layout, sheet: s, mapping: mappingFor(s.headers, layout.mapping) };
      }
    }
  }
  return undefined;
};

/** Forget one layout. True when nothing of it is kept now. */
export const forgetLayout = (id: string): boolean => store(loadLayouts().filter((l) => l.id !== id));

/** Forget every layout kept in this browser. */
export const forgetAllLayouts = (): boolean => store([]);
