// Browser storage safety (privacy review of #215, follow-up risks 1 to 3):
//   - a code being received is in the backup file, comes back from it, and Start over clears it,
//     saying so first when no checked backup holds it; older files still restore;
//   - an unsure entry of a holder key no longer in use is kept 30 days, then dropped; the key in
//     use is never dropped by age;
//   - a deal's expired kept messages are removed on load, not only when that deal is next opened.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTranslator, type AppDict } from '../i18n/translate';
import { appDe } from '../i18n/app/de';
import { appEn } from '../i18n/app/en';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import { startOverLines } from '../components/stage/record-kinds';

const local = new Map<string, string>();
const fileOf = (text: string) => ({ text: () => Promise.resolve(text) }) as unknown as File;

beforeEach(() => {
  vi.unstubAllGlobals();
  local.clear();
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
    key: (i: number) => [...local.keys()][i] ?? null,
    get length() {
      return local.size;
    },
  });
  // Nothing here may reach the network: a registry read fails, as offline.
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
});

const CODE = 'XF-7Q2K.claimcode42';
const ID = 'XF-7Q2K';

describe('a code being received, and the backup file', () => {
  it('is in the backup file, not in the account copy, and only a checked file marks it backed up', async () => {
    const transfers = await import('./transfers');
    const backup = await import('./backup');
    transfers.keepReceivingCode(CODE);
    expect(backup.hasAnythingToBackUp()).toBe(true);

    const text = await backup.backupFileText();
    const file = JSON.parse(text) as { version: number; receiving?: Record<string, string> };
    expect(file.version).toBe(3);
    expect(file.receiving).toEqual({ [ID]: CODE });
    // The account copy keeps what it held before: never the code.
    expect(JSON.stringify(backup.accountContents())).not.toContain('claimcode42');

    // Saving is not having it: only a checked file marks it.
    expect(transfers.receivingOnlyHere()).toEqual([ID]);
    expect(await backup.checkBackup(fileOf(text))).toMatchObject({ ok: true });
    expect(transfers.receivingOnlyHere()).toEqual([]);
    // Once the delivery is finished, its mark goes with it.
    transfers.forgetReceivingCode(ID, { force: true });
    expect(local.get('veilcore.receiving-backed-up.v1')).toBeUndefined();
  });

  it('a file holding a different code for the same delivery does not mark the one kept here', async () => {
    const transfers = await import('./transfers');
    transfers.keepReceivingCode(CODE);
    transfers.markReceivingBackedUp({ [ID]: `${ID}.another` });
    expect(transfers.receivingOnlyHere()).toEqual([ID]);
  });

  it('a new code pasted for the same delivery after a checked backup loses the mark, so Start over warns', async () => {
    const transfers = await import('./transfers');
    const backup = await import('./backup');
    transfers.keepReceivingCode(CODE);
    expect(await backup.checkBackup(fileOf(await backup.backupFileText()))).toMatchObject({ ok: true });
    expect(transfers.receivingOnlyHere()).toEqual([]);
    // The same code again keeps the mark.
    transfers.keepReceivingCode(CODE);
    expect(transfers.receivingOnlyHere()).toEqual([]);
    // A different code for the same delivery: no checked backup holds it.
    transfers.keepReceivingCode(`${ID}.newclaim99`);
    expect(transfers.receivingOnlyHere()).toEqual([ID]);
    expect(startOverLines(transfers.receivingOnlyHere().length, 0)).toContain('no checked backup holds its code');
  });

  it('comes back from the file, password-locked too, and the delivery can be finished here', async () => {
    let transfers = await import('./transfers');
    let backup = await import('./backup');
    transfers.keepReceivingCode(CODE);
    const text = await backup.backupFileText('correct horse battery', Date.now(), 600_000);

    // A new device.
    local.clear();
    vi.resetModules();
    transfers = await import('./transfers');
    backup = await import('./backup');
    expect(transfers.receivingCodeFor(ID)).toBeUndefined();
    const out = await backup.restoreAny(fileOf(text), 'correct horse battery');
    expect(out.receiving).toBe(1);
    expect(transfers.receivingCodeFor(ID)).toBe(CODE);
    // The file it came from holds it.
    expect(transfers.receivingOnlyHere()).toEqual([]);
  }, 30_000);

  it('a copy that marks nothing (mark: false) brings it back without calling it backed up', async () => {
    const transfers = await import('./transfers');
    const backup = await import('./backup');
    const file = { ...backup.backupContents(), receiving: { [ID]: CODE } };
    await backup.restoreAny(fileOf(JSON.stringify(file)), undefined, { mark: false });
    expect(transfers.receivingCodeFor(ID)).toBe(CODE);
    expect(transfers.receivingOnlyHere()).toEqual([ID]);
  });

  it('never replaces a code kept here, and skips an entry whose code is for another delivery', async () => {
    const transfers = await import('./transfers');
    transfers.keepReceivingCode(CODE);
    expect(
      transfers.mergeReceiving({
        [ID]: `${ID}.different`,
        'XF-OTHER': 'XF-ELSE.claim',
        'XF-3': 7,
        'XF-4': 'XF-4.claim4',
      }),
    ).toBe(1);
    expect(transfers.receivingCodeFor(ID)).toBe(CODE);
    expect(transfers.receivingCodeFor('XF-OTHER')).toBeUndefined();
    expect(transfers.receivingCodeFor('XF-4')).toBe('XF-4.claim4');
    expect(transfers.mergeReceiving(undefined)).toBe(0);
    expect(transfers.mergeReceiving('nonsense')).toBe(0);
  });

  it('an older backup, without codes, restores as before', async () => {
    const holder = await import('./holder');
    const transfers = await import('./transfers');
    const backup = await import('./backup');
    const key = 'ab'.repeat(32);
    // A version 3 file as an older app wrote it: no `receiving`.
    const old = {
      format: 'veilcore-backup',
      version: 3,
      warning: 'SECRET.',
      savedAt: '2026-10-01T00:00:00.000Z',
      holderKey: key,
      records: [],
      sentCodes: { 'XF-SENT': 'XF-SENT.sent1' },
    };
    const out = await backup.restoreAny(fileOf(JSON.stringify(old)));
    expect(out.holderKey).toBe('restored');
    expect(out.sentCodes).toBe(1);
    expect(out.receiving).toBeUndefined();
    expect(holder.holderKeyIfAny()).toBe(key);
    expect(transfers.receivingOnlyHere()).toEqual([]);
    // And a file made now still checks against a browser holding no code.
    expect(await backup.checkBackup(fileOf(JSON.stringify(old)))).toMatchObject({ ok: true });
  });

  it('Start over clears it, and everything kept beside it', async () => {
    const transfers = await import('./transfers');
    transfers.keepReceivingCode(CODE);
    transfers.markReceivingBackedUp({ [ID]: CODE });
    local.set('veilcore.receiving-claims.v1', JSON.stringify({ [ID]: { recordId: 'R', descendedFrom: 'S' } }));
    local.set('veilcore.receiving-refused.v1', JSON.stringify([ID]));
    transfers.forgetAllReceiving();
    for (const k of [
      'veilcore.receiving.v1',
      'veilcore.receiving-claims.v1',
      'veilcore.receiving-refused.v1',
      'veilcore.receiving-backed-up.v1',
    ])
      expect(local.has(k)).toBe(false);
    expect(transfers.receivingCodeFor(ID)).toBeUndefined();
  });

  it('Start over’s question says so, in every language', () => {
    const dicts: Record<string, AppDict> = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa };
    const seen = new Set<string>();
    for (const [lang, dict] of Object.entries(dicts)) {
      const tr = makeTranslator(lang as never, dict);
      expect(startOverLines(0, 0, tr)).toBe('');
      for (const [r, u] of [
        [1, 0],
        [2, 0],
        [0, 1],
        [0, 3],
      ] as const) {
        const line = startOverLines(r, u, tr);
        expect(line.startsWith('\n\n')).toBe(true);
        expect(line).not.toMatch(/app\.home|\{count\}/);
        if (r + u > 1) expect(line).toContain(String(r + u));
        if (u) expect(line).toContain('30');
        seen.add(line);
      }
      const both = startOverLines(1, 1, tr);
      expect(both.split('\n\n').filter(Boolean)).toHaveLength(2);
    }
    // Five languages, four lines each, none the English left in place.
    expect(seen.size).toBe(20);
  });
});

