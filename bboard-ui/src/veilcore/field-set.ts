// The numbers on a certificate, sealed so one can be proved later without showing the rest
// (SPEC 4.5 field sets; docs/claims-screen.md).
//
// A document record (document-profile.ts) can carry a field set: the numbers typed from the
// certificate, each in a slot of a published schema, each salted, all under one root. The
// record seals only the schema's id and the root (fieldSchema, fieldSetRoot). The numbers and
// the 32-byte field secret the salts come from stay in the holder's own copy of the record
// (`fieldSet`), which the registry keeps sealed like the rest of it and never reads.
//
// The schemas are public documents (public/schemas/, served at /schemas/ on the site): a claim
// names a schema id, and a checker recomputes it from the document, so "slot 0 is total THC in
// percent times 1000" can't be reread as anything else.
// SPDX-License-Identifier: Apache-2.0

import {
  FIELD_SLOTS,
  ABSENT_VALUE,
  fieldSchemaId,
  fieldSetRootOf,
  numberSlotValue,
  sealFieldSet,
  type FieldSchema,
  type FieldSet,
} from 'veilcore-records';
import potency from '../../public/schemas/potency-v1.json';
import seedQuality from '../../public/schemas/seed-quality-v1.json';

/** The published schemas this site seals numbers under, by their document id. */
export const SCHEMAS: Readonly<Record<string, FieldSchema>> = {
  [potency.id]: potency as FieldSchema,
  [seedQuality.id]: seedQuality as FieldSchema,
};
export type SchemaName = keyof typeof SCHEMAS;

/** Where each schema's document is published on this site. */
export const schemaPath = (id: string): string => `/schemas/${id.split('/').slice(-2).join('-')}.json`;

/** The holder's private field set, as kept on their copy of the record. Never sealed. */
export type HeldFieldSet = {
  /** The schema document's id ("veilcore/schema/potency/v1"). */
  readonly schema: string;
  /** Each slot's number as stored (the measured value times the slot's scale), decimal; null when absent. */
  readonly values: readonly (string | null)[];
  /** 32 random bytes, hex: the salts come from it. Never sealed, never shared. */
  readonly fieldSecret: string;
};

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** The 32-byte id a claim names, hex, for a schema document. */
export const schemaIdHex = async (schemaDocId: string): Promise<string> => {
  const s = SCHEMAS[schemaDocId];
  if (!s) throw new Error(`No published schema ${schemaDocId}.`);
  return hex(await fieldSchemaId(s));
};

/**
 * What a person typed ("0.21", "98.5") as the stored number for a slot with this scale
 * (0.21 at scale 1000 is 210). Refused rather than rounded when it has more decimals than the
 * scale can hold, or isn't a plain non-negative decimal: a sealed number can't be fixed later.
 */
export const storedNumber = (typed: string, scale: number): bigint | undefined => {
  const t = typed.trim().replace(',', '.');
  const m = /^(\d{1,12})(?:\.(\d+))?$/.exec(t);
  if (!m) return undefined;
  const places = Math.round(Math.log10(scale));
  if (10 ** places !== scale) return undefined;
  const frac = m[2] ?? '';
  if (frac.length > places) return undefined;
  return BigInt(m[1]) * BigInt(scale) + BigInt((frac + '0'.repeat(places)).slice(0, places) || '0');
};

/** A stored number back in the units a person reads (210 at scale 1000 is "0.210"). */
export const shownNumber = (stored: bigint | string, scale: number): string => {
  const n = BigInt(stored);
  const places = Math.round(Math.log10(scale));
  if (places === 0) return n.toString();
  const s = n.toString().padStart(places + 1, '0');
  return `${s.slice(0, -places)}.${s.slice(-places)}`;
};

/** The 16 slot values for these stored numbers (absent where null or beyond the schema). */
const slotValues = (values: readonly (string | null)[]): Uint8Array[] =>
  Array.from({ length: FIELD_SLOTS }, (_, i) => {
    const v = values[i];
    return v === null || v === undefined ? new Uint8Array(ABSENT_VALUE) : numberSlotValue(BigInt(v));
  });

/** The SDK's field set for what the holder keeps. */
export const fieldSetOf = async (held: HeldFieldSet): Promise<FieldSet> =>
  sealFieldSet(unhex(await schemaIdHex(held.schema)), slotValues(held.values), unhex(held.fieldSecret));

/**
 * Seal numbers under a schema: a fresh field secret, the set, and what the record seals
 * (fieldSchema, fieldSetRoot). Every value must be in a numeric slot the schema describes.
 */
export const makeFieldSet = async (
  schemaDocId: string,
  values: readonly (bigint | null)[],
): Promise<{ held: HeldFieldSet; fieldSchema: string; fieldSetRoot: string }> => {
  const schema = SCHEMAS[schemaDocId];
  if (!schema) throw new Error(`No published schema ${schemaDocId}.`);
  const described = new Set(schema.slots.filter((s) => s.type === 'uint').map((s) => s.slot));
  values.forEach((v, i) => {
    if (v !== null && !described.has(i)) throw new Error(`Slot ${i} is not a number in ${schemaDocId}.`);
  });
  if (!values.some((v) => v !== null)) throw new Error('Type at least one number.');
  const held: HeldFieldSet = {
    schema: schemaDocId,
    values: Array.from({ length: FIELD_SLOTS }, (_, i) => (values[i] ?? null)?.toString() ?? null),
    fieldSecret: hex(crypto.getRandomValues(new Uint8Array(32))),
  };
  const fs = await fieldSetOf(held);
  return { held, fieldSchema: hex(fs.schemaId), fieldSetRoot: hex(await fieldSetRootOf(fs)) };
};

/** What a person typed into each numeric slot, by slot number (empty: not on the certificate). */
export type TypedNumbers = Readonly<Record<number, string>>;

/** The stored numbers for what was typed, and the slots whose text isn't a number this slot can hold. */
export const numbersOf = (
  schemaDocId: string,
  typed: TypedNumbers,
): { values: (bigint | null)[]; bad: number[]; any: boolean } => {
  const schema = SCHEMAS[schemaDocId];
  const values: (bigint | null)[] = Array.from({ length: FIELD_SLOTS }, () => null);
  const bad: number[] = [];
  for (const s of schema?.slots ?? []) {
    if (s.type !== 'uint') continue;
    const text = (typed[s.slot] ?? '').trim();
    if (!text) continue;
    const n = storedNumber(text, s.scale ?? 1);
    if (n === undefined) bad.push(s.slot);
    else values[s.slot] = n;
  }
  return { values, bad, any: values.some((v) => v !== null) };
};

/** The last part of a slot's path ("potency.totalThc" → "totalThc"): the key its label is under. */
export const slotKey = (path: string): string => path.split('.').pop() ?? path;
