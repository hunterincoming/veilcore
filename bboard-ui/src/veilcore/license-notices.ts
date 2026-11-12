// What a record's public check page says about royalties on licenses from it, and nothing else
// (docs/royalty-pay.md, "Overdue on the public page"). Two kinds of notice, each the licensor's
// own statement about their record, published from their browser under their holder key, as a
// disclosure grant is (registry: PUT /api/records/:id/license-notices/:ref):
//
//   overdue   "A royalty statement is overdue since <date>." A statement they accepted, not paid
//             by its due date (royalty-ledger.ts paymentAlerts). Taken off the moment the
//             licensor's page sees it paid, or the license gone.
//   revoked   "A license from this record was revoked on <date> for non-payment." Only while the
//             deal holds the licensor's signed `revoked` notice (sent once the revocation is on
//             Midnight) and the license is gone from the chain.
//
// Either one carries the licensee's answer when they gave one: "The licensee disputes this
// (since <date>)" (`disputed`). Their side shows next to the line, or the line doesn't show.
//
// What is public is worked out from the deal's signed messages and the chain (dealNotices), never
// from something only one browser remembers: the licensor's page on any device, after a lost
// save or a cleared browser, puts up and takes down the same lines.
//
// Never an amount, a period, the terms, a name or which license: a notice carries only its
// kind, its dates and an opaque reference. The reference is a hash of a signature only the two
// sides hold (the statement's, or the `revoked` notice's): it lets the licensor's pages on any
// device find and take off their own notice. It is not anonymous, though: its date can be lined
// up with the revocations on Midnight that day, and a payment on Cardano around the day an
// overdue line comes off (docs/royalty-pay.md, "What the public page gives away"). The registry
// accepts nothing else (the notice's shape is fixed there too).
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '@noble/hashes/sha2.js';
import { holderKeyIfAny } from './holder';
import { answerOf, noticeDayOf, revokedNoticeOf, type Ledger, type PaymentAlert } from './royalty-ledger';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export type LicenseNotice =
  | { readonly kind: 'overdue'; readonly since: string; readonly disputed?: string }
  | { readonly kind: 'revoked'; readonly reason: 'non-payment'; readonly on: string; readonly disputed?: string };

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
  if (o.disputed !== undefined && (typeof o.disputed !== 'string' || !DAY.test(o.disputed))) return undefined;
  const disputed = typeof o.disputed === 'string' ? { disputed: o.disputed } : {};
  if (o.kind === 'overdue' && typeof o.since === 'string' && DAY.test(o.since))
    return { ref: o.ref, kind: 'overdue', since: o.since, ...disputed, ...at };
  if (o.kind === 'revoked' && o.reason === 'non-payment' && typeof o.on === 'string' && DAY.test(o.on))
    return { ref: o.ref, kind: 'revoked', reason: 'non-payment', on: o.on, ...disputed, ...at };
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

/**
 * What the licensor's record's public page should say about this deal, worked out from its signed
 * messages (the ledger) and whether the license is gone from the chain:
 *   - live: an overdue line per report overdue now (paymentAlerts), with the licensee's
 *     dispute next to it when they sent one;
 *   - gone: the revoked-for-non-payment line, only when the deal holds the licensor's signed
 *     `revoked` notice; otherwise nothing (a plain revoke says nothing public about payment).
 * `mine` is every reference this deal could have published, so the rest come off.
 */
export const dealNotices = (
  ledger: Ledger,
  alerts: readonly PaymentAlert[],
  gone: boolean,
): { readonly want: Map<string, LicenseNotice>; readonly mine: Set<string> } => {
  const want = new Map<string, LicenseNotice>();
  const mine = new Set(ledger.reports.map((r) => noticeRef('overdue', r.statement.signature)));
  const revoked = revokedNoticeOf(ledger);
  if (revoked) mine.add(noticeRef('revoked', revoked.signature));
  if (gone) {
    if (revoked) {
      const report = ledger.reports.find((r) => r.statement.signature === revoked.statementSig);
      const answer = report ? answerOf(report) : undefined;
      want.set(noticeRef('revoked', revoked.signature), {
        kind: 'revoked',
        reason: 'non-payment',
        on: noticeDayOf(revoked),
        ...(answer ? { disputed: noticeDayOf(answer) } : {}),
      });
    }
    return { want, mine };
  }
  for (const a of alerts)
    if (a.kind === 'overdue' && a.since)
      want.set(noticeRef('overdue', a.report.statement.signature), {
        kind: 'overdue',
        since: a.since,
        ...(a.answer ? { disputed: noticeDayOf(a.answer) } : {}),
      });
  return { want, mine };
};

/** `refused`: the registry answered 400, as one from before `disputed` does to a notice carrying it. */
export type NoticeOutcome = 'ok' | 'no-key' | 'unsupported' | 'refused' | 'failed';

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
    if (res.status === 400 && method === 'PUT') return 'refused';
    return res.ok || (method === 'DELETE' && res.status === 404) ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
};

export const putNotice = (recordId: string, ref: string, n: LicenseNotice, f: typeof fetch = fetch) =>
  call('PUT', recordId, ref, n, f);
export const deleteNotice = (recordId: string, ref: string, f: typeof fetch = fetch) =>
  call('DELETE', recordId, ref, undefined, f);

const dayOf = (n: LicenseNotice): string => (n.kind === 'overdue' ? n.since : n.on);
const same = (a: LicenseNotice, b: LicenseNotice): boolean =>
  a.kind === b.kind && dayOf(a) === dayOf(b) && (a.disputed ?? '') === (b.disputed ?? '');

/**
 * Make the record's public notices for one deal what its messages say now: `want` by reference,
 * among `mine` (every reference this deal could have published). Others' notices on the same
 * record (other licenses) are left alone. A notice carrying the licensee's dispute that the
 * registry refuses (one from before `disputed`) is taken down rather than put up without it: the
 * public never sees one side alone once the other has answered. Returns what was done, for the
 * page to say.
 */
export const syncNotices = async (
  recordId: string,
  want: ReadonlyMap<string, LicenseNotice>,
  mine: ReadonlySet<string>,
  f: typeof fetch = fetch,
): Promise<{
  readonly outcome: NoticeOutcome;
  readonly shown: PublishedNotice[];
  /** Left off the public page because the registry can't show the licensee's dispute beside it. */
  readonly withheld: string[];
}> => {
  const now = await publicNotices(recordId, f);
  if (!now) return { outcome: 'failed', shown: [], withheld: [] };
  let outcome: NoticeOutcome = 'ok';
  const withheld = new Set<string>();
  for (const [ref, n] of want) {
    const there = now.find((x) => x.ref === ref);
    if (there && same(there, n)) continue;
    let r = await putNotice(recordId, ref, n, f);
    if (r === 'refused' && n.disputed) {
      withheld.add(ref);
      r = there ? await deleteNotice(recordId, ref, f) : 'ok';
    }
    if (r !== 'ok') outcome = r;
  }
  for (const n of now)
    if (mine.has(n.ref) && !want.has(n.ref)) {
      const r = await deleteNotice(recordId, n.ref, f);
      if (r !== 'ok' && outcome === 'ok') outcome = r;
    }
  const shown =
    outcome === 'ok'
      ? [...want].filter(([ref]) => !withheld.has(ref)).map(([ref, n]) => ({ ...n, ref }))
      : now.filter((n) => mine.has(n.ref));
  return { outcome, shown, withheld: [...withheld] };
};
