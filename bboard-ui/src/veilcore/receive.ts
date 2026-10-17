// Finishing a received record (CONTRACT.md #22).
//
// A claim leaves only a stub on the registry; the recipient's browser opens the sender's
// sealed offer with the key in the delivery code, builds the received record, seals it and
// saves it. That used to happen once, straight after the claim, from the claim's answer: a
// tab closed in between, a save the registry refused, or an offer that didn't open left a
// stub for good, because the claim can't be made twice and its answer was the only copy of
// the offer. Now:
//   - the code is kept in this browser from before the claim until the registry has
//     accepted the sealed record (transfers.ts keepReceivingCode);
//   - the claimant can fetch its own sealed offer again (GET /transfers/:id/offer), so
//     "Finish receiving" on a stub does what the claim would have;
//   - nothing is returned as received until the registry accepted the sealed record, so a
//     receipt is never signed over a fingerprint it doesn't hold.
// SPDX-License-Identifier: Apache-2.0

import {
  claimTransfer,
  forgetReceivingCode,
  keepReceivingCode,
  keptClaimFor,
  openClaimOffer,
  ownOffer,
  parseShareCode,
  receivingCodeFor,
  type ClaimError,
  type ClaimResult,
} from './transfers';
import {
  allRecords,
  finishReceived,
  getRecord,
  hydrate,
  offerFieldsOf,
  RECORDS_KEY,
  type StrainRecord,
} from './records';
import { makeVaultIfSafe, rowStateOf, vaultReadiness } from './api-store';
import { holderKey } from './holder';
import { vaultNeedsBackup } from './vault';
import { enT, type Translator } from '../i18n/translate';
import type { AppKey } from '../i18n/app/en';

export type FinishOutcome =
  | {
      readonly record: StrainRecord;
      /** 'unopened': the code had no key for the sender's sealed offer, so only the name came. */
      readonly offer: 'opened' | 'unopened' | 'none';
    }
  | { readonly error: string };

/** Whether a record is a claim's stub this browser can finish. */
export const isUnfinishedReceipt = (r: StrainRecord): boolean =>
  !!r.transferId && rowStateOf(RECORDS_KEY, r.id) === 'stub';

/** The code kept for a stub's delivery, if this browser kept one. */
export const keptCodeFor = (r: StrainRecord): string | undefined =>
  r.transferId ? receivingCodeFor(r.transferId) : undefined;

/**
 * Build, seal and save a received record from its stub and the sender's offer: from the
 * claim's answer when there is one, otherwise from the claimant's own copy on the registry.
 * The code is forgotten only once the registry has accepted the sealed record.
 */
export const finishReceiving = async (
  recordId: string,
  code: string,
  claim?: ClaimResult,
  tr: Translator = enT,
): Promise<FinishOutcome> => {
  const r = getRecord(recordId);
  if (!r) return { error: tr.t('app.sealed.recv.noRecord') };
  const parsed = parseShareCode(code);
  if (r.transferId && parsed.transferId !== r.transferId.toUpperCase()) {
    return { error: tr.t('app.sealed.recv.otherCode') };
  }
  let source: Pick<ClaimResult, 'descendedFrom' | 'parentCommitment' | 'offerSealed' | 'offerPlain'>;
  // The claim's answer: given now, or kept beside the code since the claim (L9). A code made
  // before offers were sealed can't fetch its offer again once the sender's record is locked.
  const kept = claim ?? keptClaimFor(parsed.transferId);
  if (kept && (kept.offerSealed !== undefined || kept.offerPlain !== undefined)) source = kept;
  else if (claim) source = claim;
  else {
    const own = await ownOffer(parsed.transferId);
    if ('error' in own) return own;
    source = {
      descendedFrom: r.receivedFrom ?? '',
      ...(r.receivedFromCommitment ? { parentCommitment: r.receivedFromCommitment } : {}),
      ...own,
    };
  }
  const opened = await openClaimOffer(source, parsed.offerKey, r.receivedFromCommitment);
  // The code has an offer key, so the sender sealed the offer: a plain one in its place is
  // the registry's word, not the sender's (CONTRACT.md #17). The stub and the code stay.
  if (opened === 'missing') return { error: tr.t('app.sealed.recv.offerMissing') };
  const fields = typeof opened === 'object' ? offerFieldsOf(opened.fields) : {};
  // What came sealed is the sender's word; a readable note beside it is only the registry's
  // (round 3, P7). The registry's note is used only for a code made before offers were
  // sealed, where it is the only copy.
  const sealedOffer = typeof opened === 'object' && source.offerSealed !== undefined;
  const note = sealedOffer ? fields.note : (fields.note ?? kept?.note);
  // The breeder's lock for lab reports: from the code, or from inside the sealed offer the
  // code's key opened, never from the registry (round 3, P1). A plain offer (a code made
  // before offers were sealed) is the registry's copy, so its lock isn't taken.
  const offerLock = sealedOffer ? fields.resultLock : undefined;
  const lock = parsed.resultLock ?? offerLock;
  const { resultLock: _fromOffer, ...offerFields } = fields;
  void _fromOffer;
  const out = await finishReceived(
    recordId,
    {
      ...(note ? { deliveryNote: note.slice(0, 2000) } : {}),
      ...(lock ? { resultLock: lock, resultLockFrom: parsed.resultLock ? ('code' as const) : ('offer' as const) } : {}),
    },
    offerFields,
  );
  if ('error' in out) return out;
  forgetReceivingCode(parsed.transferId);
  return { record: out.record, offer: typeof opened === 'object' ? 'opened' : opened };
};

