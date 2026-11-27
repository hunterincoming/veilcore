// The backup restore drill (docs/runbooks/backup-restore-drill.md): a holder gets EVERYTHING back
// from the backup file alone, and keeps getting it back on every change.
//
// One browser makes a representative set the way the app makes it: a plant, an animal, a child
// plant naming the plant as its parent, a document with numbers that a lab signed and a claim was
// proved on, a document kept on this device only, a DNA pairing (the note and the bound pairing on
// chain), a record's date stamp, and a license with a royalty report settled between two browsers
// (the licensee reports, the licensor confirms it received the money). Then it saves a backup with
// a password, and a second browser with nothing in storage restores from that file alone:
//   - with the registry still there (a new phone), and
//   - with the registry gone (VeilCore offline or shut down).
// Every key, secret, record field, inclusion proof, lab signature, claim and license message is
// compared byte for byte, and each is used again: the proof code recomputes, the key still binds
// to the record, the lab signature still checks, the license deal can still be read and written.
// Also: a wrong password, a cut-off file and a changed file are refused with nothing changed;
// restoring twice adds nothing; the offline tool (veilcore-records, no website) opens the file.
// And the two dates that don't depend on Midnight (stamps.ts): the batch's Bitcoin stamp file and
// RFC 3161 token and each record's own token are in the file, come back with the registry gone,
// and the evidence bundle made then still checks offline; doctored ones are refused.
//
// Every storage name the site uses is also listed below as in the backup, or not needed after a
// restore with the reason: a new name fails here until someone decides which, so nothing new can
// quietly be left out of the file. All names, figures and keys are practice data.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBatch, verifyTimestampToken } from 'veilcore-records';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import type { DealParty } from './deal-client';
import { loadPageVerifier } from './evidence/test-records';
import { differ, snapshotOf } from '../e2e-fixtures/restore-drill-snapshot';
import { sealOnDevice } from './fixtures/device-only-doc';
import { otsFile, testTsa, type TestTsa } from './fixtures/test-stamps';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD = 'practice drill password';
const run = promisify(execFile);

// ---- a registry: the fake one, plus the deal channel, the batch proofs and the stamps ------
//
// The anchoring job also stamps the batch root as the registry does: a Bitcoin stamp file
// (OpenTimestamps, pending until `upgrade`) and an RFC 3161 token from a local TSA, both named in
// each proof's anchors; and each record's own RFC 3161 token on its proof code (/proof/:c/instant).

type DealMsg = { seq: number; iv: string; ct: string; receivedAt: number };

// The site trusts only the timestamp authorities it pins (config/tsa-pins.json): here, the drill's
// own TSA, pinned before any browser loads the app.
const pinned = vi.hoisted(() => ({ pins: [] as { name: string; certSha256: string }[] }));
vi.mock('../config/tsa-pins.json', () => ({ default: { format: 'veilcore-tsa-pins/v1', pins: pinned.pins } }));

let tsa: TestTsa;
/** A TSA the site does not pin: its tokens check against what they stamp, but nobody vouches for it. */
let stranger: TestTsa;
beforeAll(() => {
  tsa = testTsa('Drill TSA');
  stranger = testTsa('Self-made TSA');
  pinned.pins.push(tsa.pin);
});
afterAll(() => {
  tsa.done();
  stranger.done();
});

const STAMP_BLOCK = 870123;
const BATCH_ID = 'B-20261126-DRILL';

const world = () => {
  const reg = fakeRegistry();
  const deals = new Map<string, { tokenHash: string; messages: DealMsg[] }>();
  const proofs = new Map<string, unknown>();
  const ots = new Map<string, Buffer>();
  const instant = new Map<string, string>();
  let up = true;
  const answer = (v: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } }));
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (!up) throw new TypeError('Failed to fetch');
    const url = new URL(String(input instanceof Request ? input.url : input));
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    if (url.pathname === '/deals' && method === 'POST') {
      const id = String(body.dealId);
      if (!deals.has(id)) deals.set(id, { tokenHash: String(body.writeTokenHash), messages: [] });
      return answer({ ok: true });
    }
    const m = /^\/deals\/([^/]+)\/(messages|read)$/.exec(url.pathname);
    if (m && method === 'POST') {
      const d = deals.get(m[1]);
      if (!d) return answer({ error: 'no such deal' }, 404);
      if (m[2] === 'read') return answer({ messages: d.messages.filter((x) => x.seq > Number(body.after ?? 0)) });
      const seq = d.messages.length + 1;
      d.messages.push({ seq, iv: String(body.iv), ct: String(body.ct), receivedAt: Date.now() });
      const { createHash } = await import('node:crypto');
      const fingerprint = createHash('sha256')
        .update(`${String(body.iv)}.${String(body.ct)}`)
        .digest('hex');
      return answer({ seq, fingerprint });
    }
    const p = /^\/proof\/([0-9a-f]{64})$/.exec(url.pathname);
    if (p && method === 'GET') return proofs.has(p[1]) ? answer(proofs.get(p[1])) : answer({ error: 'none' }, 404);
    const i = /^\/proof\/([0-9a-f]{64})\/instant$/.exec(url.pathname);
    if (i && method === 'GET')
      return instant.has(i[1])
        ? answer({
            status: 'stamped',
            stamps: 'the proof code as 32 raw bytes',
            tokens: [{ kind: 'rfc3161', token: instant.get(i[1]), tsa: 'https://tsa.drill.invalid/' }],
          })
        : answer({ status: 'none' }, 404);
    const o = /^\/batches\/([^/]+)\/root\.bin\.ots$/.exec(url.pathname);
    if (o && method === 'GET')
      return ots.has(o[1])
        ? new Response(new Uint8Array(ots.get(o[1])!), { status: 200 })
        : answer({ error: 'no such batch' }, 404);
    return reg.fetch(String(input instanceof Request ? input.url : input), init);
  };
  /** Each proof's anchors, as the registry folds them in (lineage/batches.mjs foldAnchors). */
  const anchorsOf = (root: string, status: 'pending' | 'bitcoin', token: string) => [
    {
      kind: 'opentimestamps',
      status,
      root: `/batches/${BATCH_ID}/root.bin`,
      ots: `/batches/${BATCH_ID}/root.bin.ots`,
      calendars: ['https://calendar.test.invalid'],
      ...(status === 'bitcoin' ? { bitcoinBlockHeight: STAMP_BLOCK } : {}),
    },
    {
      kind: 'rfc3161',
      token,
      tsa: 'https://tsa.drill.invalid/',
      stamps: 'the batch root as 32 raw bytes (root.bin)',
      tst: `/batches/${BATCH_ID}/root.tst`,
    },
  ];
  let batchToken = '';
  return {
    reg,
    deals,
    fetch,
    /**
     * The anchoring job: these proof codes go into one batch, and each gets its inclusion proof;
     * the root gets a pending Bitcoin stamp and a TSA token, each proof code a token of its own.
     */
    batch: async (fps: readonly string[]) => {
      const b = await buildBatch([...fps], BATCH_ID);
      batchToken = tsa.tokenFor(b.root);
      ots.set(BATCH_ID, otsFile(b.root));
      for (const fp of fps) instant.set(fp, tsa.tokenFor(fp));
      for (const [fp, proof] of Object.entries(b.proofs))
        proofs.set(fp, {
          ...(proof as object),
          anchors: anchorsOf(b.root, 'pending', batchToken),
          anchor: {
            chain: 'midnight',
            network: 'preview',
            contractAddress: '7a'.repeat(32),
            txHash: 'ab'.repeat(32),
            blockHeight: 4242,
            anchoredAt: '2026-11-26T12:00:00.000Z',
          },
        });
    },
    proofs,
    ots,
    instant,
    /** The calendars put the root into a Bitcoin block: the registry serves the finished file. */
    upgrade: () => {
      const root = (proofs.values().next().value as { root: string }).root;
      ots.set(BATCH_ID, otsFile(root, { bitcoin: STAMP_BLOCK }));
      for (const [fp, pr] of proofs)
        proofs.set(fp, { ...(pr as object), anchors: anchorsOf(root, 'bitcoin', batchToken) });
    },
    goDown: () => {
      up = false;
    },
    goUp: () => {
      up = true;
    },
  };
};

let w: ReturnType<typeof world>;
let reg: FakeRegistry;

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  w = world();
  reg = w.reg;
  vi.stubGlobal('fetch', w.fetch);
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

// ---- the representative set --------------------------------------------------------------

const SOY = 'veilcore/schema/variety-similarity/v1';

/** A licence's practice keys, as the invite handshake leaves them on each side. */
const DEAL = {
  commitment: '3c'.repeat(32),
  issuerRecord: '4d'.repeat(32),
  identity: '5e'.repeat(32),
};

type Made = {
  plant: string;
  animal: string;
  child: string;
  doc: string;
  local: string;
  licenseId: string;
  inviteId: string;
  licenseeParty: DealParty;
  issuerParty: DealParty;
};

