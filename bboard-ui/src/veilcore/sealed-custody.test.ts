// A delivery's sample details sealed with its offer key (CONTRACT.md #27): the shared vectors
// (the registry's test/fixtures/sealed-custody-vectors.json holds the same values), the v2
// digest and `_sc2_` receipts, the sender's list opening the boxes with the key kept here, the
// holder's covered / changed / differences, and the summary a grant may publish (states and
// field names, never values). Test data only.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ARRIVAL_BOX_FROM_REGISTRY,
  CROSS_ARRIVAL,
  CROSS_DIGEST_V2,
  CROSS_OFFER_KEY,
  CROSS_OFFER_KID,
  CROSS_SALT,
  CROSS_SAMPLE,
  SAMPLE_BOX_FROM_SITE,
  SEALED_TRANSFER_ID,
} from './custody-vectors';

type Mods = {
  vault: typeof import('./vault');
  transfers: typeof import('./transfers');
  custody: typeof import('./custody');
  disclosure: typeof import('./disclosure');
};
let store: Map<string, string>;
const load = async (): Promise<Mods> => {
  vi.resetModules();
  return {
    vault: await import('./vault'),
    transfers: await import('./transfers'),
    custody: await import('./custody'),
    disclosure: await import('./disclosure'),
  };
};
beforeEach(() => {
  store = new Map([['veilcore.holder.v1', 'ab'.repeat(32)]]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

const json = (v: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } }));

describe('the shared vectors (the registry tests the same values)', () => {
  it('the same v2 digest, the same kid, and each side opens the box the other sealed', async () => {
    const { vault, transfers } = await load();
    expect(await vault.offerKidOf(CROSS_OFFER_KEY)).toBe(CROSS_OFFER_KID);
    expect(await transfers.custodyDigestV2(SEALED_TRANSFER_ID, CROSS_SALT, CROSS_SAMPLE, CROSS_ARRIVAL)).toBe(
      CROSS_DIGEST_V2,
    );
    // The salt is part of what is hashed: another salt, another digest.
    expect(await transfers.custodyDigestV2(SEALED_TRANSFER_ID, 'A'.repeat(43), CROSS_SAMPLE, CROSS_ARRIVAL)).not.toBe(
      CROSS_DIGEST_V2,
    );
    expect(
      await transfers.openDeliveryCustody(
        SEALED_TRANSFER_ID,
        SAMPLE_BOX_FROM_SITE,
        ARRIVAL_BOX_FROM_REGISTRY,
        CROSS_OFFER_KEY,
      ),
    ).toEqual({ sample: CROSS_SAMPLE, arrival: CROSS_ARRIVAL, sealed: true, salt: CROSS_SALT });
    // Bound to the delivery and the side.
    expect(await vault.openCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'arrival', SAMPLE_BOX_FROM_SITE)).toBeNull();
    expect(await vault.openCustody(CROSS_OFFER_KEY, 'TR-00000000', 'sample', SAMPLE_BOX_FROM_SITE)).toBeNull();
    expect(await vault.openCustody(vault.newOfferKey(), SEALED_TRANSFER_ID, 'sample', SAMPLE_BOX_FROM_SITE)).toBeNull();
    // A box sealed here opens with the same key, and its kid is the key's.
    const box = await vault.sealCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'arrival', CROSS_ARRIVAL);
    expect(box.kid).toBe(CROSS_OFFER_KID);
    expect(Object.keys(box).sort()).toEqual(['alg', 'ct', 'iv', 'kid', 'v']);
    expect(await vault.openCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'arrival', box)).toEqual(CROSS_ARRIVAL);
  });

  it('the longest details either side can write fit the registry’s box limit', async () => {
    const { vault } = await load();
    // Three UTF-8 bytes a character, every field at its limit.
    const w = (n: number) => '一'.repeat(n);
    const sample = { sampleId: w(120), sealNumber: w(120), takenFrom: w(300), takenOn: '2026-10-14', witness: w(200) };
    const arrival = {
      sampleId: w(120),
      sealNumber: w(120),
      sealIntact: 'no-seal',
      arrivedOn: '2026-10-15',
      condition: w(1000),
      labRef: w(200),
    };
    const s = await vault.sealCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'sample', {
      ...sample,
      salt: vault.newCustodySalt(),
    });
    const a = await vault.sealCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'arrival', arrival);
    expect(s.ct.length).toBeLessThanOrEqual(vault.CUSTODY_CT_MAX);
    expect(a.ct.length).toBeLessThanOrEqual(vault.CUSTODY_CT_MAX);
    await expect(
      vault.sealCustody(CROSS_OFFER_KEY, SEALED_TRANSFER_ID, 'arrival', { condition: w(3000) }),
    ).rejects.toThrow(/too long/);
  });
});

