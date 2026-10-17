// Round 3 of sealed records: one regression test per browser-side finding of the third pair
// of attack reviews (sealed/report-round3-privacy.md, P1-P4 and P7; report-round3-loss.md,
// L1-L13 and the deploy window), ported from their proofs (attack3-privacy/.../
// attack3-privacy.test.ts; attack3-loss/.../src/attack3/*.test.ts). Each proof passed when its
// attack worked; each test here passes only when it no longer does.
//
// They run against the in-memory registry with the real one's rules (fixtures/fake-registry.ts)
// and several browsers at once (fixtures/browsers.ts), each its own modules and storage. The
// registry-side findings (P5, P6, L6) are the registry's to fix and are not here.
// SPDX-License-Identifier: Apache-2.0

import { createHmac, hkdfSync, randomBytes } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

const newHolder = () => randomBytes(32).toString('hex');
const RECORDS = 'veilcore.records.v1';
const LICENSES = 'veilcore.licenses.v1';

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
      parents: [{ name: 'Old Mother' }],
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

/** Inside a browser: a holder key, and a vault key in a checked backup (as the app has a holder do). */
const ready = (b: Browser): void => {
  b.m.holder.holderKey();
  if (!b.m.vault.vaultKeyIfAny()) b.m.vault.mintVault();
  b.m.vault.markVaultBackedUp();
};

/** Save a backup in this browser and check it, as the backup page does. */
const backUp = async (b: Browser) =>
  b.run(async () => b.m.backup.checkBackup(fileOf(JSON.stringify(b.m.backup.backupContents()))));

const grantPuts = () => reg.sent.filter((r) => r.method === 'PUT' && /\/disclosure$/.test(new URL(r.url).pathname));
const recordPuts = () => reg.sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records'));

const ageLock = async () => {
  const age = await import('age-encryption');
  const id = await age.generateIdentity();
  return { id, lock: await age.identityToRecipient(id) };
};

// =============================================================================== privacy

describe('P1: the lab-report lock comes only from the lab code or the sealed offer', () => {
  it('a stub the registry puts a lock on: the lab never uses it (attack3-privacy F4, stub route)', async () => {
    const evil = await ageLock();
    const Br = await browser('Breeder');
    const rec = await plant(Br);
    const code = await Br.run(async () => {
      ready(Br);
      await Br.m.records.createRecordSaved(rec as never);
      const o = await Br.m.transfers.offerTransfer(Br.m.records.getRecord(rec.id)!, 'Lab');
      if ('error' in o) throw new Error(o.error);
      return Br.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey); // no lock part
    });
    const Lab = await browser('Lab');
    const recordId = await Lab.run(async () => {
      ready(Lab);
      const { transferId, claimCode } = Lab.m.transfers.parseShareCode(code);
      const res = await Lab.m.transfers.claimTransfer(transferId, claimCode);
      if ('error' in res) throw new Error(res.error);
      // The registry writes its own lock (and a grant) into the stub it serves.
      Object.assign(reg.records.get(res.recordId)!, { resultLock: evil.lock, grant: ['parent-names'] });
      await Lab.m.records.hydrate();
      expect(Lab.m.records.getRecord(res.recordId)?.resultLock).toBeUndefined();
      const out = await Lab.m.receive.finishReceiving(res.recordId, code, res);
      if ('error' in out) throw new Error(out.error);
      return res.recordId;
    });
    const r = await Lab.run(() => Lab.m.records.getRecord(recordId)!);
    expect(r.resultLock).toBeUndefined();
    expect(r.grant).toBeUndefined();
    expect(await Lab.run(() => Lab.m.labResults.reportLockFor(r, true))).toEqual({ none: true });
  });

  it('the breeder’s plant lock sealed in the offer reaches the lab; a report locked with it opens for the breeder', async () => {
    const evil = await ageLock();
    const Br = await browser('Breeder2');
    const rec = await plant(Br);
    const { code, plantLock } = await Br.run(async () => {
      ready(Br);
      await Br.m.records.createRecordSaved(rec as never);
      const secret = (await import('./record-keys')).ensureKeys(rec.id).recordSecret;
      const lock = await Br.m.labResults.resultRecipientFor(secret);
      const o = await Br.m.transfers.offerTransfer(Br.m.records.getRecord(rec.id)!, 'Lab', { resultLock: lock });
      if ('error' in o) throw new Error(o.error);
      return { code: Br.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey), plantLock: lock };
    });
    expect(recordPuts().some((p) => p.body.includes(plantLock))).toBe(false);
    const Lab = await browser('Lab2');
    const r = await Lab.run(async () => {
      ready(Lab);
      const { transferId, claimCode } = Lab.m.transfers.parseShareCode(code);
      const res = await Lab.m.transfers.claimTransfer(transferId, claimCode);
      if ('error' in res) throw new Error(res.error);
      reg.records.get(res.recordId)!.resultLock = evil.lock;
      await Lab.m.records.hydrate();
      const out = await Lab.m.receive.finishReceiving(res.recordId, code, res);
      if ('error' in out) throw new Error(out.error);
      return out.record;
    });
    expect(r).toMatchObject({ resultLock: plantLock, resultLockFrom: 'offer' });
    const vouched = await Lab.run(() => Lab.m.labResults.reportLockFor(r, true));
    expect(vouched).toEqual({ lock: plantLock });
    const locked = await Lab.run(() => Lab.m.labResults.lockReport(new TextEncoder().encode('THC 21%'), plantLock));
    const opened = await Br.run(async () =>
      Br.m.labResults.openReport(locked, (await import('./record-keys')).keysFor(rec.id)!.recordSecret, r.transferId),
    );
    expect(new TextDecoder().decode(opened)).toBe('THC 21%');
    // The registry's own key can't open it.
    const age = await import('age-encryption');
    const d = new age.Decrypter();
    d.addIdentity(evil.id);
    await expect(d.decrypt(locked)).rejects.toThrow();
  });

  it('a record saved before sealing: its lock is not taken; a sealed one that differs waits for the code again (F4, legacy route)', async () => {
    const evil = await ageLock();
    const real = await ageLock();
    const L = newHolder();
    const Lab = await browser('Lab3');
    const rec = await plant(Lab, { notes: '' });
    reg.putLegacy(L, {
      ...rec,
      receivedFrom: 'VEIL-SRC',
      receivedFromCommitment: 'ab'.repeat(32),
      transferId: 'TR-00000001',
      resultLock: evil.lock,
      resultLockFrom: 'code',
    });
    await Lab.run(async () => {
      Lab.m.holder.setHolderKey(L);
      Lab.m.labResults.rememberDelivery({
        transferId: 'TR-00000001',
        receivedRecordId: rec.id,
        recipient: real.lock,
        receivedAt: 1,
      });
      await Lab.m.records.hydrate();
    });
    // The plain row's lock is the server's word: not taken. The code's lock, kept here, is used.
    const r = await Lab.run(() => Lab.m.records.getRecord(rec.id)!);
    expect(r.resultLock).toBeUndefined();
    expect(await Lab.run(() => Lab.m.labResults.reportLockFor(r, false))).toEqual({ lock: real.lock });
    // A lab with no lock from the code is asked for the code, never handed the row's lock.
    expect(
      await Lab.run(() => Lab.m.labResults.reportLockFor({ id: 'VEIL-NO-DELIVERY', resultLock: undefined }, false)),
    ).toEqual({ none: true });
    // A record sealed before the rule, whose lock differs from the code's: nothing is sent until
    // the lab pastes the code again (LabResults.tsx useCode), then the code's lock is used.
    const sealedBefore = { id: rec.id, resultLock: evil.lock };
    await Lab.run(() =>
      Lab.m.labResults.rememberDelivery({
        transferId: 'TR-00000001',
        receivedRecordId: rec.id,
        recipient: real.lock,
        receivedAt: 1,
      }),
    );
    expect(await Lab.run(() => Lab.m.labResults.reportLockFor(sealedBefore, true))).toEqual({ conflict: true });
    await Lab.run(() =>
      Lab.m.labResults.rememberDelivery({
        transferId: 'TR-00000001',
        receivedRecordId: rec.id,
        recipient: real.lock,
        receivedAt: 1,
        lockConfirmed: true,
      }),
    );
    expect(await Lab.run(() => Lab.m.labResults.reportLockFor(sealedBefore, true))).toEqual({ lock: real.lock });
    // A lock on a record sealed here before the rule, with no note of where it came from, is
    // not used either.
    expect(await Lab.run(() => Lab.m.labResults.reportLockFor({ id: 'VEIL-X', resultLock: evil.lock }, true))).toEqual({
      conflict: true,
    });
  });
});

