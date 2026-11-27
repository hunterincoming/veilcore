// The backup restore drill (docs/runbooks/backup-restore-drill.md), for claims about two records
// (two-record-claims.ts): a holder who proved two of their records are different gets that claim
// back from the backup file alone, on both records, and can still copy its link.
//
// Before this, the file left them out (PR #231, fourth review): with the registry gone, a
// restored device lost them (the registry's sealed copy of a record carries them, so a restore
// with the registry there got them from it). They now travel in the file's `heldEvidence`
// under each record (held-evidence.ts), and go back only when they check against both records
// here, never on the file's word. Kept apart from restore-drill.test.ts so that file's set, and
// its counts, stay as they are. All names and numbers are practice data.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRegistry, type FakeRegistry } from './fixtures/fake-registry';
import { browser, fileOf, installStorage, settle, type Browser } from './fixtures/browsers';
import { stubWebLocks } from './fixtures/web-locks';
import type { HeldTwoClaim } from './two-record-claims';

const PASSWORD = 'practice drill password';
const POTENCY = 'veilcore/schema/potency/v1';
const CONTRACT = 'c1'.repeat(32);
const TWO_TX = 'e3'.repeat(32);

let reg: FakeRegistry;
let up = true;

beforeEach(() => {
  vi.unstubAllGlobals();
  installStorage();
  reg = fakeRegistry();
  up = true;
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
    if (!up) return Promise.reject(new TypeError('Failed to fetch'));
    return reg.fetch(String(input instanceof Request ? input.url : input), init);
  });
  stubWebLocks();
  (globalThis as { document?: unknown }).document ??= {
    visibilityState: 'visible',
    createElement: () => ({ click() {} }),
  };
});

type Made = { first: string; second: string; claim: HeldTwoClaim };

/** Two certificates with numbers, and "these two are different" proved on them, as the app does it. */
const makeThePair = async (A: Browser): Promise<Made> =>
  A.run(async () => {
    const m = A.m;
    const { makeFieldSet } = await import('./field-set');
    const doc = async (title: string, values: (bigint | null)[]) =>
      m.records.createRecord(
        await m.seal.sealDocumentRecord({
          title,
          type: 'certificate-of-analysis',
          issuer: 'Practice Lab',
          reference: title,
          issued: '2026-11-01',
          files: [{ name: 'certificate.pdf', sha256: 'cd'.repeat(32), size: 2048 }],
          about: [],
          holder: 'Practice Breeder',
          notes: 'a certificate with numbers, for the restore drill',
          fieldSet: await makeFieldSet(POTENCY, values),
        }),
      );
    // Potency numbers by slot: total THC (0), total CBD (3); the rest left off the certificate.
    const nums = (thc: bigint, cbd: bigint) => [thc, null, null, cbd, ...Array<null>(12).fill(null)];
    const a = await doc('Drill potency A (test data)', nums(2210n, 40n));
    const b = await doc('Drill potency B (test data)', nums(1870n, 610n));
    await settle(150);
    // The vault key in a checked backup first: until then nothing is saved on the registry.
    const text = await m.backup.backupFileText(PASSWORD);
    expect(await m.backup.checkBackup(fileOf(text), PASSWORD)).toMatchObject({ ok: true });
    await settle(300);
    // Proved the way the page proves it (prove-two.ts), with Midnight's answer stood in for.
    const { proveDistinct } = await import('./prove-two');
    const claim = await proveDistinct(m.records.getRecord(a.id)!, m.records.getRecord(b.id)!, {
      calls: {
        proveDistinctOnChain: () => Promise.resolve({ contract: CONTRACT, txId: TWO_TX, blockHeight: 303 }),
        proveUnchangedOnChain: () => Promise.reject(new Error('not used')),
      },
    });
    return { first: a.id, second: b.id, claim };
  });

const backUp = (b: Browser) =>
  b.run(async () => {
    const text = await b.m.backup.backupFileText(PASSWORD);
    expect(await b.m.backup.checkBackup(fileOf(text), PASSWORD)).toMatchObject({ ok: true });
    return text;
  });

const restoreInto = async (name: string, text: string, password: string | undefined = PASSWORD) => {
  const b = await browser(name);
  expect(b.storage.size).toBe(0);
  const out = await b.run(() => b.m.backup.restoreAny(fileOf(text), password));
  await b.run(async () => {
    await b.m.records.hydrate();
    await settle(300);
  });
  return { b, out };
};

const twoClaimsOn = (b: Browser, id: string) => b.run(() => b.m.records.getRecord(id)?.twoClaims ?? []);

