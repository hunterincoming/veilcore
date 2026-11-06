// Amounts as decimal text, worked in whole integers: never floating point (review round 3, M3:
// (1.005).toFixed(2) is "1.00"). Royalties are figured to the currency's own smallest unit,
// rounding half up: cents for USD and EUR, whole yen for JPY (Intl's currency digits). Each line
// of a statement is rounded on its own, then the lines are added, so both sides get the same sum.
// SPDX-License-Identifier: Apache-2.0

const DECIMAL = /^([0-9]{1,15})(\.[0-9]{1,8})?$/;
const SCALE = 100_000_000n;

/**
 * Text such as "1234.5", "0.00125" or "12.5%" as an integer count of 1/10^8 (up to 8 places), or
 * undefined if it isn't such a number. A trailing % and spaces are allowed: rates are typed.
 */
const units8 = (s: string): bigint | undefined => {
  const t = s.trim().replace(/\s*%$/, '');
  if (!DECIMAL.test(t)) return undefined;
  const [whole, frac = ''] = t.split('.');
  return BigInt(whole) * SCALE + BigInt(frac.padEnd(8, '0'));
};

const divRoundHalfUp = (n: bigint, d: bigint): bigint => (n * 2n + d) / (2n * d);

/**
 * How many decimals a currency is figured to: Intl's own table (USD 2, EUR 2, JPY 0, KWD 3).
 * Anything Intl doesn't know as a currency code is taken to have two.
 */
export const currencyDigits = (currency: string | undefined): number => {
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return 2;
  try {
    const d = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
    return typeof d === 'number' && d >= 0 && d <= 4 ? d : 2;
  } catch {
    return 2;
  }
};

/** A count of the currency's smallest unit as text: 12345 with 2 digits is "123.45", with 0 is "12345". */
export const minorText = (minor: bigint, digits = 2): string => {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  if (digits === 0) return `${neg ? '-' : ''}${abs}`;
  const s = abs.toString().padStart(digits + 1, '0');
  return `${neg ? '-' : ''}${s.slice(0, -digits)}.${s.slice(-digits)}`;
};

/** A decimal amount in the currency's smallest unit, rounded half up; undefined if it isn't a plain decimal. */
export const toMinor = (s: string, digits = 2): bigint | undefined => {
  const u = units8(s);
  return u === undefined ? undefined : divRoundHalfUp(u, 10n ** BigInt(8 - digits));
};

/** Cents as "123.45". */
export const centsText = (cents: bigint): string => minorText(cents, 2);

/** A decimal amount as cents, rounded half up; undefined if it isn't a plain decimal. */
export const toCents = (s: string): bigint | undefined => toMinor(s, 2);

/** Whether a quantity is a plain decimal (up to 8 places), as the statement form accepts. */
export const isDecimal = (s: string): boolean => units8(s) !== undefined;

/**
 * A typed number in the form the published checker reads (veilcore-records: no leading zeros,
 * so "05" is refused there): "05" -> "5", "007.50" -> "7.50", "0.5" stays. Undefined if it isn't
 * a plain decimal.
 */
export const normaliseDecimal = (s: string): string | undefined => {
  const t = s.trim();
  if (!DECIMAL.test(t)) return undefined;
  const [whole, frac] = t.split('.');
  const w = whole.replace(/^0+(?=\d)/, '');
  return frac === undefined ? w : `${w}.${frac}`;
};

/**
 * What a quantity owes at a rate, in the currency's own digits: a percent of sales, or a fee per
 * unit. Undefined when the quantity or the rate isn't a plain decimal.
 */
export const owedAt = (
  kind: 'percent' | 'per-unit',
  rate: string,
  quantity: string,
  digits = 2,
): string | undefined => {
  const q = units8(quantity);
  const r = units8(rate);
  if (q === undefined || r === undefined) return undefined;
  // q and r are each in 1/10^8; their product in 1/10^16; the result in 1/10^digits. A percent divides by 100 more.
  const div = 10n ** BigInt(16 - digits);
  return minorText(divRoundHalfUp(q * r, kind === 'percent' ? 100n * div : div), digits);
};

/**
 * What a statement owes under the terms (the old shape: royaltyType and royaltyAmount), in the
 * currency's digits (two unless said). Undefined when the quantity or the rate isn't a plain decimal.
 */
export const owedUnder = (
  terms: { royaltyType?: string; royaltyAmount?: string },
  quantity: string,
  digits = 2,
): string | undefined =>
  owedAt(terms.royaltyType === 'percent' ? 'percent' : 'per-unit', terms.royaltyAmount ?? '', quantity, digits);

/** Amounts added up exactly, in the currency's digits; undefined if any isn't a plain decimal. */
export const sumAmounts = (list: readonly string[], digits = 2): string | undefined => {
  let total = 0n;
  for (const a of list) {
    const m = toMinor(a, digits);
    if (m === undefined) return undefined;
    total += m;
  }
  return minorText(total, digits);
};

/** a - b, in the currency's digits; undefined if either isn't a plain decimal or the result is below zero. */
export const subtractAmount = (a: string, b: string, digits = 2): string | undefined => {
  const x = toMinor(a, digits);
  const y = toMinor(b, digits);
  if (x === undefined || y === undefined || y > x) return undefined;
  return minorText(x - y, digits);
};

/** Two amounts are the same number of the smallest unit (cents unless said). */
export const sameAmount = (a: string, b: string, digits = 2): boolean => {
  const x = toMinor(a, digits);
  return x !== undefined && x === toMinor(b, digits);
};

/** Whether an amount is zero. */
export const isZero = (a: string): boolean => units8(a) === 0n;

/**
 * An amount for people to read, in the reader's language, with the currency's symbol where Intl
 * knows the code ("$1,234.50", "¥1,235", "1.234,50 €"). Anything else as "1234.50 XYZ".
 */
export const formatMoney = (amount: string, currency: string | undefined, locale?: string): string => {
  const code = currency ?? '';
  if (/^[A-Z]{3}$/.test(code) && isDecimal(amount)) {
    try {
      const digits = currencyDigits(code);
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(Number(amount));
    } catch {
      /* below */
    }
  }
  return code ? `${amount} ${code}` : amount;
};
