// "Prove one number", apart from its screen (components/document/ProveNumber.tsx): the one
// claim call and what is kept of it, and the rules for a record kept on this device only
// (docs/device-only-records.md, "Proving a number").
//
// For such a record proving is the holder's choice each time the page is opened: off until
// they turn it on, with what would be published said first, and "exactly" (which publishes the
// number itself) only after a second confirmation. What leaves the browser for a claim: the
// claims contract is read from the indexer, the site's own proving files are fetched, and the
// proved transaction goes to Midnight through the sponsor (chain/claims-call.ts). It carries
// the record's commitment, the schema's id, the slot, and the limit with its direction or, for
// "exactly", the number. The registry is sent nothing: the claim is kept on this device's copy
// of the record, which is never uploaded (records.ts addClaim, outbox.ts neverSend).
// SPDX-License-Identifier: Apache-2.0

import { addClaim, isKeptOnDeviceOnly, type StrainRecord } from './records';
import { claimMaterial, commitmentHex, type ClaimMaterial } from './claims-input';
import type { MadeClaim } from './claim-link';
import type { DocumentRecordLike } from './document-profile';
import type { HeldFieldSet } from './field-set';
import { DEVICE_ONLY_CLAIMS_ENABLED } from '../config/network';

export type How = 'at-most' | 'at-least' | 'exactly';

type Receipt = {
  readonly contract: string;
  readonly txId: string;
  readonly blockHeight: number;
  readonly blockTime?: number;
};
type Progress = { readonly progress?: (msg: string) => void };

/** The two claim calls (chain/claims-call.ts). A test hands in its own, to read what a claim is given. */
export type ClaimCalls = {
  readonly proveRangeOnChain: (
    m: ClaimMaterial,
    slot: number,
    direction: 'at-most' | 'at-least',
    bound: bigint,
    opts: Progress,
  ) => Promise<Receipt>;
  readonly proveValueOnChain: (m: ClaimMaterial, slot: number, opts: Progress) => Promise<Receipt>;
};

/** Whether the "Prove one number" panel is on a record's page. Off for a record kept on this device only until its holder turns it on. */
export const proveShown = (o: { deviceOnly: boolean; optedIn: boolean; enabled: boolean }): boolean =>
  !o.deviceOnly || (o.enabled && o.optedIn);

/**
 * Whether the prove button may be pressed. For a record kept on this device only, "exactly"
 * publishes a number that has never left the device, so it needs its own confirmation.
 */
export const canProve = (o: {
  deviceOnly: boolean;
  how: How;
  confirmedExact: boolean;
  /** The limit is a number this slot can hold (always so for "exactly"). */
  boundOk: boolean;
  /** The sealed number meets it. */
  meets: boolean;
}): boolean => o.boundOk && o.meets && !(o.deviceOnly && o.how === 'exactly' && !o.confirmedExact);

/**
 * Prove one fact about one sealed number on Midnight, and keep the claim on the record.
 * `sealed` is the number as stored; `bound` the limit as stored (ignored for "exactly").
 */
export const proveNumber = async (
  record: StrainRecord,
  slot: number,
  how: How,
  bound: bigint,
  opts: Progress & {
    readonly calls?: ClaimCalls;
    readonly confirmedExact?: boolean;
    /** The holder turned proving on for this record, on its page, this visit. Needed for a record kept on this device only. */
    readonly optedIn?: boolean;
    /** Tests: whether proving is switched on for such records (config/network.ts DEVICE_ONLY_CLAIMS_ENABLED). */
    readonly enabled?: boolean;
  } = {},
): Promise<MadeClaim> => {
  const held = record.fieldSet;
  if (!held) throw new Error('This document has no sealed numbers.');
  // A record kept on this device only: nothing is proved unless proving is switched on for such
  // records and its holder turned it on. Checked here, in the call, not only by the page.
  if (
    isKeptOnDeviceOnly(record) &&
    !proveShown({
      deviceOnly: true,
      optedIn: opts.optedIn === true,
      enabled: opts.enabled ?? DEVICE_ONLY_CLAIMS_ENABLED,
    })
  )
    throw new Error('Proving is off for this record until you turn it on, on its page. Nothing was sent.');
  if (isKeptOnDeviceOnly(record) && how === 'exactly' && opts.confirmedExact !== true)
    throw new Error('Publishing the number itself needs your confirmation first. Nothing was sent.');
  const calls = opts.calls ?? (await import('./chain/claims-call'));
  const m = await claimMaterial(record as DocumentRecordLike & { fieldSet: HeldFieldSet });
  const sealed = BigInt(held.values[slot] ?? '0');
  const receipt =
    how === 'exactly'
      ? await calls.proveValueOnChain(m, slot, { progress: opts.progress })
      : await calls.proveRangeOnChain(m, slot, how, bound, { progress: opts.progress });
  const claim: MadeClaim = {
    kind: how === 'exactly' ? 'value' : 'range',
    contract: receipt.contract,
    txId: receipt.txId,
    blockHeight: receipt.blockHeight,
    ...(receipt.blockTime !== undefined ? { blockTime: receipt.blockTime } : {}),
    record: commitmentHex(m),
    ...(record.keyBinding ? { keyBinding: record.keyBinding } : {}),
    schema: held.schema,
    slot,
    ...(how === 'exactly' ? { value: sealed.toString() } : { op: how, bound: bound.toString() }),
  };
  addClaim(record.id, claim);
  return claim;
};
