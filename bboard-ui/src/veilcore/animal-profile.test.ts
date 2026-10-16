// The animal profile (animal-profile.ts, docs/animal-profile.md): its fields, their canonical
// form and its refusals, checked against published vectors none of the checkers computed
// (contract/vectors/animal-individual-v1.json, also run by the registry, the SDK and Rust);
// and every plant record still fingerprinting byte for byte as before.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { canonicalise } from 'veilcore-records';
import {
  ANIMAL_PROFILE,
  animalFieldsOf,
  damOf,
  isAnimal,
  parentLine,
  recordTitle,
  sireOf,
  validateAnimalFields,
  type AnimalRecordLike,
} from './animal-profile';
import { committedRecordFields, contentHashOf, fingerprintRecord, type CommittedRecordInput } from './commitment';
import { sealAnimalRecord, sealRecord } from './seal-record';
import { checkIntegrity, isStrainRecord, type StrainRecord } from './records';
import { toEnvelope, exportEnvelopeFor } from './envelope';
import { __resetRecordKeysForTests } from './record-keys';

const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')) as T;
type Vec = {
  profile: string;
  records: {
    name: string;
    algorithm: string;
    appRecord: AnimalRecordLike;
    fields: Record<string, unknown>;
    canonical: string;
    contentHash: string;
    fingerprint: string;
  }[];
  refusals: { name: string; fields: Record<string, unknown> }[];
};
const V = read<Vec>('../../../contract/vectors/animal-individual-v1.json');
type PlantVec = {
  records: { name: string; fields: Record<string, unknown>; fingerprint: string; contentHash: string }[];
};
const PLANT = read<PlantVec>('../../../contract/vectors/key-bound-v1.json');

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the animal profile against its published vectors', () => {
  it('names the profile the vectors name', () => {
    expect(V.profile).toBe(ANIMAL_PROFILE);
    expect(V.records.length).toBeGreaterThanOrEqual(5);
    expect(V.refusals.length).toBeGreaterThanOrEqual(20);
  });

  for (const v of V.records) {
    it(`seals "${v.name}" exactly as published`, async () => {
      expect(validateAnimalFields(v.fields)).toEqual([]);
      // The app's stored shape turns into exactly the profile's fields...
      expect(animalFieldsOf(v.appRecord)).toEqual(v.fields);
      expect(committedRecordFields(v.appRecord as CommittedRecordInput)).toEqual(v.fields);
      // ...in exactly the published canonical bytes, content hash and fingerprint.
      expect(canonicalise(v.fields)).toBe(v.canonical);
      expect(await contentHashOf(v.appRecord as CommittedRecordInput)).toBe(v.contentHash);
      expect(await fingerprintRecord(v.appRecord as CommittedRecordInput)).toBe(v.fingerprint);
    });
  }

  for (const v of V.refusals) {
    it(`refuses ${v.name}`, () => {
      expect(validateAnimalFields(v.fields).length).toBeGreaterThan(0);
    });
  }

  it('never seals a malformed animal record: the fingerprint throws', async () => {
    const good = V.records[0].appRecord;
    await expect(
      fingerprintRecord({ ...good, animal: { ...good.animal, sex: 'cow' } } as unknown as CommittedRecordInput),
    ).rejects.toThrow(/sex must be female, male or unknown/);
    await expect(
      fingerprintRecord({ ...good, parents: [{ name: 'x' }] } as unknown as CommittedRecordInput),
    ).rejects.toThrow(/role must be sire or dam/);
  });

  it('a changed sealed value changes the fingerprint (the ID, a parent, the sex)', async () => {
    const r = V.records[0].appRecord as CommittedRecordInput;
    const fp = await fingerprintRecord(r);
    expect(await fingerprintRecord({ ...r, refId: '0000000018' })).not.toBe(fp);
    expect(
      await fingerprintRecord({ ...r, parents: [{ ...r.parents![0], individualId: '0000000026' }, r.parents![1]] }),
    ).not.toBe(fp);
    expect(await fingerprintRecord({ ...r, animal: { ...r.animal, sex: 'male' } })).not.toBe(fp);
  });
});

describe('plant records are unchanged', () => {
  for (const v of PLANT.records) {
    it(`"${v.name}" fingerprints byte for byte as before`, async () => {
      const f = v.fields as unknown as CommittedRecordInput;
      expect(isAnimal(f)).toBe(false);
      expect(committedRecordFields(f)).toEqual(v.fields);
      expect(await fingerprintRecord(f)).toBe(v.fingerprint);
    });
  }

  it('a record with no profile (sealed before profiles) is a plant record', () => {
    expect(isAnimal({})).toBe(false);
    expect(isAnimal({ profile: 'veilcore/profile/plant-variety/v1' })).toBe(false);
    expect(isAnimal({ profile: ANIMAL_PROFILE })).toBe(true);
  });
});

