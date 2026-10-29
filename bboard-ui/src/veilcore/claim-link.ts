// A claim link, and checking one (docs/claims-screen.md).
//
// The holder made a claim on Midnight: one number from a sealed certificate is at most (or at
// least) a bound, or is a stated value. The link says which transaction, and what the holder
// says it proved. Nothing in it is believed:
//
//   1. the claim is read from the claims contract's state for that ONE call, through the
//      indexer (SPEC 4.5 check 1), on the claims contract this site was built for, never one
//      the link names;
//   2. what it proved must be what the link says: the record, the schema (recomputed here from
//      the published schema document, check 3), the number's slot, the direction and bound;
//   3. the record's anchored proof code is recomputed from the claim's record commitment and
//      the key binding (H(keyrecord, keyBinding, commitment), SPEC 3.6.1), and the page looks
//      up that proof code's date the same way every record's is (check 2).
//
// What it can't show is said on the page: the holder typed the numbers (no laboratory signed
// them, unless an attested claim says so), and each bound published narrows the number.
//
//   /check-claim#c=<base64url of {"v":1,...}>
// SPDX-License-Identifier: Apache-2.0

import { base64urlnopad } from '@scure/base';
import { fieldSchemaId, type FieldSchema } from '../../../contract/src/field-schema';
import { numberFrom } from '../../../contract/src/fields';
import { SCHEMAS } from './field-set';
import { keyBoundFingerprint } from './key-binding';

export const CLAIM_CHECK_PATH = '/check-claim';

/** A claim this browser made, kept on the record (outside its fingerprint) and in its link. */
export type MadeClaim = {
  readonly kind: 'range' | 'value';
  /** The claims contract it was made on. */
  readonly contract: string;
  readonly txId: string;
  readonly blockHeight?: number;
  readonly blockTime?: number;
  /** The record commitment the claim names (the record's content hash, SPEC 4.5). */
  readonly record: string;
  /** The record's key binding: with the commitment, its anchored proof code. Says nothing about the key. */
  readonly keyBinding?: string;
  /** The published schema's document id ("veilcore/schema/potency/v1"). */
  readonly schema: string;
  readonly slot: number;
  /** range: the direction and the bound as stored (the value times the slot's scale). */
  readonly op?: 'at-most' | 'at-least';
  readonly bound?: string;
  /** value: the number published, as stored. */
  readonly value?: string;
};

const HEX64 = /^[0-9a-f]{64}$/;
const DEC = /^(0|[1-9]\d{0,19})$/;
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export const claimLink = (c: MadeClaim, origin: string): string =>
  `${origin}${CLAIM_CHECK_PATH}#c=${base64urlnopad.encode(new TextEncoder().encode(JSON.stringify({ v: 1, ...c })))}`;

/** The claim a link describes, checked for form only; undefined when it can't be read. */
export const readClaimLink = (hash: string): MadeClaim | undefined => {
  const c = new URLSearchParams(hash.replace(/^#/, '')).get('c');
  if (!c) return undefined;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64urlnopad.decode(c))) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
  if (typeof o !== 'object' || o === null || o.v !== 1) return undefined;
  const str = (k: string) => (typeof o[k] === 'string' ? o[k] : undefined);
  const kind = o.kind === 'range' || o.kind === 'value' ? o.kind : undefined;
  const contract = str('contract');
  const txId = str('txId');
  const record = str('record');
  const schema = str('schema');
  const slot =
    typeof o.slot === 'number' && Number.isInteger(o.slot) && o.slot >= 0 && o.slot < 16 ? o.slot : undefined;
  if (!kind || !contract || !HEX64.test(contract) || !txId || !/^[0-9a-f]{2,256}$/.test(txId)) return undefined;
  if (!record || !HEX64.test(record) || !schema || !SCHEMAS[schema] || slot === undefined) return undefined;
  const keyBinding = str('keyBinding');
  if (keyBinding !== undefined && !HEX64.test(keyBinding)) return undefined;
  const op = o.op === 'at-most' || o.op === 'at-least' ? o.op : undefined;
  const bound = str('bound');
  const value = str('value');
  if (kind === 'range' && (!op || !bound || !DEC.test(bound))) return undefined;
  if (kind === 'value' && (!value || !DEC.test(value))) return undefined;
  return {
    kind,
    contract,
    txId,
    record,
    schema,
    slot,
    ...(keyBinding ? { keyBinding } : {}),
    ...(kind === 'range' ? { op, bound } : { value }),
    ...(typeof o.blockHeight === 'number' ? { blockHeight: o.blockHeight } : {}),
    ...(typeof o.blockTime === 'number' ? { blockTime: o.blockTime } : {}),
  };
};

/** The proof code the record was dated under: the commitment, with its key folded in when it names one. */
export const anchoredFingerprintOf = (c: Pick<MadeClaim, 'record' | 'keyBinding'>): string =>
  c.keyBinding ? keyBoundFingerprint(c.keyBinding, c.record) : c.record;

/** What the claims contract recorded for one call, as the check reads it (verify-claims.ts Claim). */
export type ChainClaim = {
  readonly kind: string;
  readonly record: Uint8Array;
  readonly schema: Uint8Array;
  readonly slot?: number;
  readonly value?: Uint8Array;
  readonly bound?: bigint;
  readonly op?: 'at least' | 'at most';
};

export type ClaimVerdict =
  | { readonly ok: true; readonly blockHeight?: number; readonly blockTime?: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Compare what the chain recorded with what the link says. The schema id is recomputed from the
 * published schema document, so a claim under another schema with the same slot never matches.
 */
export const compareClaim = (link: MadeClaim, onChain: ChainClaim): ClaimVerdict => {
  const schema = SCHEMAS[link.schema] as FieldSchema | undefined;
  if (!schema) return { ok: false, reason: 'The link names a schema this site doesn’t publish.' };
  if (onChain.kind !== link.kind) return { ok: false, reason: 'That transaction made a different kind of claim.' };
  if (hex(onChain.record) !== link.record) return { ok: false, reason: 'That claim is about a different record.' };
  if (hex(onChain.schema) !== hex(fieldSchemaId(schema)))
    return { ok: false, reason: 'That claim was made under a different schema.' };
  if (onChain.slot !== link.slot) return { ok: false, reason: 'That claim is about a different number.' };
  if (link.kind === 'range') {
    const op = onChain.op === 'at most' ? 'at-most' : 'at-least';
    if (op !== link.op || onChain.bound?.toString() !== link.bound)
      return { ok: false, reason: 'That claim proved a different bound.' };
  } else {
    let v: bigint;
    try {
      v = numberFrom(onChain.value ?? new Uint8Array());
    } catch {
      return { ok: false, reason: 'That claim published something that isn’t a number.' };
    }
    if (v.toString() !== link.value) return { ok: false, reason: 'That claim published a different value.' };
  }
  return { ok: true };
};