describe('P2: a grant the registry lists is not the holder’s choice', () => {
  it('at conversion only value-less keys are kept; the rest are asked about; nothing leaks after a pairing or a correction (F1)', async () => {
    const H = newHolder();
    const A = await browser('A');
    const rec = await plant(A);
    reg.putLegacy(H, { ...rec, grant: ['parent-names'] }); // and a grant on the plain row itself
    reg.misbehave.inventedGrants.push({
      holder: H,
      recordId: rec.id,
      show: ['existence', 'attestation-status', 'sealed-at', 'parent-names', 'breeding-method'],
    });
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      expect(A.m.records.getRecord(rec.id)?.grant).toBeUndefined();
    });
    await settle();
    expect((await backUp(A)).ok).toBe(true);
    await settle(200);
    const sealed = await A.run(() => A.m.records.getRecord(rec.id)!);
    expect(sealed.grant).toEqual(['existence']);
    expect(sealed.grantToConfirm).toEqual(['attestation-status', 'sealed-at', 'parent-names', 'breeding-method']);
    expect(reg.grants.get(rec.id)?.show).toEqual(['existence']);
    // A DNA report paired later: its hash and pairing go nowhere.
    const SECRET_SHA = 'ab'.repeat(32);
    const SECRET_PAIR = 'cd'.repeat(32);
    reg.sent.length = 0;
    await A.run(() => A.m.records.pairDna(rec.id, SECRET_PAIR, 'my-genome.vcf', { fileSha256: SECRET_SHA }));
    await settle(200);
    const afterPair = grantPuts()
      .map((r) => r.body)
      .join('\n');
    expect(afterPair).not.toContain(SECRET_SHA);
    expect(afterPair).not.toContain(SECRET_PAIR);
    // A correction starts with no grant; one the registry lists for it gets nothing.
    const fixed = await A.run(() =>
      A.m.records.issueCorrection(rec.id, { parents: [{ name: 'Secret Real Mother' }] }, 'wrong parent'),
    );
    expect(fixed?.grant).toBeUndefined();
    reg.misbehave.inventedGrants.push({ holder: H, recordId: fixed!.id, show: ['existence', 'parent-names'] });
    reg.sent.length = 0;
    await A.run(() => A.m.disclosure.syncGrants(A.m.records.getRecord));
    expect(grantPuts()).toEqual([]);
    for (const r of reg.sent) expect(r.body).not.toContain('Secret Real Mother');
    // The holder answers the question: only then are the values shared again.
    await A.run(async () => expect(await A.m.records.confirmGrant(rec.id, true)).toEqual({ ok: true }));
    expect(reg.grants.get(rec.id)?.show).toEqual([
      'existence',
      'attestation-status',
      'sealed-at',
      'parent-names',
      'breeding-method',
    ]);
    expect(await A.run(() => A.m.records.getRecord(rec.id)?.grantToConfirm)).toBeUndefined();
  });

  it('control: an invented grant on a record sealed here uploads nothing', async () => {
    const A = await browser('A2');
    const rec = await plant(A, { parents: [{ name: 'Secret Mother' }] });
    await A.run(async () => {
      ready(A);
      await A.m.records.createRecordSaved(rec as never);
    });
    reg.misbehave.inventedGrants.push({
      holder: await A.run(() => A.m.holder.holderKeyIfAny()!),
      recordId: rec.id,
      show: ['parent-names'],
    });
    reg.sent.length = 0;
    await A.run(() => A.m.disclosure.syncGrants(A.m.records.getRecord));
    expect(grantPuts()).toEqual([]);
  });
});

describe('P3: the share screen starts from the sealed choice, and says when the server’s differs', () => {
  it('the switches are the sealed grant, not the registry’s (F3); the registry’s other choice is shown, not sent', async () => {
    const A = await browser('A3');
    const rec = await plant(A, { parents: [{ name: 'Secret Mother' }] });
    await A.run(async () => {
      ready(A);
      await A.m.records.createRecordSaved(rec as never);
      await A.m.disclosure.saveGrant(A.m.records.getRecord(rec.id)!, A.m.disclosure.disclosureFrom(['existence']));
    });
    reg.grants.set(rec.id, { ...reg.grants.get(rec.id)!, show: ['existence', 'parent-names', 'breeding-method'] });
    // The switches start from the sealed choice (Step5ProveDisclosure.tsx uses shareScreenStart);
    // the registry's answer is only said beside them.
    const start = await A.run(() => A.m.disclosure.shareScreenStart(A.m.records.getRecord(rec.id)));
    expect(A.m.disclosure.keysOn(start)).toEqual(['existence']);
    const fs = await import('node:fs');
    const page = fs.readFileSync(new URL('../components/wizard/Step5ProveDisclosure.tsx', import.meta.url), 'utf8');
    expect(page).toContain('useState<Disclosure>(() => shareScreenStart(record))');
    expect(page).not.toMatch(/setDisclosure\(disclosureFrom\(g\.show\)\)/);
    // A record with no choice yet starts from the defaults, which share no values.
    const fresh = await plant(A);
    expect(A.m.disclosure.keysOn(await A.run(() => A.m.disclosure.shareScreenStart(fresh as never)))).toEqual([
      'existence',
      'descent-clean',
    ]);
    reg.sent.length = 0;
    await A.run(() => A.m.disclosure.syncGrants(A.m.records.getRecord));
    expect(grantPuts()).toEqual([]);
    expect(await A.run(() => A.m.disclosure.grantDifferenceOf(rec.id))).toEqual([
      'existence',
      'parent-names',
      'breeding-method',
    ]);
  });
});

