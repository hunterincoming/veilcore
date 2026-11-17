// What a deleted record's check page says about its date (VerifyPage DeletedRecord). A date is
// checked on Midnight only for the link's own proof code, and before/after the deletion is said
// only when it is known: deletedAt is to the minute, so a block in that minute needs the
// registry's own answer.
// SPDX-License-Identifier: Apache-2.0

import type { AppKey } from '../../i18n/app/en';

export type DeletedDateInput = {
  /** The block time this page checked on Midnight for the link's own proof code (ms or ISO), if any. */
  readonly checkedBlockTime?: string | number;
  /** The registry reports an anchor for it. */
  readonly anchored: boolean;
  /** The registry's answer: the anchor landed 'before' or 'after' the deletion, or unknown. */
  readonly relative?: string;
  readonly deletedAt?: string;
};

export const deletedDateKey = (i: DeletedDateInput): AppKey => {
  const rel = i.relative === 'before' || i.relative === 'after' ? i.relative : undefined;
  if (i.checkedBlockTime !== undefined) {
    const block = typeof i.checkedBlockTime === 'number' ? i.checkedBlockTime : Date.parse(i.checkedBlockTime);
    const deleted = i.deletedAt ? Date.parse(i.deletedAt) : NaN;
    const order =
      Number.isNaN(block) || Number.isNaN(deleted)
        ? undefined
        : block < deleted
          ? 'before'
          : block >= deleted + 60_000
            ? 'after'
            : rel;
    return order === 'before'
      ? 'app.verify.deleted.datedChecked'
      : order === 'after'
        ? 'app.verify.deleted.datedCheckedAfter'
        : 'app.verify.deleted.datedCheckedPlain';
  }
  if (!i.anchored) return 'app.verify.deleted.notDated';
  return rel === 'before'
    ? 'app.verify.deleted.datedReported'
    : rel === 'after'
      ? 'app.verify.deleted.datedReportedAfter'
      : 'app.verify.deleted.datedReportedPlain';
};
