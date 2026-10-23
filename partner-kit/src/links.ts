// Links a partner sends a VeilCore holder, opened on veilcore.org (or any site running the
// VeilCore web app).
// SPDX-License-Identifier: Apache-2.0

import { toHex } from './commitments.js';

const hex = (v: Uint8Array | string, what: string): string => {
  const h = typeof v === 'string' ? v.trim().toLowerCase() : toHex(v);
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error(`${what} is 32 bytes (64 hex characters).`);
  return h;
};

/**
 * The link a claimant (a lender, say) sends a record's holder after proposing a claim on chain
 * with `proposeObligation(record, claim)`: the holder's page reads the chain for exactly that
 * claim and offers to accept or reject it (the web app's /claim page). Everything rides in the
 * fragment, which browsers never send to a server. `name` is shown as the claimant's own words.
 */
export const claimLink = (
  site: string,
  c: { record: Uint8Array | string; claim: Uint8Array | string; claimant: Uint8Array | string; name: string },
): string => {
  const name = c.name.trim();
  if (!name) throw new Error('A claim link needs the claimant’s name.');
  const record = hex(c.record, 'The record identity');
  const claimant = hex(c.claimant, 'The claimant identity');
  if (record === claimant) throw new Error('A claim is on someone else’s record, not your own.');
  const q = new URLSearchParams({
    r: record,
    o: hex(c.claim, 'The claim commitment'),
    b: claimant,
    n: name.slice(0, 80),
  });
  return `${site.replace(/\/+$/, '')}/claim#${q.toString()}`;
};
