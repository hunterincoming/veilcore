// A record is corrected once: two tabs (or a phone and a laptop) each correcting the same record
// must not leave two live corrections of it.
//   - issueCorrection asks the registry first, and makes nothing when it can't answer: one made
//     from this browser's copy alone, offline, could be a second correction of a record corrected
//     elsewhere meanwhile. One whose save goes offline is taken back, never kept to send later.
//   - A record that has a correction is refused, unless the very same correction (its whole
//     sealed body) with the same reason is asked for again (a retry whose first answer was lost):
//     then its latest version is returned and nothing is sent. The same change with another reason
//     is said as such: that reason wasn't saved.
//   - The registry refuses a second correction too (code "already-corrected"), for two saves that
//     both read before either wrote; that is said the same way.
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

type Row = { id: string; supersedes?: { recordId?: string }; supersededBy?: string };
const rows = () => [...reg.records.values()] as unknown as Row[];
const correctionsOf = (id: string) => rows().filter((r) => r.supersedes?.recordId === id);
/** The live corrections of a record on the registry. */
const liveCorrectionsOf = (id: string) => correctionsOf(id).filter((r) => !r.supersededBy);

/** Saves of records (not their dating) sent to the registry since `from`. */
const recordWritesSince = (from: number) =>
  reg.sent.slice(from).filter((s) => s.method === 'PUT' && new URL(s.url).pathname === '/api/records');

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

/** Another device: its own storage, the backup restored, synced. */
const device = async (name: string, backup: string) => {
  const d = await browser(name);
  await d.run(async () => {
    await d.m.backup.restoreAny(fileOf(backup));
    await d.m.records.hydrate();
  });
  return d;
};

/** What the record page's form sends, with these changes. */
const form = (o: Record<string, unknown>) => ({
  strainName: 'Bella pup 4',
  bredBy: 'Kennel Nord',
  breedingMethod: '',
  notes: '',
  ...o,
});

/** issueCorrection's answer: the id it returned, or the refusal (its words and latest version). */
const tryFix = async (b: Browser, id: string, edits: Record<string, unknown>, reason = 'r') =>
  b.run(async () => {
    try {
      const c = await b.m.records.issueCorrection(id, edits, reason);
      return { ok: c?.id };
    } catch (e) {
      return { err: (e as Error).message, latestId: (e as { latestId?: string }).latestId };
    }
  });

/** The connection goes for saves (reads still answer): the case a correction must not be kept for. */
const savesFail = (on: () => boolean) => {
  reg.misbehave.fault = (method, path) =>
    on() && method === 'PUT' && path.startsWith('/api/records') ? 'fail' : undefined;
};