/** Breeder A (licensor), licensee B and lab L: everything the drill restores. */
const makeTheSet = async (A: Browser, B: Browser, L: Browser): Promise<Made> => {
  // The lab's signing key, made as the lab's own set-up page makes it.
  const labKey = await L.run(async () => {
    const p = await L.m.attester.createAttester('Practice Lab (test data)', 'laboratory');
    const { claimsKeyFor } = await import('./claims-key');
    return { secretN: claimsKeyFor(p.keypair.privateKey).secret, name: p.displayName ?? '' };
  });
  const plantIn = {
    strainName: 'Drill Pippin (test data)',
    bredBy: 'Practice Breeder',
    dateCreated: '2026-03-01',
    notes: 'a plant record for the restore drill',
    parents: [],
    breedingMethod: 'open pollination',
    photoFingerprints: ['ab'.repeat(32)],
    refId: 'DR-001',
    taxon: 'Malus domestica',
  };
  const made = await A.run(async () => {
    const m = A.m;
    const plant = m.records.createRecord(await m.seal.sealRecord(plantIn));
    const child = m.records.createRecord(
      await m.seal.sealRecord({
        ...plantIn,
        strainName: 'Drill Pippin F1 (test data)',
        refId: 'DR-002',
        parents: [{ recordId: plant.id, name: plant.strainName }],
      }),
    );
    const animal = m.records.createRecord(
      await m.seal.sealAnimalRecord({
        name: 'Drill Ewe (test data)',
        species: 'Ovis aries',
        breed: 'Practice breed',
        individualId: 'UK-0000-DRILL',
        idScheme: 'practice',
        sex: 'female',
        dateOfBirth: '2025-04-02',
        parents: [],
        breeder: 'Practice Breeder',
        herd: 'Practice flock',
        notes: 'an animal record for the restore drill',
        photoFingerprints: [],
      }),
    );
    const { makeFieldSet } = await import('./field-set');
    const fieldSet = await makeFieldSet(SOY, [9437n, 5103n, 287n, 12n, 201900123n, 1n]);
    const doc = m.records.createRecord(
      await m.seal.sealDocumentRecord({
        title: 'Drill similarity certificate (test data)',
        type: 'certificate-of-analysis',
        issuer: 'Practice Lab',
        reference: 'SB-DRILL-1',
        issued: '2026-11-01',
        files: [{ name: 'certificate.pdf', sha256: 'cd'.repeat(32), size: 2048 }],
        about: [{ name: plant.strainName, recordId: plant.id }],
        holder: 'Practice Breeder',
        notes: 'a document with numbers, signed by a lab',
        fieldSet,
      }),
    );
    await settle(150);
    return { plant: plant.id, child: child.id, animal: animal.id, doc: doc.id };
  });
  // The vault key in a checked backup first: until then nothing is saved on the registry.
  await A.run(async () => {
    const text = await A.m.backup.backupFileText(PASSWORD);
    expect(await A.m.backup.checkBackup(fileOf(text), PASSWORD)).toMatchObject({ ok: true });
    await settle(300);
  });
  const local = await sealOnDevice(reg, A, 'Drill permit kept on this device (test data)');

  // A lab's signature on the document's numbers, and a claim proved on one of them.
  await A.run(async () => {
    const { labRequestFor, readLabSignature, signLabRequest } = await import('./lab-attest');
    const doc = A.m.records.getRecord(made.doc)!;
    const req = await labRequestFor(doc as never);
    // The lab signs the request file; the holder's page checks the signature before keeping it.
    const sig = readLabSignature(JSON.stringify(signLabRequest(labKey, req)), req.commitment);
    A.m.records.setLabSignature(made.doc, { ...sig, about: A.m.records.getRecord(made.plant)!.recordFingerprint });
    A.m.records.setLabOnChain(made.doc, { contract: 'c1'.repeat(32), txId: 'e1'.repeat(32), blockHeight: 101 });
    A.m.records.addClaim(made.doc, {
      kind: 'range',
      contract: 'c1'.repeat(32),
      txId: 'e2'.repeat(32),
      blockHeight: 102,
      record: req.commitment,
      keyBinding: doc.keyBinding,
      schema: SOY,
      slot: 0,
      op: 'at-least',
      bound: '9000',
    } as never);
    // A DNA report paired with the plant, and the pairing bound on chain; the plant's date stamp.
    A.m.records.pairDna(made.plant, 'f0'.repeat(32), 'drill-report.vcf', { fileSha256: 'f1'.repeat(32) });
    A.m.keys.setAnchor(made.plant, {
      identity: '7a'.repeat(32),
      network: 'preview',
      contractAddress: '7b'.repeat(32),
      txId: '7c'.repeat(32),
      txHash: '7d'.repeat(32),
      blockHeight: 4242,
      anchoredAt: Date.UTC(2026, 10, 2),
    });
    A.m.keys.setDnaOnChain(made.plant, {
      fingerprint: 'f0'.repeat(32),
      salt: '8a'.repeat(32),
      binding: '8b'.repeat(32),
      identity: '7a'.repeat(32),
      status: 'paired',
      txId: '8c'.repeat(32),
      blockHeight: 4300,
      at: Date.UTC(2026, 10, 3),
    });
    await settle(200);
  });

  // A license on the plant, live on chain between A (licensor) and B (licensee).
  const issuer = await A.run(async () => (await import('./deal')).newPartyKey());
  const licensee = await B.run(async () => (await import('./deal')).newPartyKey());
  const inviteId = 'LI-DRILL-0001';
  const licenseId = await A.run(async () => {
    const plant = A.m.records.getRecord(made.plant)!;
    const terms = {
      licensee: 'Practice Grower',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      extraTerms: '',
      rights: 'grow' as never,
      territory: 'Practice County',
      royaltyType: 'percent',
      royaltyAmount: '5',
      unitBasis: 'per-unit-sold',
      sublicensable: false,
      exclusive: false,
    } as never;
    const sealed = await A.m.licenses.sealAgreement('license', terms, plant.recordFingerprint);
    const lic = A.m.licenses.createLicense({
      type: 'license',
      recordId: plant.id,
      recordFingerprint: plant.recordFingerprint,
      terms,
      ...sealed,
    });
    A.m.licenses.setOnChain(lic.id, () => ({
      inviteId,
      acceptToken: 'a1'.repeat(16),
      issuerToken: 'a2'.repeat(16),
      identity: DEAL.identity,
      label: 'Practice Grower',
      invitedAt: Date.UTC(2026, 10, 1),
      issuerNonce: issuer.public,
      partySecret: issuer.secret,
      commitment: DEAL.commitment,
      issuerRecord: DEAL.issuerRecord,
      licenseeNonce: licensee.public,
      termsSentAt: Date.UTC(2026, 10, 1),
      issueTx: 'a3'.repeat(32),
      issuedAt: Date.UTC(2026, 10, 1),
      activateTx: 'a4'.repeat(32),
      activatedAt: Date.UTC(2026, 10, 2),
    }));
    await settle(200);
    return lic.id;
  });
  await B.run(() => {
    B.m.held.keepHeldLicense({
      inviteId,
      secret: '9a'.repeat(32),
      commitment: DEAL.commitment,
      identity: DEAL.identity,
      issuerRecord: DEAL.issuerRecord,
      licenseeNonce: licensee.public,
      partySecret: licensee.secret,
      issuerNonce: issuer.public,
      label: 'Practice Breeder',
      acceptedAt: Date.UTC(2026, 10, 1),
      activateTx: 'a4'.repeat(32),
      activatedAt: Date.UTC(2026, 10, 2),
    });
  });
  // The royalty report, settled: terms from A, the report from B, "received" from A.
  const issuerParty = await A.run(() => A.m.dealClient.dealParty(A.m.licenses.getLicense(licenseId)!.onChain!)!);
  const licenseeParty = {
    side: 'licensee' as const,
    mySecret: licensee.secret,
    theirPublic: issuer.public,
    commitment: DEAL.commitment,
    issuerRecord: DEAL.issuerRecord,
  };
  await A.run(async () => {
    const l = A.m.licenses.getLicense(licenseId)!;
    await A.m.dealClient.say(issuerParty, {
      type: 'terms',
      agreementType: l.type,
      terms: l.terms,
      recordFingerprint: l.recordFingerprint,
      agreementSalt: l.agreementSalt!,
      agreementFingerprint: l.agreementFingerprint,
    });
  });
  const report = await B.run(() =>
    B.m.dealClient.sayOnce(licenseeParty, {
      type: 'statement',
      statementId: 'S-2026-11',
      periodFrom: '2026-11-01',
      periodTo: '2026-11-30',
      basis: 'sales',
      quantity: '1000.00',
      currency: 'USD',
      amountOwed: '50.00',
    }),
  );
  expect(report).toBeDefined();
  const entries = await A.run(() => A.m.dealClient.readAll(issuerParty));
  const statement = entries.find((e) => e.type === 'statement')!;
  await B.run(() =>
    B.m.dealClient.sayOnce(licenseeParty, {
      type: 'paid',
      statementId: 'S-2026-11',
      statementSig: statement.signature,
      amount: '50.00',
      currency: 'USD',
      method: 'bank transfer',
      payTo: 'Practice Bank 0001',
      reference: 'DRILL-S-2026-11',
      paidOn: '2026-12-05',
    }),
  );
  await A.run(() =>
    A.m.dealClient.sayOnce(issuerParty, {
      type: 'received',
      statementId: 'S-2026-11',
      statementSig: statement.signature,
      amount: '50.00',
      currency: 'USD',
    }),
  );
  // The anchoring job runs: every record's proof code in one batch.
  const fps = await A.run(() => A.m.records.allRecords().map((r) => r.recordFingerprint));
  await w.batch(fps);
  return { ...made, local: local.id, licenseId, inviteId, licenseeParty, issuerParty };
};

