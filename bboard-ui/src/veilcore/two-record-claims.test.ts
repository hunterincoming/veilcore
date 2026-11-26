// Claims about two of the holder's records (two-record-claims.ts, prove-two.ts): built from the
// holder's own copies (claims-input.ts), run through the claims contract's own compiled circuits
// in memory, and checked the way the check page checks them. What matters most: a pair the
// contract refuses is refused here first (the same record, fewer than k compared numbers that
// differ, a correction that changed a number it doesn't list, a list that says nothing), a link
// is never believed beyond what the chain recorded, and no record id leaves in a link.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import { claimMaterial, commitmentHex, type ClaimMaterial } from './claims-input';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { claimFromCells } from '../../../contract/src/verify-claims';
import {
  TWO_RECORD_FORMS,
  changedSlots,
  compareTwoClaim,
  datedCodesOf,
  differingCount,
  distinctRefusal,
  isTwoClaimHash,
  maskOf,
  maskSaysNothing,
  pairCandidates,
  readTwoClaimLink,
  twoClaimLink,
  twoRecordFormOffered,
  unchangedRefusal,
  type TwoClaim,
} from './two-record-claims';
import { proveDistinct, proveUnchanged, type TwoClaimCalls } from './prove-two';
import { checkTwoClaim } from './chain/claim-check';
import { keyBoundFingerprint } from './key-binding';
import { LAB_ONLY_SCHEMAS } from './field-set';
import { MATCH, POTENCY, SEED, potency, sealedNumbers } from './two-record-test-records';
import type { StrainRecord } from './records';

const CONTRACT = 'c1'.repeat(32);
const ORIGIN = 'https://test.veilcore.org';
const hashOf = (link: string) => link.slice(link.indexOf('#'));

const material = (r: StrainRecord) => claimMaterial(r as never);

/** What the claims contract records for a proveDistinct call, from the two records' own copies. */
const distinctOnChain = async (a: StrainRecord, b: StrainRecord) => {
  const [ma, mb] = await Promise.all([material(a), material(b)]);
  const sim = new ClaimsSimulator();
  sim.call({ first: ma.fieldSet, second: mb.fieldSet, terms: ma.terms }, 'proveDistinct', ma.commitment, mb.commitment);
  return { ma, mb, onChain: claimFromCells(sim.state) };
};

/** What the claims contract records for a proveUnchanged call. */
const unchangedOnChain = async (original: StrainRecord, corrected: StrainRecord, slots: number[]) => {
  const [ma, mb] = await Promise.all([material(original), material(corrected)]);
  const sim = new ClaimsSimulator();
  sim.call(
    { first: ma.fieldSet, second: mb.fieldSet },
    'proveUnchanged',
    ma.commitment,
    mb.commitment,
    ma.schemaId,
    maskOf(slots),
  );
  return { ma, mb, onChain: claimFromCells(sim.state) };
};

const linkOf = (
  kind: TwoClaim['kind'],
  ma: { commitment: Uint8Array },
  mb: { commitment: Uint8Array },
  more: Partial<TwoClaim> = {},
): TwoClaim => ({
  kind,
  contract: CONTRACT,
  txId: 'ab'.repeat(32),
  record: commitmentHex(ma as never),
  other: commitmentHex(mb as never),
  schema: POTENCY,
  ...more,
});

describe('which forms offer them', () => {
  it('the forms a holder types in, never a lab’s result form', () => {
    expect(TWO_RECORD_FORMS.length).toBeGreaterThan(0);
    for (const f of TWO_RECORD_FORMS) expect(twoRecordFormOffered(f), f).toBe(true);
    for (const f of LAB_ONLY_SCHEMAS) expect(twoRecordFormOffered(f), f).toBe(false);
    expect(twoRecordFormOffered(undefined)).toBe(false);
  });

  it('pairs a record only with another under the same form', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const s = await sealedNumbers(SEED, [9500n]);
    const local = await sealedNumbers(POTENCY, potency(1n, 1n), { id: 'LOCAL' });
    expect(pairCandidates(a, [a, b, s, local], (r) => r.id === 'LOCAL').map((r) => r.id)).toEqual([b.id]);
  });
});

