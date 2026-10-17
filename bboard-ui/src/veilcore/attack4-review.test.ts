// Round 4 of sealed records: one regression test per browser-side finding of the fourth attack
// review (sealed/report-round4.md), ported from its proofs (scratchpad attack4/poc/
// attack4.test.ts). Each proof passed when its attack worked; each test here passes only when it
// no longer does. The registry-side findings (F3 embed wording, F6 the purge, F10 the export
// note, F11 the `_sc2_` answer) are tested in the registry (test/attack-round4.test.mjs).
//
// They run against the in-memory registry with the real one's rules (fixtures/fake-registry.ts),
// or, with VEILCORE_CONTRACT_REGISTRY set to a veilcore-api checkout, against a REAL registry
// started from it on a free port with a fresh database and stopped by its PID, as the proofs did:
//
//   VEILCORE_CONTRACT_REGISTRY=../../backups npx vitest run src/veilcore/attack4-review.test.ts
//
// Several browsers (or tabs) at once (fixtures/browsers.ts), each its own modules and storage.
// SPDX-License-Identifier: Apache-2.0

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';

const TARGET = process.env.VEILCORE_CONTRACT_REGISTRY ?? '';
/** A real registry, started here from a checkout (an http address is the contract test's, not used here). */
const REAL = TARGET !== '' && !/^https?:/.test(TARGET);
const STAND_IN = 'https://registry.test'; // VITE_API_BASE in vitest.config.ts
const realFetch = globalThis.fetch;

type Obj = Record<string, unknown>;
type Sent = { method: string; url: string; body: string };

// ---- the registry: a real one, or the in-memory one ---------------------------------------

let base = '';
let dbPath = '';
let child: ChildProcess | undefined;
let work = '';
let reg: FakeRegistry;
const realSent: Sent[] = [];
/** Requests whose "METHOD /path" matches one of these fail once, as a dropped connection does. */
const failOnce: RegExp[] = [];

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

const dropOnce = (method: string, pathname: string): boolean => {
  const at = failOnce.findIndex((re) => re.test(`${method} ${pathname}`));
  if (at < 0) return false;
  failOnce.splice(at, 1);
  return true;
};

const wire = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const to = url.startsWith(STAND_IN) ? base + url.slice(STAND_IN.length) : url;
  const method = (init?.method ?? 'GET').toUpperCase();
  if (dropOnce(method, new URL(to).pathname)) return Promise.reject(new TypeError('Failed to fetch'));
  realSent.push({ method, url: to, body: typeof init?.body === 'string' ? init.body : '' });
  const { cache: _c, ...rest } = init ?? {};
  void _c;
  return realFetch(to, rest);
};

const sent = (): Sent[] => (REAL ? realSent : reg.sent);

/** A holder's rows as the registry holds them. */
const rows = async (hk: string, kind: 'records' | 'licenses'): Promise<Obj[]> => {
  if (!REAL) {
    const t = kind === 'records' ? reg.records : reg.licenses;
    return [...t.values()]
      .filter((r) => r.holder === hk)
      .map((r) => {
        const { holder: _h, ...rest } = r;
        void _h;
        return rest;
      });
  }
  const res = await realFetch(`${base}/api/${kind}`, { headers: { 'x-holder-key': hk } });
  return (await res.json()) as Obj[];
};

/** The operator (or a database restored from an old backup) writes a row's body directly. */
const overwriteRecord = (hk: string, id: string, body: Obj): void => {
  if (!REAL) {
    reg.records.set(id, { ...(body as Obj & { id: string }), holder: hk });
    return;
  }
  const require = createRequire(import.meta.url);
  const Database = require(path.join(path.resolve(TARGET), 'node_modules/better-sqlite3')) as new (p: string) => {
    prepare: (s: string) => { run: (...a: unknown[]) => unknown };
    close: () => void;
  };
  const db = new Database(dbPath);
  db.prepare('UPDATE records SET body = ? WHERE id = ?').run(JSON.stringify(body), id);
  db.close();
};

