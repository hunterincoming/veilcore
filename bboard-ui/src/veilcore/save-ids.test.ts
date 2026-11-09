// Saving IDs in Add IDs (ask-job/save-ids.ts) against two devices on one registry: a check
// made on a stale view never puts one ID on two pups (verification X6), and a save goes ahead
// only when the registry answered the read (X6b): offline, or an error answer on the read, saves
// nothing; two devices saving in the same second are named by the read after saving.
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

/** The live corrections of a record on the registry. */
const liveCorrectionsOf = (id: string) =>
  [...reg.records.values()].filter(
    (r) =>
      (r as { supersedes?: { recordId?: string } }).supersedes?.recordId === id &&
      !(r as { supersededBy?: string }).supersededBy,
  );

describe('two devices can’t put one ID on two pups (X6)', () => {
  const animalPup = async (b: Browser, name: string) =>
    b.run(async () => {
      const { ANIMAL_PROFILE } = await import('./animal-profile');
      const fields: Record<string, unknown> = {
        nonce: b.m.commitment.newNonce(),
        strainName: name,
        bredBy: 'Kennel Nord',
        dateCreated: '2026-11-01',
        notes: '',
        loggedAt: Date.UTC(2026, 10, 1),
        refId: '',
        taxon: 'Canis familiaris',
        profile: ANIMAL_PROFILE,
        animal: { breed: 'Border Collie', idScheme: '', sex: 'female', herd: '' },
        parents: [{ name: 'Bella', role: 'dam', individualId: 'BELLA-1' }],
      };
      return {
        id: `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`,
        ...fields,
        recordFingerprint: await b.m.commitment.fingerprintRecord(fields as never),
        licenseIds: [],
      };
    });

  it('B, not yet synced, saves pup 4 = T4 after A put T4 on pup 6: nothing is sent, B is told', async () => {
    const A = await browser('devA');
    const p4 = await animalPup(A, 'Bella pup 4');
    const p6 = await animalPup(A, 'Bella pup 6');
    await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      A.m.vault.markVaultBackedUp();
      await A.m.records.createRecordSaved(p4 as never);
      await A.m.records.createRecordSaved(p6 as never);
      await A.m.backup.checkBackup(fileOf(JSON.stringify(A.m.backup.backupContents())));
    });
    // Device B: the same holder and keys (restored from the backup), its own storage.
    const B = await browser('devB', { map: new Map(A.storage) });
    await B.run(() => B.m.records.hydrate());
    const { saveIds, checkNow } = await import('../ask-job/save-ids');
    const litter = await B.run(() => ({ young: [p4.id, p6.id].map((id) => B.m.records.getRecord(id)!) }));
    const values = { [p4.id]: 'T4' };
    // What B's screen shows: pup 4 gets T4, no box flagged.
    const shown = await B.run(() => checkNow(litter, values, B.m.records.allRecords()));
    expect(shown.errors).toEqual({});
    expect(shown.pairs.map(([r, id]) => `${r.name}=${id}`)).toEqual(['Bella pup 4=T4']);

    // Meanwhile device A puts T4 on pup 6.
    await A.run(() =>
      A.m.records.issueCorrection(
        p6.id,
        { refId: 'T4', animal: { breed: 'Border Collie', herd: '', sex: 'female', idScheme: 'Microchip' } },
        'ID added',
      ),
    );
    expect(liveCorrectionsOf(p6.id)).toHaveLength(1);

    // B presses Save: the records are read afresh, T4 is now pup 6's, nothing is sent.
    const r = await B.run(() =>
      saveIds(litter, values, shown.pairs, 'Microchip', 'ID added', {
        refresh: B.m.records.refresh,
        allRecords: B.m.records.allRecords,
        issueCorrection: B.m.records.issueCorrection,
      }),
    );
    expect(r).toEqual({ changed: true, saved: 0 });
    expect(liveCorrectionsOf(p4.id)).toHaveLength(0);
    // And B's boxes, drawn again, say why.
    const again = await B.run(() => checkNow(litter, values, B.m.records.allRecords()));
    expect(again.errors[p4.id]).toEqual({ why: 'taken', id: 'T4', name: 'Bella pup 6' });
  });

  it('with nothing changed elsewhere, it saves; the same change again from another device is that correction', async () => {
    const A = await browser('devA2');
    const p1 = await animalPup(A, 'Bella pup 1');
    await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      A.m.vault.markVaultBackedUp();
      await A.m.records.createRecordSaved(p1 as never);
      await A.m.backup.checkBackup(fileOf(JSON.stringify(A.m.backup.backupContents())));
    });
    const B = await browser('devB2', { map: new Map(A.storage) });
    await B.run(() => B.m.records.hydrate());
    const { saveIds, checkNow } = await import('../ask-job/save-ids');
    const litterOn = (b: Browser) => b.run(() => ({ young: [b.m.records.getRecord(p1.id)!] }));
    const save = async (b: Browser) => {
      const litter = await litterOn(b);
      const values = { [p1.id]: 'W1' };
      const shown = await b.run(() => checkNow(litter, values, b.m.records.allRecords()));
      return b.run(() =>
        saveIds(litter, values, shown.pairs, 'Microchip', 'ID added', {
          refresh: b.m.records.refresh,
          allRecords: b.m.records.allRecords,
          issueCorrection: b.m.records.issueCorrection,
        }),
      );
    };
    expect(await save(A)).toEqual({ saved: 1 });
    // B makes the identical change: issueCorrection reads the registry first, so it is A's
    // correction, nothing new.
    const edits = { refId: 'W1', animal: { breed: 'Border Collie', herd: '', sex: 'female', idScheme: 'Microchip' } };
    await B.run(() => B.m.records.hydrate());
    const again = await B.run(() => B.m.records.issueCorrection(p1.id, edits as never, 'ID added'));
    expect(again?.refId).toBe('W1');
    expect(liveCorrectionsOf(p1.id)).toHaveLength(1);
  });
});

