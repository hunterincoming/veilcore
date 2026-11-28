// Inclusion proofs.
//
// A record's commitment is anchored as part of a batch, not on its own. That is what
// lets a holder settle on chain without running a wallet, and what makes the per-record
// cost of settlement nearly nothing.
//
// The proof is the thing that matters: it carries the path from the record to the batch
// root and a reference to where that root was anchored. A holder keeps it and can prove
// their record's age years later using the published package and a chain lookup —
// whether or not this registry still exists.
//
// What this module can and cannot check (attack round D):
//   - that the proof is about THIS record: its commitment must equal the one asked for.
//     A proof for any other commitment folds to its own root just as well, and was shown
//     as this record's anchor;
//   - that the path folds to the root it names (verifyInclusion, offline);
//   - NOT that the root is on a chain. Here the anchor in a proof is the registry's
//     report, and this module labels it that way. The pages that show it look the
//     transaction up on Midnight themselves (veilcore/chain/anchor-check.ts: the check
//     page and the plant page's "Date on Midnight" section) and only then call the date
//     checked; until then, or with no indexer to ask, it is never shown as "Anchored",
//     never printed on a certificate as a fact, and never offered as proof of a date.
//
// SPDX-License-Identifier: Apache-2.0

import type { InclusionProof } from 'veilcore-records';
import { verifyInclusion } from 'veilcore-records';
import { isObject, isString, isBoolean, isNumber } from './json';
import { batchIdOrNone } from './batch-id-rule';
import { anchorFormOk } from './anchor-form';

const BASE = import.meta.env.VITE_API_BASE ?? '';

const HEX64 = /^[0-9a-f]{64}$/;
/** SPEC section 5: a verifier shall reject a path deeper than 64 rather than fold it. */
const MAX_DEPTH = 64;

export type ProofState =
  /** Not batched yet, or no proof this page could check. */
  | { status: 'none' }
  /** In a sealed batch, checked here; the registry reports no anchor. */
  | { status: 'pending'; proof: InclusionProof }
  /**
   * In a sealed batch, checked here, and the registry REPORTS the batch root was recorded
   * in a transaction. This module does not look the transaction up; a page that shows it
   * calls the date checked only after checkAnchorOnChain (chain/anchor-check.ts) confirms it.
   */
  | { status: 'anchor-reported'; proof: InclusionProof };

/** True when the proof was checked here: bound to the record and folding to its root. */
export const proofChecked = (s: ProofState): s is Exclude<ProofState, { status: 'none' }> => s.status !== 'none';

const isAnchorRef = (v: unknown): boolean =>
  isObject(v) &&
  isString(v.chain) &&
  isString(v.network) &&
  (v.txHash === undefined || isString(v.txHash)) &&
  (v.contractAddress === undefined || isString(v.contractAddress)) &&
  (v.anchoredAt === undefined || isString(v.anchoredAt)) &&
  (v.blockHeight === undefined || isNumber(v.blockHeight));

/** The shape the SDK's verifier reads, checked before it is handed anything. */
export const isInclusionProof = (v: unknown): v is InclusionProof =>
  isObject(v) &&
  isString(v.commitment) &&
  HEX64.test(v.commitment) &&
  isString(v.root) &&
  HEX64.test(v.root) &&
  isString(v.batchId) &&
  (v.sealedAt === undefined || isString(v.sealedAt)) &&
  Array.isArray(v.path) &&
  v.path.length <= MAX_DEPTH &&
  v.path.every((s) => isObject(s) && isString(s.sibling) && HEX64.test(s.sibling) && isBoolean(s.siblingIsLeft)) &&
  (v.anchor === undefined || v.anchor === null || isAnchorRef(v.anchor));

const formOk = (a: unknown): boolean => isObject(a) && anchorFormOk(a);

/**
 * The id the registry itself gave a proof whose id was dropped (inForm), in memory only: the
 * registry serves the batch's Bitcoin stamp under it (stamps.ts asks with it, as gathering a bundle
 * does). Never stored or printed.
 */
// Symbol.for: one key however many copies of this module a page loads.
const ASKED_AS = Symbol.for('VeilCore: the registry’s own batch id');

/** The id to ask the registry for this proof's batch files by: its own, even one not in its form. */
export const registryBatchIdOf = (p: unknown): string | undefined => {
  if (!isObject(p)) return undefined;
  const asked = (p as Record<symbol, unknown>)[ASKED_AS];
  return isString(asked) ? asked : isString(p.batchId) ? p.batchId : undefined;
};

/** The proof with its batch id and anchors held to the registry's form; itself when they all are. */
const inForm = (body: InclusionProof): InclusionProof => {
  const r = body as unknown as Record<string, unknown>;
  const idOk = body.batchId === batchIdOrNone(body.batchId);
  const anchorOk = r.anchor === undefined || r.anchor === null || formOk(r.anchor);
  const list = Array.isArray(r.anchors) ? (r.anchors as unknown[]) : undefined;
  const ledgerOk = (x: unknown) => !(isObject(x) && x.kind === 'ledger') || formOk(x);
  const listOk = !list || list.every(ledgerOk);
  if (idOk && anchorOk && listOk) return body;
  const { anchor, anchors: _l, ...rest } = r;
  void _l;
  const out = {
    ...rest,
    batchId: batchIdOrNone(body.batchId),
    ...(anchorOk && anchor !== undefined ? { anchor } : {}),
    ...(list ? { anchors: list.filter(ledgerOk) } : {}),
  } as unknown as InclusionProof;
  // Not enumerable, and keyed by a symbol: JSON, the stored copy and the backup file never see it.
  if (!idOk && isString(body.batchId)) Object.defineProperty(out, ASKED_AS, { value: body.batchId });
  return out;
};

