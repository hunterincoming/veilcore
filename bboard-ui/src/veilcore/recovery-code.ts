// The recovery sheet's code (easy mode step 3, docs/passkey-backup.md "Recovery sheet").
//
// Made on the device, never sent anywhere and never kept: it is shown and printed once, and what
// it opens is a slot at the registry (account-copy.ts) whose id, read token and sealing key come
// from the code through HKDF, under labels of their own. So the registry learns none of it.
//
// The format, chosen to be typed back by hand from paper:
//   - 27 random symbols of Crockford's base32 (0-9 and A-Z without I, L, O, U): 135 bits, well
//     over the 120 the plan asks for. No slow key derivation is needed at that size: guessing is
//     out of reach however fast each guess is.
//   - one check symbol from the same 32 (the Luhn mod N algorithm with N = 32): any one wrong
//     character, and most swaps of two neighbours, are caught on the device before anything is
//     asked of the registry. Crockford's own check symbol needs five extra symbols (* ~ $ = U)
//     that are awkward on a phone keyboard; this one needs none.
//   - 28 symbols in seven groups of four: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX.
// Reading it back forgives what people do on paper: lower case, spaces or no dashes, O for 0,
// I or L for 1.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64urlnopad } from '@scure/base';
import { enT } from '../i18n/translate';

export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const N = 32;
/** Random symbols in a code: 27 × 5 = 135 bits. */
export const CODE_DATA = 27;
/** Symbols in a whole code, with its check symbol. */
export const CODE_LENGTH = CODE_DATA + 1;

/** What can be wrong with a typed code, in English (flow/backup-words.ts says each in the visitor's language). */
export const SHEET_WORDS = {
  length: enT.t('app.recovery.err.length'),
  typo: enT.t('app.recovery.err.typo'),
  wrong: enT.t('app.recovery.err.wrong'),
  notThisSheet: enT.t('app.recovery.err.notThisSheet'),
  needsSheet: enT.t('app.recovery.err.needsSheet'),
} as const;

/** Luhn mod N: the check symbol's value for these symbol values. */
const checkOf = (values: readonly number[]): number => {
  let factor = 2;
  let sum = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    let addend = factor * values[i];
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
  }
  return (N - (sum % N)) % N;
};

/** Whether values, the last being the check symbol, pass. */
const passes = (values: readonly number[]): boolean => {
  let factor = 1;
  let sum = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    let addend = factor * values[i];
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
  }
  return sum % N === 0;
};

/** A new code: 28 symbols, no dashes (groupCode shows it). */
export const newRecoveryCode = (): string => {
  // 256 is a multiple of 32, so a byte's low five bits are uniform.
  const values = Array.from(crypto.getRandomValues(new Uint8Array(CODE_DATA)), (b) => b & 31);
  return [...values, checkOf(values)].map((v) => CROCKFORD[v]).join('');
};

/** "XXXX-XXXX-…": the code as it is printed. */
export const groupCode = (code: string): string => (code.match(/.{1,4}/g) ?? []).join('-');

export type ParsedCode = { readonly ok: true; readonly code: string } | { readonly ok: false; readonly why: string };

/** A code as typed, read back: the 28 symbols, or what is wrong with it. */
export const parseRecoveryCode = (typed: string): ParsedCode => {
  const s = typed
    .toUpperCase()
    .replace(/[\s\-–—_.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (s.length !== CODE_LENGTH) return { ok: false, why: SHEET_WORDS.length };
  const values = Array.from(s, (c) => CROCKFORD.indexOf(c));
  if (values.some((v) => v < 0) || !passes(values)) return { ok: false, why: SHEET_WORDS.typo };
  return { ok: true, code: s };
};

const LABEL = 'veilcore/account-slot/recovery/v1';

/**
 * A recovery slot's keys from its code: the slot's id at the registry (32 hex), the token that
 * reads it, and the key that seals the account key for it. One HKDF, its own label (the passkey's
 * slot and the copy use others), the whole code (check symbol included) as its input.
 */
export const recoverySlotKeys = (
  code: string,
): { readonly slotId: string; readonly token: string; readonly kek: Uint8Array<ArrayBuffer> } => {
  const enc = new TextEncoder();
  const okm = hkdf(sha256, enc.encode(code), enc.encode(LABEL), enc.encode(LABEL), 80);
  const hex = Array.from(okm.slice(32, 48), (x) => x.toString(16).padStart(2, '0')).join('');
  return { kek: new Uint8Array(okm.slice(0, 32)), slotId: hex, token: base64urlnopad.encode(okm.slice(48, 80)) };
};
