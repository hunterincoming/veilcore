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
/** Said by sealRows when the registry didn't answer: the rows are kept to send again. */
const OFFLINE = /as the same records\.$|^Couldn’t reach|^Couldn't reach/;

export type WaitWords = 'records' | 'cantCheck' | 'notNoted' | 'noKey' | 'full' | 'local';

/**
 * Which words a waiting records step is said with (verification W6, S5): no connection
 * ('records'), the server couldn't be asked, this browser couldn't note what it has, no holder key
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
            : 'local';