/**
 * Check a proof against the record it is supposed to be about. Exported so an imported
 * or downloaded proof goes through the same check as one fetched from the registry.
 */
export const checkProof = async (commitment: string, body: unknown): Promise<ProofState> => {
  if (!HEX64.test(commitment) || !isInclusionProof(body)) return { status: 'none' };
  // The binding that was missing: a proof about some other commitment says nothing
  // about this record, however well its path folds.
  if (body.commitment !== commitment) return { status: 'none' };
  // A registry claiming a record is included is not evidence; the path folding to the
  // root is.
  if (!(await verifyInclusion(body))) return { status: 'none' };
  // What isn't part of what folds is held to the registry's own form before anything uses it: a
  // batch id not in its form (batch-id-rule.ts) is kept as "" (not given), and an anchor not in
  // its form (anchor-form.ts), or a Midnight entry in `anchors` not in it, is dropped whole. So no
  // page prints a sentence the registry put there, and none is ever taken as mainnet.
  const proof = inForm(body);
  return proof.anchor?.txHash ? { status: 'anchor-reported', proof } : { status: 'pending', proof };
};

/** Fetch a record's inclusion proof, and check it here before anything is shown. */
export const proofFor = async (commitment?: string): Promise<ProofState> => {
  // Not a commitment, so there is nothing a proof could be bound to: no request.
  if (!commitment || !HEX64.test(commitment)) return { status: 'none' };
  try {
    const res = await fetch(`${BASE}/proof/${encodeURIComponent(commitment)}`);
    if (!res.ok) return { status: 'none' };
    return await checkProof(commitment, (await res.json()) as unknown);
  } catch {
    return { status: 'none' };
  }
};

/**
 * Where a record's date stands, for the holder deciding to delete it. Unlike proofFor, a failed
 * or refused lookup is 'unknown', never "not in a batch", and nothing is cached: a batch may
 * have been sealed a moment ago.
 */
export type DateForDelete = 'dated' | 'pending' | 'none' | 'unknown';
export const dateForDelete = async (commitment?: string): Promise<DateForDelete> => {
  if (!commitment || !HEX64.test(commitment)) return 'unknown';
  try {
    const res = await fetch(`${BASE}/proof/${encodeURIComponent(commitment)}`, { cache: 'no-store' });
    // The registry's own answer for a proof code it holds but hasn't batched.
    if (res.status === 404) return 'none';
    if (!res.ok) return 'unknown';
    const s = await checkProof(commitment, (await res.json()) as unknown);
    return s.status === 'anchor-reported' ? 'dated' : s.status === 'pending' ? 'pending' : 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * Download the proof so the holder keeps their own copy. What it shows is said in the
 * file itself: inclusion in a batch, checked; the anchor, the registry's report.
 */
export const downloadProof = (proof: InclusionProof, recordId: string): void => {
  const out = {
    ...proof,
    note:
      'Inclusion proof: the path from this commitment to the batch root was checked in the browser that saved it. ' +
      'The anchor, if present, is what the registry reported; look the transaction up on the named network to ' +
      'confirm the root is there before relying on any date.',
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${recordId}.proof.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * The batch's Bitcoin stamp file (OpenTimestamps), when the registry reports one in the
 * proof's `anchors` (round 5). The file comes from the registry's public route for the
 * proof's own batch, never from an address in the answer. `pending` is a calendar's
 * promise, not yet a Bitcoin timestamp.
 */
export const bitcoinStampFor = (
  proof: InclusionProof,
): { otsUrl: string; rootUrl: string; status: 'bitcoin' | 'pending'; height?: number } | undefined => {
  const anchors: unknown = (proof as unknown as Record<string, unknown>).anchors;
  if (!Array.isArray(anchors)) return undefined;
  const ots = anchors.find((a) => isObject(a) && a.kind === 'opentimestamps') as Record<string, unknown> | undefined;
  if (!ots) return undefined;
  const batch = `${BASE}/batches/${encodeURIComponent(proof.batchId)}`;
  return {
    otsUrl: `${batch}/root.bin.ots`,
    rootUrl: `${batch}/root.bin`,
    status: ots.status === 'bitcoin' ? 'bitcoin' : 'pending',
    // The registry's word for which block; the check page checks it (bitcoin/stamp-check.ts).
    ...(typeof ots.bitcoinBlockHeight === 'number' &&
    Number.isSafeInteger(ots.bitcoinBlockHeight) &&
    ots.bitcoinBlockHeight >= 0
      ? { height: ots.bitcoinBlockHeight }
      : {}),
  };
};