/** Save a backup with the password and check it, as the backup screen does. */
const backUp = (b: Browser) =>
  b.run(async () => {
    const text = await b.m.backup.backupFileText(PASSWORD);
    expect(await b.m.backup.checkBackup(fileOf(text), PASSWORD)).toMatchObject({ ok: true });
    return text;
  });

/** A new device: nothing in storage, the file restored, the app's own loads run. */
const restoreInto = async (name: string, text: string) => {
  const b = await browser(name);
  expect(b.storage.size).toBe(0);
  const out = await b.run(() => b.m.backup.restoreAny(fileOf(text), PASSWORD));
  await b.run(async () => {
    await b.m.records.hydrate();
    b.m.licenses.startLicenseSync();
    await settle(300);
  });
  return { b, out };
};

/** What a holder has in this browser, item by item (e2e-fixtures/restore-drill-snapshot.ts). */
const snapshot = (b: Browser) =>
  b.run(() =>
    snapshotOf({
      holderKey: b.m.holder.holderKeyIfAny(),
      vaultKey: b.m.vault.vaultKeyIfAny(),
      keys: b.m.keys.allKeys(),
      records: b.m.records.allRecords(),
      licenses: b.m.licenses.allLicenses(),
      issuerDeals: b.m.licenses.issuerDealsForBackup(),
      held: b.m.held.heldLicenses(),
      lab: b.m.attester.loadAttester(),
      deviceOnly: Object.keys(b.m.outbox.deviceOnlyRecords()),
      revs: b.m.api.revMarks(),
    }),
  );

/** Each record still works with what came back: proof code, key, inclusion proof. */
const stillWorks = async (b: Browser, file: Record<string, unknown>) =>
  b.run(async () => {
    const { verifyInclusion } = await import('veilcore-records');
    const proofs = file.proofs as Record<string, { commitment: string }>;
    for (const r of b.m.records.allRecords()) {
      expect(await b.m.records.checkIntegrity(r), r.id).toBe('match');
      const k = b.m.keys.keysFor(r.id);
      expect(k, `${r.id} has its key`).toBeDefined();
      // The key proves this record and no other: what a prove link and a date stamp both rest on.
      expect(b.m.keyBinding.bindingForSecret(k!.recordSecret).keyBinding, r.id).toBe(r.keyBinding);
      const proof = proofs[r.recordFingerprint];
      expect(proof?.commitment, `${r.id}'s inclusion proof is in the file`).toBe(r.recordFingerprint);
      expect(await verifyInclusion(proof as never), r.id).toBe(true);
    }
  });

/** The backup's inner JSON (opened with the password). */
const opened = (b: Browser, text: string) => b.run(() => b.m.backup.unlockBackup(JSON.parse(text) as never, PASSWORD));

/**
 * What the file alone does not bring back when the registry is gone, by snapshot item. Each one is
 * said in docs/runbooks/backup-restore-drill.md and docs/without-veilcore.md. This list must match
 * exactly: a new gap fails the drill, and so does a gap that was closed (take it off the list).
 */
const GAPS_WITHOUT_REGISTRY = (m: Made) => [
  // The licensor's agreement itself (terms, state, royalty log) lives on the registry only. The
  // file keeps its keys (license keys, restored) and every signed deal message (dealRecords,
  // checkable with `veilcore-records deal`), but the app can't show the license from them.
  `license ${m.licenseId}`,
];