describe('P4: the high-water marks are in the backup', () => {
  it('a restored browser refuses the older copy the registry kept, and a withdrawn grant stays withdrawn (F2)', async () => {
    const A = await browser('A4');
    const rec = await plant(A, { parents: [{ name: 'Secret Mother' }] });
    await A.run(async () => {
      ready(A);
      await A.m.records.createRecordSaved(rec as never);
      const r = await A.m.disclosure.saveGrant(
        A.m.records.getRecord(rec.id)!,
        A.m.disclosure.disclosureFrom(['existence', 'parent-names']),
      );
      expect('error' in r).toBe(false);
    });
    await settle(100);
    const old = structuredClone(reg.records.get(rec.id)!);
    await A.run(async () => {
      const r = await A.m.disclosure.saveGrant(
        A.m.records.getRecord(rec.id)!,
        A.m.disclosure.disclosureFrom(['existence']),
      );
      expect('error' in r).toBe(false);
    });
    await settle(100);
    const file = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    expect((JSON.parse(file) as { revs?: unknown }).revs).toMatchObject({ [`records:${rec.id}`]: 3 });
    reg.records.set(rec.id, old);
    const B = await browser('B4');
    await B.run(async () => {
      await B.m.backup.restoreAny(fileOf(file));
      await B.m.records.hydrate();
    });
    await settle(150);
    expect(await B.run(() => B.m.records.getRecord(rec.id))).toBeUndefined();
    expect(await B.run(() => B.m.records.lockedRecords())).toEqual([
      expect.objectContaining({ id: rec.id, older: true }),
    ]);
    await B.run(() => B.m.disclosure.syncGrants(B.m.records.getRecord));
    expect(reg.grants.get(rec.id)?.show).toEqual(['existence']);
    // A version 3 file from before marks were kept still restores.
    const { revs: _r, ...withoutRevs } = JSON.parse(file) as Record<string, unknown>;
    void _r;
    const C = await browser('C4');
    expect((await C.run(() => C.m.backup.restoreAny(fileOf(JSON.stringify(withoutRevs))))).vaultKey).toBe('restored');
  });
});

describe('P7: smaller privacy items', () => {
  it('the recipient tag uses a key derived from the vault key (HKDF), never the key itself', async () => {
    const A = await browser('A7');
    const out = await A.run(async () => {
      ready(A);
      return { tag: await A.m.vault.handleTag('  Jane Doe '), key: A.m.vault.vaultKeyIfAny()! };
    });
    const raw = Buffer.from(out.key, 'base64url');
    const msg = 'veilcore:handle:v1\0jane doe';
    expect(out.tag).not.toBe(createHmac('sha256', raw).update(msg).digest('hex'));
    const derived = Buffer.from(hkdfSync('sha256', raw, Buffer.alloc(0), 'veilcore:vault:handle-tag:v1', 32));
    expect(out.tag).toBe(createHmac('sha256', derived).update(msg).digest('hex'));
    expect(A.m.vault.VAULT_KEY_INFO).toEqual({
      records: 'veilcore:vault:records:v1',
      handleTag: 'veilcore:vault:handle-tag:v1',
    });
  });

  it('a locked lab report is padded to the records’ size buckets, and opens as the report itself', async () => {
    const A = await browser('A7b');
    const { lock } = await ageLock();
    const sizes = await A.run(async () => {
      const lr = A.m.labResults;
      const a = await lr.lockReport(new Uint8Array(100).fill(1), lock);
      const b = await lr.lockReport(new Uint8Array(900).fill(2), lock);
      const c = await lr.lockReport(new Uint8Array(1100).fill(3), lock);
      return [a.length, b.length, c.length];
    });
    expect(sizes[0]).toBe(sizes[1]);
    expect(sizes[2]).toBeGreaterThan(sizes[1]);
    const back = await A.run(() => {
      const lr = A.m.labResults;
      const report = new TextEncoder().encode('%PDF-1.7 report\n%%EOF');
      const padded = lr.padReport(report);
      return { len: padded.length, same: lr.unpadReport(padded), plain: lr.unpadReport(report) };
    });
    expect(back.len).toBe(1024);
    expect(new TextDecoder().decode(back.same)).toBe('%PDF-1.7 report\n%%EOF');
    expect(new TextDecoder().decode(back.plain)).toBe('%PDF-1.7 report\n%%EOF');
  });

  it('the default share leaves out the seal date and the DNA report', async () => {
    const A = await browser('A7c');
    const d = await A.run(() => A.m.disclosure.defaultDisclosure());
    expect(d['sealed-at']).toBe(false);
    expect(d['attestation-status']).toBe(false);
    expect(d.existence).toBe(true);
  });

  it('the note sealed in the offer wins over a readable note from the registry', async () => {
    const S = await browser('S7');
    const rec = await plant(S);
    const code = await S.run(async () => {
      ready(S);
      await S.m.records.createRecordSaved(rec as never);
      const o = await S.m.transfers.offerTransfer(S.m.records.getRecord(rec.id)!, 'Lab', { note: 'keep cold' });
      if ('error' in o) throw new Error(o.error);
      return S.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey);
    });
    const L = await browser('L7');
    const out = await L.run(async () => {
      ready(L);
      const p = L.m.transfers.parseShareCode(code);
      const claim = await L.m.transfers.claimTransfer(p.transferId, p.claimCode);
      if ('error' in claim) throw new Error(claim.error);
      await L.m.records.hydrate();
      return L.m.receive.finishReceiving(claim.recordId, code, { ...claim, note: 'WHAT THE SERVER SAYS' });
    });
    if ('error' in out) throw new Error(out.error);
    expect(out.record.deliveryNote).toBe('keep cold');
  });
});

// ============================================================================== data loss

