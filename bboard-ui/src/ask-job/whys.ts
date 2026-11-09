// "Do it for me": why a records step waits, as the runner stores it and the job page words it
// (verification W6). Apart from senders.ts, so the page doesn't load what sends.
// SPDX-License-Identifier: Apache-2.0

/** Records sent before couldn't be looked up on the server: nothing was sent again. */
export const CANT_CHECK = 'Couldn’t check VeilCore’s server for the records sent before, so nothing was sent again.';

/** No holder key in this browser: what the server has can't be asked until the backup is restored. */
export const NO_KEY =
  'This browser doesn’t have the key VeilCore’s server knows these records by, so nothing was sent again.';

/** The server has some of them, but this browser couldn't write that down: nothing was sent. */
export const NOT_NOTED = 'Couldn’t note which records VeilCore’s server already has, so nothing was sent again.';

/** Said by sealRows (bulk-import.ts) when this browser's storage wouldn't keep the ledger. */
const FULL = 'This browser wouldn’t keep what VeilCore needs';
/** Said by sealRows when the registry didn't answer (bulk-import.ts registryCommit). */
const OFFLINE = /^Couldn['’]t reach/;
/** Said by sealRows after any whole-save answer it keeps the rows for: the registry's reason, then this. */
const KEPT = / The last (row was|\d+ rows were) kept here and will be sent again, as the same records\.$/;

export type WaitWords = 'records' | 'refused' | 'cantCheck' | 'notNoted' | 'noKey' | 'full' | 'local';

/** The registry's own reason for turning a whole save down, without what sealRows adds. */
export const refusedReason = (why: string | undefined): string => (why ?? '').replace(KEPT, '').trim();

/**
 * Which words a waiting records step is said with (verification W6, S5, round 4 S3): no
 * connection ('records'), the server turned the whole save down ('refused', with its reason),
 * the server couldn't be asked, this browser couldn't note what it has, no holder key
 * (restore the backup), storage full, or anything else that went wrong here (a lock, a thrown
 * error, the page left): "couldn't save here, will try again".
 */
export const waitWords = (why: string | undefined): WaitWords =>
  why === CANT_CHECK
    ? 'cantCheck'
    : why === NOT_NOTED
      ? 'notNoted'
      : why === NO_KEY
        ? 'noKey'
        : why?.startsWith(FULL)
          ? 'full'
          : why && OFFLINE.test(why)
            ? 'records'
            : why && KEPT.test(why)
              ? 'refused'
              : 'local';
