// A lab's signed result held by the lab and by the breeder it was signed for (records.ts
// StrainRecord.copy). The lab keeps the result as a record it holds, so the proof code is the
// lab's on VeilCore, which refuses it from anyone else ("already registered by another
// holder"). The breeder's copy keeps the proof code inside its locked copy only: VeilCore keeps
// the copy, and what the breeder keeps on it, and nothing of the proof code goes to VeilCore
// from the breeder. A copy added before this is made a copy at its next save.
//
// Against the in-memory registry with the real one's first-holder rule (fixtures/fake-registry.ts),
// and browsers with their own modules and storage (fixtures/browsers.ts).
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import { datingRowOf, privatePart, publicPart } from './api-store';
import type { MadeClaim } from './claim-link';
import type { NewRecordInput } from './records';

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

const until = async (check: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('still not true');
    await settle(20);
  }
};
const backUp = async (b: Browser) =>
  b.run(async () => b.m.backup.checkBackup(fileOf(JSON.stringify(b.m.backup.backupContents()))));
const holderOf = async (b: Browser) => (await b.run(() => b.m.holder.holderKeyIfAny())) as string;

/** A record as the lab's browser keeps a result it signed: sealed, with the result and the lab's signature beside it. */
const labResultRecord = (b: Browser) =>
  b.run(async () => {
    const { sealRecord } = await import('./seal-record');
    const sealed: NewRecordInput = await sealRecord({
      strainName: 'LAB-COPY-1',
      bredBy: 'Practice Lab',
      dateCreated: '2026-11-18',
      notes: '',
      parents: [],
      photoFingerprints: [],
    } as never);
    // The result and the lab's signature are outside the proof code: what they hold doesn't matter here.
    const out: NewRecordInput = {
      ...sealed,
      labResult: { statement: { kind: 'pathogen' } } as never,
      labSignature: {
        key: 'ab'.repeat(32),
        record: 'cd'.repeat(32),
        sig: 'ef'.repeat(64),
        about: '01'.repeat(32),
      } as never,
    };
    return out;
  });

const claim = (record: string): MadeClaim => ({
  kind: 'range',
  contract: 'c1'.repeat(32),
  txId: '01'.repeat(32),
  blockHeight: 3600001,
  record,
  schema: 'veilcore/schema/pathogen/v1',
  slot: 1,
  op: 'at-most',
  bound: '0',
});

const datingPutsBy = (holder: string) =>
  reg.sent.filter((r) => r.method === 'PUT' && r.url.endsWith('/api/records/dating') && r.headers.includes(holder));

/** The lab signs and keeps a result; the breeder gets the same record, as the result file carries it. */
const labKeeps = async () => {
  const L = await browser('lab');
  const result = await labResultRecord(L);
  await L.run(async () => {
    L.m.records.createRecord(result);
    await settle(150);
  });
  expect((await backUp(L)).ok).toBe(true);
  const labHolder = await holderOf(L);
  await until(() => !!reg.rowsOf(labHolder).find((r) => r.id === result.id)?.sealed);
  expect(reg.rowsOf(labHolder).find((r) => r.id === result.id)?.recordFingerprint).toBe(result.recordFingerprint);
  return { result, labHolder };
};