describe('L1: nothing is sealed under a key until it is in a checked backup', () => {
  it('a plant logged in a private tab is held, not sealed: the laptop still makes its key and converts (deadkey #1)', async () => {
    const H = newHolder();
    const seed = await browser('seed');
    const old = await plant(seed, { strainName: 'Ten-year line' });
    reg.putLegacy(H, old);
    const P = await browser('phone-private');
    await P.run(async () => {
      await P.m.backup.restoreAny(fileOf(`VeilCore holder key\n\n${H}\n\nThis key is how you get back.\n`));
      await P.m.records.hydrate();
      await settle(100);
      const out = await P.m.records.createRecordSaved((await plant(P, { strainName: 'Logged on my phone' })) as never);
      expect(out.result.held).toEqual([out.record.id]);
      expect(P.m.records.unsavedReason(out.record.id)).toBe('backup');
    });
    expect(reg.rowsOf(H).filter((r) => r.sealed)).toEqual([]);
    stores.delete('phone-private'); // the private window closes
    const Lp = await browser('laptop');
    await Lp.run(async () => {
      Lp.m.holder.setHolderKey(H);
      await Lp.m.records.hydrate();
      await settle(100);
      expect(Lp.m.records.lockedRecords()).toEqual([]);
      expect(Lp.m.vault.vaultKeyIfAny()).toBeTruthy();
    });
    expect((await backUp(Lp)).ok).toBe(true);
    await settle(200);
    expect(await Lp.run(() => Lp.m.api.rowStateOf(RECORDS, old.id))).toBe('open');
    const typed = await plant(Lp, { strainName: 'Spring cross, 40 seeds' });
    const out = await Lp.run(() => Lp.m.records.createRecordSaved(typed as never));
    expect(out.result.ok).toBe(true);
  });

  it('site data cleared before the backup is checked: the holder key alone gets everything back (deadkey #2)', async () => {
    const H = newHolder();
    const seed = await browser('seed2');
    const old = await plant(seed, { strainName: 'Mother plant' });
    reg.putLegacy(H, old);
    const L = await browser('laptop2');
    await L.run(async () => {
      L.m.holder.setHolderKey(H);
      await L.m.records.hydrate();
      await settle(100);
      const out = await L.m.records.createRecordSaved((await plant(L, { strainName: 'Clone 7' })) as never);
      expect(out.result.ok).toBe(false);
      expect(L.m.vault.vaultNeedsBackup()).toBe(true);
    });
    const L2 = await browser('laptop2-cleared');
    await L2.run(async () => {
      L2.m.holder.setHolderKey(H);
      await L2.m.records.hydrate();
      await settle(100);
      expect(L2.m.vault.vaultKeyIfAny()).toBeTruthy(); // no other key owns the holder
    });
    expect((await backUp(L2)).ok).toBe(true);
    await settle(200);
    expect(await L2.run(() => L2.m.api.rowStateOf(RECORDS, old.id))).toBe('open');
  });

  it('rows sealed with a key nobody has: a new record stays on screen, and "I don’t have that backup" deletes them and starts a new key', async () => {
    const H = newHolder();
    const Dead = await browser('dead');
    const lost = await plant(Dead, { strainName: 'Lost key plant' });
    await Dead.run(async () => {
      Dead.m.holder.setHolderKey(H);
      ready(Dead);
      await Dead.m.records.createRecordSaved(lost as never);
    });
    stores.delete('dead');
    const L = await browser('laptop3');
    const typed = await plant(L, { strainName: 'Spring cross' });
    await L.run(async () => {
      L.m.holder.setHolderKey(H);
      await L.m.records.hydrate();
      const out = await L.m.records.createRecordSaved(typed as never);
      expect(out.result.refused[0]?.words).toBe('app.sealed.refuse.noKey');
      await settle(100);
      // Still shown, kept in this browser, and said why (it used to be reloaded away).
      expect(L.m.records.getRecord(typed.id)).toBeTruthy();
      expect(L.m.records.unsavedReason(typed.id)).toBe('key');
      expect(await L.m.records.abandonLostKey()).toEqual({ removed: 1 });
      expect(L.m.vault.vaultKeyIfAny()).toBeTruthy();
      expect(L.m.records.lockedRecords()).toEqual([]);
    });
    expect(reg.records.has(lost.id)).toBe(false);
    expect((await backUp(L)).ok).toBe(true);
    await settle(200);
    expect(reg.records.get(typed.id)?.sealed).toBeTruthy();
    expect(await L.run(() => L.m.records.unsavedReason(typed.id))).toBeUndefined();
  });
});

describe('L2: only changed rows are sent; an older copy can be used', () => {
  const setup = async (tag: string) => {
    const A = await browser(`${tag}-A`);
    const [mother, sister] = [await plant(A, { strainName: 'Mother' }), await plant(A, { strainName: 'Sister' })];
    await A.run(async () => {
      ready(A);
      await A.m.records.createRecordSaved(mother as never);
      await A.m.records.createRecordSaved(sister as never);
    });
    const backup = await A.run(() => JSON.stringify(A.m.backup.backupContents()));
    return { A, mother, sister, backup };
  };
  const fp = (n: number) => n.toString(16).padStart(64, 'a');

  it('phone edits twice, a stale laptop tab once: the phone is shown the registry’s copy and can use it (revs #1)', async () => {
    const { A: phone, mother, backup } = await setup('twodev');
    const laptop = await browser('twodev-laptop');
    await laptop.run(async () => {
      await laptop.m.backup.restoreAny(fileOf(backup));
      await laptop.m.records.hydrate();
    });
    await phone.run(async () => {
      phone.m.records.pairDna(mother.id, fp(1), 'report-v1.pdf');
      await settle(100);
      phone.m.records.pairDna(mother.id, fp(2), 'report-v2.pdf');
      await settle(100);
    });
    await laptop.run(async () => {
      laptop.m.records.pairDna(mother.id, fp(3), 'scan-from-laptop.pdf');
      await settle(100);
    });
    const phone2 = await browser('twodev-phone2', {}, phone.name);
    await phone2.run(async () => {
      await phone2.m.records.hydrate();
      expect(phone2.m.records.getRecord(mother.id)).toBeUndefined();
      expect(phone2.m.records.olderCopyOfRecord(mother.id)?.dnaFileName).toBe('scan-from-laptop.pdf');
      expect(phone2.m.records.adoptOlderCopy(mother.id)).toBe(true);
      expect(phone2.m.records.getRecord(mother.id)?.dnaFileName).toBe('scan-from-laptop.pdf');
    });
    // From then on it is the record here: shown after a reload, and changes to it are saved.
    const phone3 = await browser('twodev-phone3', {}, phone.name);
    await phone3.run(async () => {
      await phone3.m.records.hydrate();
      expect(phone3.m.records.getRecord(mother.id)).toBeTruthy();
      phone3.m.records.pairDna(mother.id, fp(4), 'final.pdf');
      await settle(100);
    });
    expect(
      await laptop.run(async () => {
        await laptop.m.records.hydrate();
        return laptop.m.records.getRecord(mother.id)?.dnaFileName;
      }),
    ).toBe('final.pdf');
  });

  it('two quick edits arriving out of order: the unchanged sister isn’t in the slow save, so nothing is hidden (revs #3)', async () => {
    const { A, mother, sister } = await setup('ooo');
    let slow = true;
    reg.misbehave.fault = (method, path) => {
      if (method === 'PUT' && path === '/api/records' && slow) {
        slow = false;
        return undefined;
      }
      return undefined;
    };
    reg.sent.length = 0;
    await A.run(async () => {
      A.m.records.pairDna(mother.id, fp(5), 'mother.pdf');
      await settle(20);
      A.m.records.pairDna(sister.id, fp(6), 'sister.pdf');
      await settle(200);
    });
    const puts = recordPuts().map((p) => (JSON.parse(p.body) as { id: string }[]).map((r) => r.id));
    expect(puts[0]).toEqual([mother.id]); // only the changed row
    const A2 = await browser('ooo-reload', {}, A.name);
    await A2.run(async () => {
      await A2.m.records.hydrate();
      expect(A2.m.records.getRecord(sister.id)?.dnaFileName).toBe('sister.pdf');
      expect(A2.m.records.lockedRecords()).toEqual([]);
    });
  });

  it('the registry put back from a nightly copy: the record’s older copy can be used (revs #2)', async () => {
    const { A, mother } = await setup('regrestore');
    const nightly = structuredClone(reg.records.get(mother.id)!);
    await A.run(async () => {
      A.m.records.pairDna(mother.id, fp(7), 'report.pdf');
      await settle(100);
    });
    reg.records.set(mother.id, nightly);
    const A2 = await browser('regrestore-reload', {}, A.name);
    await A2.run(async () => {
      await A2.m.records.hydrate();
      expect(A2.m.records.lockedRecords()).toEqual([expect.objectContaining({ id: mother.id, older: true })]);
      expect(A2.m.records.adoptOlderCopy(mother.id)).toBe(true);
      expect(A2.m.records.lockedRecords()).toEqual([]);
    });
  });
});