describe('a record is corrected once', () => {
  it('tab B, after tab A added T4: another ID is refused with a clear message; T4 again is A’s correction, nothing sent', async () => {
    const { A, rec } = await saved();
    const B = await browser('B', {}, 'A');
    await B.run(() => B.m.records.hydrate());

    const t4 = await A.run(() => A.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(t4?.refId).toBe('T4');
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);

    // B never synced since: issueCorrection asks the registry first, and refuses.
    const before = reg.sent.length;
    const x4 = await tryFix(B, rec.id, { refId: 'X4' }, 'ID added');
    expect(x4.err).toBe(B.m.records.ALREADY_CORRECTED());
    expect(x4.latestId).toBe(t4?.id);
    expect(B.m.records.ALREADY_CORRECTED()).toMatch(/corrected already, in another tab or on another device/);
    // The same change again with the same reason (a retry whose answer was lost): A's
    // correction, nothing new sent.
    const again = await B.run(() => B.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    expect(again?.id).toBe(t4?.id);
    expect(again?.refId).toBe('T4');
    expect(recordWritesSince(before)).toEqual([]);
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
    expect(await B.run(() => B.m.records.getRecord(rec.id)?.supersededBy)).toBe(t4?.id);
    expect(await B.run(() => B.m.records.latestVersionOf(rec.id))).toBe(t4?.id);
  });

  it('another device (its own storage, the backup restored) is refused too', async () => {
    const { A, rec, backup } = await saved();
    const phone = await device('phone', backup);
    await A.run(() => A.m.records.issueCorrection(rec.id, form({ notes: 'from the laptop' }), 'notes'));
    const p = await tryFix(phone, rec.id, form({ notes: 'from the phone' }), 'notes');
    expect(p.err).toBe(phone.m.records.ALREADY_CORRECTED());
    expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
  });

  it('a correction can itself be corrected (once): the chain is followed to the latest version', async () => {
    const { A, rec } = await saved();
    const first = await A.run(() => A.m.records.issueCorrection(rec.id, { refId: 'T4' }, 'ID added'));
    const second = await A.run(() => A.m.records.issueCorrection(first!.id, { refId: 'T5' }, 'ID fixed'));
    expect(second?.refId).toBe('T5');
    expect(await A.run(() => A.m.records.latestVersionOf(rec.id))).toBe(second?.id);
    expect(liveCorrectionsOf(first!.id)).toHaveLength(1);
    const again = await tryFix(A, rec.id, { refId: 'T6' }, 'again');
    expect(again.err).toBe(A.m.records.ALREADY_CORRECTED());
    expect(again.latestId).toBe(second?.id);
  });

  it('a change still being saved when the correction starts is in the correction, not lost to the registry’s older copy', async () => {
    const { A, rec } = await saved();
    // Saved without waiting (the page's usual way), then corrected at once.
    await A.run(() => A.m.records.pairDna(rec.id, 'd7'.repeat(32), 'report.pdf'));
    const c = await A.run(() => A.m.records.issueCorrection(rec.id, form({ notes: 'fixed' }), 'typo'));
    expect(c?.dnaFingerprint).toBe('d7'.repeat(32));
    expect(await A.run(() => A.m.records.getRecord(rec.id)?.dnaFingerprint)).toBe('d7'.repeat(32));
  });

  describe('offline: never made or kept without the registry’s answer first', () => {
    it('the registry can’t be read: refused before anything is made or sent', async () => {
      const { A, rec } = await saved();
      reg.misbehave.fault = () => 'fail';
      const before = reg.sent.length;
      const a = await tryFix(A, rec.id, form({ notes: 'offline' }));
      expect(a.err).toBe(A.m.records.CORRECT_NEEDS_CONNECTION());
      expect(A.m.records.CORRECT_NEEDS_CONNECTION()).toMatch(/needs a connection.*Nothing was changed/);
      reg.misbehave.fault = null;
      expect(recordWritesSince(before)).toEqual([]);
      expect(await A.run(() => A.m.records.allRecords().length)).toBe(1);
      expect(await A.run(() => Object.keys(A.m.outbox.outboxRecords()))).toEqual([]);
      expect(correctionsOf(rec.id)).toHaveLength(0);
    });

    it('phone offline corrects, laptop corrects online, phone reconnects: one correction, the laptop’s', async () => {
      const { rec, backup } = await saved();
      const P = await device('P', backup);
      const L = await device('L', backup);
      let offline = true;
      savesFail(() => offline);
      const a = await tryFix(P, rec.id, form({ notes: 'phone offline' }));
      // Said, taken back, and nothing kept to send later.
      expect(a.err).toBe(P.m.records.CORRECTION_CONNECTION_LOST());
      expect(await P.run(() => P.m.records.getRecord(rec.id)?.supersededBy)).toBeUndefined();
      expect(await P.run(() => P.m.records.allRecords().length)).toBe(1);
      expect(await P.run(() => Object.keys(P.m.outbox.outboxRecords()))).toEqual([]);
      offline = false;
      const b = await tryFix(L, rec.id, form({ notes: 'laptop online' }));
      expect(b.ok).toBeDefined();
      for (let i = 0; i < 2; i++) {
        await P.run(() => P.m.records.hydrate());
        await new Promise((r) => setTimeout(r, 150));
      }
      expect(correctionsOf(rec.id).map((r) => r.id)).toEqual([b.ok]);
      expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
      expect(rows().find((r) => r.id === rec.id)?.supersededBy).toBe(b.ok);
      // The phone now sees the laptop's correction, and is refused.
      const c = await tryFix(P, rec.id, form({ notes: 'phone again' }));
      expect(c.err).toBe(P.m.records.ALREADY_CORRECTED());
      expect(c.latestId).toBe(b.ok);
    });

    it('both offline, both reconnect: no correction kept; then one can be made', async () => {
      const { rec, backup } = await saved();
      const P = await device('P', backup);
      const L = await device('L', backup);
      let offline = true;
      savesFail(() => offline);
      const a = await tryFix(P, rec.id, form({ notes: 'phone' }));
      const b = await tryFix(L, rec.id, form({ notes: 'laptop' }));
      expect(a.err).toBe(P.m.records.CORRECTION_CONNECTION_LOST());
      expect(b.err).toBe(L.m.records.CORRECTION_CONNECTION_LOST());
      offline = false;
      for (let i = 0; i < 3; i++) {
        await L.run(() => L.m.records.hydrate());
        await P.run(() => P.m.records.hydrate());
        await new Promise((r) => setTimeout(r, 150));
      }
      expect(correctionsOf(rec.id)).toHaveLength(0);
      const c = await tryFix(L, rec.id, form({ notes: 'laptop' }));
      expect(c.ok).toBeDefined();
      expect(liveCorrectionsOf(rec.id)).toHaveLength(1);
    });

    it('the answer is lost (the registry stored it): trying again is that correction, not a second', async () => {
      const { A, rec } = await saved();
      let lose = true;
      reg.misbehave.fault = (method, path) =>
        lose && method === 'PUT' && path === '/api/records' ? 'lose' : undefined;
      const a = await tryFix(A, rec.id, form({ notes: 'x' }), 'typo');
      expect(a.err).toBe(A.m.records.CORRECTION_CONNECTION_LOST());
      expect(correctionsOf(rec.id)).toHaveLength(1);
      lose = false;
      const before = reg.sent.length;
      const b = await tryFix(A, rec.id, form({ notes: 'x' }), 'typo');
      expect(b.ok).toBe(correctionsOf(rec.id)[0].id);
      expect(recordWritesSince(before)).toEqual([]);
      expect(correctionsOf(rec.id)).toHaveLength(1);
    });
  });

  describe('the very same correction', () => {
    it('chain R → B → C: R with B’s change and reason again gives C, the latest, not B', async () => {
      const { A, rec, backup } = await saved();
      const P = await device('P', backup);
      const B = await tryFix(A, rec.id, form({ notes: 'b' }), 'b');
      await P.run(() => P.m.records.hydrate());
      const C = await tryFix(A, B.ok!, form({ notes: 'c' }), 'c');
      // P has not synced since B: issueCorrection reads the registry first.
      const same = await tryFix(P, rec.id, form({ notes: 'b' }), 'b');
      expect(same.ok).toBe(C.ok);
      const other = await tryFix(P, B.ok!, form({ notes: 'p' }), 'p');
      expect(other.err).toBe(P.m.records.ALREADY_CORRECTED());
      expect(other.latestId).toBe(C.ok);
      expect(liveCorrectionsOf(B.ok!)).toHaveLength(1);
    });

    it('the same change from another device with another reason: said, not taken as saved', async () => {
      const { A, rec, backup } = await saved();
      const P = await device('P', backup);
      const a = await tryFix(A, rec.id, form({ notes: 'same' }), 'reason one');
      const before = reg.sent.length;
      const b = await tryFix(P, rec.id, form({ notes: 'same' }), 'another reason');
      expect(b.err).toBe(P.m.records.CORRECTED_SAME_WAY());
      expect(P.m.records.CORRECTED_SAME_WAY()).toMatch(/same way.*reason wasn’t saved/);
      expect(b.latestId).toBe(a.ok);
      expect(recordWritesSince(before)).toEqual([]);
    });

    it('the same form fields, but the stored correction changed more: refused, never taken as the same', async () => {
      const { A, rec, backup } = await saved();
      const P = await device('P', backup);
      // Another device changed the notes and the ID together.
      await tryFix(A, rec.id, form({ notes: 'x', refId: 'T1' }), 'typo');
      // This one types the same notes and reason, and nothing else.
      const b = await tryFix(P, rec.id, form({ notes: 'x' }), 'typo');
      expect(b.err).toBe(P.m.records.ALREADY_CORRECTED());
      expect(correctionsOf(rec.id)).toHaveLength(1);
    });
  });

  describe('the registry refuses a second correction (code "already-corrected")', () => {
    it('two devices read before either saved: the second is refused by the registry, taken back and said', async () => {
      const { rec, backup } = await saved();
      reg.misbehave.oneCorrection = true;
      const P = await device('P', backup);
      const L = await device('L', backup);
      // P's read answers as the registry was before L saved: the moment both have read and
      // neither has written. Every rev check is passed; only the registry's one-correction rule
      // stands in the way.
      const get = reg.sent.find((s) => s.method === 'GET' && new URL(s.url).pathname === '/api/records')!;
      const stale = await (
        await reg.fetch(get.url, { headers: JSON.parse(get.headers) as Record<string, string> })
      ).text();
      const b = await tryFix(L, rec.id, form({ notes: 'laptop' }), 'laptop');
      expect(b.ok).toBeDefined();
      let staleRead = true;
      reg.misbehave.fault = (method, path) =>
        staleRead && method === 'GET' && path === '/api/records'
          ? ((staleRead = false), new Response(stale, { headers: { 'content-type': 'application/json' } }))
          : undefined;
      const a = await tryFix(P, rec.id, form({ notes: 'phone' }), 'phone');
      expect(a.err).toBe(P.m.records.ALREADY_CORRECTED());
      expect(a.latestId).toBe(b.ok);
      expect(correctionsOf(rec.id).map((r) => r.id)).toEqual([b.ok]);
      expect(rows().find((r) => r.id === rec.id)?.supersededBy).toBe(b.ok);
      // Taken back on P: its own correction is gone, and the record points to L's.
      expect(
        await P.run(() =>
          P.m.records
            .allRecords()
            .map((r) => r.id)
            .sort(),
        ),
      ).toEqual([b.ok, rec.id].sort());
      expect(await P.run(() => P.m.records.getRecord(rec.id)?.supersededBy)).toBe(b.ok);
    });

    it('api-store says the registry’s refusal in the app’s words', async () => {
      const { A, rec } = await saved();
      reg.misbehave.fault = (method, path, body) =>
        method === 'PUT' && path === '/api/records'
          ? new Response(
              JSON.stringify({
                ok: false,
                rejected: (JSON.parse(body) as { id: string }[]).map((r) => ({
                  id: r.id,
                  reason: 'already corrected: record R already has a correction here (C)',
                  code: 'already-corrected',
                  status: 409,
                })),
                notWritten: [],
              }),
              { headers: { 'content-type': 'application/json' } },
            )
          : undefined;
      const result = await A.run(async () => {
        const r = A.m.records.getRecord(rec.id)!;
        return A.m.api.apiStore.save(A.m.records.RECORDS_KEY, [{ ...r, licenseIds: ['LIC-1'] }]);
      });
      expect(result.refused).toEqual([expect.objectContaining({ id: rec.id, words: 'app.sealed.alreadyCorrected' })]);
    });
  });
});
