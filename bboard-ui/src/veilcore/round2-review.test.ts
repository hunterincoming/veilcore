// Round 2 of sealed records (CONTRACT.md #15-#26): one regression test per finding of the two
// attack reviews (sealed/report-Attack-review-can-anyone-read-private-data.md, P1-P8, and
// report-Attack-review-data-loss-and-breakage.md, L1-L8), ported from their proofs of
// concept (review-privacy/vt/grant-exfil.test.ts and poc.mjs; review-loss/a-d.loss.test.ts
// and h.ts). Each one failed on the code before round 2.
//
// They run against an in-memory registry with the real one's rules (fixtures/fake-registry.ts)
// and several browsers at once (fixtures/browsers.ts), each its own modules and storage.
// SPDX-License-Identifier: Apache-2.0

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry, type Row } from './fixtures/fake-registry';
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

const newHolder = () => randomBytes(32).toString('hex');

/** A plant record's fields, fingerprinted as the app does. */
const plant = async (b: Browser, over: Record<string, unknown> = {}) =>
  b.run(async () => {
    const fields: Record<string, unknown> = {
      nonce: b.m.commitment.newNonce(),
      strainName: `Plant ${randomBytes(3).toString('hex')}`,
      bredBy: 'Hunter',
      dateCreated: '2026-01-01',
      notes: 'private notes',
      loggedAt: Date.UTC(2026, 8, 1),
      parents: [],
      breedingMethod: 'cross',
      refId: '',
      ...over,
    };
    return {
      id: `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`,
      ...fields,
      recordFingerprint: await b.m.commitment.fingerprintRecord(fields as never),
      licenseIds: [],
    };
  });

/** Open a sealed box the way the registry can't: with the vault key. */
const openBox = (vaultKey: string, kind: string, id: string, box: { kid: string; iv: string; ct: string }) => {
  const ct = Buffer.from(box.ct, 'base64url');
  const d = createDecipheriv('aes-256-gcm', Buffer.from(vaultKey, 'base64url'), Buffer.from(box.iv, 'base64url'));
  d.setAAD(Buffer.from(`veilcore:sealed:v1\0${kind}\0${id}\0${box.kid}`));
  d.setAuthTag(ct.subarray(ct.length - 16));
  return Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString('utf8');
};

/** Save a backup in this browser and check it, as the backup page does. */
const backUp = async (b: Browser) =>
  b.run(async () => b.m.backup.checkBackup(fileOf(JSON.stringify(b.m.backup.backupContents()))));

const sealedRows = (holder: string) => reg.rowsOf(holder).filter((r) => r.sealed);

// =========================================================================== privacy (P)