describe('L3: a change to an agreement saved before sealing is refused, not dropped', () => {
  it('the store refuses it; the app refuses the change itself before the backup is checked (upgrade #1)', async () => {
    const H = newHolder();
    const A = await browser('L3');
    const r1 = await plant(A);
    reg.putLegacy(H, r1);
    const LIC = `LIC-${'A1'.repeat(16)}`;
    reg.putLegacyLicense(H, {
      id: LIC,
      type: 'license',
      recordId: r1.id,
      recordFingerprint: r1.recordFingerprint,
      terms: { licensee: 'Acme Farms', startDate: '2026-01-01', endDate: '2027-01-01' },
      agreementFingerprint: 'ab'.repeat(32),
      state: 'active',
      createdAt: Date.UTC(2026, 6, 1),
      royaltyLog: [],
    });
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      A.m.licenses.startLicenseSync();
      await settle(150);
      expect(A.m.api.rowStateOf(LICENSES, LIC)).toBe('legacy');
      const lic = A.m.licenses.getLicense(LIC)!;
      const out = await A.m.api.apiStore.save(LICENSES, [{ ...lic, state: 'revoked' }]);
      expect(out.refused).toEqual([expect.objectContaining({ id: LIC, words: 'app.sealed.refuse.backupFirst' })]);
      expect(A.m.licenses.agreementsWaitForBackup()).toBe(true);
      expect(() => A.m.licenses.revokeLicense(LIC, 'stopped paying')).toThrow(/Save a backup/);
      expect(() => A.m.licenses.addRoyalty(LIC, 1000, 50, 'Q3')).toThrow(/Save a backup/);
      expect(A.m.licenses.getLicense(LIC)!.state).toBe('active');
    });
    expect(reg.licenses.get(LIC)?.state).toBe('active');
  });
});

describe('L4: an import puts the holder’s own records back into emptied rows', () => {
  it('the two-flag purge emptied them: the export’s records come back; a wrong one is counted, not "added" (purge #2)', async () => {
    const H = newHolder();
    const A = await browser('L4');
    const [r1, r2] = [await plant(A, { notes: 'ten years of notes' }), await plant(A)];
    reg.putLegacy(H, r1);
    reg.putLegacy(H, r2);
    let exported = '';
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      exported = JSON.stringify(A.m.records.allRecords());
    });
    reg.purge(H);
    const forged = JSON.parse(exported) as Record<string, unknown>[];
    const other = await plant(A);
    const file = [forged[0], { ...other, id: forged[1].id }];
    await A.run(async () => {
      await A.m.records.hydrate();
      expect(A.m.records.lockedRecords()).toHaveLength(2);
      ready(A);
      const res = await A.m.records.importRecords(fileOf(JSON.stringify(file)));
      expect(res).toMatchObject({ added: 1, notImported: 1 });
      await settle(100);
      await A.m.records.hydrate();
      expect(A.m.records.getRecord(forged[0].id as string)?.notes).toBeTruthy();
    });
    expect(reg.records.get(forged[0].id as string)?.sealed).toBeTruthy();
    expect(reg.records.get(forged[1].id as string)?.contentsRemoved).toBe(true);
  });
});

describe('L5: an emptied agreement doesn’t blank the Agreements page', () => {
  it('{ id, contentsRemoved } loads as locked; an agreement without terms is never drawn (purged-licence)', async () => {
    const H = newHolder();
    const A = await browser('L5');
    const LIC = `LIC-${'B2'.repeat(16)}`;
    reg.putLegacyLicense(H, { id: LIC, type: 'license', terms: { licensee: 'Acme' }, state: 'active', createdAt: 1 });
    reg.purge(H);
    expect(reg.licenses.get(LIC)).toMatchObject({ id: LIC, contentsRemoved: true });
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      A.m.licenses.startLicenseSync();
      await settle(150);
      expect(A.m.licenses.lockedLicenses()).toEqual([{ id: LIC }]);
      expect(A.m.licenses.getLicense(LIC)).toBeUndefined();
      expect(() => A.m.licenses.agreementRows({ id: 'LIC-X', state: 'active' } as never)).not.toThrow();
    });
  });

  it('a page that throws shows a plain message, not a blank page', async () => {
    delete (globalThis as { document?: unknown }).document; // drawn as on a server
    vi.stubGlobal('window', { localStorage, location: { search: '' } });
    const { PageErrorBoundary } = await import('../components/PageErrorBoundary');
    expect(PageErrorBoundary).toBeTypeOf('function');
    const mod = await import('../components/PageErrorBoundary');
    // The boundary's class: an error sets `failed`, and it then draws the message.
    const Boundary = (mod as unknown as Record<string, unknown>).Boundary as
      | { getDerivedStateFromError: () => { failed: boolean } }
      | undefined;
    expect(Boundary?.getDerivedStateFromError()).toEqual({ failed: true });
    const { PageErrorFallback } = mod as unknown as { PageErrorFallback: React.FC };
    const { LanguageProvider } = await import('../i18n');
    const html = renderToStaticMarkup(
      React.createElement(LanguageProvider, null, React.createElement(PageErrorFallback)),
    );
    expect(html).toContain('This page couldn’t be shown');
    expect(html).toContain('data-page-error');
  });
});

