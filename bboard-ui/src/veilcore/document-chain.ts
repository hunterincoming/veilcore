// A production chain as document records (docs/document-chain.md): a source record (a plant or
// strain record), a grow batch about it, a harvest lot about the batch, a lab report about the
// lot. Each names the one before it in its sealed `about` field (document-profile.ts). Nothing
// here is new in the record format: `about` already takes any record id.
//
// What a link is, and is not. `about` is the holder's own statement, sealed with the record so
// it can't be changed after the record's date. Neither VeilCore nor Midnight checks it against
// the record it names, and it names that record by its ID, not by its proof code. So a chain is
// only as strong as each link's own date and proof code.
//
// The chain view is worked out from the records this browser holds, and nothing else: no
// request is made. It includes records kept on this device only.
// SPDX-License-Identifier: Apache-2.0

import type { DocumentAbout } from './document-profile';
import type { DocumentKind } from './document-kind';

/** What the chain reads of a record: its id, its name, and what it says it is about. */
export type ChainRecord = {
  readonly id: string;
  readonly strainName?: string;
  readonly document?: { readonly about?: readonly DocumentAbout[] };
};

/** The records a record says it is about, by id, each once, never itself. */
export const aboutIdsOf = (r: ChainRecord): string[] => [
  ...new Set((r.document?.about ?? []).flatMap((a) => (a.recordId && a.recordId !== r.id ? [a.recordId] : []))),
];

/** A record can't be about itself: refused before it is sealed (seal-record.ts). */
export const assertNotAboutItself = (id: string, about: readonly DocumentAbout[]): void => {
  if (about.some((a) => a.recordId === id)) throw new Error('A record can’t be about itself.');
};

/** One record in a chain view: how many links away it is, and this browser's copy when it holds one. */
export type ChainStep<T extends ChainRecord> = {
  readonly id: string;
  /** Its name: this browser's copy's, or the name sealed in the `about` entry that names it. */
  readonly name: string;
  /** 1 for a record named directly, 2 for one named by that record, and so on. */
  readonly depth: number;
  /** This browser's copy, when it holds the record. */
  readonly record?: T;
};

/** The most links a chain view follows in one direction: far past any real chain, and a stop for a bad one. */
export const CHAIN_DEPTH_MAX = 32;

/**
 * What this record is about, and what those are about, and so on: nearest first. Each record
 * is listed once, so records that name each other (A about B about A) end; the record itself
 * is never listed. A named record this browser doesn't hold is listed by the name sealed with
 * the link, and the walk stops there.
 */
export const upstreamOf = <T extends ChainRecord>(record: T, records: readonly T[]): ChainStep<T>[] => {
  const byId = new Map(records.map((r) => [r.id, r]));
  const seen = new Set([record.id]);
  const out: ChainStep<T>[] = [];
  let level: T[] = [record];
  for (let depth = 1; level.length && depth <= CHAIN_DEPTH_MAX; depth++) {
    const next: T[] = [];
    for (const from of level)
      for (const a of from.document?.about ?? []) {
        if (!a.recordId || seen.has(a.recordId)) continue;
        seen.add(a.recordId);
        const held = byId.get(a.recordId);
        out.push({
          id: a.recordId,
          name: held?.strainName || a.name || a.recordId,
          depth,
          ...(held ? { record: held } : {}),
        });
        if (held) next.push(held);
      }
    level = next;
  }
  return out;
};

/** The records this browser holds that say they are about this one, and the ones about those: nearest first, each once. */
export const downstreamOf = <T extends ChainRecord>(record: T, records: readonly T[]): ChainStep<T>[] => {
  const seen = new Set([record.id]);
  const out: ChainStep<T>[] = [];
  let level = [record.id];
  for (let depth = 1; level.length && depth <= CHAIN_DEPTH_MAX; depth++) {
    const next: string[] = [];
    for (const r of records) {
      if (seen.has(r.id) || !aboutIdsOf(r).some((id) => level.includes(id))) continue;
      seen.add(r.id);
      out.push({ id: r.id, name: r.strainName || r.id, depth, record: r });
      next.push(r.id);
    }
    level = next;
  }
  return out;
};

// ---- a plain-text sheet, for a batch or lot with no file of its own -------------------------

/** What a sheet is made from: what the holder typed that is not a count or a weight. */
export type BatchSheetInput = {
  readonly kind: DocumentKind;
  /** The batch or lot ID (the record's reference). */
  readonly reference: string;
  /** The date on it, YYYY-MM-DD, or ''. */
  readonly issued: string;
  readonly site: string;
  readonly variety: string;
  readonly holder: string;
  /** The names of the records it is about, in the order picked. */
  readonly about: readonly string[];
};

const sheetLine = (v: string): string => v.normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * The sheet's text: the same bytes for the same details, on any device and in any language
 * (fixed English labels, NFC, one line each, a line feed after every line, UTF-8 when saved).
 * It holds no count and no weight: those are sealed as a field set, and a value in a field set
 * must not also be in what the record shows (SPEC 4.5).
 */
export const batchSheetText = (i: BatchSheetInput): string =>
  [
    'VeilCore batch sheet, version 1',
    'Made in the browser from what the holder typed. It holds no counts and no weights.',
    `Kind: ${i.kind}`,
    `ID: ${sheetLine(i.reference)}`,
    `Date: ${sheetLine(i.issued)}`,
    `Site: ${sheetLine(i.site)}`,
    `Variety: ${sheetLine(i.variety)}`,
    `Held by: ${sheetLine(i.holder)}`,
    ...i.about.map((a) => `About: ${sheetLine(a)}`),
    '',
  ].join('\n');

/** The sheet's file name: the kind and the ID, with only letters, digits, dots, dashes and underscores. */
export const batchSheetName = (i: Pick<BatchSheetInput, 'kind' | 'reference'>): string => {
  const id = sheetLine(i.reference)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${i.kind}${id ? `-${id}` : ''}.txt`;
};

/** The sheet as a file, to fingerprint and to download. */
export const batchSheetFile = (i: BatchSheetInput): File =>
  new File([new TextEncoder().encode(batchSheetText(i))], batchSheetName(i), { type: 'text/plain' });

/** The site label and the variety as the first lines of the record's notes, then the holder's own notes. */
export const chainNotes = (
  labels: { site: string; variety: string },
  site: string,
  variety: string,
  notes: string,
): string =>
  [
    ...(sheetLine(site) ? [`${labels.site}: ${sheetLine(site)}`] : []),
    ...(sheetLine(variety) ? [`${labels.variety}: ${sheetLine(variety)}`] : []),
    ...(notes.trim() ? [notes.trim()] : []),
  ].join('\n');