describe('P1 (critical): what is published comes only from the grant kept in the sealed record', () => {
  it('a grant list the registry made up uploads nothing (review-privacy/vt/grant-exfil.test.ts)', async () => {
    const A = await browser('A');
    const n = await A.run(async () => {
      A.m.holder.holderKey();
      // The holder never made a grant. The registry invents one with every value key.
      reg.misbehave.inventedGrants.push({
        holder: A.m.holder.holderKeyIfAny()!,
        recordId: 'VEIL-1',
        show: ['parent-names', 'breeding-method', 'sealed-at', 'attestation-status'],
      });
      const rec = {
        id: 'VEIL-1',
        strainName: 'x',
        recordFingerprint: 'a'.repeat(64),
        nonce: 'n',
        bredBy: 'b',
        dateCreated: '',
        notes: '',
        loggedAt: 1700000000000,
        parents: [{ name: 'Secret Mother', recordId: 'VEIL-P' }, { name: 'Secret Father' }],
        breedingMethod: 'secret backcross F3 to Secret Mother',
        dnaFingerprint: 'd'.repeat(64),
        dnaFileSha256: 'e'.repeat(64),
      };
      return A.m.disclosure.syncGrants((id) => (id === 'VEIL-1' ? rec : undefined));
    });
    expect(n).toBe(0);
    expect(reg.sent.filter((r) => r.method === 'PUT')).toEqual([]);
    for (const r of reg.sent) expect(r.body).not.toMatch(/Secret|secret|1700000000000|d{64}|e{64}/);
  });

  it('a listed grant that differs from the sealed choice is sent again as the sealed choice, never widened', async () => {
    const A = await browser('A');
    const rec = await plant(A, { parents: [{ name: 'Secret Mother' }], breedingMethod: 'secret method' });
    await A.run(async () => {
      A.m.holder.holderKey();
      expect((await A.m.records.createRecordSaved(rec as never)).result.ok).toBe(true);
      const out = await A.m.disclosure.saveGrant(
        A.m.records.getRecord(rec.id)!,
        A.m.disclosure.disclosureFrom(['existence']),
      );
      expect('error' in out).toBe(false);
    });
    // The choice is in the sealed copy: a reload in this browser opens it from the registry.
    const A2 = await browser('A2', {}, 'A');
    await A2.run(() => A2.m.records.hydrate());
    expect(await A2.run(() => A2.m.records.getRecord(rec.id)?.grant)).toEqual(['existence']);
    // The registry now says the grant shows parent names and breeding method.
    reg.grants.set(rec.id, { ...reg.grants.get(rec.id)!, show: ['existence', 'parent-names', 'breeding-method'] });
    reg.sent.length = 0;
    expect(await A2.run(() => A2.m.disclosure.syncGrants(A2.m.records.getRecord))).toBe(1);
    const put = reg.sent.find((r) => r.method === 'PUT' && r.url.endsWith('/disclosure'))!;
    expect(JSON.parse(put.body)).toEqual({ show: ['existence'], forFingerprint: rec.recordFingerprint, values: {} });
    for (const r of reg.sent) expect(r.body).not.toMatch(/Secret|secret/);
  });

  it('L6: after conversion every grant is sent once, value-less keys included, and kept in the sealed copy', async () => {
    const H = newHolder();
    const A = await browser('A');
    const rec = await plant(A);
    reg.putLegacy(H, rec);
    reg.putGrant(H, rec.id, ['existence', 'descent-clean']);
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
    });
    await settle();
    expect(reg.grants.get(rec.id)?.values).toBeNull(); // not before the backup is checked
    expect((await backUp(A)).ok).toBe(true);
    await settle(150);
    expect(reg.grants.get(rec.id)).toMatchObject({
      show: ['existence', 'descent-clean'],
      forFingerprint: rec.recordFingerprint,
      values: {},
    });
    expect(await A.run(() => A.m.records.getRecord(rec.id)?.grant)).toEqual(['existence', 'descent-clean']);
  });
});

describe('P2: who a delivery is for goes as a tag; the name stays in the sender’s sealed record', () => {
  it('toHandle is the HMAC of the name under the vault key; the name is in no request and still shows after a restore', async () => {
    const A = await browser('A');
    const rec = await plant(A);
    const NAME = '  Dr.Jane@Secret-Lab.example ';
    const offer = await A.run(async () => {
      A.m.holder.holderKey();
      await A.m.records.createRecordSaved(rec as never);
      return A.m.transfers.offerTransfer(A.m.records.getRecord(rec.id)!, NAME, { quantity: '1 cutting' });
    });
    if ('error' in offer) throw new Error(offer.error);
    await settle();
    const vaultKey = await A.run(() => A.m.vault.vaultKeyIfAny()!);
    const tag = createHmac('sha256', Buffer.from(vaultKey, 'base64url'))
      .update(`veilcore:handle:v1\0${NAME.normalize('NFC').trim().toLowerCase()}`)
      .digest('hex');
    const post = reg.sent.find((r) => r.method === 'POST' && r.url.endsWith('/transfers'))!;
    expect((JSON.parse(post.body) as { toHandle: string }).toHandle).toBe(tag);
    for (const r of reg.sent) expect(r.body.toLowerCase()).not.toContain('secret-lab');
    // Shown from the sealed record; a `label` in the registry's answer is not taken.
    reg.misbehave.sentExtra = { label: 'what the registry says' };
    const sent = await A.run(() => A.m.transfers.sentByMe());
    expect(sent.map((t) => A.m.transfers.recipientName(t))).toEqual(['Dr.Jane@Secret-Lab.example']);
    // A new device restored from the backup shows it too: it is in the sealed record.
    const backup = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const C = await browser('C');
    const shown = await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(backup));
      await C.m.records.hydrate();
      return (await C.m.transfers.sentByMe()).map((t) => C.m.transfers.recipientName(t));
    });
    expect(shown).toEqual(['Dr.Jane@Secret-Lab.example']);
    // A tag is never shown as a name; the public pending list is gone from the app.
    expect(A.m.transfers.recipientName({ to_handle: tag })).toBe('the lab');
    expect('pendingFor' in A.m.transfers).toBe(false);
  });
});

