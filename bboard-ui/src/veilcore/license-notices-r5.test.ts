// Review round 5, on the site's side:
//   B1: a licensee's modified page registers a due date later than the terms say. Once that date
//       has passed by the registry's clock, the registry refuses "overdue since" (and a notice of
//       breach) dated on or before it (`not-due`). The licensor's page then dates the line from the
//       day after the registered date, so the line goes up and the notice of breach is filed, and it
//       says the registered date differs. While the registered date is still to come, the notice of
//       breach is held and the plain line stands (probe R5-S1; the registry's side is probe R5-5,
//       veilcore-api test/license-notices.test.mjs, and e2e/royalty-registry.spec.ts runs both).
//   L1: a lookup request that fails is tried again; if one still fails, the page says it couldn't
//       check every message, instead of showing no lines as if there were none.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LOOKUP_BACKOFF_MS,
  lookupStatements,
  noticeRef,
  statementNotices,
  syncNotices,
  type LicenseNotice,
  type RegistryView,
} from './license-notices';
import { ledgerOf } from './royalty-ledger';
import { LicenseePublicLines } from '../components/licensing/RoyaltyPay';
import { enT, type Translator } from '../i18n/translate';
import { royaltyPay as en } from '../i18n/app/en/royalty-pay';
import { royaltyPay as de } from '../i18n/app/de/royalty-pay';
import { royaltyPay as es } from '../i18n/app/es/royalty-pay';
import { royaltyPay as fr } from '../i18n/app/fr/royalty-pay';
import { royaltyPay as ja } from '../i18n/app/ja/royalty-pay';

const appStrings = { en, de, es, fr, ja } as const;

const SECRET = 'cd'.repeat(32);
const json = (status: number, body: unknown, headers?: Record<string, string>) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers }));
const noon = (d: string) => Date.parse(`${d}T12:00:00Z`);

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

/**
 * The registry's notice routes for one statement the licensee registered as due on `registered`,
 * with its clock at `today` (the same gate as veilcore-api server.js): "overdue since" on or before
 * a registered date that has passed is refused, and so is a notice of breach until the day after
 * it. A filed notice of breach is dated by this clock.
 */
const registry = (registered: string, today: string) => {
  const puts: string[] = [];
  const lines = new Map<string, Record<string, unknown>>();
  const f: typeof fetch = (_u, init) => {
    const t = noon(today);
    if ((init?.method ?? 'GET') === 'GET') return json(200, { licenseNotices: [...lines.values()], now: t });
    const b = JSON.parse(init!.body as string) as { kind: string; since: string; statement: string };
    puts.push(`${b.kind}:${b.since}`);
    const passed = registered < today;
    if (passed && b.since <= registered) return json(409, { code: 'not-due', dueOn: registered, now: t });
    if (b.kind === 'breach' && !passed) return json(409, { code: 'not-due', dueOn: registered, now: t });
    const ref = noticeRef(b.statement);
    const had = lines.get(ref);
    const line = {
      ref,
      kind: 'overdue',
      since: b.since,
      ...(b.kind === 'breach' || had?.breachNoticeOn ? { breachNoticeOn: had?.breachNoticeOn ?? today } : {}),
    };
    lines.set(ref, line);
    return json(200, { ...line, now: t });
  };
  return { puts, f, lines };
};

