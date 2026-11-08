// A record is corrected once (verification X2): two tabs (or a phone and a laptop) each adding an
// ID to the same pup must not leave two live corrections, or one ID on two pups. issueCorrection
// refuses a record that has a correction already, unless the change is the very one that
// correction made (a retry whose first answer was lost): then it is that correction, nothing new.
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

describe('a record is corrected once', () => {
  it('tab B, after tab A added T4: another ID is refused with a clear message; T4 again is A’s correction', async () => {
    const A = await browser('A');
    const rec = await pup(A);
    await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      A.m.vault.markVaultBackedUp();
      await A.m.records.createRecordSaved(rec as never);
      await A.m.backup.checkBackup(fileOf(JSON.stringify(A.m.backup.backupContents())));
    });
    const B = await browser('B', {}, 'A');
    await B.run(() => B.m.records.hydrate());

    const t4 = await A.run(() => A.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(t4?.refId).toBe('T4');
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);

    // B catches up (on focus, or its 30-second sync), then saves pup 4 = X4: refused.
    await B.run(() => B.m.records.hydrate());
    await B.run(async () => {
      await expect(B.m.records.issueCorrection(rec.id, { refId: 'X4' }, 'ID added')).rejects.toThrow(
        B.m.records.ALREADY_CORRECTED(),
      );
    });
    expect(B.m.records.ALREADY_CORRECTED()).toMatch(/corrected already/);
    // The same change again (a retry whose answer was lost): A's correction, nothing new sent.
    const again = await B.run(() => B.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(again?.id).toBe(t4?.id);
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
    expect(await B.run(() => B.m.records.getRecord(rec.id)?.supersededBy)).toBe(t4?.id);
    expect(again?.refId).toBe('T4');
  });
});