describe('"these two records are different" (proveDistinct)', () => {
  it('is proved when they differ in at least k compared numbers, and its link checks', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 11400n));
    expect(differingCount(a, b)).toBe(1);
    expect(distinctRefusal(a, b)).toBeUndefined();
    const { ma, mb, onChain } = await distinctOnChain(a, b);
    // What is published: the two records and the form. Never which number differs, nor any number.
    const published = JSON.stringify(onChain, (_, x: unknown) => (typeof x === 'bigint' ? x.toString() : x));
    expect(published).not.toContain('"210"');
    expect(published).not.toContain('"300"');
    expect(onChain).toMatchObject({ kind: 'distinct' });
    const link = linkOf('distinct', ma, mb, { keyBinding: a.keyBinding, otherKeyBinding: b.keyBinding });
    expect(compareTwoClaim(link, onChain)).toEqual({ ok: true });
    const read = readTwoClaimLink(hashOf(twoClaimLink(link, ORIGIN)));
    expect(read).toEqual(link);
    expect(isTwoClaimHash(hashOf(twoClaimLink(link, ORIGIN)))).toBe(true);
    expect(datedCodesOf(link)).toEqual({
      first: keyBoundFingerprint(a.keyBinding!, link.record),
      second: keyBoundFingerprint(b.keyBinding!, link.other),
    });
    const reader = () => Promise.resolve({ claim: onChain, blockHeight: 9, blockTime: 1_790_000_000_000 });
    expect(await checkTwoClaim(link, { read: reader, contract: CONTRACT })).toEqual({
      ok: true,
      blockHeight: 9,
      blockTime: 1_790_000_000_000,
    });
  });

  it('a link that says more than was proved, or about other records, is refused', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const { ma, mb, onChain } = await distinctOnChain(a, b);
    const link = linkOf('distinct', ma, mb);
    // The two records the other way round, another record, another form, another kind.
    expect(compareTwoClaim({ ...link, record: link.other, other: link.record }, onChain).ok).toBe(false);
    expect(compareTwoClaim({ ...link, other: 'ee'.repeat(32) }, onChain).ok).toBe(false);
    expect(compareTwoClaim({ ...link, schema: SEED }, onChain).ok).toBe(false);
    expect(compareTwoClaim({ ...link, kind: 'unchanged', mayChange: [0] }, onChain).ok).toBe(false);
    const reader = () => Promise.resolve({ claim: onChain });
    const other = await checkTwoClaim({ ...link, contract: 'dd'.repeat(32) }, { read: reader, contract: CONTRACT });
    expect(!other.ok && other.reason).toMatch(/isn’t VeilCore’s/);
  });

  it('refuses the same record twice, here and in the contract', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    expect(distinctRefusal(a, a)?.key).toBe('app.tworec.refuse.sameRecord');
    await expect(distinctOnChain(a, a)).rejects.toThrow();
  });

  it('refuses fewer than k compared numbers that differ, here and in the contract', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const same = await sealedNumbers(POTENCY, potency(210n, 11400n));
    expect(differingCount(a, same)).toBe(0);
    expect(distinctRefusal(a, same)).toEqual({ key: 'app.tworec.refuse.tooFew', vars: { n: '0', k: '1' } });
    await expect(distinctOnChain(a, same)).rejects.toThrow();
    // A number on only one of them never counts as a difference (the contract's rule too).
    const thcOnly = await sealedNumbers(POTENCY, potency(210n, null));
    const cbdOnly = await sealedNumbers(POTENCY, potency(null, 11400n));
    expect(distinctRefusal(thcOnly, cbdOnly)?.key).toBe('app.tworec.refuse.tooFew');
    await expect(distinctOnChain(thcOnly, cbdOnly)).rejects.toThrow();
    // Moisture isn't one of the numbers potency compares.
    const m1 = await sealedNumbers(POTENCY, [210n, null, null, null, null, null, null, 80n]);
    const m2 = await sealedNumbers(POTENCY, [210n, null, null, null, null, null, null, 95n]);
    expect(distinctRefusal(m1, m2)?.key).toBe('app.tworec.refuse.tooFew');
  });

  it('refuses two forms, and a lab’s result form', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const s = await sealedNumbers(SEED, [9500n]);
    expect(distinctRefusal(a, s)?.key).toBe('app.tworec.refuse.otherForm');
    const m1 = await sealedNumbers(MATCH, [1n, 90n, 0n]);
    const m2 = await sealedNumbers(MATCH, [0n, 90n, 31n]);
    expect(distinctRefusal(m1, m2)?.key).toBe('app.tworec.refuse.notOffered');
  });
});