describe('the backup restore drill', () => {
  it('a new device gets everything back from the file, byte for byte, and it all still works', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const text = await backUp(A);
    const textB = await backUp(B);
    const textL = await backUp(L);
    expect(JSON.parse(text)).toMatchObject({ format: 'veilcore-backup', version: 4 });
    expect(text).not.toContain('Drill Pippin');
    const want = await snapshot(A);
    // The set is what the drill says it is.
    const doc = await A.run(() => A.m.records.getRecord(made.doc)!);
    expect(doc.labSignature && doc.labOnChain && doc.claims?.length).toBeTruthy();
    expect(await A.run(() => A.m.records.getRecord(made.child)!.parents?.[0]?.recordId)).toBe(made.plant);
    expect(await A.run(() => A.m.keys.keysFor(made.plant)?.dnaOnChain?.status)).toBe('paired');
    expect(await A.run(() => A.m.records.getRecord(made.local)?.deviceOnly)).toBe(true);
    expect(Object.keys(want).filter((k) => k.startsWith('record ')).length).toBe(5);

    // A new phone, the registry still there.
    const { b: A2, out } = await restoreInto('breeder-new-phone', text);
    expect(out).toMatchObject({ holderKey: 'restored', vaultKey: 'restored', records: 5 });
    const got = await snapshot(A2);
    expect(differ(want, got), 'came back different').toEqual([]);
    const file = await opened(A2, text);
    await stillWorks(A2, file);
    // The locked details open: the registry's sealed rows, read with the vault key from the file.
    expect(await A2.run(() => A2.m.records.getRecord(made.plant)?.notes)).toBe('a plant record for the restore drill');
    // The lab's signature still checks against the record it signed, and the claim still names it.
    await A2.run(async () => {
      const { labSignatureChecks } = await import('./lab-attest');
      const { claimMaterial, commitmentHex } = await import('./claims-input');
      const d = A2.m.records.getRecord(made.doc)!;
      const commitment = commitmentHex(await claimMaterial(d as never));
      expect(labSignatureChecks(d.labSignature!, commitment)).toBe(true);
      expect(d.claims?.[0]?.record).toBe(commitment);
    });

    // The licensor can still act on the license: read the settled report, and send a message.
    const party = await A2.run(() => A2.m.dealClient.dealParty(A2.m.licenses.getLicense(made.licenseId)!.onChain!)!);
    const read = await A2.run(() => A2.m.dealClient.readAll(party));
    expect(read.map((e) => e.type)).toEqual(['terms', 'statement', 'paid', 'received']);
    await A2.run(() =>
      A2.m.dealClient.sayOnce(party, {
        type: 'payout',
        method: 'bank transfer',
        account: 'Practice Bank 0002',
        currency: 'USD',
      }),
    );

    // The licensee on a new phone too: same license secret, the whole deal, and can still report.
    const { b: B2, out: outB } = await restoreInto('licensee-new-phone', textB);
    // Said as restored on the page (RestorePage), not "nothing new": the license came back.
    expect(outB).toMatchObject({ records: 0, licenses: 1 });
    expect(differ(await snapshot(B), await snapshot(B2))).toEqual([]);
    const heldParty = await B2.run(() => {
      const h = B2.m.held.heldLicense(made.inviteId)!;
      return { ...made.licenseeParty, mySecret: h.partySecret!, theirPublic: h.issuerNonce! };
    });
    expect((await B2.run(() => B2.m.dealClient.readAll(heldParty))).map((e) => e.type)).toEqual([
      'terms',
      'statement',
      'paid',
      'received',
      'payout',
    ]);
    await B2.run(() =>
      B2.m.dealClient.sayOnce(heldParty, {
        type: 'statement',
        statementId: 'S-2026-12',
        periodFrom: '2026-12-01',
        periodTo: '2026-12-31',
        basis: 'sales',
        quantity: '400.00',
        currency: 'USD',
        amountOwed: '20.00',
      }),
    );
    expect((await A2.run(() => A2.m.dealClient.readAll(party))).filter((e) => e.type === 'statement')).toHaveLength(2);

    // The lab on a new computer: the same signing key, so it signs as the same lab.
    const { b: L2, out: outL } = await restoreInto('lab-new-computer', textL);
    expect(outL.labSignature).toBe(true);
    expect(differ(await snapshot(L), await snapshot(L2))).toEqual([]);
    const labKeyText = await L2.run(async () => {
      const { claimsKeyFor } = await import('./claims-key');
      return claimsKeyFor(L2.m.attester.loadAttester()!.keypair.privateKey).keyText;
    });
    expect(labKeyText).toBe(doc.labSignature!.key);
  });

  it('with the registry gone, the file alone brings back every record, key, lab signature and claim', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const text = await backUp(A);
    const want = await snapshot(A);
    w.goDown();
    const { b: A3, out } = await restoreInto('breeder-registry-gone', text);
    expect(out).toMatchObject({ fromFile: { added: 5 }, evidence: 3 });
    const got = await snapshot(A3);
    // Only the known gaps differ: the license is not there at all.
    expect(differ(want, got), 'came back different (beyond the gaps the runbook lists)').toEqual(
      GAPS_WITHOUT_REGISTRY(made).map((k) => differ({ [k]: want[k] }, {})[0]),
    );
    await stillWorks(A3, await opened(A3, text));
    // The license's signed messages are in the file, for the holder to show.
    const file = await opened(A3, text);
    const deals = file.dealRecords as { messages: { message: { type: string } }[] }[];
    expect(deals.map((d) => d.messages.map((x) => x.message.type))).toEqual([
      ['terms', 'statement', 'paid', 'received'],
    ]);
  });

  it('a record made while the registry was out of reach, still waiting to be saved, is in the file too', async () => {
    const A = await browser('breeder');
    await A.run(async () => {
      A.m.records.createRecord(
        await A.m.seal.sealRecord({
          strainName: 'Saved first (test data)',
          bredBy: 'Practice Breeder',
          dateCreated: '2026-11-01',
          notes: '',
          parents: [],
          breedingMethod: '',
          photoFingerprints: [],
          refId: '',
          taxon: '',
        }),
      );
      await settle(100);
    });
    await backUp(A);
    await settle(200);
    w.goDown();
    const waiting = await A.run(async () => {
      const r = A.m.records.createRecord(
        await A.m.seal.sealRecord({
          strainName: 'Made offline (test data)',
          bredBy: 'Practice Breeder',
          dateCreated: '2026-11-26',
          notes: 'typed while the registry was out of reach',
          parents: [],
          breedingMethod: '',
          photoFingerprints: [],
          refId: '',
          taxon: '',
        }),
      );
      await settle(200);
      return r;
    });
    expect(await A.run(() => A.m.outbox.inOutbox(waiting.id))).toBe(true);
    const text = await backUp(A);
    const { b: N } = await restoreInto('new-device', text);
    const back = await N.run(() => N.m.records.getRecord(waiting.id));
    expect(back?.notes).toBe('typed while the registry was out of reach');
    expect(await N.run(() => N.m.records.checkIntegrity(back!))).toBe('match');
    expect(await N.run(() => N.m.keys.keysFor(waiting.id)?.recordSecret)).toBe(
      await A.run(() => A.m.keys.keysFor(waiting.id)?.recordSecret),
    );
  });

  it('a wrong password, a missing one, a cut-off file and a changed file are refused, with nothing changed', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    await makeTheSet(A, B, L);
    const text = await backUp(A);
    const box = JSON.parse(text) as { locked: { ct: string } };
    const flipped = JSON.stringify({
      ...box,
      locked: { ...box.locked, ct: (box.locked.ct[0] === 'A' ? 'B' : 'A') + box.locked.ct.slice(1) },
    });
    const N = await browser('new-device');
    const tries: [string, string | undefined, RegExp][] = [
      [text, 'not the password', /wrong password|didn’t open|password/i],
      [text, undefined, /password/i],
      [text.slice(0, Math.floor(text.length / 2)), PASSWORD, /isn't a VeilCore backup/],
      [flipped, PASSWORD, /password/i],
    ];
    for (const [t, pw, words] of tries) {
      await expect(N.run(() => N.m.backup.restoreAny(fileOf(t), pw))).rejects.toThrow(words);
      expect([...N.storage.keys()], 'nothing was written').toEqual([]);
    }
  });

  // The file's lab signatures and claims are never taken on its word (held-evidence.ts): each must
  // check against the record it is put on. A doctored file, with the registry gone so nothing
  // comes back from it instead, writes none of them.
  const doctored = async (doctor: (ev: Record<string, Record<string, unknown>>, m: Made) => void) => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const ev = inner.heldEvidence as Record<string, Record<string, unknown>>;
    expect(Object.keys(ev)).toEqual([made.doc]);
    doctor(ev, made);
    w.goDown();
    const N = await browser('new-device');
    const out = await N.run(() => N.m.backup.restoreAny(fileOf(JSON.stringify(inner))));
    expect(out.fromFile).toMatchObject({ added: 5 });
    expect(out.evidence ?? 0, 'nothing from the file was put back').toBe(0);
    const written = await N.run(() =>
      N.m.records
        .allRecords()
        .filter((r) => r.labSignature || r.labOnChain || r.claims?.length)
        .map((r) => r.id),
    );
    expect(written, 'no lab signature, Midnight call or claim on any record').toEqual([]);
  };
  const sigOf = (ev: Record<string, Record<string, unknown>>, id: string) =>
    ev[id].labSignature as Record<string, string>;
  const claimOf = (ev: Record<string, Record<string, unknown>>, id: string) =>
    (ev[id].claims as Record<string, unknown>[])[0];

  it('a valid lab signature moved onto another record is not put back', async () => {
    await doctored((ev, m) => {
      // The document's real signature and Midnight call, said to be the plant's; no claims.
      ev[m.plant] = { labSignature: ev[m.doc].labSignature, labOnChain: ev[m.doc].labOnChain };
      delete ev[m.doc];
    });
  });

  it('a changed lab signature is not put back', async () => {
    await doctored((ev, m) => {
      const sig = sigOf(ev, m.doc);
      ev[m.doc] = { labSignature: { ...sig, s: (BigInt(sig.s) + 1n).toString() }, labOnChain: ev[m.doc].labOnChain };
    });
  });

  it('a claim naming another record is not put back', async () => {
    await doctored((ev, m) => {
      const real = claimOf(ev, m.doc);
      // On its own record, with that record's key binding, but naming another commitment.
      ev[m.doc] = { claims: [{ ...real, record: 'ab'.repeat(32) }] };
      // And the real claim moved onto the plant, with no key binding to give it away.
      const { keyBinding: _k, ...unbound } = real;
      void _k;
      ev[m.plant] = { claims: [unbound] };
    });
  });

  it('a file whose records were changed puts back none of them, and says so', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const rows = inner.recordData as Record<string, unknown>[];
    rows.find((r) => r.id === made.animal)!.notes = 'changed after it was sealed';
    w.goDown();
    const N = await browser('new-device');
    const out = await N.run(() => N.m.backup.restoreAny(fileOf(JSON.stringify(inner))));
    expect(out.fromFile && 'error' in out.fromFile ? out.fromFile.error : '').toMatch(/does not match its fields/);
    // No record from the file is put back: all of them or none.
    expect(await N.run(() => N.m.records.allRecords().length)).toBe(0);
    // The keys are: a key is the one thing nobody can make again (backup.ts restoreAny).
    expect(await N.run(() => N.m.keys.allKeys().length)).toBe(5);
  });

  it('restoring the same file twice adds nothing', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    await makeTheSet(A, B, L);
    const text = await backUp(A);
    const { b: A2 } = await restoreInto('breeder-new-phone', text);
    const once = await snapshot(A2);
    const again = await A2.run(() => A2.m.backup.restoreAny(fileOf(text), PASSWORD));
    expect(again).toMatchObject({ holderKey: 'already', vaultKey: 'already', fromFile: { added: 0, alreadyHere: 5 } });
    await A2.run(async () => {
      await A2.m.records.hydrate();
      await settle(300);
    });
    expect(differ(once, await snapshot(A2))).toEqual([]);
    expect(await A2.run(() => A2.m.records.allRecords().length)).toBe(5);
    expect(await A2.run(() => A2.m.licenses.allLicenses().length)).toBe(1);
  });

  it('the backup opens without the website: verify.html’s checks and veilcore-records', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const text = await backUp(A);
    const inner = await opened(A, text);
    // The evidence bundle's offline page (verify.html) runs this code with no network: every
    // record's sealed fields in the file recompute to its proof code, and its proof folds.
    const VeilcoreVerify = loadPageVerifier<{ fingerprintOf: (f: unknown) => Promise<{ fingerprint: string }> }>();
    const rows = inner.recordData as { id: string; recordFingerprint: string }[];
    const sealed = inner.sealedFields as Record<string, unknown>;
    expect(Object.keys(sealed).sort()).toEqual(rows.map((r) => r.id).sort());
    for (const r of rows)
      expect((await VeilcoreVerify.fingerprintOf(sealed[r.id])).fingerprint, r.id).toBe(r.recordFingerprint);

    // `npx veilcore-records backup` and `deal`, as a holder runs them with VeilCore gone.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-drill-'));
    const file = path.join(dir, 'VeilCore backup 2026-11-26.json');
    fs.writeFileSync(file, text);
    const cli = path.resolve(HERE, '../../../node_modules/veilcore-records/bin/veilcore.mjs');
    const env = { ...process.env, VEILCORE_BACKUP_PASSWORD: PASSWORD };
    const tool = (args: string[], e = env) =>
      run(process.execPath, [cli, ...args], { env: e }).then(
        (x) => ({ code: 0, ...x }),
        (x: { code: number; stdout: string; stderr: string }) => x,
      );
    try {
      const records = await tool(['backup', file, '--out', path.join(dir, 'out')]);
      expect(records.stdout).not.toContain(await A.run(() => A.m.holder.holderKeyIfAny()!));
      // KNOWN GAP (veilcore-records 0.18.1, in veilcore-sdk): its fingerprint for a document with
      // sealed numbers leaves out the field-set step (SPEC 4.5), so that one record is reported as
      // not matching although verify.html's check above passes it. Every other record checks out.
      // When a fixed version is pinned this fails: then expect "All 5 records check out." here.
      const failing = [...records.stdout.matchAll(/^(VEIL-[0-9A-F]+) .*\n\s+fingerprint\s+DOES NOT MATCH/gm)].map(
        (m) => m[1],
      );
      expect(failing).toEqual([made.doc]);
      expect(records.stdout).toContain('FAILED: 1 of 5 records did not check out.');
      expect(records.stdout.match(/the proof folds to root/g)).toHaveLength(4);
      // It writes a folder for each record that checked out, the other four.
      expect(fs.readdirSync(path.join(dir, 'out')).sort()).toEqual(
        rows
          .map((r) => r.id)
          .filter((id) => id !== made.doc)
          .sort(),
      );
      const deal = await tool(['deal', file]);
      expect(deal.code).toBe(0);
      expect(deal.stdout).toContain('4 of 4 signed by the side they name');
      expect(deal.stdout).toContain('50.00 USD  settled: paid 2026-12-05 by bank transfer, ref DRILL-S-2026-11');
      expect(deal.stdout).toMatch(/settled \(both signed\)\s+50 USD/);
      const wrong = await tool(['backup', file], { ...env, VEILCORE_BACKUP_PASSWORD: 'wrong' });
      expect(wrong.code).not.toBe(0);
      expect(wrong.stderr).toMatch(/wrong password/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---- the Bitcoin and RFC 3161 files (stamps.ts) ---------------------------------------------
//
// The two clocks that don't depend on Midnight: the batch's Bitcoin stamp file and its TSA token,
// and each record's own TSA token. They are in the file, come back with the registry gone, and the
// evidence bundle made then still carries them and checks offline. A file's stamps are never taken
// on its word: one moved to another batch or record, or changed, is refused and nothing of it is
// written.

type StampsJson = {
  format: string;
  batches: Record<
    string,
    { root: string; ots?: string; otsStatus?: string; bitcoinBlockHeight?: number; tsts?: { token: string }[] }
  >;
  records: Record<string, { instant?: { token: string }[] }>;
};

const hexBytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));

/** The evidence bundle for a record, as the record page makes it: gathered, built, the files. */
const bundleOf = (b: Browser, id: string) =>
  b.run(async () => {
    const r = b.m.records.getRecord(id)!;
    const gathered = await b.m.bundle.gatherEvidence(r);
    if ('error' in gathered) throw new Error(gathered.error);
    const ev = await b.m.bundle.buildEvidence(r, gathered, { includeKey: false }, b.m.keys.keysFor(id));
    const files = await b.m.bundle.bundleFiles(ev, gathered, { includeKey: false });
    const file = (p: string) => Object.entries(files).find(([k]) => k.endsWith(`/${p}`))?.[1];
    return { gathered, ev, file };
  });

/** What verify.html and openssl say about a bundle's Bitcoin file and TSA token, with no network. */
const checkOffline = async (file: (p: string) => Uint8Array | undefined) => {
  const root = Buffer.from(file('proof/root.bin')!).toString('hex');
  const page = loadPageVerifier<{
    readStamp: (b: Uint8Array, root: string) => Promise<{ status: string; bitcoin?: { height: number }[] }>;
  }>();
  const stamp = await page.readStamp(file('proof/root.bin.ots')!, root);
  const tst = file('proof/root.tst')!;
  const sdk = await verifyTimestampToken(tst, hexBytes(root));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-drill-tst-'));
  try {
    fs.writeFileSync(path.join(dir, 'root.bin'), file('proof/root.bin')!);
    fs.writeFileSync(path.join(dir, 'root.tst'), tst);
    // The README's own step: openssl ts -verify -data root.bin -in root.tst -token_in -CAfile <chain>.
    const ssl = await run('openssl', [
      'ts',
      '-verify',
      '-data',
      path.join(dir, 'root.bin'),
      '-in',
      path.join(dir, 'root.tst'),
      '-token_in',
      '-CAfile',
      tsa.caFile,
    ]).then(
      (x) => x.stdout,
      (x: { stdout: string; stderr: string }) => `${x.stdout}${x.stderr}`,
    );
    return { stamp, sdk: sdk.ok, openssl: ssl.trim() };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe('the backup restore drill: the Bitcoin and RFC 3161 files', () => {
  it('are in the file, come back with the registry gone, and the evidence bundle still checks offline', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const text = await backUp(A);
    const inner = await opened(A, text);
    const stamps = inner.stamps as StampsJson;
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    expect(stamps.format).toBe('veilcore/stamps/v1');
    expect(Object.keys(stamps.batches)).toEqual([BATCH_ID]);
    const batch = stamps.batches[BATCH_ID];
    expect(batch).toMatchObject({ otsStatus: 'pending' });
    expect(Buffer.from(batch.ots!, 'base64')).toEqual(w.ots.get(BATCH_ID));
    expect(batch.tsts?.length).toBe(1);
    expect(Object.keys(stamps.records).sort()).toEqual([...fps].sort());
    for (const fp of fps) expect(stamps.records[fp].instant?.[0]?.token, fp).toBe(w.instant.get(fp));

    w.goDown();
    const { b: A3, out } = await restoreInto('breeder-registry-gone', text);
    // The batch's Bitcoin file and TSA token, and each of the five records' own token.
    expect(out.stamps).toBe(2 + fps.length);
    for (const id of [made.plant, made.animal, made.doc, made.local]) {
      const { gathered, ev, file } = await bundleOf(A3, id);
      // A new device with the registry gone can't confirm the batch root: the bundle says so.
      expect(gathered.source, id).toBe('backup-file');
      expect(Buffer.from(file('README.txt')!).toString().replace(/\s+/g, ' ')).toContain(
        'NOT CONFIRMED: The batch root, the proof that leads to it and its stamps were restored from a backup file and are not yet confirmed with VeilCore’s registry or Midnight.',
      );
      expect(Buffer.from(file('EXAMINER-SUMMARY.html')!).toString()).toContain('Not confirmed:');
      expect(ev.batch?.opentimestamps).toMatchObject({
        available: true,
        status: 'pending',
        file: 'proof/root.bin.ots',
      });
      expect(ev.batch?.rfc3161).toMatchObject({ available: true, file: 'proof/root.tst' });
      const offline = await checkOffline(file);
      expect(offline.stamp.status, id).toBe('pending');
      expect(offline.sdk, id).toBe(true);
      expect(offline.openssl, id).toMatch(/Verification: OK/);
    }
    // A backup made on the restored device, the registry still gone, carries all of it again,
    // marked unconfirmed: the proofs in `stamps.unconfirmedProofs`, never in `proofs`.
    const again = await opened(A3, await backUp(A3));
    const carried = again.stamps as StampsJson & { unconfirmedProofs: Record<string, unknown> };
    expect(carried.batches).toEqual({ [BATCH_ID]: { ...batch, unconfirmed: true } });
    expect(carried.records).toEqual(stamps.records);
    expect(again.proofs, 'nothing unconfirmed in proofs').toBeUndefined();
    expect(Object.keys(carried.unconfirmedProofs).sort()).toEqual([...fps].sort());
    const { verifyInclusion } = await import('veilcore-records');
    for (const fp of fps) expect(await verifyInclusion(carried.unconfirmedProofs[fp] as never), fp).toBe(true);
    // Once the registry is back, the next backup confirms them: in `proofs`, nothing marked.
    w.goUp();
    const online = await opened(A3, await backUp(A3));
    expect(Object.keys(online.proofs as object).sort()).toEqual([...fps].sort());
    expect((online.stamps as StampsJson & { unconfirmedProofs?: unknown }).unconfirmedProofs).toBeUndefined();
    expect((online.stamps as StampsJson).batches[BATCH_ID]).toEqual(batch);
    w.goDown();
    expect((await bundleOf(A3, made.plant)).gathered.source).toBe('this-device');
  });

  it('a pending Bitcoin stamp is kept, finished on a later backup, and never swapped back', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const firstText = await backUp(A);
    const first = (await opened(A, firstText)).stamps as StampsJson;
    expect(first.batches[BATCH_ID].otsStatus).toBe('pending');
    w.upgrade();
    const text = await backUp(A);
    const done = (await opened(A, text)).stamps as StampsJson;
    expect(done.batches[BATCH_ID]).toMatchObject({ otsStatus: 'bitcoin', bitcoinBlockHeight: STAMP_BLOCK });
    expect(Buffer.from(done.batches[BATCH_ID].ots!, 'base64')).toEqual(w.ots.get(BATCH_ID));
    // A registry that serves the pending file again doesn't take the finished one away.
    const root = done.batches[BATCH_ID].root;
    w.ots.set(BATCH_ID, otsFile(root));
    const later = (await opened(A, await backUp(A))).stamps as StampsJson;
    expect(later.batches[BATCH_ID].ots).toBe(done.batches[BATCH_ID].ots);
    // Nor does restoring the older file, which holds the pending one.
    await A.run(() => A.m.backup.restoreAny(fileOf(firstText), PASSWORD));
    const after = (await opened(A, await backUp(A))).stamps as StampsJson;
    expect(after.batches[BATCH_ID].ots).toBe(done.batches[BATCH_ID].ots);
    // With the registry gone, the bundle from the restored device names the Bitcoin block.
    w.goDown();
    const { b: A3 } = await restoreInto('breeder-registry-gone', text);
    const { ev, file } = await bundleOf(A3, made.plant);
    expect(ev.batch?.opentimestamps).toMatchObject({ status: 'bitcoin', bitcoinBlockHeight: STAMP_BLOCK });
    const offline = await checkOffline(file);
    expect(offline.stamp).toMatchObject({ status: 'bitcoin', bitcoin: [{ height: STAMP_BLOCK }] });
  });

  // A doctored file, restored with the registry gone so nothing can come back from it instead.
  const doctoredStamps = async (doctor: (s: StampsJson, m: Made, fps: Record<string, string>) => void) => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const fps = await A.run(() => Object.fromEntries(A.m.records.allRecords().map((r) => [r.id, r.recordFingerprint])));
    doctor(inner.stamps as StampsJson, made, fps);
    w.goDown();
    const N = await browser('new-device');
    const out = await N.run(() => N.m.backup.restoreAny(fileOf(JSON.stringify(inner))));
    expect(out.fromFile).toMatchObject({ added: 5 });
    expect(out.stamps ?? 0, 'nothing from the file was put back').toBe(0);
    // The proof still comes back (it checks); the doctored files don't.
    const { ev } = await bundleOf(N, made.plant);
    expect(ev.batch?.opentimestamps.available).toBe(false);
    expect(ev.batch?.rfc3161.available).toBe(false);
    const kept = (await opened(N, await backUp(N))).stamps as StampsJson | undefined;
    expect(kept?.batches ?? {}, 'and a backup made there carries none of them').toEqual({});
    expect(kept?.records ?? {}).toEqual({});
  };

  /** Another batch's files: a real stamp file and token, for a root none of these records lead to. */
  const otherBatch = () => {
    const root = 'ee'.repeat(32);
    return { root, ots: otsFile(root, { bitcoin: STAMP_BLOCK }).toString('base64'), token: tsa.tokenFor(root) };
  };
  const flipped = (b64: string, at: number) => {
    const b = Buffer.from(b64, 'base64');
    b[at < 0 ? b.length + at : at] ^= 0x01;
    return b.toString('base64');
  };

  it('a stamp moved to another batch is refused', async () => {
    await doctoredStamps((s) => {
      const other = otherBatch();
      // The other batch's files said to be this batch's: with its own root, and with this root.
      s.batches[BATCH_ID] = { root: other.root, ots: other.ots, otsStatus: 'bitcoin', tsts: [{ token: other.token }] };
      s.batches['B-20261126-MOVED'] = { ...s.batches[BATCH_ID] };
      s.records = {};
    });
  });

  it('another batch’s files said to start from this batch’s root are refused', async () => {
    await doctoredStamps((s) => {
      const other = otherBatch();
      const root = s.batches[BATCH_ID].root;
      s.batches = { [BATCH_ID]: { root, ots: other.ots, otsStatus: 'bitcoin', tsts: [{ token: other.token }] } };
      s.records = {};
    });
  });

  it('this batch’s real files under another batch’s name are refused', async () => {
    await doctoredStamps((s) => {
      s.batches = { 'B-20261126-OTHER': s.batches[BATCH_ID] };
      s.records = {};
    });
  });

  it('a changed token or stamp file is refused', async () => {
    await doctoredStamps((s) => {
      const b = s.batches[BATCH_ID];
      // The token's signature changed (its last byte), the stamp file's starting digest changed.
      s.batches[BATCH_ID] = {
        ...b,
        ots: flipped(b.ots!, 40),
        tsts: b.tsts!.map((t) => ({ token: flipped(t.token, -1) })),
      };
      for (const r of Object.values(s.records)) r.instant = r.instant!.map((t) => ({ token: flipped(t.token, -1) }));
    });
  });

  it('a record’s own token moved onto another record is refused', async () => {
    await doctoredStamps((s, m, fps) => {
      const plant = s.records[fps[m.plant]];
      s.records = { [fps[m.animal]]: plant, [fps[m.plant]]: s.records[fps[m.animal]] };
      s.batches = {};
    });
  });
  it('a token from a timestamp authority the site doesn’t pin is refused', async () => {
    await doctoredStamps((s, _m, fps) => {
      // Real tokens on the right bytes, from a TSA of the file maker's own.
      const root = s.batches[BATCH_ID].root;
      s.batches = { [BATCH_ID]: { root, tsts: [{ token: stranger.tokenFor(root) }] } };
      s.records = Object.fromEntries(
        Object.values(fps).map((fp) => [fp, { instant: [{ token: stranger.tokenFor(fp) }] }]),
      );
    });
  });

  // Review of PR #233: proof codes are public, so a made-up file can put the holder's own records
  // under the same batch id with a root of its own. It must not take away the stamps kept here.
  it('a file naming the same batch with another root takes nothing kept away', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    w.upgrade();
    const inner = await opened(A, await backUp(A));
    const done = (inner.stamps as StampsJson).batches[BATCH_ID];
    expect(done.otsStatus).toBe('bitcoin');
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    const other = await buildBatch([...fps, 'aa'.repeat(32)], BATCH_ID);
    expect(other.root).not.toBe(done.root);
    const crafted = {
      ...inner,
      proofs: other.proofs,
      stamps: {
        format: 'veilcore/stamps/v1',
        batches: {
          [BATCH_ID]: { root: other.root, ots: otsFile(other.root).toString('base64'), otsStatus: 'pending' },
        },
        records: {},
      },
    };
    await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify(crafted))));
    w.goDown();
    const after = (await opened(A, await backUp(A))).stamps as StampsJson;
    expect(after.batches[BATCH_ID], 'the finished Bitcoin stamp and its token are still here').toEqual(done);
    const { ev } = await bundleOf(A, made.plant);
    expect(ev.batch?.root).toBe(done.root);
    expect(ev.batch?.opentimestamps).toMatchObject({ available: true, status: 'bitcoin' });
    expect(ev.batch?.rfc3161.available).toBe(true);
  });

  it('kept stamps go only when their record is deleted, not when it is missing from one backup', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    await backUp(A);
    const fpOf = (id: string) => A.run(() => A.m.records.getRecord(id)!.recordFingerprint);
    const plantFp = await fpOf(made.plant);
    const animalFp = await fpOf(made.animal);
    w.goDown();
    // A backup that lists only the plant (another record locked here, say) keeps the animal's.
    await A.run(() => A.m.stamps.stampsForBackup([{ id: made.plant, recordFingerprint: plantFp }], {}));
    expect(await A.run(() => A.m.stamps.keptEvidence(animalFp))).not.toBeNull();
    // Deleted on this browser: its kept copy goes at the next backup; the plant's stays.
    await A.run(() => A.m.keys.forgetKeys(made.animal));
    await A.run(() => A.m.stamps.stampsForBackup([{ id: made.plant, recordFingerprint: plantFp }], {}));
    expect(await A.run(() => A.m.stamps.keptEvidence(animalFp))).toBeNull();
    expect((await A.run(() => A.m.stamps.keptEvidence(plantFp)))?.ots).toBeTruthy();
  });
  // Second review of PR #233: what comes only from a backup file is unconfirmed. Proof codes are
  // public, so a made-up file can put the holder's records under a root of its own, with a pending
  // Bitcoin file and a real token (a public TSA stamps any 32 bytes, dated now) on that root.
  const confirmedSet = async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    w.upgrade();
    const text = await backUp(A);
    const inner = await opened(A, text);
    const done = (inner.stamps as StampsJson).batches[BATCH_ID];
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    const other = await buildBatch([...fps, 'aa'.repeat(32)], BATCH_ID);
    const crafted = {
      ...inner,
      proofs: Object.fromEntries(
        Object.entries(other.proofs).map(([k, p]) => [
          k,
          { ...(p as object), anchor: (inner.proofs as Record<string, { anchor: unknown }>)[k]?.anchor },
        ]),
      ),
      stamps: {
        format: 'veilcore/stamps/v1',
        records: {},
        batches: {
          [BATCH_ID]: {
            root: other.root,
            ots: otsFile(other.root).toString('base64'),
            tsts: [{ token: tsa.tokenFor(other.root) }],
          },
        },
      },
    };
    return { A, made, text, inner, done, fps, other, crafted };
  };
  /** This browser's kept copy, as it is stored (stamps.ts), for a test to change. */
  const editKept = (b: Browser, change: (k: Record<string, Record<string, unknown>>) => void) =>
    b.run(async () => {
      const { inflateSync, deflateSync, strFromU8, strToU8 } = await import('fflate');
      const { base64 } = await import('@scure/base');
      const raw = JSON.parse(localStorage.getItem('veilcore.stamps.v1')!) as { z: string };
      const k = JSON.parse(strFromU8(inflateSync(base64.decode(raw.z)))) as Record<string, Record<string, unknown>>;
      change(k);
      localStorage.setItem(
        'veilcore.stamps.v1',
        JSON.stringify({ v: 1, z: base64.encode(deflateSync(strToU8(JSON.stringify(k)))) }),
      );
    });

  it('a made-up root on a device with no kept copy is only unconfirmed, said so, and not spread as confirmed', async () => {
    const { A, made, crafted, other, fps } = await confirmedSet();
    await A.run(() => localStorage.removeItem('veilcore.stamps.v1'));
    await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify(crafted))));
    w.goDown();
    // Nothing here can tell it from the real one: the bundle carries it, and says on every page
    // that it is not confirmed.
    const { gathered, ev, file } = await bundleOf(A, made.plant);
    expect(gathered.source).toBe('backup-file');
    expect(ev.batch?.root).toBe(other.root);
    expect(Buffer.from(file('README.txt')!).toString()).toContain('NOT CONFIRMED:');
    expect(Buffer.from(file('EXAMINER-SUMMARY.html')!).toString()).toContain('Not confirmed:');
    expect(Buffer.from(file('evidence.json')!).toString()).toContain('not yet confirmed with VeilCore’s registry');
    // The next backup carries it only as unconfirmed: never in `proofs`.
    const next = await opened(A, await backUp(A));
    expect(next.proofs).toBeUndefined();
    const st = next.stamps as StampsJson & { unconfirmedProofs: Record<string, { root: string }> };
    expect(st.unconfirmedProofs[fps[0]].root).toBe(other.root);
    expect(st.batches[BATCH_ID]).toMatchObject({ root: other.root, unconfirmed: true });
  });

  it('the genuine file restored after a made-up one is not blocked, and the registry settles it', async () => {
    const { A, made, text, crafted, other, done, fps } = await confirmedSet();
    await A.run(() => localStorage.removeItem('veilcore.stamps.v1'));
    await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify(crafted))));
    w.goDown();
    // The genuine file: its stamps go back (the made-up one doesn't win), and with two files
    // disagreeing and no registry to ask, the batch is torn: neither is used or carried.
    const genuine = await A.run(() => A.m.backup.restoreAny(fileOf(text), PASSWORD));
    expect(genuine.stamps).toBe(2 + fps.length);
    for (const fp of fps) expect(await A.run(() => A.m.stamps.keptEvidence(fp)), fp).toBeNull();
    const torn = (await opened(A, await backUp(A))).stamps as StampsJson & { unconfirmedProofs?: unknown };
    expect(torn.batches).toEqual({});
    expect(torn.unconfirmedProofs).toBeUndefined();
    // The registry back: its answer wins, the made-up root's files go, and the kept copy is the
    // real one, finished Bitcoin stamp included.
    w.goUp();
    const online = await opened(A, await backUp(A));
    expect((online.proofs as Record<string, { root: string }>)[fps[0]].root).toBe(done.root);
    expect((online.stamps as StampsJson).batches[BATCH_ID]).toEqual(done);
    w.goDown();
    const { gathered, ev } = await bundleOf(A, made.plant);
    expect(gathered.source).toBe('this-device');
    expect(ev.batch?.opentimestamps).toMatchObject({ available: true, status: 'bitcoin' });
    // The made-up file again changes nothing now.
    expect((await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify(crafted))))).stamps ?? 0).toBe(0);
    expect((await A.run(() => A.m.stamps.keptEvidence(fps[0])))?.proof.root).toBe(done.root);
    expect(other.root).not.toBe(done.root);
  });

  it('a made-up root for a record the registry hasn’t confirmed, in a batch it has, is refused', async () => {
    const { A, text, crafted, done, fps } = await confirmedSet();
    const victim = fps[1];
    // Every record's proof here came from the registry, except this one's.
    await editKept(A, (k) => {
      delete k.proofs[victim];
    });
    await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify(crafted))));
    w.goDown();
    expect(await A.run(() => A.m.stamps.keptEvidence(victim)), 'no made-up root for it').toBeNull();
    const next = await opened(A, await backUp(A));
    expect((next.proofs as Record<string, unknown>)[victim]).toBeUndefined();
    expect((next.stamps as StampsJson & { unconfirmedProofs?: unknown }).unconfirmedProofs).toBeUndefined();
    // The genuine file: its proof leads to the root the registry confirmed for the batch, so it
    // counts as confirmed, with the kept finished stamp.
    await A.run(() => A.m.backup.restoreAny(fileOf(text), PASSWORD));
    const got = await A.run(() => A.m.stamps.keptEvidence(victim));
    expect(got?.confirmed).toBe(true);
    expect(got?.proof.root).toBe(done.root);
    expect(got?.batch.opentimestamps).toMatchObject({ available: true, status: 'bitcoin' });
  });

  it('two files disagreeing about a batch leave it torn for every record in it', async () => {
    const { A, text, inner, other, fps } = await confirmedSet();
    await A.run(() => localStorage.removeItem('veilcore.stamps.v1'));
    w.goDown();
    await A.run(() => A.m.backup.restoreAny(fileOf(text), PASSWORD));
    expect((await A.run(() => A.m.stamps.keptEvidence(fps[0])))?.confirmed).toBe(false);
    // A second file gives another root for one record only, in the same batch.
    const proofs = { [fps[1]]: other.proofs[fps[1]] };
    await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify({ ...inner, proofs, stamps: undefined }))));
    for (const fp of fps) expect(await A.run(() => A.m.stamps.keptEvidence(fp)), fp).toBeNull();
  });

  it('a file that names two roots for one batch gives nothing for it', async () => {
    const { A, inner, other, fps } = await confirmedSet();
    await A.run(() => localStorage.removeItem('veilcore.stamps.v1'));
    // The real proof for one record, a made-up root for another, both said to be the same batch.
    const proofs = { ...(inner.proofs as Record<string, unknown>), [fps[1]]: other.proofs[fps[1]] };
    const out = await A.run(() => A.m.backup.restoreAny(fileOf(JSON.stringify({ ...inner, proofs }))));
    // Only the records' own tokens (on their proof codes, whatever the root) go back.
    expect(out.stamps ?? 0).toBe(fps.length);
    w.goDown();
    for (const fp of fps) expect(await A.run(() => A.m.stamps.keptEvidence(fp)), fp).toBeNull();
  });
});