beforeAll(async () => {
  if (!REAL) return;
  work = mkdtempSync(path.join(tmpdir(), 'a4r-'));
  mkdirSync(path.join(work, 'lab-results'));
  dbPath = path.join(work, 'registry.db');
  const port = await freePort();
  base = `http://127.0.0.1:${String(port)}`;
  let log = '';
  child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(TARGET),
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
    try {
      if ((await realFetch(`${base}/health`)).ok) break;
    } catch {
      /* not yet */
    }
    if (i > 300) throw new Error(`registry did not start\n${log}`);
    await settle(100);
  }
}, 60_000);

afterAll(async () => {
  if (child?.pid !== undefined && child.exitCode === null) {
    const gone = new Promise((r) => child?.once('exit', r));
    process.kill(child.pid, 'SIGTERM');
    await gone;
  }
  if (work) rmSync(work, { recursive: true, force: true });
});

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  failOnce.length = 0;
  if (REAL) vi.stubGlobal('fetch', wire);
  else {
    reg = fakeRegistry();
    reg.misbehave.fault = (method, pathname) => (dropOnce(method, pathname) ? 'fail' : undefined);
    vi.stubGlobal('fetch', reg.fetch);
  }
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

// ---- the app, as the proofs drove it --------------------------------------------------------

const until = async (cond: () => boolean | Promise<boolean>, what: string, ms = 15_000): Promise<void> => {
  const end = Date.now() + ms;
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await settle(50);
  }
};

/** A holder key and a vault key in a checked backup, as the app has a holder do. */
const ready = (b: Browser): void => {
  b.m.holder.holderKey();
  if (!b.m.vault.vaultKeyIfAny()) b.m.vault.mintVault();
  b.m.vault.markVaultBackedUp();
};

const plant = async (b: Browser, name: string, notes = '') =>
  b.run(async () => {
    const f = {
      nonce: b.m.commitment.newNonce(),
      strainName: name,
      bredBy: 'x',
      dateCreated: '2026-10-01',
      notes,
      loggedAt: Date.now(),
    };
    const { record } = await b.m.records.createRecordSaved({
      ...f,
      recordFingerprint: await b.m.commitment.fingerprintRecord(f),
    });
    return { record, fields: f };
  });

const TERMS = {
  licensee: 'Licensee Co',
  startDate: '2026-10-01',
  endDate: '2027-10-01',
  extraTerms: '',
  rights: 'cultivate' as const,
  territory: 'NJ',
  royaltyType: 'percent' as const,
  royaltyAmount: '5',
  unitBasis: 'per-plant' as const,
  sublicensable: false,
  exclusive: false,
};

const licencePuts = () => sent().filter((s) => s.method === 'PUT' && s.url.endsWith('/api/licenses'));
const opened = async (b: Browser, kind: 'records' | 'licenses', id: string, row: Obj) =>
  b.run(async () => JSON.stringify(await b.m.vault.openRow(kind, id, row.sealed)));

// ============================================================================================

