// The sealed-records contract across the two repositories (CONTRACT.md): the browser's own
// veilcore modules (api-store, vault, records, disclosure, transfers and the delivery code,
// licences, the registry export, the backup) driven against a REAL registry process, through
// every path that writes or reads what a holder typed. Afterwards the registry's database
// file is read byte by byte, and none of the private values typed in may be anywhere in it.
//
// Skipped unless VEILCORE_CONTRACT_REGISTRY is set, to either:
//   - a veilcore-api checkout (a directory): a registry is started from it on a free port with
//     a fresh database in a temporary folder, and stopped by its PID at the end; or
//   - a registry's address (http://...): then VEILCORE_CONTRACT_DB must name its database
//     file, which is scanned the same way.
//
//   VEILCORE_CONTRACT_REGISTRY=../../backups npx vitest run src/veilcore/registry-contract.test.ts
//
// Each "browser" is its own localStorage and its own copy of the modules (vi.resetModules),
// as two people on two devices are. Nothing here prints a holder key, vault key, offer key or
// claim code: a failure names what leaked, never its value.
// SPDX-License-Identifier: Apache-2.0
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TARGET = process.env.VEILCORE_CONTRACT_REGISTRY ?? '';
const STAND_IN = 'https://registry.test'; // VITE_API_BASE in vitest.config.ts

/** Values typed into the app that must never reach the registry in a readable form. */
const P = {
  bredBy: 'PRIV-bredby-Hollis-7Q2',
  notes: 'PRIV-notes-K9z-do-not-store',
  parent: 'PRIV-parent-Grandaddy-M3x',
  method: 'PRIV-method-backcross-B4c',
  refId: 'PRIV-ref-LOT-7781',
  taxon: 'PRIV-taxon-Cannabis-Zq',
  dateCreated: '1911-11-11',
  loggedAt: 1234567890123,
  photo: 'b0d1e5'.repeat(10) + 'abcd',
  dnaFile: 'PRIV-dna-report-file.pdf',
  dnaFp: 'd7e8f9a0'.repeat(8),
  dnaSha: 'c3c4c5c6'.repeat(8),
  correctionNotes: 'PRIV-correction-notes-Rr8',
  reason: 'PRIV-correction-reason-Tt5',
  licensee: 'PRIV-licensee-Acme-Gg1',
  territory: 'PRIV-territory-Nn2',
  extraTerms: 'PRIV-extra-terms-Ww3',
  quantity: 'PRIV-quantity-12-clones',
  offerNote: 'PRIV-offer-note-Vv4',
  labRef: 'PRIV-lab-accession-Ee6',
  // The second record's own private values (its published ones are below).
  bredBy2: 'PRIV-bredby2-Yy7',
  notes2: 'PRIV-notes2-Uu8',
};
/** Values the holder chooses to publish with a disclosure grant: stored readable, on purpose. */
const PUB = {
  parent: 'PUB-parent-Shared-Ok1',
  method: 'PUB-method-Shared-Ok2',
  dnaFp: 'e1e2e3e4'.repeat(8),
  dnaSha: 'f5f6f7f8'.repeat(8),
};
const NAME = 'Contract Plant Public Name';

type Sent = { method: string; url: string; headers: string; body: string };

let base = '';
let dbPath = '';
let child: ChildProcess | undefined;
let work = '';
const sent: Sent[] = [];
const realFetch = globalThis.fetch;

const freePort = (): Promise<number> =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const a = s.address();
      const port = typeof a === 'object' && a ? a.port : 0;
      s.close(() => ok(port));
    });
  });

const startRegistry = async (): Promise<void> => {
  if (/^https?:\/\//.test(TARGET)) {
    base = TARGET.replace(/\/$/, '');
    dbPath = process.env.VEILCORE_CONTRACT_DB ?? '';
    if (!dbPath) throw new Error('VEILCORE_CONTRACT_DB must name the database file of the registry at that address');
    return;
  }
  const dir = path.resolve(TARGET);
  if (!existsSync(path.join(dir, 'server.js'))) throw new Error(`${dir} is not a veilcore-api checkout`);
  work = mkdtempSync(path.join(tmpdir(), 'veilcore-contract-'));
  mkdirSync(path.join(work, 'lab-results'));
  dbPath = path.join(work, 'registry.db');
  const port = await freePort();
  base = `http://127.0.0.1:${String(port)}`;
  let log = '';
  child = spawn(process.execPath, ['server.js'], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PORT: String(port),
      DB_PATH: dbPath,
      LAB_RESULTS_DIR: path.join(work, 'lab-results'),
      VEILCORE_OTS: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (d: Buffer) => (log += d.toString()));
  child.stderr?.on('data', (d: Buffer) => (log += d.toString()));
  for (let i = 0; ; i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`the registry exited:\n${log}`);
    try {
      const h = await realFetch(`${base}/health`);
      if (h.ok) break;
    } catch {
      /* not up yet */
    }
    if (i > 200) throw new Error(`the registry did not start:\n${log}`);
    await new Promise((r) => setTimeout(r, 100));
  }
};