// ---- every storage name: in the backup, or not needed after a restore ---------------------
//
// A new storage name fails here until it is listed: either the backup field that carries it
// (backup.ts BackupContents), or why a holder loses nothing when it is not carried. That keeps
// a new kind of data from being left out of the file without anyone deciding to.

const IN_THE_FILE: Readonly<Record<string, string>> = {
  'veilcore.holder.v1': 'holderKey',
  'veilcore.vault.v1': 'vaultKey (its dates are set again on restore)',
  'veilcore.record-keys.v1': 'records (each record’s keys, date stamp and DNA pairing on chain)',
  'veilcore.device-only.v1': 'recordData (documents kept on this device only, whole)',
  'veilcore.outbox.v1': 'recordData (records not saved on the registry yet are in the page’s list)',
  'veilcore.attester.v1': 'labSignature (a lab’s signing key)',
  'veilcore.lab-deliveries.v1': 'labDeliveries',
  'veilcore.sent-codes.v1': 'sentCodes',
  'veilcore.receiving.v1': 'receiving',
  'veilcore.rev.v1': 'revs',
  'veilcore.held-licenses.v1': 'heldLicenses',
  'veilcore.issuer-deals.v1': 'issuerDeals',
  'veilcore.lender.v1': 'lender',
  'veilcore.stamps.v1':
    'stamps and proofs (each batch’s Bitcoin stamp file and RFC 3161 tokens, each record’s own tokens)',
  // The page's own copy of records and agreements; the registry holds them, sealed.
  'veilcore.records.v1': 'recordData and heldEvidence (the registry’s collection name; the records themselves)',
};

