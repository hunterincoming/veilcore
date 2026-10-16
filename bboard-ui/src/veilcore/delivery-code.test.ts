// The delivery code's fourth part (CONTRACT.md #8): the offer key, found by its prefix; a code
// without it is received like one without its lock; the claim's offer is opened with it, or
// taken as the registry gave it for a code made before offers were sealed; and the registry's
// "ask the sender for a new code" is said in plain words.
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  const local = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
});

const CLAIM = '9f8e7d6c'.repeat(4);
const LOCK = `age1${'q'.repeat(58)}`;

describe('the four-part code', () => {
  it('is id . claim [. lock] . o1<key>, and each part is found by its prefix in any order', async () => {
    const { shareCodeFor, parseShareCode } = await import('./transfers');
    const { newOfferKey } = await import('./vault');
    const key = newOfferKey();
    const code = shareCodeFor('TR-0A1B2C3D', CLAIM, LOCK, key);
    expect(code).toBe(`TR-0A1B2C3D.${CLAIM}.${LOCK}.o1${key}`);
    const want = { transferId: 'TR-0A1B2C3D', claimCode: CLAIM, resultLock: LOCK, offerKey: key };
    expect(parseShareCode(code)).toEqual(want);
    expect(parseShareCode(`TR-0A1B2C3D.${CLAIM}.o1${key}.${LOCK}`)).toEqual(want);
    expect(parseShareCode(`tr-0a1b2c3d.${CLAIM.toUpperCase()}.o1${key}`)).toEqual({
      transferId: 'TR-0A1B2C3D',
      claimCode: CLAIM,
      offerKey: key, // base64url: its case is kept
    });
    // Without a lock (lab reports off): three parts.
    expect(shareCodeFor('TR-0A1B2C3D', CLAIM, undefined, key)).toBe(`TR-0A1B2C3D.${CLAIM}.o1${key}`);
    // A key part cut short is no key.
    expect(parseShareCode(`TR-0A1B2C3D.${CLAIM}.o1${key.slice(0, 20)}`).offerKey).toBeUndefined();
  });

  it('a code without the key part is received like one without its lock, and the paste box knows all four parts', async () => {
    const { codeMissingOfferKey, codeMissingLock, shareCodeFor } = await import('./transfers');
    const { recognise } = await import('./paste');
    const { newOfferKey } = await import('./vault');
    const key = newOfferKey();
    expect(codeMissingOfferKey(`TR-0A1B2C3D.${CLAIM}.${LOCK}`)).toBe(true);
    expect(codeMissingOfferKey(`TR-0A1B2C3D.${CLAIM}`)).toBe(true);
    expect(codeMissingOfferKey(shareCodeFor('TR-0A1B2C3D', CLAIM, LOCK, key))).toBe(false);
    expect(codeMissingOfferKey('TR-0A1B2C3D')).toBe(false);
    expect(codeMissingOfferKey('')).toBe(false);
    expect(codeMissingLock(shareCodeFor('TR-0A1B2C3D', CLAIM, LOCK, key))).toBe(false);
    expect(codeMissingLock(shareCodeFor('TR-0A1B2C3D', CLAIM, undefined, key))).toBe(true);
    const full = shareCodeFor('TR-0A1B2C3D', CLAIM, LOCK, key);
    expect(recognise(full)).toEqual({ kind: 'delivery', code: full });
    expect(recognise(`TR-0A1B2C3D.${CLAIM}.o1${key}`)).toEqual({
      kind: 'delivery',
      code: `TR-0A1B2C3D.${CLAIM}.o1${key}`,
    });
  });
});

describe('the claim’s offer', () => {
  const source = {
    id: 'VEIL-S',
    strainName: 'Cut',
    bredBy: 'Hollis',
    dateCreated: '2026-01-02',
    notes: 'private',
    loggedAt: 1,
    recordFingerprint: 'ab'.repeat(32),
    breedingMethod: 'secret',
    parents: [{ name: 'secret parent' }],
    refId: 'plant ref',
  };

  it('opens with the code’s key, and only for the source record it was made for', async () => {
    const { offerPlaintext, openClaimOffer } = await import('./transfers');
    const { newOfferKey, sealOffer } = await import('./vault');
    const key = newOfferKey();
    const plain = offerPlaintext(source, { quantity: '3 cuttings', note: 'hi' });
    // What crosses: the name, breeder and date, the quantity and note. Not the notes,
    // parents, method or a plant's own reference.
    expect(plain).toEqual({
      strainName: 'Cut',
      bredBy: 'Hollis',
      dateCreated: '2026-01-02',
      quantity: '3 cuttings',
      note: 'hi',
    });
    const offerSealed = await sealOffer(key, source.id, source.recordFingerprint, plain);
    const claim = {
      recordId: 'VEIL-R',
      descendedFrom: 'VEIL-S',
      parentCommitment: source.recordFingerprint,
      offerSealed,
    };
    expect(await openClaimOffer(claim, key, undefined)).toEqual({ fields: plain });
    expect(await openClaimOffer(claim, undefined, undefined)).toBe('unopened');
    expect(await openClaimOffer({ ...claim, descendedFrom: 'VEIL-OTHER' }, key, undefined)).toBe('unopened');
    expect(await openClaimOffer({ ...claim, parentCommitment: 'cd'.repeat(32) }, key, undefined)).toBe('unopened');
    // A code made before offers were sealed: the registry's offerPlain.
    expect(
      await openClaimOffer(
        { recordId: 'VEIL-R', descendedFrom: 'VEIL-S', offerPlain: { bredBy: 'Old' } },
        undefined,
        undefined,
      ),
    ).toEqual({ fields: { bredBy: 'Old' } });
    expect(await openClaimOffer({ recordId: 'VEIL-R', descendedFrom: 'VEIL-S' }, key, undefined)).toBe('none');
  });

  it('an animal’s offer names the animal; its herd, pedigree and notes stay with the sender', async () => {
    const { offerPlaintext } = await import('./transfers');
    const animal = {
      ...source,
      profile: 'veilcore/profile/animal-individual/v1',
      taxon: 'Bos taurus',
      refId: 'US-840-1',
      animal: { breed: 'Angus', idScheme: 'NAIS', sex: 'female' as const, herd: 'secret herd' },
    };
    expect(offerPlaintext(animal as never)).toEqual({
      strainName: 'Cut',
      bredBy: 'Hollis',
      dateCreated: '2026-01-02',
      profile: 'veilcore/profile/animal-individual/v1',
      taxon: 'Bos taurus',
      refId: 'US-840-1',
      animal: { breed: 'Angus', idScheme: 'NAIS', sex: 'female' },
    });
  });

  it('the registry’s 409 for an old code is said in plain words, in every language', async () => {
    const { claimTransfer, labErrorWords } = await import('./transfers');
    const { makeTranslator } = await import('../i18n/translate');
    const { appDe } = await import('../i18n/app/de');
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: 'this code was made before the record was sealed; ask the sender for a new code' }),
          { status: 409 },
        ),
      ),
    );
    const out = await claimTransfer('TR-0A1B2C3D', CLAIM);
    expect(out).toEqual({
      error: 'This code was made before deliveries were locked, and it no longer works. Ask the sender for a new code.',
    });
    const de = makeTranslator('de', appDe);
    expect(labErrorWords((out as { error: string }).error, de)).toBe(de.t('app.sealed.err.newCode'));
    vi.unstubAllGlobals();
  });
});
