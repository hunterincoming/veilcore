// The document profile (document-profile.ts) against vectors made without its code
// (contract/vectors/document-v1.json, contract/scripts/document-vectors.mjs), and the file
// helpers: a file is hashed in the browser and only its fingerprint, name and size are kept.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  documentFieldsOf,
  documentFileName,
  fingerprintFile,
  matchFile,
  validateDocumentFields,
  type DocumentRecordLike,
} from './document-profile';
import { committedRecordFields, fingerprintRecord } from './commitment';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: { name: string; appRecord: DocumentRecordLike; fields: Record<string, unknown>; fingerprint: string }[];
  refusals: { name: string; fields: unknown }[];
};

describe('document records (veilcore/profile/document/v1)', () => {
  for (const r of v.records)
    it(`seals as the vectors say: ${r.name}`, async () => {
      expect(validateDocumentFields(r.fields)).toEqual([]);
      expect(documentFieldsOf(r.appRecord)).toEqual(r.fields);
      expect(committedRecordFields(r.appRecord as never)).toEqual(r.fields);
      expect(await fingerprintRecord(r.appRecord as never)).toBe(r.fingerprint);
    });
  for (const r of v.refusals)
    it(`refuses ${r.name}`, () => {
      expect(validateDocumentFields(r.fields).length).toBeGreaterThan(0);
    });
  it('refuses to seal a malformed document rather than tidy it', () => {
    const bad = { ...v.records[0].appRecord, document: { ...v.records[0].appRecord.document, files: [] } };
    expect(() => committedRecordFields(bad as never)).toThrow(/at least one file/);
  });
});

describe('a document file', () => {
  it('is fingerprinted by its bytes; its name keeps no folder or line break', async () => {
    const bytes = new TextEncoder().encode('practice permit');
    const f = await fingerprintFile(Object.assign(new Blob([bytes]), { name: 'C:\\scans\\per\nmit 7.pdf' }));
    expect(f).toEqual({
      name: 'per mit 7.pdf',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
    });
    expect(validateDocumentFields({ ...v.records[0].fields, files: [f] })).toEqual([]);
  });
  it('has a name even when it had none, and at most 200 characters of one', () => {
    expect(documentFileName('')).toBe('document');
    expect(Array.from(documentFileName('x'.repeat(300))).length).toBe(200);
  });
  it('matches a sealed file only byte for byte', () => {
    const files = v.records[0].appRecord.document?.files ?? [];
    expect(matchFile(files, files[1].sha256.toUpperCase())).toEqual(files[1]);
    expect(matchFile(files, 'e'.repeat(64))).toBeUndefined();
  });
});
