// Tests only: document records with sealed numbers, made the way the site makes them (field-set.ts
// makeFieldSet: a fresh field secret, the form's id and the set's root), for the claims about two
// records (two-record-claims.ts). Each is its own record: its own nonce, id and proof code.
// SPDX-License-Identifier: Apache-2.0

import { makeFieldSet } from './field-set';
import type { StrainRecord } from './records';

let n = 0;
const hex = (len: number, seed: number) => seed.toString(16).padStart(2, '0').slice(-2).repeat(len);

/** A sealed certificate under `schema` holding `values` (as stored, by slot; null: not on it). */
export const sealedNumbers = async (
  schema: string,
  values: readonly (bigint | null)[],
  over: Partial<StrainRecord> = {},
): Promise<StrainRecord> => {
  n += 1;
  const { held, fieldSchema, fieldSetRoot } = await makeFieldSet(schema, values);
  return {
    id: `VEIL-${hex(16, n).toUpperCase()}`,
    profile: 'veilcore/profile/document/v1',
    strainName: `Certificate ${n} (test data)`,
    bredBy: 'Example Grower (test data)',
    dateCreated: '2026-10-01',
    notes: 'Test data, not a real certificate.',
    loggedAt: 1761700000000 + n,
    nonce: hex(32, n + 100),
    keyBinding: hex(32, n + 50),
    recordFingerprint: hex(32, n + 200),
    refId: `COA-${n}`,
    parents: [],
    photoFingerprints: [],
    document: { type: 'certificate-of-analysis', issuer: 'Example Testing Lab (test data)' },
    fieldSchema,
    fieldSetRoot,
    fieldSet: held,
    ...over,
  } as unknown as StrainRecord;
};

export const POTENCY = 'veilcore/schema/potency/v1';
export const SEED = 'veilcore/schema/seed-quality/v1';
export const MATCH = 'veilcore/schema/genetic-match/v1';

/** Potency numbers by slot: total THC (0), total CBD (3); the rest left off the certificate. */
export const potency = (thc: bigint | null, cbd: bigint | null): (bigint | null)[] => [
  thc,
  null,
  null,
  cbd,
  ...Array<null>(12).fill(null),
];
