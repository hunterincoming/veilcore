// Amounts as decimal text, worked in whole integers: never floating point (review round 3, M3:
// (1.005).toFixed(2) is "1.00"). Royalties are figured to the cent, rounding half up.
// SPDX-License-Identifier: Apache-2.0

const DECIMAL = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

/** Text such as "1234.5" as an integer count of 1/10^4, or undefined if it isn't such a number. */
const units4 = (s: string): bigint | undefined => {
  const t = s.trim();
  if (!DECIMAL.test(t)) return undefined;
  const [whole, frac = ''] = t.split('.');
  return BigInt(whole) * 10_000n + BigInt(frac.padEnd(4, '0'));
};

const divRoundHalfUp = (n: bigint, d: bigint): bigint => (n * 2n + d) / (2n * d);

/** Cents as "123.45". */
export const centsText = (cents: bigint): string => {
  const s = cents.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
};

/** A decimal amount as cents, rounded half up; undefined if it isn't a plain decimal. */
export const toCents = (s: string): bigint | undefined => {
  const u = units4(s);
  return u === undefined ? undefined : divRoundHalfUp(u, 100n);
};

/** Whether a quantity is a plain decimal (up to 4 places), as the statement form accepts. */
export const isDecimal = (s: string): boolean => units4(s) !== undefined;

/**
 * What a statement owes under the terms: a percent of reported sales, or a fee per unit,
 * to the cent. Undefined when the quantity or the rate isn't a plain decimal.
 */
export const owedUnder = (
  terms: { royaltyType?: string; royaltyAmount?: string },
  quantity: string,
): string | undefined => {
  const q = units4(quantity);
  const r = units4(terms.royaltyAmount ?? '');
  if (q === undefined || r === undefined) return undefined;
  // q and r are each in 1/10^4; their product in 1/10^8. A percent divides by 100 more.
  const cents = divRoundHalfUp(q * r, terms.royaltyType === 'percent' ? 100n * 1_000_000n : 1_000_000n);
  return centsText(cents);
};

/** Two amounts are the same number of cents. */
export const sameAmount = (a: string, b: string): boolean => {
  const x = toCents(a);
  return x !== undefined && x === toCents(b);
};
