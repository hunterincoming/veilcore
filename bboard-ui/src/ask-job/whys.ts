// "Do it for me": why a records step waits, as the runner stores it and the job page words it
// (verification W6). Apart from senders.ts, so the page doesn't load what sends.
// SPDX-License-Identifier: Apache-2.0

/** Records sent before couldn't be looked up on the server: nothing was sent again. */
export const CANT_CHECK = 'Couldn’t check VeilCore’s server for the records sent before, so nothing was sent again.';

/** The server has some of them, but this browser couldn't write that down: nothing was sent. */
export const NOT_NOTED = 'Couldn’t note which records VeilCore’s server already has, so nothing was sent again.';