describe('"a correction only changed what it says" (proveUnchanged)', () => {
  it('is proved when every number outside the list is the same, and its link checks', async () => {
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    expect(changedSlots(original, corrected)).toEqual([0]);
    expect(unchangedRefusal(original, corrected, [0])).toBeUndefined();
    const { ma, mb, onChain } = await unchangedOnChain(original, corrected, [0]);
    expect(onChain).toMatchObject({ kind: 'unchanged' });
    const link = linkOf('unchanged', ma, mb, { mayChange: [0] });
    expect(compareTwoClaim(link, onChain)).toEqual({ ok: true });
    expect(readTwoClaimLink(hashOf(twoClaimLink(link, ORIGIN)))).toEqual(link);
    // A list longer than what changed still proves (a ticked number may or may not have changed).
    expect(unchangedRefusal(original, corrected, [0, 5])).toBeUndefined();
  });

  it('refuses a correction that changed a number it doesn’t list, here and in the contract', async () => {
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 12000n));
    expect(unchangedRefusal(original, corrected, [0], (i) => `slot ${i}`)).toEqual({
      key: 'app.tworec.refuse.undeclared',
      vars: { list: 'slot 3' },
    });
    expect(unchangedRefusal(original, corrected, [])?.key).toBe('app.tworec.refuse.undeclared');
    await expect(unchangedOnChain(original, corrected, [0])).rejects.toThrow();
    // A number added where there was none is a change too.
    const added = await sealedNumbers(POTENCY, [210n, 40n, null, 11400n, ...Array<null>(12).fill(null)]);
    expect(unchangedRefusal(original, added, [])?.key).toBe('app.tworec.refuse.undeclared');
    await expect(unchangedOnChain(original, added, [])).rejects.toThrow();
  });

  it('refuses a list that says nothing, and the same record', async () => {
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const every = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(maskSaysNothing(POTENCY, every)).toBe(true);
    expect(maskSaysNothing(POTENCY, [0])).toBe(false);
    expect(unchangedRefusal(original, corrected, every)?.key).toBe('app.tworec.refuse.saysNothing');
    expect(unchangedRefusal(original, original, [0])?.key).toBe('app.tworec.refuse.sameRecord');
  });

  it('the check page refuses a claim whose list says nothing, though the contract took it', async () => {
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const every = [0, 1, 2, 3, 4, 5, 6, 7];
    const { ma, mb, onChain } = await unchangedOnChain(original, corrected, every);
    const v = compareTwoClaim(linkOf('unchanged', ma, mb, { mayChange: every }), onChain);
    expect(!v.ok && v.reason).toMatch(/says nothing/);
    // And a link naming another list than the chain's.
    const one = await unchangedOnChain(original, corrected, [0]);
    expect(compareTwoClaim(linkOf('unchanged', one.ma, one.mb, { mayChange: [0, 3] }), one.onChain).ok).toBe(false);
  });
});

