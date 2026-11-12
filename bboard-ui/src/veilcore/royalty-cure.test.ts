// Overdue, notice of breach, cure period, revoke for non-payment (docs/royalty-pay.md, "Overdue,
// notice, cure, revoke"), and what the record's public check page says, worked out from the
// deal's signed messages on any device (license-notices.ts dealNotices):
//   - every date is a UTC calendar day: both sides see the same day at the same moment, in Tokyo
//     and in Los Angeles alike, around 16:00 UTC when their own calendars differ;
//   - overdue the day after the payment due date; revoking for non-payment only after a notice
//     of breach and CURE_DAYS with no "I paid";
//   - a notice dated back (by its sender or the registry) never starts the cure period early;
//   - the licensee's answer (a dispute) and the licensor's `revoked` notice, who may send them;
//   - the public lines: overdue with the dispute beside it, revoked only with the signed notice,
//     nothing about payment after a plain revoke; a registry that can't show the dispute takes
//     the line down rather than show one side.
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
  revokedNoticeOf,
  type NoticeEntry,
} from './royalty-ledger';
import { localDay, utcDay } from './royalty-terms';
import type { LicenseTerms } from './licenses';
import { dealNotices, noticeRef, parseNotice, syncNotices, type LicenseNotice } from './license-notices';

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

const overdueOn = (entries: DealEntry[], day: string) =>
  paymentAlerts(terms, ledgerOf(entries), day).find((a) => a.kind === 'overdue');

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

  it(`a notice of breach starts ${CURE_DAYS} days; revoking is offered from the day after the last`, () => {
    const breach = notice(3, { asOf: '2026-05-20' });
    const entries = [statement, reply, breach];
    expect(CURE_DAYS).toBe(30);
    expect(overdueOn(entries, '2026-05-20')?.breach).toMatchObject({ from: '2026-05-20', cureBy: '2026-06-19' });
    expect(overdueOn(entries, '2026-06-19')).toMatchObject({ revocable: false });
    expect(overdueOn(entries, '2026-06-20')).toMatchObject({ revocable: true });
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
    const a = overdueOn([statement, reply, notice(3, {}), answer], '2026-06-20');
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

describe('the public lines, from the deal’s signed messages', () => {
  const overdueRef = noticeRef('overdue', sig);
  const live = [statement, reply, notice(3, {})];
  const alertsOn = (entries: DealEntry[], day: string) => paymentAlerts(terms, ledgerOf(entries), day);

  it('live: the overdue line, with the licensee’s dispute next to it once they answer', () => {
    const plain = dealNotices(ledgerOf(live), alertsOn(live, '2026-05-30'), false);
    expect(plain.want.get(overdueRef)).toEqual({ kind: 'overdue', since: '2026-05-15' });
    const answered = [...live, notice(4, { kind: 'answer', from: 'licensee', asOf: '2026-05-25', note: 'No.' })];
    const withAnswer = dealNotices(ledgerOf(answered), alertsOn(answered, '2026-05-30'), false);
    expect(withAnswer.want.get(overdueRef)).toEqual({ kind: 'overdue', since: '2026-05-15', disputed: '2026-05-25' });
  });

  it('gone after a plain revoke: nothing about payment, and the overdue line comes off', () => {
    const r = dealNotices(ledgerOf(live), [], true);
    expect(r.want.size).toBe(0);
    expect(r.mine.has(overdueRef)).toBe(true);
  });

  it('gone with the licensor’s signed revoked notice: revoked for non-payment, dated by it', () => {
    const revoked = notice(5, { kind: 'revoked', asOf: '2026-06-21' });
    const entries = [...live, revoked];
    const l = ledgerOf(entries);
    expect(revokedNoticeOf(l)?.signature).toBe(revoked.signature);
    const r = dealNotices(l, [], true);
    const ref = noticeRef('revoked', revoked.signature);
    expect([...r.want]).toEqual([[ref, { kind: 'revoked', reason: 'non-payment', on: '2026-06-21' }]]);
    expect(r.mine.has(overdueRef)).toBe(true);
    // Its reference is made from that notice's signature, which only the two sides hold.
    expect(ref).not.toBe(noticeRef('revoked', '3c'.repeat(32)));
  });

  it('a revoked notice while the license is still live on chain changes nothing public', () => {
    const entries = [...live, notice(5, { kind: 'revoked', asOf: '2026-06-21' })];
    const r = dealNotices(ledgerOf(entries), alertsOn(entries, '2026-06-22'), false);
    expect([...r.want.values()]).toEqual([{ kind: 'overdue', since: '2026-05-15' }]);
  });

  it('the public page reads a dispute date, and nothing else besides', () => {
    const ref = 'a'.repeat(32);
    expect(parseNotice({ ref, kind: 'overdue', since: '2026-05-15', disputed: '2026-05-25' })).toEqual({
      ref,
      kind: 'overdue',
      since: '2026-05-15',
      disputed: '2026-05-25',
    });
    expect(parseNotice({ ref, kind: 'overdue', since: '2026-05-15', disputed: 'Paid by cheque' })).toBeUndefined();
  });

  it('a registry that refuses the dispute (one from before it): the line comes down, never one side alone', async () => {
    localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32));
    let published: Record<string, unknown>[] = [{ ref: overdueRef, kind: 'overdue', since: '2026-05-15' }];
    const calls: string[] = [];
    const f: typeof fetch = (url, init) => {
      const u = url instanceof Request ? url.url : url.toString();
      const method = init?.method ?? 'GET';
      calls.push(method);
      if (method === 'GET')
        return Promise.resolve(new Response(JSON.stringify({ licenseNotices: published }), { status: 200 }));
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string) as Record<string, unknown>;
        if ('disputed' in body) return Promise.resolve(new Response('{"error":"expected exactly"}', { status: 400 }));
      }
      if (method === 'DELETE') published = published.filter((x) => x.ref !== u.split('/').pop());
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    const want = new Map<string, LicenseNotice>([
      [overdueRef, { kind: 'overdue', since: '2026-05-15', disputed: '2026-05-25' }],
    ]);
    const r = await syncNotices('rec-1', want, new Set([overdueRef]), f);
    expect(calls).toEqual(['GET', 'PUT', 'DELETE']);
    expect(published).toEqual([]);
    expect(r.outcome).toBe('ok');
    expect(r.shown).toEqual([]);
    expect(r.withheld).toEqual([overdueRef]);
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
