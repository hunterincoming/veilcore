// What a record's public check page says about royalties on licenses from it, and nothing else
// (docs/royalty-pay.md, "Overdue on the public page"). The licensor's page puts up lines about one
// royalty statement each, under their holder key (registry: PUT
// /api/records/:id/license-notices/:ref, license-notices-v2):
//
//   overdue   "The record holder says a royalty statement is overdue since <date>." A statement
//             they accepted, not paid by its due date (royalty-ledger.ts paymentAlerts).
//   breach    The same line, with "they sent a notice of breach on <date>": the date is the
//             REGISTRY's, the day it first received the line, never the licensor's device's.
//   revoked   "The record holder says a license from this record was revoked on <date> for
//             non-payment." The registry accepts it only once its own clock says the cure period
//             after that notice of breach has run out, and with no "paid" on file; otherwise it
//             refuses, and the page falls back to a plain revoke that says nothing about payment.
//
// A licensor's browser can be modified, so it isn't trusted with any of that: what the registry
// can check, it checks (the dates, the cure period, "paid"). What it can't (whether a payment was
// due at all) is worded as the licensor's claim, and the licensee answers it in their own name:
// "paid" or "disputed", signed with their deal key and filed at the registry (fileAnswer), where
// the licensor can neither remove nor change it. The public page shows the answer's type and date
// beside the line, never what anyone wrote.
//
// What is public is worked out from the deal's signed messages, the chain and the registry
// (dealNotices), never from something one browser remembers. A line's reference is made from the
// statement's fingerprint (the deal message's), which only the two sides and the registry know,
// so both sides can name it. It is not anonymous, though: its dates can be lined up with the
// revocations on Midnight that day, and a payment on Cardano around the day an overdue line comes
// off (docs/royalty-pay.md, "What the public page gives away").
// SPDX-License-Identifier: Apache-2.0

import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { canonicalise } from 'veilcore-records';
import { holderKeyIfAny } from './holder';
import { addDays } from './royalty-periods';
import { utcDay } from './royalty-terms';
import {
  CURE_DAYS,
  noticeDayOf,
  revocableFromDay,
  registryAllowsRevoke,
  revokedNoticeOf,
  type Ledger,
  type PaymentAlert,
  type Report,
} from './royalty-ledger';

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** What the licensor's page puts up for one statement (`statement`: its deal message's fingerprint). */
export type LicenseNotice =
  | { readonly kind: 'overdue' | 'breach'; readonly since: string; readonly statement: string }
  | { readonly kind: 'revoked'; readonly reason: 'non-payment'; readonly on: string; readonly statement: string };

/** The licensee's own answer, as public: its type and the day the registry first had it. */
export type LicenseeAnswer = { readonly type: 'paid' | 'disputed'; readonly on: string };

/** A line as the registry shows it. */
export type PublishedNotice = (
  | { readonly kind: 'overdue'; readonly since: string }
  | { readonly kind: 'revoked'; readonly reason: 'non-payment'; readonly on: string }
) & {
  readonly ref: string;
  /** The day the registry first received the licensor's notice of breach. */
  readonly breachNoticeOn?: string;
  readonly answers?: readonly LicenseeAnswer[];
  readonly updatedAt?: string;
};

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const bytes = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

/** A line's reference: 32 hex of SHA-256 over "veilcore/license-notice/v2\n" and the statement's fingerprint. */
export const noticeRef = (statementFingerprint: string): string =>
  hex(sha256(utf8(`veilcore/license-notice/v2\n${statementFingerprint}`))).slice(0, 32);

/** The reference of a report's lines. */
export const reportRef = (r: Report): string => noticeRef(r.statement.fingerprint);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const answersOf = (v: unknown): LicenseeAnswer[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .slice(0, 4)
    .filter(
      (a): a is LicenseeAnswer =>
        typeof a === 'object' &&
        a !== null &&
        ((a as LicenseeAnswer).type === 'paid' || (a as LicenseeAnswer).type === 'disputed') &&
        typeof (a as LicenseeAnswer).on === 'string' &&
        DAY.test((a as LicenseeAnswer).on),
    )
    .map((a) => ({ type: a.type, on: a.on }));
  return out.length ? out : undefined;
};