describe('saving IDs needs the registry’s answer (X6b)', () => {
  const twoDevices = async (tag: string) => {
    const A = await browser(`A-${tag}`);
    const mk = async (name: string) =>
      A.run(async () => {
        const { ANIMAL_PROFILE } = await import('./animal-profile');
        const fields: Record<string, unknown> = {
          nonce: A.m.commitment.newNonce(),
          strainName: name,
          bredBy: 'Kennel Nord',
          dateCreated: '2026-11-01',
          notes: '',
          loggedAt: Date.UTC(2026, 10, 1),
          refId: '',
          taxon: 'Canis familiaris',
          profile: ANIMAL_PROFILE,
          animal: { breed: 'Border Collie', idScheme: '', sex: 'female', herd: '' },
          parents: [{ name: 'Bella', role: 'dam', individualId: 'BELLA-1' }],
        };
        return {
          id: `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`,
          ...fields,
          recordFingerprint: await A.m.commitment.fingerprintRecord(fields as never),
          licenseIds: [],
        };
      });
    const p4 = await mk('Bella pup 4');
    const p6 = await mk('Bella pup 6');
    await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      A.m.vault.markVaultBackedUp();
      await A.m.records.createRecordSaved(p4 as never);
      await A.m.records.createRecordSaved(p6 as never);
      await A.m.backup.checkBackup(fileOf(JSON.stringify(A.m.backup.backupContents())));
    });
    const B = await browser(`B-${tag}`, { map: new Map(A.storage) });
    await B.run(() => B.m.records.hydrate());
    const animal = { breed: 'Border Collie', herd: '', sex: 'female', idScheme: 'Microchip' };
    const t4OnP6 = () => A.run(() => A.m.records.issueCorrection(p6.id, { refId: 'T4', animal } as never, 'ID added'));
    const { saveIds, checkNow } = await import('../ask-job/save-ids');
    const litter = await B.run(() => ({ young: [p4.id, p6.id].map((id) => B.m.records.getRecord(id)!) }));
    const values = { [p4.id]: 'T4' };
    const shown = await B.run(() => checkNow(litter, values, B.m.records.allRecords()));
    const api = {
      refresh: () => B.run(() => B.m.records.refresh()),
      allRecords: () => B.m.records.allRecords(),
      issueCorrection: (id: string, e: Partial<import('./records').StrainRecord>, r: string) =>
        B.run(() => B.m.records.issueCorrection(id, e, r)),
    };
    const save = () => B.run(() => saveIds(litter, values, shown.pairs, 'Microchip', 'ID added', api));
    return { p4, p6, t4OnP6, save, api, litter, values, shown, saveIds };
  };

  for (const [label, fail] of [
    [
      'offline',
      () =>
        (reg.misbehave.fault = (m: string, path: string) =>
          m === 'GET' && path === '/api/records' ? 'fail' : undefined),
    ],
    [
      'a 502 on the read',
      () =>
        (reg.misbehave.fault = (m: string, path: string) =>
          m === 'GET' && path === '/api/records' ? new Response('bad gateway', { status: 502 }) : undefined),
    ],
    ['a 429 on the read', () => (reg.misbehave.refuseGets = 1)],
  ] as const)
    it(`${label}: nothing is saved, and B is told; nothing is kept to send later`, async () => {
      const d = await twoDevices(label.replace(/\W/g, ''));
      await d.t4OnP6();
      fail();
      expect(await d.save()).toEqual({ offline: true, saved: 0 });
      reg.misbehave.fault = null;
      reg.misbehave.refuseGets = 0;
      expect(liveCorrectionsOf(d.p4.id)).toHaveLength(0);
      // Online again: the check finds T4 on pup 6, and nothing for pup 4 was ever queued.
      expect(await d.save()).toEqual({ changed: true, saved: 0 });
      expect(liveCorrectionsOf(d.p4.id)).toHaveLength(0);
    });

  it('two devices saving in the same second: the read after saving names both animals', async () => {
    const d = await twoDevices('race');
    // A's save lands between B's read and B's send.
    const racing = {
      ...d.api,
      issueCorrection: async (id: string, e: Partial<import('./records').StrainRecord>, r: string) => {
        await d.t4OnP6();
        return d.api.issueCorrection(id, e, r);
      },
    };
    const r = await d.saveIds(d.litter, d.values, d.shown.pairs, 'Microchip', 'ID added', racing);
    expect(r).toMatchObject({ saved: 1, clashes: [{ id: 'T4' }] });
    expect('clashes' in r && r.clashes?.[0].names.slice().sort()).toEqual(['Bella pup 4', 'Bella pup 6']);
  });

  it('saved, but the read afterwards fails: it says so (never closes quietly)', async () => {
    const d = await twoDevices('unchecked');
    let reads = 0;
    const flaky = {
      ...d.api,
      // The read before the correction answers; the one after it doesn't.
      refresh: async () => (++reads >= 2 ? false : d.api.refresh()),
    };
    const r = await d.saveIds(d.litter, d.values, d.shown.pairs, 'Microchip', 'ID added', flaky);
    expect(r).toEqual({ saved: 1, unchecked: true });
  });
});
