// The evidence bundle of an animal record (veilcore/animal-profile.ts): the files say "animal"
// where a plant's say "plant", label the animal's sealed fields (Individual ID, Sire, Dam), and
// verify.html's own checks pass on it offline, as for any record. Test data only.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { generateKeypair, signAttestation } from 'veilcore-records';
import type { InclusionProof } from 'veilcore-records';
import { fingerprintRecord, pairingFingerprintOfSha } from '../commitment';
import { bindingForSecret } from '../key-binding';
import type { StrainRecord } from '../records';
import { ANIMAL_PROFILE } from '../animal-profile';
import { buildEvidence, bundleFiles, reconcile } from './bundle';
import { fieldText } from './examiner';
import { sealedNameOf, subjectOf } from './words';
import { loadPageVerifier, practiceBatch, practiceRecord, secretFor } from './test-records';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};
const NOW = new Date('2026-10-16T12:00:00Z');
const sha256 = async (b: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

/** An animal record, sealed as the site seals it, with a DNA report saved and a lab's signature on it. */
const animalSetup = async () => {
  const report = new TextEncoder().encode('practice DNA report for an animal, test data');
  const fileSha = await sha256(report);
  const base = {
    id: 'VEIL-' + 'A1'.repeat(16),
    nonce: '6d'.repeat(32),
    keyBinding: bindingForSecret(secretFor(9)).keyBinding,
    profile: ANIMAL_PROFILE,
    strainName: 'Practice Cow One',
    bredBy: 'Example Farm (test data)',
    dateCreated: '2024-03-15',
    notes: 'Test data, not a real animal.',
    loggedAt: 1_760_600_000_000,
    taxon: 'Cattle (Bos taurus)',
    refId: '0000000017',
    parents: [
      { role: 'sire' as const, name: 'Practice Sire', individualId: '0000000025' },
      { role: 'dam' as const, name: 'Practice Dam', individualId: '0000000033' },
    ],
    photoFingerprints: [],
    animal: { breed: 'Japanese Black', idScheme: 'Japan cattle ID (10 digits)', sex: 'female' as const, herd: '' },
    licenseIds: [],
  };
  const record: StrainRecord = {
    ...base,
    recordFingerprint: await fingerprintRecord(base),
    dnaFingerprint: pairingFingerprintOfSha(fileSha),
    dnaFileName: 'DNA report.pdf',
    dnaFileSha256: fileSha,
    dnaPairedAt: Date.parse('2026-10-16T10:00:00Z'),
  };
  const batch = await practiceBatch([record, await practiceRecord(3)]);
  const proof = {
    ...batch.proofs[record.recordFingerprint],
    anchor: {
      chain: 'midnight',
      network: 'preprod',
      contractAddress: '7a'.repeat(32),
      txHash: 'c3'.repeat(32),
      blockHeight: 7,
    },
  } as unknown as InclusionProof;
  const kp = await generateKeypair();
  const signed = await signAttestation(
    {
      attestationId: 'att_animal_1',
      type: 'laboratory-report',
      subjectCommitment: record.recordFingerprint,
      documentHash: fileSha,
      hashAlgorithm: 'sha256',
      issuedAt: '2026-10-16T09:00:00Z',
      attester: { publicKey: kp.publicKey, displayName: 'Practice Lab' },
    },
    kp.privateKey,
  );
  const g = await reconcile(record.recordFingerprint, {
    source: 'evidence-route',
    registryFirstSeen: '2026-10-16T10:30:00.000Z',
    proof,
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      sealedAt: '2026-10-16T12:00:00.000Z',
      recordCount: 2,
      anchor: proof.anchor,
      earlierAnchors: null,
      opentimestamps: { available: false, status: 'none', calendars: [] },
    },
    ots: null,
    attestations: [{ ...signed, strength: 'signed', registeredAs: null, retraction: null }],
  } as unknown as Parameters<typeof reconcile>[1]);
  const options = { includeKey: false, labFile: { name: 'DNA report.pdf', bytes: report }, now: NOW };
  const ev = await buildEvidence(record, g, options);
  const files = await bundleFiles(ev, g, options);
  return { record, ev, files };
};

