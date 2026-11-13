// Overdue, notice of breach, cure period, revoke for non-payment (docs/royalty-pay.md, "Overdue,
// notice, cure, revoke"), and what the record's public check page says, worked out from the
// deal's signed messages on any device (license-notices.ts dealNotices):
//   - every date is a UTC calendar day: both sides see the same day at the same moment, in Tokyo
//     and in Los Angeles alike, around 16:00 UTC when their own calendars differ;
//   - overdue the day after the payment due date; revoking for non-payment only after a notice
//     of breach and CURE_DAYS with no "I paid", by the REGISTRY's clock and its own date for the
//     notice (registryAllowsRevoke), never the device's;
//   - a notice dated back (by its sender or the registry) never starts the cure period early;
//   - the licensee's answer (a dispute) and the licensor's `revoked` notice, who may send them;
//   - the public lines: overdue, then with the notice of breach; revoked only with the signed
//     notice AND the registry's gate (its notice-of-breach date, its clock, no "paid" on file),
//     nothing about payment after a plain revoke or a refused one.
// Includes the round-2 verifier's probes (vrp2-int premature.int): a revoke with no notice of
// breach, one in the middle of the cure period, one after "I paid", a device clock 31 days ahead,
// a dispute re-sent later, a revoked notice received late.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { DealEntry } from './deal-client';
import { wellFormed } from './deal';
import {
  CURE_DAYS,
  breachOf,
  ledgerOf,
  noticeDayOf,
  paymentAlerts,
  registryAllowsRevoke,
  revocableFromDay,
  revokedNoticeOf,
  type NoticeEntry,
} from './royalty-ledger';
import { localDay, utcDay } from './royalty-terms';
import type { LicenseTerms } from './licenses';
import {
  dealNotices,
  noticeRef,
  parseNotice,
  registryGate,
  syncNotices,
  type PublishedNotice,
  type RegistryView,
} from './license-notices';

{
  const g = globalThis as unknown as { localStorage?: Storage };
  if (!g.localStorage) {
    const m = new Map<string, string>();
    g.localStorage = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  }
}

const at = (day: string, time = '12:00:00') => Date.parse(`${day}T${time}Z`);
let n = 0;
const msg = (seq: number, m: Record<string, unknown>, receivedAt = at('2026-01-01') + seq): DealEntry =>
  ({
    seq,
    fingerprint: `f${seq}`.padEnd(64, '0'),
    receivedAt,
    mine: false,
    signature: `${(++n).toString(16)}`.padStart(128, 'c'),
    ...m,
  }) as unknown as DealEntry;

// Q1 2026: report due 30 Apr, payment due 14 May; overdue from 15 May.
const terms = {
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  currency: 'USD',
  reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
} as unknown as LicenseTerms;

const statement = msg(1, {
  type: 'statement',
  statementId: 'S-1',
  periodFrom: '2026-01-01',
  periodTo: '2026-03-31',
  basis: 'units',
  quantity: '400',
  currency: 'USD',
  amountOwed: '1000.00',
  from: 'licensee',
  at: at('2026-04-02'),
});
const sig = statement.signature;
const reply = msg(2, { type: 'reply', statementSig: sig, decision: 'accepted', from: 'issuer', at: at('2026-04-03') });
const notice = (seq: number, over: Record<string, unknown>, receivedAt?: number) =>
  msg(
    seq,
    {
      type: 'notice',
      kind: 'breach',
      about: 'payment',
      periodFrom: '2026-01-01',
      periodTo: '2026-03-31',
      statementSig: sig,
      asOf: '2026-05-20',
      note: 'Payment for report 1 is overdue.',
      from: 'issuer',
      at: at('2026-05-20'),
      ...over,
    },
    receivedAt ?? at(typeof over.asOf === 'string' ? over.asOf : '2026-05-20'),
  );
