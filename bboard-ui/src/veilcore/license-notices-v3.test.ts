// License notices v3 (review round 3, B2, L1, L5, M1), on the site's side: every line the
// licensor's page puts up is signed with their deal key over the record it goes on; a notice of
// breach the registry won't file yet (the licensee hasn't registered the statement, or it isn't
// past their registered due date) leaves the plain overdue line up and says why; the licensee's
// page reads what is on file about every message in the deal in one request per 100, registers
// their reports with the due date from the signed terms, and never files "paid" with an empty
// reference. The registry checks the same (veilcore-api test/license-notices.test.mjs).
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import { canonicalise } from 'veilcore-records';
import {
  fileAnswer,
  lineSignature,
  noticeRef,
  registerStatement,
  registrationPayload,
  statementNotices,
  syncNotices,
  type LicenseNotice,
} from './license-notices';
import { paymentDueOf, type Report } from './royalty-ledger';
import type { LicenseTerms } from './licenses';

const SECRET = 'cd'.repeat(32);
const hexOf = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const bytesOf = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const PUB = hexOf(ed25519.getPublicKey(bytesOf(SECRET)));
const utf8 = (s: string) => new TextEncoder().encode(s);
const fp = (c: string) => c.repeat(64);
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

// The holder key the notices are sent under lives in localStorage: a plain one for Node.
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
beforeEach(() => localStorage.setItem('veilcore.holder.v1', 'ab'.repeat(32)));

describe('a line is signed by the licensor’s deal key, over the record it goes on (L1)', () => {
  it('every PUT carries a signature the registry can check with the deal’s issuer key', async () => {
    const bodies: Record<string, unknown>[] = [];
    const f: typeof fetch = (_u, init) => {
      if ((init?.method ?? 'GET') === 'GET') return json(200, { licenseNotices: [], now: Date.now() });
      const b = JSON.parse(init!.body as string) as Record<string, unknown>;
      bodies.push(b);
      const { signature, statement, ...rest } = b;
      void signature;
      void statement;
      return json(200, { ref: noticeRef(fp('a')), ...rest, now: Date.now() });
    };
    const n: LicenseNotice = { kind: 'overdue', since: '2026-05-15', statement: fp('a') };
    await syncNotices('rec-1', new Map([[noticeRef(fp('a')), n]]), new Set([noticeRef(fp('a'))]), SECRET, f);
    expect(bodies).toHaveLength(1);
    const { signature, ...line } = bodies[0];
    expect(line).toEqual(n);
    const signed = utf8(`veilcore/license-line/v1\n${canonicalise({ ...n, recordId: 'rec-1' })}`);
    expect(ed25519.verify(bytesOf(signature as string), signed, bytesOf(PUB))).toBe(true);
    // Not for another record: a stranger can't replay it onto theirs.
    const other = utf8(`veilcore/license-line/v1\n${canonicalise({ ...n, recordId: 'rec-2' })}`);
    expect(ed25519.verify(bytesOf(signature as string), other, bytesOf(PUB))).toBe(false);
    expect(lineSignature(SECRET, 'rec-1', n)).toBe(signature);
  });
});

describe('a notice of breach the registry won’t file yet (B2)', () => {
  const ref = noticeRef(fp('b'));
  const breach: LicenseNotice = { kind: 'breach', since: '2026-05-15', statement: fp('b') };
  const registry = (code: 'not-registered' | 'not-due') => {
    const puts: Record<string, unknown>[] = [];
    // The registry's clock: before the registered due date below, so the notice of breach is held.
    const now = Date.parse('2026-05-17T12:00:00Z');
    const f: typeof fetch = (_u, init) => {
      if ((init?.method ?? 'GET') === 'GET') return json(200, { licenseNotices: [], now });
      const b = JSON.parse(init!.body as string) as Record<string, unknown>;
      puts.push(b);
      if (b.kind === 'breach') return json(409, { code, ...(code === 'not-due' ? { dueOn: '2026-05-20' } : {}), now });
      return json(200, { ref, kind: 'overdue', since: b.since, now });
    };
    return { puts, f };
  };
  it('not registered by the licensee: the plain overdue line goes up, and the page is told why', async () => {
    const { puts, f } = registry('not-registered');
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(puts.map((b) => b.kind)).toEqual(['breach', 'overdue']);
    expect(r.outcome).toBe('ok');
    expect(r.held.get(ref)).toEqual({ code: 'not-registered' });
    expect(r.shown).toEqual([{ ref, kind: 'overdue', since: '2026-05-15' }]);
  });
  it('registered as due later than the licensor’s terms say, and still to come: held with that date', async () => {
    const { f } = registry('not-due');
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(r.held.get(ref)).toEqual({ code: 'not-due', dueOn: '2026-05-20' });
  });
  it('a deal from before the registry kept the deal keys says so (M1), not “try again”', async () => {
    const f: typeof fetch = (_u, init) =>
      (init?.method ?? 'GET') === 'GET'
        ? json(200, { licenseNotices: [], now: Date.now() })
        : json(409, { code: 'predates', error: 'this license’s deal was opened before…' });
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(r.outcome).toBe('predates');
    expect(r.view?.predates).toBe(true);
  });
});

