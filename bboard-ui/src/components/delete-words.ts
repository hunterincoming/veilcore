// The words deleting a record uses, shared by its page's delete panel (RecordDetail) and by
// letting go of a record VeilCore holds the proof code of (RecordSaveNotices).
// SPDX-License-Identifier: Apache-2.0

import type { DeleteFailure } from '../veilcore/records';
import type { DateForDelete } from '../veilcore/proofs';
import type { AppKey } from '../i18n/app/en';

/** What a failed delete says, in the page's language (records.ts DeleteFailure). */
export const DELETE_WHY: Record<DeleteFailure, AppKey> = {
  busy: 'app.plant.delete.why.busy',
  offline: 'app.plant.delete.why.offline',
  refused: 'app.plant.delete.why.refused',
  'not-removed': 'app.plant.delete.why.notRemoved',
  'device-only': 'app.plant.delete.why.deviceOnly',
  missing: 'app.plant.delete.why.missing',
  linked: 'app.plant.delete.blockedCorrection',
};

/**
 * What happens to its date (proofs.ts dateForDelete): said before asking. A copy of a result a lab
 * keeps (records.ts StrainRecord.copy) has no date of this holder's: deleting it takes the copy only.
 */
export const deleteDateKey = (d: DateForDelete | 'checking', copy = false): AppKey =>
  copy
    ? 'app.doc.copy.delete'
    : d === 'checking'
      ? 'app.plant.delete.datedChecking'
      : d === 'dated'
        ? 'app.plant.delete.datedYes'
        : d === 'pending'
          ? 'app.plant.delete.datedPending'
          : d === 'none'
            ? 'app.plant.delete.datedNo'
            : 'app.plant.delete.datedUnknown';