describe('L7: a correction of a record saved before sealing is refused up front', () => {
  it('nothing reaches the registry, no keys are lost; a half-stored correction is taken back (upgrade #2)', async () => {
    const H = newHolder();
    const A = await browser('L7');
    const r2 = await plant(A);
    reg.putLegacy(H, r2);
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      await settle(100);
      expect(A.m.records.correctionWaitsForBackup(r2.id)).toBe(true);
      reg.sent.length = 0;
      await expect(A.m.records.issueCorrection(r2.id, { notes: 'typo fixed' }, 'typo')).rejects.toThrow(
        /Save a backup/,
      );
      expect(recordPuts()).toEqual([]);
    });
    // After the backup: the registry takes the correction but refuses the original's update.
    expect((await backUp(A)).ok).toBe(true);
    await settle(200);
    reg.misbehave.rejectIds.add(r2.id);
    const before = new Set(reg.records.keys());
    await A.run(async () => {
      await expect(A.m.records.issueCorrection(r2.id, { notes: 'typo fixed' }, 'typo')).rejects.toThrow(
        /nothing was changed/,
      );
    });
    expect([...reg.records.keys()].filter((id) => !before.has(id))).toEqual([]);
  });
});

describe('L8, L9, L10: receiving', () => {
  const sender = async (name: string) => {
    const S = await browser(name);
    const rec = await plant(S);
    const code = await S.run(async () => {
      ready(S);
      await S.m.records.createRecordSaved(rec as never);
      const o = await S.m.transfers.offerTransfer(S.m.records.getRecord(rec.id)!, 'Leaf Lab', { quantity: '2 clones' });
      if ('error' in o) throw new Error(o.error);
      return S.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey);
    });
    return { S, rec, code };
  };

  it('L8: the claim’s answer is lost: the code is kept, and "Finish receiving" works (lab #3)', async () => {
    const { code } = await sender('S8');
    const L = await browser('L8');
    let lost = false;
    reg.misbehave.fault = (method, path) => {
      if (method === 'POST' && path.endsWith('/claim') && !lost) {
        lost = true;
        return 'lose';
      }
      return undefined;
    };
    await L.run(async () => {
      ready(L);
      expect(await L.m.receive.readyToReceive()).toEqual({ ok: true });
      const p = L.m.transfers.parseShareCode(code);
      const res = await L.m.receive.claimWithCode(code);
      expect(res).toEqual({ error: 'could not reach the registry' });
      expect(L.m.transfers.receivingCodeFor(p.transferId)).toBe(code);
      // What the claim screen used to do next (no stub in the stale list: forget the code) is
      // refused by the store itself: no definite refusal is on record for this code.
      L.m.transfers.forgetReceivingCode(p.transferId);
      expect(L.m.transfers.receivingCodeFor(p.transferId)).toBe(code);
      const again = await L.m.receive.claimWithCode(code);
      expect('error' in again && again.definite).toBe(true);
      expect(L.m.transfers.receivingCodeFor(p.transferId)).toBe(code); // its stub is here: kept
      const r = L.m.records.allRecords().find((x) => x.transferId?.toUpperCase() === p.transferId)!;
      expect(L.m.receive.keptCodeFor(r)).toBe(code);
      const fin = await L.m.receive.finishReceiving(r.id, code);
      if ('error' in fin) throw new Error(fin.error);
      expect(fin.record.quantity).toBe('2 clones');
    });
  });

  it('L9: a code made before sealing, not finished, then the sender’s record converts: it still finishes (lab #4)', async () => {
    const H = newHolder();
    const seed = await browser('ll-seed');
    const src = await plant(seed, { strainName: 'Old Mother' });
    reg.putLegacy(H, src);
    const t = reg.putLegacyTransfer(H, src.id, { quantity: '3 clones', note: 'old code' });
    const code = `${t.transferId}.${t.claimCode}`;
    const L = await browser('ll-lab');
    let failed = false;
    reg.misbehave.fault = (method, path) =>
      method === 'PUT' && path === '/api/records' && !failed
        ? ((failed = true), new Response(JSON.stringify({ error: 'busy' }), { status: 503 }))
        : undefined;
    let recId = '';
    await L.run(async () => {
      ready(L);
      const claim = await L.m.receive.claimWithCode(code);
      if ('error' in claim) throw new Error(claim.error);
      recId = claim.recordId;
      await L.m.records.hydrate();
      const fin = await L.m.receive.finishReceiving(recId, code, claim);
      expect('error' in fin).toBe(true);
    });
    reg.misbehave.fault = null;
    const S = await browser('ll-sender');
    await S.run(async () => {
      S.m.holder.setHolderKey(H);
      await S.m.records.hydrate();
      await settle(100);
    });
    expect((await backUp(S)).ok).toBe(true);
    await settle(200);
    expect(reg.records.get(src.id)?.sealed).toBeTruthy();
    await L.run(async () => {
      await L.m.records.hydrate();
      const r = L.m.records.getRecord(recId)!;
      expect(L.m.receive.isUnfinishedReceipt(r)).toBe(true);
      const fin = await L.m.receive.finishReceiving(recId, L.m.receive.keptCodeFor(r)!);
      if ('error' in fin) throw new Error(fin.error);
      expect(fin.record).toMatchObject({ bredBy: 'Hunter', quantity: '3 clones' });
    });
  });

  it('L10: a sample received before the upgrade says "save and check a backup first" (lab-legacy)', async () => {
    const LAB = newHolder();
    const L = await browser('lls-lab');
    const received = await plant(L, { notes: '' });
    reg.putLegacy(LAB, { ...received, receivedFrom: 'VEIL-SRC', transferId: 'TR-0000000A' });
    await L.run(async () => {
      L.m.holder.setHolderKey(LAB);
      await L.m.records.hydrate();
      const r = L.m.records.getRecord(received.id)!;
      expect(L.m.receive.isUnfinishedReceipt(r)).toBe(false);
      expect(L.m.receive.receiptBlocker(r)).toBe('app.sealed.recv.backupFirst');
    });
  });

  it('L1 for labs: a browser whose key isn’t in a checked backup is told before it claims', async () => {
    const { code } = await sender('S1b');
    const N = await browser('N1b');
    await N.run(async () => {
      expect(await N.m.receive.readyToReceive()).toEqual({ words: 'app.sealed.recv.backupFirstClaim' });
      expect(N.m.vault.vaultKeyIfAny()).toBeTruthy(); // made here, so the backup holds it
    });
    expect(reg.transfers.get(N.m.transfers.parseShareCode(code).transferId)?.claimedBy).toBeUndefined();
  });
});

