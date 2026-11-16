// What kind of link in a production chain a document record is (docs/document-chain.md): a
// grow batch or a harvest lot. Read from the record's sealed schema id (`fieldSchema`), never
// from a field of its own: the document profile's `type` list is fixed (SPEC 11.11), and these
// records are sealed with type `other`. So the label can't be typed by the holder or changed
// in a link: it is the published form the numbers were sealed under.
//
// The ids are written out here so a page can read the kind without hashing anything; a test
// holds each equal to the id worked out from the published schema file (document-chain.test.ts).
// SPDX-License-Identifier: Apache-2.0

export const DOCUMENT_KINDS = ['grow-batch', 'harvest-lot'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** The published form each kind's numbers are sealed under. */
export const KIND_SCHEMA: Readonly<Record<DocumentKind, string>> = {
  'grow-batch': 'veilcore/schema/grow-batch/v1',
  'harvest-lot': 'veilcore/schema/harvest-lot/v1',
};

/** The schema id (SPEC 4.5), 64 lowercase hex, of each kind's form: what a record seals as `fieldSchema`. */
export const KIND_SCHEMA_ID: Readonly<Record<DocumentKind, string>> = {
  'grow-batch': 'b7457db62d31e23249459250ea7e1f1f956867abfa02e8337f46f3316cf2293f',
  'harvest-lot': 'c2bf134ea1761c529f304b390bdc40d1ae25906c990ad0456f93b26bb7b47d62',
};

/** The kind a document record's sealed schema id says it is; undefined for any other document. */
export const documentKindOf = (r: { readonly fieldSchema?: string } | undefined): DocumentKind | undefined =>
  DOCUMENT_KINDS.find((k) => r?.fieldSchema !== undefined && KIND_SCHEMA_ID[k] === r.fieldSchema);

/** What a holder would seal next in a production chain, from a record's own page. */
export type ChainNext = DocumentKind | 'report';

/**
 * The next step after a record (docs/document-chain.md): a grow batch from a plant or a strain,
 * a harvest lot from a grow batch, a lab report from a harvest lot. Nothing for any other record.
 * `source` is whether the record is one a grow batch can start from: a plant or a strain, never
 * an animal, a document or a record that dates a lab report (the caller knows which).
 */
export const chainNextOf = (
  r: { readonly fieldSchema?: string } | undefined,
  source: boolean,
): ChainNext | undefined => {
  if (source) return 'grow-batch';
  const kind = documentKindOf(r);
  return kind === 'grow-batch' ? 'harvest-lot' : kind === 'harvest-lot' ? 'report' : undefined;
};

/** Where "next in its chain" goes: the document form, with its kind and what it is about already set. */
export const chainNextHref = (next: ChainNext, aboutId: string): string =>
  `/documents/new?${next === 'report' ? '' : `kind=${next}&`}about=${encodeURIComponent(aboutId)}`;

/** The kind a link to the document form asks for, or none: only the two chain kinds are accepted. */
export const kindFromQuery = (v: string | null): DocumentKind | undefined => DOCUMENT_KINDS.find((k) => k === v);