/**
 * Claim a delivery with its code, keeping the code (and the claim's answer) in this browser
 * until the received record is sealed and accepted. The code is let go only on a definite
 * refusal from the registry, and only when no stub of this delivery is in this holder's set
 * after a fresh read (round 3, L8): an answer lost on the way back used to throw the code
 * away, and with it the only copy of the offer key, though the registry had made the claim.
 */
export const claimWithCode = async (code: string): Promise<ClaimResult | ClaimError> => {
  const { transferId, claimCode } = parseShareCode(code);
  keepReceivingCode(code);
  const res = await claimTransfer(transferId, claimCode);
  if ('error' in res && res.definite) {
    await hydrate();
    if (!allRecords().some((r) => r.transferId?.toUpperCase() === transferId)) forgetReceivingCode(transferId);
  }
  return res;
};

/**
 * Why a lab can't sign a receipt for a received record yet, or undefined when it can: never
 * over a fingerprint the registry doesn't hold (CONTRACT.md #22). A record received before
 * records were locked waits for a checked backup, not for "Finish receiving" (round 3, L10):
 * there is nothing to finish, and the button isn't offered.
 */
export const receiptBlocker = (r: StrainRecord): AppKey | undefined => {
  const state = rowStateOf(RECORDS_KEY, r.id);
  if (state === 'open') return undefined;
  if (state === 'legacy') return 'app.sealed.recv.backupFirst';
  return 'app.sealed.recv.notAccepted';
};

/**
 * Whether this browser can receive a delivery now, checked before the claim, which can't be
 * undone (CONTRACT.md #22): it must be able to seal and save the received record, under a
 * key that is in a checked backup (round 3, L1). A browser with no key yet makes one here, so
 * the backup the app then asks for holds it.
 */
export const readyToReceive = async (): Promise<{ ok: true } | { words: AppKey }> => {
  const ready = await vaultReadiness();
  if (ready === 'locked') return { words: 'app.sealed.recv.restoreFirst' };
  if (ready === 'unknown') return { words: 'app.sealed.recv.cantCheck' };
  if (ready === 'cant-store') return { words: 'app.sealed.recv.cantStore' };
  if (ready === 'can-make') {
    holderKey();
    const made = await makeVaultIfSafe();
    if (made === 'locked') return { words: 'app.sealed.recv.restoreFirst' };
    if (made === 'unknown') return { words: 'app.sealed.recv.cantCheck' };
    if (made === 'cant-store') return { words: 'app.sealed.recv.cantStore' };
  }
  if (vaultNeedsBackup()) return { words: 'app.sealed.recv.backupFirstClaim' };
  return { ok: true };
};