describe('unsure records: how long they are kept', () => {
  const DAY = 86_400_000;
  const rec = (id: string) => ({ id, strainName: 'Blue', notes: 'typed here' });
  const entry = (id: string, extra: Record<string, unknown> = {}) => ({
    correctionId: `${id}-C`,
    before: rec(id),
    at: 1,
    ...extra,
  });
  const kept = () =>
    JSON.parse(local.get('veilcore.unsure.v1') ?? '{}') as Record<string, Record<string, Record<string, unknown>>>;

  it('the key in use is never dropped by age; another key’s go 30 days after it stopped being used', async () => {
    const holder = await import('./holder');
    const records = await import('./records');
    const mine = holder.holderKey().toLowerCase();
    const old = 'cd'.repeat(32);
    local.set(
      'veilcore.unsure.v1',
      JSON.stringify({ [mine]: { A: entry('A', { at: 0 }) }, [old]: { B: entry('B') }, broken: { X: { nope: 1 } } }),
    );
    const t0 = 1_000 * DAY;
    records.sweepUnsure(t0);
    // The other key's window starts now; an entry that can't be read goes.
    expect(kept()[old].B.leftAt).toBe(t0);
    expect(kept().broken).toBeUndefined();
    expect(kept()[mine].A.leftAt).toBeUndefined();

    records.sweepUnsure(t0 + 30 * DAY);
    expect(kept()[old]?.B).toBeDefined();
    records.sweepUnsure(t0 + 30 * DAY + 1);
    expect(kept()[old]).toBeUndefined();
    // Years on, still unsettled: the key in use keeps it (shown as not saved yet).
    records.sweepUnsure(t0 + 3_650 * DAY);
    expect(kept()[mine].A).toBeDefined();
  });

  it('a key that comes back (its backup restored) loses its mark and is kept again', async () => {
    const holder = await import('./holder');
    const records = await import('./records');
    const old = 'cd'.repeat(32);
    local.set('veilcore.unsure.v1', JSON.stringify({ [old]: { B: entry('B', { leftAt: 5 }) } }));
    holder.setHolderKey(old);
    records.sweepUnsure(10 * 365 * DAY);
    expect(kept()[old].B).toBeDefined();
    expect(kept()[old].B.leftAt).toBeUndefined();
  });

  it('Start over starts the window for the old key, and the count it asks about is the key in use', async () => {
    const holder = await import('./holder');
    const records = await import('./records');
    const mine = holder.holderKey().toLowerCase();
    local.set('veilcore.unsure.v1', JSON.stringify({ [mine]: { A: entry('A'), B: entry('B') } }));
    expect(records.unsureCount()).toBe(2);
    const before = Date.now();
    records.startOver();
    expect(records.unsureCount()).toBe(0);
    expect(kept()[mine].A.leftAt).toBeGreaterThanOrEqual(before);
    expect(kept()[mine].B.leftAt).toBeGreaterThanOrEqual(before);
  });

  it('nothing to sweep changes nothing', async () => {
    const records = await import('./records');
    records.sweepUnsure();
    expect(local.has('veilcore.unsure.v1')).toBe(false);
  });
});

