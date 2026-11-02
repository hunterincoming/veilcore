// The evidence bundle of a document record (veilcore/document-profile.ts, SPEC 11.11): the files
// say "document" and list the sealed files with how to check one by hand; verify.html's own
// checks pass offline, also for a certificate whose numbers are sealed with it (a field set),
// and it says whether a file someone picks is byte for byte one the record seals. The holder
// may include the files themselves, but only ones the record seals. Test data only.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import type { InclusionProof } from 'veilcore-records';
import { fingerprintRecord } from '../commitment';
import { bindingForSecret } from '../key-binding';
import type { StrainRecord } from '../records';
import { DOCUMENT_PROFILE } from '../document-profile';
import { BundleRefusal, buildEvidence, bundleFiles, reconcile, type EvidenceOptions } from './bundle';
import { sealedNameOf, subjectOf } from './words';
import { loadPageVerifier, practiceBatch, practiceRecord, secretFor } from './test-records';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};
const NOW = new Date('2026-10-31T12:00:00Z');
const sha256 = async (b: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

const PERMIT = new TextEncoder().encode('Practice permit 0042 (test data)\n');
const ANNEX = new TextEncoder().encode('Practice annex (test data)\n');
const OTHER = new TextEncoder().encode('Not a sealed file (test data)\n');

type Page = {
  checkAll: (
    ev: unknown,
    files?: { name: string; bytes: Uint8Array }[],
  ) => Promise<{
    fingerprint: { ok: boolean; reason?: string | null };
    proof: { status: string };
    files: { name: string; is: string; ok?: boolean; sealedName?: string | null }[];
  }>;
};

/** A document record sealed as the site seals it, in a batch dated on mainnet. */
const docSetup = async (extra: Record<string, unknown> = {}, options: Partial<EvidenceOptions> = {}) => {
  const base = {
    id: 'VEIL-' + 'D4'.repeat(16),
    nonce: '7e'.repeat(32),
    keyBinding: bindingForSecret(secretFor(11)).keyBinding,
    profile: DOCUMENT_PROFILE,
    strainName: 'Practice permit 0042',
    bredBy: 'Example association (test data)',
    dateCreated: '2026-10-01',
    notes: '',
    loggedAt: 1_761_900_000_000,
    refId: 'P-0042',
    parents: [],
    photoFingerprints: [],
    document: {
      type: 'permit',
      issuer: 'Practice Authority',
      files: [
        { name: 'permit 0042.pdf', sha256: await sha256(PERMIT), size: PERMIT.length },
        { name: 'annex.pdf', sha256: await sha256(ANNEX), size: ANNEX.length },
      ],
      about: [],
    },
    licenseIds: [],
    ...extra,
  };
  const record = { ...base, recordFingerprint: await fingerprintRecord(base as never) } as unknown as StrainRecord;
  const batch = await practiceBatch([record, await practiceRecord(3)]);
  const proof = {
    ...batch.proofs[record.recordFingerprint],
    anchor: {
      chain: 'midnight',
      network: 'mainnet',
      contractAddress: '7a'.repeat(32),
      txHash: 'c3'.repeat(32),
      blockHeight: 7,
    },
  } as unknown as InclusionProof;
  const g = await reconcile(record.recordFingerprint, {
    source: 'evidence-route',
    registryFirstSeen: '2026-10-31T10:30:00.000Z',
    proof,
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      sealedAt: '2026-10-31T11:00:00.000Z',
      recordCount: 2,
      anchor: proof.anchor,
      earlierAnchors: null,
      opentimestamps: { available: false, status: 'none', calendars: [] },
    },
    ots: null,
    attestations: [],
  } as unknown as Parameters<typeof reconcile>[1]);
  const opts: EvidenceOptions = { includeKey: false, now: NOW, ...options };
  const ev = await buildEvidence(record, g, opts);
  const files = await bundleFiles(ev, g, opts);
  return { record, ev, files, dir: `${record.id}-evidence` };
};