describe('the licensee’s page: one lookup per 100 messages, registrations, answers', () => {
  it('reads every message’s lines, registrations and answers in batches; a line on a ref it didn’t ask about is dropped', async () => {
    const fps = Array.from({ length: 150 }, (_, i) => i.toString(16).padStart(64, '0'));
    const asked: string[][] = [];
    const f: typeof fetch = (u, init) => {
      expect(u instanceof Request ? u.url : u.toString()).toMatch(/\/license-answers\/lookup$/);
      const { statements } = JSON.parse(init!.body as string) as { statements: string[] };
      asked.push(statements);
      return json(200, {
        now: 1_000,
        results: statements.map((s) =>
          s === fps[3]
            ? {
                statement: s,
                answers: [{ type: 'disputed', on: '2026-05-21' }],
                lines: [
                  { ref: noticeRef(s), kind: 'overdue', since: '2026-05-15', breachNoticeOn: '2026-05-20' },
                  { ref: 'f'.repeat(32), kind: 'overdue', since: '2026-01-01' },
                ],
                registered: { dueOn: '2026-05-14', on: '2026-04-01' },
              }
            : { statement: s, answers: [], lines: [] },
        ),
      });
    };
    const v = await statementNotices([...fps, fps[0]], f);
    expect(asked.map((a) => a.length)).toEqual([100, 50]);
    expect(v?.now).toBe(1_000);
    expect([...v!.lines.keys()]).toEqual([noticeRef(fps[3])]);
    expect(v!.lines.get(noticeRef(fps[3]))?.breachNoticeOn).toBe('2026-05-20');
    expect(v!.answers.get(noticeRef(fps[3]))).toEqual([{ type: 'disputed', on: '2026-05-21' }]);
    expect(v!.registered?.get(noticeRef(fps[3]))).toEqual({ dueOn: '2026-05-14', on: '2026-04-01' });
    expect(v!.predates).toBeUndefined();
  });
  it('a deal from before the deal keys: the view says so', async () => {
    const f: typeof fetch = () =>
      json(200, { now: 1, results: [{ statement: fp('a'), answers: [], lines: [], predates: true }] });
    expect((await statementNotices([fp('a')], f))?.predates).toBe(true);
  });
  it('registers a statement signed with the licensee’s deal key: type "statement" and its due date', async () => {
    let sent: { answer: Record<string, unknown>; signature: string } | undefined;
    const f: typeof fetch = (_u, init) => {
      sent = JSON.parse(init!.body as string) as typeof sent;
      return json(200, { filed: true, type: 'statement', on: '2026-04-01', dueOn: '2026-05-14', now: 1 });
    };
    expect(await registerStatement(SECRET, fp('a'), '2026-05-14', f)).toEqual({
      on: '2026-04-01',
      dueOn: '2026-05-14',
    });
    expect(sent!.answer).toEqual(registrationPayload(fp('a'), '2026-05-14'));
    expect(Object.keys(sent!).sort()).toEqual(['answer', 'signature']);
    const signed = utf8(`veilcore/license-answer/v1\n${canonicalise(sent!.answer)}`);
    expect(ed25519.verify(bytesOf(sent!.signature), signed, bytesOf(PUB))).toBe(true);
    const old: typeof fetch = () => json(409, { code: 'predates' });
    expect(await registerStatement(SECRET, fp('a'), '2026-05-14', old)).toBe('predates');
  });
  it('never files "paid" with an empty reference (L5): the registry refuses it, so it is not sent', async () => {
    let calls = 0;
    const f: typeof fetch = () => {
      calls++;
      return json(200, { on: '2026-05-21' });
    };
    expect(await fileAnswer(SECRET, fp('a'), 'paid', '   ', f)).toBeUndefined();
    expect(await fileAnswer(SECRET, fp('a'), 'paid', undefined, f)).toBeUndefined();
    expect(calls).toBe(0);
    expect(await fileAnswer(SECRET, fp('a'), 'paid', 'HR-7Q4K', f)).toBe('2026-05-21');
  });
});

describe('the due date registered with a report is its period’s, from the signed terms', () => {
  it('paymentDueOf: the period’s payment due date; none for terms with no schedule', () => {
    const terms = {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 15 },
    } as unknown as LicenseTerms;
    const r = { statement: { periodFrom: '2026-01-01', periodTo: '2026-03-31' } } as unknown as Report;
    expect(paymentDueOf(terms, r)).toBe('2026-05-15');
    expect(paymentDueOf({ ...terms, reporting: undefined }, r)).toBeUndefined();
    const stray = { statement: { periodFrom: '2026-02-01', periodTo: '2026-03-31' } } as unknown as Report;
    expect(paymentDueOf(terms, stray)).toBeUndefined();
  });
});
