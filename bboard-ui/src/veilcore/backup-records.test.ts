// The backup file carries the records themselves and their inclusion proofs (backup.ts
// recordData, proofs): with only the file, on a new device, with VeilCore's registry gone, a
// holder gets their records back and each one still recomputes to its proof code.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
const fileOf = (text: string) => ({ text: () => Promise.resolve(text) }) as unknown as File;

beforeEach(() => {
  local.clear();
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A registry holding one batch with a proof for `fp`, or no registry at all. */
const registry = (proofFor?: { fp: string; body: unknown }) =>
  vi.stubGlobal('fetch', (url: string) => {
    if (proofFor && String(url).endsWith(`/proof/${proofFor.fp}`))
      return Promise.resolve(new Response(JSON.stringify(proofFor.body), { status: 200 }));
    return Promise.reject(new TypeError('Failed to fetch'));
  });

const sealOne = async () => {
  const { sealRecord } = await import('./seal-record');
  const records = await import('./records');
  const { store } = await import('./store');
  // This device's registry: everything saves; the test reads what the backup carries.
  let held: unknown[] = [];
  vi.spyOn(store, 'save').mockImplementation((_k, v) => {
    held = v;
    return Promise.resolve({ ok: true, refused: [] });
  });
  vi.spyOn(store, 'load').mockImplementation(() => Promise.resolve(held as never[]));
  const sealed = await sealRecord({
    strainName: 'Harbour Mist (test data)',
    bredBy: 'Example Breeder',
    dateCreated: '2026-03-01',
    notes: 'kept only in the backup once the registry is gone',
    parents: [],
    photoFingerprints: [],
  } as unknown as Parameters<typeof sealRecord>[0]);
  return records.createRecord(sealed);
};

describe('a backup that works without VeilCore', () => {
  it('carries each record and its proof, and a new device gets them back with the registry gone', async () => {
    registry();
    const rec = await sealOne();
    const { buildBatch } = await import('veilcore-records');
    const batch = await buildBatch([rec.recordFingerprint, 'ab'.repeat(32)], 'B-TEST');
    registry({ fp: rec.recordFingerprint, body: batch.proofs[rec.recordFingerprint] });

    const backup = await import('./backup');
    const text = await backup.backupFileText();
    const file = JSON.parse(text) as { recordData: { id: string; notes: string }[]; proofs: Record<string, unknown> };
    expect(file.recordData.map((r) => r.id)).toEqual([rec.id]);
    expect(file.recordData[0].notes).toBe('kept only in the backup once the registry is gone');
    expect(Object.keys(file.proofs)).toEqual([rec.recordFingerprint]);
    // The sealed fields recompute to the proof code by the spec alone: SHA-256 of their canonical
    // form, folded with the key binding they carry (SPEC 3.6.1), no record shape from this app.
    const sealed = (JSON.parse(text) as { sealedFields: Record<string, Record<string, unknown>> }).sealedFields[rec.id];
    const { canonicalise } = await import('veilcore-records');
    const { keyBoundFingerprint } = await import('./key-binding');
    const { createHash } = await import('node:crypto');
    const content = createHash('sha256').update(canonicalise(sealed)).digest('hex');
    expect(keyBoundFingerprint(sealed.keyBinding as string, content)).toBe(rec.recordFingerprint);

    // A new device: nothing in this browser, and the registry doesn't answer.
    local.clear();
    vi.resetModules();
    vi.restoreAllMocks();
    registry();
    const fresh = await import('./backup');
    const records = await import('./records');
    const out = await fresh.restoreAny(fileOf(text));
    expect(out.fromFile).toMatchObject({ added: 1 });
    const back = records.allRecords().find((r) => r.id === rec.id);
    expect(back?.strainName).toBe('Harbour Mist (test data)');
    expect(await records.checkIntegrity(back!)).toBe('match');
  });

  it('a record in the file that does not recompute is not put back, and the keys still are', async () => {
    registry();
    const rec = await sealOne();
    const backup = await import('./backup');
    const file = JSON.parse(await backup.backupFileText()) as Record<string, unknown> & {
      recordData: Record<string, unknown>[];
    };
    file.recordData[0].notes = 'edited after sealing';
    local.clear();
    vi.resetModules();
    vi.restoreAllMocks();
    registry();
    const fresh = await import('./backup');
    const keys = await import('./record-keys');
    const out = await fresh.restoreAny(fileOf(JSON.stringify(file)));
    expect(out.fromFile && 'error' in out.fromFile ? out.fromFile.error : '').toMatch(/does not match its fields/);
    expect(keys.keysFor(rec.id)).toBeDefined();
  });

  it('a passkey copy carries keys only', async () => {
    registry();
    await sealOne();
    const backup = await import('./backup');
    expect(backup.backupContents().recordData).toBeUndefined();
  });
});
