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
  'grow-batch': '7097171519711309010fd94b067495aea1daedea497e32dce477b77a6c08f4e6',
  'harvest-lot': '0646b5804dc25df288b5711689470b0b4e38562189e69562e2d0fe47b97edf19',
};

/** The kind a document record's sealed schema id says it is; undefined for any other document. */
export const documentKindOf = (r: { readonly fieldSchema?: string } | undefined): DocumentKind | undefined =>
  DOCUMENT_KINDS.find((k) => r?.fieldSchema !== undefined && KIND_SCHEMA_ID[k] === r.fieldSchema);