const paid = msg(9, {
  type: 'paid',
  statementSig: sig,
  statementId: 'S-1',
  amount: '1000.00',
  currency: 'USD',
  method: 'bank',
  payTo: '',
  reference: 'HR-7Q4K',
  paidOn: '2026-06-01',
  from: 'licensee',
  at: at('2026-06-01'),
});

const overdueOn = (entries: DealEntry[], day: string, view?: RegistryView) =>
  paymentAlerts(terms, ledgerOf(entries), day, undefined, undefined, registryGate(view)).find(
    (a) => a.kind === 'overdue',
  );

const REF = noticeRef(statement.fingerprint);
/** What the registry has on file, read at `registryDay` noon by its clock (and now by this device's). */
const viewOf = (
  registryDay: string,
  lines: PublishedNotice[] = [],
  answers: [string, PublishedNotice['answers']][] = [],
): RegistryView => ({
  lines: new Map(lines.map((l) => [l.ref, l])),
  answers: new Map(answers.map(([r, a]) => [r, a ?? []])),
  now: at(registryDay),
  read: Date.now(),
});
const breachLine = (breachNoticeOn: string, extra: Partial<PublishedNotice> = {}): PublishedNotice =>
  ({ ref: REF, kind: 'overdue', since: '2026-05-15', breachNoticeOn, ...extra }) as PublishedNotice;

