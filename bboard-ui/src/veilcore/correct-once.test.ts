// A record is corrected once: two tabs (or a phone and a laptop) each correcting the same record
// must not leave two live corrections of it. issueCorrection refuses a record that has a
// correction already, unless the change is the very one that correction made (a retry whose
// first answer was lost): then it is that correction, and nothing new is sent. A tab that hasn't
// seen the other's correction yet learns of it from the registry (hydrate), as the record page's
// form does right before it saves (CorrectRecord.tsx).
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, type Browser } from './fixtures/browsers';
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

const pup = async (b: Browser) =>
  b.run(async () => {
    const fields: Record<string, unknown> = {
      nonce: b.m.commitment.newNonce(),
      strainName: 'Bella pup 4',
      bredBy: 'Kennel Nord',
      dateCreated: '2026-11-01',
      notes: '',
      loggedAt: Date.UTC(2026, 10, 1),
      refId: '',
    };
    return {
      id: `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`,
      ...fields,
      recordFingerprint: await b.m.commitment.fingerprintRecord(fields as never),
      licenseIds: [],
    };
  });

/** The live corrections of a record on the registry. */
const liveCorrectionsOf = (id: string) =>
  [...reg.records.values()].filter(
    (r) =>
      (r as { supersedes?: { recordId?: string } }).supersedes?.recordId === id &&
      !(r as { supersededBy?: string }).supersededBy,
  );

/** Writes to the registry's records since `from`. */
const recordWritesSince = (from: number) =>
  reg.sent.slice(from).filter((s) => s.method !== 'GET' && s.url.includes('/api/records'));

/** Browser A with one record saved on the registry and its vault key in a checked backup. */
const saved = async () => {
  const A = await browser('A');
  const rec = await pup(A);
  let backup = '';
  await A.run(async () => {
    A.m.holder.holderKey();
    A.m.vault.mintVault();
    A.m.vault.markVaultBackedUp();
    await A.m.records.createRecordSaved(rec as never);
    backup = JSON.stringify(A.m.backup.backupContents());
    await A.m.backup.checkBackup(fileOf(backup));
  });
  return { A, rec, backup };
};

describe('a record is corrected once', () => {
  it('tab B, after tab A added T4: another ID is refused with a clear message; T4 again is A’s correction, nothing sent', async () => {
    const { A, rec } = await saved();
    const B = await browser('B', {}, 'A');
    await B.run(() => B.m.records.hydrate());

    const t4 = await A.run(() => A.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(t4?.refId).toBe('T4');
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);

    // B catches up (on focus, its 30-second sync, or the form's check before saving), then
    // saves pup 4 = X4: refused.
    await B.run(() => B.m.records.hydrate());
    const before = reg.sent.length;
    await B.run(async () => {
      await expect(B.m.records.issueCorrection(rec.id, { refId: 'X4' }, 'ID added')).rejects.toThrow(
        B.m.records.ALREADY_CORRECTED(),
      );
    });
    expect(B.m.records.ALREADY_CORRECTED()).toMatch(/corrected already, in another tab or on another device/);
    // The same change again (a retry whose answer was lost): A's correction, nothing new sent.
    const again = await B.run(() => B.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(again?.id).toBe(t4?.id);
    expect(again?.refId).toBe('T4');
    expect(recordWritesSince(before)).toEqual([]);
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
    expect(await B.run(() => B.m.records.getRecord(rec.id)?.supersededBy)).toBe(t4?.id);
    // The way on is the latest version: the correction, the one to correct.
    expect(await B.run(() => B.m.records.latestVersionOf(rec.id))).toBe(t4?.id);
  });

  it('a stale tab (opened before the correction, not synced since) is refused once it checks the registry', async () => {
    const { A, rec } = await saved();
    const B = await browser('B', {}, 'A');
    await B.run(() => B.m.records.hydrate());
    expect(await B.run(() => B.m.records.getRecord(rec.id)?.supersededBy)).toBeUndefined();

    await A.run(() => A.m.records.issueCorrection(rec.id, { strainName: 'Bella pup 4a' }, 'name'));
    // Still stale: B's copy says nothing of A's correction yet.
    expect(await B.run(() => B.m.records.getRecord(rec.id)?.supersededBy)).toBeUndefined();

    // The record page re-checks right before saving, and then refuses.
    await B.run(() => B.m.records.hydrate({ resave: false }));
    await B.run(async () => {
      await expect(B.m.records.issueCorrection(rec.id, { strainName: 'Bella pup 4b' }, 'name')).rejects.toThrow(
        B.m.records.ALREADY_CORRECTED(),
      );
    });
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
  });

  it('another device (its own storage, the backup restored) is refused too', async () => {
    const { A, rec, backup } = await saved();
    const phone = await browser('phone');
    await phone.run(async () => {
      await phone.m.backup.restoreAny(fileOf(backup));
      await phone.m.records.hydrate();
    });
    expect(await phone.run(() => phone.m.records.getRecord(rec.id)?.id)).toBe(rec.id);

    await A.run(() => A.m.records.issueCorrection(rec.id, { notes: 'from the laptop' }, 'notes'));
    await phone.run(() => phone.m.records.hydrate({ resave: false }));
    await phone.run(async () => {
      await expect(phone.m.records.issueCorrection(rec.id, { notes: 'from the phone' }, 'notes')).rejects.toThrow(
        phone.m.records.ALREADY_CORRECTED(),
      );
    });
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
  });

  it('a correction can itself be corrected (once): the chain is followed to the latest version', async () => {
    const { A, rec } = await saved();
    const first = await A.run(() => A.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    const second = await A.run(() => A.m.records.issueCorrection(first!.id, { refId: 'T5' }, 'ID fixed'));
    expect(second?.refId).toBe('T5');
    expect(await A.run(() => A.m.records.latestVersionOf(rec.id))).toBe(second?.id);
    expect(liveCorrectionsOf(first!.id)).toHaveLength(1);
    await A.run(async () => {
      await expect(A.m.records.issueCorrection(rec.id, { refId: 'T6' }, 'again')).rejects.toThrow(
        A.m.records.ALREADY_CORRECTED(),
      );
    });
  });
});