const NOT_NEEDED: Readonly<Record<string, string>> = {
  'veilcore.': 'a prefix, not a name',
  'veilcore.org': 'the site’s host name',
  'veilcore.licenses.v1':
    'the registry’s collection name: agreements live on the registry (a known gap without it, GAPS_WITHOUT_REGISTRY)',
  'veilcore.vault': 'a Web Lock name',
  'veilcore.ask.job-runner': 'a Web Lock name',
  'veilcore.bulk-ledger': 'a Web Lock name',
  'veilcore.deal-send.': 'a Web Lock name',
  'veilcore.lock.': 'a tab’s lease on a task, for a few seconds',
  'veilcore.e2e.tsa-pins': 'only in the end-to-end build',
  // Marks about this browser, made again by the next checked backup.
  'veilcore.attester.backed-up.v1': 'a “backed up” mark',
  'veilcore.attester.backed-up.copy.v1': 'a “backed up” mark',
  'veilcore.device-only-backup.v1': 'a “backed up” mark',
  'veilcore.issuer-deals-backed-up.v1': 'a “backed up” mark',
  'veilcore.issuer-deals-backed-up.copy.v1': 'a “backed up” mark',
  'veilcore.receiving-backed-up.v1': 'a “backed up” mark',
  'veilcore.record-keys.restored.v1': 'when keys came back on this browser',
  'veilcore.record-keys.forgotten.v1': 'records deleted on this browser (the registry keeps its own list)',
  'veilcore.record-keys.forgotten-at.v1': 'records deleted on this browser (the registry keeps its own list)',
  'veilcore.records.arrived.v1': 'which records arrived by restore, so none is listed as in progress',
  'veilcore.unsure.v1': 'when this browser found its holder key no longer used here',
  'veilcore.vault.made.v1': 'when this browser made a vault key, for the words on a locked record',
  // The account copy (passkey) is a way back of its own, set up again on each device.
  'veilcore.account-copy.v1': 'the account copy, its own way back',
  'veilcore.account.v1': 'the account copy, its own way back',
  'veilcore.account.device.v1': 'the account copy, its own way back',
  'veilcore.account.keep-safe-shown.v1': 'a screen already shown',
  'veilcore.account.last-passkey.v1': 'the account copy, its own way back',
  'veilcore.account.sheet-reminder.v1': 'a reminder already shown',
  // Work under way on this device: finished or dropped there, never a record yet.
  'veilcore.log-draft.v1': 'a record being typed, not sealed yet',
  'veilcore.log-kind.v1': 'which form was last used',
  'veilcore.ask.job.v1': 'an Ask job on this device',
  'veilcore.bulk-import.job.v1': 'a spreadsheet import under way on this device',
  'veilcore.bulk-import.stamps-on.v1': 'a setting of the spreadsheet import',
  'veilcore.bulk-import.stamps.v1': 'key date stamps queued on this device (the stamps themselves are in the keys)',
  'veilcore.bulk-import.v1':
    'which spreadsheet rows became which records (the records are in the file; a new device does not know a re-imported sheet was sealed before)',
  'veilcore.import-layouts.v1': 'remembered spreadsheet columns, a convenience',
  'veilcore.key-stamp-retry.v1': 'date stamps to try again on this device (the stamps themselves are in the keys)',
  'veilcore.deal-outbox.v1.': 'a signed money message on its way, kept minutes until the registry has it',
  'veilcore.outbox-names.v1': 'a delivery’s recipient name, waiting for its record’s next save',
  'veilcore.outbox-offer-keys.v1': 'a delivery’s offer key, waiting; its lab code is in the file (sentCodes)',
  'veilcore.receiving-claims.v1': 'a claim answer kept beside its code (in the file) until the record is sealed',
  'veilcore.receiving-refused.v1': 'codes the registry refused',
  'veilcore.lab-report-dating.v1': 'a note between tabs while a lab report is dated',
  'veilcore.sponsor-ticket.v1': 'the fee sponsor’s ticket for this browser',
  'veilcore.invite-unsure.v1.': 'a license invite whose answer this browser didn’t see',
  // A checker's own choices and requests: not the holder's records.
  'veilcore.partnerKeys.v1': 'payment partner keys a checker named (named again on a new device: a known gap)',
  'veilcore.prove-asks.v1': 'a checker’s prove requests, a week at most',
  'veilcore.verifier-challenges.v1': 'a checker’s challenges, used once',
  'veilcore.verifier-challenges.lasting.v1': 'a checker’s challenges, a day at most',
  'veilcore.record-watch.v1': 'records a checker watches (watched again on a new device: a known gap)',
  'veilcore.record-watch.seen.v1': 'what a checker has seen',
  // Screens and settings.
  'veilcore.role.v1': 'breeder or lab, asked again',
  'veilcore.lang': 'the language picked',
  'veilcore.ask.seen.v1': 'a hint already shown',
  'veilcore.draft-notice-closed.v1': 'a notice already closed',
  'veilcore.homescreen.fresh': 'a Home Screen launch',
  'veilcore.in-app-notice.closed': 'a notice already closed',
  'veilcore.install-card.v1': 'a card already closed',
  'veilcore.lab-visibility-seen.v2': 'a note already shown',
  'veilcore.note.old-links.v1': 'a note already shown',
  'veilcore.opened-results.v1': 'which reports were opened here',
  'veilcore.stamp-pressed.v1': 'which stamps were pressed here',
  // Browser storage that isn't Web Storage, or isn't named veilcore.: still decided here.
  'veilcore-offline':
    'IndexedDB: a copy of the dating rows waiting in the send queue (outbox, in the file) and of the holder key (in the file), for the offline worker',
  'veilcore-offline-meta': 'Cache Storage: the offline worker’s notes about the cached site',
  'veilcore-shell-': 'Cache Storage: the cached site itself, fetched again',
  'veilcore-': 'a prefix the offline worker and Start over clear caches by',
  'veilcore:backup-return': 'sessionStorage: which page to go back to after the backup page',
  'veilcore:intake': 'sessionStorage: an intake hand-over under way in this tab',
  'veilcore:passkey-copy': 'what this browser remembered of an old passkey copy (the account copy is its own way back)',
  'veilcore:onchain-sent': 'royalties paid on chain, off on veilcore.org; the payment itself is on chain',
  'veilcore:onchain-counted': 'royalties paid on chain, off on veilcore.org; the payment itself is on chain',
  // Not storage at all: names the scan finds in files that touch storage.
  'veilcore-records': 'the records package’s import name',
  'veilcore-ask-model': 'a Trusted Types policy name',
  'veilcore-sw': 'a Trusted Types policy name',
  'veilcore-send': 'the Background Sync tag',
  'veilcore-send-now': 'a service worker message',
  'veilcore-check': 'a service worker message',
  'veilcore-active': 'a service worker message',
  'veilcore-release': 'a service worker message',
  'veilcore-account-copy': 'a Web Lock name',
  'veilcore-bulk-row-v1': 'a record format name',
  'veilcore-bulk-animal-row-v1': 'a record format name',
  'veilcore-record-keys': 'a backup file format name',
  'veilcore-records-': 'a download’s file name',
  'veilcore-deal-record-': 'a download’s file name',
  'veilcore-holder-key.txt': 'a download’s file name',
  'veilcore:change-role': 'a page event',
  'veilcore:lab-changed': 'a page event',
  'veilcore:party:': 'a hashing label',
  'veilcore:license-code:v1': 'a hashing label',
  'veilcore:v1:lab-results:x25519': 'a hashing label',
  'veilcore:v1:dnapair': 'a hashing label',
  'veilcore:vault-id:v1:': 'a hashing label',
  'veilcore:vault:records:v1': 'a hashing label',
  'veilcore:vault:handle-tag:v1': 'a hashing label',
  'veilcore:vault:beneficiary:v1': 'a hashing label',
  'veilcore:offer-id:v1:': 'a hashing label',
};

