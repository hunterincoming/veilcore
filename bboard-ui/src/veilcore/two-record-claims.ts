// Two claims about a PAIR of the holder's own records (SPEC 4.5; docs/claims-design.md), on the
// claims contract that is already on Midnight's main network:
//
//   distinct   "these two records are different": they differ in at least k of the numbers
//              their form compares (proveDistinct). k and which numbers are compared are fixed
//              by the published form, never chosen per claim. Which numbers differ, and how
//              many, are never published.
//   unchanged  "a correction only changed what it says": outside the numbers the holder ticks,
//              the two records hold the same numbers (proveUnchanged). The ticked list is
//              published; the numbers are not.
//
// This file is the site's side, apart from its screen (components/document/TwoRecordClaims.tsx)
// and the call (chain/claims-call.ts): which forms offer them, the checks made here before a
// minute of proving (the contract makes the same ones and would refuse), the link, and comparing
// what the chain recorded with what a link says. What neither claim shows is said wherever it is
// offered or checked (SPEC 4.5, "Limits that shall be stated").
//
// Only on the forms a holder types in: a lab's genotype or call forms are kept out (marker-claims.ts
// rule 4), where "differs in at least 1" would publish only that two lab calls differ.
// SPDX-License-Identifier: Apache-2.0

import { base64urlnopad } from '@scure/base';
import { fieldSchemaId, type FieldSchema } from '../../../contract/src/field-schema';
import type { Claim } from '../../../contract/src/verify-claims';
import { SCHEMAS, type HeldFieldSet } from './field-set';
import { DISTINCT_SCHEMAS } from './marker-claims';
import { CLAIM_CHECK_PATH } from './claim-link';
import { keyBoundFingerprint } from './key-binding';
import type { AppKey } from '../i18n/app/en';

export type TwoKind = 'distinct' | 'unchanged';

/** The forms both claims are offered on: the holder-typed ones (marker-claims.ts DISTINCT_SCHEMAS). */
export const TWO_RECORD_FORMS: readonly string[] = DISTINCT_SCHEMAS;

export const twoRecordFormOffered = (schema: string | undefined): boolean =>
  !!schema && TWO_RECORD_FORMS.includes(schema) && !!SCHEMAS[schema];

/** A claim about two records, kept on both (outside their fingerprints) and in its link. */
export type TwoClaim = {
  readonly kind: TwoKind;
  /** The claims contract it was made on. */
  readonly contract: string;
  readonly txId: string;
  readonly blockHeight?: number;
  readonly blockTime?: number;
  /** distinct: the first record's commitment; unchanged: the earlier record's. */
  readonly record: string;
  /** distinct: the other record's commitment; unchanged: the correction's. */
  readonly other: string;
  /** Each record's key binding: with its commitment, its dated proof code. */
  readonly keyBinding?: string;
  readonly otherKeyBinding?: string;
  /** The published form's document id ("veilcore/schema/potency/v1"). */
  readonly schema: string;
  /** unchanged: the slots the correction was allowed to change, in order. Published. */
  readonly mayChange?: readonly number[];
};

/**
 * A claim about two records as this browser keeps it on both: the claim, and which of this
 * holder's records it names first and second (`ids`). The ids stay here: never in a link.
 */
export type HeldTwoClaim = TwoClaim & { readonly ids: readonly [string, string] };

/** What this file needs of a record: its id, its proof code and its sealed numbers. */
export type PairRecord = {
  readonly id: string;
  readonly recordFingerprint?: string;
  readonly fieldSet?: Pick<HeldFieldSet, 'schema' | 'values'>;
  /** A lab's copy of its own result (records.ts StrainRecord.copy): never offered. */
  readonly copy?: true;
};

/** Why a claim about two records can't be made, as an app key and its values. */
export type TwoRefusal = { readonly key: AppKey; readonly vars?: Record<string, string> };

