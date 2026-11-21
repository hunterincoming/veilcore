// Whether records just sealed already have a way back without the backup file (the
// simplify-unlock plan, phase 1).
//
// The flows used to ask for the file after every record, even when the records were already
// saved with VeilCore (the account copy) and that copy counted as a backup: three ways back in a
// row where one was enough (reviews A and B, 21 Nov 2026). Now the file step is skipped only
// when every record it was for is provably safe somewhere else:
//
//   - the account copy counts (a synced passkey, or a device-bound one with a checked recovery
//     sheet: account-copy.ts countsAsBackup), this browser holds its keys, and nothing is wrong
//     with it at the registry;
//   - the vault key is in a checked backup (a file, or that copy);
//   - each record's keys are in a checked backup, or in the record's own locked copy on VeilCore
//     under that vault key (keys-only-here.ts, the same rule Home's account line uses).
//
// To get there, the copy is always saved now and read back (account-copy.ts syncNow, which
// recomputes whether it counts from the registry's list and marks what it holds). If that
// fails or takes too long, the file step comes back: never zero ways back.
// A browser that won't keep what it is given (a private window) always gets the file step.
// SPDX-License-Identifier: Apache-2.0

import { accountState, syncNow, type AccountState } from '../../veilcore/account-copy';
import { keysFor, storageKeeps } from '../../veilcore/record-keys';
import { allRecords } from '../../veilcore/records';
import { vaultKeyIfAny, vaultNeedsBackup } from '../../veilcore/vault';
import { keysOnlyHere } from './keys-only-here';
import { loadAttester } from '../../veilcore/attester-keys';
import { getRole, isLab } from '../../veilcore/role';
import { prepareToReceive } from '../../veilcore/receive';

/**
 * The account copy counts as a backup here and now: saved, counted, its keys held, and nothing
 * wrong with it (missing, a way in missing, failing to save, or older at the registry).
 */
export const copyCountsHere = (s: AccountState): boolean =>
  s.kind === 'saved' && s.counted && !s.locked && s.problem === undefined;

/** Every one of these records is in a checked backup (or its own locked copy), and so is the vault key. */
export const recordsHaveWayBack = (ids: readonly string[]): boolean => {
  if (!ids.length || !vaultKeyIfAny() || vaultNeedsBackup()) return false;
  const onlyHere = new Set(keysOnlyHere(allRecords()));
  return ids.every((id) => !!keysFor(id) && !onlyHere.has(id));
};

/** How long the flow waits for the copy to be saved before it asks for the file instead. */
export const WAY_BACK_WAIT_MS = 15_000;

/**
 * Whether the file step can be skipped for these records: true only when the account copy counts
 * and, after saving it now, holds them. Never throws; false means "ask for the file".
 */
export const savedWithVeilCore = async (ids: readonly string[], waitMs = WAY_BACK_WAIT_MS): Promise<boolean> => {
  try {
    if (!ids.length || !storageKeeps() || !copyCountsHere(accountState())) return false;
    // A lab's receiving key goes in the copy too (the file step made it first: BackupStep).
    // Then the copy is always saved and read back now, even when the marks already say so: the
    // save recomputes whether the copy counts from the registry's own list of ways in (the
    // independent review: a way in removed on another device since this page last checked).
    // Only a save that finished and passed its check counts; a timeout never does.
    const save = (async () => {
      if (loadAttester() || isLab(getRole())) await prepareToReceive().catch(() => undefined);
      return syncNow({ force: true }).catch(() => undefined);
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const out = await Promise.race([
      save,
      new Promise<undefined>((r) => {
        timer = setTimeout(() => r(undefined), waitMs);
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);
    return !!out?.ok && copyCountsHere(accountState()) && recordsHaveWayBack(ids);
  } catch {
    return false;
  }
};