describe('which digest a receipt carries', () => {
  it('_sc2_ and _sc1_ are read apart; a receipt covers a delivery only in the delivery’s own form', async () => {
    const { transfers } = await load();
    const d = 'ab'.repeat(32);
    expect(transfers.receiptCustodyOf(`att_0123456789abcdef_sc2_${d}`)).toEqual({ format: 2, digest: d });
    expect(transfers.receiptCustodyOf(`att_0123456789abcdef_sc1_${d}`)).toEqual({ format: 1, digest: d });
    expect(transfers.receiptCustodyOf('att_0123456789abcdef')).toBeNull();
    expect(transfers.receiptCustodyOf(`att_x_sc3_${d}`)).toBeNull();
    const sealed = { custodyDigest: d, custodyFormat: 2 as const };
    expect(transfers.receiptCovers(`att_1_sc2_${d}`, sealed)).toBe('covered');
    expect(transfers.receiptCovers(`att_1_sc1_${d}`, sealed)).toBe('changed');
    expect(transfers.receiptCovers(`att_1_sc2_${'cd'.repeat(32)}`, sealed)).toBe('changed');
    expect(transfers.receiptCovers('att_1', sealed)).toBe('not-covered');
    expect(transfers.receiptCovers(`att_1_sc1_${d}`, { custodyDigest: d })).toBe('covered');
  });
});

describe('the sender’s list opens the boxes with the key this browser keeps', () => {
  const listing = (extra: Record<string, unknown> = {}) => ({
    transfers: [
      {
        id: SEALED_TRANSFER_ID,
        source_record: 'VEIL-1',
        to_handle: 'ab'.repeat(32),
        created_at: 1,
        receipt_attestation_id: `att_0123456789abcdef_sc2_${CROSS_DIGEST_V2}`,
        sample_custody: SAMPLE_BOX_FROM_SITE,
        arrival_custody: ARRIVAL_BOX_FROM_REGISTRY,
        ...extra,
      },
    ],
  });

  it('opened: covered, with the differences worked out here; the registry’s own digest is ignored', async () => {
    const { transfers, custody } = await load();
    // The code made here is kept (and in the backup); the record's sealed copy keeps the key too.
    transfers.rememberSentCode(transfers.shareCodeFor(SEALED_TRANSFER_ID, 'cc'.repeat(16), undefined, CROSS_OFFER_KEY));
    vi.stubGlobal('fetch', () =>
      json(listing({ custodyDigest: '0'.repeat(64), custodyFormat: 1, custodyLocked: true })),
    );
    const [t] = await transfers.sentByMe();
    expect(t).toMatchObject({
      sample_custody: CROSS_SAMPLE,
      arrival_custody: CROSS_ARRIVAL,
      custodyFormat: 2,
      custodySalt: CROSS_SALT,
      custodyDigest: CROSS_DIGEST_V2,
    });
    expect(t.custodyLocked).toBeUndefined();
    const view = custody.custodyView(t, t.receipt_attestation_id ?? undefined)!;
    expect(view.signed).toBe('covered');
    expect(view.differences).toEqual(['Seal number differs: sent 4471, received 4417', 'Seal not intact on arrival']);
    expect(transfers.custodyDifferingFields(CROSS_SAMPLE, CROSS_ARRIVAL)).toEqual(['sealNumber', 'sealIntact']);
    // The summary a grant may publish: a state and field names, none of the values.
    const summary = await transfers.custodySummariesFor({ id: 'VEIL-1' });
    expect(summary).toEqual([
      {
        receiptAttestationId: `att_0123456789abcdef_sc2_${CROSS_DIGEST_V2}`,
        covered: 'covered',
        differingFields: ['sealNumber', 'sealIntact'],
      },
    ]);
    for (const v of Object.values({ ...CROSS_SAMPLE, ...CROSS_ARRIVAL }))
      if (v.length > 3) expect(JSON.stringify(summary).includes(v), v).toBe(false);
  });

  it('without the key here: locked, never empty or matching, and nothing summarised', async () => {
    const { transfers, custody } = await load();
    vi.stubGlobal('fetch', () => json(listing()));
    const [t] = await transfers.sentByMe();
    expect(t.custodyLocked).toBe(true);
    expect(t.sample_custody).toBeUndefined();
    expect(t.custodyDigest).toBeUndefined();
    const view = custody.custodyView(t, t.receipt_attestation_id ?? undefined)!;
    expect(view.locked).toBe(true);
    expect(custody.custodyLines(view)).toEqual([
      'The sample details are locked, and this browser doesn’t have their key. Restore your backup file here to see them.',
    ]);
    expect(await transfers.custodySummariesFor({ id: 'VEIL-1' })).toEqual([]);
  });

  it('the registry unreachable: no summary rather than an empty one, so a grant keeps what it publishes', async () => {
    const { transfers, disclosure } = await load();
    vi.stubGlobal('fetch', () => json({ error: 'down' }, 503));
    expect(await transfers.custodySummariesFor({ id: 'VEIL-1' })).toBeNull();
    const kept = [{ receiptAttestationId: 'att_1', covered: 'covered' as const, differingFields: [] }];
    const r = {
      id: 'VEIL-1',
      strainName: 'x',
      bredBy: '',
      dateCreated: '',
      notes: '',
      loggedAt: 1,
      recordFingerprint: 'a'.repeat(64),
    };
    expect(await disclosure.grantValuesNow(r, ['attestation-status'], { custodySummary: kept })).toEqual({
      custodySummary: kept,
    });
    // Only under the lab-status grant.
    expect(await disclosure.grantValuesNow(r, ['existence'], { custodySummary: kept })).toEqual({});
  });
});