describe('P3: attestation is the registry’s; the browser never sends it', () => {
  it('a holder-typed attestation.lab on a stored row is never sent back (poc.mjs part 4)', async () => {
    const A = await browser('A');
    const rec = await plant(A);
    await A.run(async () => {
      A.m.holder.holderKey();
      await A.m.records.createRecordSaved(rec as never);
    });
    reg.records.get(rec.id)!.attestation = { lab: 'SECRET-LAB-NAME-HOLDER-TYPED', attestedAt: 5 };
    reg.sent.length = 0;
    await A.run(async () => {
      await A.m.records.hydrate();
      expect(A.m.records.getRecord(rec.id)?.attestation?.lab).toBe('SECRET-LAB-NAME-HOLDER-TYPED');
      await A.m.records.createRecordSaved((await plant(A)) as never);
    });
    const puts = reg.sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records'));
    expect(puts.length).toBeGreaterThan(0);
    for (const p of puts) {
      for (const row of JSON.parse(p.body) as Row[]) expect(Object.keys(row)).not.toContain('attestation');
      expect(p.body).not.toContain('SECRET-LAB');
    }
  });
});

describe('P5: a code with an offer key needs the sealed offer', () => {
  it('a claim answered with offerPlain instead is refused: the record stays a stub, the code is kept', async () => {
    const S = await browser('S');
    const rec = await plant(S);
    const code = await S.run(async () => {
      S.m.holder.holderKey();
      await S.m.records.createRecordSaved(rec as never);
      const o = await S.m.transfers.offerTransfer(S.m.records.getRecord(rec.id)!, 'lab');
      if ('error' in o) throw new Error(o.error);
      return S.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey);
    });
    reg.misbehave.offerPlainInstead = { bredBy: 'WHAT-THE-REGISTRY-SAYS', dateCreated: '1999-01-01' };
    const L = await browser('L');
    const out = await L.run(async () => {
      L.m.holder.holderKey();
      const p = L.m.transfers.parseShareCode(code);
      L.m.transfers.keepReceivingCode(code);
      const claim = await L.m.transfers.claimTransfer(p.transferId, p.claimCode);
      if ('error' in claim) throw new Error(claim.error);
      expect(await L.m.transfers.openClaimOffer(claim, p.offerKey, undefined)).toBe('missing');
      await L.m.records.hydrate();
      const fin = await L.m.receive.finishReceiving(claim.recordId, code, claim);
      return {
        fin,
        state: L.m.api.rowStateOf('veilcore.records.v1', claim.recordId),
        bredBy: L.m.records.getRecord(claim.recordId)?.bredBy,
        kept: L.m.transfers.receivingCodeFor(p.transferId),
      };
    });
    expect('error' in out.fin).toBe(true);
    expect(out.state).toBe('stub');
    expect(out.bredBy).not.toBe('WHAT-THE-REGISTRY-SAYS');
    expect(out.kept).toBe(code);
  });
});

describe('P6: the descent check sends only the record’s own fingerprint', () => {
  it('the parents’ fingerprints, which the record keeps sealed, are never sent', async () => {
    const A = await browser('A');
    const child = 'c1'.repeat(32);
    const grandparent = 'a7'.repeat(32);
    const declaredParent = 'b9'.repeat(32); // in the sealed record only
    reg.graph.set(child, [grandparent]);
    const verdict = await A.run(() => A.m.lineage.verifyDescentPublic(child));
    expect(verdict.ok).toBe(true);
    expect(verdict.ancestors).toEqual([grandparent]);
    const verify = reg.sent.find((r) => r.url.endsWith('/lineage/verify'))!;
    expect(JSON.parse(verify.body)).toEqual({ record: child, chain: [grandparent] });
    for (const r of reg.sent) expect(`${r.url}${r.body}`).not.toContain(declaredParent);
  });
});