describe('a later registered due date that has passed doesn’t keep the licensor’s line off (B1)', () => {
  const st = 'b'.repeat(64);
  const ref = noticeRef(st);
  const TERMS_SINCE = '2026-10-25'; // the day after the terms' due date
  const LATER = '2026-11-08'; // what the licensee's modified page registered
  const breach: LicenseNotice = { kind: 'breach', since: TERMS_SINCE, statement: st };

  it('probe R5-S1: the notice of breach is filed, dated from the day after the registered date', async () => {
    const { puts, f } = registry(LATER, '2026-11-13');
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(puts).toEqual(['breach:2026-10-25', 'breach:2026-11-09']);
    expect(r.outcome).toBe('ok');
    expect(r.shown).toEqual([{ ref, kind: 'overdue', since: '2026-11-09', breachNoticeOn: '2026-11-13' }]);
    // Nothing held back, so the page doesn't say the date is still to come…
    expect(r.held.size).toBe(0);
    // …and it knows the date the licensee registered, to say it differs from the terms.
    expect(r.registeredDue.get(ref)).toBe(LATER);
  });

  it('the plain overdue line too', async () => {
    const { puts, f } = registry(LATER, '2026-11-13');
    const overdue: LicenseNotice = { kind: 'overdue', since: TERMS_SINCE, statement: st };
    const r = await syncNotices('rec-1', new Map([[ref, overdue]]), new Set([ref]), SECRET, f);
    expect(puts).toEqual(['overdue:2026-10-25', 'overdue:2026-11-09']);
    expect(r.outcome).toBe('ok');
    expect(r.shown).toEqual([{ ref, kind: 'overdue', since: '2026-11-09' }]);
  });

  it('with the registration already read (the lookup), the line is dated right the first time, and not sent again', async () => {
    const { puts, f } = registry(LATER, '2026-11-13');
    const registered = new Map([[ref, { dueOn: LATER, on: '2026-09-01' }]]);
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f, undefined, registered);
    expect(puts).toEqual(['breach:2026-11-09']);
    expect(r.shown[0]).toMatchObject({ since: '2026-11-09', breachNoticeOn: '2026-11-13' });
    expect(r.registeredDue.get(ref)).toBe(LATER);
    const again = await syncNotices(
      'rec-1',
      new Map([[ref, breach]]),
      new Set([ref]),
      SECRET,
      f,
      undefined,
      registered,
    );
    expect(puts).toHaveLength(1);
    expect(again.outcome).toBe('ok');
  });

  it('while the registered date is still to come: the notice of breach is held, the plain line stands as the terms date it', async () => {
    const { puts, f } = registry(LATER, '2026-11-01');
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(puts).toEqual(['breach:2026-10-25', 'overdue:2026-10-25']);
    expect(r.held.get(ref)).toEqual({ code: 'not-due', dueOn: LATER });
    expect(r.shown).toEqual([{ ref, kind: 'overdue', since: '2026-10-25' }]);
  });

  it('an honest registration (the terms’ date) changes nothing', async () => {
    const { puts, f } = registry('2026-10-24', '2026-11-13');
    const r = await syncNotices('rec-1', new Map([[ref, breach]]), new Set([ref]), SECRET, f);
    expect(puts).toEqual(['breach:2026-10-25']);
    expect(r.registeredDue.size).toBe(0);
    expect(r.shown[0]).toMatchObject({ since: '2026-10-25' });
  });
});

describe('the words for B1, in every language', () => {
  const langs = Object.keys(appStrings) as (keyof typeof appStrings)[];
  it('breachNotDue no longer says the page shows "overdue", and dueDiffers names both dates', () => {
    for (const l of langs) {
      const s = appStrings[l] as Record<string, string>;
      expect(s['app.rpay.i.breachNotDue'], l).toContain('{due}');
      expect(s['app.rpay.i.dueDiffers'], l).toMatch(/\{registered\}[\s\S]*\{due\}/);
      for (const k of ['app.rpay.i.breachNotDue', 'app.rpay.i.dueDiffers', 'app.rpay.l.pubLookupFailed'])
        expect(s[k], `${l} ${k}`).not.toMatch(/ownership|Eigentum|propiedad|propriété|所有権/i);
    }
    expect((appStrings.en as Record<string, string>)['app.rpay.i.breachNotDue']).not.toContain('Until then');
  });
});