describe('L11: the name given to a recipient of a record saved before sealing is kept', () => {
  it('no refusal after the send; the name shows, and goes sealed with the record once it is converted (upgrade #3)', async () => {
    const H = newHolder();
    const A = await browser('L11');
    const r1 = await plant(A);
    reg.putLegacy(H, r1);
    let id = '';
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      await settle(100);
      const sent = await A.m.transfers.offerTransfer(A.m.records.getRecord(r1.id)!, 'Dr. Maya at Leaf Lab', {
        quantity: '2 clones',
      });
      if ('error' in sent) throw new Error(sent.error);
      id = sent.transferId;
      await settle(100);
      expect(A.m.records.sentToName(r1.id, id)).toBe('Dr. Maya at Leaf Lab');
    });
    const A2 = await browser('L11b', {}, 'L11');
    await A2.run(async () => {
      await A2.m.records.hydrate();
      expect(A2.m.records.sentToName(r1.id, id)).toBe('Dr. Maya at Leaf Lab');
    });
    expect((await backUp(A2)).ok).toBe(true);
    await settle(200);
    const key = await A2.run(() => A2.m.vault.vaultKeyIfAny()!);
    const C = await browser('L11c');
    await C.run(async () => {
      C.m.holder.setHolderKey(H);
      await C.m.backup.restoreAny(
        fileOf(JSON.stringify({ format: 'veilcore-backup', version: 3, holderKey: H, vaultKey: key, records: [] })),
      );
      await C.m.records.hydrate();
      expect(C.m.records.sentToName(r1.id, id)).toBe('Dr. Maya at Leaf Lab');
    });
  });
});

describe('L12: a refused save never takes away what was typed', () => {
  it('the key check is rate-limited: the first record stays, kept in this browser, and is saved later (misc #1)', async () => {
    const N = await browser('L12');
    reg.misbehave.refuseLicenseGets = 1;
    const typed = await plant(N, { strainName: 'First ever plant', notes: 'a long story typed on a phone' });
    await N.run(async () => {
      N.m.records.createRecord(typed as never);
      await settle(200);
      expect(N.m.records.getRecord(typed.id)).toBeTruthy();
      expect(N.m.records.unsavedReason(typed.id)).toBeTruthy();
    });
    const N2 = await browser('L12b', {}, 'L12');
    await N2.run(async () => {
      await N2.m.records.hydrate();
      expect(N2.m.records.getRecord(typed.id)?.notes).toBe('a long story typed on a phone');
      ready(N2);
    });
    expect((await backUp(N2)).ok).toBe(true);
    await settle(200);
    expect(reg.records.get(typed.id)?.sealed).toBeTruthy();
  });
});

describe('L13: a key in use is marked in use; storage that refuses writes is said plainly', () => {
  it('the first save’s answer is lost: the next load marks the key in use, and another key’s file is refused (lostresp)', async () => {
    const Lp = await browser('lr-laptop');
    let lost = false;
    reg.misbehave.fault = (method, path) => {
      if (method === 'PUT' && path === '/api/records' && !lost) {
        lost = true;
        return 'lose';
      }
      return undefined;
    };
    let H = '';
    let id = '';
    await Lp.run(async () => {
      ready(Lp);
      const out = await Lp.m.records.createRecordSaved((await plant(Lp)) as never);
      expect(out.result.offline).toBe(true);
      id = out.record.id;
      H = Lp.m.holder.holderKeyIfAny()!;
      await Lp.m.records.hydrate();
      expect(Lp.m.api.rowStateOf(RECORDS, id)).toBe('open');
      expect(Lp.m.vault.vaultHasSealed()).toBe(true);
    });
    reg.misbehave.fault = null;
    const P = await browser('lr-phone');
    const phoneBackup = await P.run(() => {
      P.m.holder.setHolderKey(H);
      P.m.vault.mintVault();
      return JSON.stringify(P.m.backup.backupContents());
    });
    await Lp.run(async () => {
      await expect(Lp.m.backup.restoreAny(fileOf(phoneBackup))).rejects.toThrow(/different key/);
      await Lp.m.records.hydrate();
      expect(Lp.m.api.rowStateOf(RECORDS, id)).toBe('open');
    });
  });

  it('a browser whose storage refuses writes says so in plain words when restoring (misc #2)', async () => {
    const A = await browser('qe-owner');
    const backup = await A.run(() => {
      ready(A);
      return JSON.stringify(A.m.backup.backupContents());
    });
    const P = await browser('qe-blocked', { throwOnSet: true });
    await P.run(async () => {
      await expect(P.m.backup.restoreAny(fileOf(backup))).rejects.toThrow(/won’t keep anything/);
      await expect(P.m.backup.restoreAny(fileOf(backup))).rejects.not.toThrow(/QuotaExceededError/);
    });
    const { enT } = await import('../i18n/translate');
    expect(A.m.holder.STORAGE_REFUSED).toBe(enT.t('app.sealed.backup.storageRefused'));
  });
});

describe('deploy window: a grant changed in an old tab is not silently reverted', () => {
  it('the new site shows the difference and lets the holder choose (deploy)', async () => {
    const A = await browser('dw');
    const rec = await plant(A, { parents: [{ name: 'Pub Parent' }] });
    await A.run(async () => {
      ready(A);
      await A.m.records.createRecordSaved(rec as never);
      const g = await A.m.disclosure.saveGrant(
        A.m.records.getRecord(rec.id)!,
        A.m.disclosure.disclosureFrom(['existence', 'parent-names']),
      );
      expect('error' in g).toBe(false);
    });
    // The old site, in another tab, saves a grant without values.
    reg.grants.set(rec.id, { ...reg.grants.get(rec.id)!, show: ['existence'], values: null });
    const A2 = await browser('dw2', {}, 'dw');
    reg.sent.length = 0;
    await A2.run(async () => {
      await A2.m.records.hydrate();
      await settle(150);
      await A2.m.disclosure.syncGrants(A2.m.records.getRecord);
    });
    expect(grantPuts()).toEqual([]);
    expect(reg.grants.get(rec.id)?.show).toEqual(['existence']);
    expect(await A2.run(() => A2.m.disclosure.grantDifferenceOf(rec.id))).toEqual(['existence']);
    // The holder keeps the choice sealed with the record: it is published again.
    expect(await A2.run(() => A2.m.disclosure.keepSealedGrant(A2.m.records.getRecord(rec.id)!))).toBe(true);
    expect(JSON.stringify(reg.grants.get(rec.id)?.values)).toContain('Pub Parent');
    expect(await A2.run(() => A2.m.disclosure.grantDifferenceOf(rec.id))).toBeUndefined();
  });
});

// ======================================== sealed sample details (CONTRACT.md #27) under round 3

