// Assembling the evidence bundle: what goes in, what is refused, and the words around it.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { generateKeypair, signAttestation, signRetraction } from 'veilcore-records';
import type { InclusionProof } from 'veilcore-records';
import { pairingFingerprintOfSha } from '../commitment';
import { bindingForSecret } from '../key-binding';
import type { RecordKeys } from '../record-keys';
import type { StrainRecord } from '../records';
import {
  buildEvidence,
  bundleFiles,
  BundleRefusal,
  gatherEvidence,
  anchorLookup,
  bitcoinSteps,
  midnightSteps,
  readmeText,
  reconcile,
  safeFileName,
  signatureLines,
  specSectionsText,
  zipFiles,
  type Gathered,
} from './bundle';
import { loadPageVerifier, practiceBatch, practiceRecord, secretFor } from './test-records';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};
const HOLDER = 'ab'.repeat(32);
const API = 'https://registry.test';
const NOW = new Date('2026-10-15T12:00:00Z');

const sha256 = async (b: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b as unknown as BufferSource)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');

const OTS = new Uint8Array([...new TextEncoder().encode('\x00OpenTimestamps\x00\x00Proof\x00'), 0xbf, 0x89, 1, 2, 3]);
const TX = 'c3'.repeat(32);
const CONTRACT = '7a'.repeat(32);

/** A record with a lab report saved, a batch it is in, a lab's signature on the report. */
const setup = async (n = 2) => {
  const report = new TextEncoder().encode('practice lab report, test data');
  const fileSha = await sha256(report);
  const base = await practiceRecord(n);
  const record: StrainRecord = {
    ...base,
    dnaFingerprint: pairingFingerprintOfSha(fileSha),
    dnaFileName: 'Lab report 2026-10-15.pdf',
    dnaFileSha256: fileSha,
    dnaPairedAt: Date.parse('2026-10-15T10:00:00Z'),
  };
  const others = await Promise.all([3, 4, 5].map((i) => practiceRecord(i)));
  const batch = await practiceBatch([record, ...others]);
  const proof = {
    ...batch.proofs[record.recordFingerprint],
    anchor: {
      chain: 'midnight',
      network: 'preprod',
      contractAddress: CONTRACT,
      txHash: TX,
      blockHeight: 77,
      anchoredAt: '2026-10-15T11:00:00.000Z',
      testNetwork: true,
    },
    anchors: [{ kind: 'opentimestamps', status: 'pending', ots: `/batches/${batch.batchId}/root.bin.ots` }],
  } as unknown as InclusionProof;
  const kp = await generateKeypair();
  const signed = await signAttestation(
    {
      attestationId: 'att_practice_1',
      type: 'laboratory-report',
      subjectCommitment: record.recordFingerprint,
      documentHash: fileSha,
      hashAlgorithm: 'sha256',
      issuedAt: '2026-10-15T09:00:00Z',
      attester: { publicKey: kp.publicKey, displayName: 'Practice Lab' },
    },
    kp.privateKey,
  );
  const keys: RecordKeys = {
    recordId: record.id,
    recordSecret: secretFor(n),
    recoverySecret: 'ee'.repeat(32),
    createdAt: 1,
    anchor: {
      identity: bindingForSecret(secretFor(n)).identity,
      network: 'preprod',
      contractAddress: CONTRACT,
      txId: 'f1'.repeat(32),
      txHash: 'f1'.repeat(32),
      blockHeight: 5,
      anchoredAt: Date.parse('2026-10-14T00:00:00Z'),
    },
  };
  const evidenceBody = {
    format: 'veilcore-record-evidence/v1',
    recordId: record.id,
    record,
    registryFirstSeen: '2026-10-15T10:30:00.000Z',
    proof,
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      sealedAt: '2026-10-15T12:00:00.000Z',
      recordCount: 4,
      anchor: proof.anchor,
      earlierAnchors: [
        {
          chain: 'midnight',
          network: 'preview',
          txHash: 'd4'.repeat(32),
          contractAddress: '11'.repeat(32),
          replacedAt: '2026-10-15T11:00:00.000Z',
        },
      ],
      opentimestamps: {
        available: true,
        status: 'pending',
        calendars: ['https://a.pool.opentimestamps.org'],
        ots: btoa(String.fromCharCode(...OTS)),
      },
    },
    attestations: [{ ...signed, strength: 'signed', registeredAs: null, retraction: null }],
  };
  return { record, others, batch, proof, keys, report, fileSha, kp, signed, evidenceBody };
};

