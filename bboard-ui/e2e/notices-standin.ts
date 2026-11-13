// The stand-in registry's license notices (veilcore-api server.js, license-notices-v2), for the
// royalty browser tests that don't run against a real registry: the same rules, kept small. Lines
// are about one statement; the notice of breach is dated by THIS registry's clock (`clock`, which a
// test moves, never the browser's); "revoked for non-payment" is refused (409) until the cure period
// has run out by that clock with no "paid" on file; the licensee's answers stand beside the line,
// first of each type. royalty-registry.spec.ts runs the same flow against a real registry.
// SPDX-License-Identifier: Apache-2.0
import type { Route } from '@playwright/test';

const DAY = 86_400_000;
const CURE_DAYS = 30;
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

type Line = {
  ref: string;
  kind: 'overdue' | 'revoked';
  day: string;
  statement: string;
  breachAt?: number;
  updatedAt: number;
};

export type NoticeState = {
  /** The registry's time when a test has moved it (ms); the real time otherwise. */
  clock?: number;
  lines: Map<string, Line>;
  answers: Map<string, { type: 'paid' | 'disputed'; at: number }[]>;
  /** Every PUT body, as sent. */
  bodies: Record<string, unknown>[];
  /** Every answer the licensee filed, as sent. */
  answerBodies: Record<string, unknown>[];
  /** The notice routes answer 503 (the registry's notices are down). */
  down: boolean;
};

export const noticeState = (): NoticeState => ({
  lines: new Map(),
  answers: new Map(),
  bodies: [],
  answerBodies: [],
  down: false,
});

export const registryNow = (s: NoticeState) => s.clock ?? Date.now();

const publicLine = (s: NoticeState, l: Line) => {
  const answers = (s.answers.get(l.statement) ?? []).map((a) => ({ type: a.type, on: utcDay(a.at) }));
  return {
    ref: l.ref,
    kind: l.kind,
    ...(l.kind === 'overdue' ? { since: l.day } : { reason: 'non-payment', on: l.day }),
    ...(l.breachAt ? { breachNoticeOn: utcDay(l.breachAt) } : {}),
    ...(answers.length ? { answers } : {}),
    updatedAt: new Date(l.updatedAt).toISOString(),
  };
};

/** The lines as /verify carries them (spread into its answer). */
export const verifyNotices = (s: NoticeState) =>
  s.lines.size
    ? {
        licenseNotices: [...s.lines.values()].map((l) => publicLine(s, l)),
        licenseNoticesBy: 'record-holder',
        licenseAnswersBy: 'licensee',
      }
    : {};

/** The kinds of the lines on file, as the public page shows them ("overdue" with a notice of breach is "breach"). */
export const kindsOf = (s: NoticeState) =>
  [...s.lines.values()].map((l) => (l.kind === 'overdue' && l.breachAt ? 'breach' : l.kind));

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Answers a notice route, or returns false for anything else. */
export const noticeRoute = async (
  route: Route,
  url: URL,
  method: string,
  body: Record<string, unknown> | null,
  s: NoticeState,
  record: string,
): Promise<boolean> => {
  const t = registryNow(s);
  if (method === 'GET' && url.pathname === `/api/records/${record}/license-notices`) {
    if (s.down) return json(route, 503, { error: 'down' }).then(() => true);
    await json(route, 200, {
      licenseNotices: [...s.lines.values()].map((l) => publicLine(s, l)),
      now: t,
      cureDays: CURE_DAYS,
    });
    return true;
  }
  const n = /^\/api\/records\/([^/]+)\/license-notices\/([0-9a-f]{32})$/.exec(url.pathname);
  if (n) {
    if (s.down) return json(route, 503, { error: 'down' }).then(() => true);
    const ref = n[2];
    if (method === 'DELETE') {
      s.lines.delete(ref);
      await json(route, 200, { removed: true });
      return true;
    }
    if (method === 'PUT' && body) {
      s.bodies.push(body);
      const had = s.lines.get(ref);
      const statement = String(body.statement);
      let breachAt = had?.breachAt;
      if (body.kind === 'breach' && !breachAt) breachAt = t;
      let kind: Line['kind'] = body.kind === 'revoked' ? 'revoked' : 'overdue';
      let day = String(body.kind === 'revoked' ? body.on : body.since);
      if (body.kind === 'revoked' && had?.kind !== 'revoked') {
        if (!breachAt) return json(route, 409, { code: 'no-breach' }).then(() => true);
        const from = utcDay(Math.floor(breachAt / DAY) * DAY + (CURE_DAYS + 1) * DAY);
        if (utcDay(t) < from || day < from)
          return json(route, 409, { code: 'cure-not-over', revocableFrom: from }).then(() => true);
        if ((s.answers.get(statement) ?? []).some((a) => a.type === 'paid'))
          return json(route, 409, { code: 'paid' }).then(() => true);
      }
      if (had?.kind === 'revoked') {
        kind = 'revoked';
        day = had.day;
      }
      const line: Line = { ref, kind, day, statement, breachAt, updatedAt: t };
      s.lines.set(ref, line);
      await json(route, 200, { ...publicLine(s, line), now: t });
      return true;
    }
  }
  if (method === 'POST' && url.pathname === '/license-answers' && body) {
    s.answerBodies.push(body);
    const a = body.answer as { statement: string; type: 'paid' | 'disputed' };
    const list = s.answers.get(a.statement) ?? [];
    const first = list.find((x) => x.type === a.type);
    if (!first) list.push({ type: a.type, at: t });
    s.answers.set(a.statement, list);
    await json(route, 200, { filed: !first, type: a.type, on: utcDay(first?.at ?? t), now: t });
    return true;
  }
  const g = /^\/license-answers\/([0-9a-f]{64})$/.exec(url.pathname);
  if (g && method === 'GET') {
    await json(route, 200, {
      answers: (s.answers.get(g[1]) ?? []).map((x) => ({ type: x.type, on: utcDay(x.at) })),
      lines: [...s.lines.values()].filter((l) => l.statement === g[1]).map((l) => publicLine(s, l)),
      now: t,
      cureDays: CURE_DAYS,
    });
    return true;
  }
  return false;
};
