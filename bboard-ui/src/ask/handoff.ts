// One reader for drafts handed to the logging screen: from Ask in this tab (router state) or from
// a link (`#draft=` after the address, as veilcore-mcp's draft_link makes them).
//
// The provenance rule (docs/ask-veilcore.md): every value a draft carries comes from what the
// person typed in the Ask box in this tab, or from their own records in this browser. Nothing a
// counterparty wrote (an invite's label, the other side's terms, a lab's notes) is ever read for
// a draft value.
//
// A link carries less than Ask does: only what kind of record, which preset and how many. Never
// a name, a parent or a record: the screen asks for those, so a link someone else made can't pick
// a record or fill a value for you. Counts are capped at the bulk-import limit and stay editable.
//
// Every draft is checked here, the way the screen it fills checks what is typed, and read once:
// the screen clears it from the address and the router state as it reads it.
// SPDX-License-Identifier: Apache-2.0

/** The most children one batch makes: the bulk import's row limit (bulk-import.ts MAX_ROWS). */
export const MAX_BATCH = 500;

export type DraftKind = 'plant' | 'animal' | 'strain';
/**
 * record    one new record
 * cross     one new record with two parents (a cross, 交配)
 * clones    N cuttings from one plant, each linked to it
 * offspring N young from a sire and a dam (or one of them), each linked to them
 */
export type DraftPreset = 'record' | 'cross' | 'clones' | 'offspring';

export const DRAFT_KINDS: readonly DraftKind[] = ['plant', 'animal', 'strain'];
export const DRAFT_PRESETS: readonly DraftPreset[] = ['record', 'cross', 'clones', 'offspring'];

/**
 * A draft from this tab: from Ask (values from the Ask box and the person's own records only), or
 * from a record's own page ("Cut clones from this": that record, picked by the person, as parent).
 */
export type AskDraft = {
  readonly v: 1;
  readonly source: 'ask' | 'record';
  readonly kind: DraftKind;
  readonly preset: DraftPreset;
  /** The name typed in the Ask box ("new plant Blue Dream"). */
  readonly name?: string;
  /** How many children (batches). */
  readonly count?: number;
  /** Parents: ids of records in this browser, matched from names typed in the Ask box. */
  readonly parents?: readonly string[];
};

/** A draft from a link: kind, preset and count only. */
export type LinkDraft = {
  readonly v: 1;
  readonly source: 'link';
  readonly kind: DraftKind;
  readonly preset: DraftPreset;
  readonly count?: number;
};

export type Handoff = AskDraft | LinkDraft;

/** The state key Ask uses with navigate('/new', { state }). */
export const HANDOFF_STATE_KEY = 'askDraft';

const NAME_MAX = 200;
const RECORD_ID = /^VEIL-[0-9A-F]{4,64}$/;

const isKind = (v: unknown): v is DraftKind => typeof v === 'string' && (DRAFT_KINDS as string[]).includes(v);
const isPreset = (v: unknown): v is DraftPreset => typeof v === 'string' && (DRAFT_PRESETS as string[]).includes(v);

/** A count as a batch takes it: a whole number from 1 to MAX_BATCH, else undefined. */
export const batchCount = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && /^\d{1,6}$/.test(v) ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return undefined;
  return Math.min(n, MAX_BATCH);
};

/** Which presets fit which kind: a plant is cut, an animal has offspring. */
export const presetFits = (kind: DraftKind, preset: DraftPreset): boolean =>
  preset === 'record' ||
  preset === 'cross' ||
  (preset === 'clones' && kind === 'plant') ||
  (preset === 'offspring' && kind === 'animal');

/** A batch preset: the review screen for N children, not the one-record form. */
export const isBatch = (p: DraftPreset): p is 'clones' | 'offspring' => p === 'clones' || p === 'offspring';

/** An Ask draft from router state, checked; undefined if it isn't one. */
export const readAskState = (state: unknown, ownRecordIds: ReadonlySet<string>): AskDraft | undefined => {
  if (!state || typeof state !== 'object') return undefined;
  const d = (state as Record<string, unknown>)[HANDOFF_STATE_KEY];
  if (!d || typeof d !== 'object') return undefined;
  const v = d as Record<string, unknown>;
  if (v.v !== 1 || (v.source !== 'ask' && v.source !== 'record') || !isKind(v.kind) || !isPreset(v.preset))
    return undefined;
  if (!presetFits(v.kind, v.preset)) return undefined;
  const name = typeof v.name === 'string' ? v.name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '';
  // Only records this browser holds: an id it doesn't know is dropped, never looked up.
  const parents = Array.isArray(v.parents)
    ? [...new Set(v.parents.filter((p): p is string => typeof p === 'string' && RECORD_ID.test(p)))]
        .filter((p) => ownRecordIds.has(p))
        .slice(0, 2)
    : [];
  const count = isBatch(v.preset) ? batchCount(v.count) : undefined;
  return {
    v: 1,
    source: v.source,
    kind: v.kind,
    preset: v.preset,
    ...(name ? { name } : {}),
    ...(count ? { count } : {}),
    ...(parents.length ? { parents } : {}),
  };
};

/**
 * A link draft from the address's fragment: `#draft=kind=plant&preset=clones&count=12` (the
 * value URL-encoded or not). Any other key is ignored; a fragment over 300 characters is not read.
 */
export const readDraftFragment = (hash: string): LinkDraft | undefined => {
  if (!hash || hash.length > 300) return undefined;
  const m = /^#draft=(.*)$/.exec(hash);
  if (!m) return undefined;
  let raw = m[1];
  try {
    if (!raw.includes('=')) raw = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  const q = new URLSearchParams(raw);
  const kind = q.get('kind') ?? 'plant';
  const preset = q.get('preset') ?? 'record';
  if (!isKind(kind) || !isPreset(preset) || !presetFits(kind, preset)) return undefined;
  const count = isBatch(preset) ? (batchCount(q.get('count')) ?? 1) : undefined;
  return { v: 1, source: 'link', kind, preset, ...(count ? { count } : {}) };
};

/** The link a draft becomes (veilcore-mcp draft_link makes the same): kind, preset, count only. */
export const draftLink = (origin: string, d: { kind: DraftKind; preset: DraftPreset; count?: number }): string => {
  const q = new URLSearchParams({ kind: d.kind, preset: d.preset });
  const count = isBatch(d.preset) ? batchCount(d.count) : undefined;
  if (count) q.set('count', String(count));
  return `${origin.replace(/\/$/, '')}/new#draft=${q.toString()}`;
};

/** Read a handoff from where the screen was opened: Ask's state first, then a link. */
export const readHandoff = (
  loc: { readonly state: unknown; readonly hash: string },
  ownRecordIds: ReadonlySet<string>,
): Handoff | undefined => readAskState(loc.state, ownRecordIds) ?? readDraftFragment(loc.hash);