const stopRegistry = async (): Promise<void> => {
  // A process ended by a signal has signalCode set and exitCode null.
  if (child && child.exitCode === null && child.signalCode === null && child.pid !== undefined) {
    const gone = new Promise((r) => child?.once('exit', r));
    process.kill(child.pid, 'SIGTERM'); // by PID: only the registry this test started
    await gone;
  }
};

/** fetch, as the browser's modules call it, sent to the real registry and kept for the leak check. */
const wire = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const to = url.startsWith(STAND_IN) ? base + url.slice(STAND_IN.length) : url;
  sent.push({
    method: (init?.method ?? 'GET').toUpperCase(),
    url: to,
    headers: JSON.stringify(init?.headers ?? {}),
    body: typeof init?.body === 'string' ? init.body : '',
  });
  const { cache: _cache, ...rest } = init ?? {};
  void _cache;
  return realFetch(to, rest);
};

/** A registry call made by the test itself, not by the app. */
const reg = async (p: string, init: RequestInit = {}): Promise<{ status: number; json: unknown }> => {
  const res = await realFetch(`${base}${p}`, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
};
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v as Obj;
const verify = async (id: string): Promise<Obj> => obj((await reg(`/verify/${id}`)).json);

/** A browser: its own storage, its own copy of the app's modules. */
const browser = async (storage: Map<string, string> = new Map()) => {
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
  vi.stubGlobal('fetch', wire);
  return {
    storage,
    records: await import('./records'),
    vault: await import('./vault'),
    api: await import('./api-store'),
    disclosure: await import('./disclosure'),
    transfers: await import('./transfers'),
    licenses: await import('./licenses'),
    backup: await import('./backup'),
    exportMod: await import('./registry-export'),
    attesters: await import('./attester-keys'),
    commitment: await import('./commitment'),
    holder: await import('./holder'),
  };
};
type Browser = Awaited<ReturnType<typeof browser>>;

const until = async (cond: () => boolean | Promise<boolean>, what: string, ms = 15_000): Promise<void> => {
  const end = Date.now() + ms;
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
};

/** A holder's rows as the registry holds them, by id. */
const rowsOf = async (holderKey: string, kind: 'records' | 'licenses'): Promise<Obj[]> =>
  ((await reg(`/api/${kind}`, { headers: { 'x-holder-key': holderKey } })).json as Obj[]).sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );

const WIRE_FIELDS = new Set([
  'id',
  'strainName',
  'profile',
  'recordFingerprint',
  'keyBinding',
  'supersedes',
  'supersededBy',
  'receivedFrom',
  'receivedFromCommitment',
  'receivedAt',
  'transferId',
  'attestation',
  'sealed',
]);

/** Every form a key could take: as kept (base64url), base64 and hex. */
const forms = (b64url: string): string[] => {
  const bytes = Buffer.from(b64url, 'base64url');
  return [b64url, bytes.toString('base64'), bytes.toString('hex')];
};

