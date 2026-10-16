// What a delivery's offer may hold, and that it always goes sealed (sealed records round 2,
// integration A4 and A5).
//
// A4: offers are padded like records, and the registry used to refuse a sealed offer over
// 16 KB, after the holder had typed the note: a code that could never be made. The registry
// now takes 384 KiB (sealed.js OFFER_MAX_BYTES, checked against transfers.ts by the
// cross-repo contract test), and the app caps the quantity and the note while typing. The
// largest offer the app can make, every field at its worst, fits.
//
// A5: the app sends `sealedOffer` for every new offer, also from a record still in plain text
// (saved before sealing, not yet converted), and never the quantity or note beside it.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrainRecord } from './records';

let sent: { url: string; body: Record<string, unknown> }[] = [];
beforeEach(() => {
  vi.resetModules();
  const local = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  sent = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    sent.push({ url, body: JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<string, unknown> });
    return Promise.resolve(
      new Response(JSON.stringify({ transferId: 'TR-0A1B2C3D', claimCode: 'ab'.repeat(16) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** The character that costs most in an offer's JSON: six bytes each (\u0001). */
const WORST = '\u0001';

const animal = (over: Partial<StrainRecord> = {}): StrainRecord => ({
  id: 'VEIL-BIG1',
  nonce: 'n'.repeat(32),
  strainName: 'Daisy',
  bredBy: 'Breeder',
  dateCreated: '2026-01-02',
  notes: '',
  loggedAt: 1,
  recordFingerprint: 'ab'.repeat(32),
  profile: 'veilcore/profile/animal-individual/v1',
  taxon: 'Bos taurus',
  refId: 'UK1',
  animal: { breed: 'Jersey', idScheme: 'UK ear tag', sex: 'female', herd: '' },
  ...over,
});

describe('the largest offer the app can make (A4)', () => {
  it('fits the registry’s limit: the largest record the app saves, the longest name, quantity and note, at six bytes a character', async () => {
    const { recordSealedBytes, SEALED_MAX_BYTES } = await import('./api-store');
    const { offerPlaintext, OFFER_MAX_BYTES, OFFER_NOTE_MAX, OFFER_QUANTITY_MAX } = await import('./transfers');
    const { newOfferKey, sealOffer } = await import('./vault');
    // Every offer field the record carries is as long as a save allows (the record's padded
    // plaintext at the 256 KiB limit), split across the fields the offer copies.
    const fill = (n: number) =>
      animal({
        strainName: WORST.repeat(500), // the registry's limit on the public name
        bredBy: WORST.repeat(n),
        taxon: WORST.repeat(n),
        refId: WORST.repeat(n),
        animal: { breed: WORST.repeat(n), idScheme: WORST.repeat(n), sex: 'female', herd: '' },
      });
    let lo = 0;
    let hi = SEALED_MAX_BYTES;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (recordSealedBytes(fill(mid)) <= SEALED_MAX_BYTES) lo = mid;
      else hi = mid - 1;
    }
    const record = fill(lo);
    expect(recordSealedBytes(record)).toBeLessThanOrEqual(SEALED_MAX_BYTES);
    expect(recordSealedBytes(fill(lo + 1))).toBeGreaterThan(SEALED_MAX_BYTES);
    const box = await sealOffer(
      newOfferKey(),
      record.id,
      record.recordFingerprint,
      offerPlaintext(record, { quantity: WORST.repeat(OFFER_QUANTITY_MAX), note: WORST.repeat(OFFER_NOTE_MAX) }),
    );
    const size = JSON.stringify(box).length;
    expect(size).toBeGreaterThan(256 * 1024); // it really is that large
    expect(size).toBeLessThanOrEqual(OFFER_MAX_BYTES);
  });

  it('the old 16 KB limit refused a note the app allows, on an ordinary record', async () => {
    const { offerPlaintext, OFFER_NOTE_MAX } = await import('./transfers');
    const { newOfferKey, sealOffer } = await import('./vault');
    const record = animal();
    const box = await sealOffer(
      newOfferKey(),
      record.id,
      record.recordFingerprint,
      offerPlaintext(record, { note: WORST.repeat(OFFER_NOTE_MAX) }),
    );
    expect(JSON.stringify(box).length).toBeGreaterThan(16 * 1024);
  });

  it('a quantity or note over the cap never leaves this browser', async () => {
    const { mintVault } = await import('./vault');
    const { holderKey } = await import('./holder');
    const { offerTransfer, OFFER_NOTE_MAX, OFFER_QUANTITY_MAX } = await import('./transfers');
    holderKey();
    expect(mintVault()).not.toBeNull();
    const over = await offerTransfer(animal(), 'lab@example.test', { note: 'x'.repeat(OFFER_NOTE_MAX + 1) });
    expect(over).toEqual({ error: 'the quantity or the note is too long' });
    const overQ = await offerTransfer(animal(), 'lab@example.test', { quantity: 'x'.repeat(OFFER_QUANTITY_MAX + 1) });
    expect(overQ).toEqual({ error: 'the quantity or the note is too long' });
    expect(sent).toEqual([]);
    // At the caps: sent.
    const ok = await offerTransfer(animal(), 'lab@example.test', {
      quantity: 'q'.repeat(OFFER_QUANTITY_MAX),
      note: 'n'.repeat(OFFER_NOTE_MAX),
    });
    expect('transferId' in ok).toBe(true);
    expect(sent).toHaveLength(1);
  });
});

describe('every new offer goes sealed (A5)', () => {
  it('from a record still in plain text: sealedOffer and a tag, never the quantity, note or name beside them', async () => {
    const { mintVault, openOffer } = await import('./vault');
    const { holderKey } = await import('./holder');
    const { offerTransfer } = await import('./transfers');
    holderKey();
    expect(mintVault()).not.toBeNull();
    // A record saved before sealing: no `sealed`, its fields as they were typed.
    const plain = animal({ id: 'VEIL-PLAIN', bredBy: 'PRIV-breeder' });
    const res = await offerTransfer(plain, 'Dr Jane, Secret Lab', {
      quantity: 'PRIV-quantity',
      note: 'PRIV-note',
      sample: { sampleId: 'S-1' },
    });
    if ('error' in res) throw new Error(res.error);
    expect(sent).toHaveLength(1);
    const { url, body } = sent[0];
    expect(url).toMatch(/\/transfers$/);
    expect(Object.keys(body).sort()).toEqual(['sample', 'sealedOffer', 'sourceRecord', 'toHandle']);
    expect(body.toHandle).toMatch(/^[0-9a-f]{64}$/);
    const wire = JSON.stringify(body);
    for (const secret of ['PRIV-quantity', 'PRIV-note', 'PRIV-breeder', 'Dr Jane', 'Secret Lab']) {
      expect(wire.includes(secret), secret).toBe(false);
    }
    // The recipient opens it with the code's key.
    const opened = await openOffer(res.offerKey, plain.id, plain.recordFingerprint, body.sealedOffer);
    expect(opened).toMatchObject({ bredBy: 'PRIV-breeder', quantity: 'PRIV-quantity', note: 'PRIV-note' });
  });

  it('with no vault key, nothing is sent at all (no plain-text offer to fall back to)', async () => {
    const { holderKey } = await import('./holder');
    const { offerTransfer } = await import('./transfers');
    holderKey();
    const res = await offerTransfer(animal({ id: 'VEIL-NOKEY' }), 'lab@example.test', { quantity: '1', note: 'n' });
    expect('error' in res).toBe(true);
    expect(sent).toEqual([]);
  });
});
