// Test data for the evidence bundle's tests: practice records of every shape the site seals,
// old (no key in the record) and key-bound, with the awkward strings canonicalisation has
// to get right. Imported by tests only.
// SPDX-License-Identifier: Apache-2.0

import { buildBatch, type InclusionProof } from 'veilcore-records';
import type { StrainRecord } from '../records';
import { fingerprintRecord } from '../commitment';
import { bindingForSecret } from '../key-binding';
import { canonicalScript, coreScript } from './verify-page';

const hex = (n: number, salt: string): string => {
  let s = '';
  for (let i = 0; s.length < 64; i++)
    s += ((n * 131 + i * 17 + salt.charCodeAt(i % salt.length)) % 256).toString(16).padStart(2, '0');
  return s.slice(0, 64);
};

/** A record secret for practice record n. */
export const secretFor = (n: number): string => hex(n + 7, 'secret');

type Shape = Partial<StrainRecord> & { bound?: boolean };

/** The shapes: each a way two implementations could disagree. */
const SHAPES: Shape[] = [
  { strainName: 'Test record: plain' },
  {
    strainName: 'Test record: profile and taxon',
    profile: 'veilcore/profile/plant-variety/v1',
    taxon: 'Cannabis sativa',
  },
  { strainName: 'Test record: key-bound', bound: true },
  {
    strainName: 'Test record: key-bound, profile',
    bound: true,
    profile: 'veilcore/profile/plant-variety/v1',
    taxon: 'Ovis aries',
  },
  { strainName: 'Test record: Café (decomposed accent)' },
  { strainName: 'Test record: 😀 and ｡ (code point order)', notes: '😀｡ ｡😀' },
  {
    strainName: 'Test record: parents',
    parents: [{ recordId: 'VEIL-AAAA', name: 'Mother' }, { name: 'Father, free-typed' }],
  },
  { strainName: 'Test record: photos', photoFingerprints: [hex(1, 'p'), hex(2, 'p'), hex(3, 'p')] },
  { strainName: 'Test record: "quotes" \\ backslash', notes: 'line one\nline two\ttab \u0001 control "q" </script>' },
  { strainName: 'Test record: lot and method', refId: 'LOT-42', breedingMethod: 'Backcross, F3' },
  { strainName: 'Test record: big clock', loggedAt: 1_760_000_000_123 },
  {
    strainName: 'Test record: key-bound, family',
    bound: true,
    parents: [{ name: 'P1' }],
    photoFingerprints: [hex(4, 'p')],
  },
  { strainName: 'Test record: empty notes', notes: '' },
  { strainName: 'テスト記録 (Japanese name)', bound: true },
  { strainName: 'Test record: Ω≈ç√ maths', notes: '∑ ≤ ∞' },
  { strainName: 'Test record: key-bound, accent Café', bound: true },
  { strainName: 'Test record: long notes', notes: 'x'.repeat(5000) },
  { strainName: 'Test record: stated date only', dateCreated: '1999-12-31' },
  { strainName: 'Test record: key-bound, lot', bound: true, refId: 'R-7', breedingMethod: 'Selfed' },
  { strainName: 'Test record: tab\tin name' },
  { strainName: 'Test record: key-bound, emoji 🌱', bound: true, notes: '🌱🌿' },
  { strainName: 'Test record: profile, no taxon', profile: 'veilcore/profile/plant-variety/v1' },
  { strainName: 'Test record: zero clock', loggedAt: 0 },
  {
    strainName: 'Test record: key-bound, many parents',
    bound: true,
    parents: Array.from({ length: 12 }, (_, i) => ({ name: `Parent ${i}` })),
  },
];

export const RECORD_COUNT = SHAPES.length;

/** Practice record n, sealed as the site seals it. */
export const practiceRecord = async (n: number): Promise<StrainRecord> => {
  const { bound, ...shape } = SHAPES[n % SHAPES.length];
  const base = {
    id: `VEIL-${hex(n, 'id').slice(0, 32).toUpperCase()}`,
    nonce: hex(n, 'nonce'),
    strainName: 'Test record',
    bredBy: 'Test breeder',
    dateCreated: '2026-01-01',
    notes: 'Practice data.',
    loggedAt: 1_760_000_000_000 + n,
    licenseIds: [],
    ...shape,
    ...(bound ? { keyBinding: bindingForSecret(secretFor(n)).keyBinding } : {}),
  };
  const recordFingerprint = await fingerprintRecord({ ...base, nonce: base.nonce });
  return { ...base, recordFingerprint };
};

export const practiceRecords = (count = RECORD_COUNT): Promise<StrainRecord[]> =>
  Promise.all(Array.from({ length: count }, (_, n) => practiceRecord(n)));

/** One batch over these records, as the registry builds it (the SDK's buildBatch). */
export const practiceBatch = async (
  records: readonly StrainRecord[],
): Promise<{ root: string; batchId: string; proofs: Record<string, InclusionProof> }> => {
  const b = await buildBatch(
    records.map((r) => r.recordFingerprint),
    'B-20261015-TEST',
    '2026-10-15T12:00:00Z',
  );
  return { root: b.root, batchId: b.batchId, proofs: b.proofs };
};

/**
 * verify.html's checks, loaded exactly as the page runs them: the SDK's canonical.js, then
 * verify-core.js, as one script. Typed by the caller.
 */
export const loadPageVerifier = <T>(): T =>
  // The page's own scripts, run as written: that is the point of the test.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(`${canonicalScript()}\n${coreScript()}\nreturn VeilcoreVerify;`)() as T;