describe('a document record’s evidence bundle', () => {
  it('is about a document: its title, its files and what a match does and doesn’t show', async () => {
    const { ev, files, dir } = await docSetup();
    expect(subjectOf(ev.record.sealedFields)).toBe('document');
    expect(sealedNameOf(ev.record.sealedFields)).toBe('Practice permit 0042');

    const readme = strFromU8(files[`${dir}/README.txt`]).replace(/\s+/g, ' ');
    expect(readme).toContain('VeilCore evidence bundle: Practice permit 0042');
    expect(readme).toContain("THE DOCUMENT'S FILES");
    expect(readme).toContain(`permit 0042.pdf, ${PERMIT.length} bytes, SHA-256 ${await sha256(PERMIT)}`);
    expect(readme).toContain('shasum -a 256');
    expect(readme).toContain('certutil -hashfile');
    expect(readme).toContain('No copy of the files is in this bundle');
    expect(readme).toMatch(/doesn't: that the document is genuine/);
    expect(readme).not.toMatch(/TIED TO THE|DNA report/);

    const html = strFromU8(files[`${dir}/EXAMINER-SUMMARY.html`]);
    for (const label of ['Title', 'Type', 'Issued by (the holder’s statement)', 'Reference', 'Held by'])
      expect(html).toContain(`<th scope="row">${label}</th>`);
    expect(html).toContain(`SHA-256 ${await sha256(ANNEX)}`);
    expect(html).toContain('That the document is genuine');
    expect(html).not.toMatch(/Plant name|Bred by/);

    const decl = strFromU8(files[`${dir}/DECLARATION-TEMPLATE.txt`]).replace(/\s+/g, ' ');
    expect(decl).toContain('the document this record describes');
    expect(decl).toContain('made an electronic record of the document "Practice permit 0042"');
    expect(decl).toContain(`annex.pdf, ${ANNEX.length} bytes, SHA-256 ${await sha256(ANNEX)}`);
  });

  it('verify.html checks it offline, and says whether a picked file is one it seals', async () => {
    const { ev } = await docSetup();
    const V = loadPageVerifier<Page>();
    const r = await V.checkAll(JSON.parse(JSON.stringify(ev)), [
      { name: 'from-them.pdf', bytes: ANNEX },
      { name: 'other.pdf', bytes: OTHER },
    ]);
    expect(r.fingerprint.ok).toBe(true);
    expect(r.proof.status).toBe('ok');
    expect(r.files).toMatchObject([
      { name: 'from-them.pdf', is: 'sealed file', ok: true, sealedName: 'annex.pdf' },
      { name: 'other.pdf', is: 'sealed file', ok: false },
    ]);
  });

  it('verify.html checks a certificate whose numbers are sealed with it (a field set), and refuses half of one', async () => {
    const fs = { fieldSchema: 'b2'.repeat(32), fieldSetRoot: '5a'.repeat(32) };
    const { ev } = await docSetup(fs);
    expect(ev.record.sealedFields).toMatchObject(fs);
    const V = loadPageVerifier<Page>();
    expect((await V.checkAll(JSON.parse(JSON.stringify(ev)))).fingerprint.ok).toBe(true);
    // Without the field-set rule the page would compute another proof code: a changed root does.
    const changed = JSON.parse(JSON.stringify(ev)) as { record: { sealedFields: Record<string, unknown> } };
    changed.record.sealedFields.fieldSetRoot = '5b'.repeat(32);
    expect((await V.checkAll(changed)).fingerprint.ok).toBe(false);
    const half = JSON.parse(JSON.stringify(ev)) as { record: { sealedFields: Record<string, unknown> } };
    delete half.record.sealedFields.fieldSchema;
    expect((await V.checkAll(half)).fingerprint.ok).toBe(false);
  });

  it('the holder may include the files, only ones the record seals', async () => {
    const { ev, files, dir } = await docSetup({}, { documentFiles: [{ name: 'my copy.pdf', bytes: PERMIT }] });
    expect(ev.documentFiles).toEqual([
      { path: 'document/files/permit 0042.pdf', sha256: await sha256(PERMIT), sealedName: 'permit 0042.pdf' },
    ]);
    expect(files[`${dir}/document/files/permit 0042.pdf`]).toEqual(PERMIT);
    const readme = strFromU8(files[`${dir}/README.txt`]).replace(/\s+/g, ' ');
    expect(readme).toContain('A copy of 1 of them is in document/files/');
    await expect(docSetup({}, { documentFiles: [{ name: 'other.pdf', bytes: OTHER }] })).rejects.toBeInstanceOf(
      BundleRefusal,
    );
  });
});

describe('a document file’s name in the zip', () => {
  it('stays readable in any language, and is never a path, a hidden file or a device name', async () => {
    const { documentFileName } = await import('./bundle');
    expect(documentFileName('Resolución 41.pdf')).toBe('Resolución 41.pdf');
    expect(documentFileName('契約書.pdf')).toBe('契約書.pdf');
    expect(documentFileName('../../etc/passwd')).toBe('-..-etc-passwd.bin');
    expect(documentFileName('..\\..\\evil.pdf')).toBe('-..-evil.pdf');
    expect(documentFileName('.hidden.pdf')).toBe('hidden.pdf');
    expect(documentFileName('CON.pdf')).toBe('_CON.pdf');
    expect(documentFileName('a‮fdp.exe')).toBe('afdp.exe');
    expect(documentFileName('.pdf')).toBe('document.pdf');
    expect(documentFileName('')).toBe('document.bin');
    expect(documentFileName(`${'x'.repeat(300)}.PDF`)).toBe(`${'x'.repeat(110)}.pdf`);
  });

  it('goes into the zip in UTF-8, so a zip tool shows it as written', async () => {
    const PERMIT_ES = new TextEncoder().encode('Resolución (test data)\n');
    const name = 'Resolución 41.pdf';
    const { files, dir } = await docSetupNamed(name, PERMIT_ES);
    const { zipFiles } = await import('./bundle');
    const zip = zipFiles(files, NOW);
    const { unzipSync } = await import('fflate');
    expect(unzipSync(zip)[`${dir}/document/files/${name}`]).toEqual(PERMIT_ES);
  });
});

/** A one-file document whose file has this name, with a copy of it included. */
const docSetupNamed = async (name: string, bytes: Uint8Array) => {
  const files = [{ name, sha256: await sha256(bytes), size: bytes.length }];
  return docSetup(
    { document: { type: 'permit', issuer: '', files, about: [] } },
    { documentFiles: [{ name: 'x.pdf', bytes }] },
  );
};
