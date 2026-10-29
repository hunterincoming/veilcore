// The numbers on a certificate as a field set (field-set.ts; SPEC 4.5): the root the holder's
// copy makes is the one the vectors computed from the spec alone, the SDK fingerprints the
// record the same way the site does, and a typed number is stored exactly or refused.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fieldSetRootOf } from 'veilcore-records';
import { SCHEMAS, fieldSetOf, makeFieldSet, schemaIdHex, schemaPath, shownNumber, storedNumber } from './field-set';
import { fingerprintRecord } from './commitment';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: {
    appRecord: Record<string, unknown>;
    fields: Record<string, unknown>;
    fingerprint: string;
    fieldSet?: {
      schema: string;
      values: (string | null)[];
      fieldSecret: string;
      schemaId: string;
      fieldSetRoot: string;
    };
  }[];
};
const withSet = v.records.find((r) => r.fieldSet)!;
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

describe('a field set on a document', () => {
  it('the published schemas are the ones served, and their ids are the vectors’', async () => {
    expect(Object.keys(SCHEMAS).sort()).toEqual(['veilcore/schema/potency/v1', 'veilcore/schema/seed-quality/v1']);
    expect(await schemaIdHex('veilcore/schema/potency/v1')).toBe(withSet.fieldSet!.schemaId);
    expect(schemaPath('veilcore/schema/potency/v1')).toBe('/schemas/potency-v1.json');
    expect(fs.existsSync(path.join(dir, '../../public', schemaPath('veilcore/schema/seed-quality/v1')))).toBe(true);
  });

  it('the holder’s copy makes the root the vectors computed from the spec', async () => {
    const f = withSet.fieldSet!;
    const set = await fieldSetOf({ schema: f.schema, values: f.values, fieldSecret: f.fieldSecret });
    expect(hex(await fieldSetRootOf(set))).toBe(f.fieldSetRoot);
  });

  it('the site fingerprints a document with a field set as the vectors do (SPEC 4.5 frecord)', async () => {
    // The SDK's own agreement is checked by its conformance run (veilcore-sdk conformance/).
    expect(await fingerprintRecord(withSet.appRecord as never)).toBe(withSet.fingerprint);
  });

  it('a new field set gets a fresh secret and seals only the schema id and root', async () => {
    const a = await makeFieldSet('veilcore/schema/potency/v1', [210n, null, null, 11400n]);
    const b = await makeFieldSet('veilcore/schema/potency/v1', [210n, null, null, 11400n]);
    expect(a.fieldSchema).toBe(withSet.fieldSet!.schemaId);
    expect(a.held.fieldSecret).not.toBe(b.held.fieldSecret);
    expect(a.fieldSetRoot).not.toBe(b.fieldSetRoot);
    expect(a.held.values.slice(0, 4)).toEqual(['210', null, null, '11400']);
    expect(a.held.values).toHaveLength(16);
  });

  it('refuses numbers in slots the schema does not call numbers, and an empty set', async () => {
    await expect(
      makeFieldSet('veilcore/schema/seed-quality/v1', [null, null, null, null, null, null, 5n]),
    ).rejects.toThrow(/Slot 6/);
    await expect(makeFieldSet('veilcore/schema/potency/v1', [null])).rejects.toThrow(/at least one/);
    await expect(makeFieldSet('veilcore/schema/none/v1', [1n])).rejects.toThrow(/No published schema/);
  });

  it('stores a typed number exactly, or refuses it rather than rounding', () => {
    expect(storedNumber('0.21', 1000)).toBe(210n);
    expect(storedNumber('0,3', 1000)).toBe(300n);
    expect(storedNumber('98.5', 100)).toBe(9850n);
    expect(storedNumber('12', 1000)).toBe(12000n);
    expect(storedNumber('0.2105', 1000)).toBeUndefined();
    expect(storedNumber('-1', 1000)).toBeUndefined();
    expect(storedNumber('1e3', 1000)).toBeUndefined();
    expect(storedNumber('', 1000)).toBeUndefined();
    expect(shownNumber(210n, 1000)).toBe('0.210');
    expect(shownNumber('9850', 100)).toBe('98.50');
  });
});
