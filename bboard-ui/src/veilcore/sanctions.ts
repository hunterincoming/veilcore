// Screening the two addresses of a stablecoin royalty payment against a sanctions list, in
// the browser, before the transfer is built (docs/royalty-pay.md, "Sanctions").
//
// What it checks: the licensor's payout address and every address the licensee's wallet says
// it uses, against OFAC's SDN list of Cardano addresses, bundled with the site
// (sanctions/ofac-cardano.json: its source and dates are in the file). An address counts as
// listed when it is a listed address, or shares a listed address's payment or stake key: a
// base address and the same wallet's enterprise address are one holder.
//
// What it doesn't: it is a list check, not blockchain analytics. It can't see that an address
// was funded by a listed one, can't see where a person is (no location check: that needs a
// service this site doesn't use), and is only as new as the bundled list. Those limits are
// written on the pay screen's "How this works" and in docs/royalty-pay.md.
// SPDX-License-Identifier: Apache-2.0

import list from './sanctions/ofac-cardano.json';
import { addressBytes } from './cardano-pay';

export type SanctionsList = {
  readonly list: string;
  readonly source: string;
  readonly listIssued: string | null;
  readonly extracted: string;
  readonly addresses: readonly string[];
};

export const OFAC_CARDANO: SanctionsList = list;

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string): Uint8Array | undefined =>
  /^([0-9a-f]{2})+$/i.test(h) ? Uint8Array.from(h.match(/../g)!, (x) => parseInt(x, 16)) : undefined;

/**
 * An address's keys: its payment credential (bytes 1 to 28) and, for a base address (types 0
 * to 3), its stake credential (bytes 29 to 56), hex. Bech32 or the raw hex a CIP-30 wallet
 * gives. Undefined for what isn't a Shelley address.
 */
export const credentialsOf = (address: string): { payment: string; stake?: string; whole: string } | undefined => {
  const a = address.trim();
  const bytes = addressBytes(a)?.bytes ?? fromHex(a);
  if (!bytes || bytes.length < 29) return undefined;
  const type = bytes[0] >> 4;
  if (type > 7) return undefined;
  return {
    whole: hex(bytes),
    payment: hex(bytes.slice(1, 29)),
    ...(type <= 3 && bytes.length >= 57 ? { stake: hex(bytes.slice(29, 57)) } : {}),
  };
};

/** The listed addresses as keys, once. */
const listedKeys = (l: SanctionsList) => {
  const whole = new Set<string>();
  const keys = new Set<string>();
  for (const a of l.addresses) {
    const c = credentialsOf(a);
    if (!c) continue;
    whole.add(c.whole);
    keys.add(c.payment);
    if (c.stake) keys.add(c.stake);
  }
  return { whole, keys };
};

export type Screen = { readonly clear: true } | { readonly clear: false; readonly address: string };

/**
 * Screen addresses against the list: clear, or the first that matches. An address this can't
 * read is not called clear: the payment stops, as for a match (`unreadable`).
 */
export const screenAddresses = (
  addresses: readonly string[],
  l: SanctionsList = OFAC_CARDANO,
): Screen | { readonly clear: false; readonly unreadable: string } => {
  const { whole, keys } = listedKeys(l);
  for (const a of addresses) {
    const c = credentialsOf(a);
    if (!c) return { clear: false, unreadable: a };
    if (whole.has(c.whole) || keys.has(c.payment) || (c.stake && keys.has(c.stake)))
      return { clear: false, address: a };
  }
  return { clear: true };
};