describe('an animal record’s evidence bundle', () => {
  it('is about an animal: its name, its sealed fields and the words around them', async () => {
    const { record, ev, files } = await animalSetup();
    const dir = `${record.id}-evidence`;
    expect(subjectOf(ev.record.sealedFields)).toBe('animal');
    expect(sealedNameOf(ev.record.sealedFields)).toBe('Practice Cow One');
    expect(ev.record.sealedFields).toMatchObject({ individualId: '0000000017', profile: ANIMAL_PROFILE });
    expect(Object.keys(ev.record.sealedFields)).not.toContain('strainName');

    const readme = strFromU8(files[`${dir}/README.txt`]).replace(/\s+/g, ' ');
    expect(readme).toContain('VeilCore evidence bundle: Practice Cow One');
    expect(readme).toContain('TIED TO THE ANIMAL');
    expect(readme).toMatch(/Tied to the animal: DNA report/);
    expect(readme).toMatch(/It is the lab report saved to this animal/);
    expect(readme).toMatch(/Who holds the animal or the record now/);
    expect(readme).not.toMatch(/TIED TO THE PLANT|saved to this plant|holds the plant/);

    const html = strFromU8(files[`${dir}/EXAMINER-SUMMARY.html`]);
    for (const label of ['Animal name', 'Individual ID', 'ID scheme', 'Species', 'Breed', 'Sex', 'Breeder or holder'])
      expect(html).toContain(`<th scope="row">${label}</th>`);
    expect(html).toContain('Sire: Practice Sire (ID 0000000025); Dam: Practice Dam (ID 0000000033)');
    expect(html).toContain('Lab report saved to this animal');
    expect(html).not.toMatch(/saved to this plant|Plant name/);

    const declaration = strFromU8(files[`${dir}/DECLARATION-TEMPLATE.txt`]).replace(/\s+/g, ' ');
    expect(declaration).toContain('an electronic record of the animal "Practice Cow One"');
    expect(declaration).not.toMatch(/record of the plant/);
  });

  it('verify.html’s own checks pass on it, with no network', async () => {
    const { ev } = await animalSetup();
    const V = loadPageVerifier<{
      checkAll: (
        ev: unknown,
      ) => Promise<{ fingerprint: { ok: boolean }; proof: { status: string }; pairing: { status: string } }>;
    }>();
    const r = await V.checkAll(JSON.parse(JSON.stringify(ev)));
    expect(r.fingerprint.ok).toBe(true);
    expect(r.proof.status).toBe('ok');
    expect(r.pairing.status).toBe('ok');
  });

  it('a changed individual ID is caught by verify.html', async () => {
    const { ev } = await animalSetup();
    const V = loadPageVerifier<{ checkAll: (ev: unknown) => Promise<{ fingerprint: { ok: boolean } }> }>();
    const edited = JSON.parse(JSON.stringify(ev)) as { record: { sealedFields: Record<string, unknown> } };
    edited.record.sealedFields.individualId = '0000000099';
    expect((await V.checkAll(edited)).fingerprint.ok).toBe(false);
  });

  it('labels an animal’s sire and dam by role in the sealed-fields table', () => {
    expect(
      fieldText('parents', [
        { role: 'sire', name: 'A', individualId: '1' },
        { role: 'dam', name: 'B', individualId: '', recordId: 'VEIL-1' },
      ]),
    ).toBe('Sire: A (ID 1); Dam: B (record VEIL-1)');
    // A plant's parents read as before.
    expect(fieldText('parents', [{ name: 'Mother' }, { name: 'Father', recordId: 'VEIL-2' }])).toBe(
      'Mother; Father (record VEIL-2)',
    );
  });
});