/** One line as the registry's answer carries it, checked; undefined for anything else. */
export const parseNotice = (v: unknown): PublishedNotice | undefined => {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.ref !== 'string' || !/^[0-9a-f]{32}$/.test(o.ref)) return undefined;
  if (o.breachNoticeOn !== undefined && (typeof o.breachNoticeOn !== 'string' || !DAY.test(o.breachNoticeOn)))
    return undefined;
  const extra = {
    ...(typeof o.breachNoticeOn === 'string' ? { breachNoticeOn: o.breachNoticeOn } : {}),
    ...(answersOf(o.answers) ? { answers: answersOf(o.answers)! } : {}),
    ...(typeof o.updatedAt === 'string' ? { updatedAt: o.updatedAt } : {}),
  };
  if (o.kind === 'overdue' && typeof o.since === 'string' && DAY.test(o.since))
    return { ref: o.ref, kind: 'overdue', since: o.since, ...extra };
  if (o.kind === 'revoked' && o.reason === 'non-payment' && typeof o.on === 'string' && DAY.test(o.on))
    return { ref: o.ref, kind: 'revoked', reason: 'non-payment', on: o.on, ...extra };
  return undefined;
};

const dayOfLine = (n: PublishedNotice): string => (n.kind === 'overdue' ? n.since : n.on);

/** The lines in a /verify answer, oldest date first. */
export const noticesOf = (verify: unknown): PublishedNotice[] => {
  const list = (verify as { licenseNotices?: unknown } | null)?.licenseNotices;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 50)
    .map(parseNotice)
    .filter((n): n is PublishedNotice => !!n)
    .sort((a, b) => dayOfLine(a).localeCompare(dayOfLine(b)));
};

/**
 * What the registry has on file for one deal's lines, and its clock: `now` is the registry's time
 * when read, `read` this device's (so registryNow can count on from it without trusting the
 * device's date). `lines` and `answers` are by reference.
 */
export type RegistryView = {
  readonly lines: ReadonlyMap<string, PublishedNotice>;
  readonly answers: ReadonlyMap<string, readonly LicenseeAnswer[]>;
  readonly now: number;
  readonly read: number;
};

/** The registry's time now, counted on from when the view was read. */
export const registryNow = (v: RegistryView): number => v.now + Math.max(0, Date.now() - v.read);
/** The registry's UTC day now. */
export const registryToday = (v: RegistryView): string => utcDay(new Date(registryNow(v)));

/** The licensor's notice of breach and the cure period, as the registry dated them, for one report. */
export const registryGate = (v: RegistryView | undefined) =>
  v
    ? {
        today: registryToday(v),
        lineOf: (r: Report) => {
          const ref = reportRef(r);
          const line = v.lines.get(ref);
          return { breachNoticeOn: line?.breachNoticeOn, answers: line?.answers ?? v.answers.get(ref) ?? [] };
        },
      }
    : undefined;

export type NoticeOutcome = 'ok' | 'no-key' | 'no-record' | 'unsupported' | 'failed';

/** What a 404 means: the record isn't under this holder key, or the registry has no such route. */
const missing = async (res: Response): Promise<NoticeOutcome> => {
  const body = (await res.json().catch(() => undefined)) as { code?: unknown; error?: unknown } | undefined;
  return body?.code === 'no-record' || (typeof body?.error === 'string' && /no such record/.test(body.error))
    ? 'no-record'
    : 'unsupported';
};

const viewOf = (lines: readonly PublishedNotice[], now: number): RegistryView => ({
  lines: new Map(lines.map((n) => [n.ref, n])),
  answers: new Map(lines.filter((n) => n.answers).map((n) => [n.ref, n.answers!])),
  now,
  read: Date.now(),
});

/** The licensor's own lines on their record, with the registry's time (holder key). */
export const holderNotices = async (
  recordId: string,
  f: typeof fetch = fetch,
): Promise<{ readonly view: RegistryView } | { readonly outcome: NoticeOutcome }> => {
  const key = holderKeyIfAny();
  if (!key) return { outcome: 'no-key' };
  try {
    const res = await f(`${BASE}/api/records/${encodeURIComponent(recordId)}/license-notices`, {
      headers: { 'x-holder-key': key },
      cache: 'no-store',
    });
    if (res.status === 404) return { outcome: await missing(res) };
    if (!res.ok) return { outcome: 'failed' };
    const body = (await res.json()) as { licenseNotices?: unknown; now?: unknown };
    if (typeof body.now !== 'number') return { outcome: 'unsupported' };
    return { view: viewOf(noticesOf(body), body.now) };
  } catch {
    return { outcome: 'failed' };
  }
};

/**
 * What is on file about some statements, for either side (no key: the fingerprints are known only
 * to the deal's two sides and the registry), merged into one view. Undefined when it can't be read.
 */
