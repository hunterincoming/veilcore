// What a claim about one number on a sealed certificate is made from (docs/claims-screen.md):
// the record's commitment, the schema's id and terms, and the opened slot, all built here from
// the holder's own copy of the record. Nothing here is sent; a claim call (chain/claims-call.ts)
// takes it as the claims contract's private input for one call.
//
// The commitment a claim names is the SPEC 4.5 one, H("veilcore:v1:frecord", fieldSetRoot,
// SHA-256 of the record's sealed JSON): the record's content hash. The record's anchored proof
// code folds its key in on top (H(keyrecord, keyBinding, that)), so a checker given the key
// binding can go from the claim to the dated record (claim-link.ts).
// SPDX-License-Identifier: Apache-2.0

import { canonicalise } from 'veilcore-records';
import {
  ABSENT,
  SLOTS,
  commitmentOf,
  numberFrom,
  numberValue,
  openSlot,
  saltOf,
  type FieldSet,
  type SchemaTerms,
  type SlotOpening,
} from '../../../contract/src/fields';
import { fieldSchemaId, schemaTermsOf, type FieldSchema } from '../../../contract/src/field-schema';
import { documentFieldsOf, type DocumentRecordLike } from './document-profile';
import { SCHEMAS, type HeldFieldSet } from './field-set';

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));

export type ClaimMaterial = {
  readonly schema: FieldSchema;
  readonly schemaId: Uint8Array;
  readonly terms: SchemaTerms;
  readonly fieldSet: FieldSet;
  /** The SPEC 4.5 commitment the claim names: the record's content hash. */
  readonly commitment: Uint8Array;
};

/**
 * Everything a claim on this record is made from. Refuses a record whose numbers don't make the
 * root it sealed: a claim built from them would be refused on chain after a minute of proving.
 */
export const claimMaterial = async (
  record: DocumentRecordLike & { readonly fieldSet?: HeldFieldSet },
): Promise<ClaimMaterial> => {
  const held = record.fieldSet;
  if (!held || !record.fieldSchema || !record.fieldSetRoot) throw new Error('This document has no sealed numbers.');
  const schema = SCHEMAS[held.schema] as FieldSchema | undefined;
  if (!schema) throw new Error(`No published schema ${held.schema}.`);
  const schemaId = fieldSchemaId(schema);
  if (hex(schemaId) !== record.fieldSchema)
    throw new Error('The schema on this site is not the one the numbers were sealed under.');
  const jsonDigest = await sha256(new TextEncoder().encode(canonicalise(documentFieldsOf(record))));
  const secret = unhex(held.fieldSecret);
  const fieldSet: FieldSet = {
    values: Array.from({ length: SLOTS }, (_, i) => {
      const v = held.values[i];
      return v === null || v === undefined ? new Uint8Array(ABSENT) : numberValue(BigInt(v));
    }),
    salts: Array.from({ length: SLOTS }, (_, i) => saltOf(secret, i)),
    jsonDigest,
  };
  const commitment = commitmentOf(schemaId, fieldSet);
  return { schema, schemaId, terms: schemaTermsOf(schema), fieldSet, commitment };
};

/** The opened slot and its number, for a range or value claim. Refuses a slot with no number. */
export const slotInput = (m: ClaimMaterial, slot: number): { opening: SlotOpening; number: bigint } => {
  const opening = openSlot(m.fieldSet, slot);
  let number: bigint;
  try {
    number = numberFrom(opening.value);
  } catch {
    throw new Error('That number was not on the certificate when it was sealed.');
  }
  return { opening, number };
};

export const commitmentHex = (m: ClaimMaterial): string => hex(m.commitment);
export const schemaIdHex = (m: ClaimMaterial): string => hex(m.schemaId);