const valueAt = (r: PairRecord, slot: number): bigint | undefined => {
  const v = r.fieldSet?.values[slot];
  return v === null || v === undefined ? undefined : BigInt(v);
};

/** The form's slots, in order. */
export const formSlots = (schema: string): readonly { slot: number; path: string }[] =>
  (SCHEMAS[schema]?.slots ?? []).map((s) => ({ slot: s.slot, path: s.path }));

/** The slots the form compares for distinctness, and its threshold k. */
export const comparedOf = (schema: string): { readonly slots: readonly number[]; readonly k: number } => {
  const s = SCHEMAS[schema] as (FieldSchema & { k: number }) | undefined;
  return { slots: (s?.slots ?? []).filter((x) => x.comparable).map((x) => x.slot), k: s?.k ?? 0 };
};

/**
 * How many compared numbers differ, counting only numbers present in both: exactly what the
 * contract counts (veilcore-claims.compact checkDistinct). Never shown to anyone but the holder.
 */
export const differingCount = (a: PairRecord, b: PairRecord): number => {
  const schema = a.fieldSet?.schema ?? '';
  return comparedOf(schema).slots.filter((i) => {
    const x = valueAt(a, i);
    const y = valueAt(b, i);
    return x !== undefined && y !== undefined && x !== y;
  }).length;
};

/** The slots whose sealed value differs between the two, a number added or removed included. */
export const changedSlots = (a: PairRecord, b: PairRecord): readonly number[] =>
  Array.from({ length: 16 }, (_, i) => i).filter((i) => valueAt(a, i) !== valueAt(b, i));

const samePair = (a: PairRecord, b: PairRecord): boolean =>
  a.id === b.id || (!!a.recordFingerprint && a.recordFingerprint === b.recordFingerprint);

/** The refusals both claims share: a form offered, numbers on both, two records, one form. */
const pairRefusal = (a: PairRecord, b: PairRecord): TwoRefusal | undefined => {
  if (!a.fieldSet || !b.fieldSet) return { key: 'app.tworec.refuse.noNumbers' };
  if (!twoRecordFormOffered(a.fieldSet.schema) || a.copy === true || b.copy === true)
    return { key: 'app.tworec.refuse.notOffered' };
  if (samePair(a, b)) return { key: 'app.tworec.refuse.sameRecord' };
  if (a.fieldSet.schema !== b.fieldSet.schema) return { key: 'app.tworec.refuse.otherForm' };
  return undefined;
};

/** Why "these two records are different" can't be proved, or undefined when it can. */
export const distinctRefusal = (a: PairRecord, b: PairRecord): TwoRefusal | undefined => {
  const why = pairRefusal(a, b);
  if (why) return why;
  const { k } = comparedOf(a.fieldSet!.schema);
  const n = differingCount(a, b);
  if (k < 1 || n < k) return { key: 'app.tworec.refuse.tooFew', vars: { n: String(n), k: String(k) } };
  return undefined;
};

/** The mask the contract takes: slot i may change when it is in `slots`. */
export const maskOf = (slots: readonly number[]): boolean[] => Array.from({ length: 16 }, (_, i) => slots.includes(i));

/** The slots a mask allows to change, in order. */
export const slotsOfMask = (mask: readonly boolean[]): number[] => mask.flatMap((b, i) => (b ? [i] : []));

/**
 * Whether a list of slots allowed to change says nothing: every slot the form describes is in it
 * (SPEC 4.5 check 8: the others are empty in every record, so equality there says nothing).
 */
export const maskSaysNothing = (schema: string, slots: readonly number[]): boolean => {
  const described = formSlots(schema).map((s) => s.slot);
  return slots.length >= 16 || described.every((i) => slots.includes(i));
};

/**
 * Why "a correction only changed what it says" can't be proved, or undefined when it can.
 * `original` is the earlier record, `corrected` the correction, `mayChange` the ticked slots.
 */
