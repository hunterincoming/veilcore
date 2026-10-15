// verify.html's checks, against the site's own (and the SDK's), record for record.
//
// The page has its own copy of the checks so it needs nothing from VeilCore. These tests
// load that copy exactly as the page runs it (the SDK's canonical.js, then verify-core.js)
// and require the same answer as the site's code for 24 practice records, old and
// key-bound, and for every way a record, proof or root can be tampered with.
// SPDX-License-Identifier: Apache-2.0

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
  checkAll: (ev: unknown, files?: { name: string; bytes: Uint8Array }[]) => Promise<Report>;
  checkFingerprint: (r: unknown) => Promise<Report['fingerprint']>;
  checkProof: (p: unknown, fp: string, root?: string) => Promise<Report['proof']>;
  checkKey: (k: unknown, f: unknown, ch: string, fp: string) => Promise<Report['key']>;
  checkSignature: (a: unknown, fp: string) => Promise<Report['signatures'][number]>;
  tagged: (tag: string, parts: string[]) => Promise<string>;
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
