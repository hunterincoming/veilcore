// The way in for anyone who was sent something: a lab with a breeder's code, a buyer with a
// check link, a holder asked to prove a record, a licensee with an agreement to sign. The
// public pages link here; the app's Home (flow/AppHome.tsx) then leads with its paste box,
// which works out what was pasted (veilcore/paste.ts) and opens the screen for it.
//
// A link, not a second paste box on the landing page: the paste box needs the app's own
// modules (the holder's records, the registry, the receive dialog), which the landing page
// never downloads (App.tsx, load-split.test.ts), and one box means one place that decides
// what a pasted code is. The code itself never goes in the address: it carries the claim
// code and the offer key.
// SPDX-License-Identifier: Apache-2.0

/** Where "Got a code or link?" goes: Home, with the paste box first and focused. */
export const PASTE_ENTRY = '/records?paste';

/** Whether Home was opened to paste something (`?paste`, with or without a value). */
export const wantsPasteFirst = (search: string): boolean => {
  try {
    return new URLSearchParams(search).has('paste');
  } catch {
    return false;
  }
};
