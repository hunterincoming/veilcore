// Sealing a new plant record: the one place it is done.
//
// Logging one plant by hand (LogFlow.tsx, Review) and dating a whole collection
// (bulk-import.ts, sealRowRecord) both seal through here, so a record made either way has
// the same fields, the same fingerprint and the same key binding. Saving the record is the
// caller's: one plant is saved on its own (records.ts createRecord), a collection in
// batches (records.ts createRecords).
// SPDX-License-Identifier: Apache-2.0

import { fingerprintRecord, newNonce } from './commitment';
import { newRecordId, type NewRecordInput, type ParentRef } from './records';
import { ensureKeys, forgetKeys } from './record-keys';
import { bindingForSecret } from './key-binding';
import { PLANT_VARIETY_PROFILE } from './envelope';

/** What the holder wrote, already tidied by the caller (trimmed, one line where it should be). */
export type SealInput = {
  readonly strainName: string;
  readonly bredBy: string;
  readonly dateCreated: string;
  readonly notes: string;
  readonly parents: ParentRef[];
  readonly breedingMethod: string;
  readonly photoFingerprints: string[];
  readonly refId: string;
  /** Empty means none: it is left off the record. */
  readonly taxon: string;
};

/** A sealed record, ready for createRecord / createRecords. */
export type SealedRecord = NewRecordInput & {
  readonly id: string;
  readonly nonce: string;
  readonly keyBinding: string;
  readonly recordFingerprint: string;
};

/**
 * Seal a new record. The record's key is made first, so the record names it (keyBinding,
 * key-binding.ts) and the fingerprint covers that: nobody can later pair this record with
 * another key. The nonce is committed with the record and stored on it: without it nobody
 * could recompute the fingerprint, so the record would be unverifiable by anyone. If
 * sealing fails, the key made for it is forgotten: nothing was sealed under it.
 */
export const sealRecord = async (input: SealInput, now = Date.now()): Promise<SealedRecord> => {
  const id = newRecordId();
  try {
    const { keyBinding } = bindingForSecret(ensureKeys(id, now).recordSecret);
    const fields = {
      nonce: newNonce(),
      keyBinding,
      strainName: input.strainName,
      bredBy: input.bredBy,
      dateCreated: input.dateCreated,
      notes: input.notes,
      loggedAt: now,
      parents: input.parents,
      breedingMethod: input.breedingMethod,
      photoFingerprints: input.photoFingerprints,
      refId: input.refId,
      profile: PLANT_VARIETY_PROFILE,
      taxon: input.taxon || undefined,
    };
    const recordFingerprint = await fingerprintRecord(fields);
    return { ...fields, id, recordFingerprint };
  } catch (e) {
    forgetKeys(id);
    throw e;
  }
};
