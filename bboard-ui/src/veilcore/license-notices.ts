// What a record's public check page says about royalties on licenses from it, and nothing else
// (docs/royalty-pay.md, "Overdue on the public page"). Two kinds of notice, each the licensor's
// own statement about their record, published from their browser under their holder key, as a
// disclosure grant is (registry: PUT /api/records/:id/license-notices/:ref):
//
//   overdue   "A royalty statement is overdue since <date>." A statement they accepted, not paid
//             by its due date (royalty-ledger.ts paymentAlerts). Taken off the moment the
//             licensor's page sees it paid.
//   revoked   "A license from this record was revoked on <date> for non-payment." After
//             "Revoke for non-payment"; the revocation itself is on Midnight.
//
// Never an amount, a period, the terms, a name or which license: a notice carries only its
// kind, one date and an opaque reference. The reference is a hash of the statement's signature
// (or the license's commitment), which only the two sides hold: it lets the licensor's pages on
// any device find and take off their own notice, and tells a stranger nothing. The registry
// accepts nothing else (the notice's shape is fixed there too).
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';
import { holderKeyIfAny } from './holder';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export type LicenseNotice =
  | { readonly kind: 'overdue'; readonly since: string }
  | { readonly kind: 'revoked'; readonly reason: 'non-payment'; readonly on: string };

export type PublishedNotice = LicenseNotice & { readonly ref: string; readonly updatedAt?: string };

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const DOMAIN = 'veilcore/license-notice/v1\n';

/** A notice's reference: 32 hex characters of SHA-256 over its kind and what it is about. */
export const noticeRef = (kind: LicenseNotice['kind'], about: string): string =>
  hex(sha256(new TextEncoder().encode(`${DOMAIN}${kind}\n${about}`))).slice(0, 32);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One notice as the public answer carries it, checked; undefined for anything else. */
export const parseNotice = (v: unknown): PublishedNotice | undefined => {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.ref !== 'string' || !/^[0-9a-f]{32}$/.test(o.ref)) return undefined;
  const at = typeof o.updatedAt === 'string' ? { updatedAt: o.updatedAt } : {};
  if (o.kind === 'overdue' && typeof o.since === 'string' && DAY.test(o.since))
    return { ref: o.ref, kind: 'overdue', since: o.since, ...at };
  if (o.kind === 'revoked' && o.reason === 'non-payment' && typeof o.on === 'string' && DAY.test(o.on))
    return { ref: o.ref, kind: 'revoked', reason: 'non-payment', on: o.on, ...at };
  return undefined;
};

/** The notices in a /verify answer, oldest date first. */
export const noticesOf = (verify: unknown): PublishedNotice[] => {
  const list = (verify as { licenseNotices?: unknown } | null)?.licenseNotices;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 50)
    .map(parseNotice)
    .filter((n): n is PublishedNotice => !!n)
    .sort((a, b) => (a.kind === 'overdue' ? a.since : a.on).localeCompare(b.kind === 'overdue' ? b.since : b.on));
};

/** The record's notices as the public sees them now; undefined when the registry can't be asked. */
export const publicNotices = async (
  recordId: string,
  f: typeof fetch = fetch,
): Promise<PublishedNotice[] | undefined> => {
  try {
    const res = await f(`${BASE}/verify/${encodeURIComponent(recordId)}`);
    if (!res.ok) return undefined;
    return noticesOf(await res.json());
  } catch {
    return undefined;
  }
};

export type NoticeOutcome = 'ok' | 'no-key' | 'unsupported' | 'failed';

const call = async (
  method: 'PUT' | 'DELETE',
  recordId: string,
  ref: string,
  body: LicenseNotice | undefined,
  f: typeof fetch,
): Promise<NoticeOutcome> => {
  const key = holderKeyIfAny();
  if (!key) return 'no-key';
  try {
    const res = await f(`${BASE}/api/records/${encodeURIComponent(recordId)}/license-notices/${ref}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-holder-key': key },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // A registry from before license notices answers 404 to the route itself.
    if (res.status === 404 && method === 'PUT') return 'unsupported';
    return res.ok || (method === 'DELETE' && res.status === 404) ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
};

export const putNotice = (recordId: string, ref: string, n: LicenseNotice, f: typeof fetch = fetch) =>
  call('PUT', recordId, ref, n, f);
export const deleteNotice = (recordId: string, ref: string, f: typeof fetch = fetch) =>
  call('DELETE', recordId, ref, undefined, f);

const same = (a: LicenseNotice, b: LicenseNotice): boolean =>
  a.kind === b.kind &&
  (a.kind === 'overdue'
    ? a.since === (b as typeof a).since
    : a.on === (b as Extract<LicenseNotice, { kind: 'revoked' }>).on);

/**
 * Make the record's public notices for one deal what its messages say now: `want` by reference,
 * among `mine` (every reference this deal could have published). Others' notices on the same
 * record (other licenses) are left alone. Returns what was done, for the page to say.
 */
export const syncNotices = async (
  recordId: string,
  want: ReadonlyMap<string, LicenseNotice>,
  mine: ReadonlySet<string>,
  f: typeof fetch = fetch,
): Promise<{ readonly outcome: NoticeOutcome; readonly shown: PublishedNotice[] }> => {
  const now = await publicNotices(recordId, f);
  if (!now) return { outcome: 'failed', shown: [] };
  let outcome: NoticeOutcome = 'ok';
  for (const [ref, n] of want) {
    const there = now.find((x) => x.ref === ref);
    if (there && same(there, n)) continue;
    const r = await putNotice(recordId, ref, n, f);
    if (r !== 'ok') outcome = r;
  }
  for (const n of now)
    if (mine.has(n.ref) && !want.has(n.ref)) {
      const r = await deleteNotice(recordId, n.ref, f);
      if (r !== 'ok' && outcome === 'ok') outcome = r;
    }
  const shown = outcome === 'ok' ? [...want].map(([ref, n]) => ({ ...n, ref })) : now.filter((n) => mine.has(n.ref));
  return { outcome, shown };
};