export const unchangedRefusal = (
  original: PairRecord,
  corrected: PairRecord,
  mayChange: readonly number[],
  words: (slot: number) => string = String,
): TwoRefusal | undefined => {
  const why = pairRefusal(original, corrected);
  if (why) return why;
  const schema = original.fieldSet!.schema;
  if (maskSaysNothing(schema, mayChange)) return { key: 'app.tworec.refuse.saysNothing' };
  const undeclared = changedSlots(original, corrected).filter((i) => !mayChange.includes(i));
  if (undeclared.length > 0)
    return { key: 'app.tworec.refuse.undeclared', vars: { list: undeclared.map(words).join(', ') } };
  return undefined;
};

/**
 * SPEC 4.5 disclosure accounting, for a correction: what earlier claims already published about
 * the earlier record's numbers. Proving that every number outside the list is unchanged makes
 * each of those claims true of the correction as well, for every number left unticked. The ones
 * on ticked numbers don't carry over. Shown to the holder before anything is proved.
 */
export const carriedClaims = <C extends { readonly slot: number }>(
  earlier: readonly C[] | undefined,
  mayChange: readonly number[],
): C[] => (earlier ?? []).filter((c) => !mayChange.includes(c.slot));

/** The other records a claim with this one can be about: the same form, numbers sealed, not this one. */
export const pairCandidates = <R extends PairRecord>(record: R, all: readonly R[], skip: (r: R) => boolean): R[] =>
  all.filter(
    (r) =>
      !samePair(record, r) &&
      !skip(r) &&
      !!r.fieldSet &&
      !!record.fieldSet &&
      r.fieldSet.schema === record.fieldSet.schema,
  );

// ---- the link: /check-claim#p=<base64url of {"v":1,...}> -------------------------------------

const HEX64 = /^[0-9a-f]{64}$/;
const TXID = /^[0-9a-f]{2,256}$/;

/** Only what a link carries: never this browser's record ids. */
const linkPart = (c: TwoClaim): TwoClaim => ({
  kind: c.kind,
  contract: c.contract,
  txId: c.txId,
  ...(c.blockHeight !== undefined ? { blockHeight: c.blockHeight } : {}),
  ...(c.blockTime !== undefined ? { blockTime: c.blockTime } : {}),
  record: c.record,
  other: c.other,
  ...(c.keyBinding ? { keyBinding: c.keyBinding } : {}),
  ...(c.otherKeyBinding ? { otherKeyBinding: c.otherKeyBinding } : {}),
  schema: c.schema,
  ...(c.mayChange ? { mayChange: [...c.mayChange] } : {}),
});

export const twoClaimLink = (c: TwoClaim, origin: string): string =>
  `${origin}${CLAIM_CHECK_PATH}#p=${base64urlnopad.encode(new TextEncoder().encode(JSON.stringify({ v: 1, ...linkPart(c) })))}`;