describe('the public check page: what the registry says about sealed sample details', () => {
  it('"sealed": the lab signed over them; the holder’s summary is said as the sender’s word', async () => {
    const { custody } = await load();
    const list = custody.publicCustodyOf([
      {
        receiptAttestationId: 'att_a',
        custody: 'sealed',
        receiptNamesSampleDetails: true,
        sampleDetailsCheckedBy: 'holder',
      },
      {
        receiptAttestationId: 'att_b',
        custody: 'sealed',
        receiptNamesSampleDetails: true,
        sampleDetailsCheckedBy: 'holder',
        custodySummary: { covered: 'covered', differingFields: ['sealNumber', 'PRIV-4471', 'sealIntact'] },
        custodySummaryBy: 'holder',
      },
      {
        receiptAttestationId: 'att_c',
        custody: 'sealed',
        custodySummary: { covered: 'covered', differingFields: [] },
        custodySummaryBy: 'holder',
      },
      {
        receiptAttestationId: 'att_d',
        custody: 'sealed',
        custodySummary: { covered: 'changed', differingFields: [] },
        custodySummaryBy: 'holder',
      },
      // A summary not said to be the holder's is not shown.
      { receiptAttestationId: 'att_e', custody: 'sealed', custodySummary: { covered: 'covered', differingFields: [] } },
      { receiptAttestationId: 'att_f', custody: 'removed', receiptNamesSampleDetails: true },
      { receiptAttestationId: 'att_g', covered: 'covered', differences: [] },
    ]);
    const lines = (id: string) => custody.publicCustodyLines(list.get(id));
    const signed =
      'The lab’s receipt names sample details. They are stored locked, and VeilCore doesn’t have the key, so this page can’t check them; the holder’s app can.';
    expect(lines('att_a')).toEqual([signed]);
    expect(list.get('att_b')?.custodySummary?.differingFields).toEqual(['sealNumber', 'sealIntact']);
    expect(lines('att_b')).toEqual([
      signed,
      'The sender’s app compared them and found differences in: Seal number, Seal intact. That is the sender’s word.',
    ]);
    expect(lines('att_c')).toEqual([
      signed,
      'The sender’s app compared them: what arrived matches what was sent. That is the sender’s word.',
    ]);
    expect(lines('att_d')[1]).toMatch(
      /^The sender’s app compared them: the lab changed its arrival details after signing/,
    );
    expect(lines('att_e')).toEqual([signed]);
    expect(lines('att_f')).toEqual([
      'The sample details on this delivery were written before sealing and have since been removed, so this receipt can’t be compared with them.',
    ]);
    expect(lines('att_g')).toEqual([
      'No difference between the sample details sent and those the lab wrote on arrival.',
    ]);
  });
});
