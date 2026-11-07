// Payment partner keys the person checking a receipt has named themselves.
//
// VeilCore keeps no list of "trusted" partners and never prints "paid, confirmed by <partner>"
// on its own say-so (blueprint section 4, Trust Alchemist): choosing whose receipts count would
// be vouching for them. A receipt is checked only against keys the checker names: a licensor who
// has checked a partner's key with the partner directly names it here, and a receipt signed with
// that key then reads as paid through the partner they named. Every other receipt is shown as a
// signature that checks out, from a key nobody here has vouched for, with the name the registry
// gives it marked as unchecked.
//
// Kept in this browser only (each person decides for themselves), never sent anywhere.
// SPDX-License-Identifier: Apache-2.0

export type NamedKey = {
  /** The partner's Ed25519 public key: 64 lowercase hex characters. */
  readonly key: string;
  /** What the person calls it. */
  readonly label: string;
};

const STORE = 'veilcore.partnerKeys.v1';
const KEY = /^[0-9a-f]{64}$/;

const read = (): NamedKey[] => {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORE);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(
          (x): x is NamedKey =>
            !!x && typeof x === 'object' && KEY.test((x as NamedKey).key) && typeof (x as NamedKey).label === 'string',
        )
      : [];
  } catch {
    return [];
  }
};

const write = (list: readonly NamedKey[]): void => {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {
    // A private window or blocked storage: the key stays unnamed, and the receipt says so.
  }
};

/** The partner keys this person has named. */
export const namedPartnerKeys = (): readonly NamedKey[] => read();

/** Name a partner key (after checking it with the partner directly). A bad key is refused. */
export const nameKey = (key: string, label: string): boolean => {
  if (!KEY.test(key)) return false;
  const name = label.trim().slice(0, 80) || `${key.slice(0, 8)}…`;
  write([...read().filter((k) => k.key !== key), { key, label: name }]);
  return true;
};

/** Stop trusting a key. */
export const forgetKey = (key: string): void => write(read().filter((k) => k.key !== key));

/** The named key, if this exact key is one the person named. */
export const namedKey = (key: string, list: readonly NamedKey[] = read()): NamedKey | undefined =>
  KEY.test(key) ? list.find((k) => k.key === key) : undefined;