describe(`round 4 against ${REAL ? 'a real registry' : 'the in-memory registry'}`, () => {
  it('F1 (two devices): the second device’s change from a stale copy is refused as an older copy and said; the first change stays', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record } = await plant(A, 'A4 licence plant');
    const lic = await A.run(() => {
      A.m.licenses.startLicenseSync();
      return A.m.licenses.createLicense({
        type: 'license',
        recordId: record.id,
        recordFingerprint: record.recordFingerprint,
        agreementFingerprint: 'cd'.repeat(32),
        terms: TERMS,
      });
    });
    const hk = await A.run(() => A.m.holder.holderKeyIfAny()!);
    await until(async () => (await rows(hk, 'licenses')).some((r) => r.id === lic.id), 'licence saved');

    // Device B: the same holder (restored from the backup file: same keys) loads the agreement.
    const B = await browser('B');
    await B.run(() => {
      for (const k of ['veilcore.holder.v1', 'veilcore.vault.v1'])
        if (A.storage.has(k)) B.storage.set(k, A.storage.get(k)!);
      ready(B);
      B.m.licenses.startLicenseSync();
    });
    await until(() => B.run(() => B.m.licenses.getLicense(lic.id) !== undefined), 'B loads it');

    // Device A, its page open (its own modules, A's storage), logs a payment.
    const A2 = await browser('A2', {}, 'A');
    await A2.run(() => A2.m.licenses.startLicenseSync());
    await until(() => A2.run(() => A2.m.licenses.getLicense(lic.id) !== undefined), 'A loads it');
    const before = licencePuts().length;
    await A2.run(() => A2.m.licenses.addRoyalty(lic.id, 1000, 50, 'PAYMENT-FROM-DEVICE-A'));
    await until(() => licencePuts().length > before, 'A saves');
    await settle(300);
    // B, still on the copy it loaded, logs another: refused, and B is told.
    await B.run(() => B.m.licenses.addRoyalty(lic.id, 2000, 100, 'PAYMENT-FROM-DEVICE-B'));
    await until(
      () =>
        B.run(() =>
          (B.m.saveStatus.saveProblemNow()?.refused ?? []).some((r) => r.words === 'app.sealed.refuse.olderCopy'),
        ),
      'B told its change was refused as an older copy',
    );
    const stored = (await rows(hk, 'licenses')).find((r) => r.id === lic.id)!;
    expect(typeof stored.rev).toBe('number');
    const txt = await opened(A, 'licenses', lic.id, stored);
    expect(txt).toContain('PAYMENT-FROM-DEVICE-A');
    expect(txt).not.toContain('PAYMENT-FROM-DEVICE-B');
    // B reads the registry's copy back: A's payment is shown there.
    await until(
      () =>
        B.run(() =>
          (B.m.licenses.getLicense(lic.id)?.royaltyLog ?? []).some((x) => x.note === 'PAYMENT-FROM-DEVICE-A'),
        ),
      'B shows the registry copy',
    );
  });

  it('F1 (two tabs, one browser): a revocation is not undone by the other tab’s royalty entry', async () => {
    const T1 = await browser('T1');
    await T1.run(() => ready(T1));
    const { record } = await plant(T1, 'A4 tabs plant');
    const lic = await T1.run(() => {
      T1.m.licenses.startLicenseSync();
      return T1.m.licenses.createLicense({
        type: 'license',
        recordId: record.id,
        recordFingerprint: record.recordFingerprint,
        agreementFingerprint: 'ef'.repeat(32),
        terms: TERMS,
      });
    });
    const hk = await T1.run(() => T1.m.holder.holderKeyIfAny()!);
    await until(async () => (await rows(hk, 'licenses')).some((r) => r.id === lic.id), 'saved');
    const tabA = await browser('tabA', {}, 'T1');
    await tabA.run(() => tabA.m.licenses.startLicenseSync());
    await until(() => tabA.run(() => tabA.m.licenses.getLicense(lic.id) !== undefined), 'tab A');
    const tabB = await browser('tabB', {}, 'T1');
    await tabB.run(() => tabB.m.licenses.startLicenseSync());
    await until(() => tabB.run(() => tabB.m.licenses.getLicense(lic.id) !== undefined), 'tab B');
    await tabA.run(() => tabA.m.licenses.revokeLicense(lic.id, 'REVOKED-IN-TAB-A'));
    await settle(500);
    await tabB.run(() => tabB.m.licenses.addRoyalty(lic.id, 10, 1, 'ROYALTY-IN-TAB-B'));
    await settle(500);
    const txt = await opened(T1, 'licenses', lic.id, (await rows(hk, 'licenses')).find((r) => r.id === lic.id)!);
    expect(txt).toContain('REVOKED-IN-TAB-A');
    expect(txt).not.toContain('ROYALTY-IN-TAB-B');
  });

  it('F2: a plain-text copy of a record this browser has seen sealed is shown as an older copy, never taken or locked again', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record, fields } = await plant(A, 'A4 rollback plant', 'v1 notes');
    const hk = await A.run(() => A.m.holder.holderKeyIfAny()!);
    // The holder pairs a DNA report afterwards: rev 2.
    await A.run(() => {
      A.m.records.startRecordSync();
      A.m.records.pairDna(record.id, 'ab'.repeat(32), 'report.pdf', { fileSha256: 'cd'.repeat(32) });
    });
    await until(async () => (await rows(hk, 'records')).find((r) => r.id === record.id)?.rev === 2, 'rev 2 stored');
    // The operator writes the old plain-text row back.
    const oldPlain = { ...fields, id: record.id, recordFingerprint: record.recordFingerprint, licenseIds: [] };
    overwriteRecord(hk, record.id, oldPlain);

    // The next page load on the same device.
    const A2 = await browser('A2', {}, 'A');
    await A2.run(() => A2.m.records.hydrate());
    expect(await A2.run(() => A2.m.api.olderRowsOf('veilcore.records.v1'))).toEqual([record.id]);
    expect(await A2.run(() => A2.m.api.rowStateOf('veilcore.records.v1', record.id))).toBe('older');
    expect(await A2.run(() => A2.m.records.getRecord(record.id))).toBeUndefined();
    // "Use this copy" is not offered for it, and nothing converts it.
    expect(await A2.run(() => A2.m.records.adoptOlderCopy(record.id))).toBe(false);
    await settle(500);
    const now = (await rows(hk, 'records')).find((r) => r.id === record.id)!;
    expect(now.sealed).toBeUndefined(); // never locked again over the newer copy
    expect(now.rev).toBeUndefined();

    // A browser restored from a backup made after the pairing does the same (the marks are in it).
    const file = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const C = await browser('C');
    await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(file));
      await C.m.records.hydrate();
    });
    expect(await C.run(() => C.m.api.olderRowsOf('veilcore.records.v1'))).toEqual([record.id]);
  });

  it('F4: a dropped obligation request leaves the license "Royalty protection pending", and the next sync registers it', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record } = await plant(A, 'A4 royalty plant');
    const terms = { ...TERMS, licensee: 'Grower LLC', offspringRoyaltyPct: '3' };
    const lic = await A.run(async () => {
      A.m.licenses.startLicenseSync();
      const sealedTerms = await A.m.licenses.sealAgreement('license', terms, record.recordFingerprint);
      const l = A.m.licenses.createLicense({
        type: 'license',
        recordId: record.id,
        recordFingerprint: record.recordFingerprint,
        terms,
        ...sealedTerms,
      });
      await A.m.licenses.issueLicense(l.id);
      return l;
    });
    failOnce.push(/^POST \/lineage\/obligations$/); // one dropped connection
    const out = await A.run(() => A.m.licenses.countersignLicense(lic.id));
    expect(out?.state).toBe('active');
    // It waited for the answer, and says so: not registered yet.
    expect(out?.obligationPending).toBe(true);
    expect(await A.run(() => A.m.licenses.royaltyProtectionPending(A.m.licenses.getLicense(lic.id)!))).toBe(true);
    const obligationPosts = () =>
      sent().filter((x) => x.method === 'POST' && new URL(x.url).pathname === '/lineage/obligations').length;
    expect(obligationPosts()).toBe(0); // the one sent was dropped
    await until(
      async () => (await rows(await A.run(() => A.m.holder.holderKeyIfAny()!), 'licenses')).length > 0,
      'saved',
    );
    await settle(500);

    // The next session syncs: sent again, confirmed, and the warning goes.
    const A2 = await browser('A2', {}, 'A');
    await A2.run(async () => {
      A2.m.licenses.startLicenseSync();
      await A2.m.records.hydrate();
    });
    await until(
      () =>
        A2.run(
          () => A2.m.licenses.getLicense(lic.id)?.obligationPending === undefined && !!A2.m.licenses.getLicense(lic.id),
        ),
      'registered on the next sync',
    );
    expect(obligationPosts()).toBeGreaterThanOrEqual(1);
    expect(await A2.run(() => A2.m.licenses.getLicense(lic.id)?.obligationRegisteredAt)).toBeTypeOf('number');
    if (REAL) {
      const v = (await (
        await realFetch(`${base}/lineage/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ record: record.recordFingerprint, chain: [] }),
        })
      ).json()) as Obj;
      expect(v.ok).toBe(false); // a buyer is no longer told the record is clean
    }
  });

  it('F5: the record secret is sealed in the record before a lab code is made, so a restore of the vault key opens its lab reports', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    // The backup the holder has: made before this plant existed.
    const file = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const { record } = await plant(A, 'A4 later plant', 'kept');
    // Before the lab code: the record's sealed copy holding its secret must be accepted.
    const saved = await A.run(() => A.m.records.recordSecretSaved(record.id));
    if ('error' in saved) throw new Error(saved.error);
    const locked = await A.run(async () => {
      const lock = await A.m.labResults.resultRecipientFor(saved.recordSecret, 'TR-0000A4A4');
      return A.m.labResults.lockReport(new TextEncoder().encode('lab report body'), lock);
    });
    // The secret is nowhere readable on the wire.
    expect(sent().some((s) => s.body.includes(saved.recordSecret))).toBe(false);

    // Storage wiped (or a new phone): the holder restores the backup they have.
    const B2 = await browser('B2');
    await B2.run(async () => {
      await B2.m.backup.restoreAny(fileOf(file));
      await B2.m.records.hydrate();
    });
    expect(await B2.run(() => B2.m.records.getRecord(record.id)?.notes)).toBe('kept');
    expect(await B2.run(() => B2.m.keys.keysFor(record.id)?.recordSecret)).toBe(saved.recordSecret);
    const body = await B2.run(async () =>
      new TextDecoder().decode(
        await B2.m.labResults.openReport(locked, B2.m.keys.keysFor(record.id)!.recordSecret, 'TR-0000A4A4'),
      ),
    );
    expect(body).toBe('lab report body');
  });

  it('F5: no lab code while the record’s sealed copy with its secret isn’t accepted', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record } = await plant(A, 'A4 refused plant');
    failOnce.push(/^PUT \/api\/records$/);
    const out = await A.run(() => A.m.records.recordSecretSaved(record.id));
    expect('error' in out).toBe(true);
    // Before the vault key is in a checked backup: refused, and the record waits in this browser.
    const N = await browser('N');
    await N.run(() => {
      N.m.holder.holderKey();
      N.m.vault.mintVault();
    });
    const { record: r2 } = await plant(N, 'A4 not backed up');
    expect(await N.run(() => N.m.records.recordSecretSaved(r2.id))).toEqual({
      error: (await import('../i18n/translate')).enT.t('app.sealed.backupFirstAction'),
    });
  });

  it('F7: the prove link keeps the on-chain identity, key salt, content hash and report hash out of the query string', async () => {
    const { verifyPath, linkParam, movedToFragment } = await import('./verify-link');
    const url = verifyPath('VEIL-AAAA', 'ab'.repeat(32), {
      chain: '11'.repeat(32),
      anchorTx: 'tx1',
      ks: '22'.repeat(32),
      cd: '33'.repeat(32),
      rs: 'cd'.repeat(32),
      show: 'existence',
    });
    const u = new URL(url, 'https://veilcore.org');
    expect(u.search).not.toMatch(/chain=|anchorTx=|ks=|cd=|rs=/);
    expect(u.search).toContain(`fp=${'ab'.repeat(32)}`);
    expect(u.search).toContain('show=existence');
    expect(linkParam('chain', u.search, u.hash)).toBe('11'.repeat(32));
    expect(linkParam('rs', u.search, u.hash)).toBe('cd'.repeat(32));
    // An old link still reads, and is moved into the fragment.
    const old = `?fp=${'ab'.repeat(32)}&chain=${'11'.repeat(32)}&ks=${'22'.repeat(32)}`;
    expect(linkParam('chain', old, '')).toBe('11'.repeat(32));
    const moved = movedToFragment(old, '');
    expect(moved?.search).toBe(`?fp=${'ab'.repeat(32)}`);
    expect(moved?.hash).toBe(`#chain=${'11'.repeat(32)}&ks=${'22'.repeat(32)}`);
    expect(movedToFragment(`?fp=${'ab'.repeat(32)}`, '#chain=x')).toBeNull();
  });

  it('F8: a lab with no offer key never sends its arrival details in plain text; it is told to ask for a new code', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record } = await plant(A, 'A4 custody plant');
    failOnce.push(/^POST \/transfers\/TR-[0-9A-F]+\/custody$/); // the sealed sample box doesn't arrive
    const res = await A.run(() => A.m.transfers.offerTransfer(record, 'Lab Person', {}));
    if ('error' in res) throw new Error(res.error);
    const code = await A.run(() => A.m.transfers.shareCodeFor(res.transferId, res.claimCode)); // cut short: no offer key
    const L = await browser('L');
    await L.run(async () => {
      ready(L);
      const claim = await L.m.transfers.claimTransfer(res.transferId, L.m.transfers.parseShareCode(code).claimCode);
      expect('error' in claim).toBe(false);
    });
    const before = sent().length;
    const out = await L.run(() =>
      L.m.transfers.setArrival(res.transferId, { sampleId: 'PLAIN-SAMPLE-ID-A4', condition: 'PLAIN-CONDITION-A4' }),
    );
    expect(out).toEqual({ error: await L.run(() => L.m.transfers.ASK_FOR_NEW_CODE) });
    const after = sent().slice(before);
    expect(after.some((x) => x.body.includes('PLAIN-CONDITION-A4') || x.body.includes('PLAIN-SAMPLE-ID-A4'))).toBe(
      false,
    );
    expect(after.some((x) => x.method === 'POST' && x.url.endsWith('/custody'))).toBe(false);
  });

  it('F9: "Date this lab report" names the record neutrally; nothing from the report is in the public name', async () => {
    const { labReportSealInput, labReportRecordName } = await import('../components/stage/lab-report-date');
    const A = await browser('A');
    const plantRec = { id: 'VEIL-1', strainName: 'Harbour Mist', bredBy: 'x', taxon: '' };
    const sha = '3f2a9c1b'.padEnd(64, 'e');
    for (const facts of [{ sha }, { sha, resultId: 'LR-7B6013A09C246DCE0C1FB41761B8213C' }]) {
      const clear = await A.run(() =>
        A.m.api.publicPart({ id: 'VEIL-2', ...labReportSealInput(plantRec, facts, '2026-10-17') }),
      );
      expect(clear.strainName).toBe('Harbour Mist — lab report');
      expect(JSON.stringify(clear)).not.toMatch(/3f2a9c1b|LR-7B60/i);
    }
    expect(labReportRecordName('Harbour Mist', ['Harbour Mist — lab report'])).toBe('Harbour Mist — lab report 2');
    expect(labReportSealInput(plantRec, { sha }, '2026-10-17', 'My cert').strainName).toBe('My cert');
  });

  it('F10: the opened registry export and the records export leave out each record’s secret keys', async () => {
    const A = await browser('A');
    await A.run(() => ready(A));
    const { record } = await plant(A, 'A4 export plant');
    const saved = await A.run(() => A.m.records.recordSecretSaved(record.id));
    if ('error' in saved) throw new Error(saved.error);
    if (REAL) {
      const out = await A.run(() => A.m.registryExport.fetchRegistryExport());
      if ('error' in out) throw new Error(out.error);
      const text = await out.blob.text();
      expect(text).toContain(record.id);
      expect(text).not.toContain(saved.recordSecret);
    }
    const { fileURLToPath } = await import('node:url');
    const src = (await import('node:fs')).readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'records.ts'),
      'utf8',
    );
    expect(src).toMatch(/const \{ secrets: _s, \.\.\.rest \} = r;/);
  });
});