describe('P8: padding and the rev high-water mark', () => {
  it('notes of 10 and 500 characters seal to the same length; past the bucket, the next one', async () => {
    const A = await browser('A');
    await A.run(() => A.m.holder.holderKey());
    const short = await plant(A, { notes: 'x'.repeat(10) });
    const long = await plant(A, { notes: 'x'.repeat(500) });
    const longer = await plant(A, { notes: 'x'.repeat(1500) });
    await A.run(async () => {
      await A.m.records.createRecords([short, long, longer] as never);
    });
    const ct = (id: string) => (reg.records.get(id)!.sealed as { ct: string }).ct.length;
    expect(ct(short.id)).toBe(ct(long.id));
    expect(ct(longer.id)).toBeGreaterThan(ct(long.id));
    const key = await A.run(() => A.m.vault.vaultKeyIfAny()!);
    const plain = openBox(key, 'records', short.id, reg.records.get(short.id)!.sealed as never);
    expect(Buffer.byteLength(plain) % 1024).toBe(0);
    expect(JSON.parse(plain)).toMatchObject({ notes: 'x'.repeat(10), rev: 1 });
    expect(A.m.vault.paddedSize(16 * 1024 + 1)).toBe(24 * 1024);
    expect(A.m.vault.paddedSize(1)).toBe(1024);
  });

  it('an older copy from the registry never replaces the newer one: kept and sent again here, locked in a new tab', async () => {
    const A = await browser('A');
    const rec = await plant(A);
    await A.run(async () => {
      A.m.holder.holderKey();
      await A.m.records.createRecordSaved(rec as never);
    });
    const older = structuredClone(reg.records.get(rec.id)!);
    await A.run(() => A.m.records.pairDna(rec.id, 'd'.repeat(64), 'report.pdf'));
    await settle();
    const key = await A.run(() => A.m.vault.vaultKeyIfAny()!);
    const revOf = () =>
      (JSON.parse(openBox(key, 'records', rec.id, reg.records.get(rec.id)!.sealed as never)) as { rev: number }).rev;
    expect(revOf()).toBe(2);
    // The registry rolls the row back.
    reg.records.set(rec.id, older);
    await A.run(() => A.m.records.hydrate());
    await settle();
    expect(await A.run(() => A.m.records.getRecord(rec.id)?.dnaFingerprint)).toBe('d'.repeat(64));
    expect(await A.run(() => A.m.api.loadNoticeOf('veilcore.records.v1').olderKept)).toBe(1);
    expect(revOf()).toBe(2); // the newer copy went back
    // Rolled back again; a new tab has no newer copy to keep: shown as an older copy, never sent.
    reg.records.set(rec.id, older);
    const T = await browser('T', {}, 'A');
    reg.sent.length = 0;
    await T.run(async () => {
      await T.m.records.hydrate();
      expect(T.m.records.getRecord(rec.id)).toBeUndefined();
      expect(T.m.records.lockedRecords()).toEqual([expect.objectContaining({ id: rec.id, older: true })]);
      await T.m.records.createRecordSaved((await plant(T)) as never);
    });
    for (const p of reg.sent.filter((r) => r.method === 'PUT')) expect(p.body).not.toContain(rec.id);
    expect(reg.records.get(rec.id)).toEqual(older);
  });
});

// ======================================================================= data loss (L)

describe('L1: older records are locked only after a checked backup of the key', () => {
  it('a v2 backup made before still opens everything on a new device after the first load (a.loss 1)', async () => {
    const H = newHolder();
    const A = await browser('A1');
    const recs = [await plant(A), await plant(A)];
    for (const r of recs) reg.putLegacy(H, r);
    const v2 = JSON.stringify({ format: 'veilcore-backup', version: 2, holderKey: H, records: [] });
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
    });
    await settle();
    expect(sealedRows(H)).toEqual([]);
    expect(await A.run(() => A.m.vault.vaultNeedsBackup())).toBe(true);
    const C = await browser('C1');
    const r = await C.run(async () => {
      await C.m.backup.restoreAny(fileOf(v2));
      await C.m.records.hydrate();
      return { open: C.m.records.allRecords().length, locked: C.m.records.lockedRecords().length };
    });
    expect(r).toEqual({ open: 2, locked: 0 });
  });

  it('a private window makes no key and converts nothing, and says why (a.loss 1b)', async () => {
    const H = newHolder();
    const A = await browser('P0');
    reg.putLegacy(H, await plant(A));
    const P = await browser('P1');
    await P.run(() => P.m.holder.setHolderKey(H));
    stores.get('P1')!.throwOnSet = true;
    await P.run(() => P.m.records.hydrate());
    await settle();
    expect(sealedRows(H)).toEqual([]);
    expect(stores.get('P1')!.map.has('veilcore.vault.v1')).toBe(false);
    expect(await P.run(() => P.m.vault.vaultKeyIfAny())).toBeNull();
    expect(await P.run(() => P.m.records.lockedRecords())).toEqual([]);
    // The page says why (records.ts sealedView.vaultProblem; AppHome shows app.sealed.cantStore).
    expect(await P.run(() => P.m.records.sealedViewNow().vaultProblem)).toBe('cant-store');
    // A new record can't be saved with a key that would die with the window either.
    const out = await P.run(async () => P.m.records.createRecordSaved((await plant(P)) as never));
    expect(out.result.refused).toEqual([expect.objectContaining({ words: 'app.sealed.refuse.cantStore' })]);
  });
});

