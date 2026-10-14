// The browser's stand-in for node:crypto, for the shared checking code the site runs
// (contract/src/pairing.ts, api/src/state-check.ts call createHash('sha256')). Vite
// would otherwise replace node:crypto with a stub that throws when used, which broke the
// checker's "is this answer real?" step in the browser. SHA-256 only, synchronous like
// Node's; anything else throws plainly. Used by site builds only (vite.config.ts), not by
// the tests, which run in Node with the real module.
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';

type Data = string | Uint8Array;
const toBytes = (d: Data, enc?: string): Uint8Array => {
  if (typeof d !== 'string') return d;
  if (enc && enc !== 'utf8' && enc !== 'utf-8') throw new Error(`createHash: ${enc} input is not supported here`);
  return new TextEncoder().encode(d);
};
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export const createHash = (algorithm: string) => {
  if (algorithm.toLowerCase() !== 'sha256') throw new Error(`createHash: only sha256 is available in the browser`);
  const h = sha256.create();
  const api = {
    update(d: Data, enc?: string) {
      h.update(toBytes(d, enc));
      return api;
    },
    digest(enc?: string) {
      const out = h.digest();
      if (enc === 'hex') return hex(out);
      if (enc === undefined) return globalThis.Buffer ? globalThis.Buffer.from(out) : out;
      throw new Error(`createHash: ${enc} output is not supported here`);
    },
  };
  return api;
};

export const randomBytes = (n: number): Uint8Array => {
  const out = crypto.getRandomValues(new Uint8Array(n));
  return globalThis.Buffer ? globalThis.Buffer.from(out) : out;
};

export default { createHash, randomBytes };
