// verify.html's checks, against the site's own (and the SDK's), record for record.
//
// The page has its own copy of the checks so it needs nothing from VeilCore. These tests
// load that copy exactly as the page runs it (the SDK's canonical.js, then verify-core.js)
// and require the same answer as the site's code for 24 practice records, old and
// key-bound, and for every way a record, proof or root can be tampered with.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateKeypair, signAttestation, signRetraction, verifyAttestation, verifyInclusion } from 'veilcore-records';
import type { InclusionProof } from 'veilcore-records';
import {
  committedRecordFields,
  contentHashOf,
  fingerprintRecord,
  pairingFingerprintOfSha,
  canonicalise,
} from '../commitment';
import { bindingForSecret, keyMatchesRecord } from '../key-binding';
import { checkProof } from '../proofs';
import type { StrainRecord } from '../records';
import { canonicalScript, embedJson, verifyPageHtml } from './verify-page';
import { loadPageVerifier, practiceBatch, practiceRecords, RECORD_COUNT, secretFor } from './test-records';
import { custodyDigest } from '../transfers';
import { custodyDifferences } from '../custody';
import { CROSS_ARRIVAL, CROSS_DIGEST, CROSS_SAMPLE } from '../custody-vectors';

type Report = {
  fingerprint: {
    ok: boolean;
    form: string | null;
    computed: string | null;
    contentHash: string | null;
    canonicalMatches: boolean | null;
  };
  proof: { status: 'ok' | 'fail' | 'none'; root?: string; reason?: string };
  key: { status: 'ok' | 'fail' | 'absent' };
  pairing: { status: string };
  signatures: { signature: string; aboutThisRecord: boolean; retraction: { signature: string } | null }[];
  lookups: {
    root: string | null;
    midnight: { txHash: string; network: string; root: string; current: boolean }[];
    bitcoin: unknown;
  };
  files: { is: string; ok?: boolean }[];
};
type Verifier = {
  checkAll: (
    ev: unknown,
    files?: { name: string; bytes: Uint8Array }[],
    opts?: { ots?: Uint8Array },
  ) => Promise<Report>;
  checkFingerprint: (r: unknown) => Promise<Report['fingerprint']>;
  checkProof: (p: unknown, fp: string, root?: string) => Promise<Report['proof']>;
  checkKey: (k: unknown, f: unknown, ch: string, fp: string) => Promise<Report['key']>;
  checkSignature: (a: unknown, fp: string) => Promise<Report['signatures'][number]>;
  tagged: (tag: string, parts: string[]) => Promise<string>;
  datable: (report: unknown) => { ok: boolean; failed: string[]; notBatched: boolean };
  readStamp: (bytes: Uint8Array, root: string | null) => Promise<Stamp>;
  parseOts: (bytes: Uint8Array) => { digest: string; attestations: { kind: string; height?: number; uri?: string }[] };
  utc: (t: unknown) => string | null;
};
type Stamp = {
  status: 'bitcoin' | 'pending' | 'other-root' | 'unreadable';
  reason?: string;
  bitcoin?: { height: number; merkleRoot: string | null }[];
  pending?: string[];
};

/** The page's scripts, run as the page runs them: canonical.js, then the checks. */
const V = loadPageVerifier<Verifier>();

const site = async (r: StrainRecord, proof: unknown) => ({
  integrity: (await fingerprintRecord({ ...r, nonce: r.nonce ?? '' })) === r.recordFingerprint,
  proof: (await checkProof(r.recordFingerprint, proof)).status !== 'none',
});

const evidenceOf = (r: StrainRecord, proof: InclusionProof | null, root?: string) => ({
  record: {
    id: r.id,
    fingerprint: r.recordFingerprint,
    sealedFields: committedRecordFields({ ...r, nonce: r.nonce ?? '' }),
    canonical: canonicalise(committedRecordFields({ ...r, nonce: r.nonce ?? '' })),
  },
  proof,
  batch: proof ? { batchId: proof.batchId, root: root ?? proof.root, anchor: null } : null,
});

const flip = (h: string) => (h[0] === '0' ? '1' : '0') + h.slice(1);