describe('L2: two tabs opening at once end with one key, the one the registry has', () => {
  it('tabs whose storage catches up late (a.loss 2/4 last case)', async () => {
    const H = newHolder();
    const X = await browser('X4');
    reg.putLegacy(H, await plant(X));
    reg.putLegacy(H, await plant(X));
    const T1 = await browser('T1', { lagPeers: ['T2'] });
    const T2 = await browser('T2', { lagPeers: ['T1'] });
    stores.get('T1')!.map.set('veilcore.holder.v1', H);
    stores.get('T2')!.map.set('veilcore.holder.v1', H);
    await Promise.all([T1.run(() => T1.m.records.hydrate()), T2.run(() => T2.m.records.hydrate())]);
    await settle();
    expect(sealedRows(H)).toEqual([]); // nothing is sealed before a checked backup
    expect((await backUp(T1)).ok).toBe(true);
    await settle(200);
    const kids = new Set(sealedRows(H).map((r) => (r.sealed as { kid: string }).kid));
    expect(sealedRows(H)).toHaveLength(2);
    expect(kids.size).toBe(1);
    const k1 = await T1.run(() => T1.m.vault.vaultKid());
    const k2 = await T2.run(() => T2.m.vault.vaultKid());
    expect([k1, k2]).toEqual([[...kids][0], [...kids][0]]);
    const reloaded = await browser('T2b', {}, 'T2');
    const opened = await reloaded.run(async () => {
      await reloaded.m.records.hydrate();
      return { open: reloaded.m.records.allRecords().length, locked: reloaded.m.records.lockedRecords().length };
    });
    expect(opened).toEqual({ open: 2, locked: 0 });
  });

  it('two tabs saving their first records at once make one key between them', async () => {
    const T1 = await browser('S1');
    const T2 = await browser('S2', {}, 'S1');
    const H = await T1.run(() => T1.m.holder.holderKey());
    const [a, b] = [await plant(T1), await plant(T2)];
    const out = await Promise.all([
      T1.run(() => T1.m.records.createRecordSaved(a as never)),
      T2.run(() => T2.m.records.createRecordSaved(b as never)),
    ]);
    expect(out.map((o) => o.result.ok)).toEqual([true, true]);
    expect(new Set(sealedRows(H).map((r) => (r.sealed as { kid: string }).kid)).size).toBe(1);
  });
});

