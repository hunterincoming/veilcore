// A production chain as document records (docs/document-chain.md): the two new forms and the
// kind read from a sealed schema id; a document about a document; the chain view, worked out
// from this browser's records alone, with records kept on this device only and with records
// that name each other; and the link with its chain, which is followed without anything being
// sent. Normal documents, their links and the forms offered for a certificate are as before.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base64urlnopad } from '@scure/base';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, installStorage, settle } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { pathOf, until } from './fixtures/device-only-doc';
import {
  CHAIN_SCHEMAS,
  LAB_SCHEMAS,
  OFFERED_SCHEMAS,
  SCHEMAS,
  makeFieldSet,
  schemaIdHex,
  schemaPath,
} from './field-set';
import { DOCUMENT_KINDS, KIND_SCHEMA, KIND_SCHEMA_ID, documentKindOf } from './document-kind';
import {
  aboutIdsOf,
  assertNotAboutItself,
  batchSheetName,
  batchSheetText,
  chainNotes,
  downstreamOf,
  upstreamOf,
  type ChainRecord,
} from './document-chain';
import { aboutTarget, chainEntriesFor, documentChainLink, documentCheckLink, readDocumentLink } from './document-link';
import { documentFieldsOf, validateDocumentFields, type DocumentRecordLike } from './document-profile';
import { kindOrTypeWords } from '../components/document/DocumentParts';
import { enT } from '../i18n/translate';

const dir = path.dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: { appRecord: DocumentRecordLike; fields: Record<string, unknown>; fingerprint: string }[];
};

let reg: FakeRegistry;
beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  reg = fakeRegistry();
  vi.stubGlobal('fetch', reg.fetch);
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

describe('the grow batch and harvest lot forms', () => {
  it('their ids are the ones written in the site, stable and unlike any other form’s', async () => {
    for (const k of DOCUMENT_KINDS) {
      expect(SCHEMAS[KIND_SCHEMA[k]]).toBeDefined();
      expect(await schemaIdHex(KIND_SCHEMA[k])).toBe(KIND_SCHEMA_ID[k]);
      expect(fs.existsSync(path.join(dir, '../../public', schemaPath(KIND_SCHEMA[k])))).toBe(true);
    }
    // Pinned: a form is permanent once a record is sealed under it. A change is a new file.
    expect(KIND_SCHEMA_ID).toEqual({
      'grow-batch': 'b7457db62d31e23249459250ea7e1f1f956867abfa02e8337f46f3316cf2293f',
      'harvest-lot': 'c2bf134ea1761c529f304b390bdc40d1ae25906c990ad0456f93b26bb7b47d62',
    });
    const all = await Promise.all(Object.keys(SCHEMAS).map((id) => schemaIdHex(id)));
    expect(new Set(all).size).toBe(all.length);
  });

  it('hold exactly the agreed numbers, each a whole number or with two decimals', () => {
    const slots = (id: string) => SCHEMAS[id].slots.map((s) => [s.slot, s.type, s.path, s.unit ?? '', s.scale]);
    expect(slots(KIND_SCHEMA['grow-batch'])).toEqual([
      [0, 'uint', 'growBatch.plants', '', 1],
      [1, 'uint', 'growBatch.plantsInFlower', '', 1],
      [2, 'uint', 'growBatch.areaSquareMetres', 'm²', 100],
    ]);
    expect(slots(KIND_SCHEMA['harvest-lot'])).toEqual([
      [0, 'uint', 'harvestLot.plantsHarvested', '', 1],
      [1, 'uint', 'harvestLot.wetWeightGrams', 'g', 1],
      [2, 'uint', 'harvestLot.dryWeightGrams', 'g', 1],
    ]);
  });

  it('are not in the list of a certificate’s numbers, which is as it was', () => {
    expect([...OFFERED_SCHEMAS].sort()).toEqual(['veilcore/schema/potency/v1', 'veilcore/schema/seed-quality/v1']);
    for (const id of CHAIN_SCHEMAS) expect(LAB_SCHEMAS).not.toContain(id);
  });

  it('the kind is read from the sealed schema id, never from the type', async () => {
    const batch = await makeFieldSet(KIND_SCHEMA['grow-batch'], [120n, 80n, 1250n]);
    const lot = await makeFieldSet(KIND_SCHEMA['harvest-lot'], [118n, 51200n, 10400n]);
    const potency = await makeFieldSet('veilcore/schema/potency/v1', [210n]);
    expect(documentKindOf({ fieldSchema: batch.fieldSchema })).toBe('grow-batch');
    expect(documentKindOf({ fieldSchema: lot.fieldSchema })).toBe('harvest-lot');
    expect(documentKindOf({ fieldSchema: potency.fieldSchema })).toBeUndefined();
    expect(documentKindOf({})).toBeUndefined();
    expect(documentKindOf(undefined)).toBeUndefined();
    // In words: the kind for a chain link, the type for anything else, exactly as before.
    expect(kindOrTypeWords({ fieldSchema: batch.fieldSchema, document: { type: 'other' } }, enT)).toBe('Grow batch');
    expect(kindOrTypeWords({ fieldSchema: lot.fieldSchema, document: { type: 'other' } }, enT)).toBe('Harvest lot');
    expect(kindOrTypeWords({ fieldSchema: potency.fieldSchema, document: { type: 'lab-report' } }, enT)).toBe(
      'Lab report',
    );
    expect(kindOrTypeWords({ document: { type: 'permit' } }, enT)).toBe('Permit or licence');
  });
});