const storageNamesInCode = (): Map<string, string> => {
  const site = path.resolve(HERE, '..');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === 'fixtures' ? [] : walk(p);
      return /\.(ts|tsx|js|mjs)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
    });
  const found = new Map<string, string>();
  for (const f of [...walk(site), ...walk(path.resolve(site, '../offline'))]) {
    const code = fs.readFileSync(f, 'utf8');
    // A `veilcore.` name anywhere; a `veilcore-` or `veilcore:` one in a file that touches browser
    // storage (Web Storage, IndexedDB, Cache Storage), as the privacy policy's own scan counts them.
    const touches = /localStorage|sessionStorage|indexedDB|caches\./.test(code);
    for (const m of code.matchAll(/['"`](veilcore[.:-][\w.:-]*)(?=['"`]|\$\{)/g))
      if (m[1].startsWith('veilcore.') || touches) found.set(m[1], path.relative(site, f));
  }
  return found;
};

describe('every storage name is in the backup, or said not to be needed', () => {
  it('lists every name the code uses, and none it no longer uses', () => {
    const names = storageNamesInCode();
    for (const n of ['veilcore.holder.v1', 'veilcore.held-licenses.v1', 'veilcore-offline'])
      expect(names.has(n), `the scan finds ${n}`).toBe(true);
    const unlisted = [...names]
      .filter(([n]) => !(n in IN_THE_FILE) && !(n in NOT_NEEDED))
      .map(([n, f]) => `${n} (${f})`);
    expect(unlisted, 'decide: carry it in the backup (backup.ts), or say here why it isn’t needed').toEqual([]);
    expect(
      [...Object.keys(IN_THE_FILE), ...Object.keys(NOT_NEEDED)].filter((n) => !names.has(n)),
      'listed here but no longer in the code',
    ).toEqual([]);
  });
});