describe.skipIf(!TARGET)('the sealed-records contract against a real registry', () => {
  beforeAll(startRegistry, 60_000);
  afterAll(async () => {
    vi.unstubAllGlobals();
    await stopRegistry();
    if (work) rmSync(work, { recursive: true, force: true });
  });

  // Shared between the steps, in order: the breeder's storage, their records, the lab's.
  const breederStorage = new Map<string, string>();
  const labStorage = new Map<string, string>();
  const secretKeys: { label: string; values: string[] }[] = [];
  let A: Browser;
  let r1: { id: string; recordFingerprint: string };
  let r2: { id: string; recordFingerprint: string };
  let corrected: { id: string };
  let transferId = '';
  let receivedId = '';
  let licenceId = '';

  it('save: what the holder typed goes sealed; only the public fields are readable', async () => {
    A = await browser(breederStorage);
    const { fingerprintRecord, newNonce } = A.commitment;
    const fields = {
      nonce: newNonce(),
      strainName: NAME,
      bredBy: P.bredBy,
      dateCreated: P.dateCreated,
      notes: P.notes,
      loggedAt: P.loggedAt,
      parents: [{ name: P.parent }],
      breedingMethod: P.method,
      refId: P.refId,
      taxon: P.taxon,
      photoFingerprints: [P.photo],
    };
    const out = await A.records.createRecordSaved({ ...fields, recordFingerprint: await fingerprintRecord(fields) });
    expect(out.result).toEqual({ ok: true, refused: [] });
    r1 = out.record;
    const fields2 = {
      nonce: newNonce(),
      strainName: `${NAME} two`,
      bredBy: P.bredBy2,
      dateCreated: '2026-10-01',
      notes: P.notes2,
      loggedAt: Date.UTC(2026, 9, 2),
      parents: [{ name: PUB.parent }],
      breedingMethod: PUB.method,
    };
    const out2 = await A.records.createRecordSaved({ ...fields2, recordFingerprint: await fingerprintRecord(fields2) });
    expect(out2.result.ok).toBe(true);
    r2 = out2.record;

    const holderKey = A.holder.holderKeyIfAny()!;
    const vaultKey = A.vault.vaultKeyIfAny()!;
    expect(holderKey).toMatch(/^[0-9a-f]{64}$/);
    expect(vaultKey).toBeTruthy();
    secretKeys.push({ label: 'the breeder’s vault key', values: forms(vaultKey) });
    secretKeys.push({ label: 'the breeder’s holder key', values: [holderKey] });

    const stored = await rowsOf(holderKey, 'records');
    expect(stored.map((r) => r.id).sort()).toEqual([r1.id, r2.id].sort());
    for (const row of stored) {
      expect(row.sealed, String(row.id)).toMatchObject({
        v: 1,
        alg: 'A256GCM',
        kid: await A.vault.vaultKidOf(vaultKey),
      });
      for (const k of Object.keys(row)) expect(WIRE_FIELDS.has(k), `${String(row.id)}.${k} in the clear`).toBe(true);
    }
    expect(stored.find((r) => r.id === r1.id)).toMatchObject({
      strainName: NAME,
      recordFingerprint: r1.recordFingerprint,
    });
    // The public view has the name and the fingerprint, nothing else of the holder's.
    const v = await verify(r1.id);
    expect(v).toMatchObject({ found: true, cultivar: NAME, recordFingerprint: r1.recordFingerprint });
  });

  it('re-save unchanged: the same ciphertext is sent, and the registry keeps its first-seen date', async () => {
    const holderKey = A.holder.holderKeyIfAny()!;
    const before = await rowsOf(holderKey, 'records');
    const seen = (await verify(r1.id)).registryFirstSeen;
    // A fresh page load in the same browser: opens every row, checks each fingerprint.
    A = await browser(breederStorage);
    await A.records.hydrate();
    expect(A.records.getRecord(r1.id)).toMatchObject({
      bredBy: P.bredBy,
      notes: P.notes,
      parents: [{ name: P.parent }],
    });
    expect(A.records.integrityOf(r1.id)).toBe('match');
    expect(A.api.rowStateOf(A.records.RECORDS_KEY, r1.id)).toBe('open');
    expect(A.records.lockedRecords()).toEqual([]);
    const res = await A.api.apiStore.save(A.records.RECORDS_KEY, A.records.allRecords());
    expect(res).toEqual({ ok: true, refused: [] });
    expect(await rowsOf(holderKey, 'records')).toEqual(before);
    expect((await verify(r1.id)).registryFirstSeen).toBe(seen);
  });

  it('correction: supersedes and supersededBy cross; the reason and the new contents stay sealed', async () => {
    corrected = (await A.records.issueCorrection(r1.id, { notes: P.correctionNotes }, P.reason))!;
    expect(corrected.id).not.toBe(r1.id);
    const holderKey = A.holder.holderKeyIfAny()!;
    const rows = await rowsOf(holderKey, 'records');
    const orig = rows.find((r) => r.id === r1.id)!;
    const corr = rows.find((r) => r.id === corrected.id)!;
    expect(orig.supersededBy).toBe(corrected.id);
    expect(obj(corr.supersedes).recordId).toBe(r1.id);
    expect(Object.keys(obj(corr.supersedes)).sort()).toEqual(
      ['changedFields', 'effectiveAt', 'recordId'].filter((k) => obj(corr.supersedes)[k] !== undefined).sort(),
    );
    expect((await verify(r1.id)).supersededBy).toBe(corrected.id);
    expect(obj((await verify(corrected.id)).supersedes).recordId).toBe(r1.id);
    // Opened again, the correction carries its full block (the reason) from inside `sealed`.
    A = await browser(breederStorage);
    await A.records.hydrate();
    expect(A.records.getRecord(corrected.id)?.supersedes?.reason).toBe(P.reason);
    expect(A.records.getRecord(corrected.id)?.notes).toBe(P.correctionNotes);
    expect(A.records.integrityOf(corrected.id)).toBe('match');
    expect(A.records.getRecord(r1.id)?.supersededBy).toBe(corrected.id);
  });

  it('grant with values: the registry answers what the holder chose to publish, from the values sent', async () => {
    const d = A.disclosure;
    const rec2 = A.records.getRecord(r2.id)!;
    const g = await d.saveGrant(
      rec2,
      d.disclosureFrom(['existence', 'attestation-status', 'sealed-at', 'parent-names', 'breeding-method']),
    );
    expect('error' in g, JSON.stringify(g)).toBe(false);
    const v = await verify(r2.id);
    expect(v.parents).toEqual([PUB.parent]);
    expect(v.breedingMethod).toBe(PUB.method);
    expect(v.sealedAt).toBe(rec2.loggedAt);
    expect(v.dnaPairedByHolder).toBe(false);
    expect(v.staleGrant).toBeUndefined();
    expect(v.disclosed).toEqual(['own', 'dna', 'sealed', 'parents', 'method']);
    expect(JSON.stringify(v)).not.toContain(P.bredBy2);
  });

  it('a pairing changes the values without changing the fingerprint: the browser sends the grant again', async () => {
    A.records.pairDna(r2.id, PUB.dnaFp, 'shared-report.pdf', { fileSha256: PUB.dnaSha });
    await until(async () => (await verify(r2.id)).dnaPairingFingerprint === PUB.dnaFp, 'the new pairing on /verify');
    const v = await verify(r2.id);
    expect(v.dnaPairedByHolder).toBe(true);
    expect(v.dnaFileSha256).toBe(PUB.dnaSha);
    // A pairing on a record with no grant stays sealed (checked in the database at the end).
    A.records.pairDna(corrected.id, P.dnaFp, P.dnaFile, { fileSha256: P.dnaSha });
    const holderKey = A.holder.holderKeyIfAny()!;
    const before = JSON.stringify((await rowsOf(holderKey, 'records')).find((r) => r.id === corrected.id));
    await until(
      async () => JSON.stringify((await rowsOf(holderKey, 'records')).find((r) => r.id === corrected.id)) !== before,
      'the paired correction’s save',
    );
    expect(v.recordFingerprint).toBe(r2.recordFingerprint);
  });

  it('a stale grant (sent without the values, as an older site did) is listed, then sent again by the browser', async () => {
    const holderKey = A.holder.holderKeyIfAny()!;
    const old = await reg(`/api/records/${r2.id}/disclosure`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-holder-key': holderKey },
      body: JSON.stringify({ show: ['existence', 'attestation-status', 'parent-names', 'breeding-method'] }),
    });
    expect(old.status).toBe(200);
    let v = await verify(r2.id);
    expect(v.staleGrant).toEqual(['dna', 'parents', 'method']);
    expect(v.parents).toBeUndefined();
    expect(v.dnaPairedByHolder).toBeUndefined();
    // The lab status is still granted: its registry facts are answered, only the pairing waits.
    expect(v.disclosed).toEqual(['own', 'dna']);

    const sentAgain = await A.disclosure.syncGrants(
      A.records.getRecord,
      [],
      (id) => A.records.integrityOf(id) !== 'mismatch',
    );
    expect(sentAgain).toBe(1);
    v = await verify(r2.id);
    expect(v.staleGrant).toBeUndefined();
    expect(v.parents).toEqual([PUB.parent]);
    expect(v.dnaPairingFingerprint).toBe(PUB.dnaFp);
    // Nothing left to send.
    expect(await A.disclosure.syncGrants(A.records.getRecord)).toBe(0);
  });

  it('offer with a sealed offer, claim, and the claimant’s sealed save', async () => {
    const t = A.transfers;
    const source = A.records.getRecord(r1.id)!;
    const offer = await t.offerTransfer(source, 'lab@contract.test', {
      quantity: P.quantity,
      note: P.offerNote,
      sample: { sampleId: 'CT-1', sealNumber: '9001' },
    });
    if ('error' in offer) throw new Error(offer.error);
    transferId = offer.transferId;
    secretKeys.push({ label: 'the offer key', values: forms(offer.offerKey) });
    if (offer.claimCode) secretKeys.push({ label: 'the claim code', values: [offer.claimCode] });
    const code = t.shareCodeFor(offer.transferId, offer.claimCode, undefined, offer.offerKey);
    expect(code.split('.').at(-1)?.startsWith('o1')).toBe(true);

    // The lab, in its own browser.
    const B = await browser(labStorage);
    const parsed = B.transfers.parseShareCode(code);
    expect(parsed.transferId).toBe(transferId);
    const claim = await B.transfers.claimTransfer(parsed.transferId, parsed.claimCode);
    if ('error' in claim) throw new Error(claim.error);
    receivedId = claim.recordId;
    expect(claim.offerSealed).toBeTruthy();
    expect(claim.offerPlain).toBeUndefined();
    // What the registry left for the lab: a stub of public fields, nothing of the sender's.
    const stub = (await rowsOf(B.holder.holderKeyIfAny()!, 'records')).find((r) => r.id === receivedId)!;
    expect(Object.keys(stub).sort()).toEqual(
      ['id', 'receivedAt', 'receivedFrom', 'receivedFromCommitment', 'strainName', 'transferId'].sort(),
    );
    await B.records.hydrate();
    expect(B.api.rowStateOf(B.records.RECORDS_KEY, receivedId)).toBe('stub');
    const opened = await B.transfers.openClaimOffer(claim, parsed.offerKey, undefined);
    if (typeof opened !== 'object') throw new Error(`the offer did not open: ${opened}`);
    const fields = B.records.offerFieldsOf(opened.fields);
    expect(fields).toMatchObject({ bredBy: P.bredBy, quantity: P.quantity, note: P.offerNote });
    const received = await B.records.sealReceived(receivedId, { deliveryNote: fields.note, labRef: P.labRef }, fields);
    expect(received?.recordFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await B.records.checkIntegrity(received!)).toBe('match');
    secretKeys.push({ label: 'the lab’s vault key', values: forms(B.vault.vaultKeyIfAny()!) });
    await until(
      async () => !!(await rowsOf(B.holder.holderKeyIfAny()!, 'records')).find((r) => r.id === receivedId && r.sealed),
      'the lab’s sealed save',
    );
    const row = (await rowsOf(B.holder.holderKeyIfAny()!, 'records')).find((r) => r.id === receivedId)!;
    expect(row.recordFingerprint).toBe(received!.recordFingerprint);
    expect(row.receivedFrom).toBe(r1.id);
    expect(row.transferId).toBe(transferId);
    for (const k of Object.keys(row)) expect(WIRE_FIELDS.has(k), `received.${k} in the clear`).toBe(true);
    // Opened again in a fresh load, whole.
    const B2 = await browser(labStorage);
    await B2.records.hydrate();
    expect(B2.records.getRecord(receivedId)).toMatchObject({
      bredBy: P.bredBy,
      deliveryNote: P.offerNote,
      labRef: P.labRef,
    });
    expect(B2.records.integrityOf(receivedId)).toBe('match');
  });

  it('receipt: the lab signs and ties it to the delivery; the breeder’s record shows it under the lab status', async () => {
    const B = await browser(labStorage);
    await B.records.hydrate();
    const received = B.records.getRecord(receivedId)!;
    const profile = await B.attesters.createAttester('Contract Lab', 'laboratory');
    const pub = await B.attesters.publishAttester(profile);
    expect(pub.error).toBeUndefined();
    const arrival = { sampleId: 'CT-1', sealNumber: '9001', sealIntact: 'yes' as const, arrivedOn: '2026-10-15' };
    const set = await B.transfers.setArrival(transferId, arrival);
    expect('error' in set, JSON.stringify(set)).toBe(false);
    const digest = await B.transfers.custodyDigest(transferId, { sampleId: 'CT-1', sealNumber: '9001' }, arrival);
    const signed = await B.transfers.signReceiptWith(
      profile,
      { sourceCommitment: r1.recordFingerprint, receivedRecordFingerprint: received.recordFingerprint },
      digest,
    );
    if ('error' in signed) throw new Error(signed.error);
    expect(await B.transfers.attachReceipt(transferId, signed.attestationId)).toEqual({ ok: true });

    // The breeder shares the lab status of the source (values from the record: it has none).
    A = await browser(breederStorage);
    await A.records.hydrate();
    const g = await A.disclosure.saveGrant(
      A.records.getRecord(r1.id)!,
      A.disclosure.disclosureFrom(['attestation-status']),
    );
    expect('error' in g).toBe(false);
    const v = await verify(r1.id);
    expect(v.signedAttestation).toBe(true);
    expect(v.dnaPairedByHolder).toBe(false);
    expect(v.custody).toEqual([{ receiptAttestationId: signed.attestationId, covered: 'covered', differences: [] }]);
  });

  it('licence save: { id, sealed } only, and it opens again', async () => {
    A.licenses.startLicenseSync();
    const l = A.licenses.createLicense({
      type: 'license',
      recordId: r1.id,
      recordFingerprint: r1.recordFingerprint,
      agreementFingerprint: 'ab'.repeat(32),
      terms: {
        licensee: P.licensee,
        startDate: '2026-10-01',
        endDate: '2027-10-01',
        extraTerms: P.extraTerms,
        rights: 'cultivate',
        territory: P.territory,
        royaltyType: 'percent',
        royaltyAmount: '5',
        unitBasis: 'per-plant',
        sublicensable: false,
        exclusive: false,
      },
    });
    licenceId = l.id;
    const holderKey = A.holder.holderKeyIfAny()!;
    await until(async () => (await rowsOf(holderKey, 'licenses')).some((r) => r.id === licenceId), 'the licence save');
    const row = (await rowsOf(holderKey, 'licenses')).find((r) => r.id === licenceId)!;
    expect(Object.keys(row).sort()).toEqual(['id', 'sealed']);
    const fresh = await browser(breederStorage);
    fresh.licenses.startLicenseSync();
    await until(() => fresh.licenses.getLicense(licenceId) !== undefined, 'the licence to load');
    expect(fresh.licenses.getLicense(licenceId)).toMatchObject({ recordId: r1.id, terms: { licensee: P.licensee } });
    expect(fresh.licenses.lockedLicenses()).toEqual([]);
    A = fresh;
  });

  it('export: the registry’s file is sealed; the browser opens it before it is written', async () => {
    const holderKey = A.holder.holderKeyIfAny()!;
    const raw = await reg('/api/export', { headers: { 'x-holder-key': holderKey } });
    expect(raw.status).toBe(200);
    const rawText = JSON.stringify(raw.json);
    for (const s of [P.bredBy, P.notes, P.licensee, P.reason]) expect(rawText.includes(s), s).toBe(false);
    const out = await A.exportMod.fetchRegistryExport(wire);
    if ('error' in out) throw new Error(out.error);
    const file = JSON.parse(await out.blob.text()) as Obj;
    expect(file.lockedRows).toBeUndefined();
    const recs = file.records as Obj[];
    expect(recs.find((r) => r.id === r1.id)).toMatchObject({
      bredBy: P.bredBy,
      notes: P.notes,
      supersededBy: corrected.id,
    });
    expect(obj(recs.find((r) => r.id === corrected.id)?.supersedes).reason).toBe(P.reason);
    expect((file.licenses as Obj[]).find((l) => l.id === licenceId)).toMatchObject({ terms: { licensee: P.licensee } });
  });

  it('restore from a v3 backup into a fresh browser: every record and licence opens, none locked', async () => {
    await A.records.hydrate();
    const contents = A.backup.backupContents();
    expect(contents.version).toBe(3);
    expect(contents.vaultKey).toBe(A.vault.vaultKeyIfAny());
    const fresh = await browser(new Map());
    const result = await fresh.backup.restoreAny(new File([JSON.stringify(contents)], 'VeilCore backup.json'));
    expect(result).toMatchObject({ holderKey: 'restored', vaultKey: 'restored' });
    await fresh.records.hydrate();
    expect(fresh.records.lockedRecords()).toEqual([]);
    for (const id of [r1.id, r2.id, corrected.id]) {
      expect(fresh.api.rowStateOf(fresh.records.RECORDS_KEY, id), id).toBe('open');
      expect(fresh.records.integrityOf(id), id).toBe('match');
    }
    expect(fresh.records.getRecord(r1.id)).toMatchObject({ bredBy: P.bredBy, refId: P.refId, taxon: P.taxon });
    fresh.licenses.startLicenseSync();
    await until(() => fresh.licenses.getLicense(licenceId) !== undefined, 'the restored licence');
    expect(fresh.licenses.lockedLicenses()).toEqual([]);
  });

  it('a browser with the holder key and a different vault key: every row locked, none sent back, a new save refused', async () => {
    const holderKey = A.holder.holderKeyIfAny()!;
    const kid = await A.vault.vaultKidOf(A.vault.vaultKeyIfAny()!);
    const before = await rowsOf(holderKey, 'records');
    const storage = new Map<string, string>([['veilcore.holder.v1', holderKey]]);
    const L = await browser(storage);
    const wrongKey = L.vault.mintVault();
    secretKeys.push({ label: 'the wrong vault key', values: forms(wrongKey) });
    await L.records.hydrate();
    expect(L.records.allRecords()).toEqual([]);
    expect(
      L.records
        .lockedRecords()
        .map((r) => r.id)
        .sort(),
    ).toEqual([r1.id, r2.id, corrected.id].sort());
    for (const r of L.records.lockedRecords()) expect(r.kid).toBe(kid);
    L.licenses.startLicenseSync();
    await until(() => L.licenses.lockedLicenses().length === 1, 'the locked licence');
    expect(L.licenses.lockedLicenses()[0].id).toBe(licenceId);

    const mark = sent.length;
    const { fingerprintRecord, newNonce } = L.commitment;
    const f = {
      nonce: newNonce(),
      strainName: 'New here',
      bredBy: 'x',
      dateCreated: '',
      notes: '',
      loggedAt: Date.now(),
    };
    const out = await L.records.createRecordSaved({ ...f, recordFingerprint: await fingerprintRecord(f) });
    expect(out.result.ok).toBe(false);
    expect(out.result.refused.map((r) => r.reason).join(' ')).toMatch(/different vault key/);
    const puts = sent.slice(mark).filter((s) => s.method === 'PUT' && s.url.endsWith('/api/records'));
    expect(puts.length).toBe(1);
    expect((JSON.parse(puts[0].body) as Obj[]).map((r) => r.id)).toEqual([out.record.id]);
    expect(await rowsOf(holderKey, 'records')).toEqual(before);
  });

  it('nothing private was sent in any request, and nothing private is in the registry’s database file', async () => {
    const privates = Object.entries(P).map(([k, v]) => [k, String(v)] as const);
    // Every request the app made: URL, headers and body.
    for (const s of sent) {
      const all = `${s.url}\n${s.headers}\n${s.body}`;
      for (const [k, v] of privates) expect(all.includes(v), `${k} in ${s.method} ${s.url}`).toBe(false);
      for (const { label, values } of secretKeys) {
        if (label.includes('holder key') || label.includes('claim code')) continue; // sent by design
        for (const v of values) expect(all.includes(v), `${label} in ${s.method} ${s.url}`).toBe(false);
      }
    }
    // The database file, the raw bytes, with whatever journal sits beside it, while running and after.
    const files = () =>
      [dbPath, `${dbPath}-wal`, `${dbPath}-journal`].filter((f) => existsSync(f) && statSync(f).size > 0);
    const scan = () => {
      const bytes = Buffer.concat(files().map((f) => readFileSync(f)));
      expect(bytes.length).toBeGreaterThan(0);
      for (const [k, v] of privates) expect(bytes.includes(Buffer.from(v, 'utf8')), `${k} in the database`).toBe(false);
      for (const { label, values } of secretKeys) {
        for (const v of values) expect(bytes.includes(Buffer.from(v, 'utf8')), `${label} in the database`).toBe(false);
      }
      // The scan finds what is there: the values the holder chose to publish, and the public name.
      for (const v of [PUB.parent, PUB.method, PUB.dnaFp, NAME])
        expect(bytes.includes(Buffer.from(v, 'utf8')), v).toBe(true);
    };
    scan();
    if (child) {
      await stopRegistry();
      scan();
    }
  });
});