describe('L3: a browser with a wrong or unused key can always take the right backup', () => {
  it('a second browser that loaded before the first converted makes no key of its own (a.loss 2/4 case 1)', async () => {
    const H = newHolder();
    const A = await browser('A2');
    const recs = [await plant(A)];
    reg.putLegacy(H, recs[0]);
    const B = await browser('B2');
    await B.run(async () => {
      B.m.holder.setHolderKey(H);
      await B.m.api.apiStore.load('veilcore.records.v1', B.m.records.isStrainRecord);
    });
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
    });
    await settle();
    expect((await backUp(A)).ok).toBe(true);
    await settle(150);
    expect(sealedRows(H)).toHaveLength(1);
    const res = await B.run(async () => B.m.api.apiStore.save('veilcore.records.v1', [...recs, await plant(B)]));
    expect(res.ok).toBe(false);
    expect(await B.run(() => B.m.vault.vaultKeyIfAny())).toBeNull();
    const v3 = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const restore = await B.run(async () => B.m.backup.restoreAny(fileOf(v3)));
    expect(restore.vaultKey).toBe('restored');
  });

  it('a refused or rate-limited GET is "unknown": no key is made, and the right backup restores (a.loss 2/4 case 2)', async () => {
    const H = newHolder();
    const A = await browser('A3');
    reg.putLegacy(H, await plant(A));
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
    });
    await settle();
    await backUp(A);
    await settle(150);
    const D = await browser('D3');
    reg.misbehave.refuseGets = 1;
    const out = await D.run(async () => {
      D.m.holder.setHolderKey(H);
      return D.m.api.apiStore.save('veilcore.records.v1', [await plant(D)]);
    });
    expect(out.refused).toEqual([expect.objectContaining({ words: 'app.sealed.refuse.unknown' })]);
    expect(await D.run(() => D.m.vault.vaultKeyIfAny())).toBeNull();
    const v3 = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    expect((await D.run(() => D.m.backup.restoreAny(fileOf(v3)))).vaultKey).toBe('restored');
  });

  it('a new phone that was tried out, then Start over, takes the real backup (d.loss)', async () => {
    const A = await browser('N-A');
    const H1 = newHolder();
    await A.run(async () => {
      A.m.holder.setHolderKey(H1);
      await A.m.records.createRecordSaved((await plant(A)) as never);
    });
    const v3 = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    const P = await browser('N-P');
    const steps = await P.run(async () => {
      await P.m.records.createRecordSaved((await plant(P)) as never); // tried the app
      const out: string[] = [];
      try {
        await P.m.backup.restoreAny(fileOf(v3));
        out.push('restore 1 ok');
      } catch {
        out.push('restore 1 refused'); // another holder's records are here: refused, rightly
      }
      P.m.records.startOver();
      try {
        await P.m.backup.restoreAny(fileOf(v3));
        out.push('restore 2 ok');
      } catch (e) {
        out.push(`restore 2: ${(e as Error).message}`);
      }
      await P.m.records.hydrate();
      out.push(`open ${P.m.records.allRecords().length}, locked ${P.m.records.lockedRecords().length}`);
      return out;
    });
    expect(steps).toEqual(['restore 1 refused', 'restore 2 ok', 'open 1, locked 0']);
  });

  it('Start over clears a key no accepted save used, and keeps one that did', async () => {
    const A = await browser('SO');
    await A.run(async () => {
      A.m.holder.holderKey();
      A.m.vault.mintVault();
      A.m.records.startOver();
      expect(A.m.vault.vaultKeyIfAny()).toBeNull();
      await A.m.records.createRecordSaved((await plant(A)) as never);
      const k = A.m.vault.vaultKeyIfAny();
      A.m.records.startOver();
      expect(A.m.vault.vaultKeyIfAny()).toBe(k);
    });
  });
});