export const statementNotices = async (
  fingerprints: readonly string[],
  f: typeof fetch = fetch,
): Promise<RegistryView | undefined> => {
  const lines: PublishedNotice[] = [];
  const answers = new Map<string, readonly LicenseeAnswer[]>();
  let now: number | undefined;
  try {
    for (const fp of fingerprints) {
      const res = await f(`${BASE}/license-answers/${fp}`, { cache: 'no-store' });
      if (!res.ok) return undefined;
      const body = (await res.json()) as { answers?: unknown; lines?: unknown; now?: unknown };
      if (typeof body.now !== 'number') return undefined;
      now = body.now;
      const ref = noticeRef(fp);
      const a = answersOf(body.answers);
      if (a) answers.set(ref, a);
      // The newest line about it (a statement is on one record; a licensor could repeat it).
      const l = noticesOf({ licenseNotices: body.lines })
        .filter((n) => n.ref === ref)
        .pop();
      if (l) lines.push(l);
    }
  } catch {
    return undefined;
  }
  if (now === undefined) return undefined;
  return { lines: new Map(lines.map((n) => [n.ref, n])), answers, now, read: Date.now() };
};

/** What the licensee signs for an answer: "veilcore/license-answer/v1\n" + the canonical answer. */
export const answerPayload = (statement: string, type: 'paid' | 'disputed', reference?: string) => ({
  v: 'veilcore/license-answer/v1' as const,
  statement,
  type,
  ...(type === 'paid' ? { referenceHash: hex(sha256(utf8((reference ?? '').trim()))) } : {}),
});

/**
 * The licensee files their own answer to a statement at the registry, signed with their deal key:
 * paid (with the SHA-256 of the payment reference, never the reference itself) or disputed. The
 * licensor can't remove or change it; the first of each type stands. Returns the day it is
 * filed under, or undefined when it couldn't be filed (the page tries again when it next opens).
 */
export const fileAnswer = async (
  mySecret: string,
  statement: string,
  type: 'paid' | 'disputed',
  reference?: string,
  f: typeof fetch = fetch,
): Promise<string | undefined> => {
  const answer = answerPayload(statement, type, reference);
  const signature = hex(ed25519.sign(utf8(`veilcore/license-answer/v1\n${canonicalise(answer)}`), bytes(mySecret)));
  try {
    const res = await f(`${BASE}/license-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, signature }),
    });
    if (!res.ok) return undefined;
    const out = (await res.json()) as { on?: unknown };
    return typeof out.on === 'string' ? out.on : undefined;
  } catch {
    return undefined;
  }
};

/**
 * What the licensor's record's public page should say about this deal, worked out from its signed
 * messages (the ledger), whether the license is gone from the chain, and what the registry has on
 * file (`view`):
 *   - live: a line per report overdue now (paymentAlerts): "breach" once the deal holds the
 *     licensor's notice of breach that started the cure period, otherwise "overdue";
 *   - gone: "revoked for non-payment" only when the deal holds the licensor's signed `revoked`
 *     notice dated after the cure period, the report isn't marked paid, and the registry's own
 *     notice of breach, clock and answers allow it (the same rule the registry enforces);
 *     otherwise nothing (a plain revoke says nothing public about payment).
 * `mine` is every reference this deal could have published, so the rest come off.
 */
export const dealNotices = (
  ledger: Ledger,
  alerts: readonly PaymentAlert[],
  gone: boolean,
  view?: RegistryView,
): { readonly want: Map<string, LicenseNotice>; readonly mine: Set<string> } => {
  const want = new Map<string, LicenseNotice>();
  const mine = new Set(ledger.reports.map(reportRef));
  if (gone) {
    const revoked = revokedNoticeOf(ledger);
    const report = revoked ? ledger.reports.find((r) => r.statement.signature === revoked.statementSig) : undefined;
    if (revoked && report && !report.paid && view) {
      const ref = reportRef(report);
      const line = view.lines.get(ref);
      const on = noticeDayOf(revoked);
      if (line?.kind === 'revoked') {
        // Already up: the registry keeps its first date.
        want.set(ref, { kind: 'revoked', reason: 'non-payment', on: line.on, statement: report.statement.fingerprint });
      } else {
        const gate = { breachNoticeOn: line?.breachNoticeOn, answers: line?.answers ?? view.answers.get(ref) ?? [] };
        const today = registryToday(view);
        if (
          registryAllowsRevoke(gate, today) &&
          gate.breachNoticeOn &&
          on >= revocableFromDay(gate.breachNoticeOn) &&
          on <= today
        )
          want.set(ref, { kind: 'revoked', reason: 'non-payment', on, statement: report.statement.fingerprint });
      }
    }
    return { want, mine };
  }
  for (const a of alerts)
    if (a.kind === 'overdue' && a.since)
      want.set(reportRef(a.report), {
        kind: a.breach ? 'breach' : 'overdue',
        since: a.since,
        statement: a.report.statement.fingerprint,
      });
  return { want, mine };
};

const call = async (
  method: 'PUT' | 'DELETE',
  recordId: string,
  ref: string,
  body: LicenseNotice | undefined,
  f: typeof fetch,
): Promise<{ readonly outcome: NoticeOutcome | 'refused'; readonly line?: PublishedNotice; readonly now?: number }> => {
  const key = holderKeyIfAny();
  if (!key) return { outcome: 'no-key' };
  try {
    const res = await f(`${BASE}/api/records/${encodeURIComponent(recordId)}/license-notices/${ref}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-holder-key': key },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 404) {
      const why = await missing(res);
      // Taking off a line that isn't there is done.
      return { outcome: method === 'DELETE' && why === 'unsupported' ? 'ok' : why };
    }
    // 409: the registry refused it (a revoked line before the cure period ran out, or with
    // "paid" on file; a statement it holds no deal for).
    if (res.status === 409) return { outcome: 'refused' };
    if (!res.ok) return { outcome: 'failed' };
    if (method === 'DELETE') return { outcome: 'ok' };
    const out = (await res.json().catch(() => undefined)) as Record<string, unknown> | undefined;
    return {
      outcome: 'ok',
      line: parseNotice(out),
      now: typeof out?.now === 'number' ? out.now : undefined,
    };
  } catch {
    return { outcome: 'failed' };
  }
};