describe('verify.html checks the same way the site does', async () => {
  const records = await practiceRecords();
  const batch = await practiceBatch(records);

  it(`covers ${RECORD_COUNT} records, old and key-bound`, () => {
    expect(records.length).toBeGreaterThanOrEqual(20);
    expect(records.filter((r) => r.keyBinding).length).toBeGreaterThanOrEqual(8);
    expect(records.filter((r) => !r.keyBinding).length).toBeGreaterThanOrEqual(8);
  });

  it('every genuine record: "Fingerprint matches" and "Proof leads to the batch root", as on the site', async () => {
    for (const r of records) {
      const proof = batch.proofs[r.recordFingerprint];
      const ours = await site(r, proof);
      const page = await V.checkAll(evidenceOf(r, proof));
      expect(ours, r.strainName).toEqual({ integrity: true, proof: true });
      expect(page.fingerprint.ok, r.strainName).toBe(true);
      expect(page.fingerprint.computed).toBe(await fingerprintRecord({ ...r, nonce: r.nonce ?? '' }));
      expect(page.fingerprint.contentHash).toBe(await contentHashOf({ ...r, nonce: r.nonce ?? '' }));
      expect(page.fingerprint.form).toBe(r.keyBinding ? 'key-bound' : 'content');
      expect(page.fingerprint.canonicalMatches).toBe(true);
      expect(page.proof.status, r.strainName).toBe('ok');
      expect(page.proof.root).toBe(batch.root);
      expect(await verifyInclusion(proof)).toBe(true);
    }
  });

  it('a tampered record: both say it does not match, for every record', async () => {
    for (const r of records) {
      const tampered = { ...r, strainName: `${r.strainName} (edited)` };
      const proof = batch.proofs[r.recordFingerprint];
      const ours = await site(tampered, proof);
      const page = await V.checkAll(evidenceOf(tampered, proof));
      expect(ours.integrity).toBe(false);
      expect(page.fingerprint.ok).toBe(false);
      // The proof is for the genuine fingerprint, not the tampered one's.
      expect(page.proof.status).toBe('fail');
      expect((await checkProof(page.fingerprint.computed ?? '', proof)).status).toBe('none');
    }
  });

  it('a tampered key binding, nonce or stated fingerprint: no match', async () => {
    const bound = records.find((r) => r.keyBinding) as StrainRecord;
    const old = records.find((r) => !r.keyBinding) as StrainRecord;
    const cases: StrainRecord[] = [
      { ...bound, keyBinding: flip(bound.keyBinding as string) },
      { ...old, nonce: flip(old.nonce as string) },
      { ...old, recordFingerprint: flip(old.recordFingerprint) },
      // An old record presented as key-bound, and the reverse: different fingerprints.
      { ...old, keyBinding: bindingForSecret(secretFor(0)).keyBinding },
      { ...bound, keyBinding: undefined },
    ];
    for (const r of cases) {
      const page = await V.checkFingerprint(evidenceOf(r, null).record);
      const ours = await site(r, null);
      expect(page.ok).toBe(false);
      expect(ours.integrity).toBe(false);
    }
    // Canonical bytes that don't match the fields.
    const ev = evidenceOf(old, null);
    expect((await V.checkFingerprint({ ...ev.record, canonical: ev.record.canonical + ' ' })).ok).toBe(false);
    // A keyBinding that isn't 64 lowercase hex is refused, never hashed.
    const bad = await V.checkFingerprint({
      ...ev.record,
      sealedFields: { ...ev.record.sealedFields, keyBinding: 'AB'.repeat(32) },
    });
    expect(bad.ok).toBe(false);
    expect(bad.computed).toBe(null);
  });

  it('a wrong proof: both refuse it (a sibling changed, a direction flipped, another record’s proof, too deep)', async () => {
    let checked = 0;
    for (const r of records) {
      const proof = batch.proofs[r.recordFingerprint];
      if (proof.path.length === 0) continue;
      const variants: InclusionProof[] = [
        { ...proof, path: proof.path.map((s, i) => (i === 0 ? { ...s, sibling: flip(s.sibling) } : s)) },
        { ...proof, path: proof.path.map((s, i) => (i === 0 ? { ...s, siblingIsLeft: !s.siblingIsLeft } : s)) },
        { ...proof, path: proof.path.slice(1) },
        { ...proof, root: flip(proof.root) },
        { ...proof, path: Array.from({ length: 65 }, () => proof.path[0]) },
      ];
      for (const v of variants) {
        expect((await V.checkProof(v, r.recordFingerprint)).status).toBe('fail');
        expect((await checkProof(r.recordFingerprint, v)).status).toBe('none');
      }
      const other = records.find((o) => o.recordFingerprint !== r.recordFingerprint) as StrainRecord;
      const otherProof = batch.proofs[other.recordFingerprint];
      expect((await V.checkProof(otherProof, r.recordFingerprint)).status).toBe('fail');
      expect((await checkProof(r.recordFingerprint, otherProof)).status).toBe('none');
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('a wrong root: a proof that folds to its own root but not to the bundle’s batch root is refused', async () => {
    const r = records[0];
    const proof = batch.proofs[r.recordFingerprint];
    const page = await V.checkAll(evidenceOf(r, proof, flip(batch.root)));
    expect(page.fingerprint.ok).toBe(true);
    expect(page.proof.status).toBe('fail');
    expect(page.proof.reason).toMatch(/not to this bundle’s batch root/);
    // A whole other batch with its own valid root: folds, but to the wrong root.
    const elsewhere = await practiceBatch([r, records[1]]);
    const p2 = elsewhere.proofs[r.recordFingerprint];
    expect(await verifyInclusion(p2)).toBe(true);
    expect((await V.checkAll(evidenceOf(r, p2, batch.root))).proof.status).toBe('fail');
  });

  it('no proof: "not in a batch yet", never a pass or a fail', async () => {
    const page = await V.checkAll(evidenceOf(records[0], null));
    expect(page.proof.status).toBe('none');
    expect(page.lookups.root).toBe(null);
  });

  it('the key: matched exactly as the site matches a link’s key', async () => {
    for (const [n, r] of records.entries()) {
      if (!r.keyBinding) continue;
      const b = bindingForSecret(secretFor(n));
      const fields = committedRecordFields({ ...r, nonce: r.nonce ?? '' });
      const contentHash = await contentHashOf({ ...r, nonce: r.nonce ?? '' });
      const good = await V.checkKey(
        { identity: b.identity, keySalt: b.keySalt },
        fields,
        contentHash,
        r.recordFingerprint,
      );
      expect(good.status).toBe('ok');
      expect(keyMatchesRecord(b.identity, { fingerprint: r.recordFingerprint, keySalt: b.keySalt, contentHash })).toBe(
        true,
      );
      const other = bindingForSecret(secretFor(n + 1000));
      const bad = await V.checkKey(
        { identity: other.identity, keySalt: b.keySalt },
        fields,
        contentHash,
        r.recordFingerprint,
      );
      expect(bad.status).toBe('fail');
      expect(
        keyMatchesRecord(other.identity, { fingerprint: r.recordFingerprint, keySalt: b.keySalt, contentHash }),
      ).toBe(false);
    }
    const old = records.find((r) => !r.keyBinding) as StrainRecord;
    const b = bindingForSecret(secretFor(0));
    expect(
      (
        await V.checkKey(
          b,
          committedRecordFields({ ...old, nonce: old.nonce ?? '' }),
          'aa'.repeat(32),
          old.recordFingerprint,
        )
      ).status,
    ).toBe('fail');
  });

  it('the lab report pairing: the page’s H(commit, sha) is the contract’s commit() the site uses', async () => {
    for (let i = 0; i < 12; i++) {
      const sha = await V.tagged('veilcore:v1:keysalt', [secretFor(i)]);
      expect(await V.tagged('veilcore:v1:commit', [sha])).toBe(pairingFingerprintOfSha(sha));
    }
  });

  it('lab signatures: valid, tampered, another record’s, withdrawn, and a small-order key, as the SDK says', async () => {
    const r = records[2];
    const kp = await generateKeypair();
    const base = {
      attestationId: 'att_test_1',
      type: 'laboratory-report',
      subjectCommitment: r.recordFingerprint,
      documentHash: 'ab'.repeat(32),
      hashAlgorithm: 'sha256' as const,
      issuedAt: '2026-10-15T12:00:00Z',
      attester: { publicKey: kp.publicKey, displayName: 'Test Lab (practice)' },
    };
    const signed = await signAttestation(base, kp.privateKey);
    const cases: { a: Record<string, unknown>; fp: string }[] = [
      { a: signed, fp: r.recordFingerprint },
      { a: { ...signed, documentHash: 'cd'.repeat(32) }, fp: r.recordFingerprint },
      { a: { ...signed, attester: { ...signed.attester, displayName: 'Accredited Lab' } }, fp: r.recordFingerprint },
      { a: { ...signed, attester: { ...signed.attester, publicKey: '00'.repeat(32) } }, fp: r.recordFingerprint },
      { a: { ...signed, signature: undefined }, fp: r.recordFingerprint },
      { a: { ...signed, attester: { ...signed.attester, displayName: null } }, fp: r.recordFingerprint },
    ];
    for (const { a, fp } of cases) {
      const page = await V.checkSignature(a, fp);
      const sdk = await verifyAttestation(a as unknown as typeof signed);
      expect(page.signature === 'valid', JSON.stringify(a).slice(0, 80)).toBe(sdk);
    }
    // About another record: the signature checks, but says nothing about this one.
    const elsewhere = await V.checkSignature(signed, records[3].recordFingerprint);
    expect(elsewhere.signature).toBe('valid');
    expect(elsewhere.aboutThisRecord).toBe(false);
    // Withdrawn by the same key: counted; a withdrawal by another key: ignored.
    const retraction = await signRetraction(
      {
        attestationId: signed.attestationId,
        attesterPublicKey: kp.publicKey,
        reason: 'superseded',
        retractedAt: '2026-10-16T00:00:00Z',
      },
      kp.privateKey,
    );
    expect((await V.checkSignature({ ...signed, retraction }, r.recordFingerprint)).retraction?.signature).toBe(
      'valid',
    );
    const other = await generateKeypair();
    const forged = await signRetraction({ ...retraction, attesterPublicKey: other.publicKey }, other.privateKey);
    expect((await V.checkSignature({ ...signed, retraction: forged }, r.recordFingerprint)).retraction?.signature).toBe(
      'invalid',
    );
  });

  it('what to look up: the current anchor first, earlier ones after, each with the batch root', async () => {
    const r = records[0];
    const proof = batch.proofs[r.recordFingerprint];
    const ev = {
      ...evidenceOf(r, proof),
      batch: {
        batchId: proof.batchId,
        root: batch.root,
        anchor: {
          chain: 'midnight',
          network: 'preprod',
          txHash: 'c3'.repeat(32),
          contractAddress: '7a'.repeat(32),
          blockHeight: 9,
        },
        earlierAnchors: [
          { chain: 'midnight', network: 'preview', txHash: 'd4'.repeat(32), replacedAt: '2026-10-11T00:00:00Z' },
        ],
        opentimestamps: { available: true, status: 'pending', file: 'proof/root.bin.ots' },
      },
    };
    const page = await V.checkAll(ev, [
      { name: 'root.bin', bytes: Uint8Array.from(batch.root.match(/../g) ?? [], (b) => parseInt(b, 16)) },
      { name: 'Lab report.pdf', bytes: new Uint8Array([1, 2, 3]) },
    ]);
    expect(page.lookups.midnight.map((m) => [m.network, m.txHash, m.current, m.root])).toEqual([
      ['preprod', 'c3'.repeat(32), true, batch.root],
      ['preview', 'd4'.repeat(32), false, batch.root],
    ]);
    expect(page.lookups.bitcoin).toMatchObject({ status: 'pending', file: 'proof/root.bin.ots' });
    expect(page.files[0]).toMatchObject({ is: 'root.bin', ok: true });
  });
});

describe('the page itself', () => {
  it('is one file: no address it could load from, and a policy that forbids loading anything', async () => {
    const [r] = await practiceRecords(1);
    const html = verifyPageHtml(evidenceOf(r, null));
    expect(html).toMatch(/Content-Security-Policy" content="default-src 'none'/);
    expect(html).not.toMatch(/\bsrc=|\bhref=|@import|url\(/i);
    expect(html).not.toMatch(/https?:\/\/(?!midnightexplorer|preprod\.midnightexplorer|preview\.midnightexplorer)/);
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/);
    expect(html).not.toContain('@@');
  });

  it('carries the SDK’s canonicalisation unchanged but for its export keyword', () => {
    const s = canonicalScript();
    expect(s).toMatch(/^const canonicalise = \(value\) => canon\(value, new Set\(\)\);$/m);
    expect(s).not.toMatch(/^\s*(export|import)\s/m);
  });

  it('no value in the evidence can break out of its element', async () => {
    const [r] = await practiceRecords(1);
    const nasty = { ...r, strainName: '</script><script>alert(1)</script><!--' };
    const ev = evidenceOf(nasty, null);
    const html = verifyPageHtml(ev);
    const start = html.indexOf('id="veilcore-evidence">') + 'id="veilcore-evidence">'.length;
    const data = html.slice(start, html.indexOf('</script>', start));
    expect(data).not.toContain('<');
    expect(JSON.parse(data)).toEqual(JSON.parse(JSON.stringify(ev)));
    expect(embedJson(' ')).toBe('"\\u2028"');
  });
});

describe('what the page lets you date', () => {
  it('only a bundle whose fingerprint, proof and (if included) key all check gets the look-up steps', async () => {
    const records = await practiceRecords(4);
    const batch = await practiceBatch(records);
    const r = records.find((x) => x.keyBinding) as StrainRecord;
    const n = records.indexOf(r);
    const proof = batch.proofs[r.recordFingerprint];
    const b = bindingForSecret(secretFor(n));
    const key = { identity: b.identity, keySalt: b.keySalt };
    const good = await V.checkAll({ ...evidenceOf(r, proof), key });
    expect(V.datable(good)).toEqual({ ok: true, failed: [], notBatched: false });

    const tampered = await V.checkAll(evidenceOf({ ...r, notes: 'edited later' }, proof));
    expect(V.datable(tampered).ok).toBe(false);
    expect(V.datable(tampered).failed).toEqual([
      'the fingerprint does not match the sealed fields',
      'the proof does not lead to the batch root',
    ]);
    const wrongRoot = await V.checkAll(evidenceOf(r, proof, flip(batch.root)));
    expect(V.datable(wrongRoot).failed).toEqual(['the proof does not lead to the batch root']);
    const wrongKey = await V.checkAll({ ...evidenceOf(r, proof), key: { ...key, identity: flip(key.identity) } });
    expect(V.datable(wrongKey).failed).toEqual(['the key does not match the record']);
    // Not in a batch: nothing failed, but nothing to date it with either.
    expect(V.datable(await V.checkAll(evidenceOf(r, null)))).toEqual({ ok: false, failed: [], notBatched: true });
  });

  it('prints times as the site does: UTC, labelled', () => {
    expect(V.utc('2026-10-15T11:00:59.999Z')).toBe('2026-10-15 11:00 UTC');
    expect(V.utc('not a date')).toBe(null);
    expect(V.utc(undefined)).toBe(null);
  });
});

describe('the Bitcoin stamp file, read by the page', () => {
  const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../scripts/fixtures/ots');
  const fixture = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIX, name)));
  const expected = JSON.parse(fs.readFileSync(path.join(FIX, 'expected.json'), 'utf8')) as Record<
    string,
    {
      fileDigestHex: string;
      attestations: { kind: string; height?: number; merkleRootExplorer?: string; uri?: string }[];
    }
  >;
  const hexOf = (b: Uint8Array) => Buffer.from(b).toString('hex');
  const MAGIC = Buffer.concat([
    Buffer.from([0]),
    Buffer.from('OpenTimestamps'),
    Buffer.from([0, 0]),
    Buffer.from('Proof'),
    Buffer.from([0, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
  ]);
  const sha = (b: Buffer) => createHash('sha256').update(b).digest();
  const leb = (n: number) => {
    const out: number[] = [];
    do {
      let b = n & 0x7f;
      n = Math.floor(n / 128);
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    return Buffer.from(out);
  };
  /** A stamp: SHA-256(root) → append x → sha256 → Bitcoin block `height` (and a pending branch). */
  const makeStamp = (root: Buffer, height: number, withPending = false) => {
    const x = Buffer.from('11'.repeat(16), 'hex');
    const btc = Buffer.concat([
      Buffer.from([0x00]),
      Buffer.from('0588960d73d71901', 'hex'),
      leb(leb(height).length),
      leb(height),
    ]);
    const uri = Buffer.from('https://a.pool.opentimestamps.org');
    const pending = Buffer.concat([
      Buffer.from([0x00]),
      Buffer.from('83dfe30d2ef90c8e', 'hex'),
      leb(uri.length + 1),
      leb(uri.length),
      uri,
    ]);
    const tail = Buffer.concat([Buffer.from([0xf0]), leb(x.length), x, Buffer.from([0x08]), btc]);
    const body = withPending ? Buffer.concat([Buffer.from([0xff]), pending, tail]) : tail;
    const merkleInternal = sha(Buffer.concat([sha(root), x]));
    return { file: new Uint8Array(Buffer.concat([MAGIC, Buffer.from([1, 0x08]), sha(root), body])), merkleInternal };
  };

  it('reads the format exactly as the OpenTimestamps library does (the stamp check script’s fixtures)', async () => {
    for (const name of ['synthetic', 'pending']) {
      const root = fixture(`${name}.root.bin`);
      const p = V.parseOts(fixture(`${name}.root.bin.ots`));
      expect(p.digest).toBe(expected[name].fileDigestHex);
      expect(p.attestations.map((a) => a.kind).sort()).toEqual(expected[name].attestations.map((a) => a.kind).sort());
      const st = await V.readStamp(fixture(`${name}.root.bin.ots`), hexOf(root));
      if (name === 'synthetic') {
        expect(st.status).toBe('bitcoin');
        expect(st.bitcoin).toEqual([
          { height: 971004, merkleRoot: expected.synthetic.attestations[0].merkleRootExplorer },
        ]);
        expect(st.pending).toEqual(['https://alice.btc.calendar.opentimestamps.org']);
      } else {
        expect(st).toEqual({
          status: 'pending',
          bitcoin: [],
          pending: ['https://bob.btc.calendar.opentimestamps.org'],
        });
      }
    }
    const b586 = V.parseOts(fixture('block586.root.bin.ots'));
    expect(b586.digest).toBe(expected.block586.fileDigestHex);
    expect(b586.attestations.filter((a) => a.kind === 'bitcoin').map((a) => a.height)).toEqual([586]);
  });

  it('names the block and the merkle root the file leads to; never the registry’s word', async () => {
    const root = Buffer.from('ab'.repeat(32), 'hex');
    const { file, merkleInternal } = makeStamp(root, 865000, true);
    const st = await V.readStamp(file, hexOf(root));
    expect(st).toEqual({
      status: 'bitcoin',
      bitcoin: [{ height: 865000, merkleRoot: Buffer.from(merkleInternal).reverse().toString('hex') }],
      pending: ['https://a.pool.opentimestamps.org'],
    });
  });

  it('a stamp about another file, a broken file or no file is never read as a date', async () => {
    const root = Buffer.from('ab'.repeat(32), 'hex');
    const { file } = makeStamp(root, 865000);
    expect((await V.readStamp(file, 'cd'.repeat(32))).status).toBe('other-root');
    expect((await V.readStamp(file.subarray(0, file.length - 2), hexOf(root))).status).toBe('unreadable');
    expect((await V.readStamp(new Uint8Array([1, 2, 3]), hexOf(root))).status).toBe('unreadable');
    const extra = new Uint8Array([...file, 0]);
    expect((await V.readStamp(extra, hexOf(root))).reason).toMatch(/unexpected bytes/);
    expect((await V.readStamp(file, null)).status).toBe('unreadable');
  });

  it('checkAll reads the embedded stamp, and a chosen root.bin.ots', async () => {
    const [r] = await practiceRecords(1);
    const batch = await practiceBatch([r]);
    const proof = batch.proofs[r.recordFingerprint];
    const root = Buffer.from(batch.root, 'hex');
    const { file } = makeStamp(root, 900001);
    const ev = evidenceOf(r, proof);
    const withEmbedded = (await V.checkAll(ev, [], { ots: file })) as Report & { stamp: Stamp };
    expect(withEmbedded.stamp).toMatchObject({ status: 'bitcoin', bitcoin: [{ height: 900001 }] });
    const chosen = (await V.checkAll(ev, [{ name: 'root.bin.ots', bytes: file }])) as Report & {
      stamp: Stamp;
      files: { is: string; ok?: boolean }[];
    };
    expect(chosen.files[0]).toMatchObject({ is: 'root.bin.ots', ok: true });
    expect(chosen.stamp).toMatchObject({ status: 'bitcoin' });
  });
});

describe('the sample details on deliveries, rechecked by the page (round 2 of the 15 Oct review)', async () => {
  type CustodyCheck = {
    transferId: string;
    status: string;
    computed: string | null;
    carried: string | null;
    stated: string | null;
    differences: string[];
  };
  const CV = loadPageVerifier<{ checkAll: (ev: unknown) => Promise<Report & { custody: CustodyCheck[] }> }>();
  const records = await practiceRecords();
  const r = records[0];
  const sample = {
    sampleId: 'BLU-07',
    sealNumber: '4471',
    takenFrom: 'Mother M3',
    takenOn: '2026-10-14',
    witness: 'J. Doe',
  };
  const arrival = {
    sampleId: 'BLU-07',
    sealNumber: '4417',
    sealIntact: 'yes' as const,
    arrivedOn: '2026-10-15',
    condition: 'Cold\n\nbag dry',
  };
  const digest = await custodyDigest('TR-0A1B2C3D', sample, arrival);
  const lab = await generateKeypair();
  const receipt = await signAttestation(
    {
      attestationId: `att_${'ab'.repeat(8)}_sc1_${digest}`,
      type: 'chain-of-custody',
      subjectCommitment: r.recordFingerprint,
      documentHash: 'e1'.repeat(32),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-10-15T12:30:00Z',
      attester: { publicKey: lab.publicKey, displayName: 'Practice Lab' },
    },
    lab.privateKey,
  );
  const entry = {
    transferId: 'TR-0A1B2C3D',
    received: true,
    receiptAttestationId: receipt.attestationId,
    covered: 'covered',
    sample,
    arrival,
    differences: ['Seal number differs: sent 4471, received 4417'],
  };
  const run = async (custody: unknown[], signatures: unknown[] = [receipt]) =>
    (await CV.checkAll({ ...evidenceOf(r, null), signatures, custody })).custody;

  it('works the digest out again, as the site and the registry do, and finds it in the signed receipt id', async () => {
    const [c] = await run([entry]);
    expect(c.computed).toBe(digest);
    expect(c.carried).toBe(digest);
    expect(c.status).toBe('covered');
    expect(c.differences).toEqual(custodyDifferences(sample, arrival));
    // The registry's own vector (sample-custody.test.ts CROSS_CHECK) gives the same value here.
    const [x] = await run(
      [{ ...entry, sample: CROSS_SAMPLE, arrival: CROSS_ARRIVAL, receiptAttestationId: `att_x_sc1_${CROSS_DIGEST}` }],
      [],
    );
    expect(x.computed).toBe(CROSS_DIGEST);
  });

  it('a value changed in the bundle, or by the lab after signing, is "changed", whatever the bundle says', async () => {
    const [c] = await run([{ ...entry, arrival: { ...arrival, sealNumber: '4471' } }]);
    expect(c.status).toBe('changed');
    expect(c.stated).toBe('covered');
    expect(c.differences).toEqual([]);
  });

  it('no receipt signature here, a forged or withdrawn one, an older receipt, an unused code', async () => {
    expect((await run([entry], []))[0].status).toBe('unsigned');
    expect((await run([entry], [{ ...receipt, issuedAt: '2020-01-01T00:00:00Z' }]))[0].status).toBe('unsigned');
    const withdrawn = await signRetraction(
      {
        attestationId: receipt.attestationId,
        attesterPublicKey: lab.publicKey,
        reason: 'issued-in-error',
        retractedAt: '2026-10-16T00:00:00Z',
      },
      lab.privateKey,
    );
    expect((await run([entry], [{ ...receipt, retraction: withdrawn }]))[0].status).toBe('unsigned');
    const old = await signAttestation(
      {
        attestationId: 'att_0123456789abcdef',
        type: 'chain-of-custody',
        subjectCommitment: r.recordFingerprint,
        documentHash: 'e1'.repeat(32),
        hashAlgorithm: 'sha256',
        issuedAt: '2026-10-15T12:30:00Z',
        attester: { publicKey: lab.publicKey },
      },
      lab.privateKey,
    );
    expect((await run([{ ...entry, receiptAttestationId: old.attestationId }], [old]))[0].status).toBe('not-covered');
    expect((await run([{ ...entry, received: false, receiptAttestationId: null }], []))[0].status).toBe('never-used');
    expect((await run([{ ...entry, sample: { sampleId: 7 } }]))[0].status).toBe('malformed');
  });

  it('the page shows the values and the result, and the summary points to it', () => {
    const html = verifyPageHtml({ ...evidenceOf(r, null), signatures: [receipt], custody: [entry] });
    expect(html).toContain('id="custody"');
    expect(html).toContain('veilcore/sample-custody/v1');
    expect(html).toContain('the key itself is in this bundle only if the holder included it');
  });
});