const opened = (b: Browser, text: string) => b.run(() => b.m.backup.unlockBackup(JSON.parse(text) as never, PASSWORD));

describe('the restore drill: claims about two records', () => {
  it.each([
    ['with the registry still there (a new phone)', false],
    ['with the registry gone', true],
  ])(
    '%s, the file brings the claim back on both records, byte for byte, and its link still copies',
    async (_w, gone) => {
      const A = await browser('breeder');
      const made = await makeThePair(A);
      expect(await twoClaimsOn(A, made.first)).toEqual([made.claim]);
      expect(await twoClaimsOn(A, made.second)).toEqual([made.claim]);
      const text = await backUp(A);
      if (gone) up = false;
      const { b: N, out } = await restoreInto('breeder-new-device', text);
      // With the registry there, the records come from its sealed copy, claim and all, and the
      // file adds nothing; with it gone, the file puts the one claim back, once, onto both records.
      expect(out.fromFile).toMatchObject(gone ? { added: 2 } : { alreadyHere: 2 });
      expect(out.evidence ?? 0).toBe(gone ? 1 : 0);
      expect(await twoClaimsOn(N, made.first)).toEqual([made.claim]);
      expect(await twoClaimsOn(N, made.second)).toEqual([made.claim]);
      // And it still works: its link is made at once, and the check page's reader takes it.
      const link = await N.run(async () => {
        const { twoClaimLinkNow } = await import('./link-hashes');
        return twoClaimLinkNow(N.m.records.getRecord(made.first)!.twoClaims![0], 'https://veilcore.org');
      });
      const { readTwoClaimLink } = await import('./two-record-claims');
      expect(readTwoClaimLink(link!.slice(link!.indexOf('#')))).toMatchObject({
        txId: TWO_TX,
        record: made.claim.record,
        other: made.claim.other,
      });
    },
  );

  it('restoring the same file twice adds nothing', async () => {
    const A = await browser('breeder');
    const made = await makeThePair(A);
    const text = await backUp(A);
    up = false;
    const { b: N } = await restoreInto('breeder-new-device', text);
    const again = await N.run(() => N.m.backup.restoreAny(fileOf(text), PASSWORD));
    expect(again.evidence ?? 0).toBe(0);
    expect(await twoClaimsOn(N, made.first)).toEqual([made.claim]);
    expect(await twoClaimsOn(N, made.second)).toEqual([made.claim]);
  });

  // Never on the file's word: a doctored file, with the registry gone, writes none of them.
  const doctored = async (doctor: (ev: Record<string, Record<string, unknown>>, m: Made) => void) => {
    const A = await browser('breeder');
    const made = await makeThePair(A);
    const inner = await opened(A, await backUp(A));
    const ev = inner.heldEvidence as Record<string, Record<string, unknown>>;
    expect(Object.keys(ev).sort()).toEqual([made.first, made.second].sort());
    doctor(ev, made);
    up = false;
    const N = await browser('new-device');
    const out = await N.run(() => N.m.backup.restoreAny(fileOf(JSON.stringify(inner))));
    expect(out.fromFile).toMatchObject({ added: 2 });
    expect(out.evidence ?? 0, 'nothing from the file was put back').toBe(0);
    expect(await twoClaimsOn(N, made.first)).toEqual([]);
    expect(await twoClaimsOn(N, made.second)).toEqual([]);
  };
  const both = (ev: Record<string, Record<string, unknown>>, m: Made, c: unknown) => {
    ev[m.first] = { twoClaims: [c] };
    ev[m.second] = { twoClaims: [c] };
  };

  it('a claim with its two records the other way round is not put back', async () => {
    await doctored((ev, m) => both(ev, m, { ...m.claim, ids: [m.second, m.first] }));
  });

  it('a claim naming another record’s commitment is not put back', async () => {
    await doctored((ev, m) => both(ev, m, { ...m.claim, other: 'ab'.repeat(32) }));
  });

  it('a claim with another key binding, or none, is not put back', async () => {
    await doctored((ev, m) => both(ev, m, { ...m.claim, keyBinding: 'ab'.repeat(32) }));
    await doctored((ev, m) => {
      const { otherKeyBinding: _o, ...c } = m.claim;
      void _o;
      both(ev, m, c);
    });
  });

  it('a claim naming a record that isn’t here, or the same record twice, is not put back', async () => {
    await doctored((ev, m) => both(ev, m, { ...m.claim, ids: [m.first, 'VEIL-NOT-HERE'] }));
    await doctored((ev, m) => both(ev, m, { ...m.claim, ids: [m.first, m.first], other: m.claim.record }));
  });
});
