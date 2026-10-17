// Dating first (CONTRACT.md #38): a record's proof code goes to VeilCore the moment the record
// is sealed, so it is in the next batch whether or not the backup has been checked. Round 3's
// L1 stays as it was: nothing is sealed and sent under a vault key until that key is in a
// checked backup, and the dating row carries no vault key id, so it can't lock anyone out.
//
// Against the in-memory registry with the real one's rules (fixtures/fake-registry.ts), and
// browsers with their own modules and storage (fixtures/browsers.ts).
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, stores, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';

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

const RECORDS = 'veilcore.records.v1';
const MARKERS = ['Secret Kush', 'Hunter Roberts', 'notes nobody may read'];

/** A plant as the log flow seals it (seal-record.ts), with something typed in every field. */
const seal = (b: Browser) =>
  b.run(async () => {
    const { sealRecord } = await import('./seal-record');
    return sealRecord({
      strainName: MARKERS[0],
      bredBy: MARKERS[1],
      dateCreated: '2026-10-17',
      notes: MARKERS[2],
      parents: [],
      photoFingerprints: [],
    } as never);
  });

/** Wait until `check` is true (the save runs in the background after createRecord). */
const until = async (check: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('still not true');
    await settle(20);
  }
};

const datingPuts = () => reg.sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records/dating'));
const sealedPuts = () => reg.sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records'));

/** Save a backup in this browser and check it, as the backup page does. */
const backUp = async (b: Browser) =>
  b.run(async () => b.m.backup.checkBackup(fileOf(JSON.stringify(b.m.backup.backupContents()))));

describe('dating first (CONTRACT.md #38)', () => {
  it('a new holder who has not backed up: the proof code alone goes to VeilCore at once, the locked copy waits', async () => {
    const A = await browser('a');
    const sealed = await seal(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await until(() => datingPuts().length > 0);
      return r;
    });
    // The locked copy is held (L1): nothing sealed reached VeilCore.
    expect(sealedPuts().filter((p) => p.body.includes('"sealed"'))).toEqual([]);
    expect(await A.run(() => A.m.records.unsavedReason(record.id))).toBe('backup');
    // The dating row: exactly { id, recordFingerprint, keyBinding? }, nothing typed, no vault key id.
    expect(datingPuts().length).toBeGreaterThanOrEqual(1);
    const rows = JSON.parse(datingPuts()[0].body) as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['id', 'recordFingerprint', ...(record.keyBinding ? ['keyBinding'] : [])].sort(),
    );
    expect(rows[0].recordFingerprint).toBe(record.recordFingerprint);
    for (const m of MARKERS) expect(datingPuts()[0].body).not.toContain(m);
    expect(datingPuts()[0].body).not.toMatch(/kid|sealed|strainName|bredBy/);
    const kid = await A.run(() => A.m.vault.vaultKid());
    if (kid) expect(datingPuts()[0].body).not.toContain(kid);
    // VeilCore holds the proof code, so the record is in the next batch.
    const H = await A.run(() => A.m.holder.holderKeyIfAny());
    expect(reg.rowsOf(H as string)).toEqual([
      expect.objectContaining({ id: record.id, recordFingerprint: record.recordFingerprint, bodyPending: true }),
    ]);
    expect(await A.run(() => A.m.records.proofCodeSent(record.id))).toBe(true);

    // Once the backup is checked, the locked copy follows, under the same proof code.
    expect((await backUp(A)).ok).toBe(true);
    await settle(250);
    const row = reg.rowsOf(H as string).find((r) => r.id === record.id);
    expect(row?.sealed).toBeTruthy();
    expect(row?.bodyPending).toBeUndefined();
    expect(row?.recordFingerprint).toBe(record.recordFingerprint);
    expect(await A.run(() => A.m.records.unsavedReason(record.id))).toBeUndefined();
  });

  it('after a reload, the record is still shown, still dated, and its proof code is not sent again', async () => {
    const A = await browser('a2');
    const sealed = await seal(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await settle(150);
      return r;
    });
    const before = datingPuts().length;
    const B = await browser('a2-reload', {}, 'a2');
    await B.run(async () => {
      await B.m.records.hydrate();
      await settle(150);
      expect(B.m.api.rowStateOf(RECORDS, record.id)).toBe('dating');
      expect(B.m.records.getRecord(record.id)?.strainName).toBe(MARKERS[0]);
      expect(B.m.records.lockedRecords()).toEqual([]);
      expect(B.m.records.proofCodeSent(record.id)).toBe(true);
    });
    expect(datingPuts().length).toBe(before);
  });

  it('no lockout: a browser whose key never reached a backup leaves nothing that refuses the next key', async () => {
    const P = await browser('private');
    const sealed = await seal(P);
    const H = await P.run(async () => {
      P.m.records.createRecord(sealed);
      await settle(150);
      return P.m.holder.holderKeyIfAny() as string;
    });
    expect(reg.rowsOf(H)[0]?.bodyPending).toBe(true);
    stores.delete('private'); // the window closes: its vault key and kept copy are gone
    const L = await browser('laptop');
    const next = await seal(L);
    const made = await L.run(async () => {
      L.m.holder.setHolderKey(H);
      await L.m.records.hydrate();
      await settle(100);
      // The dating row is no sealed row: nothing is locked.
      expect(L.m.records.lockedRecords()).toEqual([]);
      // A new record makes this browser's key (the registry has no box under another one).
      const out = await L.m.records.createRecordSaved(next);
      expect(out.result.refused).toEqual([]);
      expect(L.m.vault.vaultKeyIfAny()).toBeTruthy();
      return out.record;
    });
    expect((await backUp(L)).ok).toBe(true);
    await until(() => !!reg.rowsOf(H).find((r) => r.id === made.id)?.sealed);
    const kid = await L.run(() => L.m.vault.vaultKid());
    expect((reg.rowsOf(H).find((r) => r.id === made.id)?.sealed as { kid: string }).kid).toBe(kid);
  });

  it('letting a kept record go takes its dating row off VeilCore too', async () => {
    const A = await browser('a3');
    const sealed = await seal(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await settle(150);
      return r;
    });
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    await A.run(async () => {
      await A.m.records.hydrate();
      await A.m.records.discardUnsaved(record.id);
    });
    expect(reg.rowsOf(H).some((r) => r.id === record.id)).toBe(false);
  });

  it('the registry refuses a locked copy that carries another proof code than the one dated', async () => {
    const A = await browser('a4');
    const sealed = await seal(A);
    const record = await A.run(async () => {
      const r = A.m.records.createRecord(sealed);
      await settle(150);
      return r;
    });
    const H = (await A.run(() => A.m.holder.holderKeyIfAny())) as string;
    const res = await reg.fetch('https://registry.test/api/records', {
      method: 'PUT',
      headers: { 'x-holder-key': H, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          id: record.id,
          recordFingerprint: randomBytes(32).toString('hex'),
          sealed: { v: 1, alg: 'A256GCM', kid: '0123456789abcdef', iv: 'a'.repeat(16), ct: 'b'.repeat(40) },
        },
      ]),
    });
    const body = (await res.json()) as { rejected: { reason: string }[] };
    expect(body.rejected[0].reason).toMatch(/dated with a different proof code/);
  });
});