describe('sealed sample details, with round 3’s checked backup first', () => {
  const typed = {
    sampleId: 'R3-SAMPLE-Zq1',
    sealNumber: 'R3-SEAL-4471-Zq2',
    takenFrom: 'R3-bench-2-Zq3',
    witness: 'R3-witness-Zq4',
  };
  const arrived = {
    sampleId: 'R3-SAMPLE-Zq1',
    sealNumber: 'R3-SEAL-4417-Zq5',
    sealIntact: 'yes' as const,
    arrivedOn: '2026-10-15',
    condition: 'R3-cold-bag-Zq6',
  };
  const anyRequestHas = (v: string) => reg.sent.some((r) => r.url.includes(v) || r.body.includes(v));

  it('sender and lab each check a backup before anything is sealed; both sides go sealed; the sender sees "covered" and the differences', async () => {
    const Br = await browser('C27-breeder');
    const rec = await plant(Br);
    // Before a checked backup the plant waits in this browser, and can't be sent from.
    const early = await Br.run(async () => {
      Br.m.holder.holderKey();
      await Br.m.records.createRecordSaved(rec as never);
      return Br.m.transfers.offerTransfer(Br.m.records.getRecord(rec.id)!, 'Lab', { sample: typed });
    });
    expect('error' in early).toBe(true);
    expect(recordPuts()).toHaveLength(0);
    expect(reg.transfers.size).toBe(0);
    expect((await backUp(Br)).ok).toBe(true);
    await settle(200);
    expect(reg.records.get(rec.id)?.sealed).toBeTruthy();

    const { code, transferId, offerKey } = await Br.run(async () => {
      const o = await Br.m.transfers.offerTransfer(Br.m.records.getRecord(rec.id)!, 'Lab', { sample: typed });
      if ('error' in o) throw new Error(o.error);
      expect(o.sampleError).toBeUndefined();
      await settle(200);
      return {
        code: Br.m.transfers.shareCodeFor(o.transferId, o.claimCode, undefined, o.offerKey),
        transferId: o.transferId,
        offerKey: o.offerKey,
      };
    });
    // The offer key is kept inside the sender's sealed record, and the record went sealed.
    expect(await Br.run(() => Br.m.records.getRecord(rec.id)?.offerKeys?.[transferId])).toBe(offerKey);
    const stored = reg.transfers.get(transferId)!;
    expect(Object.keys(stored.sample as object).sort()).toEqual(['alg', 'ct', 'iv', 'kid', 'v']);

    // The lab: told to check a backup before it claims; nothing is claimed until it does.
    const Lab = await browser('C27-lab');
    await Lab.run(async () => {
      expect(await Lab.m.receive.readyToReceive()).toEqual({ words: 'app.sealed.recv.backupFirstClaim' });
    });
    expect(stored.claimedBy).toBeUndefined();
    expect((await backUp(Lab)).ok).toBe(true);
    const digest = await Lab.run(async () => {
      expect(await Lab.m.receive.readyToReceive()).toEqual({ ok: true });
      const parsed = Lab.m.transfers.parseShareCode(code);
      const res = await Lab.m.transfers.claimTransfer(parsed.transferId, parsed.claimCode);
      if ('error' in res) throw new Error(res.error);
      expect(res.sample).toBeUndefined();
      await Lab.m.records.hydrate();
      const out = await Lab.m.receive.finishReceiving(res.recordId, code, res);
      if ('error' in out) throw new Error(out.error);
      expect(out.record.offerKeys?.[transferId]).toBe(offerKey);
      const before = await Lab.m.transfers.custodyOf(transferId);
      if ('error' in before) throw new Error(before.error);
      expect(before).toMatchObject({ sealed: true, sample: typed });
      const set = await Lab.m.transfers.setArrival(transferId, arrived);
      if ('error' in set) throw new Error(set.error);
      expect(set).toMatchObject({ sealed: true, arrival: arrived });
      return Lab.m.transfers.custodyDigestV2(transferId, before.salt!, before.sample, arrived);
    });
    expect(Object.keys(stored.arrival as object).sort()).toEqual(['alg', 'ct', 'iv', 'kid', 'v']);
    reg.setReceipt(transferId, `att_${'ab'.repeat(8)}_sc2_${digest}`);

    // The sender's app opens both sides with the key in its sealed record and compares them.
    const mine = await Br.run(async () => (await Br.m.transfers.sentByMe()).find((t) => t.id === transferId)!);
    expect(mine).toMatchObject({
      custodyFormat: 2,
      custodyDigest: digest,
      arrival_custody: { condition: arrived.condition },
    });
    const view = (await import('./custody')).custodyView(mine, `att_${'ab'.repeat(8)}_sc2_${digest}`)!;
    expect(view.signed).toBe('covered');
    expect(view.differences).toEqual([`Seal number differs: sent ${typed.sealNumber}, received ${arrived.sealNumber}`]);
    // Nothing typed about the sample reached the registry in any request.
    for (const v of [...Object.values(typed), arrived.sealNumber, arrived.condition])
      expect(anyRequestHas(v), v).toBe(false);
  });

  it('a record saved before sealing: its delivery’s offer key waits beside it, then goes sealed into it; a server’s offer key is never used', async () => {
    const H = newHolder();
    const A = await browser('C27-legacy');
    const r1 = await plant(A);
    // The registry also slips an offer key of its own into the plain row (as it could the lock, P1).
    reg.putLegacy(H, { ...r1, offerKeys: { 'TR-EVIL0001': 'A'.repeat(43) } });
    let transferId = '';
    let offerKey = '';
    await A.run(async () => {
      A.m.holder.setHolderKey(H);
      await A.m.records.hydrate();
      await settle(100);
      expect(A.m.records.getRecord(r1.id)?.offerKeys).toBeUndefined();
      expect(A.m.records.offerKeyInRecords('TR-EVIL0001')).toBeUndefined();
      const o = await A.m.transfers.offerTransfer(A.m.records.getRecord(r1.id)!, 'Leaf Lab', { sample: typed });
      if ('error' in o) throw new Error(o.error);
      transferId = o.transferId;
      offerKey = o.offerKey;
      await settle(100);
    });
    // A reload: the key is still here, waiting beside the plain record, never sent readable.
    const A2 = await browser('C27-legacy-b', {}, 'C27-legacy');
    await A2.run(async () => {
      await A2.m.records.hydrate();
      expect(A2.m.records.offerKeyInRecords(transferId)).toBe(offerKey);
    });
    expect(anyRequestHas(offerKey)).toBe(false);
    expect((await backUp(A2)).ok).toBe(true);
    await settle(300);
    expect(reg.records.get(r1.id)?.sealed).toBeTruthy();
    expect(anyRequestHas(offerKey)).toBe(false);
    // A new device with the holder and vault keys only (no lab codes kept): the key comes back from the sealed record.
    const key = await A2.run(() => A2.m.vault.vaultKeyIfAny()!);
    const C = await browser('C27-legacy-c');
    await C.run(async () => {
      C.m.holder.setHolderKey(H);
      await C.m.backup.restoreAny(
        fileOf(JSON.stringify({ format: 'veilcore-backup', version: 3, holderKey: H, vaultKey: key, records: [] })),
      );
      await C.m.records.hydrate();
      expect(C.m.transfers.sentCodeFor(transferId)).toBeUndefined();
      expect(C.m.records.offerKeyInRecords(transferId)).toBe(offerKey);
      const mine = (await C.m.transfers.sentByMe()).find((t) => t.id === transferId)!;
      expect(mine.custodyLocked).toBeUndefined();
      expect(mine.sample_custody).toMatchObject(typed);
    });
  });
});
