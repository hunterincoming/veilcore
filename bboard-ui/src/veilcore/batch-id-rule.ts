// The one form a batch id from VeilCore's registry comes in: "B-", the UTC day it was sealed
// (YYYYMMDD), "-", then four uppercase hex characters, as in B-20261126-35C4. That is how the
// registry makes every id (veilcore-api lineage/batches.mjs newBatchId), and every batch it has
// sealed so far has one.
//
// Why only that (review 2 of PR #241, polish 1): a batch id is free text to the code that reads
// it, so a broken registry, or an edited backup file, could put a sentence where the id goes,
// and the evidence pages would print it, inside a sworn declaration too ("batch b1 5. I also
// declare..."), or hide a direction mark (U+202E) that shows the text after it reversed. An id
// in any other form is junk: it is kept as "" (not given) and never printed.
// SPDX-License-Identifier: Apache-2.0

/** A registry batch id: B-YYYYMMDD-XXXX, X an uppercase hex character. */
export const BATCH_ID = /^B-[0-9]{8}-[0-9A-F]{4}$/;

export const isBatchId = (v: unknown): v is string => typeof v === 'string' && BATCH_ID.test(v);

/** The batch id when it is in the registry's form, else "" (not given). */
export const batchIdOrNone = (v: unknown): string => (isBatchId(v) ? v : '');

/** The batch id for a page: itself when in the registry's form, else `notGiven`. */
export const batchIdWords = (v: unknown, notGiven = '[not given]'): string => (isBatchId(v) ? v : notGiven);