describe('deal messages kept to send again', () => {
  const box = (madeAt: number, landedAt?: number) => ({
    iv: 'iv',
    ct: 'ct',
    signature: 'sig',
    type: 'statement',
    madeAt,
    ...(landedAt ? { landedAt } : {}),
  });

  it('expired ones are removed from storage on load, for every deal, opened or not', async () => {
    const { sweepDealOutboxes, KEEP_MS, LANDED_MS } = await import('./deal-outbox-store');
    const now = 100 * KEEP_MS;
    local.set('veilcore.deal-outbox.v1.c1.r1', JSON.stringify({ a: box(now - KEEP_MS - 1) }));
    local.set(
      'veilcore.deal-outbox.v1.c2.r2',
      JSON.stringify({ old: box(now - KEEP_MS), fresh: box(now - 1), landed: box(now - 5, now - LANDED_MS) }),
    );
    local.set('veilcore.deal-outbox.v1.c3.r3', JSON.stringify({ waiting: box(now - 1), justLanded: box(1, now - 1) }));
    local.set('veilcore.deal-outbox.v1.c4.r4', 'not json');
    local.set('veilcore.other.v1', 'left alone');
    sweepDealOutboxes(now);
    expect(local.has('veilcore.deal-outbox.v1.c1.r1')).toBe(false);
    expect(Object.keys(JSON.parse(local.get('veilcore.deal-outbox.v1.c2.r2')!) as object)).toEqual(['fresh']);
    // Still wanted: exactly as it was.
    expect(JSON.parse(local.get('veilcore.deal-outbox.v1.c3.r3')!)).toEqual({
      waiting: box(now - 1),
      justLanded: box(1, now - 1),
    });
    expect(local.has('veilcore.deal-outbox.v1.c4.r4')).toBe(false);
    expect(local.get('veilcore.other.v1')).toBe('left alone');
  });

  it('runs on every page load, and the deal code keeps the same limits', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    expect(main).toMatch(/\nsweepDealOutboxes\(\);/);
    const store = await import('./deal-outbox-store');
    const client = await import('./deal-client');
    expect(client.KEEP_MS).toBe(store.KEEP_MS);
    expect(client.LANDED_MS).toBe(store.LANDED_MS);
  });

  it('blocked storage never throws', async () => {
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new Error('blocked');
      },
    });
    const { sweepDealOutboxes } = await import('./deal-outbox-store');
    expect(() => sweepDealOutboxes()).not.toThrow();
  });
});

describe('Start over on the home page', () => {
  it('asks with both lines and clears the codes being received', async () => {
    const { readFileSync } = await import('node:fs');
    const home = readFileSync(new URL('../components/flow/AppHome.tsx', import.meta.url), 'utf8');
    const reset = home.slice(home.indexOf('const onReset'), home.indexOf('const signatureButton'));
    expect(reset).toMatch(/startOverLines\(receivingOnlyHere\(\)\.length, unsureCount\(\), tr\)/);
    expect(reset.indexOf('window.confirm')).toBeLessThan(reset.indexOf('forgetAllReceiving()'));
  });
});