export const putNotice = (recordId: string, ref: string, n: LicenseNotice, f: typeof fetch = fetch) =>
  call('PUT', recordId, ref, n, f);
export const deleteNotice = (recordId: string, ref: string, f: typeof fetch = fetch) =>
  call('DELETE', recordId, ref, undefined, f);

/** Whether the line on file already says what `n` asks for. */
const same = (there: PublishedNotice, n: LicenseNotice): boolean =>
  n.kind === 'revoked'
    ? there.kind === 'revoked'
    : there.kind === 'overdue' && there.since === n.since && (n.kind === 'overdue' || !!there.breachNoticeOn);

/**
 * Make the record's public lines for one deal what its messages say now: `want` by reference,
 * among `mine` (every reference this deal could have published). Others' lines on the same record
 * (other licenses) are left alone. A revoked line the registry refuses (the cure period not over
 * by its clock, "paid" on file) is not shown, and the line for that report comes off: the public
 * page then says nothing about payment, as after a plain revoke. Returns what was done, and the
 * registry's view after it, for the page to say.
 */
export const syncNotices = async (
  recordId: string,
  want: ReadonlyMap<string, LicenseNotice>,
  mine: ReadonlySet<string>,
  f: typeof fetch = fetch,
  had?: RegistryView,
): Promise<{
  readonly outcome: NoticeOutcome;
  readonly shown: PublishedNotice[];
  /** Refused by the registry: a revoked line it won't show (so that report's line came off). */
  readonly refused: string[];
  readonly view?: RegistryView;
}> => {
  const first = had ? { view: had } : await holderNotices(recordId, f);
  if (!('view' in first)) return { outcome: first.outcome, shown: [], refused: [] };
  const lines = new Map(first.view.lines);
  let now = first.view.now;
  let outcome: NoticeOutcome = 'ok';
  const refused = new Set<string>();
  for (const [ref, n] of want) {
    const there = lines.get(ref);
    if (there && same(there, n)) continue;
    const r = await putNotice(recordId, ref, n, f);
    if (r.outcome === 'refused') {
      if (n.kind === 'revoked') {
        refused.add(ref);
        if (there) {
          const d = await deleteNotice(recordId, ref, f);
          if (d.outcome === 'ok') lines.delete(ref);
          else if (outcome === 'ok') outcome = d.outcome === 'refused' ? 'failed' : d.outcome;
        }
      } else if (outcome === 'ok') outcome = 'failed';
      continue;
    }
    if (r.outcome !== 'ok') {
      outcome = r.outcome;
      continue;
    }
    if (r.line) lines.set(ref, r.line);
    if (r.now) now = r.now;
  }
  for (const ref of [...lines.keys()])
    if (mine.has(ref) && !want.has(ref)) {
      const d = await deleteNotice(recordId, ref, f);
      if (d.outcome === 'ok') lines.delete(ref);
      else if (outcome === 'ok') outcome = d.outcome === 'refused' ? 'failed' : d.outcome;
    }
  const view: RegistryView = {
    lines,
    answers: new Map([...lines].filter(([, n]) => n.answers).map(([ref, n]) => [ref, n.answers!])),
    now,
    read: Date.now(),
  };
  return {
    outcome,
    shown: [...lines.values()].filter((n) => mine.has(n.ref)),
    refused: [...refused],
    view,
  };
};

/** The last day to pay after a notice of breach the registry received on `breachNoticeOn`. */
export const cureEndsOn = (breachNoticeOn: string): string => addDays(breachNoticeOn, CURE_DAYS);
