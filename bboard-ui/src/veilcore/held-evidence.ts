// A record's lab signature and claims, in the backup file (backup.ts `heldEvidence`).
//
// The file's `recordData` carries only what the holder typed (records.ts IMPORTABLE): an import
// must never take a delivery confirmation or a "received from" someone typed in (attack round D).
// That left out a record's laboratory signature, the Midnight call that published it, and the
// claims made on its numbers: with VeilCore's registry gone, a restore brought the record back
// without them (found by the restore drill, 26 Nov: docs/runbooks/backup-restore-drill.md).
//
// So the file carries them beside the records, by record id, and a restore puts each one back
// only onto a record that is here and doesn't have it already, and only once it checks against
// that record, never on the file's word:
//   - a lab signature must verify against the record's own commitment (lab-attest.ts
//     labSignatureChecks): a signature for another record, or a changed one, is left out;
//   - its Midnight call goes back only with a signature that did;
//   - a claim must name the record's own commitment and key binding; one already here (the same
//     transaction and number) is not added twice. A claim link is still checked on chain
//     whenever it is opened (claim-link.ts), as before;
//   - a claim about two records (two-record-claims.ts) is kept on both, so it goes in the file
//     under each. It goes back only when both records it names are here, each with the
//     commitment and key binding the claim names for it, in its order, and neither has it
//     already (the same transaction and kind). Then it is put back on both at once.
// A record the registry still holds keeps the registry's copy: nothing here replaces anything.
//
// backup.ts loads this file only when a backup is made or restored (the lab signature check
// brings the claims contract's code with it), and hands it the record store it uses itself.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import { labSignatureChecks, type LabSignature } from './lab-attest';
import { contentHashOf, type CommittedRecordInput } from './commitment';
import type { MadeClaim } from './claim-link';
import type { HeldTwoClaim } from './two-record-claims';
import { isObject, isString } from './json';

export type HeldEvidence = {
  readonly labSignature?: LabSignature;
  readonly labOnChain?: StrainRecord['labOnChain'];
  readonly claims?: readonly MadeClaim[];
  readonly twoClaims?: readonly HeldTwoClaim[];
};

/** The record store's calls a restore uses (records.ts). */
export type RecordCalls = {
  readonly getRecord: (id: string) => StrainRecord | undefined;
  readonly setLabSignature: (id: string, sig: LabSignature) => unknown;
  readonly setLabOnChain: (id: string, on: NonNullable<StrainRecord['labOnChain']>) => unknown;
  readonly addClaim: (id: string, claim: MadeClaim) => unknown;
  /** Keeps a claim about two records on both (records.ts addTwoClaim). Without it none go back. */
  readonly addTwoClaim?: (claim: HeldTwoClaim) => unknown;
};

/**
 * What goes in the file: each record's lab signature, its Midnight call, its claims and its
 * claims about two records, by record id.
 */
export const heldEvidenceForBackup = (records: readonly StrainRecord[]): Record<string, HeldEvidence> => {
  const out: Record<string, HeldEvidence> = {};
  for (const r of records) {
    const e: HeldEvidence = {
      ...(r.labSignature ? { labSignature: r.labSignature } : {}),
      ...(r.labSignature && r.labOnChain ? { labOnChain: r.labOnChain } : {}),
      ...(r.claims?.length ? { claims: r.claims } : {}),
      ...(r.twoClaims?.length ? { twoClaims: r.twoClaims } : {}),
    };
    if (Object.keys(e).length) out[r.id] = e;
  }
  return out;
};

const sameClaim = (a: MadeClaim, b: MadeClaim): boolean => a.txId === b.txId && a.slot === b.slot && a.kind === b.kind;

const sameTwoClaim = (a: HeldTwoClaim, b: { readonly txId?: unknown; readonly kind?: unknown }): boolean =>
  a.txId === b.txId && a.kind === b.kind;

const commitmentOf = async (r: StrainRecord): Promise<string | undefined> => {
  try {
    return await contentHashOf(r as CommittedRecordInput);
  } catch {
    return undefined;
  }
};