type Call = { url: string; headers: Record<string, string> };
const stubFetch =
  (routes: Record<string, () => Response>, calls: Call[] = []): typeof fetch =>
  (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const path = url.replace(API, '').split('?')[0];
    const h = Object.entries(routes).find(([p]) => (p.endsWith('*') ? path.startsWith(p.slice(0, -1)) : path === p));
    return Promise.resolve(h ? h[1]() : new Response(JSON.stringify({ error: 'not found' }), { status: 404 }));
  };
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => mem.clear());

describe('gathering what the registry has', () => {
  it('one call to /records/:id/evidence with the holder key, checked against the record', async () => {
    const s = await setup();
    mem.set('veilcore.holder.v1', HOLDER);
    const calls: Call[] = [];
    const g = await gatherEvidence(
      s.record,
      stubFetch({ [`/records/${s.record.id}/evidence`]: () => jsonRes(s.evidenceBody) }, calls),
    );
    expect('error' in g).toBe(false);
    const got = g as Gathered;
    expect(calls).toHaveLength(1);
    expect(calls[0].headers['x-holder-key']).toBe(HOLDER);
    expect(got.source).toBe('evidence-route');
    expect(got.proof?.commitment).toBe(s.record.recordFingerprint);
    expect(got.batch?.root).toBe(s.batch.root);
    expect(got.batch?.earlierAnchors).toHaveLength(1);
    expect(got.batch?.opentimestamps).toMatchObject({ available: true, status: 'pending', file: 'proof/root.bin.ots' });
    expect(Array.from(got.ots ?? [])).toEqual(Array.from(OTS));
    expect(got.attestations).toHaveLength(1);
    expect(got.registryFirstSeen).toBe('2026-10-15T10:30:00.000Z');
  });

  it('an older registry (no evidence route): the public proof, signatures and stamp file', async () => {
    const s = await setup();
    mem.set('veilcore.holder.v1', HOLDER);
    const calls: Call[] = [];
    const g = (await gatherEvidence(
      s.record,
      stubFetch(
        {
          [`/proof/${s.record.recordFingerprint}`]: () => jsonRes(s.proof),
          [`/attestations/subject/${s.record.recordFingerprint}`]: () =>
            jsonRes({ attestations: s.evidenceBody.attestations }),
          [`/batches/${s.batch.batchId}/root.bin.ots`]: () => new Response(OTS),
        },
        calls,
      ),
    )) as Gathered;
    expect(g.source).toBe('public-routes');
    expect(calls.map((c) => c.url.replace(API, '').split('?')[0])).toEqual([
      `/records/${s.record.id}/evidence`,
      `/proof/${s.record.recordFingerprint}`,
      `/attestations/subject/${s.record.recordFingerprint}`,
      `/batches/${s.batch.batchId}/root.bin.ots`,
    ]);
    expect(g.proof?.root).toBe(s.batch.root);
    expect(g.batch?.earlierAnchors).toBe(null);
    expect(g.batch?.anchor).toMatchObject({ txHash: TX });
    expect(g.batch?.opentimestamps.available).toBe(true);
    expect(g.attestations).toHaveLength(1);
  });

  it('no holder key in this browser: straight to the public routes', async () => {
    const s = await setup();
    const calls: Call[] = [];
    await gatherEvidence(s.record, stubFetch({}, calls));
    expect(calls[0].url).toContain('/proof/');
  });

  it('a limit or no network is said plainly; nothing is made', async () => {
    const s = await setup();
    mem.set('veilcore.holder.v1', HOLDER);
    expect(
      await gatherEvidence(s.record, stubFetch({ [`/records/${s.record.id}/evidence`]: () => jsonRes({}, 429) })),
    ).toEqual({
      error: expect.stringMatching(/limited to a few a minute/) as unknown,
    });
    const offline = (() => Promise.reject(new TypeError('network'))) as unknown as typeof fetch;
    expect(await gatherEvidence(s.record, offline)).toEqual({
      error: expect.stringMatching(/Couldn’t reach VeilCore/) as unknown,
    });
  });

  it('a proof about another record, one that does not fold, or a batch that is not the proof’s, is not taken', async () => {
    const s = await setup();
    const other = s.batch.proofs[s.others[0].recordFingerprint];
    let g = await reconcile(s.record.recordFingerprint, { source: 'evidence-route', proof: other });
    expect(g.proof).toBe(null);
    expect(g.proofRefused).toBe(true);
    g = await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      proof: { ...s.proof, root: 'ee'.repeat(32) },
    });
    expect(g.proof).toBe(null);
    g = await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      proof: s.proof,
      batch: { ...s.evidenceBody.batch, root: 'ee'.repeat(32) },
      ots: OTS,
    });
    expect(g.batch?.root).toBe(s.batch.root);
    expect(g.batch?.earlierAnchors).toBe(null);
    // Signatures about other records, and a file that isn't an OpenTimestamps file, are left out.
    g = await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      proof: s.proof,
      ots: new Uint8Array([1, 2, 3]),
      attestations: [{ ...s.signed, subjectCommitment: 'ee'.repeat(32) }],
    });
    expect(g.ots).toBe(null);
    expect(g.batch?.opentimestamps.available).toBe(false);
    expect(g.attestations).toEqual([]);
  });
});

