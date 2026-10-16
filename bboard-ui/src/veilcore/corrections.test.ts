// CHANGED_FIELD_NAMES (CONTRACT.md #18): every field name a correction can list is one the
// registry accepts. The registry refuses a correction naming anything else, so a name the
// app can produce and the list lacks would make that correction impossible to save.
// (registry-contract.test.ts checks this list against the registry's own copy.)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { CHANGED_FIELD_NAMES, previewCorrection } from './corrections';
import type { StrainRecord } from './records';

const PLANT: StrainRecord = {
  id: 'VEIL-PLNT',
  nonce: 'n'.repeat(32),
  strainName: 'Harbour Mist',
  bredBy: 'A. Breeder',
  dateCreated: '2026-01-02',
  notes: 'first notes',
  loggedAt: Date.UTC(2026, 0, 3),
  recordFingerprint: 'a'.repeat(64),
  profile: 'veilcore/profile/plant-variety/v1',
  taxon: 'Cannabis sativa',
  parents: [{ name: 'Mother M3' }, { name: 'Father F1', recordId: 'VEIL-FATH' }],
  breedingMethod: 'cross',
  refId: 'LOT-1',
  photoFingerprints: ['b'.repeat(64)],
  dnaFingerprint: 'c'.repeat(64),
  dnaFileName: 'report.pdf',
  dnaPairedAt: Date.UTC(2026, 0, 4),
  dnaFileSha256: 'd'.repeat(64),
};

const ANIMAL: StrainRecord = {
  ...PLANT,
  id: 'VEIL-ANML',
  strainName: 'Daisy',
  profile: 'veilcore/profile/animal-individual/v1',
  taxon: 'Bos taurus',
  refId: 'UK123456',
  animal: { breed: 'Jersey', idScheme: 'UK ear tag', sex: 'female', herd: 'North' },
  parents: [
    { name: 'Sire S', role: 'sire', individualId: 'UK1' },
    { name: 'Dam D', role: 'dam', individualId: 'UK2' },
  ],
};

/** One change to each field a holder can correct. */
const EDITS: Record<string, (r: StrainRecord) => StrainRecord> = {
  strainName: (r) => ({ ...r, strainName: `${r.strainName} II` }),
  bredBy: (r) => ({ ...r, bredBy: 'Someone else' }),
  dateCreated: (r) => ({ ...r, dateCreated: '2025-12-31' }),
  notes: (r) => ({ ...r, notes: 'other notes' }),
  taxon: (r) => ({ ...r, taxon: 'Other species' }),
  parents: (r) => ({ ...r, parents: [{ name: 'New mother' }] }),
  breedingMethod: (r) => ({ ...r, breedingMethod: 'backcross' }),
  refId: (r) => ({ ...r, refId: 'LOT-2' }),
  photos: (r) => ({ ...r, photoFingerprints: ['e'.repeat(64)] }),
  dna: (r) => ({ ...r, dnaFingerprint: 'f'.repeat(64), dnaFileSha256: '0'.repeat(64) }),
  animal: (r) => ({ ...r, animal: { breed: 'Holstein', idScheme: 'US tag', sex: 'male', herd: 'South' } }),
  everything: (r) => ({
    ...r,
    strainName: 'X',
    bredBy: 'Y',
    dateCreated: '2020-01-01',
    notes: 'Z',
    taxon: 'T',
    parents: [],
    breedingMethod: 'm',
    refId: 'r',
    photoFingerprints: [],
    dnaFingerprint: undefined,
    animal: undefined,
  }),
};

describe('CHANGED_FIELD_NAMES', () => {
  it('holds each name once', () => {
    expect(new Set(CHANGED_FIELD_NAMES).size).toBe(CHANGED_FIELD_NAMES.length);
  });

  for (const [label, base] of [
    ['plant', PLANT],
    ['animal', ANIMAL],
  ] as const) {
    for (const [field, edit] of Object.entries(EDITS)) {
      it(`a correction to a ${label}'s ${field} names only fields the registry accepts`, () => {
        const { changedFields } = previewCorrection(base, edit(base));
        // (A plant has no animal details, and an animal's profile has no breeding method.)
        if (field === 'everything') expect(changedFields.length).toBeGreaterThan(3);
        const unknown = changedFields.filter((f) => !CHANGED_FIELD_NAMES.includes(f));
        expect(unknown).toEqual([]);
      });
    }
  }
});
