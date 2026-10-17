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
  forgetReceivingCode,
  openClaimOffer,
  ownOffer,
  parseShareCode,
  receivingCodeFor,
  type ClaimResult,
} from './transfers';
import { finishReceived, getRecord, offerFieldsOf, RECORDS_KEY, type StrainRecord } from './records';
import { rowStateOf } from './api-store';
import { enT, type Translator } from '../i18n/translate';

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
  if (claim) source = claim;
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
  const note = claim?.note ?? fields.note;
  const out = await finishReceived(
    recordId,
    {
      ...(note ? { deliveryNote: note.slice(0, 2000) } : {}),
      // The breeder's lock for lab reports travels in the code, and stays with the record.
      ...(parsed.resultLock ? { resultLock: parsed.resultLock } : {}),
      // So does the offer key: it opens the delivery's sealed sample details (CONTRACT.md
      // #27) once the code is forgotten below, and comes back with a restore from backup.
      ...(parsed.offerKey ? { offerKeys: { ...(r.offerKeys ?? {}), [parsed.transferId]: parsed.offerKey } } : {}),
    },
    fields,
  );
  if ('error' in out) return out;
  forgetReceivingCode(parsed.transferId);
  return { record: out.record, offer: typeof opened === 'object' ? 'opened' : opened };
};