describe('a link to a claim about two records', () => {
  it('carries no record id, only what the check needs', () => {
    const link = {
      ...linkOf('distinct', { commitment: new Uint8Array(32).fill(1) }, { commitment: new Uint8Array(32).fill(2) }),
      ids: ['VEIL-SECRET-A', 'VEIL-SECRET-B'] as const,
    };
    const text = twoClaimLink(link, ORIGIN);
    expect(Buffer.from(text.split('#p=')[1], 'base64url').toString()).not.toContain('VEIL-SECRET');
  });

  it('can’t be read when malformed, the same record twice, or a form not offered', () => {
    const enc = (o: object) => `#p=${Buffer.from(JSON.stringify({ v: 1, ...o })).toString('base64url')}`;
    const base = {
      kind: 'distinct',
      contract: CONTRACT,
      txId: 'ab'.repeat(32),
      record: '01'.repeat(32),
      other: '02'.repeat(32),
      schema: POTENCY,
    };
    expect(readTwoClaimLink(enc(base))).toBeDefined();
    expect(readTwoClaimLink('')).toBeUndefined();
    expect(readTwoClaimLink('#p=%%')).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, other: base.record }))).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, schema: MATCH }))).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, kind: 'unchanged' }))).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, kind: 'unchanged', mayChange: [0, 0] }))).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, kind: 'unchanged', mayChange: [16] }))).toBeUndefined();
    expect(readTwoClaimLink(enc({ ...base, mayChange: [0] }))).toBeUndefined();
  });
});

describe('proving from the page (prove-two.ts)', () => {
  const calls = () => {
    const seen: string[] = [];
    const receipt = { contract: CONTRACT, txId: 'cd'.repeat(32), blockHeight: 7 };
    const c: TwoClaimCalls = {
      proveDistinctOnChain: vi.fn((a: ClaimMaterial, b: ClaimMaterial) => {
        seen.push(`distinct ${commitmentHex(a)} ${commitmentHex(b)}`);
        return Promise.resolve(receipt);
      }),
      proveUnchangedOnChain: vi.fn((a: ClaimMaterial, b: ClaimMaterial, m: readonly number[]) => {
        seen.push(`unchanged ${commitmentHex(a)} ${commitmentHex(b)} ${m.join(',')}`);
        return Promise.resolve(receipt);
      }),
    };
    return { c, seen };
  };

  it('sends nothing while the sponsor doesn’t pay for them', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 11400n));
    await expect(proveDistinct(a, b, { sponsored: false })).rejects.toThrow(/doesn’t pay for this proof yet/);
    await expect(proveUnchanged(a, b, [0], { sponsored: false })).rejects.toThrow(/doesn’t pay for this proof yet/);
  });

  it('refuses before any call: the same record, too few differences, an unlisted change', async () => {
    const a = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const same = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const b = await sealedNumbers(POTENCY, potency(300n, 12000n));
    const { c } = calls();
    await expect(proveDistinct(a, a, { calls: c })).rejects.toThrow(/same record/);
    await expect(proveDistinct(a, same, { calls: c })).rejects.toThrow(/differ in 0 of the compared numbers/);
    await expect(proveUnchanged(a, b, [0], { calls: c, words: () => 'Total CBD' })).rejects.toThrow(
      /Total CBD changed but isn’t ticked/,
    );
    expect(c.proveDistinctOnChain).not.toHaveBeenCalled();
    expect(c.proveUnchangedOnChain).not.toHaveBeenCalled();
  });

  it('a claim made: both records in the claim’s order, the list as published, the ids kept here', async () => {
    const original = await sealedNumbers(POTENCY, potency(210n, 11400n));
    const corrected = await sealedNumbers(POTENCY, potency(300n, 11400n));
    const { c, seen } = calls();
    const made = await proveUnchanged(original, corrected, [0], { calls: c });
    const [mo, mc] = await Promise.all([material(original), material(corrected)]);
    expect(seen).toEqual([`unchanged ${commitmentHex(mo)} ${commitmentHex(mc)} 0`]);
    expect(made).toMatchObject({
      kind: 'unchanged',
      ids: [original.id, corrected.id],
      record: commitmentHex(mo),
      other: commitmentHex(mc),
      mayChange: [0],
      keyBinding: original.keyBinding,
      otherKeyBinding: corrected.keyBinding,
    });
    const d = await proveDistinct(corrected, original, { calls: c });
    expect(d).toMatchObject({ kind: 'distinct', ids: [corrected.id, original.id], record: commitmentHex(mc) });
  });
});