describe('building the evidence', () => {
  const gathered = async (s: Awaited<ReturnType<typeof setup>>) =>
    await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      registryFirstSeen: s.evidenceBody.registryFirstSeen,
      proof: s.proof,
      batch: s.evidenceBody.batch,
      ots: OTS,
      attestations: s.evidenceBody.attestations,
    });

  it('the sealed fields exactly as fingerprinted, and the key and lab file only when ticked', async () => {
    const s = await setup();
    const g = await gathered(s);
    const plain = await buildEvidence(s.record, g, { includeKey: false, now: NOW });
    expect(plain.record.fingerprint).toBe(s.record.recordFingerprint);
    expect(plain.record.fingerprintAlgorithm).toBe('sha256/key-bound/v1');
    expect(plain.record.sealedFields.keyBinding).toBe(s.record.keyBinding);
    expect(plain.key).toBe(null);
    expect(plain.labReport).toEqual({
      pairingFingerprint: s.record.dnaFingerprint,
      fileSha256: s.fileSha,
      fileName: 'Lab report 2026-10-15.pdf',
      pairedAt: '2026-10-15T10:00:00.000Z',
    });
    // Never in the sealed fields: the lab report, the holder's private notes.
    expect(Object.keys(plain.record.sealedFields)).not.toContain('dnaFingerprint');

    const full = await buildEvidence(
      s.record,
      g,
      { includeKey: true, labFile: { name: 'report.pdf', bytes: s.report }, now: NOW },
      s.keys,
    );
    const b = bindingForSecret(secretFor(2));
    expect(full.key).toMatchObject({ identity: b.identity, keySalt: b.keySalt, keyBinding: s.record.keyBinding });
    expect(full.key?.keyStamp).toMatchObject({ txHash: 'f1'.repeat(32), network: 'preprod' });
    expect(full.labReport?.fileIncluded).toBe('lab/report/report.pdf');
  });

  it('refuses, with words, rather than ship something that does not hold together', async () => {
    const s = await setup();
    const g = await gathered(s);
    const refusal = (p: Promise<unknown>) => expect(p).rejects.toBeInstanceOf(BundleRefusal);
    await refusal(buildEvidence({ ...s.record, strainName: 'edited' }, g, { includeKey: false }));
    await refusal(buildEvidence({ ...s.record, nonce: undefined }, g, { includeKey: false }));
    await refusal(buildEvidence(s.record, g, { includeKey: true }));
    await refusal(buildEvidence(s.record, g, { includeKey: true }, { ...s.keys, recordSecret: secretFor(99) }));
    await refusal(
      buildEvidence(s.record, g, { includeKey: false, labFile: { name: 'other.pdf', bytes: new Uint8Array([9]) } }),
    );
    const old = await practiceRecord(0);
    await refusal(buildEvidence(old, g, { includeKey: true }, s.keys));
    await refusal(buildEvidence(old, g, { includeKey: false, labFile: { name: 'x', bytes: s.report } }));
  });

  it('an older pairing (no SHA-256 kept): the SHA-256 from the lab signature that matches it', async () => {
    const s = await setup();
    const { dnaFileSha256: _drop, ...older } = s.record;
    void _drop;
    const ev = await buildEvidence(older, await gathered(s), { includeKey: false });
    expect(ev.labReport?.fileSha256).toBe(s.fileSha);
  });
});

