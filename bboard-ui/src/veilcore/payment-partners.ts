// The payment partners this website trusts, fixed in its own source.
//
// A receipt shows as "paid through <partner>" in green only when its key is listed here. The
// registry also lists partners, but a page that believed the registry's list would let whoever
// runs or breaks into the registry name any key a partner. So the list lives in the website,
// changes only by a reviewed commit, and ships in the same build as the code that reads it.
//
// To add a partner (docs/PAYMENT-PARTNERS.md): check its name against a public listing and its
// email domain, get its Ed25519 public key from it directly (not from the registry), add a line
// here with the date checked, and have the change reviewed. Remove a line to stop trusting it.
// SPDX-License-Identifier: Apache-2.0

export type PinnedPartner = {
  /** The partner's Ed25519 public key: 64 lowercase hex characters. */
  readonly key: string;
  /** Its legal or trading name, as checked. */
  readonly name: string;
  /** When VeilCore checked the name and got the key (YYYY-MM-DD). Checked again yearly. */
  readonly checked: string;
};

export const PAYMENT_PARTNERS: readonly PinnedPartner[] = [];

const KEY = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The listed partner with this key, if any. */
export const pinnedPartner = (
  key: string,
  list: readonly PinnedPartner[] = PAYMENT_PARTNERS,
): PinnedPartner | undefined => (KEY.test(key) ? list.find((p) => p.key === key) : undefined);

/** Problems with the list itself: checked by a test so a bad line never ships. */
export const partnerListProblems = (list: readonly PinnedPartner[] = PAYMENT_PARTNERS): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    if (!KEY.test(p.key)) out.push(`${p.name}: key must be 64 lowercase hex characters`);
    if (seen.has(p.key)) out.push(`${p.name}: key listed twice`);
    seen.add(p.key);
    if (!p.name.trim()) out.push(`${p.key}: name is empty`);
    if (!DATE.test(p.checked) || Number.isNaN(Date.parse(p.checked))) out.push(`${p.name}: checked must be YYYY-MM-DD`);
  }
  return out;
};