/** Whether a check link's # part is a claim about two records. */
export const isTwoClaimHash = (hash: string): boolean => new URLSearchParams(hash.replace(/^#/, '')).has('p');

/** The claim a link describes, checked for form only; undefined when it can't be read. */
export const readTwoClaimLink = (hash: string): TwoClaim | undefined => {
  const p = new URLSearchParams(hash.replace(/^#/, '')).get('p');
  if (!p) return undefined;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64urlnopad.decode(p))) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o) || o.v !== 1) return undefined;
  const str = (k: string) => (typeof o[k] === 'string' ? o[k] : undefined);
  const kind = o.kind === 'distinct' || o.kind === 'unchanged' ? o.kind : undefined;
  const contract = str('contract');
  const txId = str('txId');
  const record = str('record');
  const other = str('other');
  const schema = str('schema');
  if (!kind || !contract || !HEX64.test(contract) || !txId || !TXID.test(txId)) return undefined;
  if (!record || !HEX64.test(record) || !other || !HEX64.test(other) || record === other) return undefined;
  // Only a form this site offers these claims on: its words are the only ones the page can say.
  if (!schema || !twoRecordFormOffered(schema)) return undefined;
  const keyBinding = str('keyBinding');
  const otherKeyBinding = str('otherKeyBinding');
  if (keyBinding !== undefined && !HEX64.test(keyBinding)) return undefined;
  if (otherKeyBinding !== undefined && !HEX64.test(otherKeyBinding)) return undefined;
  let mayChange: number[] | undefined;
  if (kind === 'unchanged') {
    if (!Array.isArray(o.mayChange)) return undefined;
    const m = o.mayChange as unknown[];
    if (!m.every((i) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < 16)) return undefined;
    mayChange = [...new Set(m as number[])].sort((a, b) => a - b);
    if (mayChange.length !== m.length) return undefined;
  } else if (o.mayChange !== undefined) return undefined;
  return {
    kind,
    contract,
    txId,
    record,
    other,
    schema,
    ...(keyBinding ? { keyBinding } : {}),
    ...(otherKeyBinding ? { otherKeyBinding } : {}),
    ...(mayChange ? { mayChange } : {}),
    ...(typeof o.blockHeight === 'number' ? { blockHeight: o.blockHeight } : {}),
    ...(typeof o.blockTime === 'number' ? { blockTime: o.blockTime } : {}),
  };
};

/** The proof codes the two records were dated under. */
export const datedCodesOf = (c: Pick<TwoClaim, 'record' | 'other' | 'keyBinding' | 'otherKeyBinding'>) => ({
  first: c.keyBinding ? keyBoundFingerprint(c.keyBinding, c.record) : c.record,
  second: c.otherKeyBinding ? keyBoundFingerprint(c.otherKeyBinding, c.other) : c.other,
});

export type TwoVerdict =
  | { readonly ok: true; readonly blockHeight?: number; readonly blockTime?: number }
  /** `unreadable`: nothing found wrong, it just couldn't be read from Midnight (claim-link.ts ClaimVerdict). */
  | { readonly ok: false; readonly reason: string; readonly unreadable?: true };

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/**
 * Compare what the claims contract recorded for one call with what the link says. Nothing in the
 * link is believed: the kind, both records in their order, the form (its id recomputed here from
 * the published document) and, for a correction, the exact list of numbers allowed to change.
 * A correction whose list covers every number the form describes says nothing and is refused
 * (SPEC 4.5 check 8), whatever the chain holds.
 */
export const compareTwoClaim = (
  link: TwoClaim,
  onChain: Pick<Claim, 'kind' | 'record' | 'other' | 'schema' | 'mayChange'>,
): TwoVerdict => {
  const schema = SCHEMAS[link.schema] as FieldSchema | undefined;
  if (!schema) return { ok: false, reason: 'The link names a schema this site doesn’t publish.' };
  if (onChain.kind !== link.kind) return { ok: false, reason: 'That transaction made a different kind of claim.' };
  if (hex(onChain.record) !== link.record || !onChain.other || hex(onChain.other) !== link.other)
    return { ok: false, reason: 'That claim is about different records.' };
  if (hex(onChain.schema) !== hex(fieldSchemaId(schema)))
    return { ok: false, reason: 'That claim was made under a different schema.' };
  if (link.kind === 'unchanged') {
    const onChainSlots = slotsOfMask(onChain.mayChange ?? []);
    if (onChainSlots.join(',') !== (link.mayChange ?? []).join(','))
      return { ok: false, reason: 'That claim allowed different numbers to change.' };
    if (maskSaysNothing(link.schema, onChainSlots))
      return { ok: false, reason: 'That claim allows every number to change, so it says nothing.' };
  }
  return { ok: true };
};

/** The status line under both claims: built and not yet run on mainnet, until a reviewed flag says it has. */
export const twoRecordStatusKey = (ranOnMainnet: boolean): AppKey =>
  ranOnMainnet ? 'app.tworec.status.ran' : 'app.tworec.status.notYet';
