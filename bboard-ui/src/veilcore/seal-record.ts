// Sealing a new record, plant or animal: the one place it is done.
//
// Logging one plant by hand (LogFlow.tsx, Review) and dating a whole collection
// (bulk-import.ts, sealRowRecord) both seal through here, so a record made either way has
// the same fields, the same fingerprint and the same key binding. Saving the record is the
// caller's: one plant is saved on its own (records.ts createRecord), a collection in
// batches (records.ts createRecords).
// SPDX-License-Identifier: Apache-2.0

import { newNameSalt } from './verify-link';
import { fingerprintRecord, newNonce } from './commitment';
import { newRecordId, type NewRecordInput, type ParentRef } from './records';
import { ensureKeys, forgetKeys } from './record-keys';
import { bindingForSecret } from './key-binding';
import { PLANT_VARIETY_PROFILE } from './envelope';
import { ANIMAL_PROFILE, type AnimalDetails } from './animal-profile';
import { STRAIN_PROFILE, type StrainDetails } from './strain-profile';
import { DOCUMENT_PROFILE, type DocumentDetails } from './document-profile';
import type { HeldFieldSet } from './field-set';

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
export const sealRecord = (input: SealInput, now = Date.now()): Promise<SealedRecord> =>
  sealWithKey(now, (keyBinding) => ({
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
  }));

/**
 * What the holder wrote about one animal, already tidied by the caller (trimmed, one line).
 * Sealed under the animal profile (animal-profile.ts): the same fingerprint rules, the same
 * key binding and nonce as a plant record, and the profile's own fields.
 */
export type AnimalSealInput = {
  readonly name: string;
  readonly species: string;
  readonly breed: string;
  readonly individualId: string;
  readonly idScheme: string;
  readonly sex: AnimalDetails['sex'];
  /** '' when not stated. */
  readonly dateOfBirth: string;
  /** The sire first, then the dam, each only if given. */
  readonly parents: ParentRef[];
  readonly breeder: string;
  readonly herd: string;
  readonly notes: string;
  readonly photoFingerprints: string[];
};

export const sealAnimalRecord = (input: AnimalSealInput, now = Date.now()): Promise<SealedRecord> =>
  sealWithKey(now, (keyBinding) => ({
    nonce: newNonce(),
    keyBinding,
    profile: ANIMAL_PROFILE,
    strainName: input.name,
    bredBy: input.breeder,
    dateCreated: input.dateOfBirth,
    notes: input.notes,
    loggedAt: now,
    parents: input.parents.map((p) => ({ ...p, individualId: p.individualId ?? '' })),
    photoFingerprints: input.photoFingerprints,
    refId: input.individualId,
    taxon: input.species,
    animal: { breed: input.breed, idScheme: input.idScheme, sex: input.sex, herd: input.herd },
  }));

/**
 * What the holder wrote about one strain or line, already tidied by the caller. Sealed under
 * the strain profile (strain-profile.ts), with the same fingerprint rules as any record.
 */
export type StrainSealInput = {
  readonly name: string;
  readonly species: string;
  readonly group: StrainDetails['group'];
  /** The holder's own designation for it ('' when none). */
  readonly designation: string;
  readonly deposits: string[];
  /** How it was made: wild isolate, neutron irradiation, chemical mutagenesis… ('' when not stated). */
  readonly method: string;
  readonly generation: string;
  /** '' when not stated. */
  readonly madeOn: string;
  /** Parent strains, each a linked record or a name and deposit number (individualId). */
  readonly parents: ParentRef[];
  readonly maker: string;
  readonly notes: string;
  readonly photoFingerprints: string[];
};

export const sealStrainRecord = (input: StrainSealInput, now = Date.now()): Promise<SealedRecord> =>
  sealWithKey(now, (keyBinding) => ({
    nonce: newNonce(),
    keyBinding,
    profile: STRAIN_PROFILE,
    strainName: input.name,
    bredBy: input.maker,
    dateCreated: input.madeOn,
    notes: input.notes,
    loggedAt: now,
    parents: input.parents.map((p) => ({
      name: p.name,
      individualId: p.individualId ?? '',
      ...(p.recordId ? { recordId: p.recordId } : {}),
    })),
    photoFingerprints: input.photoFingerprints,
    refId: input.designation,
    taxon: input.species,
    breedingMethod: input.method,
    strain: { group: input.group, deposits: input.deposits, generation: input.generation },
  }));

/**
 * What the holder wrote about one document, already tidied by the caller, and its files'
 * fingerprints (document-profile.ts fingerprintFile). Sealed under the document profile. The
 * files themselves never reach here: only their SHA-256, name and size.
 */
export type DocumentSealInput = {
  readonly title: string;
  readonly type: DocumentDetails['type'];
  readonly issuer: string;
  readonly reference: string;
  /** The date written on the document, YYYY-MM-DD, or '' when not stated. */
  readonly issued: string;
  readonly files: DocumentDetails['files'];
  readonly about: DocumentDetails['about'];
  readonly holder: string;
  readonly notes: string;
  /** The numbers on it, sealed as a field set (field-set.ts makeFieldSet); none when absent. */
  readonly fieldSet?: { readonly held: HeldFieldSet; readonly fieldSchema: string; readonly fieldSetRoot: string };
};

export const sealDocumentRecord = (input: DocumentSealInput, now = Date.now()): Promise<SealedRecord> =>
  sealWithKey(now, (keyBinding) => ({
    nonce: newNonce(),
    keyBinding,
    profile: DOCUMENT_PROFILE,
    strainName: input.title,
    bredBy: input.holder,
    dateCreated: input.issued,
    notes: input.notes,
    loggedAt: now,
    parents: [],
    photoFingerprints: [],
    refId: input.reference,
    document: {
      type: input.type,
      issuer: input.issuer,
      files: input.files.map((f) => ({ name: f.name, sha256: f.sha256, size: f.size })),
      about: input.about.map((a) => ({ name: a.name, ...(a.recordId ? { recordId: a.recordId } : {}) })),
    },
    ...(input.fieldSet
      ? {
          fieldSchema: input.fieldSet.fieldSchema,
          fieldSetRoot: input.fieldSet.fieldSetRoot,
          fieldSet: input.fieldSet.held,
        }
      : {}),
  }));

/** Make the record's key, then seal the fields that name it; forget the key if sealing fails. */
const sealWithKey = async (
  now: number,
  fieldsFor: (keyBinding: string) => Omit<NewRecordInput, 'recordFingerprint'> & { nonce: string; keyBinding: string },
): Promise<SealedRecord> => {
  const id = newRecordId();
  try {
    const { keyBinding } = bindingForSecret(ensureKeys(id, now).recordSecret);
    const fields = fieldsFor(keyBinding);
    const recordFingerprint = await fingerprintRecord(fields);
    // The name's salt (round 6, CONTRACT.md #33): made with the record, outside its fingerprint,
    // so a batch sent again after a lost answer is the very same record.
    return { ...fields, id, recordFingerprint, ...(fields.strainName.trim() ? { nameSalt: newNameSalt() } : {}) };
  } catch (e) {
    forgetKeys(id);
    throw e;
  }
};
