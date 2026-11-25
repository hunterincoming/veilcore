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
// "bred by" and animal ID scheme and species typed on that screen. Each layout can be forgotten
// on the import page, or all of them with the site's data.
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
  /** What the person sees it called: the file's name without its date or number. */
  readonly name: string;
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

/** "TC export 2026-11-25.csv" → "TC export": what a day's file is called without its day. */
export const layoutName = (fileName: string): string => {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, '');
  const plain = base
    .replace(/\d{4}[-_.]?\d{1,2}[-_.]?\d{1,2}/g, ' ')
    .replace(/\d{1,2}[-_.]\d{1,2}[-_.]\d{2,4}/g, ' ')
    .replace(/\(\d+\)/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[\s_.-]+/g, ' ')
    .trim();
  return (plain || base || fileName).slice(0, 60);
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
    typeof l.name === 'string' &&
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
    return Array.isArray(v) ? v.filter(valid).sort((a, b) => b.usedAt - a.usedAt) : [];
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
 * before (keeping its name). False when this browser won't keep it.
 */
export const rememberLayout = (
  sheet: Pick<Sheet, 'headers' | 'headerLine'>,
  mapping: Mapping,
  fileName: string,
  now = Date.now(),
): boolean => {
  if (sheet.headers.length === 0) return false;
  const id = signatureOf(sheet.headers);
  const all = loadLayouts();
  const before = all.find((l) => l.id === id);
  const layout: SavedLayout = {
    version: 1,
    id,
    name: before?.name ?? layoutName(fileName),
    headerLine: sheet.headerLine,
    mapping: toStored(sheet.headers, mapping),
    savedAt: before?.savedAt ?? now,
    usedAt: now,
  };
  return store([layout, ...all.filter((l) => l.id !== id)].slice(0, MAX_LAYOUTS));
};

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
