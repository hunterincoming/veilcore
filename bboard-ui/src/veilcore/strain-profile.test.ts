// The strain profile (strain-profile.ts) against vectors made without its code
// (contract/vectors/strain-v1.json, contract/scripts/strain-vectors.mjs).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strainFieldsOf, validateStrainFields, type StrainRecordLike } from './strain-profile';
import { committedRecordFields, fingerprintRecord } from './commitment';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/strain-v1.json'), 'utf8')) as {
  records: { name: string; appRecord: StrainRecordLike; fields: Record<string, unknown>; fingerprint: string }[];
  refusals: { name: string; fields: unknown }[];
};

describe('strain records (veilcore/profile/strain/v1)', () => {
  for (const r of v.records)
    it(`seals as the vectors say: ${r.name}`, async () => {
      expect(validateStrainFields(r.fields)).toEqual([]);
      expect(strainFieldsOf(r.appRecord)).toEqual(r.fields);
      expect(committedRecordFields(r.appRecord as never)).toEqual(r.fields);
      expect(await fingerprintRecord(r.appRecord as never)).toBe(r.fingerprint);
    });
  for (const r of v.refusals)
    it(`refuses ${r.name}`, () => {
      expect(validateStrainFields(r.fields).length).toBeGreaterThan(0);
    });
});
