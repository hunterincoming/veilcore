// Every name a correction's `changedFields` can hold is one the registry accepts (CONTRACT.md #18:
// it refuses any other, so a correction naming one can never be saved). A strain's method and
// designation were missing, so a strain's method could never be corrected. Checked here for every
// field of every kind of record that a correction can change.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { CHANGED_FIELD_NAMES, previewCorrection } from './corrections';
import REGISTRY_NAMES from './fixtures/registry-changed-field-names.json';
import type { StrainRecord } from './records';

const base = {
  id: 'VEIL-00000000000000000000000000000001',
  nonce: '00'.repeat(32),
  strainName: 'A',
  bredBy: 'B',
  dateCreated: '2026-01-01',
  notes: '',
  loggedAt: Date.UTC(2026, 0, 1),
  breedingMethod: '',
  refId: '',
  parents: [{ name: 'P' }],
  licenseIds: [],
};

const plant = base as unknown as StrainRecord;
const animal = {
  ...base,
  profile: 'veilcore/profile/animal-individual/v1',
  animal: { breed: 'Holstein', herd: '', sex: 'female', idScheme: '' },
  parents: [{ name: 'S', role: 'sire' }],
} as unknown as StrainRecord;
const strain = {
  ...base,
  profile: 'veilcore/profile/strain/v1',
  strain: { group: 'bacterium', deposits: [], generation: '' },
} as unknown as StrainRecord;

/** Each kind's record and the changes a correction can make to it, one field at a time. */
const CASES: [string, StrainRecord, Record<string, Partial<StrainRecord>>][] = [
  [
    'plant',
    plant,
    {
      name: { strainName: 'Z' },
      bredBy: { bredBy: 'Y' },
      made: { dateCreated: '2025-01-01' },
      notes: { notes: 'n' },
      method: { breedingMethod: 'clone' },
      reference: { refId: 'R-1' },
      parents: { parents: [{ name: 'Q' }] },
      dna: { dnaFingerprint: 'd7'.repeat(32) },
    },
  ],
  [
    'animal',
    animal,
    {
      name: { strainName: 'Z' },
      bredBy: { bredBy: 'Y' },
      notes: { notes: 'n' },
      id: { refId: 'UK1', animal: { breed: 'Holstein', herd: '', sex: 'female', idScheme: 'Ear tag' } },
      sex: { animal: { breed: 'Holstein', herd: '', sex: 'male', idScheme: '' } },
      breed: { animal: { breed: 'Jersey', herd: '', sex: 'female', idScheme: '' } },
      herd: { animal: { breed: 'Holstein', herd: 'North Farm', sex: 'female', idScheme: '' } },
      parentIds: { parents: [{ name: 'S', role: 'sire', individualId: 'US9' }] },
    },
  ],
  [
    'strain',
    strain,
    {
      name: { strainName: 'Z' },
      bredBy: { bredBy: 'Y' },
      notes: { notes: 'n' },
      method: { breedingMethod: 'mutagenesis' },
      designation: { refId: 'D-1' },
      group: { strain: { group: 'yeast', deposits: [], generation: '' } },
      deposits: { strain: { group: 'bacterium', deposits: ['DSM 1'], generation: '' } },
      generation: { strain: { group: 'bacterium', deposits: [], generation: 'F2' } },
      parentDeposits: { parents: [{ name: 'P', individualId: 'ATCC 9' }] },
    },
  ],
];

describe('every changed field a correction can name is one the registry accepts', () => {
  for (const [kind, record, changes] of CASES)
    for (const [what, change] of Object.entries(changes))
      it(`${kind}: ${what}`, () => {
        const named = previewCorrection(record, { ...record, ...change }).changedFields;
        expect(named.length, 'the change is seen').toBeGreaterThan(0);
        expect(named.filter((f) => !CHANGED_FIELD_NAMES.includes(f))).toEqual([]);
      });

  it('a strain’s method and designation, which the registry used to refuse', () => {
    for (const f of ['profileData.method', 'profileData.designation', 'profileData.group', 'profileData.deposits'])
      expect(CHANGED_FIELD_NAMES).toContain(f);
    expect(CHANGED_FIELD_NAMES).toContain('profileData.generation');
    expect(CHANGED_FIELD_NAMES).toContain('profileData.parentDeposits');
  });

  // The registry's copy (veilcore-api sealed.js CHANGED_FIELD_NAMES, refuse-second-correction at
  // 8e759da), kept here so the two are checked to match exactly without a registry checkout. The
  // cross-repo contract test (registry-contract.test.ts) checks the live file when one is given.
  it('the site’s list is exactly the registry’s: no name only one side has', () => {
    const site = [...CHANGED_FIELD_NAMES].sort();
    const theirs = [...REGISTRY_NAMES].sort();
    expect(new Set(site).size, 'no name twice here').toBe(site.length);
    expect(
      site.filter((f) => !theirs.includes(f)),
      'names only the site has',
    ).toEqual([]);
    expect(
      theirs.filter((f) => !site.includes(f)),
      'names only the registry has',
    ).toEqual([]);
    expect(site).toEqual(theirs);
  });
});