describe('the bundle', () => {
  const make = async (opts: { key?: boolean; lab?: boolean; batched?: boolean } = {}) => {
    const s = await setup();
    const g = await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      registryFirstSeen: s.evidenceBody.registryFirstSeen,
      proof: opts.batched === false ? null : s.proof,
      batch: s.evidenceBody.batch,
      ots: OTS,
      attestations: s.evidenceBody.attestations,
    });
    const options = {
      includeKey: !!opts.key,
      ...(opts.lab ? { labFile: { name: 'Lab report.pdf', bytes: s.report } } : {}),
      now: NOW,
    };
    const ev = await buildEvidence(s.record, g, options, s.keys);
    const files = await bundleFiles(ev, g, options);
    return { s, ev, files, zip: zipFiles(files, NOW) };
  };

  it('holds every file, under one folder, and unzips to the same bytes', async () => {
    const { s, files, zip } = await make({ key: true, lab: true });
    const dir = `${s.record.id}-evidence`;
    expect(Object.keys(files).sort()).toEqual(
      [
        'DECLARATION-TEMPLATE.txt',
        'EXAMINER-SUMMARY.html',
        'README.txt',
        'evidence.json',
        'key/key-binding.json',
        'lab/lab-report-pairing.json',
        'lab/report/Lab report.pdf',
        'lab/signatures.json',
        'proof/anchors.json',
        'proof/batch-root.txt',
        'proof/check-on-midnight.mjs',
        'proof/inclusion-proof.json',
        'proof/root.bin',
        'proof/root.bin.ots',
        'record/proof-code.txt',
        'record/sealed-fields.canonical.json',
        'record/sealed-fields.json',
        'spec/SPEC-sections.md',
        'verify.html',
      ].map((f) => `${dir}/${f}`),
    );
    const out = unzipSync(zip);
    for (const [k, v] of Object.entries(files)) expect(Array.from(out[k]), k).toEqual(Array.from(v));
    expect(Array.from(out[`${dir}/proof/root.bin`])).toEqual(Array.from(Buffer.from(s.batch.root, 'hex')));
    expect(strFromU8(out[`${dir}/record/proof-code.txt`]).trim()).toBe(s.record.recordFingerprint);
    expect(Array.from(out[`${dir}/lab/report/Lab report.pdf`])).toEqual(Array.from(s.report));
  });

  it('without the ticks: no key file, no lab report file; not in a batch: no proof files', async () => {
    const { files } = await make();
    const names = Object.keys(files).map((k) => k.split('/').slice(1).join('/'));
    expect(names).not.toContain('key/key-binding.json');
    expect(names.some((n) => n.startsWith('lab/') && !/pairing|signatures/.test(n))).toBe(false);
    const unbatched = await make({ batched: false });
    const names2 = Object.keys(unbatched.files).map((k) => k.split('/').slice(1).join('/'));
    expect(names2.filter((n) => n.startsWith('proof/'))).toEqual([]);
  });

  it('evidence.json passes the page’s own checks: fingerprint, proof, key, pairing, signature', async () => {
    const { s, files } = await make({ key: true });
    const ev: unknown = JSON.parse(strFromU8(files[`${s.record.id}-evidence/evidence.json`]));
    const V = loadPageVerifier<{
      checkAll: (e: unknown) => Promise<{
        fingerprint: { ok: boolean };
        proof: { status: string };
        key: { status: string };
        pairing: { status: string };
        signatures: { signature: string; aboutThisRecord: boolean }[];
        lookups: { midnight: { txHash: string }[]; bitcoin: { status: string } | null };
      }>;
    }>();
    const r = await V.checkAll(ev);
    expect(r.fingerprint.ok).toBe(true);
    expect(r.proof.status).toBe('ok');
    expect(r.key.status).toBe('ok');
    expect(r.pairing.status).toBe('ok');
    expect(r.signatures).toMatchObject([{ signature: 'valid', aboutThisRecord: true }]);
    expect(r.lookups.midnight.map((m) => m.txHash)).toEqual([TX, 'd4'.repeat(32)]);
    expect(r.lookups.bitcoin?.status).toBe('pending');
  });

  it('README: what each file is, what it proves and what it does not, in plain words', async () => {
    const { s, files } = await make({ key: true, lab: true });
    const raw = strFromU8(files[`${s.record.id}-evidence/README.txt`]);
    const readme = raw.replace(/\s+/g, ' ');
    expect(readme).toContain(`Search for transaction ${TX}.`);
    expect(readme).toContain(s.batch.root);
    // The registry's date, in UTC and labelled as its report; the explorer named for the network.
    expect(readme).toContain("VeilCore's registry reports it is in block 77, at 2026-10-15 11:00 UTC");
    expect(readme).toContain(
      'Open the Midnight explorer for Midnight preprod (a test network): https://preprod.midnightexplorer.com/',
    );
    // Persona review (17 Oct): honest about explorers, and one command that needs no VeilCore server.
    expect(readme).toMatch(/We haven't confirmed that any Midnight explorer shows the batch root/);
    expect(readme).toMatch(/we know of no way to see it without running a command/);
    expect(readme).toMatch(/check-on-midnight\.mjs/);
    expect(readme).toContain('npm install --save-exact @veilcore/contracts@0.2.0');
    const script = strFromU8(files[`${s.record.id}-evidence/proof/check-on-midnight.mjs`]);
    expect(script).toContain(`txId: "${TX}"`);
    expect(script).toContain(`root: Buffer.from("${s.batch.root}", 'hex')`);
    expect(script).toContain('network: "preprod"');
    expect(script).toContain("import { checkBatchAnchor } from '@veilcore/contracts';");
    expect(script).not.toMatch(/veilcore\.org|VITE_API_BASE|fetch\(/);
    // It parses as a Node module (not run: it needs the network and a Blockfrost id).
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { execFileSync } = await import('node:child_process');
    const f = join(mkdtempSync(join(tmpdir(), 'vc-check-')), 'check-on-midnight.mjs');
    writeFileSync(f, script);
    expect(() => execFileSync(process.execPath, ['--check', f])).not.toThrow();
    // "batch root" explained once, in plain words.
    expect(readme.match(/one code that stands for every record/g)?.length).toBeGreaterThanOrEqual(1);
    expect(readme).toMatch(/existed, unchanged, by the date of that transaction/);
    expect(readme).toMatch(/held this record by that date/);
    expect(readme).toMatch(/test network.*practice data/);
    expect(readme).toMatch(
      /The key [0-9a-f]{64} \(it calls itself "Practice Lab"; not checked\) signed a lab report with SHA-256/,
    );
    expect(readme).toMatch(/It is the lab report saved to this plant/);
    expect(readme).toMatch(/doesn't vouch for anyone/);
    expect(readme).toMatch(/with it, anyone can tie this record to everything its key does/);
    expect(readme).toMatch(/ots verify root\.bin\.ots/);
    expect(readme).toMatch(/registry's own clock, its word only/);
    // Product rules: never "own"/"ownership", never "track and trace", nothing vouched.
    expect(readme).not.toMatch(/\b(owns|owned|owners?|ownership)\b|\b(you|they|holder|breeder) owns?\b/i);
    expect(readme).not.toMatch(/track and trace|certif|guarantee/i);
    // Short lines for any text reader; a long value is never broken across two.
    expect(raw.split('\n').filter((l) => l.length > 78 && !/[0-9a-f]{64}/.test(l))).toEqual([]);
    expect(readme).toContain(`spec version 0.1`);
  });

  it('README: formulas only under “For technical readers”, at the end', async () => {
    const { s, files } = await make({ key: true, lab: true });
    const raw = strFromU8(files[`${s.record.id}-evidence/README.txt`]);
    const at = raw.indexOf('FOR TECHNICAL READERS');
    expect(at).toBeGreaterThan(0);
    const body = raw.slice(0, at);
    expect(body).not.toMatch(/H\(|veilcore:v1:|spec section|keyBinding|SHA-256 of the canonical/);
    expect(raw.slice(at)).toMatch(/H\("veilcore:v1:keyrecord", keyBinding, contentHash\)/);
    expect(raw.slice(at)).toMatch(/lastBatchRoot/);
    // Nothing after it but technical lines.
    expect(
      raw
        .slice(at)
        .split('\n')
        .filter((l) => /^[A-Z ]{6,}$/.test(l)),
    ).toEqual(['FOR TECHNICAL READERS']);
  });

  it('README: no step 3 and no “or Bitcoin” when there is no stamp file', async () => {
    const s = await setup();
    const g = await reconcile(s.record.recordFingerprint, {
      source: 'evidence-route',
      proof: s.proof,
      batch: { ...s.evidenceBody.batch, opentimestamps: { available: false, status: 'none' } },
      ots: null,
      attestations: [],
    });
    const options = { includeKey: false, now: NOW };
    const ev = await buildEvidence(s.record, g, options);
    const files = await bundleFiles(ev, g, options);
    const readme = strFromU8(files[`${s.record.id}-evidence/README.txt`]).replace(/\s+/g, ' ');
    expect(readme).not.toMatch(/\b3\. |step 3|Bitcoin block|root\.bin\.ots/);
    expect(readme).toMatch(/WHAT THIS PROVES, once step 2 checks out/);
    expect(Object.keys(files).some((k) => k.endsWith('root.bin.ots'))).toBe(false);
  });

  it('README says the same Midnight and Bitcoin steps as verify.html, word for word', async () => {
    const { s, ev } = await make({ key: true });
    const V = loadPageVerifier<{
      checkAll: (e: unknown) => Promise<{ lookups: { midnight: Record<string, unknown>[] } }>;
      midnightSteps: (a: unknown) => string[];
      bitcoinSteps: (pending: boolean) => string[];
    }>();
    const plain = (t: string) => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
    const page = await V.checkAll(JSON.parse(JSON.stringify(ev)));
    expect(page.lookups.midnight.length).toBe(2);
    const anchors = [ev.batch?.anchor, ...(ev.batch?.earlierAnchors ?? [])];
    for (const [i, a] of page.lookups.midnight.entries()) {
      const ours = anchorLookup(anchors[i] as Record<string, unknown>, s.batch.root);
      expect(ours).not.toBe(null);
      expect(midnightSteps(ours as NonNullable<typeof ours>)).toEqual(V.midnightSteps(a).map(plain));
    }
    // Without a block or time, and on a network with no explorer listed.
    const bare = { network: 'undeployed', txHash: TX, root: s.batch.root };
    const pageBare = await V.checkAll({
      ...JSON.parse(JSON.stringify(ev)),
      batch: { ...ev.batch, anchor: { chain: 'midnight', ...bare }, earlierAnchors: [] },
    });
    expect(midnightSteps(anchorLookup(bare, s.batch.root) as NonNullable<ReturnType<typeof anchorLookup>>)).toEqual(
      V.midnightSteps(pageBare.lookups.midnight[0]).map(plain),
    );
    for (const pending of [true, false]) expect(bitcoinSteps(pending)).toEqual(V.bitcoinSteps(pending).map(plain));
  });

  it('README lists exactly the files in the zip, even when the lab report is named like a bundle file', async () => {
    for (const name of [
      'signatures.json',
      'README.txt',
      'lab-report-pairing.json',
      'evidence.json',
      '../verify.html',
    ]) {
      const s = await setup();
      const g = await reconcile(s.record.recordFingerprint, {
        source: 'evidence-route',
        registryFirstSeen: s.evidenceBody.registryFirstSeen,
        proof: s.proof,
        batch: s.evidenceBody.batch,
        ots: OTS,
        attestations: s.evidenceBody.attestations,
      });
      const options = { includeKey: true, labFile: { name, bytes: s.report }, now: NOW };
      const ev = await buildEvidence(s.record, g, options, s.keys);
      const files = await bundleFiles(ev, g, options);
      const dir = `${s.record.id}-evidence/`;
      const inZip = Object.keys(unzipSync(zipFiles(files, NOW)))
        .map((k) => k.slice(dir.length))
        .sort();
      const raw = strFromU8(files[`${dir}README.txt`]);
      const section = raw.slice(raw.indexOf('WHAT EACH FILE IS\n') + 18, raw.indexOf('\n\nWHAT THIS PROVES'));
      const listed = section
        .split(/\n(?=- )/)
        .map((entry) => entry.replace(/\n\s+/g, ' ').replace(/^- /, ''))
        .map((entry) => entry.slice(0, entry.indexOf(': ')))
        .sort();
      expect(listed, name).toEqual(inZip);
      // The bundle's own files are untouched; the lab report sits in its own folder.
      expect(strFromU8(files[`${dir}lab/signatures.json`])).toMatch(/"attestationId"/);
      expect(strFromU8(files[`${dir}README.txt`])).toMatch(/^VeilCore evidence bundle/);
      expect(ev.labReport?.fileIncluded).toMatch(/^lab\/report\/[^/]+$/);
      expect(Array.from(files[`${dir}${ev.labReport?.fileIncluded}`])).toEqual(Array.from(s.report));
    }
  });

  it('verify.html carries the stamp file, so it reads what the file shows', async () => {
    const { s, files } = await make();
    const html = strFromU8(files[`${s.record.id}-evidence/verify.html`]);
    const m = /id="veilcore-stamp">([^<]*)</.exec(html);
    expect(m).not.toBe(null);
    expect(JSON.parse((m as RegExpExecArray)[1])).toBe(btoa(String.fromCharCode(...OTS)));
  });

  it('README says how many of the record’s parents are locked in this browser and left out (review L8)', async () => {
    const { ev } = await make();
    expect(readmeText(ev, [])).not.toMatch(/locked in the browser/);
    const one = readmeText(ev, [], undefined, undefined, 1).replace(/\s+/g, ' ');
    expect(one).toMatch(
      /1 of this record's linked parents is the holder's own record, locked in the browser this bundle was made in/,
    );
    const two = readmeText(ev, [], undefined, undefined, 2).replace(/\s+/g, ' ');
    expect(two).toMatch(/2 of this record's linked parents are the holder's own records/);
  });

  it('README on mainnet says nothing about practice data; unbatched says nothing dates it yet', async () => {
    const { ev } = await make();
    const main = {
      ...ev,
      batch: ev.batch ? { ...ev.batch, anchor: { ...ev.batch.anchor, network: 'mainnet' } } : null,
    };
    expect(readmeText(main, [])).not.toMatch(/practice data/);
    const { ev: unbatched } = await make({ batched: false });
    expect(readmeText(unbatched, [])).toMatch(/isn't in a batch yet/);
  });

  it('signature lines: a withdrawn one says so; a forged one is not described as signed', async () => {
    const s = await setup();
    const retraction = await signRetraction(
      {
        attestationId: s.signed.attestationId,
        attesterPublicKey: s.kp.publicKey,
        reason: 'superseded',
        retractedAt: '2026-10-16T00:00:00Z',
      },
      s.kp.privateKey,
    );
    const lines = await signatureLines(
      [
        { ...s.signed, retraction },
        { ...s.signed, documentHash: 'cd'.repeat(32) },
      ],
      s.record.recordFingerprint,
      s.fileSha,
    );
    expect(lines[0]).toMatchObject({ ok: true, withdrawn: true });
    expect(lines[0].text).toMatch(/withdrew it at 2026-10-16T00:00:00Z \(superseded\)/);
    expect(lines[1]).toMatchObject({ ok: false });
    expect(lines[1].text).toMatch(/does not check/);
  });

  it('the spec sections the checks follow, with the version', () => {
    const t = specSectionsText();
    expect(t).toMatch(/^Version 0\.1/m);
    for (const h of ['#### 3.6.1', '### 3.7', '### 4.4', '## 5 ', '### 5.4', '## 7 ', '## 9 ']) expect(t).toContain(h);
    expect(t).not.toContain('## 6 - Corrections');
  });

  it('file names are safe in any zip tool', () => {
    expect(safeFileName('../../etc/passwd')).toBe('..-..-etc-passwd'.replace(/^\.+/, ''));
    expect(safeFileName('Lab report: "final" é.pdf')).toBe('Lab report final .pdf');
    expect(safeFileName('')).toBe('lab-report.bin');
    expect(safeFileName('a  :  b.pdf')).toBe('a b.pdf');
  });
});