describe('L4: a received record is finished, or stays a stub that can be finished; never a receipt over what wasn’t stored', () => {
  const sender = async (name: string, over: Record<string, unknown> = {}) => {
    const S = await browser(name);
    const rec = await plant(S, over);
    if (over.profile) delete (rec as Record<string, unknown>).breedingMethod;
    const code = await S.run(async () => {
      S.m.holder.holderKey();
      const r = await S.m.records.createRecordSaved(rec as never);
      if (!r.result.ok) throw new Error(JSON.stringify(r.result));
      const o = await S.m.transfers.offerTransfer(S.m.records.getRecord(rec.id)!, 'lab@x', { quantity: '3 clones' });
      if ('error' in o) throw new Error(o.error);
      return S.m.transfers.shareCodeFor(o.transferId, o.claimCode, `age1${'q'.repeat(58)}`, o.offerKey);
    });
    return { rec, code };
  };

  it('the tab closed after the claim: "Finish receiving" fetches the offer again and seals it (b.loss 5a)', async () => {
    const { rec, code } = await sender('S5');
    const L = await browser('L5');
    const claim = await L.run(async () => {
      L.m.holder.holderKey();
      L.m.transfers.keepReceivingCode(code);
      const p = L.m.transfers.parseShareCode(code);
      const c = await L.m.transfers.claimTransfer(p.transferId, p.claimCode);
      if ('error' in c) throw new Error(c.error);
      return c;
    });
    // Tab closed. Reopened:
    const L2 = await browser('L5b', {}, 'L5');
    const out = await L2.run(async () => {
      await L2.m.records.hydrate();
      const r = L2.m.records.getRecord(claim.recordId)!;
      expect(L2.m.receive.isUnfinishedReceipt(r)).toBe(true);
      const kept = L2.m.receive.keptCodeFor(r)!;
      expect(kept).toBe(code);
      const fin = await L2.m.receive.finishReceiving(r.id, kept);
      return {
        fin,
        state: L2.m.api.rowStateOf('veilcore.records.v1', r.id),
        stillKept: L2.m.transfers.receivingCodeFor(claim.recordId.replace('VEIL-R', 'TR-')),
      };
    });
    if ('error' in out.fin) throw new Error(out.fin.error);
    expect(out.fin.record).toMatchObject({
      bredBy: 'Hunter',
      quantity: '3 clones',
      resultLock: `age1${'q'.repeat(58)}`,
    });
    expect(out.state).toBe('open');
    expect(out.stillKept).toBeUndefined();
    void rec;
    // Someone else can't fetch it.
    const X = await browser('X5');
    const other = await X.run(async () => {
      X.m.holder.holderKey();
      return X.m.transfers.ownOffer(X.m.transfers.parseShareCode(code).transferId);
    });
    expect('error' in other).toBe(true);
  });

  it('a browser whose save would be refused finds out before it claims (b.loss 5b)', async () => {
    const { code } = await sender('S6');
    const L = await browser('L6');
    const LH = newHolder();
    await L.run(async () => {
      L.m.holder.setHolderKey(LH);
      await L.m.records.createRecordSaved((await plant(L)) as never);
    });
    const N = await browser('L6n');
    const ready = await N.run(async () => {
      N.m.holder.setHolderKey(LH);
      await N.m.records.hydrate();
      return N.m.api.vaultReadiness();
    });
    expect(ready).toBe('locked');
    // And if it had claimed: no fingerprint the registry didn't store is ever handed back.
    const out = await N.run(async () => {
      const p = N.m.transfers.parseShareCode(code);
      const c = await N.m.transfers.claimTransfer(p.transferId, p.claimCode);
      if ('error' in c) throw new Error(c.error);
      await N.m.records.hydrate();
      const sealed = await N.m.records.sealReceived(c.recordId, { resultLock: p.resultLock }, {});
      return { sealed, state: N.m.api.rowStateOf('veilcore.records.v1', c.recordId) };
    });
    expect(out.sealed).toBeUndefined();
    expect(out.state).toBe('stub');
  });

  it('an animal whose offer didn’t open: an error to show, not a throw, and the stub stays (b.loss 5c)', async () => {
    const { code } = await sender('S7', {
      profile: 'veilcore/profile/animal-individual/v1',
      taxon: 'Bos taurus',
      refId: 'JP1234567890',
      animal: { breed: 'Wagyu', idScheme: 'JP-IBC', sex: 'female', herd: '' },
      parents: [],
      photoFingerprints: [],
    });
    const L = await browser('L7');
    const withoutKey = code
      .split('.')
      .filter((p) => !p.startsWith('o1'))
      .join('.');
    const out = await L.run(async () => {
      L.m.holder.holderKey();
      const p = L.m.transfers.parseShareCode(withoutKey);
      const c = await L.m.transfers.claimTransfer(p.transferId, p.claimCode);
      if ('error' in c) throw new Error(c.error);
      await L.m.records.hydrate();
      const fin = await L.m.receive.finishReceiving(c.recordId, withoutKey, c);
      return { fin, state: L.m.api.rowStateOf('veilcore.records.v1', c.recordId) };
    });
    expect('error' in out.fin).toBe(true);
    expect(out.state).toBe('stub');
  });
});

describe('L5: size limits', () => {
  it('a record the old registry held (CJK notes at its 20,000-character limit) seals within the limits (c.loss 8)', async () => {
    const H = newHolder();
    const A = await browser('Z1');
    const cjk = (n: number) => '育'.repeat(n);
    const big = await plant(A, { notes: cjk(20_000), breedingMethod: cjk(5_000), bredBy: cjk(500) });
    reg.putLegacy(H, big);
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
    });
    await settle();
    expect((await backUp(A)).ok).toBe(true);
    await settle(200);
    const row = reg.records.get(big.id)!;
    const box = row.sealed as { ct: string };
    expect(box).toBeTruthy();
    expect(box.ct.length).toBeLessThanOrEqual(360_000);
    const key = await A.run(() => A.m.vault.vaultKeyIfAny()!);
    expect(Buffer.byteLength(openBox(key, 'records', big.id, row.sealed as never))).toBeLessThanOrEqual(256 * 1024);
  });

  it('a record over 256 KiB is refused before it is shown or sent', async () => {
    const A = await browser('Z2');
    const huge = await plant(A, { notes: 'n'.repeat(270 * 1024) });
    await A.run(async () => {
      A.m.holder.holderKey();
      expect(A.m.records.tooLargeToSave(huge)).toBe(true);
      expect(() => A.m.records.createRecord(huge as never)).toThrow(/too large/);
      expect(A.m.records.allRecords()).toEqual([]);
      const out = await A.m.api.apiStore.save('veilcore.records.v1', [huge]);
      expect(out.refused).toEqual([expect.objectContaining({ id: huge.id, words: 'app.sealed.refuse.tooLarge' })]);
      // The live counter: nothing far from the limit, a count near it, "too large" over it.
      expect(A.m.records.sizeWords(0.5)).toBeUndefined();
      expect(A.m.records.sizeWords(0.95)).toMatch(/KB of 256 KB used/);
      expect(A.m.records.sizeWords(1.01)).toMatch(/Too large/);
    });
    expect(reg.sent.some((r) => r.method === 'PUT' && r.body.includes(huge.id))).toBe(false);
  });
});

