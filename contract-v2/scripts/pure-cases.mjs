// The inputs every pure circuit of both contracts is run on, for the v1/v2 comparison
// (v1-pure-vectors.mjs, src/test/v1-pure-circuits.test.ts). Deterministic.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';

const b = (label) => new Uint8Array(createHash('sha256').update(label).digest());
const zero = new Uint8Array(32);
const ff = new Uint8Array(32).fill(0xff);
const b23 = (label) => b(label).slice(0, 23);
const mask = (f) => Array.from({ length: 16 }, (_, i) => f(i));
// Field elements, as coordinates and challenge inputs: small, large, near the modulus.
const P = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
const fields = [0n, 1n, 12345678901234567890n, P - 1n, P / 3n];

/** JSON for circuit values: bigint as "n:<decimal>", bytes as "b:<hex>". */
export const enc = (v) =>
  typeof v === 'bigint'
    ? `n:${v}`
    : v instanceof Uint8Array
      ? `b:${Buffer.from(v).toString('hex')}`
      : Array.isArray(v)
        ? v.map(enc)
        : v !== null && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]))
          : v;

export const cases = () => {
  const s = [b('s1'), b('s2'), b('s3'), zero, ff];
  const out = [];
  const main = (circuit, ...args) => out.push({ contract: 'veilcore', circuit, args });
  const claims = (circuit, ...args) => out.push({ contract: 'veilcore-claims', circuit, args });
  for (const x of s) {
    main('commit', x);
    main('recoveryCommit', x);
  }
  for (const [x, y] of [[s[0], s[1]], [s[1], s[0]], [zero, ff], [ff, zero]]) {
    main('licenseCommit', x, y);
    main('licenseKey', x, y);
    main('presentationTag', x, y);
  }
  main('obligationKey', s[0], s[1], s[2]);
  main('obligationKey', s[2], s[1], s[0]);
  main('obligationKey', zero, zero, ff);
  for (const x of s) {
    claims('fieldLeaf', x, b23('salt ' + Buffer.from(x).toString('hex')));
    claims('fieldRecord', x, s[1]);
    claims('schemaId', x, s[2]);
    claims('attestationMessage', x);
  }
  claims('fieldSetRoot', s[0], Array.from({ length: 16 }, (_, i) => b('leaf ' + i)));
  claims('fieldSetRoot', zero, Array.from({ length: 16 }, () => ff));
  for (const n of [0n, 1n, 9650n, (1n << 64n) - 1n]) claims('numberBytes', n);
  for (const m of [mask(() => false), mask(() => true), mask((i) => i % 3 === 0)]) claims('maskBytes', m);
  claims('termsBytes', { documentDigest: s[0], comparable: mask((i) => i < 2), k: 1n, numeric: mask((i) => i === 12) });
  claims('termsBytes', { documentDigest: ff, comparable: mask(() => true), k: 255n, numeric: mask(() => true) });
  for (const [i, x] of s.entries())
    claims('attestationChallenge', fields[i % 5], fields[(i + 1) % 5], fields[(i + 2) % 5], fields[(i + 3) % 5], x);
  return out;
};