describe('a document about a document', () => {
  it('is within the profile as it stands, and a record can’t be about itself', () => {
    const f = { ...vectors.records[0].fields, about: [{ name: 'Grow batch B-7', recordId: 'VEIL-0123456789ABCDEF' }] };
    expect(validateDocumentFields(f)).toEqual([]);
    expect(() => assertNotAboutItself('VEIL-A', [{ name: 'itself', recordId: 'VEIL-A' }])).toThrow(/about itself/);
    expect(() =>
      assertNotAboutItself('VEIL-A', [{ name: 'another', recordId: 'VEIL-B' }, { name: 'a name' }]),
    ).not.toThrow();
    // A hand-made record that names itself is never followed.
    expect(aboutIdsOf({ id: 'VEIL-A', document: { about: [{ name: 'x', recordId: 'VEIL-A' }] } })).toEqual([]);
  });
});

const rec = (id: string, about: string[], extra: Partial<ChainRecord> = {}): ChainRecord => ({
  id,
  strainName: `name of ${id}`,
  document: { about: about.map((a) => ({ name: `sealed name of ${a}`, recordId: a })) },
  ...extra,
});

describe('the chain view, from this browser’s records alone', () => {
  const source: ChainRecord = { id: 'SRC', strainName: 'Clone line 7' };
  const batch = rec('BATCH', ['SRC']);
  const lot = rec('LOT', ['BATCH']);
  const report = rec('REPORT', ['LOT']);
  const all = [report, source, lot, batch];

  it('goes up from the lab report to the source, nearest first', () => {
    expect(upstreamOf(report, all).map((s) => [s.id, s.depth, s.name])).toEqual([
      ['LOT', 1, 'name of LOT'],
      ['BATCH', 2, 'name of BATCH'],
      ['SRC', 3, 'Clone line 7'],
    ]);
    expect(upstreamOf(source, all)).toEqual([]);
  });

  it('goes down from the source to everything about it', () => {
    expect(downstreamOf(source, all).map((s) => [s.id, s.depth])).toEqual([
      ['BATCH', 1],
      ['LOT', 2],
      ['REPORT', 3],
    ]);
    expect(downstreamOf(report, all)).toEqual([]);
  });

  it('lists a named record this browser doesn’t hold by its sealed name, and stops there', () => {
    const up = upstreamOf(lot, [lot]);
    expect(up).toEqual([{ id: 'BATCH', name: 'sealed name of BATCH', depth: 1 }]);
    expect(up[0].record).toBeUndefined();
  });

  it('records that name each other end: each is listed once, never the record itself', () => {
    const a = rec('A', ['B']);
    const b = rec('B', ['A']);
    expect(upstreamOf(a, [a, b]).map((s) => s.id)).toEqual(['B']);
    expect(downstreamOf(a, [a, b]).map((s) => s.id)).toEqual(['B']);
    const selfish = rec('S', ['S', 'A']);
    expect(upstreamOf(selfish, [selfish, a, b]).map((s) => s.id)).toEqual(['A', 'B']);
    // A longer ring, and two paths to one record.
    const x = rec('X', ['Y', 'Z']);
    const y = rec('Y', ['Z']);
    const z = rec('Z', ['X']);
    expect(upstreamOf(x, [x, y, z]).map((s) => [s.id, s.depth])).toEqual([
      ['Y', 1],
      ['Z', 1],
    ]);
    expect(
      downstreamOf(z, [x, y, z])
        .map((s) => s.id)
        .sort(),
    ).toEqual(['X', 'Y']);
  });

  it('includes a record kept on this device only, and asks the registry nothing', async () => {
    const A = await browser('chain');
    const made = await A.run(async () => {
      const { sealDocumentRecord } = await import('./seal-record');
      const doc = (
        title: string,
        about: { id: string; strainName: string }[],
        fieldSet?: Awaited<ReturnType<typeof makeFieldSet>>,
      ) =>
        sealDocumentRecord({
          title,
          type: 'other',
          issuer: '',
          reference: title,
          issued: '2026-11-10',
          files: [
            { name: `${title}.txt`, sha256: Buffer.from(title).toString('hex').padEnd(64, '0').slice(0, 64), size: 10 },
          ],
          about: about.map((r) => ({ recordId: r.id, name: r.strainName })),
          holder: 'Chain test holder',
          notes: '',
          ...(fieldSet ? { fieldSet } : {}),
        });
      const source = A.m.records.createRecord(await doc('SOURCE-1', []));
      const batch = A.m.records.createRecord({
        ...(await doc('BATCH-1', [source], await makeFieldSet(KIND_SCHEMA['grow-batch'], [120n, null, 1250n]))),
        deviceOnly: true,
      });
      // The lot names the batch, so it is kept on this device too (device-only-about.test.ts).
      const lot = A.m.records.createRecord({
        ...(await doc('LOT-1', [batch], await makeFieldSet(KIND_SCHEMA['harvest-lot'], [118n, 51200n, 10400n]))),
        deviceOnly: true,
      });
      await until(() =>
        reg.sent.some(
          (p) => p.method === 'PUT' && pathOf(p.url) === '/api/records/dating' && p.body.includes(batch.id),
        ),
      );
      await settle(150);
      return { source, batch, lot };
    });
    expect(made.batch.deviceOnly).toBe(true);
    const before = reg.sent.length;
    await A.run(() => {
      const records = A.m.records.allRecords();
      const lot = A.m.records.getRecord(made.lot.id)!;
      const source = A.m.records.getRecord(made.source.id)!;
      expect(upstreamOf(lot, records).map((s) => s.id)).toEqual([made.batch.id, made.source.id]);
      expect(downstreamOf(source, records).map((s) => s.id)).toEqual([made.batch.id, made.lot.id]);
      expect(upstreamOf(lot, records)[0].record?.deviceOnly).toBe(true);
      expect(documentKindOf(A.m.records.getRecord(made.batch.id))).toBe('grow-batch');
    });
    expect(reg.sent.length).toBe(before);
  });
});