describe('a copy of a record another holder dated', () => {
  it('on the wire: its proof code only inside the locked copy, no name code, never sent to be dated', () => {
    const r = {
      id: 'VEIL-1',
      labSignature: { key: 'k' },
      recordFingerprint: 'ab'.repeat(32),
      strainName: 'x',
      nameSalt: 'cd'.repeat(16),
      copy: true,
    };
    expect(publicPart(r)).toEqual({ id: 'VEIL-1' });
    expect(privatePart(r)).toMatchObject({ recordFingerprint: 'ab'.repeat(32), copy: true });
    expect(datingRowOf(r)).toBeUndefined();
    // Any other record as before.
    const { copy: _c, ...plain } = r;
    void _c;
    expect(publicPart(plain)).toEqual({ id: 'VEIL-1', recordFingerprint: 'ab'.repeat(32) });
    expect(privatePart(plain).recordFingerprint).toBeUndefined();
    expect(datingRowOf(plain)).toEqual({ id: 'VEIL-1', recordFingerprint: 'ab'.repeat(32) });
    // The mark alone, without a lab's signature, makes nothing a copy.
    const { labSignature: _l, ...unsigned } = r;
    void _l;
    expect(publicPart(unsigned)).toEqual({ id: 'VEIL-1', recordFingerprint: 'ab'.repeat(32) });
    expect(datingRowOf(unsigned)).toEqual({ id: 'VEIL-1', recordFingerprint: 'ab'.repeat(32) });
  });

  it('the breeder adds the lab’s result as a copy: VeilCore keeps it, and a claim on it survives a reload', async () => {
    const { result, labHolder } = await labKeeps();
    const B = await browser('breeder');
    const copyId = 'VEIL-COPY-' + Date.now().toString(16).toUpperCase();
    await B.run(async () => {
      B.m.records.createRecord({ ...result, id: copyId, copy: true });
      await settle(150);
    });
    expect((await backUp(B)).ok).toBe(true);
    const H = await holderOf(B);
    await until(() => !!reg.rowsOf(H).find((r) => r.id === copyId)?.sealed);
    const row = reg.rowsOf(H).find((r) => r.id === copyId)!;
    // Nothing of the lab's proof code in the clear, as a name code, or sent to be dated.
    expect(row.recordFingerprint).toBeUndefined();
    expect(row.nameCode).toBeUndefined();
    expect(JSON.stringify(row)).not.toContain(result.recordFingerprint);
    expect(datingPutsBy(H).filter((p) => p.body.includes(result.recordFingerprint))).toEqual([]);
    expect(reg.sent.filter((p) => p.headers.includes(H) && p.body.includes(result.recordFingerprint))).toEqual([]);

    // A claim on it is saved with it.
    const revBefore = row.rev as number;
    await B.run(() => B.m.records.addClaim(copyId, claim(result.recordFingerprint)));
    await until(() => (reg.rowsOf(H).find((r) => r.id === copyId)?.rev as number) > revBefore);
    // A reload reads it back from VeilCore: the result, its proof code, and the claim.
    const B2 = await browser('breeder-reload', {}, 'breeder');
    await B2.run(async () => {
      await B2.m.records.hydrate();
      await settle(150);
      const back = B2.m.records.getRecord(copyId);
      expect(back?.copy).toBe(true);
      expect(back?.recordFingerprint).toBe(result.recordFingerprint);
      expect(back?.claims).toEqual([claim(result.recordFingerprint)]);
      expect(B2.m.api.rowStateOf('veilcore.records.v1', copyId)).toBe('open');
      expect(B2.m.records.unsavedReason(copyId)).toBeUndefined();
    });
    // The lab's record is untouched: still the lab's, by the proof code.
    expect(reg.rowsOf(labHolder).find((r) => r.id === result.id)?.recordFingerprint).toBe(result.recordFingerprint);
  });

  it('a result added before copies (sent with its proof code) is made a copy at its next save, and its claim kept', async () => {
    const { result } = await labKeeps();
    const B = await browser('breeder-old');
    const copyId = 'VEIL-OLD-' + Date.now().toString(16).toUpperCase();
    // As the check page added it before: the lab's record, under a new id, with nothing marking it.
    await B.run(async () => {
      B.m.records.createRecord({ ...result, id: copyId });
      B.m.records.addClaim(copyId, claim(result.recordFingerprint));
      await settle(150);
    });
    expect((await backUp(B)).ok).toBe(true);
    const H = await holderOf(B);
    await until(() => !!reg.rowsOf(H).find((r) => r.id === copyId)?.sealed);
    expect(reg.rowsOf(H).find((r) => r.id === copyId)?.recordFingerprint).toBeUndefined();
    const B2 = await browser('breeder-old-reload', {}, 'breeder-old');
    await B2.run(async () => {
      await B2.m.records.hydrate();
      await settle(150);
      const back = B2.m.records.getRecord(copyId);
      expect(back?.copy).toBe(true);
      expect(back?.claims).toEqual([claim(result.recordFingerprint)]);
      expect(B2.m.outbox.inOutbox(copyId)).toBe(false);
    });
    // Said once, in the browser that made it a copy, and gone when dismissed.
    expect(await B.run(() => B.m.records.copiesMadeNow())).toEqual([
      { id: copyId, name: 'LAB-COPY-1', lab: 'Practice Lab' },
    ]);
    await B.run(() => B.m.records.clearCopiesMade());
    expect(await B.run(() => B.m.records.copiesMadeNow())).toEqual([]);
  });

  it('a result signed by this browser’s own lab key is never made a copy', async () => {
    const { result } = await labKeeps();
    const B = await browser('other-lab-browser');
    const id = 'VEIL-OWN-' + Date.now().toString(16).toUpperCase();
    await B.run(async () => {
      const { createAttester } = await import('./attester-keys');
      const { claimsKeyFor } = await import('./claims-key');
      const a = await createAttester('Practice Lab', 'laboratory');
      const key = claimsKeyFor(a.keypair.privateKey).keyText;
      B.m.records.createRecord({ ...result, id, labSignature: { ...(result.labSignature as object), key } as never });
      await settle(150);
    });
    expect((await backUp(B)).ok).toBe(true);
    await settle(400);
    const H = await holderOf(B);
    expect(reg.rowsOf(H).find((r) => r.id === id)).toBeUndefined();
    expect(await B.run(() => B.m.records.getRecord(id)?.copy)).toBeUndefined();
    expect(await B.run(() => B.m.records.copiesMadeNow())).toEqual([]);
  });

  it('a correction of a copy is the holder’s own record: not a copy, dated as theirs', async () => {
    const { result } = await labKeeps();
    const B = await browser('corrector');
    const copyId = 'VEIL-FIX-' + Date.now().toString(16).toUpperCase();
    await B.run(async () => {
      B.m.records.createRecord({ ...result, id: copyId, copy: true });
      await settle(150);
    });
    expect((await backUp(B)).ok).toBe(true);
    const H = await holderOf(B);
    await until(() => !!reg.rowsOf(H).find((r) => r.id === copyId)?.sealed);
    const fixed = await B.run(() => B.m.records.issueCorrection(copyId, { refId: 'MY-REF' }, 'my reference'));
    expect(fixed?.copy).toBeUndefined();
    await until(() => !!reg.rowsOf(H).find((r) => r.id === fixed!.id)?.sealed);
    const row = reg.rowsOf(H).find((r) => r.id === fixed!.id)!;
    expect(row.recordFingerprint).toBe(fixed!.recordFingerprint);
    expect(row.recordFingerprint).not.toBe(result.recordFingerprint);
  });

  it('a copy is never exported as the holder’s record', async () => {
    const { result } = await labKeeps();
    const B = await browser('exporter');
    const copyId = 'VEIL-EXP-' + Date.now().toString(16).toUpperCase();
    await B.run(async () => {
      B.m.records.createRecord({ ...result, id: copyId, copy: true });
      await expect(B.m.records.exportEnvelope(copyId)).rejects.toThrow(/copy of a result a lab keeps/);
    });
  });

  it('any other record refused for another holder’s proof code stays refused, and is never made a copy', async () => {
    const { result } = await labKeeps();
    const B = await browser('copier');
    const { labResult: _r, labSignature: _s, ...plain } = result;
    void _r;
    void _s;
    const id = 'VEIL-PLAIN-' + Date.now().toString(16).toUpperCase();
    await B.run(async () => {
      B.m.records.createRecord({ ...plain, id });
      await settle(150);
    });
    expect((await backUp(B)).ok).toBe(true);
    await settle(400);
    const H = await holderOf(B);
    expect(reg.rowsOf(H).find((r) => r.id === id)).toBeUndefined();
    expect(await B.run(() => B.m.records.getRecord(id)?.copy)).toBeUndefined();
    expect(
      reg.sent.some(
        (p) => p.headers.includes(H) && p.url.endsWith('/api/records') && p.body.includes(result.recordFingerprint),
      ),
    ).toBe(true);
  });
});
