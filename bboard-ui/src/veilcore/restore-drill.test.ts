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
// RFC 3161 token and each record's own token are in the file; with the registry gone, restoring
// stores none of them, and an evidence bundle made straight from the file checks offline, labelled;
// doctored ones are left out, and nothing from a file reaches a later backup.
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
import { pinnedContractsForPage } from './evidence/verify-page';
import { differ, snapshotOf } from '../e2e-fixtures/restore-drill-snapshot';
import { sealOnDevice } from './fixtures/device-only-doc';
import { otsFile, testTsa, type TestTsa } from './fixtures/test-stamps';
import { MAINNET_PINNED } from '../../../api/src/pinned-contracts';
import { renderVerifyPage } from './fixtures/verify-dom';

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
// and each record's own TSA token. A backup made with the registry there carries them (only what
// the registry gave). Restoring a file never brings them into the browser (review 7 of PR #233):
// with the registry gone, the evidence bundle is made straight from the backup file, in memory,
// checked for form (moved, changed or unpinned files are left out), labelled on every page, and
// nothing is stored. So a made-up file can't spread into later backups.

type StampsJson = {
  format: string;
  batches: Record<
    string,
    { root: string; ots?: string; otsStatus?: string; bitcoinBlockHeight?: number; tsts?: { token: string }[] }
  >;
  records: Record<string, { instant?: { token: string }[] }>;
  changed?: { batchId: string; root: string; proofs: Record<string, { root: string }>; ots?: string }[];
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

/** The evidence bundle made straight from a backup file (BundleFromBackupFile): read in memory, nothing stored. */
const bundleFromFile = (b: Browser, id: string, text: string, password?: string) =>
  b.run(async () => {
    const r = b.m.records.getRecord(id)!;
    const fromFile = await b.m.backup
      .readBackupStamps(fileOf(text), password)
      .catch(() => b.m.backup.readBackupStamps(fileOf(text), PASSWORD));
    const gathered = await b.m.bundle.gatherFromFile(r, fromFile);
    if (!gathered) return null;
    const ev = await b.m.bundle.buildEvidence(r, gathered, { includeKey: false }, b.m.keys.keysFor(id));
    const files = await b.m.bundle.bundleFiles(ev, gathered, { includeKey: false });
    const file = (p: string) => Object.entries(files).find(([k]) => k.endsWith(`/${p}`))?.[1];
    return { gathered, ev, file };
  });

/** A restore's follow-on work done (records read again, uploads queued), as restoreInto waits for. */
const settled = (b: Browser) =>
  b.run(async () => {
    await b.m.records.hydrate();
    await settle(300);
  });

/** Everything this browser keeps (localStorage), to show a step stored nothing. */
const storageOf = (b: Browser) =>
  b.run(() => {
    const out: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      out[k] = localStorage.getItem(k);
    }
    return out;
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

const stampsOf = (inner: Record<string, unknown>) => inner.stamps as StampsJson | undefined;
const textOf = (b?: Uint8Array) =>
  Buffer.from(b ?? new Uint8Array())
    .toString()
    .replace(/\s+/g, ' ');

/** The verify.html page code's reading of a bundle's evidence.json: what it would label. */
const pageLookups = (evidence: unknown, contracts?: unknown) => {
  const V = loadPageVerifier<{
    lookups: (
      ev: unknown,
      contracts?: unknown,
    ) => {
      fromBackupFile: boolean;
      fileRoots: { root: string; folder: string; later: boolean; midnight: unknown }[];
      disagree: boolean;
      midnight: unknown[];
    };
    midnightSteps: (a: unknown) => string[];
  }>();
  const L = V.lookups(evidence, contracts);
  const first = L.fileRoots[0]?.midnight;
  return { L, steps: first ? V.midnightSteps(first).join(' ') : '' };
};

/** What verify.html's reader, the SDK and openssl say about one folder's stamp files, offline. */
const checkFolder = async (file: (p: string) => Uint8Array | undefined, folder: string) =>
  checkOffline((p) => file(p.replace(/^proof\//, `${folder}/`)));

describe('the backup restore drill: the Bitcoin and RFC 3161 files', () => {
  it('are in the file; with the registry gone, restoring stores none of them and a bundle made from the file checks offline, labelled', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const text = await backUp(A);
    const inner = await opened(A, text);
    const stamps = stampsOf(inner)!;
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    expect(stamps.format).toBe('veilcore/stamps/v1');
    expect(Object.keys(stamps.batches)).toEqual([BATCH_ID]);
    const batch = stamps.batches[BATCH_ID];
    expect(batch).toMatchObject({ otsStatus: 'pending' });
    expect(Buffer.from(batch.ots!, 'base64')).toEqual(w.ots.get(BATCH_ID));
    expect(batch.tsts?.length).toBe(1);
    expect(Object.keys(stamps.records).sort()).toEqual([...fps].sort());
    for (const fp of fps) expect(stamps.records[fp].instant?.[0]?.token, fp).toBe(w.instant.get(fp));
    expect(stamps.changed, 'the registry never changed a root').toBeUndefined();
    expect(Object.keys(stamps).sort(), 'only what the registry gave').toEqual(['batches', 'format', 'records']);

    w.goDown();
    const { b: N, out } = await restoreInto('breeder-registry-gone', text);
    expect(out.fromFile).toMatchObject({ added: 5 });
    // Restoring brings no date proofs into the browser.
    const kept = await storageOf(N);
    expect(kept['veilcore.stamps.v1'] ?? null, 'nothing stored from the file').toBeNull();
    expect(Object.keys(out)).not.toContain('stampSections');
    // The registry gone and nothing kept from it here: the bundle dialog then offers the file.
    const tried = await N.run(() => N.m.bundle.gatherEvidence(N.m.records.getRecord(made.plant)!));
    expect(tried).toEqual({ error: await N.run(() => N.m.bundle.UNREACHABLE) });
    for (const id of [made.plant, made.animal, made.doc, made.local]) {
      const got = await bundleFromFile(N, id, text);
      const { gathered, ev, file } = got!;
      expect(gathered.source, id).toBe('backup-file');
      expect(ev.proof, 'the file’s proof is not taken as the registry’s').toBeNull();
      expect(ev.registry.fileRoots?.map((c) => c.folder)).toEqual(['proof/backup-file-1']);
      expect(textOf(file('README.txt'))).toContain(
        'NOT CONFIRMED: The batch root, the proof that leads to it and its stamps come from the holder’s backup file and are not confirmed with VeilCore’s registry.',
      );
      expect(textOf(file('EXAMINER-SUMMARY.html'))).toContain('Not confirmed:');
      expect(textOf(file('EXAMINER-SUMMARY.html'))).not.toContain('as VeilCore’s registry reported it');
      expect(textOf(file('evidence.json'))).toContain('not confirmed with VeilCore’s registry');
      const { L: page, steps } = pageLookups(JSON.parse(textOf(file('evidence.json'))));
      expect(page.fromBackupFile).toBe(true);
      expect(page.fileRoots.map((c) => c.root)).toEqual([batch.root]);
      expect(steps).toContain('The holder’s backup file says it is');
      expect(steps).not.toContain('VeilCore’s registry reports');
      for (const f of ['inclusion-proof.json', 'batch-root.txt', 'root.bin', 'root.bin.ots', 'root.tst'])
        expect(file(`proof/backup-file-1/${f}`), `${id} ${f}`).toBeDefined();
      // The proof as the registry sent it, format version and all (review 6, R6-3).
      const fp = fps.find((x) => (ev.registry.fileRoots![0].proof as { commitment: string }).commitment === x)!;
      expect(JSON.parse(textOf(file('proof/backup-file-1/inclusion-proof.json')))).toMatchObject({
        formatVersion: (inner.proofs as Record<string, { formatVersion: string }>)[fp].formatVersion,
      });
      const offline = await checkFolder(file, 'proof/backup-file-1');
      expect(offline.stamp.status, id).toBe('pending');
      expect(offline.sdk, id).toBe(true);
      expect(offline.openssl, id).toMatch(/Verification: OK/);
    }
    // Making the bundles stored nothing.
    expect(await storageOf(N)).toEqual(kept);
    // A backup made there, still without the registry, carries nothing from the file.
    const again = await opened(N, await backUp(N));
    expect(again.proofs, 'no proof from the file').toBeUndefined();
    expect(stampsOf(again), 'no stamp from the file').toBeUndefined();
    // The registry back: the next backup's stamps come from it, and the bundle is this device's.
    w.goUp();
    const online = await opened(N, await backUp(N));
    expect(Object.keys(online.proofs as object).sort()).toEqual([...fps].sort());
    expect(stampsOf(online)!.batches[BATCH_ID]).toEqual(batch);
    w.goDown();
    expect((await bundleOf(N, made.plant)).gathered.source).toBe('this-device');
  });

  it('a locked file needs its password to make a bundle from, and a wrong one is refused, with nothing stored', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    await makeTheSet(A, B, L);
    const text = await backUp(A);
    w.goDown();
    const N = await browser('new-device');
    const before = await storageOf(N);
    await expect(N.run(() => N.m.backup.readBackupStamps(fileOf(text)))).rejects.toThrow(
      await N.run(() => N.m.backup.NEEDS_PASSWORD),
    );
    await expect(N.run(() => N.m.backup.readBackupStamps(fileOf(text), 'wrong'))).rejects.toThrow(
      await N.run(() => N.m.backup.WRONG_PASSWORD),
    );
    const read = await N.run(() => N.m.backup.readBackupStamps(fileOf(text), PASSWORD));
    expect((read.stamps as StampsJson).batches[BATCH_ID]).toBeDefined();
    expect(await storageOf(N)).toEqual(before);
  });

  it('a pending Bitcoin stamp is kept, finished on a later backup, and never swapped back', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const firstText = await backUp(A);
    expect(stampsOf(await opened(A, firstText))!.batches[BATCH_ID].otsStatus).toBe('pending');
    w.upgrade();
    const text = await backUp(A);
    const done = stampsOf(await opened(A, text))!.batches[BATCH_ID];
    expect(done).toMatchObject({ otsStatus: 'bitcoin', bitcoinBlockHeight: STAMP_BLOCK });
    expect(Buffer.from(done.ots!, 'base64')).toEqual(w.ots.get(BATCH_ID));
    w.ots.set(BATCH_ID, otsFile(done.root));
    expect(stampsOf(await opened(A, await backUp(A)))!.batches[BATCH_ID].ots).toBe(done.ots);
    // An older file restored here changes nothing kept.
    await A.run(() => A.m.backup.restoreAny(fileOf(firstText), PASSWORD));
    expect(stampsOf(await opened(A, await backUp(A)))!.batches[BATCH_ID].ots).toBe(done.ots);
    w.goDown();
    const { b: N } = await restoreInto('breeder-registry-gone', text);
    const { ev, file } = (await bundleFromFile(N, made.plant, text))!;
    expect(ev.registry.fileRoots?.[0].opentimestamps).toMatchObject({
      status: 'bitcoin',
      bitcoinBlockHeight: STAMP_BLOCK,
    });
    expect((await checkFolder(file, 'proof/backup-file-1')).stamp).toMatchObject({
      status: 'bitcoin',
      bitcoin: [{ height: STAMP_BLOCK }],
    });
  });

  // A doctored file, with the registry gone: its proofs still check and its root is in the bundle,
  // its doctored files are not; nothing from it is stored.
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
    await settled(N);
    const before = await storageOf(N);
    const { ev } = (await bundleFromFile(N, made.plant, JSON.stringify(inner)))!;
    expect(ev.registry.fileRoots?.length).toBeGreaterThan(0);
    for (const c of ev.registry.fileRoots ?? []) {
      expect(c.opentimestamps.available).toBe(false);
      expect(c.tokens).toBe(0);
    }
    expect(await storageOf(N)).toEqual(before);
  };

  const otherBatch = () => {
    const root = 'ee'.repeat(32);
    return { root, ots: otsFile(root, { bitcoin: STAMP_BLOCK }).toString('base64'), token: tsa.tokenFor(root) };
  };
  const flipped = (b64: string, at: number) => {
    const b = Buffer.from(b64, 'base64');
    b[at < 0 ? b.length + at : at] ^= 0x01;
    return b.toString('base64');
  };

  it('a stamp moved to another batch is left out', async () => {
    await doctoredStamps((s) => {
      const other = otherBatch();
      s.batches[BATCH_ID] = { root: other.root, ots: other.ots, otsStatus: 'bitcoin', tsts: [{ token: other.token }] };
      s.batches['B-20261126-MOVED'] = { ...s.batches[BATCH_ID] };
    });
  });

  it('another batch’s files said to start from this batch’s root are left out', async () => {
    await doctoredStamps((s) => {
      const other = otherBatch();
      const root = s.batches[BATCH_ID].root;
      s.batches = { [BATCH_ID]: { root, ots: other.ots, otsStatus: 'bitcoin', tsts: [{ token: other.token }] } };
    });
  });

  it('this batch’s real files under another batch’s name are left out', async () => {
    await doctoredStamps((s) => {
      s.batches = { 'B-20261126-OTHER': s.batches[BATCH_ID] };
    });
  });

  it('a changed token or stamp file is left out', async () => {
    await doctoredStamps((s) => {
      const b = s.batches[BATCH_ID];
      s.batches[BATCH_ID] = {
        ...b,
        ots: flipped(b.ots!, 40),
        tsts: b.tsts!.map((t) => ({ token: flipped(t.token, -1) })),
      };
    });
  });

  it('a token from a timestamp authority the site doesn’t pin is left out', async () => {
    await doctoredStamps((s) => {
      const root = s.batches[BATCH_ID].root;
      s.batches = { [BATCH_ID]: { root, tsts: [{ token: stranger.tokenFor(root) }] } };
    });
  });

  it('a pinned authority’s token outside its certificate’s dates is left out (review 2, A5)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    w.goDown();
    for (const [label, pin, want] of [
      ['expired', { ...tsa.pin, validUntil: '2000-01-01T00:00:00Z' }, 0],
      ['not yet valid', { ...tsa.pin, notBefore: '2099-01-01T00:00:00Z' }, 0],
      ['within', { ...tsa.pin, notBefore: '2000-01-01T00:00:00Z', validUntil: '2099-01-01T00:00:00Z' }, 1],
    ] as const) {
      const N = await browser(`dates-${label}`);
      const got = await N.run(() =>
        N.m.stamps.evidenceFromFile(fp, { stamps: inner.stamps, proofs: inner.proofs }, [pin as never]),
      );
      expect(got.roots[0].tsts.length, label).toBe(want);
    }
  });

  it('a proof that doesn’t lead from the record to its root gives nothing, and the holder is told', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const proofs = JSON.parse(JSON.stringify(inner.proofs)) as Record<string, { root: string }>;
    proofs[fp].root = 'cd'.repeat(32);
    w.goDown();
    expect(await bundleFromFile(A, made.plant, JSON.stringify({ ...inner, proofs }))).toBeNull();
    const out = await A.run(() =>
      A.m.bundle.downloadEvidenceBundle(A.m.records.getRecord(made.plant)!, undefined, {
        includeKey: false,
        deliveries: [],
        fromBackupFile: { stamps: inner.stamps, proofs },
      }),
    );
    expect(out).toEqual({ error: await A.run(() => A.m.bundle.NOTHING_IN_FILE) });
  });

  it('a null or junk in a file never stops the rest, and nothing of it is stored (R5-5)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const inner = await opened(A, await backUp(A));
    const root = stampsOf(inner)!.batches[BATCH_ID].root;
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    w.goDown();
    const proofs = JSON.parse(JSON.stringify(inner.proofs)) as Record<string, Record<string, unknown>>;
    proofs[fps[0]].anchor = null;
    proofs[fps[1]].extra = { deep: [null, 1, 'x'] };
    const junk = {
      ...(inner.stamps as object),
      changed: [1, 'x', null, { proofs: 'no' }, { batchId: 3, proofs: { [fps[0]]: 7 } }],
      carried: [{ parts: [null, { items: [7] }] }],
    };
    const N = await browser('new-device');
    const text = JSON.stringify({ ...inner, proofs, stamps: junk });
    await N.run(() => N.m.backup.restoreAny(fileOf(text)));
    await settled(N);
    const before = await storageOf(N);
    for (const id of [made.plant, made.animal]) {
      const { ev } = (await bundleFromFile(N, id, text))!;
      expect(ev.registry.fileRoots?.map((c) => c.root)).toEqual([root]);
      expect(JSON.stringify(ev.registry.fileRoots)).not.toContain('deep');
    }
    expect(await storageOf(N)).toEqual(before);
  });

  // Reviews 2 to 7: proof codes are public, so a made-up file can name the holder's records under
  // any root, with a real token (a public TSA stamps any 32 bytes, dated now) and any stamp file
  // that starts from that root. Restoring it stores nothing, so it can't change what the registry
  // gave, can't reach a later backup, and can't touch what the genuine file shows.
  const craftedSet = async (finish = true) => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    if (finish) w.upgrade();
    const text = await backUp(A);
    const inner = await opened(A, text);
    const done = stampsOf(inner)!.batches[BATCH_ID];
    const fps = (inner.recordData as { recordFingerprint: string }[]).map((r) => r.recordFingerprint);
    /** A made-up file naming these records under the genuine batch and a root of its own, with a forged 2019 transaction. */
    const crafted = async (salt = 'aa') => {
      const b = await buildBatch([...fps, salt.repeat(32)], BATCH_ID);
      const forged = {
        chain: 'midnight',
        network: 'preview',
        contractAddress: '7a'.repeat(32),
        txHash: 'cd'.repeat(32),
        blockHeight: 7,
        anchoredAt: '2019-01-01T00:00:00.000Z',
      };
      return {
        root: b.root,
        text: JSON.stringify({
          ...inner,
          proofs: Object.fromEntries(
            fps.map((fp) => [fp, { ...(b.proofs[fp] as object), sealedAt: '2019-01-01T00:00:00Z', anchor: forged }]),
          ),
          stamps: {
            format: 'veilcore/stamps/v1',
            batches: {
              [BATCH_ID]: {
                root: b.root,
                ots: otsFile(b.root, { bitcoin: 1 }).toString('base64'),
                tsts: [{ token: tsa.tokenFor(b.root) }],
              },
            },
            records: {},
            // An unreleased build's carried sections: never read.
            carried: [{ id: 'x', parts: [{ items: [{ kind: 'batch', batchId: BATCH_ID, root: b.root }] }] }],
          },
        }),
      };
    };
    const recordsOnly = JSON.stringify({ ...inner, proofs: undefined, stamps: undefined });
    return { A, made, text, inner, done, fps, crafted, recordsOnly };
  };

  it('a made-up file on the original device changes nothing the registry gave (reviews 1 and 3, C7)', async () => {
    const { A, made, done, crafted } = await craftedSet();
    const before = await storageOf(A);
    await A.run(async () => A.m.backup.restoreAny(fileOf((await crafted()).text)));
    expect((await storageOf(A))['veilcore.stamps.v1']).toBe(before['veilcore.stamps.v1']);
    w.goDown();
    expect(stampsOf(await opened(A, await backUp(A)))!.batches[BATCH_ID]).toEqual(done);
    const { gathered, ev } = await bundleOf(A, made.plant);
    expect(gathered.source).toBe('this-device');
    expect(ev.batch?.root).toBe(done.root);
    expect(ev.batch?.opentimestamps).toMatchObject({ available: true, status: 'bitcoin' });
  });

  it('a made-up file restored first never reaches a later backup, and the genuine file’s bundle shows the genuine transaction (R7-1, R7-2)', async () => {
    const { made, text, done, crafted, recordsOnly } = await craftedSet();
    const fake = await crafted();
    w.goDown();
    const N = await browser('new-device');
    await N.run(() => N.m.backup.restoreAny(fileOf(recordsOnly)));
    await N.run(() => N.m.backup.restoreAny(fileOf(fake.text)));
    await N.run(() => N.m.backup.restoreAny(fileOf(text), PASSWORD));
    expect((await storageOf(N))['veilcore.stamps.v1'] ?? null).toBeNull();
    // The genuine file's bundle: its own root, transaction and dates, nothing from the made-up one.
    const { ev, file } = (await bundleFromFile(N, made.plant, text))!;
    expect(ev.registry.fileRoots?.map((c) => c.root)).toEqual([done.root]);
    expect((ev.registry.fileRoots![0].anchor as { txHash: string }).txHash).toBe('ab'.repeat(32));
    for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'evidence.json']) {
      expect(textOf(file(f)), f).not.toContain('cd'.repeat(32));
      expect(textOf(file(f)), f).not.toContain(fake.root);
    }
    // The made-up file's bundle is its own, labelled as from that file.
    const own = (await bundleFromFile(N, made.plant, fake.text))!;
    expect(own.ev.registry.fileRoots?.map((c) => c.root)).toEqual([fake.root]);
    expect(textOf(own.file('README.txt'))).toContain('NOT CONFIRMED:');
    // The holder's next backups, from here and from a third device, carry nothing from either file.
    const latest = await backUp(N);
    expect(latest).not.toContain(fake.root);
    expect(stampsOf(await opened(N, latest))).toBeUndefined();
    const { b: N2 } = await restoreInto('new-device-2', latest);
    expect((await storageOf(N2))['veilcore.stamps.v1'] ?? null).toBeNull();
    // With the registry back, a backup carries only what the registry gives.
    w.goUp();
    const online = await backUp(N);
    expect(online).not.toContain(fake.root);
    expect(stampsOf(await opened(N, online))!.batches[BATCH_ID]).toEqual(done);
  });

  it('flags in a file claiming its data is confirmed change nothing (review 3, C3)', async () => {
    const { made, crafted, recordsOnly } = await craftedSet();
    const f = JSON.parse((await crafted()).text) as Record<string, Record<string, unknown>>;
    f.stamps.confirmed = true;
    f.stamps.source = 'this-device';
    w.goDown();
    const N = await browser('new-device');
    await N.run(() => N.m.backup.restoreAny(fileOf(recordsOnly)));
    const got = (await bundleFromFile(N, made.plant, JSON.stringify(f)))!;
    expect(got.gathered.source).toBe('backup-file');
    expect(textOf(got.file('README.txt'))).toContain('NOT CONFIRMED:');
  });

  it('a made-up root for a batch the registry gave this browser names the registry’s root too (review 2, A6)', async () => {
    const { A, made, done, crafted } = await craftedSet();
    const fake = await crafted();
    w.goDown();
    const { gathered, ev, file } = (await bundleFromFile(A, made.plant, fake.text))!;
    expect(gathered.source).toBe('backup-file');
    expect(ev.registry.fileRoots?.map((c) => c.root)).toEqual([fake.root]);
    expect(ev.registry.registryRoots).toEqual([done.root]);
    expect(textOf(file('README.txt'))).toContain(
      `VeilCore's registry gave the holder's browser another root for this batch: ${done.root}`,
    );
    expect(pageLookups(JSON.parse(textOf(file('evidence.json')))).L.disagree).toBe(true);
    // And what the registry gave is still what the record's own bundle uses.
    expect((await bundleOf(A, made.plant)).ev.batch?.root).toBe(done.root);
  });

  it('if the registry later gives other roots for a sealed batch, the first and its finished stamp stay, the holder is warned, and a bundle from the file shows each root on its own (review 3, C5; R7-3)', async () => {
    const { A, made, done, fps } = await craftedSet();
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(0);
    const evil = await buildBatch([...fps, 'cc'.repeat(32)], BATCH_ID);
    for (const fp of fps) w.proofs.set(fp, { ...(w.proofs.get(fp) as object), ...(evil.proofs[fp] as object) });
    await backUp(A);
    const worse = await buildBatch([...fps, 'dd'.repeat(32)], BATCH_ID);
    for (const fp of fps) w.proofs.set(fp, { ...(w.proofs.get(fp) as object), ...(worse.proofs[fp] as object) });
    const text = await backUp(A);
    const next = await opened(A, text);
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(fps.length);
    expect(stampsOf(next)!.batches[BATCH_ID]).toEqual(done);
    expect((next.proofs as Record<string, { root: string }>)[fps[0]].root).toBe(done.root);
    // One entry per (batch, root): no entry names a record twice.
    expect(
      stampsOf(next)!
        .changed?.map((c) => c.root)
        .sort(),
    ).toEqual([evil.root, worse.root].sort());
    w.goDown();
    expect((await bundleOf(A, made.plant)).ev.batch?.root).toBe(done.root);
    // That file, on a new device with the registry gone: every root, each on its own, the first one first.
    const { b: N } = await restoreInto('new-device', text);
    const { ev, file } = (await bundleFromFile(N, made.plant, text))!;
    expect(ev.registry.fileRoots?.map((c) => c.root)).toEqual([done.root, evil.root, worse.root]);
    expect(ev.registry.fileRoots?.map((c) => c.later)).toEqual([false, true, true]);
    expect(ev.registry.fileRoots?.map((c) => c.folder)).toEqual([
      'proof/backup-file-1',
      'proof/backup-file-2',
      'proof/backup-file-3',
    ]);
    expect(ev.registry.fileRoots?.[0].opentimestamps).toMatchObject({ available: true, status: 'bitcoin' });
    for (const c of ev.registry.fileRoots!)
      expect((JSON.parse(textOf(file(`${c.folder}/inclusion-proof.json`))) as { root: string }).root).toBe(c.root);
    expect((await checkFolder(file, 'proof/backup-file-1')).openssl).toMatch(/Verification: OK/);
    expect(textOf(file('README.txt'))).toContain('MORE THAN ONE ROOT:');
    const { L: page } = pageLookups(JSON.parse(textOf(file('evidence.json'))));
    expect(page.disagree).toBe(true);
    expect(page.fileRoots.map((c) => c.later)).toEqual([false, true, true]);
  });

  it('a registry answer with a null in it never takes the stamps out of later backups (R5-4)', async () => {
    const { A, done, fps } = await craftedSet();
    const evil = await buildBatch([...fps, 'cc'.repeat(32)], BATCH_ID);
    for (const fp of fps)
      w.proofs.set(fp, {
        ...(w.proofs.get(fp) as object),
        ...(evil.proofs[fp] as object),
        note: null,
        extra: { x: null },
      });
    const next = await opened(A, await backUp(A));
    expect(stampsOf(next)!.batches[BATCH_ID], 'the first root and its finished stamp are in the file').toEqual(done);
    expect(stampsOf(next)!.changed?.some((c) => c.root === evil.root)).toBe(true);
    expect(JSON.stringify(stampsOf(next))).not.toContain('null');
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(fps.length);
    // And again, the next backup too.
    expect(stampsOf(await opened(A, await backUp(A)))!.batches[BATCH_ID]).toEqual(done);
  });

  it('a kept proof keeps its format version, as the registry sends it (R6-3)', async () => {
    const { A, made, inner } = await craftedSet();
    w.goDown();
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const reg = (inner.proofs as Record<string, Record<string, unknown>>)[fp];
    expect(typeof reg.formatVersion).toBe('string');
    const { file } = await bundleOf(A, made.plant);
    const kept = JSON.parse(Buffer.from(file('proof/inclusion-proof.json')!).toString()) as Record<string, unknown>;
    expect(kept.formatVersion).toBe(reg.formatVersion);
    const next = await opened(A, await backUp(A));
    expect((next.proofs as Record<string, Record<string, unknown>>)[fp].formatVersion).toBe(reg.formatVersion);
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
    await A.run(() => A.m.stamps.stampsForBackup([{ id: made.plant, recordFingerprint: plantFp }], {}));
    expect(await A.run(() => A.m.stamps.keptEvidence(animalFp))).not.toBeNull();
    await A.run(() => A.m.keys.forgetKeys(made.animal));
    await A.run(() => A.m.stamps.stampsForBackup([{ id: made.plant, recordFingerprint: plantFp }], {}));
    expect(await A.run(() => A.m.stamps.keptEvidence(animalFp))).toBeNull();
    expect(await A.run(() => A.m.stamps.keptEvidence(plantFp))).not.toBeNull();
  });

  // The registry gives a proof when the batch is sealed and adds the Midnight anchor once the
  // root lands on chain; a test-network anchor is later replaced by the main network's (review 8).
  const MAINNET = {
    chain: 'midnight',
    network: 'mainnet',
    // VeilCore's own main-network contract, so the steps date it (deployments/mainnet.json).
    contractAddress: MAINNET_PINNED.find((c) => c.kind === 'veilcore')!.address,
    txHash: 'ef'.repeat(32),
    blockHeight: 9999,
    anchoredAt: '2026-11-27T12:00:00.000Z',
  };
  const PREVIEW_TX = 'ab'.repeat(32);
  /** Every proof the registry serves, with this anchor (or none). */
  const anchorAll = (anchor: unknown) => {
    for (const [fp, pr] of w.proofs) {
      const { anchor: _a, ...rest } = pr as Record<string, unknown>;
      void _a;
      w.proofs.set(fp, anchor ? { ...rest, anchor } : rest);
    }
  };
  const anchorIn = (inner: Record<string, unknown>, fp: string) =>
    (inner.proofs as Record<string, { anchor?: { txHash: string; network: string } }>)[fp]?.anchor;

  it('a proof first given before its batch was on chain picks up the later Midnight anchor, kept and in offline backups (R8-1)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    anchorAll(null);
    await backUp(A);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    anchorAll(MAINNET);
    expect(anchorIn(await opened(A, await backUp(A)), fp)?.txHash).toBe(MAINNET.txHash);
    w.goDown();
    expect(anchorIn(await opened(A, await backUp(A)), fp)?.txHash, 'offline backup').toBe(MAINNET.txHash);
    const { ev, file } = await bundleOf(A, made.plant);
    expect(ev.batch?.anchor).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
    expect(textOf(file('README.txt'))).not.toContain('not dated on any network yet');
    expect(textOf(file('proof/anchors.json'))).toContain(MAINNET.txHash);
  });

  it('a test-network anchor replaced by a main-network one is followed; an answer without one, or a test one after it, never takes it away (R8-2)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    expect(anchorIn(await opened(A, await backUp(A)), fp)).toMatchObject({ network: 'preview', txHash: PREVIEW_TX });
    anchorAll(MAINNET);
    await backUp(A);
    // An answer with no anchor, then one naming the test network again: the main network's stays.
    anchorAll(null);
    expect(anchorIn(await opened(A, await backUp(A)), fp)?.txHash, 'online, no anchor in the answer').toBe(
      MAINNET.txHash,
    );
    anchorAll({ ...MAINNET, network: 'preview', txHash: PREVIEW_TX });
    expect(anchorIn(await opened(A, await backUp(A)), fp)?.network, 'online, a test anchor again').toBe('mainnet');
    w.goDown();
    const offline = await opened(A, await backUp(A));
    expect(anchorIn(offline, fp)).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
    const { ev, file } = await bundleOf(A, made.plant);
    expect(ev.batch?.anchor).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
    expect(textOf(file('README.txt'))).not.toContain('practice data');
    expect(textOf(file('proof/anchors.json'))).toContain(MAINNET.txHash);
    expect(textOf(file('proof/anchors.json'))).not.toContain(PREVIEW_TX);
  });

  /**
   * Every proof the registry serves with this anchor, as the real registry folds it in
   * (lineage/batches.mjs foldAnchors): `anchor`, and the same as a `ledger` entry in `anchors`.
   */
  const serveFolded = (anchor: Record<string, unknown>) => {
    for (const [fp, pr] of w.proofs) {
      const { anchor: _a, anchors, ...rest } = pr as Record<string, unknown>;
      void _a;
      const others = ((anchors as Record<string, unknown>[] | undefined) ?? []).filter((x) => x.kind !== 'ledger');
      const ledger = { kind: 'ledger', ...anchor, testNetwork: anchor.network !== 'mainnet' };
      w.proofs.set(fp, { ...rest, anchor, anchors: [ledger, ...others] });
    }
  };
  const ledgersIn = (p: unknown) =>
    ((p as { anchors?: { kind: string; network?: string; txHash?: string }[] } | undefined)?.anchors ?? []).filter(
      (x) => x.kind === 'ledger',
    );

  it('a main-network anchor once kept stays: another main-network transaction for the same batch is set aside and the holder warned (R9-1)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const OTHER = { ...MAINNET, txHash: 'cd'.repeat(32), blockHeight: 12000, anchoredAt: '2027-03-01T12:00:00.000Z' };
    serveFolded(MAINNET);
    await backUp(A);
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(0);
    // An honest registry refuses this (409, batches.mjs recordAnchor); a broken one could serve it.
    serveFolded(OTHER);
    const online = await opened(A, await backUp(A));
    expect(anchorIn(online, fp)?.txHash, 'online backup').toBe(MAINNET.txHash);
    expect(ledgersIn((online.proofs as Record<string, unknown>)[fp]).map((l) => l.txHash)).toEqual([MAINNET.txHash]);
    // The other one is kept aside, in the file, and the backup page warns.
    const warned = await A.run(() => A.m.stamps.rootChanges());
    expect(warned, 'every record in the batch is warned of').toBe(w.proofs.size);
    expect(JSON.stringify(stampsOf(online)?.changed)).toContain(OTHER.txHash);
    w.goDown();
    const offline = await opened(A, await backUp(A));
    expect(anchorIn(offline, fp)?.txHash, 'offline backup').toBe(MAINNET.txHash);
    const { ev, file } = await bundleOf(A, made.plant);
    expect(ev.registry.source).toBe('this-device');
    expect(ev.batch?.anchor).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
    for (const f of ['README.txt', 'proof/anchors.json', 'proof/inclusion-proof.json'])
      expect(textOf(file(f)), f).toContain(MAINNET.txHash);
    for (const f of ['proof/anchors.json', 'proof/inclusion-proof.json'])
      expect(textOf(file(f)), f).not.toContain(OTHER.txHash);
    // The one set aside, in the same browser, is named in one line (R11 polish 5).
    expect(textOf(file('README.txt'))).toContain(
      `The registry later gave the holder's browser transaction ${OTHER.txHash} on Midnight's main network for it`,
    );
    // The same one sent again changes nothing and adds no second warning.
    w.goUp();
    serveFolded(OTHER);
    await backUp(A);
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(warned);
    const again = stampsOf(await opened(A, await backUp(A)))?.changed ?? [];
    expect(again.length).toBe(1);
    expect(Object.keys(again[0].proofs).length).toBe(warned);
  });

  it('when the kept main-network anchor stays, every list of anchors says the same: no test-network transaction beside it (R9-2)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    serveFolded(MAINNET);
    await backUp(A);
    const TEST_TX = '5e'.repeat(32);
    serveFolded({ ...MAINNET, network: 'preview', contractAddress: '7a'.repeat(32), txHash: TEST_TX });
    const online = await opened(A, await backUp(A));
    w.goDown();
    const offline = await opened(A, await backUp(A));
    for (const [n, inner] of Object.entries({ online, offline })) {
      const pr = (inner.proofs as Record<string, unknown>)[fp];
      expect(anchorIn(inner, fp)?.network, n).toBe('mainnet');
      expect(
        ledgersIn(pr).map((l) => `${l.network} ${l.txHash}`),
        n,
      ).toEqual([`mainnet ${MAINNET.txHash}`]);
      expect(JSON.stringify(pr), n).not.toContain(TEST_TX);
    }
    // A test-network answer after main is no change of record: no warning.
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(0);
    const { file } = await bundleOf(A, made.plant);
    expect(textOf(file('README.txt'))).not.toContain('practice data');
    for (const f of ['proof/inclusion-proof.json', 'proof/anchors.json', 'evidence.json'])
      expect(textOf(file(f)), f).not.toContain(TEST_TX);
  });

  /** README.txt, EXAMINER-SUMMARY.html and DECLARATION-TEMPLATE.txt of a bundle made from a backup file. */
  const pagesFromFile = async (anchor: unknown, finished = true) => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    if (finished) w.upgrade();
    if (anchor !== undefined) anchorAll(anchor);
    const text = await backUp(A);
    w.goDown();
    const { b: N } = await restoreInto('new-device', text);
    const { ev, file } = (await bundleFromFile(N, made.plant, text))!;
    const dump = process.env.VEILCORE_DUMP_PAGES;
    if (dump) {
      const kind = anchor === undefined ? 'preview' : anchor === null ? 'none' : 'mainnet';
      const dir = path.join(dump, finished ? kind : `${kind}-pending`);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'DECLARATION-TEMPLATE.txt', 'verify.html'])
        fs.writeFileSync(path.join(dir, f), Buffer.from(file(f)!));
    }
    const html = textOf(file('EXAMINER-SUMMARY.html'))
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');
    return {
      ev,
      readme: textOf(file('README.txt')),
      examiner: html,
      declaration: textOf(file('DECLARATION-TEMPLATE.txt')),
      // The Midnight steps verify.html shows for the first folder.
      verifySteps: pageLookups(JSON.parse(JSON.stringify(ev)), pinnedContractsForPage()).steps,
    };
  };
  /** What no page of a bundle from a file that gives a batch may say. */
  const UNTRUE_FOR_A_FILE = [
    'not dated on any network yet',
    'not in a batch yet',
    'There is no Midnight transaction to look up yet',
    'not recorded on a network yet',
    'from what VeilCore’s registry returned',
    "from what VeilCore's registry returned",
    'Only a root Midnight holds dates anything',
    'only a root Midnight holds dates anything',
  ];

  it('a bundle made from a backup file says on every page what the file gives: its batch, transaction, Bitcoin block and token (R8-4)', async () => {
    const { ev, readme, examiner, declaration, verifySteps } = await pagesFromFile(undefined);
    const root = ev.registry.fileRoots![0].root;
    for (const [name, page] of Object.entries({ readme, examiner, declaration })) {
      for (const bad of UNTRUE_FOR_A_FILE) expect(page, `${name}: ${bad}`).not.toContain(bad);
      expect(page, name).toContain(BATCH_ID);
      expect(page, name).toContain(root);
      expect(page, name).toContain(PREVIEW_TX);
      expect(page, name).toContain(String(STAMP_BLOCK));
      expect(page, name).toContain('backup file');
      // The file's transaction is on a test network: said as such, never as a real date.
      expect(page, name).toContain('Midnight Preview (a test network)');
      expect(page, name).toContain('practice data');
      expect(page, name).not.toMatch(/ownership|proves you own/i);
    }
    expect(examiner).toContain('From the holder’s backup file: proof/backup-file-1');
    expect(examiner).toContain('Names Bitcoin block 870123');
    expect(examiner).toContain('1 in the backup file, over proof/backup-file-1/root.bin: proof/backup-file-1/root.tst');
    expect(examiner).toContain('Not checked for you: the Midnight transaction the backup file names for each folder.');
    expect(declaration).toContain('This bundle was made from my backup file of the record, not with VeilCore');
    expect(declaration).toContain('from my backup file, read in my browser');
    expect(declaration).toContain('named Bitcoin block 870123');
    expect(declaration).toContain('proof/backup-file-1/root.tst');
    // No script is written for a Preview transaction, and no page names one (verify.html too: R9 polish 1).
    expect(readme).not.toContain('check-on-midnight.mjs');
    expect(ev.registry.fileRoots![0].files.some((f) => f.endsWith('check-on-midnight.mjs'))).toBe(false);
    expect(verifySteps).not.toContain('check-on-midnight.mjs');
    expect(verifySteps).toContain('This bundle has no script that reads it for this network.');
    expect(readme).toContain('This bundle has no script that reads it for this network.');
    // The token line in the declaration is plain English (R9 polish 4).
    expect(declaration).toContain('checked in my browser that it matches this batch root');
  });

  it('a bundle from a backup file naming a main-network transaction gives no warning, and its script path is its folder’s (R8-4)', async () => {
    const { readme, examiner, declaration, verifySteps } = await pagesFromFile(MAINNET);
    for (const [name, page] of Object.entries({ readme, examiner, declaration })) {
      for (const bad of UNTRUE_FOR_A_FILE) expect(page, `${name}: ${bad}`).not.toContain(bad);
      expect(page, name).toContain(MAINNET.txHash);
      expect(page, name).not.toContain('practice data');
    }
    expect(readme).not.toMatch(/(^|[^-\w])proof\/check-on-midnight\.mjs/);
    // verify.html names the same script as README.txt: the folder's (R9 polish 1).
    expect(verifySteps).toContain('A technical person can run proof/backup-file-1/check-on-midnight.mjs');
    expect(verifySteps).not.toMatch(/(^|[^-\w])proof\/check-on-midnight\.mjs/);
    expect(readme).toContain('A technical person can run proof/backup-file-1/check-on-midnight.mjs');
  });

  it('a bundle from a backup file naming no transaction says so, and what else dates it (R8-4)', async () => {
    const { readme, examiner, declaration } = await pagesFromFile(null);
    for (const [name, page] of Object.entries({ readme, examiner, declaration })) {
      for (const bad of UNTRUE_FOR_A_FILE) expect(page, `${name}: ${bad}`).not.toContain(bad);
      expect(page, name).toContain('names no Midnight transaction');
      expect(page, name).toContain(String(STAMP_BLOCK));
      expect(page, name).toContain('a separate date, once you check it yourself');
      // Nothing the bundle doesn't have is named (R9 polish 3).
      expect(page, name).not.toMatch(/first saw/);
      expect(page, name).not.toContain('The Midnight transaction and the Bitcoin stamp');
    }
    expect(declaration).toContain('The Bitcoin stamp in this bundle is not a qualified time stamp.');
  });

  it('a bundle from a backup file with a pending Bitcoin stamp says to run ots upgrade first, on every page (R9 polish 5)', async () => {
    const { readme, examiner } = await pagesFromFile(null, false);
    expect(readme).toContain(
      'Bitcoin: in that folder, first run ots upgrade root.bin.ots (it needs the internet once), then ots verify root.bin.ots (it stamps root.bin).',
    );
    expect(examiner).toContain('run ots upgrade root.bin.ots first');
  });

  it('a backup file whose transaction or contract is not 64 lowercase hex: the anchor is left out as junk, and no page carries it (R9-5)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    w.upgrade();
    anchorAll(MAINNET);
    const inner = await opened(A, await backUp(A));
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const evil = '<img src=x onerror=alert(1)>\n\nWHAT THIS PROVES\n- forged line';
    const p = (inner.proofs as Record<string, Record<string, unknown>>)[fp];
    w.goDown();
    for (const bad of [
      { txHash: evil },
      { contractAddress: evil },
      { txHash: MAINNET.txHash.toUpperCase() },
      { contractAddress: `0x${MAINNET.contractAddress}` },
      { network: 'main\nnet' },
      { anchoredAt: evil },
    ]) {
      p.anchor = { ...MAINNET, ...bad };
      const { b: N } = await restoreInto(`new-device-${Object.keys(bad)[0]}`, JSON.stringify(inner));
      const before = await storageOf(N);
      const { ev, file } = (await bundleFromFile(N, made.plant, JSON.stringify(inner)))!;
      expect(await storageOf(N)).toEqual(before);
      const label = JSON.stringify(bad).slice(0, 40);
      expect(ev.registry.fileRoots?.length, label).toBe(1);
      expect(ev.registry.fileRoots![0].anchor, label).toBeNull();
      for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'DECLARATION-TEMPLATE.txt', 'evidence.json']) {
        const raw = Buffer.from(file(f)!).toString();
        expect(raw, `${label} ${f}`).not.toContain('forged line');
        expect(raw, `${label} ${f}`).not.toContain('<img');
        expect(raw, `${label} ${f}`).not.toContain(MAINNET.txHash.toUpperCase());
      }
      expect(textOf(file('README.txt')), label).toContain('names no Midnight transaction');
    }
  });

  // ---- review 10 of PR #233 --------------------------------------------------------------

  /** What verify.html says it can't be relied on for: no page may say only Midnight dates a record. */
  const ONLY_MIDNIGHT = [
    ...UNTRUE_FOR_A_FILE,
    'look the batch root up on Midnight before relying',
    'rely only on the one the transaction wrote',
    'At most one can be the root Midnight holds',
  ];
  const dumpTo = (kind: string, file: (p: string) => Uint8Array | undefined) => {
    const dump = process.env.VEILCORE_DUMP_PAGES;
    if (!dump) return;
    const dir = path.join(dump, kind);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'DECLARATION-TEMPLATE.txt', 'verify.html', 'evidence.json'])
      if (file(f)) fs.writeFileSync(path.join(dir, f), Buffer.from(file(f)!));
  };
  /** A bundle made from a backup file whose record has no Midnight transaction, with only what `keep` leaves. */
  const fileBundleWithout = async (kind: string, finished: boolean, keep: (s: StampsJson, fp: string) => void) => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    if (finished) w.upgrade();
    anchorAll(null);
    const inner = await opened(A, await backUp(A));
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    keep(stampsOf(inner)!, fp);
    w.goDown();
    const { b: N } = await restoreInto(`nd-${kind}`, JSON.stringify(inner));
    const got = (await bundleFromFile(N, made.plant, JSON.stringify(inner)))!;
    dumpTo(kind, got.file);
    const page = await renderVerifyPage(Buffer.from(got.file('verify.html')!).toString());
    return { ...got, page };
  };

  /** What verify.html's card and every page of a file-made bundle say: never that only Midnight dates it. */
  const neverOnlyMidnight = (name: string, got: Awaited<ReturnType<typeof fileBundleWithout>>) => {
    const card = got.page.text('summary');
    expect(card, name).toContain('From the holder’s backup file');
    expect(card, name).toContain('proof/backup-file-1');
    expect(card, name).toContain('once you check it yourself');
    for (const bad of ONLY_MIDNIGHT) expect(card, `${name}: ${bad}`).not.toContain(bad);
    for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'DECLARATION-TEMPLATE.txt', 'verify.html'])
      for (const bad of ONLY_MIDNIGHT) expect(textOf(got.file(f)), `${name} ${f}: ${bad}`).not.toContain(bad);
    // Check other files: this bundle's proof files are in its folder (R10 polish 2).
    expect(got.page.text('other-proof-files'), name).toContain('proof/backup-file-1/');
    expect(got.page.text('other-proof-files'), name).not.toContain('proof/root.bin');
  };

  it('verify.html’s card for a bundle from a Bitcoin-only backup file never says only Midnight dates it (R10 blocker 2)', async () => {
    const btc = await fileBundleWithout('btc-only', true, (s, fp) => {
      for (const b of Object.values(s.batches)) delete b.tsts;
      delete s.records[fp];
    });
    neverOnlyMidnight('btc', btc);
    expect(btc.page.text('summary')).toContain('names block 870123');
    expect(btc.page.text('summary')).toContain('No RFC 3161 token.');
    // What the page says nothing dates without: each thing this bundle has, and nothing it doesn't (R10 polish 1).
    expect(btc.page.text('no-date-yet')).toContain('a folder’s Bitcoin stamp checks');
    expect(btc.page.text('no-date-yet')).not.toMatch(/transaction|token/);
  });

  it('verify.html’s card for a bundle from a backup file with a pending stamp and a token never says only Midnight dates it (R10 blocker 2)', async () => {
    const tok = await fileBundleWithout('pending-token', false, () => {});
    neverOnlyMidnight('tok', tok);
    expect(tok.page.text('summary')).toContain('holds only a promise');
    expect(tok.page.text('summary')).toContain('1 RFC 3161 token in that folder');
    expect(tok.page.text('no-date-yet')).toContain('a folder’s RFC 3161 token checks');
    expect(tok.page.text('no-date-yet')).not.toMatch(/transaction/);
  });

  it('a second main-network transaction kept aside reaches a bundle made from the backup file: every page names both and how to look each up (R10-3)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const OTHER = { ...MAINNET, txHash: 'cd'.repeat(32), blockHeight: 12000, anchoredAt: '2027-03-01T12:00:00.000Z' };
    w.upgrade();
    serveFolded(MAINNET);
    await backUp(A);
    serveFolded(OTHER);
    const text = await backUp(A);
    // Made while the registry serves the other one: the bundle is built on the one this browser
    // kept, and every page says what the registry names now (rule A, R11 blocker 2).
    const online = await bundleOf(A, made.plant);
    dumpTo('aside-online', online.file);
    expect(online.ev.batch?.anchor).toMatchObject({ txHash: MAINNET.txHash });
    for (const f of ['README.txt', 'EXAMINER-SUMMARY.html', 'DECLARATION-TEMPLATE.txt']) {
      const page = textOf(online.file(f));
      expect(page, `online ${f}`).toContain(MAINNET.txHash);
      expect(page, `online ${f}`).toContain(`now names transaction ${OTHER.txHash}`);
    }
    const onlinePage = await renderVerifyPage(Buffer.from(online.file('verify.html')!).toString());
    expect(onlinePage.text('summary')).toContain(`This bundle describes transaction ${MAINNET.txHash}`);
    expect(onlinePage.text('summary')).toContain(`now names transaction ${OTHER.txHash}`);
    // The bundle's script reads the kept one.
    expect(textOf(online.file('proof/check-on-midnight.mjs'))).toContain(MAINNET.txHash);

    w.goDown();
    const { b: N } = await restoreInto('new-device', text);
    const before = await storageOf(N);
    const got = (await bundleFromFile(N, made.plant, text))!;
    expect(await storageOf(N)).toEqual(before);
    dumpTo('two-transactions', got.file);
    const roots = got.ev.registry.fileRoots!;
    expect(roots.map((c) => [c.folder, (c.anchor as { txHash: string }).txHash, c.otherTransaction === true])).toEqual([
      ['proof/backup-file-1', MAINNET.txHash, false],
      ['proof/backup-file-2', OTHER.txHash, true],
    ]);
    expect(roots[0].root).toBe(roots[1].root);
    // The second folder has all the files the first has: the same root, with its own transaction.
    expect(roots[1].files.map((f) => f.replace('backup-file-2', 'backup-file-1'))).toEqual(roots[0].files);
    expect(textOf(got.file('proof/backup-file-2/inclusion-proof.json'))).toContain(OTHER.txHash);
    const readme = textOf(got.file('README.txt'));
    const examiner = textOf(got.file('EXAMINER-SUMMARY.html'))
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');
    const declaration = textOf(got.file('DECLARATION-TEMPLATE.txt'));
    const page = await renderVerifyPage(Buffer.from(got.file('verify.html')!).toString());
    const verify = page.text('summary').replace(/\s+/g, ' ');
    for (const [name, p] of Object.entries({ readme, examiner, declaration, verify })) {
      expect(p, name).toContain(MAINNET.txHash);
      expect(p, name).toContain(OTHER.txHash);
      expect(p, name).toContain(`proof/backup-file-2: transaction ${OTHER.txHash}`);
      if (name === 'declaration') {
        // A statement the signer makes, in the first person, with no instructions (R11 polish 4).
        expect(p).toContain('My backup file names 2 Midnight transactions for batch root');
        expect(p).not.toMatch(/Look up each one|the holder.s backup file names more than one/i);
      } else {
        expect(p, name).toContain('two different date records for the same batch root');
        expect(p, name).toMatch(/Look up each one/i);
      }
      for (const bad of ONLY_MIDNIGHT) expect(p, `${name}: ${bad}`).not.toContain(bad);
      // Neither is said to be the genuine one.
      expect(p, name).not.toMatch(/(is|was) the genuine/);
    }
    // The look-up steps for each: README and verify.html give each folder's own.
    for (const folder of ['proof/backup-file-1', 'proof/backup-file-2']) {
      expect(readme).toContain(`A technical person can run ${folder}/check-on-midnight.mjs`);
      expect(verify).toContain(`A technical person can run ${folder}/check-on-midnight.mjs`);
    }
    expect(readme).toContain("the batch root the holder's backup file gives for this record, in 2 folders");
    expect(readme).not.toContain('2 batch roots');
    expect(declaration).toContain('in 2 folders of the bundle: one for each Midnight transaction');
    // The declaration lists both: what the file says of each, and a look-up line for each.
    expect(declaration).toContain(`in transaction: ${OTHER.txHash}`);
    expect(declaration).toContain(`in transaction: ${MAINNET.txHash}`);
    expect(declaration).toContain(`I looked up transaction ${OTHER.txHash}`);
    expect(declaration).toContain(`I looked up transaction ${MAINNET.txHash}`);
  });

  it('an anchor a registry would refuse is junk in a backup file: a negative block, a time that isn’t a full date and time, a test-network flag that contradicts the network (R10 polish 3)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    w.upgrade();
    serveFolded(MAINNET);
    const inner = await opened(A, await backUp(A));
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const p = (inner.proofs as Record<string, Record<string, unknown>>)[fp];
    w.goDown();
    const cases: [Record<string, unknown>, boolean][] = [
      [{ blockHeight: -5 }, false],
      [{ anchoredAt: '1' }, false],
      [{ anchoredAt: '2026-11-27' }, false],
      [{ anchoredAt: 'Fri, 27 Nov 2026 12:00:00 GMT' }, false],
      [{ network: 'preview', testNetwork: false }, false],
      [{ network: 'mainnet', testNetwork: true }, false],
      [{ blockHeight: 0 }, true],
      [{ anchoredAt: '2026-11-27T14:00:00+02:00' }, true],
      [{ anchoredAt: '2026-11-27T12:00Z' }, true],
      [{ network: 'mainnet', testNetwork: false }, true],
    ];
    for (const [bad, kept] of cases) {
      p.anchor = { ...MAINNET, ...bad };
      const label = JSON.stringify(bad);
      const { b: N } = await restoreInto(`n-${label.replace(/\W/g, '')}`, JSON.stringify(inner));
      const got = (await bundleFromFile(N, made.plant, JSON.stringify(inner)))!;
      const a = got.ev.registry.fileRoots![0].anchor as Record<string, unknown> | null;
      if (kept) expect(a, label).toMatchObject(bad);
      else {
        expect(a, label).toBeNull();
        expect(textOf(got.file('README.txt')), label).not.toContain(MAINNET.txHash);
      }
    }
  });

  it('a registry that keeps giving new transactions can’t fill the browser: at most four kept aside per record, the earliest, and the holder is still warned (R10 polish 4)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    serveFolded(MAINNET);
    await backUp(A);
    const txs = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((x) => x.repeat(32));
    for (const tx of txs) {
      serveFolded({ ...MAINNET, txHash: tx });
      await backUp(A);
    }
    const sizeAfterFour = await A.run(() => A.m.stamps.keptSize());
    serveFolded({ ...MAINNET, txHash: 'c8'.repeat(32) });
    const inner = await opened(A, await backUp(A));
    expect(await A.run(() => A.m.stamps.keptSize())).toBe(sizeAfterFour);
    const aside = (stampsOf(inner)?.changed ?? [])
      .filter((c) => c.proofs[fp])
      .map((c) => (c.proofs[fp] as { anchor?: { txHash: string } }).anchor?.txHash);
    expect(aside).toEqual(txs.slice(0, 4));
    expect(anchorIn(inner, fp)?.txHash).toBe(MAINNET.txHash);
    expect(await A.run(() => A.m.stamps.rootChanges())).toBe(w.proofs.size);
  });

  /** Another root for the same batch, served to `fp` with this anchor (a broken registry). */
  const serveOtherRoot = async (fp: string, seed: string, anchor: Record<string, unknown>) => {
    const other = await buildBatch([seed.repeat(32), fp], BATCH_ID);
    w.proofs.set(fp, {
      ...(other.proofs[fp] as object),
      anchor,
      anchors: [{ kind: 'ledger', ...anchor, testNetwork: false }],
    });
    return other.root;
  };
  const plainHtml = (b?: Uint8Array) =>
    textOf(b)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');

  it('a second transaction for a root already set aside is kept too, within the cap, and reaches a bundle from the file (R11-1)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const OTHER = { ...MAINNET, txHash: 'cd'.repeat(32), blockHeight: 12000, anchoredAt: '2027-03-01T12:00:00.000Z' };
    const THIRD = { ...MAINNET, txHash: '3c'.repeat(32), blockHeight: 13000, anchoredAt: '2027-04-01T12:00:00.000Z' };
    const FOURTH = { ...MAINNET, txHash: '4d'.repeat(32), blockHeight: 14000, anchoredAt: '2027-05-01T12:00:00.000Z' };
    w.upgrade();
    serveFolded(MAINNET); // root 1, transaction A: kept
    await backUp(A);
    serveFolded(OTHER); // root 1, transaction B: aside
    await backUp(A);
    const r2 = await serveOtherRoot(fp, '11', THIRD); // root 2, transaction C: aside
    await backUp(A);
    await serveOtherRoot(fp, '11', FOURTH); // root 2, transaction D: aside too
    await backUp(A);
    await serveOtherRoot(fp, '11', FOURTH); // D again: nothing new
    const text = await backUp(A);
    const inner = await opened(A, text);
    const aside = (stampsOf(inner)?.changed ?? [])
      .filter((c) => c.proofs[fp])
      .map((c) => [c.root, (c.proofs[fp] as { anchor?: { txHash: string } }).anchor?.txHash]);
    expect(aside.map(([, tx]) => tx)).toEqual([OTHER.txHash, THIRD.txHash, FOURTH.txHash]);
    expect(aside[2][0]).toBe(r2);
    w.goDown();
    const { b: N } = await restoreInto('r11-1', text);
    const before = await storageOf(N);
    const got = (await bundleFromFile(N, made.plant, text))!;
    expect(await storageOf(N)).toEqual(before);
    dumpTo('multi-aside', got.file);
    const roots = got.ev.registry.fileRoots!;
    expect(roots.map((c) => [c.folder, (c.anchor as { txHash: string }).txHash, c.otherTransaction === true])).toEqual([
      ['proof/backup-file-1', MAINNET.txHash, false],
      ['proof/backup-file-2', OTHER.txHash, true],
      ['proof/backup-file-3', THIRD.txHash, false],
      ['proof/backup-file-4', FOURTH.txHash, true],
    ]);
    const pages = [
      textOf(got.file('README.txt')),
      plainHtml(got.file('EXAMINER-SUMMARY.html')),
      textOf(got.file('DECLARATION-TEMPLATE.txt')),
      (await renderVerifyPage(Buffer.from(got.file('verify.html')!).toString())).text('summary'),
    ];
    for (const p of pages) for (const tx of [MAINNET, OTHER, THIRD, FOURTH]) expect(p).toContain(tx.txHash);
  });

  it('the backup page’s warning says what the backup holds: the first answer, and up to four later ones per record (R11-1, R11-2a)', async () => {
    const said = await Promise.all(
      (['en', 'de', 'es', 'fr', 'ja'] as const).map(
        async (l) =>
          ((await import(`../i18n/app/${l}/backup.ts`)) as { backup: Record<string, string> }).backup[
            'app.backup.rootChanged'
          ],
      ),
    );
    expect(said[0]).toContain('up to four later ones for each record are in this backup');
    expect(said.join(' ')).not.toMatch(/every one it gave|alle sind in|todas están en|toutes sont dans|すべてを/);
  });

  const OTHER_TX = { ...MAINNET, txHash: 'cd'.repeat(32), blockHeight: 12000, anchoredAt: '2027-03-01T12:00:00.000Z' };
  const PREV_TX = { ...MAINNET, network: 'preview', contractAddress: '7a'.repeat(32), txHash: 'ab'.repeat(32) };
  /** The four pages of a bundle as a reader sees them. */
  const pagesOf = async (file: (p: string) => Uint8Array | undefined) => ({
    readme: textOf(file('README.txt')),
    examiner: plainHtml(file('EXAMINER-SUMMARY.html')),
    declaration: textOf(file('DECLARATION-TEMPLATE.txt')),
    verify: await (async () => {
      const v = await renderVerifyPage(Buffer.from(file('verify.html')!).toString());
      return `${v.text('summary')} ${v.text('lookups')}`.replace(/\s+/g, ' ');
    })(),
  });
  const RULE_A_BAD = [
    /practice data/i,
    /isn.t recorded on Midnight yet/,
    /not dated on any network/i,
    /now it names another/,
    /reads only the other transaction/,
  ];
  /** The bundle's Bitcoin card: its stamp file starts from the bundle's root.bin (review 12, polish 3). */
  const bitcoinCardOk = async (file: (p: string) => Uint8Array | undefined, at: string) => {
    const card = (await renderVerifyPage(Buffer.from(file('verify.html')!).toString()))
      .text('lookups')
      .replace(/\s+/g, ' ');
    expect(card, at).toContain('starts from SHA-256 of root.bin');
    expect(card, at).not.toContain('not about this batch root');
  };

  // One record set per case, each in its own test (review 12, polish 3).
  const RULE_A: [string, () => void, string][] = [
    ['none', () => anchorAll(null), 'now names no Midnight transaction for it'],
    [
      'preview',
      () => serveFolded(PREV_TX),
      `now names transaction ${PREV_TX.txHash} on Midnight Preview (a test network) for it`,
    ],
    ['B', () => serveFolded(OTHER_TX), `now names transaction ${OTHER_TX.txHash} on Midnight's main network`],
  ];
  for (const [name, serve, now] of RULE_A)
    it(`an online bundle states the main-network transaction this browser kept while the registry names ${name} (rule A, R11-3)`, async () => {
      const A = await browser('breeder');
      const B = await browser('licensee');
      const L = await browser('lab');
      const made = await makeTheSet(A, B, L);
      w.upgrade();
      serveFolded(MAINNET);
      await backUp(A);
      serve();
      const got = await bundleOf(A, made.plant);
      dumpTo(`kept-${name}`, got.file);
      expect(got.ev.registry.source).not.toBe('this-device');
      expect(got.ev.batch?.anchor).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
      for (const [f, p] of Object.entries(await pagesOf(got.file))) {
        expect(p, f).toContain(MAINNET.txHash);
        expect(p.replace(/’/g, "'"), f).toContain(now.replace(/’/g, "'"));
        for (const bad of RULE_A_BAD) expect(p, `${f}: ${bad}`).not.toMatch(bad);
      }
      expect(textOf(got.file('proof/check-on-midnight.mjs'))).toContain(MAINNET.txHash);
      await bitcoinCardOk(got.file, name);
    });

  it('an online bundle is built on the kept root, its transaction and its stamps when the registry gives another root, and every page says so (rule A, R12-4)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    w.upgrade();
    serveFolded(MAINNET); // R1/A: kept
    await backUp(A);
    const r1 = (w.proofs.get(fp) as { root: string }).root;
    const r2 = await serveOtherRoot(fp, '31', OTHER_TX); // R2/B
    const line = `VeilCore's registry now gives another batch root, ${r2} (transaction ${OTHER_TX.txHash} on Midnight's main network), for`;
    for (const when of ['before a backup', 'after a backup']) {
      if (when === 'after a backup') await backUp(A);
      const got = await bundleOf(A, made.plant);
      dumpTo(`kept-other-root-${when.replace(/ /g, '-')}`, got.file);
      expect(got.ev.registry.source, when).not.toBe('this-device');
      expect(got.ev.batch?.root, when).toBe(r1);
      expect(got.ev.batch?.anchor, when).toMatchObject({ network: 'mainnet', txHash: MAINNET.txHash });
      expect(Buffer.from(got.file('proof/root.bin')!).toString('hex'), when).toBe(r1);
      expect(got.file('proof/root.tst'), when).toBeDefined();
      for (const [f, p] of Object.entries(await pagesOf(got.file))) {
        const at = `${when} ${f}`;
        expect(p, at).toContain(MAINNET.txHash);
        expect(p, at).toContain(r1);
        expect(p.replace(/’/g, "'").replace(/\s+/g, ' '), at).toContain(line);
        expect(p.split(r2).length - 1, `${at}: R2 named once`).toBe(1);
        for (const bad of RULE_A_BAD) expect(p, `${at}: ${bad}`).not.toMatch(bad);
      }
      expect(textOf(got.file('DECLARATION-TEMPLATE.txt')).replace(/\s+/g, ' ')).toContain('for my record;');
      expect(textOf(got.file('proof/check-on-midnight.mjs')), when).toContain(MAINNET.txHash);
      await bitcoinCardOk(got.file, when);
    }
  });

  it('a set-aside root’s main-network answer is kept in the file beside the same transaction hash on a test network (rule B, R12-1)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const THIRD = { ...MAINNET, txHash: '3c'.repeat(32), blockHeight: 13000, anchoredAt: '2027-04-01T12:00:00.000Z' };
    w.upgrade();
    serveFolded(MAINNET); // R1/A: kept
    await backUp(A);
    const r2 = await serveOtherRoot(fp, '11', THIRD); // R2/C on the main network: aside
    await backUp(A);
    await serveOtherRoot(fp, '11', { ...PREV_TX, txHash: THIRD.txHash }); // R2/C on Preview: aside too
    const text = await backUp(A);
    const aside = (stampsOf(await opened(A, text))?.changed ?? [])
      .filter((c) => c.proofs[fp])
      .map((c) => {
        const a = (c.proofs[fp] as { anchor?: { txHash: string; network: string } }).anchor;
        return [c.root, a?.txHash, a?.network];
      });
    expect(aside).toEqual([
      [r2, THIRD.txHash, 'mainnet'],
      [r2, THIRD.txHash, 'preview'],
    ]);
    w.goDown();
    const { b: N } = await restoreInto('r12-1', text);
    const got = (await bundleFromFile(N, made.plant, text))!;
    expect(
      got.ev.registry.fileRoots!.map((c) => {
        const a = c.anchor as { txHash: string; network: string };
        return [c.root, a.txHash, a.network];
      }),
    ).toEqual([
      [expect.any(String), MAINNET.txHash, 'mainnet'],
      [r2, THIRD.txHash, 'mainnet'],
      [r2, THIRD.txHash, 'preview'],
    ]);
  });

  // ---- review 13 of PR #233, polish ---------------------------------------------------------
  /** Each page's words, quotes and spaces made plain. */
  const flat = (p: string) => p.replace(/’/g, "'").replace(/\s+/g, ' ');

  it('a bundle from the kept copy says the stamp status is from when the browser kept it, not when the bundle was made (review 13, polish 1 and 2)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    serveFolded(MAINNET); // R1/A, its Bitcoin stamp still pending
    await backUp(A);
    const online = await pagesOf((await bundleOf(A, made.plant)).file);
    expect(flat(online.readme)).toContain('the stamp as pending, not yet in a Bitcoin block when the bundle was made.');
    expect(flat(online.declaration)).toContain('When the bundle was made, the registry reported the stamp as pending');
    expect(flat(online.declaration)).toContain("from what VeilCore's registry returned. It checked");
    expect(flat(online.examiner)).not.toContain('kept it (at its last backup)');
    await serveOtherRoot(fp, '31', OTHER_TX); // the registry gives R2/B now: built on the kept R1/A
    const other = await bundleOf(A, made.plant);
    expect(other.ev.registry.registryRoot).toBeDefined();
    w.goDown();
    const device = await bundleOf(A, made.plant);
    expect(device.ev.registry.source).toBe('this-device');
    for (const [name, got] of [
      ['other root', other],
      ['this device', device],
    ] as const) {
      const p = await pagesOf(got.file);
      expect(flat(p.readme), name).toContain(
        "the stamp as pending, not yet in a Bitcoin block when the holder's browser kept it (at its last backup).",
      );
      expect(flat(p.declaration), name).toContain(
        'When my browser kept it (at its last backup), the registry had reported the stamp as pending',
      );
      expect(flat(p.examiner), name).toContain(
        "Status the registry reported when the holder's browser kept it (at its last backup)",
      );
      for (const [f, v] of Object.entries(p)) expect(flat(v), `${name} ${f}`).not.toMatch(/stamp as [^.]* when the bundle was made/);
      // Declaration line 4 says the files come from the kept copy (polish 2).
      expect(flat(p.declaration), name).toContain(
        "from what VeilCore's registry had returned to that browser before, kept there",
      );
      expect(flat(p.declaration), name).not.toContain("from what VeilCore's registry returned. It checked");
    }
    // verify.html, before the stamp file is read, says the same.
    const { VeilcoreVerify } = await import('../../evidence-page/verify-core.js');
    const lk = (VeilcoreVerify as unknown as { lookups: (ev: unknown, c: unknown) => { keptCopy: boolean } }).lookups;
    expect(lk(other.ev, null).keptCopy).toBe(true);
    expect(lk(device.ev, null).keptCopy).toBe(true);
    expect(lk({ ...other.ev, registry: { ...other.ev.registry, registryRoot: undefined, source: 'evidence-route' } }, null).keptCopy).toBe(false);
  });

  it('the same transaction hash on the main network and on Preview for one root gets the two-transactions box on every page (review 13, polish 3)', async () => {
    const A = await browser('breeder');
    const B = await browser('licensee');
    const L = await browser('lab');
    const made = await makeTheSet(A, B, L);
    const fp = await A.run(() => A.m.records.getRecord(made.plant)!.recordFingerprint);
    const THIRD = { ...MAINNET, txHash: '3c'.repeat(32), blockHeight: 13000, anchoredAt: '2027-04-01T12:00:00.000Z' };
    w.upgrade();
    serveFolded(MAINNET); // R1/A: kept
    await backUp(A);
    const r2 = await serveOtherRoot(fp, '11', THIRD); // R2/C on the main network
    await backUp(A);
    await serveOtherRoot(fp, '11', { ...PREV_TX, txHash: THIRD.txHash }); // R2/C on Preview
    const text = await backUp(A);
    w.goDown();
    const { b: N } = await restoreInto('r13-p3', text);
    const got = (await bundleFromFile(N, made.plant, text))!;
    dumpTo('r13-polish-3', got.file);
    const p = await pagesOf(got.file);
    expect(flat(p.readme)).toContain(`MORE THAN ONE TRANSACTION: VeilCore's registry gave two different date records`);
    expect(flat(p.readme)).toContain(`Batch root ${r2}:`);
    expect(flat(p.readme)).toContain(`transaction ${THIRD.txHash} on Midnight's main network`);
    expect(flat(p.readme)).toContain(`transaction ${THIRD.txHash} on Midnight Preview (a test network)`);
    expect(textOf(got.file('EXAMINER-SUMMARY.html'))).toContain('data-two-transactions="yes"');
    expect(flat(p.declaration)).toContain(
      `My backup file names 2 Midnight transactions for batch root ${r2} (`,
    );
    expect(flat(p.declaration)).toContain(`transaction ${THIRD.txHash} on Midnight Preview (a test network))`);
    expect(p.verify).toContain('Two different date records for one batch root');
    expect(p.verify).toContain(`for batch root ${r2}`);
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