describe('a lookup that fails is tried again, and then said (L1)', () => {
  const fps = Array.from({ length: 150 }, (_, i) => i.toString(16).padStart(64, '0'));
  const lineOn = fps[120];
  const answer = (statements: string[]) =>
    json(200, {
      now: noon('2026-11-13'),
      results: statements.map((s) => ({
        statement: s,
        answers: [],
        lines: s === lineOn ? [{ ref: noticeRef(s), kind: 'overdue', since: '2026-10-01' }] : [],
      })),
    });

  it('a 429, then an answer: tried again after the backoff, and complete', async () => {
    const waits: number[] = [];
    let n = 0;
    const f: typeof fetch = (_u, init) => {
      const { statements } = JSON.parse(init!.body as string) as { statements: string[] };
      return n++ === 1 ? json(429, { error: 'slow down' }, { 'retry-after': '2' }) : answer(statements);
    };
    const r = await lookupStatements(fps, f, (ms) => (waits.push(ms), Promise.resolve()));
    expect(r.complete).toBe(true);
    expect(waits).toEqual([Math.max(LOOKUP_BACKOFF_MS[0], 2_000)]);
    expect(r.view?.incomplete).toBeUndefined();
    expect(r.view?.lines.has(noticeRef(lineOn))).toBe(true);
  });

  it('a 404 on a later chunk (a registry rolled back mid-read): the lines read stand, marked incomplete', async () => {
    let n = 0;
    const f: typeof fetch = (_u, init) => {
      const { statements } = JSON.parse(init!.body as string) as { statements: string[] };
      return n++ === 0 ? answer(statements) : json(404, {});
    };
    const late = [...fps.slice(100), ...fps.slice(0, 100)]; // the line's statement is in the first chunk
    const r = await lookupStatements(late, f, () => Promise.resolve());
    expect(r.complete).toBe(false);
    expect(r.view?.incomplete).toBe(true);
    expect(r.view?.lines.has(noticeRef(lineOn))).toBe(true);
  });

  it('a 404 on the first chunk: a registry without lookups, nothing to read', async () => {
    const r = await lookupStatements(
      fps,
      () => json(404, {}),
      () => Promise.resolve(),
    );
    expect(r).toEqual({ complete: true });
  });

  it('a chunk that keeps failing: what the rest read is kept, and the view says it is incomplete', async () => {
    const waits: number[] = [];
    const f: typeof fetch = (_u, init) => {
      const { statements } = JSON.parse(init!.body as string) as { statements: string[] };
      return statements.includes(fps[0]) ? Promise.reject(new TypeError('Failed to fetch')) : answer(statements);
    };
    const r = await lookupStatements(fps, f, (ms) => (waits.push(ms), Promise.resolve()));
    expect(waits).toEqual([...LOOKUP_BACKOFF_MS]);
    expect(r.complete).toBe(false);
    expect(r.view?.incomplete).toBe(true);
    expect(r.view?.lines.has(noticeRef(lineOn))).toBe(true);
  });

  it('every chunk failing: no view, not complete; a refusal that won’t change isn’t tried again', async () => {
    let calls = 0;
    const down: typeof fetch = () => (calls++, json(503, { error: 'down' }));
    const r = await lookupStatements(fps.slice(0, 5), down, () => Promise.resolve());
    expect(r).toEqual({ complete: false });
    expect(calls).toBe(1 + LOOKUP_BACKOFF_MS.length);
    calls = 0;
    const bad: typeof fetch = () => (calls++, json(400, { error: 'bad' }));
    expect((await lookupStatements(fps.slice(0, 5), bad, () => Promise.resolve())).complete).toBe(false);
    expect(calls).toBe(1);
    // A registry with no lookup at all has nothing to show: not a failure.
    const none: typeof fetch = () => json(404, { error: 'not found' });
    expect(await lookupStatements(fps.slice(0, 5), none, () => Promise.resolve())).toEqual({ complete: true });
    expect(await statementNotices(fps.slice(0, 5), none, () => Promise.resolve())).toBeUndefined();
  });

  const render = (view: RegistryView | undefined, incomplete: boolean, tr: Translator = enT) =>
    renderToStaticMarkup(
      React.createElement(LicenseePublicLines, {
        view,
        ledger: ledgerOf([]),
        alerts: [],
        licensor: 'Ada',
        mySecret: SECRET,
        fingerprints: [],
        incomplete,
        tr,
        busy: false,
        send: () => Promise.resolve(true),
        onFiled: () => undefined,
      }),
    );

  it('the licensee’s page says it couldn’t check every message, with a way to check again, even with no lines read', () => {
    const html = render(undefined, true);
    expect(html).toContain('data-lookup-incomplete');
    expect(html).toContain('data-lookup-again');
    expect(html).toContain('Couldn’t check every message in this deal');
    // A complete read with no lines shows nothing, as before.
    expect(render({ lines: new Map(), answers: new Map(), now: 0, read: 0 }, false)).toBe('');
  });
});