describe('L8: locked rows in an import, the locked-record date, locked parents', () => {
  it('an opened export with one locked row imports the rest and says how many were skipped (c.loss 6)', async () => {
    const A = await browser('E1');
    const H = await A.run(() => A.m.holder.holderKey());
    await A.run(async () => {
      await A.m.records.createRecordSaved((await plant(A)) as never);
      await A.m.records.createRecordSaved((await plant(A)) as never);
    });
    const exported = { format: 'veilcore-registry-export/v1', records: reg.rowsOf(H), licenses: [] };
    (exported.records[0].sealed as { kid: string }).kid = '0123456789abcdef';
    const opened = await A.run(() => A.m.registryExport.openExport(JSON.stringify(exported)));
    const rows = (JSON.parse(opened) as { records: unknown[] }).records;
    const B = await browser('E2');
    const out = await B.run(async () => {
      B.m.holder.holderKey();
      return B.m.records.importRecords(fileOf(JSON.stringify(rows)));
    });
    expect(out).toEqual({ added: 1, alreadyHere: 0, locked: 1 });
  });

  it('the locked-record words use the date the key was made, never a received date', async () => {
    const A = await browser('D1');
    const made = Date.now();
    await A.run(async () => {
      A.m.holder.holderKey();
      await A.m.records.createRecordSaved((await plant(A)) as never);
    });
    await settle();
    // The key is gone from this browser (storage cleared in part); the date it was made isn't.
    A.storage.delete('veilcore.vault.v1');
    const R = await browser('D1b', {}, 'D1');
    const locked = await R.run(async () => {
      await R.m.records.hydrate();
      return R.m.records.lockedRecords();
    });
    expect(locked).toHaveLength(1);
    expect(locked[0].since).toBeGreaterThanOrEqual(made - 5_000);
    // A row locked by a key this browser never had: no date at all, even with a received date.
    const H = await R.run(() => R.m.holder.holderKeyIfAny()!);
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', key, iv);
    c.setAAD(Buffer.from('veilcore:sealed:v1\0records\0VEIL-FOREIGN\0f00dfacecafe0001'));
    const ct = Buffer.concat([c.update('{}'), c.final(), c.getAuthTag()]);
    reg.records.set('VEIL-FOREIGN', {
      id: 'VEIL-FOREIGN',
      strainName: 'x',
      receivedAt: Date.UTC(2026, 0, 2),
      sealed: {
        v: 1,
        alg: 'A256GCM',
        kid: 'f00dfacecafe0001',
        iv: iv.toString('base64url'),
        ct: ct.toString('base64url'),
      },
      holder: H,
    });
    const again = await R.run(async () => {
      await R.m.records.hydrate();
      return R.m.records.lockedRecords().find((l) => l.id === 'VEIL-FOREIGN');
    });
    expect(again?.since).toBeUndefined();
  });

  it('breeding history and evidence bundles count the locked parents they leave out', async () => {
    const { walkHistory } = await import('./breeding-history/walk');
    const { coverNoteHtml } = await import('./breeding-history/html');
    const { lockedParentsOf } = await import('./evidence/bundle');
    const root = {
      id: 'VEIL-CHILD',
      strainName: 'Child',
      bredBy: '',
      dateCreated: '',
      notes: '',
      loggedAt: 1,
      recordFingerprint: 'f'.repeat(64),
      parents: [
        { name: 'Mine, locked', recordId: 'VEIL-LOCKED' },
        { name: 'Someone else’s', recordId: 'VEIL-THEIRS' },
      ],
    };
    const h = walkHistory(root, () => undefined, 15, new Set(['VEIL-LOCKED']));
    expect(h.outside.map((o) => o.kind).sort()).toEqual(['locked', 'theirs']);
    const cover = coverNoteHtml({ history: h, facts: new Map(), madeAt: new Date(0), labDatings: new Map() });
    expect(cover).toContain('locked in this browser (1)');
    expect(lockedParentsOf(root as never, new Set(['VEIL-LOCKED']))).toBe(1);
    // README.txt's line for them: evidence/bundle.test.ts.
  });
});
