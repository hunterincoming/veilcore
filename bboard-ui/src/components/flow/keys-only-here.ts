// Records whose keys are only in this browser: no checked backup holds them, and neither does
// the record's own locked copy on VeilCore.
//
// A record's secrets go inside its locked copy (round 4, F5: record-keys.ts sealedSecretsOf),
// and a restored vault key opens that copy and brings them back (adoptSealedSecrets marks such
// keys as in the backup). So once the vault key is in a checked backup and VeilCore holds the
// record's locked copy with these very secrets, a new backup file adds nothing for them: asking
// for one again ("Finish: save your backup") asked a returning holder to redo what was done.
// SPDX-License-Identifier: Apache-2.0

import { keysWithoutBackup } from '../../veilcore/record-keys';
import { rowStateOf } from '../../veilcore/api-store';
import { inOutbox } from '../../veilcore/outbox';
import { vaultKeyIfAny, vaultNeedsBackup } from '../../veilcore/vault';
import { RECORDS_KEY } from '../../veilcore/records';

/** Whether a record's locked copy on VeilCore holds these secrets, under a backed-up vault key. */
export const keysHeldBySealedCopy = (
  record: { readonly id: string; readonly secrets?: { readonly recordSecret?: string } } | undefined,
  recordSecret: string,
  facts: { vaultBackedUp: boolean; state: string | undefined; kept: boolean } | undefined = record
    ? {
        vaultBackedUp: !!vaultKeyIfAny() && !vaultNeedsBackup(),
        state: rowStateOf(RECORDS_KEY, record.id),
        kept: inOutbox(record.id),
      }
    : undefined,
): boolean =>
  !!record &&
  !!facts &&
  facts.vaultBackedUp &&
  facts.state === 'open' &&
  !facts.kept &&
  record.secrets?.recordSecret === recordSecret;

/** The record ids whose keys are only in this browser. */
export const keysOnlyHere = (
  records: readonly { readonly id: string; readonly secrets?: { readonly recordSecret?: string } }[],
): string[] =>
  keysWithoutBackup()
    .filter(
      (k) =>
        !keysHeldBySealedCopy(
          records.find((r) => r.id === k.recordId),
          k.recordSecret,
        ),
    )
    .map((k) => k.recordId);