describe('a link with its chain', () => {
  const [a, b] = vectors.records;
  const held = (id: string, r: DocumentRecordLike, about: { name: string; recordId?: string }[]) => ({
    ...r,
    id,
    document: { ...r.document, about },
  });
  const upstream = { ...a.appRecord, id: 'VEIL-UP' };
  const plant = { id: 'VEIL-PLANT', strainName: 'Clone line 7', recordFingerprint: 'ab'.repeat(32) } as never;
  const top = held('VEIL-TOP', b.appRecord, [
    { name: 'the upstream document', recordId: 'VEIL-UP' },
    { name: 'the plant', recordId: 'VEIL-PLANT' },
    { name: 'somewhere else', recordId: 'VEIL-ELSEWHERE' },
    { name: 'only a name' },
  ]);
  const records = [top, upstream, plant] as never[];
  const hashOf = (link: string) => link.slice(link.indexOf('#'));

  it('the ordinary link is byte for byte what it was, and reads as before', async () => {
    for (const r of vectors.records) {
      const link = documentCheckLink(r.appRecord, 'https://test.veilcore.org');
      const was = `https://test.veilcore.org/check-document#d=${base64urlnopad.encode(
        new TextEncoder().encode(JSON.stringify({ v: 1, fields: documentFieldsOf(r.appRecord) })),
      )}`;
      expect(link).toBe(was);
      const read = await readDocumentLink(hashOf(link));
      expect(read.ok && read.fingerprint).toBe(r.fingerprint);
      expect(read.ok && read.chain).toEqual([]);
    }
  });

  it('carries each document it is about with its fields, and any other record with its proof code', async () => {
    expect(chainEntriesFor(top as never, records).map((e) => [e.id, 'fields' in e ? 'fields' : e.code])).toEqual([
      ['VEIL-UP', 'fields'],
      ['VEIL-PLANT', 'ab'.repeat(32)],
    ]);
    const link = documentChainLink(top, records, 'https://test.veilcore.org');
    const read = await readDocumentLink(hashOf(link));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    // The record itself is checked exactly as from an ordinary link.
    expect(read.fields).toEqual(documentFieldsOf(top));
    expect(read.chain.map((e) => e.id)).toEqual(['VEIL-UP', 'VEIL-PLANT']);
    // A site build from before this reads the same link: it looks at v and fields only.
    const old = JSON.parse(new TextDecoder().decode(base64urlnopad.decode(hashOf(link).slice(3)))) as {
      v: number;
      fields: unknown;
    };
    expect(old.v).toBe(1);
    expect(validateDocumentFields(old.fields)).toEqual([]);
  });

  it('following a link to a document in the chain sends nothing: everything is after the #', async () => {
    const link = documentChainLink(top, records, 'https://test.veilcore.org');
    const read = await readDocumentLink(hashOf(link));
    if (!read.ok) throw new Error('unreadable');
    const fetched: string[] = [];
    vi.stubGlobal('fetch', (u: unknown) => {
      fetched.push(String(u));
      return Promise.reject(new Error('no request is expected'));
    });
    const target = aboutTarget('VEIL-UP', read.chain, read.fingerprint);
    expect(target.kind).toBe('document');
    const url = new URL(target.to, 'https://test.veilcore.org');
    // What a browser sends when it opens it: the path and the query string. Neither holds anything.
    expect(url.pathname).toBe('/check-document');
    expect(url.search).toBe('');
    const next = await readDocumentLink(url.hash);
    expect(next.ok && next.fingerprint).toBe(a.fingerprint);
    expect(next.ok && next.fields).toEqual(documentFieldsOf(upstream));
    // Which record it was named by, and the rest of the chain, are handed on by the app, not the address.
    expect(url.hash).not.toMatch(/[&#]as=/);
    expect(target.state).toMatchObject({ namedAs: 'VEIL-UP', from: read.fingerprint });
    // The chain goes along, so the next link up can be followed the same way.
    expect(target.state?.chain.map((e) => e.id)).toEqual(['VEIL-UP', 'VEIL-PLANT']);
    expect(next.ok && next.chain).toEqual([]);
    expect(fetched).toEqual([]);
  });

  it('a record that is not a document opens its public check page by ID and proof code, with no field in the address', async () => {
    const read = await readDocumentLink(hashOf(documentChainLink(top, records, 'https://test.veilcore.org')));
    if (!read.ok) throw new Error('unreadable');
    expect(aboutTarget('VEIL-PLANT', read.chain)).toEqual({
      kind: 'record',
      to: `/verify/VEIL-PLANT?fp=${'ab'.repeat(32)}`,
    });
    // Named by ID only (not on the sender's device, or an ordinary link): the registry's report.
    expect(aboutTarget('VEIL-ELSEWHERE', read.chain)).toEqual({ kind: 'id-only', to: '/verify/VEIL-ELSEWHERE' });
    expect(aboutTarget('VEIL-UP', [])).toEqual({ kind: 'id-only', to: '/verify/VEIL-UP' });
    const fields = documentFieldsOf(top) as { title: string; holder: string; notes: string };
    for (const id of ['VEIL-PLANT', 'VEIL-ELSEWHERE'])
      for (const typed of [fields.title, fields.holder, 'Clone line 7'])
        expect(decodeURIComponent(aboutTarget(id, read.chain).to)).not.toContain(typed);
  });

  it('nothing typed into the address makes the page say where it was opened from', async () => {
    // Review of 16 Nov: "&as=ANY.TEXT" on a plain link made the page state, as fact, that another
    // record names this one as record ANY.TEXT. A link's text says nothing about that.
    const plain = documentCheckLink(top, 'https://test.veilcore.org');
    const read = await readDocumentLink(`${hashOf(plain)}&as=ANY.TEXT`);
    expect(read.ok).toBe(true);
    expect(read.ok && 'namedAs' in read).toBe(false);
    // The page a link in the chain opens is told by the app's own navigation, never by the address.
    const chained = await readDocumentLink(hashOf(documentChainLink(top, records, 'https://test.veilcore.org')));
    if (!chained.ok) throw new Error('unreadable');
    const target = aboutTarget('VEIL-UP', chained.chain, chained.fingerprint);
    expect(target.to).not.toMatch(/[&#]as=/);
    expect(target.state).toMatchObject({ namedAs: 'VEIL-UP', from: chained.fingerprint });
  });

  it('a link stuffed with a long chain costs little to show, and one past the limit is refused whole', async () => {
    // Review of 16 Nov: 40 carried documents made about 22 MB of link text on every draw, since
    // each link out repeated the whole chain. A link out now carries its own record only.
    const big = { ...documentFieldsOf(upstream), notes: 'n'.repeat(8_000) };
    const chain = Array.from({ length: 40 }, (_, i) => ({ id: `VEIL-${String(i).padStart(4, '0')}`, fields: big }));
    const about = chain.slice(0, 20).map((c) => ({ name: c.id, recordId: c.id }));
    const fields = { ...documentFieldsOf(top), about };
    const d = base64urlnopad.encode(new TextEncoder().encode(JSON.stringify({ v: 1, fields, chain })));
    const read = await readDocumentLink(`#d=${d}`);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const out = about.map((a) => aboutTarget(a.recordId, read.chain, read.fingerprint).to.length);
    expect(out.reduce((n, x) => n + x, 0)).toBeLessThan(1_000_000);
    // Past the limit: refused in plain words, nothing shown.
    const huge = base64urlnopad.encode(
      new TextEncoder().encode(JSON.stringify({ v: 1, fields, chain: [...chain, ...chain, ...chain] })),
    );
    expect(await readDocumentLink(`#d=${huge}`)).toEqual({ ok: false, why: 'too-large' });
    // And one is never made: the holder is told instead.
    const heavy = Array.from({ length: 45 }, (_, i) => ({
      ...upstream,
      id: `VEIL-H${String(i)}`,
      notes: 'n'.repeat(19_000),
    }));
    const head = held(
      'VEIL-HEAD',
      b.appRecord,
      heavy.slice(0, 20).map((h) => ({ name: 'x', recordId: h.id })),
    );
    const linked = heavy.map((h, i) =>
      i < 20 ? { ...h, document: { ...h.document, about: [{ name: 'y', recordId: `VEIL-H${String(i + 20)}` }] } } : h,
    );
    expect(() => documentChainLink(head as never, [head, ...linked] as never[], 'https://test.veilcore.org')).toThrow(
      /too large for one link/,
    );
  });

  it('a chain entry that is not well formed is dropped, and the record still checks', async () => {
    const payload = {
      v: 1,
      fields: documentFieldsOf(top),
      chain: [
        { id: 'VEIL-UP', fields: { ...documentFieldsOf(upstream), type: 'grow-batch' } },
        { id: 'bad id!', code: 'ab'.repeat(32) },
        { id: 'VEIL-PLANT', code: 'not hex' },
        { id: 'VEIL-PLANT', code: 'cd'.repeat(32) },
        { id: 'VEIL-PLANT', code: 'ef'.repeat(32) },
        'text',
        null,
      ],
    };
    const read = await readDocumentLink(
      `#d=${base64urlnopad.encode(new TextEncoder().encode(JSON.stringify(payload)))}&as=${encodeURIComponent('<b>x</b>')}`,
    );
    expect(read.ok).toBe(true);
    expect(read.ok && read.chain).toEqual([{ id: 'VEIL-PLANT', code: 'cd'.repeat(32) }]);
  });
});

describe('a sheet made from what was typed', () => {
  const input = {
    kind: 'grow-batch' as const,
    reference: 'B-0042',
    issued: '2026-11-10',
    site: 'Room  2',
    variety: 'Line 7',
    holder: 'Chain test holder',
    about: ['Clone line 7'],
  };
  it('is the same bytes for the same details, and holds no count', () => {
    expect(batchSheetText(input)).toBe(batchSheetText({ ...input }));
    expect(batchSheetText(input)).toBe(
      [
        'VeilCore batch sheet, version 1',
        'Made in the browser from what the holder typed. It holds no counts and no weights.',
        'Kind: grow-batch',
        'ID: B-0042',
        'Date: 2026-11-10',
        'Site: Room 2',
        'Variety: Line 7',
        'Held by: Chain test holder',
        'About: Clone line 7',
        '',
      ].join('\n'),
    );
    expect(batchSheetText({ ...input, site: 'Room 3' })).not.toBe(batchSheetText(input));
    expect(batchSheetName(input)).toBe('grow-batch-B-0042.txt');
    expect(batchSheetName({ kind: 'harvest-lot', reference: ' lot / 7 ' })).toBe('harvest-lot-lot-7.txt');
  });
  it('the site and variety go in the notes, before the holder’s own', () => {
    expect(chainNotes({ site: 'Site', variety: 'Variety' }, ' Room 2 ', 'Line 7', ' my notes ')).toBe(
      'Site: Room 2\nVariety: Line 7\nmy notes',
    );
    expect(chainNotes({ site: 'Site', variety: 'Variety' }, '', '', '')).toBe('');
  });
});
