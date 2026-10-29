// A document check link carries the sealed fields; the checker's browser recomputes the proof
// code from them, so a link that was changed (another file's fingerprint, a later date on the
// document) recomputes to a proof code nothing dated. Against the published vectors.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base64urlnopad } from '@scure/base';
import { documentCheckLink, readDocumentLink } from './document-link';
import type { DocumentRecordLike } from './document-profile';

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: { appRecord: DocumentRecordLike; fields: Record<string, unknown>; fingerprint: string }[];
};
const hashOf = (link: string) => link.slice(link.indexOf('#'));
const linkWith = (fields: unknown) =>
  `#d=${base64urlnopad.encode(new TextEncoder().encode(JSON.stringify({ v: 1, fields })))}`;

describe('a document check link', () => {
  for (const r of v.records)
    it('recomputes to the record’s own proof code, with nothing after the # sent anywhere', async () => {
      const link = documentCheckLink(r.appRecord, 'https://test.veilcore.org');
      expect(link.startsWith('https://test.veilcore.org/check-document#d=')).toBe(true);
      const read = await readDocumentLink(hashOf(link));
      expect(read.ok && read.fingerprint).toBe(r.fingerprint);
      expect(read.ok && read.fields).toEqual(r.fields);
    });

  it('a changed file fingerprint recomputes to another proof code', async () => {
    const f = v.records[0].fields as { files: { sha256: string }[] };
    const changed = { ...f, files: [{ ...f.files[0], sha256: 'e'.repeat(64) }, ...f.files.slice(1)] };
    const read = await readDocumentLink(linkWith(changed));
    expect(read.ok).toBe(true);
    expect(read.ok && read.fingerprint).not.toBe(v.records[0].fingerprint);
  });

  it('a later date written on the document recomputes to another proof code', async () => {
    const read = await readDocumentLink(linkWith({ ...v.records[0].fields, issued: '2026-12-01' }));
    expect(read.ok && read.fingerprint).not.toBe(v.records[0].fingerprint);
  });

  it('refuses what is not a document record, and what it can’t read', async () => {
    expect(await readDocumentLink('')).toEqual({ ok: false, why: 'missing' });
    expect(await readDocumentLink('#d=%%%')).toEqual({ ok: false, why: 'unreadable' });
    expect(await readDocumentLink(linkWith({ ...v.records[0].fields, files: [] }))).toEqual({
      ok: false,
      why: 'not-a-document',
    });
    expect(
      await readDocumentLink(linkWith({ ...v.records[0].fields, profile: 'veilcore/profile/plant-variety/v1' })),
    ).toEqual({ ok: false, why: 'not-a-document' });
  });
});
