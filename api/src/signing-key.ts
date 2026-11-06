// SPDX-License-Identifier: Apache-2.0
/**
 * Maintenance signing keys, as this repo writes them and as midnight-js 5 takes them.
 *
 * VeilCore's keys are Schnorr keys written as 64 hex characters (on paper, in key cards). midnight-js
 * 5 (Ledger 9) types a signing key as `{ tag: 'schnorr' | 'ecdsa', value }` and reads keys a 4.x
 * store saved as bare hex as `{ tag: 'schnorr', value }`. A Ledger 8 contract signs with Schnorr
 * keys only, so anything else is refused here rather than passed on.
 */
import { type SigningKey as FrameworkSigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';

/** A key as 64 hex characters, or a midnight-js 5 key object. */
export type AnySigningKey = string | FrameworkSigningKey;

/** The key as midnight-js 5 takes it. */
export const frameworkKey = (k: AnySigningKey): FrameworkSigningKey => {
  if (typeof k === 'string') {
    if (!/^[0-9a-fA-F]{64}$/.test(k)) throw new Error('A maintenance key is 64 hex characters.');
    return { tag: 'schnorr', value: k.toLowerCase() };
  }
  if (k?.tag !== 'schnorr' || !/^[0-9a-fA-F]{64}$/.test(k.value))
    throw new Error('A VeilCore maintenance key is a Schnorr key of 64 hex characters.');
  return k;
};

/** The key as 64 hex characters (what the Ledger 8 runtime and the paper copy use). */
export const hexKey = (k: AnySigningKey): string => frameworkKey(k).value;