describe('every royalty date is a UTC calendar day', () => {
  const zone = process.env.TZ;
  afterEach(() => {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it('Tokyo and Los Angeles at 16:00 UTC: their own calendars differ, the deadline day does not', () => {
    const moment = new Date(at('2026-05-14', '16:00:00'));
    process.env.TZ = 'Asia/Tokyo';
    const tokyoLocal = localDay(moment);
    const tokyo = utcDay(moment);
    process.env.TZ = 'America/Los_Angeles';
    const laLocal = localDay(moment);
    const la = utcDay(moment);
    // The device calendars really are a day apart here (the old, local-day rule)...
    expect(tokyoLocal).toBe('2026-05-15');
    expect(laLocal).toBe('2026-05-14');
    // ...and the deadline day is the same for both.
    expect(tokyo).toBe('2026-05-14');
    expect(la).toBe('2026-05-14');
    // The due day itself: due soon (today), not overdue, on both sides.
    expect(paymentAlerts(terms, ledgerOf([statement, reply]), tokyo)[0]).toMatchObject({ kind: 'soon', days: 0 });
    expect(paymentAlerts(terms, ledgerOf([statement, reply]), la)[0]).toMatchObject({ kind: 'soon', days: 0 });
  });

  it('overdue from 00:00 UTC on the day after, wherever either side is', () => {
    for (const tz of ['Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = tz;
      expect(utcDay(new Date(at('2026-05-14', '23:59:59')))).toBe('2026-05-14');
      expect(utcDay(new Date(at('2026-05-15', '00:00:00')))).toBe('2026-05-15');
      expect(overdueOn([statement, reply], utcDay(new Date(at('2026-05-14', '23:59:59'))))).toBeUndefined();
      expect(overdueOn([statement, reply], utcDay(new Date(at('2026-05-15', '00:00:00'))))).toMatchObject({
        since: '2026-05-15',
        days: 1,
      });
    }
  });

  it('a notice sent at 16:00 UTC counts from the same day for both sides', () => {
    const n16 = notice(3, { asOf: '2026-05-20' }, at('2026-05-20', '16:00:00')) as NoticeEntry;
    process.env.TZ = 'Asia/Tokyo';
    const tokyo = noticeDayOf(n16);
    process.env.TZ = 'America/Los_Angeles';
    expect(noticeDayOf(n16)).toBe(tokyo);
    expect(tokyo).toBe('2026-05-20');
  });
});

describe('overdue, notice of breach, cure period, revoke', () => {
  it('overdue alone never allows revoking for non-payment, however late', () => {
    const a = overdueOn([statement, reply], '2027-01-01');
    expect(a).toMatchObject({ kind: 'overdue', revocable: false });
    expect(a?.breach).toBeUndefined();
  });

  it(`a notice of breach starts ${CURE_DAYS} days; revoking is offered from the day after the last, by the registry's clock`, () => {
    const breach = notice(3, { asOf: '2026-05-20' });
    const entries = [statement, reply, breach];
    expect(CURE_DAYS).toBe(30);
    expect(revocableFromDay('2026-05-20')).toBe('2026-06-20');
    expect(overdueOn(entries, '2026-05-20')?.breach).toMatchObject({ from: '2026-05-20', cureBy: '2026-06-19' });
    const line = [breachLine('2026-05-20')];
    expect(overdueOn(entries, '2026-06-19', viewOf('2026-06-19', line))).toMatchObject({ revocable: false });
    expect(overdueOn(entries, '2026-06-20', viewOf('2026-06-20', line))).toMatchObject({ revocable: true });
    // Without the registry, never: the device's date alone offers nothing.
    expect(overdueOn(entries, '2026-12-31')).toMatchObject({ revocable: false });
  });

  it('probe: a device clock 31 days ahead offers nothing while the registry says mid-cure', () => {
    const entries = [statement, reply, notice(3, {})];
    const line = [breachLine('2026-05-20')];
    expect(overdueOn(entries, '2026-06-25', viewOf('2026-05-25', line))).toMatchObject({ revocable: false });
    expect(overdueOn(entries, '2026-05-25', viewOf('2026-06-25', line))).toMatchObject({ revocable: true });
  });

  it('the registry’s later date for the notice moves the deadline both sides see, never earlier', () => {
    const entries = [statement, reply, notice(3, { asOf: '2026-05-20' })];
    // The line went up four days after the deal's notice (the registry was down): its date counts.
    const a = overdueOn(entries, '2026-06-21', viewOf('2026-06-21', [breachLine('2026-05-24')]));
    expect(a?.breach?.cureBy).toBe('2026-06-23');
    expect(a?.revocable).toBe(false);
    // A registry date before the deal's own never shortens it.
    expect(overdueOn(entries, '2026-06-01', viewOf('2026-06-01', [breachLine('2026-05-18')]))?.breach?.cureBy).toBe(
      '2026-06-19',
    );
  });

  it('a "paid" from the licensee on file at the registry stops it, a dispute does not', () => {
    const entries = [statement, reply, notice(3, {})];
    const paidLine = [breachLine('2026-05-20', { answers: [{ type: 'paid', on: '2026-05-22' }] })];
    expect(overdueOn(entries, '2026-07-01', viewOf('2026-07-01', paidLine))?.revocable).toBe(false);
    const disputed = [breachLine('2026-05-20', { answers: [{ type: 'disputed', on: '2026-05-22' }] })];
    expect(overdueOn(entries, '2026-07-01', viewOf('2026-07-01', disputed))?.revocable).toBe(true);
    expect(registryAllowsRevoke(undefined, '2027-01-01')).toBe(false);
  });

  it('"I paid" during the cure period ends it: not overdue, nothing to revoke', () => {
    expect(overdueOn([statement, reply, notice(3, {}), paid], '2026-07-01')).toBeUndefined();
  });

  it('a notice sent before the payment was late starts nothing', () => {
    const early = notice(3, { asOf: '2026-05-10' });
    expect(overdueOn([statement, reply, early], '2026-08-01')).toMatchObject({ revocable: false });
    expect(overdueOn([statement, reply, early], '2026-08-01')?.breach).toBeUndefined();
  });

  it('dated back by the sender: the registry’s day counts; dated back by the registry: the sender’s', () => {
    const backdated = notice(3, { asOf: '2026-05-15' }, at('2026-06-10'));
    expect(breachOf(ledgerOf([statement, reply, backdated]).reports[0], '2026-05-15')).toMatchObject({
      from: '2026-06-10',
      cureBy: '2026-07-10',
    });
    const registryBack = notice(3, { asOf: '2026-06-10' }, at('2026-05-15'));
    expect(breachOf(ledgerOf([statement, reply, registryBack]).reports[0], '2026-05-15')?.from).toBe('2026-06-10');
  });

  it('only the licensor’s notice about the payment counts; a reminder or one about the report does not', () => {
    expect(overdueOn([statement, reply, notice(3, { kind: 'reminder' })], '2026-08-01')?.breach).toBeUndefined();
    expect(overdueOn([statement, reply, notice(3, { about: 'report' })], '2026-08-01')?.breach).toBeUndefined();
    expect(overdueOn([statement, reply, notice(3, { from: 'licensee' })], '2026-08-01')?.breach).toBeUndefined();
  });

  it('the licensee’s dispute is on the alert, and doesn’t stop the cure period', () => {
    const answer = notice(4, { kind: 'answer', from: 'licensee', asOf: '2026-05-25', note: 'Paid by cheque' });
    const a = overdueOn(
      [statement, reply, notice(3, {}), answer],
      '2026-06-20',
      viewOf('2026-06-20', [breachLine('2026-05-20')]),
    );
    expect(a?.answer?.note).toBe('Paid by cheque');
    expect(a?.revocable).toBe(true);
  });
});

describe('who may send an answer or a revoked notice', () => {
  const base = {
    type: 'notice',
    about: 'payment',
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    statementSig: 'ab'.repeat(64),
    asOf: '2026-05-20',
    at: at('2026-05-20'),
  };
  it('an answer: from the licensee, about a payment, naming the report, with a short note', () => {
    expect(wellFormed({ ...base, kind: 'answer', from: 'licensee', note: 'I paid on 2 May.' })).toBe(true);
    expect(wellFormed({ ...base, kind: 'answer', from: 'issuer', note: 'x' })).toBe(false);
    expect(wellFormed({ ...base, kind: 'answer', from: 'licensee' })).toBe(false);
    expect(wellFormed({ ...base, kind: 'answer', from: 'licensee', note: 'x'.repeat(501) })).toBe(false);
    expect(wellFormed({ ...base, kind: 'answer', from: 'licensee', note: 'x', about: 'report' })).toBe(false);
    expect(wellFormed({ ...base, statementSig: undefined, kind: 'answer', from: 'licensee', note: 'x' })).toBe(false);
  });
  it('revoked: from the licensor, about a payment, naming the report', () => {
    expect(wellFormed({ ...base, kind: 'revoked', from: 'issuer', note: 'Revoked.' })).toBe(true);
    expect(wellFormed({ ...base, kind: 'revoked', from: 'licensee', note: 'Revoked.' })).toBe(false);
    expect(wellFormed({ ...base, statementSig: undefined, kind: 'revoked', from: 'issuer' })).toBe(false);
  });
});

describe('the public lines, from the deal’s signed messages and the registry’s gate', () => {
  const live = [statement, reply, notice(3, {})];
  const alertsOn = (entries: DealEntry[], day: string) => paymentAlerts(terms, ledgerOf(entries), day);
  const revokedMsg = (seq: number, asOf: string, receivedAt = at(asOf)) =>
    notice(seq, { kind: 'revoked', asOf, note: 'License revoked for non-payment of report 1.' }, receivedAt);
  const gone = (entries: DealEntry[], v?: RegistryView) => [
    ...dealNotices(ledgerOf(entries), [], true, v).want.values(),
  ];

  it('live: an overdue line, then "breach" once the deal holds the notice that started the cure period', () => {
    const before = [statement, reply];
    expect([...dealNotices(ledgerOf(before), alertsOn(before, '2026-05-16'), false).want]).toEqual([
      [REF, { kind: 'overdue', since: '2026-05-15', statement: statement.fingerprint }],
    ]);
    expect([...dealNotices(ledgerOf(live), alertsOn(live, '2026-05-30'), false).want.values()]).toEqual([
      { kind: 'breach', since: '2026-05-15', statement: statement.fingerprint },
    ]);
    // An early notice (before the payment was late) starts nothing: still plain overdue.
    const early = [statement, reply, notice(3, { asOf: '2026-05-10' })];
    expect([...dealNotices(ledgerOf(early), alertsOn(early, '2026-05-30'), false).want.values()][0].kind).toBe(
      'overdue',
    );
  });

  it('gone after a plain revoke: nothing about payment, and the line comes off', () => {
    const r = dealNotices(ledgerOf(live), [], true, viewOf('2026-07-01', [breachLine('2026-05-20')]));
    expect(r.want.size).toBe(0);
    expect(r.mine.has(REF)).toBe(true);
  });

  it('gone with the signed revoked notice after the cure period, by the registry: revoked for non-payment, dated by the notice', () => {
    const entries = [...live, revokedMsg(5, '2026-06-21')];
    const l = ledgerOf(entries);
    expect(revokedNoticeOf(l)?.from).toBe('issuer');
    expect(gone(entries, viewOf('2026-06-22', [breachLine('2026-05-20')]))).toEqual([
      { kind: 'revoked', reason: 'non-payment', on: '2026-06-21', statement: statement.fingerprint },
    ]);
    // Without the registry's view: nothing.
    expect(gone(entries)).toEqual([]);
  });

  it('probe: a revoked notice with NO notice of breach on file publishes nothing', () => {
    expect(gone([statement, reply, revokedMsg(5, '2026-05-16')], viewOf('2026-07-01'))).toEqual([]);
    expect(
      gone(
        [statement, reply, revokedMsg(5, '2026-07-01')],
        viewOf('2026-07-01', [{ ref: REF, kind: 'overdue', since: '2026-05-15' }]),
      ),
    ).toEqual([]);
  });

  it('probe: a revoked notice five days into the cure period publishes nothing, even once the registry’s clock has passed it', () => {
    const entries = [...live, revokedMsg(5, '2026-05-25')];
    expect(gone(entries, viewOf('2026-05-25', [breachLine('2026-05-20')]))).toEqual([]);
    expect(gone(entries, viewOf('2026-07-30', [breachLine('2026-05-20')]))).toEqual([]);
  });

  it('probe: "I paid" before the revoke, in the deal or on file at the registry, publishes nothing', () => {
    expect(
      gone([...live, paid, revokedMsg(10, '2026-06-25')], viewOf('2026-06-26', [breachLine('2026-05-20')])),
    ).toEqual([]);
    const onFile = [breachLine('2026-05-20', { answers: [{ type: 'paid', on: '2026-05-28' }] })];
    expect(gone([...live, revokedMsg(10, '2026-06-25')], viewOf('2026-06-26', onFile))).toEqual([]);
    const answersOnly = viewOf('2026-06-26', [breachLine('2026-05-20')], [[REF, [{ type: 'paid', on: '2026-05-28' }]]]);
    expect(
      dealNotices(ledgerOf([...live, revokedMsg(10, '2026-06-25')]), [], true, {
        ...answersOnly,
        lines: new Map([[REF, breachLine('2026-05-20', { answers: [{ type: 'paid', on: '2026-05-28' }] })]]),
      }).want.size,
    ).toBe(0);
  });

  it('probe: a revoked notice received late is dated by its first receipt, and a line already up keeps its date', () => {
    const late = revokedMsg(5, '2026-06-20', at('2026-06-27'));
    expect(gone([...live, late], viewOf('2026-06-28', [breachLine('2026-05-20')]))).toEqual([
      { kind: 'revoked', reason: 'non-payment', on: '2026-06-27', statement: statement.fingerprint },
    ]);
    // Sent again (another signed copy, received later still): the first stands.
    const again = revokedMsg(6, '2026-07-04', at('2026-07-04'));
    expect(gone([...live, late, again], viewOf('2026-07-05', [breachLine('2026-05-20')]))[0]).toMatchObject({
      on: '2026-06-27',
    });
    // Once the registry holds the line, its own first date is kept, whatever the notice says.
    const up = {
      ref: REF,
      kind: 'revoked',
      reason: 'non-payment',
      on: '2026-06-28',
      breachNoticeOn: '2026-05-20',
    } as PublishedNotice;
    expect(gone([...live, late], viewOf('2026-08-01', [up]))[0]).toMatchObject({ on: '2026-06-28' });
  });

  it('a revoked notice while the license is still live on chain changes nothing public', () => {
    const entries = [...live, revokedMsg(5, '2026-06-21')];
    const r = dealNotices(ledgerOf(entries), alertsOn(entries, '2026-06-22'), false);
    expect([...r.want.values()]).toEqual([{ kind: 'breach', since: '2026-05-15', statement: statement.fingerprint }]);
  });

  it('the public page reads the licensee’s answers, never what anyone wrote', () => {
    const ref = 'a'.repeat(32);
    expect(
      parseNotice({ ref, kind: 'overdue', since: '2026-05-15', answers: [{ type: 'disputed', on: '2026-05-25' }] }),
    ).toEqual({
      ref,
      kind: 'overdue',
      since: '2026-05-15',
      answers: [{ type: 'disputed', on: '2026-05-25' }],
    });
    expect(parseNotice({ ref, kind: 'overdue', since: '2026-05-15', disputed: 'Paid by cheque' })).toEqual({
      ref,
      kind: 'overdue',
      since: '2026-05-15',
    });
  });

  it('a revoked line the registry refuses: not shown, and the report’s line comes off (a plain revoke)', async () => {
    localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32));
    let published: Record<string, unknown>[] = [
      { ref: REF, kind: 'overdue', since: '2026-05-15', breachNoticeOn: '2026-05-20' },
    ];
    const calls: string[] = [];
    const f: typeof fetch = (url, init) => {
      const u = url instanceof Request ? url.url : url.toString();
      const method = init?.method ?? 'GET';
      calls.push(method);
      if (method === 'GET')
        return Promise.resolve(
          new Response(JSON.stringify({ licenseNotices: published, now: at('2026-06-21') }), { status: 200 }),
        );
      if (method === 'PUT')
        return Promise.resolve(new Response('{"error":"not yet","code":"cure-not-over"}', { status: 409 }));
      if (method === 'DELETE') published = published.filter((x) => x.ref !== u.split('/').pop());
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    const want = new Map([
      [REF, { kind: 'revoked', reason: 'non-payment', on: '2026-06-21', statement: statement.fingerprint } as const],
    ]);
    const r = await syncNotices('rec-1', want, new Set([REF]), 'cd'.repeat(32), f);
    expect(calls).toEqual(['GET', 'PUT', 'DELETE']);
    expect(published).toEqual([]);
    expect(r.outcome).toBe('ok');
    expect(r.shown).toEqual([]);
    expect(r.refused).toEqual([REF]);
  });
});

describe('the end-to-end stand-in for Midnight is only in the e2e build', () => {
  it('reads window only under VITE_E2E_FIXTURES=1; the license page’s two chain steps ask it first', () => {
    const seam = readFileSync(new URL('./chain/e2e-chain.ts', import.meta.url), 'utf8');
    expect(seam).toMatch(/import\.meta\.env\.VITE_E2E_FIXTURES === '1'\s*\?\s*\(globalThis/);
    expect(seam).toMatch(/:\s*undefined;\s*$/);
    for (const f of ['./chain/actions.ts', './license-invites.ts'])
      expect(readFileSync(new URL(f, import.meta.url), 'utf8')).toMatch(/e2eChain\(\)\?\.(revoke|status)/);
  });
});