/**
 * Put back what the file carries onto the records here that lack it, each checked against its
 * record first (see the top of this file). Returns how many items went back.
 */
export const restoreHeldEvidence = async (fromFile: unknown, calls: RecordCalls): Promise<number> => {
  const { getRecord, setLabSignature, setLabOnChain, addClaim, addTwoClaim } = calls;
  if (!isObject(fromFile)) return 0;
  let back = 0;
  const commitments = new Map<string, Promise<string | undefined>>();
  const commitmentHere = (r: StrainRecord) => {
    if (!commitments.has(r.id)) commitments.set(r.id, commitmentOf(r));
    return commitments.get(r.id)!;
  };
  for (const [id, raw] of Object.entries(fromFile)) {
    const r = getRecord(id);
    if (!r || !isObject(raw)) continue;
    const commitment = await commitmentHere(r);
    if (!commitment) continue;
    const sig = raw.labSignature as LabSignature | undefined;
    if (!r.labSignature && isObject(sig) && labSignatureChecks(sig, commitment)) {
      setLabSignature(id, sig);
      back++;
      // The Midnight call that published the signature goes back only here, beside a signature
      // that just passed: never on its own, and never with one that failed. It is not looked up on
      // chain here (a restore needs no network); a claim link that names it is checked against
      // the chain whenever it is opened (claim-link.ts), as for one the registry gives back. An
      // older build's 66-hex identifier coming back from a file is turned into its hash when a
      // link is next made (link-hashes.ts), and saved back then.
      const on = raw.labOnChain;
      if (isObject(on) && isString(on.contract) && isString(on.txId)) {
        setLabOnChain(id, on as unknown as NonNullable<StrainRecord['labOnChain']>);
        back++;
      }
    }
    const claims = Array.isArray(raw.claims) ? (raw.claims as unknown[]) : [];
    for (const c of claims) {
      if (!isObject(c) || !isString(c.txId) || c.record !== commitment) continue;
      if (c.keyBinding !== undefined && c.keyBinding !== r.keyBinding) continue;
      const claim = c as unknown as MadeClaim;
      if ((getRecord(id)?.claims ?? []).some((x) => sameClaim(x, claim))) continue;
      addClaim(id, claim);
      back++;
    }
    const twos = addTwoClaim && Array.isArray(raw.twoClaims) ? (raw.twoClaims as unknown[]) : [];
    for (const c of twos) {
      const two = await checkedTwoClaim(c, id, getRecord, commitmentHere);
      if (!two) continue;
      addTwoClaim!(two);
      back++;
    }
  }
  return back;
};

/**
 * A claim about two records from the file, as it goes back: only when it is listed under one of
 * the two records it names, both are here with the commitment and key binding it names for each,
 * in its order, and neither has it already. Undefined otherwise.
 */
const checkedTwoClaim = async (
  c: unknown,
  underId: string,
  getRecord: RecordCalls['getRecord'],
  commitmentHere: (r: StrainRecord) => Promise<string | undefined>,
): Promise<HeldTwoClaim | undefined> => {
  if (!isObject(c) || !isString(c.txId) || !isString(c.record) || !isString(c.other)) return undefined;
  const ids = c.ids;
  if (!Array.isArray(ids) || ids.length !== 2 || !ids.every(isString) || ids[0] === ids[1]) return undefined;
  if (!ids.includes(underId)) return undefined;
  const first = getRecord(ids[0]);
  const second = getRecord(ids[1]);
  if (!first || !second) return undefined;
  if ([first, second].some((r) => (r.twoClaims ?? []).some((x) => sameTwoClaim(x, c)))) return undefined;
  if (c.record !== (await commitmentHere(first)) || c.other !== (await commitmentHere(second))) return undefined;
  if ((c.keyBinding ?? undefined) !== first.keyBinding) return undefined;
  if ((c.otherKeyBinding ?? undefined) !== second.keyBinding) return undefined;
  return c as unknown as HeldTwoClaim;
};