describe('sealing an animal', () => {
  const input = {
    name: 'Practice Cow',
    species: 'Cattle (Bos taurus)',
    breed: 'Japanese Black',
    individualId: '0000000017',
    idScheme: 'Japan cattle ID (10 digits)',
    sex: 'female' as const,
    dateOfBirth: '2024-03-15',
    parents: [
      { name: 'Practice Sire', role: 'sire' as const, individualId: '0000000025' },
      { name: 'Practice Dam', role: 'dam' as const, recordId: 'VEIL-0001' },
    ],
    breeder: 'Example Farm (test data)',
    herd: '',
    notes: '',
    photoFingerprints: [],
  };

  it('seals under the animal profile, names its key, and recomputes', async () => {
    const r = (await sealAnimalRecord(input, 1_760_600_000_000)) as StrainRecord;
    expect(r.profile).toBe(ANIMAL_PROFILE);
    expect(r.keyBinding).toMatch(/^[0-9a-f]{64}$/);
    expect(isStrainRecord(r)).toBe(true);
    expect(await checkIntegrity(r)).toBe('match');
    const fields = committedRecordFields(r as CommittedRecordInput);
    expect(fields).toMatchObject({
      name: 'Practice Cow',
      individualId: '0000000017',
      idScheme: 'Japan cattle ID (10 digits)',
      dateOfBirth: '2024-03-15',
      sex: 'female',
      parents: [
        { role: 'sire', name: 'Practice Sire', individualId: '0000000025' },
        { role: 'dam', name: 'Practice Dam', individualId: '', recordId: 'VEIL-0001' },
      ],
    });
    // No plant fields leak into an animal's sealed fields.
    expect(Object.keys(fields)).not.toContain('strainName');
    expect(Object.keys(fields)).not.toContain('breedingMethod');
    expect(sireOf(r)?.name).toBe('Practice Sire');
    expect(damOf(r)?.recordId).toBe('VEIL-0001');
    expect(parentLine(sireOf(r))).toBe('Practice Sire (ID 0000000025)');
    expect(recordTitle(r)).toBe('Practice Cow');
    expect(recordTitle({ ...r, strainName: '' })).toBe('0000000017');
  });

  it('refuses to seal an animal with no breeder, and forgets the key made for it', async () => {
    await expect(sealAnimalRecord({ ...input, breeder: '' })).rejects.toThrow(/breeder must not be empty/);
    const kept = JSON.parse(local.get('veilcore.record-keys.v1') ?? '{}') as Record<string, unknown>;
    expect(Object.keys(kept)).toEqual([]);
  });

  it('a plant sealed today still seals the plant fields', async () => {
    const r = await sealRecord({
      strainName: 'Harbour Mist',
      bredBy: 'Example Farm',
      dateCreated: '2026-10-14',
      notes: '',
      parents: [],
      breedingMethod: '',
      photoFingerprints: [],
      refId: '',
      taxon: '',
    });
    expect(Object.keys(committedRecordFields(r))).toContain('strainName');
  });

  it('exports as an animal envelope: subject type, sire and dam roles, the ID with its scheme', async () => {
    const r = (await sealAnimalRecord(input, 1_760_600_000_000)) as StrainRecord;
    const env = toEnvelope(r, 'holder:test');
    expect(env.subjectType).toBe('animal-genetic-material');
    expect(env.profile).toBe(ANIMAL_PROFILE);
    expect(env.subject?.claimedCreationDate).toBe('2024-03-15');
    expect(env.subject?.internalDesignation).toBeUndefined();
    expect(env.parents?.map((p) => p.role)).toEqual(['sire', 'dam']);
    expect(env.profileData).toMatchObject({
      individualId: '0000000017',
      idScheme: 'Japan cattle ID (10 digits)',
      sex: 'female',
    });
    const out = await exportEnvelopeFor(r, 'holder:test', 'match', { status: 'none' });
    const reg = (out.extensions as Record<string, { fields: Record<string, unknown>; fingerprint: string }>)[
      'org.veilcore.registered-fingerprint'
    ];
    expect(reg.fingerprint).toBe(r.recordFingerprint);
    expect(reg.fields.profile).toBe(ANIMAL_PROFILE);
    expect(reg.fields.individualId).toBe('0000000017');
  });
});
